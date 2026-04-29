# Vancouver Monopoly — Design Spec

## Overview

A 2-player, turn-limited Monopoly game themed around Vancouver, BC neighborhoods and landmarks. Integrated with the existing inbox and leaderboard systems.

## Constraints

- 2 players (Ricky vs Lilian), same as all other games
- 40-space classic board layout
- 30 turns per player (60 total), highest net worth wins
- Instant bankruptcy = immediate loss (no selling/mortgaging to cover debts)
- No trading between players
- No auctions (declined properties stay unowned)
- No Chance/Community Chest cards
- Polling-based sync (1.5s), single-writer rule (active player writes all mutations)

## Architecture

Follows existing platform patterns exactly:

| Layer | Location |
|-------|----------|
| Pure logic | `/src/lib/monopoly/` |
| Types | `/src/lib/monopoly/types.ts` |
| Game hook | `/src/hooks/useMonopolyGame.ts` |
| Page | `/src/app/monopoly/[gameId]/page.tsx` |
| Components | `/src/components/monopoly/` |

## Board Theme — Vancouver, BC

### Color Groups & Properties

| Color | Properties | Price Range |
|-------|-----------|-------------|
| Brown | East Hastings, Chinatown | $60–$60 |
| Light Blue | Commercial Drive, Main Street, Kingsway | $100–$120 |
| Pink | Kitsilano, Point Grey, Jericho Beach | $140–$160 |
| Orange | Gastown, Yaletown, Coal Harbour | $180–$200 |
| Red | Robson Street, Davie Street, Denman Street | $220–$240 |
| Yellow | Granville Island, Olympic Village, Science World | $260–$280 |
| Green | Stanley Park, English Bay, UBC | $300–$320 |
| Dark Blue | West Vancouver, Shaughnessy | $350–$400 |

### Special Spaces

| Type | Spaces |
|------|--------|
| Railroads (SkyTrain) | Waterfront, Commercial-Broadway, Metrotown, King George |
| Utilities | BC Hydro, Metro Vancouver Water |
| Tax | Income Tax ($200 flat), Luxury Tax ($100 flat) |
| Corners | GO, Jail/Just Visiting, Free Parking (no effect), Go to Jail |

## Game State

### Static Board Definition (in code, NOT in DB)

```typescript
interface SpaceDefinition {
  index: number;
  name: string;
  type: 'property' | 'railroad' | 'utility' | 'tax' | 'corner';
  color?: ColorGroup;
  price?: number;
  rent: number[];        // [base, 1house, 2house, 3house, 4house, hotel]
  housePrice?: number;
  taxAmount?: number;
  cornerType?: 'go' | 'jail' | 'free-parking' | 'go-to-jail';
}

const BOARD: SpaceDefinition[40] // constant, defined in code
```

### Mutable State (stored in `board` JSONB)

```typescript
interface MonopolyBoard {
  players: [PlayerState, PlayerState];
  properties: Record<number, { owner: 1 | 2; houses: number }>;
  currentTurn: number;        // increments only on full turn pass (max 60)
  turnSequence: number;       // increments on every DB write (optimistic lock)
  activePlayer: 1 | 2;
  phase: MonopolyPhase;
  lastRoll: { dice: [number, number]; from: number; to: number } | null;
  doublesCount: number;
  winner: 1 | 2 | null;
  finalNetWorth?: [number, number];
}

interface PlayerState {
  position: number;
  cash: number;
  inJail: boolean;
  jailTurns: number;
}

type MonopolyPhase =
  | 'roll'           // waiting for active player to roll
  | 'landed'         // token arrived, resolving space effect (auto-transitions)
  | 'buy-decision'   // player must decide to buy or pass
  | 'jail-decision'  // player in jail must choose: pay $50 or try to roll doubles
  | 'end-turn'       // player's actions complete, ready to pass turn
  | 'game-over';     // game finished
```

## Turn Flow

```
START OF TURN
  ↓
phase: 'roll'
  → Player clicks "Roll Dice"
  → Generate random dice [1-6, 1-6]
  → Compute new position (wrapping at 40, collect $200 if passing GO)
  → Store lastRoll: { dice, from, to }
  ↓
phase: 'landed'
  → Resolve based on space type:
    • Own property → auto-skip to 'end-turn'
    • Unowned property → phase: 'buy-decision'
    • Opponent's property → auto-deduct rent, check bankruptcy
    • Tax space → auto-deduct tax, check bankruptcy
    • Go to Jail → move to jail, set inJail=true, phase: 'end-turn'
    • Railroad/Utility owned by opponent → auto-deduct, check bankruptcy
    • Free Parking / Just Visiting / GO → auto-skip to 'end-turn'
  ↓
phase: 'buy-decision' (if applicable)
  → Player chooses Buy ($X) or Pass
  → If buy: deduct cash, add to properties map
  → Phase: 'end-turn'
  ↓
phase: 'end-turn'
  → If doubles were rolled AND doublesCount < 3 → phase: 'roll' (same player)
  → If 3rd doubles → send to jail, end turn
  → Otherwise → increment currentTurn, switch activePlayer, reset doublesCount
  → If currentTurn > 60 → compute net worth, set winner, phase: 'game-over'
  ↓
OPPONENT'S TURN (or game-over)
```

### Jail Flow

```
phase: 'jail-decision' (shown instead of 'roll' when player is in jail)
  → Option A: Pay $50 → deduct cash, set inJail=false, proceed to normal 'roll'
  → Option B: Try to roll doubles
    • Success → set inJail=false, move to new position, proceed normally
    • Failure → increment jailTurns
      - If jailTurns >= 3 → forced to pay $50, set inJail=false, proceed to 'roll'
      - Otherwise → phase: 'end-turn'
```

## Concurrency & Sync

### Single-Writer Rule

Only the active player's client writes to Supabase. All mutations (rent deduction from opponent's cash, property purchases, jail fees) are computed and written by the active player. The opponent's client is read-only during the other's turn.

### Optimistic Locking

Every write uses `turnSequence` as a guard:

```typescript
const { error } = await supabase
  .from('games')
  .update({ board: newBoard })
  .eq('id', gameId)
  .eq('board->>turnSequence', currentTurnSequence);
```

If the write fails (stale sequence), re-fetch and retry.

### Polling

- 1.5s interval (same as existing games)
- Skip poll response if `turnSequence` matches local state (no changes)
- Apply opponent's moves by diffing `lastRoll` and `phase`

## Rent Calculation

```
Property rent:
  - No houses: base rent from SpaceDefinition
  - With houses: rent[houses] from SpaceDefinition
  - Full color group (no houses): base rent × 2

Railroad rent:
  - 1 owned: $25
  - 2 owned: $50
  - 3 owned: $100
  - 4 owned: $200

Utility rent:
  - 1 owned: dice roll × 4
  - 2 owned: dice roll × 10
```

## Houses & Hotels

- Can only build when owning ALL properties in a color group
- Must build evenly (max 1 house difference between properties in group)
- 4 houses → upgrade to hotel (counts as 5)
- Building happens during the active player's turn after resolving the space they landed on (add a "Build" action available during `end-turn` phase before passing)
- No house supply limit (simplified for 2-player casual)

## Win Conditions

### Bankruptcy (immediate)

If a player's cash drops below $0 after rent/tax, they lose immediately. No option to sell houses or mortgage.

### Turn Limit (net worth comparison)

After 60 total turns, net worth is calculated:
- Cash on hand
- Property purchase prices (sum of original costs)
- Houses: $50 each
- Hotels: $100 each (not $250 — simplified)

Higher net worth wins. Ties are possible (recorded as draw).

## Starting Conditions

- Both players start at GO (position 0)
- $1500 cash each
- No properties owned
- Player 1 goes first
- phase: 'roll', currentTurn: 1, turnSequence: 0

## Board Layout (UI)

Classic square board:
- 11 spaces per side (including corners)
- Properties show name, color strip, price
- Owned properties show player token color
- Houses shown as small squares on property
- Player tokens on their current space
- Center area shows: dice result, cash balances, action buttons

## Integration

### Inbox

1. Add `'monopoly'` to `InboxGameType` union in `src/lib/inbox-types.ts`
2. Add to `.in('game_type', [...])` filter in `src/hooks/useInbox.ts`
3. Add icon (🏠) and label in `src/components/inbox/InboxGameItem.tsx`

### Leaderboard

1. Record to `match_results` with `game_type: 'monopoly'` on game end
2. Add `'monopoly'` to `MatchResultInsert` type
3. Add monopoly stats section in leaderboard display

### Home Page

1. Add Monopoly card to game selection grid
2. Implement `handlePlayMonopolyGame()` following existing pattern:
   - Check for existing active game
   - Check for joinable game
   - Create new game if neither exists
   - Route to `/monopoly/{gameId}`

## Sound Effects

Reuse existing sounds:
- Dice roll → `drop.mp3` (piece placement sound)
- Purchase property → `bounce.mp3`
- Pay rent → existing notification sound
- Win → `win.mp3`
- Bankruptcy → existing sound

## Files to Create

```
src/lib/monopoly/
  types.ts          — TypeScript interfaces
  board-data.ts     — Static 40-space board definition
  logic.ts          — Pure game logic functions
  logic.test.ts     — Unit tests

src/hooks/
  useMonopolyGame.ts — Game state hook

src/app/monopoly/
  [gameId]/
    page.tsx        — Game page

src/components/monopoly/
  MonopolyBoard.tsx     — Visual board (square layout)
  PlayerPanel.tsx       — Cash, properties, status
  DiceDisplay.tsx       — Shows last roll
  PropertyCard.tsx      — Buy decision modal
  JailDecision.tsx      — Jail choice UI
  GameOverSummary.tsx   — Final scores display
  BuildMenu.tsx         — House/hotel building UI
```

## Files to Modify

```
src/lib/inbox-types.ts          — Add 'monopoly' to InboxGameType
src/hooks/useInbox.ts           — Add to game_type filter
src/components/inbox/InboxGameItem.tsx — Add icon/label
src/app/page.tsx                — Add game card + handlePlayMonopolyGame()
src/hooks/useMatchHistory.ts    — Add monopoly to stats computation
src/components/Leaderboard.tsx  — Add monopoly section
```
