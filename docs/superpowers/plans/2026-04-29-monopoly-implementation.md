# Vancouver Monopoly Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 2-player Vancouver-themed Monopoly game with turn-limited gameplay, integrated with the existing inbox and leaderboard systems.

**Architecture:** Pure game logic in `/src/lib/monopoly/`, a game state hook in `/src/hooks/useMonopolyGame.ts`, and UI components in `/src/components/monopoly/`. Uses the existing `games` table with `game_type: 'monopoly'` and polymorphic `board` JSONB. Single-writer rule: only the active player's client mutates state. Optimistic locking via `turnSequence`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (PostgreSQL), Tailwind CSS 4, Framer Motion

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/lib/monopoly/types.ts` | All TypeScript interfaces for the game |
| `src/lib/monopoly/board-data.ts` | Static 40-space Vancouver board definition |
| `src/lib/monopoly/logic.ts` | Pure game logic functions (no React/Supabase) |
| `src/lib/monopoly/logic.test.ts` | Unit tests for game logic |
| `src/hooks/useMonopolyGame.ts` | Game state hook with polling & Supabase sync |
| `src/app/monopoly/[gameId]/page.tsx` | Game page component |
| `src/components/monopoly/MonopolyBoard.tsx` | Visual square board layout |
| `src/components/monopoly/PlayerPanel.tsx` | Cash, properties owned, status display |
| `src/components/monopoly/DiceDisplay.tsx` | Shows last dice roll numbers |
| `src/components/monopoly/PropertyCard.tsx` | Buy decision modal |
| `src/components/monopoly/JailDecision.tsx` | Jail choice UI (pay or roll) |
| `src/components/monopoly/GameOverSummary.tsx` | Final scores & winner display |
| `src/components/monopoly/BuildMenu.tsx` | House/hotel building interface |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/inbox-types.ts` | Add `'monopoly'` to `InboxGameType` union |
| `src/hooks/useInbox.ts` | Add `'monopoly'` to game_type filter array |
| `src/components/inbox/InboxGameItem.tsx` | Add MonopolyMini icon + label case |
| `src/lib/match-results.ts` | Add `'monopoly'` to `GameType` union |
| `src/hooks/useMatchHistory.ts` | Add `'monopoly'` to `MatchResult` type and `by_game` stats |
| `src/components/Leaderboard.tsx` | Add `'monopoly'` to `by_game` interface and render section |
| `src/app/page.tsx` | Add Monopoly game card and `handlePlayMonopolyGame()` |

---

## Task 1: Types

**Files:**
- Create: `src/lib/monopoly/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
import { Player } from '../types';

export type ColorGroup =
  | 'brown' | 'light-blue' | 'pink' | 'orange'
  | 'red' | 'yellow' | 'green' | 'dark-blue';

export type SpaceType = 'property' | 'railroad' | 'utility' | 'tax' | 'corner';
export type CornerType = 'go' | 'jail' | 'free-parking' | 'go-to-jail';

export interface SpaceDefinition {
  index: number;
  name: string;
  type: SpaceType;
  color?: ColorGroup;
  price?: number;
  rent: number[];
  housePrice?: number;
  taxAmount?: number;
  cornerType?: CornerType;
}

export type MonopolyPhase =
  | 'roll'
  | 'buy-decision'
  | 'jail-decision'
  | 'end-turn'
  | 'game-over';

export interface PlayerState {
  position: number;
  cash: number;
  inJail: boolean;
  jailTurns: number;
}

export interface PropertyOwnership {
  owner: Player;
  houses: number; // 0-4 = houses, 5 = hotel
}

export interface LastRoll {
  dice: [number, number];
  from: number;
  to: number;
}

export interface MonopolyBoard {
  players: [PlayerState, PlayerState];
  properties: Record<number, PropertyOwnership>;
  currentTurn: number;
  turnSequence: number;
  activePlayer: Player;
  phase: MonopolyPhase;
  lastRoll: LastRoll | null;
  doublesCount: number;
  winner: Player | null;
  finalNetWorth?: [number, number];
}

export interface MonopolyGame {
  id: string;
  game_type: 'monopoly';
  board: MonopolyBoard;
  current_turn: Player;
  winner: Player | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at: string;
  updated_at: string;
}

export const MAX_TURNS = 60;
export const STARTING_CASH = 1500;
export const GO_SALARY = 200;
export const JAIL_FEE = 50;
export const MAX_JAIL_TURNS = 3;
export const HOUSE_VALUE = 50;
export const HOTEL_VALUE = 250;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/monopoly/types.ts
git commit -m "feat(monopoly): add game type definitions"
```

---

## Task 2: Board Data

**Files:**
- Create: `src/lib/monopoly/board-data.ts`

- [ ] **Step 1: Create the static board definition**

```typescript
import { SpaceDefinition, ColorGroup } from './types';

export const BOARD: SpaceDefinition[] = [
  // Position 0: GO
  { index: 0, name: 'GO', type: 'corner', cornerType: 'go', rent: [] },
  // Brown
  { index: 1, name: 'East Hastings', type: 'property', color: 'brown', price: 60, rent: [2, 10, 30, 90, 160, 250], housePrice: 50 },
  { index: 2, name: 'Community Chest', type: 'corner', cornerType: 'free-parking', rent: [] }, // No-op space
  { index: 3, name: 'Chinatown', type: 'property', color: 'brown', price: 60, rent: [4, 20, 60, 180, 320, 450], housePrice: 50 },
  // Tax
  { index: 4, name: 'Income Tax', type: 'tax', taxAmount: 200, rent: [] },
  // Railroad 1
  { index: 5, name: 'Waterfront Station', type: 'railroad', price: 200, rent: [25, 50, 100, 200] },
  // Light Blue
  { index: 6, name: 'Commercial Drive', type: 'property', color: 'light-blue', price: 100, rent: [6, 30, 90, 270, 400, 550], housePrice: 50 },
  { index: 7, name: 'Chance', type: 'corner', cornerType: 'free-parking', rent: [] }, // No-op space
  { index: 8, name: 'Main Street', type: 'property', color: 'light-blue', price: 100, rent: [6, 30, 90, 270, 400, 550], housePrice: 50 },
  { index: 9, name: 'Kingsway', type: 'property', color: 'light-blue', price: 120, rent: [8, 40, 100, 300, 450, 600], housePrice: 50 },
  // Position 10: Jail
  { index: 10, name: 'Jail / Just Visiting', type: 'corner', cornerType: 'jail', rent: [] },
  // Pink
  { index: 11, name: 'Kitsilano', type: 'property', color: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], housePrice: 100 },
  // Utility 1
  { index: 12, name: 'BC Hydro', type: 'utility', price: 150, rent: [4, 10] },
  { index: 13, name: 'Point Grey', type: 'property', color: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], housePrice: 100 },
  { index: 14, name: 'Jericho Beach', type: 'property', color: 'pink', price: 160, rent: [12, 60, 180, 500, 700, 900], housePrice: 100 },
  // Railroad 2
  { index: 15, name: 'Commercial-Broadway', type: 'railroad', price: 200, rent: [25, 50, 100, 200] },
  // Orange
  { index: 16, name: 'Gastown', type: 'property', color: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], housePrice: 100 },
  { index: 17, name: 'Community Chest', type: 'corner', cornerType: 'free-parking', rent: [] }, // No-op
  { index: 18, name: 'Yaletown', type: 'property', color: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], housePrice: 100 },
  { index: 19, name: 'Coal Harbour', type: 'property', color: 'orange', price: 200, rent: [16, 80, 220, 600, 800, 1000], housePrice: 100 },
  // Position 20: Free Parking
  { index: 20, name: 'Free Parking', type: 'corner', cornerType: 'free-parking', rent: [] },
  // Red
  { index: 21, name: 'Robson Street', type: 'property', color: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], housePrice: 150 },
  { index: 22, name: 'Chance', type: 'corner', cornerType: 'free-parking', rent: [] }, // No-op
  { index: 23, name: 'Davie Street', type: 'property', color: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], housePrice: 150 },
  { index: 24, name: 'Denman Street', type: 'property', color: 'red', price: 240, rent: [20, 100, 300, 750, 925, 1100], housePrice: 150 },
  // Railroad 3
  { index: 25, name: 'Metrotown Station', type: 'railroad', price: 200, rent: [25, 50, 100, 200] },
  // Yellow
  { index: 26, name: 'Granville Island', type: 'property', color: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], housePrice: 150 },
  { index: 27, name: 'Olympic Village', type: 'property', color: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], housePrice: 150 },
  // Utility 2
  { index: 28, name: 'Metro Vancouver Water', type: 'utility', price: 150, rent: [4, 10] },
  { index: 29, name: 'Science World', type: 'property', color: 'yellow', price: 280, rent: [24, 120, 360, 850, 1025, 1200], housePrice: 150 },
  // Position 30: Go to Jail
  { index: 30, name: 'Go to Jail', type: 'corner', cornerType: 'go-to-jail', rent: [] },
  // Green
  { index: 31, name: 'Stanley Park', type: 'property', color: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], housePrice: 200 },
  { index: 32, name: 'English Bay', type: 'property', color: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], housePrice: 200 },
  { index: 33, name: 'Community Chest', type: 'corner', cornerType: 'free-parking', rent: [] }, // No-op
  { index: 34, name: 'UBC', type: 'property', color: 'green', price: 320, rent: [28, 150, 450, 1000, 1200, 1400], housePrice: 200 },
  // Railroad 4
  { index: 35, name: 'King George Station', type: 'railroad', price: 200, rent: [25, 50, 100, 200] },
  { index: 36, name: 'Chance', type: 'corner', cornerType: 'free-parking', rent: [] }, // No-op
  // Dark Blue
  { index: 37, name: 'West Vancouver', type: 'property', color: 'dark-blue', price: 350, rent: [35, 175, 500, 1100, 1300, 1500], housePrice: 200 },
  // Tax
  { index: 38, name: 'Luxury Tax', type: 'tax', taxAmount: 100, rent: [] },
  { index: 39, name: 'Shaughnessy', type: 'property', color: 'dark-blue', price: 400, rent: [50, 200, 600, 1400, 1700, 2000], housePrice: 200 },
];

export function getPropertiesInGroup(color: ColorGroup): number[] {
  return BOARD.filter(s => s.color === color).map(s => s.index);
}

export function getRailroadIndices(): number[] {
  return BOARD.filter(s => s.type === 'railroad').map(s => s.index);
}

export function getUtilityIndices(): number[] {
  return BOARD.filter(s => s.type === 'utility').map(s => s.index);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/monopoly/board-data.ts
git commit -m "feat(monopoly): add Vancouver-themed board data"
```

---

## Task 3: Core Game Logic

**Files:**
- Create: `src/lib/monopoly/logic.ts`

- [ ] **Step 1: Create the logic file with all pure functions**

```typescript
import { Player } from '../types';
import {
  MonopolyBoard, PlayerState, PropertyOwnership, MonopolyPhase, LastRoll,
  MAX_TURNS, STARTING_CASH, GO_SALARY, JAIL_FEE, MAX_JAIL_TURNS,
  HOUSE_VALUE, HOTEL_VALUE, ColorGroup,
} from './types';
import { BOARD, getPropertiesInGroup, getRailroadIndices, getUtilityIndices } from './board-data';

export function createInitialBoard(): MonopolyBoard {
  return {
    players: [
      { position: 0, cash: STARTING_CASH, inJail: false, jailTurns: 0 },
      { position: 0, cash: STARTING_CASH, inJail: false, jailTurns: 0 },
    ],
    properties: {},
    currentTurn: 1,
    turnSequence: 0,
    activePlayer: 1,
    phase: 'roll',
    lastRoll: null,
    doublesCount: 0,
    winner: null,
    finalNetWorth: undefined,
  };
}

export function rollDice(): [number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}

export function isDoubles(dice: [number, number]): boolean {
  return dice[0] === dice[1];
}

export function playerIdx(player: Player): 0 | 1 {
  return (player - 1) as 0 | 1;
}

export function getPlayerState(board: MonopolyBoard, player: Player): PlayerState {
  return board.players[playerIdx(player)];
}

export function updatePlayerState(board: MonopolyBoard, player: Player, updates: Partial<PlayerState>): MonopolyBoard {
  const players = [...board.players] as [PlayerState, PlayerState];
  players[playerIdx(player)] = { ...players[playerIdx(player)], ...updates };
  return { ...board, players };
}

export function movePlayer(board: MonopolyBoard, player: Player, dice: [number, number]): { board: MonopolyBoard; passedGo: boolean } {
  const state = getPlayerState(board, player);
  const from = state.position;
  const spaces = dice[0] + dice[1];
  const to = (from + spaces) % 40;
  const passedGo = to < from && to !== 0;

  let updatedBoard = updatePlayerState(board, player, { position: to });
  if (passedGo || to === 0) {
    const currentCash = getPlayerState(updatedBoard, player).cash;
    updatedBoard = updatePlayerState(updatedBoard, player, { cash: currentCash + GO_SALARY });
  }

  updatedBoard = {
    ...updatedBoard,
    lastRoll: { dice, from, to },
  };

  return { board: updatedBoard, passedGo };
}

export function sendToJail(board: MonopolyBoard, player: Player): MonopolyBoard {
  let updated = updatePlayerState(board, player, { position: 10, inJail: true, jailTurns: 0 });
  updated = { ...updated, doublesCount: 0, phase: 'end-turn' };
  return updated;
}

export function countOwnedRailroads(board: MonopolyBoard, player: Player): number {
  return getRailroadIndices().filter(i => board.properties[i]?.owner === player).length;
}

export function countOwnedUtilities(board: MonopolyBoard, player: Player): number {
  return getUtilityIndices().filter(i => board.properties[i]?.owner === player).length;
}

export function ownsFullGroup(board: MonopolyBoard, player: Player, color: ColorGroup): boolean {
  const indices = getPropertiesInGroup(color);
  return indices.every(i => board.properties[i]?.owner === player);
}

export function calculateRent(board: MonopolyBoard, spaceIndex: number, diceTotal: number): number {
  const space = BOARD[spaceIndex];
  const ownership = board.properties[spaceIndex];
  if (!space || !ownership) return 0;

  const owner = ownership.owner;

  if (space.type === 'railroad') {
    const count = countOwnedRailroads(board, owner);
    return space.rent[count - 1] ?? 0;
  }

  if (space.type === 'utility') {
    const count = countOwnedUtilities(board, owner);
    const multiplier = space.rent[count - 1] ?? 4;
    return diceTotal * multiplier;
  }

  if (space.type === 'property') {
    const houses = ownership.houses;
    if (houses > 0) {
      return space.rent[houses] ?? 0;
    }
    const baseRent = space.rent[0] ?? 0;
    if (space.color && ownsFullGroup(board, owner, space.color)) {
      return baseRent * 2;
    }
    return baseRent;
  }

  return 0;
}

export function resolveLanding(board: MonopolyBoard, player: Player): { board: MonopolyBoard; phase: MonopolyPhase } {
  const state = getPlayerState(board, player);
  const space = BOARD[state.position];

  if (!space) return { board, phase: 'end-turn' };

  switch (space.type) {
    case 'corner': {
      if (space.cornerType === 'go-to-jail') {
        return { board: sendToJail(board, player), phase: 'end-turn' };
      }
      return { board, phase: 'end-turn' };
    }

    case 'tax': {
      const taxAmount = space.taxAmount ?? 0;
      const newCash = state.cash - taxAmount;
      if (newCash < 0) {
        const opponent: Player = player === 1 ? 2 : 1;
        const updated = updatePlayerState(board, player, { cash: newCash });
        const finalNetWorth = calculateNetWorth(updated);
        return { board: { ...updated, winner: opponent, phase: 'game-over', finalNetWorth }, phase: 'game-over' };
      }
      const updated = updatePlayerState(board, player, { cash: newCash });
      return { board: updated, phase: 'end-turn' };
    }

    case 'property':
    case 'railroad':
    case 'utility': {
      const ownership = board.properties[state.position];
      if (!ownership) {
        if (space.price && state.cash >= space.price) {
          return { board, phase: 'buy-decision' };
        }
        return { board, phase: 'end-turn' };
      }
      if (ownership.owner === player) {
        return { board, phase: 'end-turn' };
      }
      // Pay rent to opponent
      const diceTotal = board.lastRoll ? board.lastRoll.dice[0] + board.lastRoll.dice[1] : 0;
      const rent = calculateRent(board, state.position, diceTotal);
      const newCash = state.cash - rent;
      if (newCash < 0) {
        const opponent: Player = player === 1 ? 2 : 1;
        const updated = updatePlayerState(board, player, { cash: newCash });
        const finalNetWorth = calculateNetWorth(updated);
        return { board: { ...updated, winner: opponent, phase: 'game-over', finalNetWorth }, phase: 'game-over' };
      }
      let updated = updatePlayerState(board, player, { cash: newCash });
      const opponent: Player = player === 1 ? 2 : 1;
      const opponentCash = getPlayerState(updated, opponent).cash;
      updated = updatePlayerState(updated, opponent, { cash: opponentCash + rent });
      return { board: updated, phase: 'end-turn' };
    }

    default:
      return { board, phase: 'end-turn' };
  }
}

export function buyProperty(board: MonopolyBoard, player: Player): MonopolyBoard {
  const state = getPlayerState(board, player);
  const space = BOARD[state.position];
  if (!space || !space.price) return board;

  const newProperties = { ...board.properties, [state.position]: { owner: player, houses: 0 } };
  const updated = updatePlayerState(board, player, { cash: state.cash - space.price });
  return { ...updated, properties: newProperties };
}

export function canBuildOnProperty(board: MonopolyBoard, player: Player, spaceIndex: number): boolean {
  const space = BOARD[spaceIndex];
  if (!space || space.type !== 'property' || !space.color) return false;

  const ownership = board.properties[spaceIndex];
  if (!ownership || ownership.owner !== player) return false;
  if (ownership.houses >= 5) return false;

  if (!ownsFullGroup(board, player, space.color)) return false;

  // Check even building: can't be more than 1 house ahead of lowest in group
  const groupIndices = getPropertiesInGroup(space.color);
  const minHouses = Math.min(...groupIndices.map(i => board.properties[i]?.houses ?? 0));
  if (ownership.houses > minHouses) return false;

  // Check affordability
  const cost = space.housePrice ?? 0;
  const state = getPlayerState(board, player);
  if (state.cash < cost) return false;

  return true;
}

export function buildHouse(board: MonopolyBoard, player: Player, spaceIndex: number): MonopolyBoard {
  if (!canBuildOnProperty(board, player, spaceIndex)) return board;

  const space = BOARD[spaceIndex];
  const cost = space.housePrice ?? 0;
  const ownership = board.properties[spaceIndex];

  const newProperties = {
    ...board.properties,
    [spaceIndex]: { ...ownership, houses: ownership.houses + 1 },
  };
  const updated = updatePlayerState(board, player, {
    cash: getPlayerState(board, player).cash - cost,
  });
  return { ...updated, properties: newProperties };
}

export function getBuildableProperties(board: MonopolyBoard, player: Player): number[] {
  return Object.keys(board.properties)
    .map(Number)
    .filter(i => canBuildOnProperty(board, player, i));
}

export function endTurn(board: MonopolyBoard): MonopolyBoard {
  const player = board.activePlayer;
  const lastRoll = board.lastRoll;
  const wasDoubles = lastRoll ? isDoubles(lastRoll.dice) : false;

  // Doubles: roll again (unless in jail or sent to jail)
  if (wasDoubles && !getPlayerState(board, player).inJail && board.doublesCount < 3) {
    return { ...board, phase: 'roll', turnSequence: board.turnSequence + 1 };
  }

  // Switch to other player
  const nextPlayer: Player = player === 1 ? 2 : 1;
  const newTurn = board.currentTurn + 1;

  if (newTurn > MAX_TURNS) {
    const netWorth = calculateNetWorth(board);
    const winner: Player | null = netWorth[0] > netWorth[1] ? 1 : netWorth[1] > netWorth[0] ? 2 : null;
    return {
      ...board,
      currentTurn: newTurn,
      winner,
      finalNetWorth: netWorth,
      phase: 'game-over',
      turnSequence: board.turnSequence + 1,
    };
  }

  const nextPhase: MonopolyPhase = getPlayerState(board, nextPlayer).inJail ? 'jail-decision' : 'roll';

  return {
    ...board,
    activePlayer: nextPlayer,
    currentTurn: newTurn,
    doublesCount: 0,
    lastRoll: null,
    phase: nextPhase,
    turnSequence: board.turnSequence + 1,
  };
}

export function jailPayFee(board: MonopolyBoard, player: Player): MonopolyBoard {
  const state = getPlayerState(board, player);
  const newCash = state.cash - JAIL_FEE;
  if (newCash < 0) {
    const opponent: Player = player === 1 ? 2 : 1;
    const updated = updatePlayerState(board, player, { cash: newCash, inJail: false, jailTurns: 0 });
    const finalNetWorth = calculateNetWorth(updated);
    return { ...updated, winner: opponent, phase: 'game-over', finalNetWorth };
  }
  const updated = updatePlayerState(board, player, { cash: newCash, inJail: false, jailTurns: 0 });
  return { ...updated, phase: 'roll' };
}

export function jailRollForDoubles(board: MonopolyBoard, player: Player, dice: [number, number]): MonopolyBoard {
  if (isDoubles(dice)) {
    let updated = updatePlayerState(board, player, { inJail: false, jailTurns: 0 });
    const moveResult = movePlayer(updated, player, dice);
    updated = { ...moveResult.board, doublesCount: 0 };
    const landing = resolveLanding(updated, player);
    return { ...landing.board, phase: landing.phase, turnSequence: board.turnSequence + 1 };
  }

  const state = getPlayerState(board, player);
  const newJailTurns = state.jailTurns + 1;

  if (newJailTurns >= MAX_JAIL_TURNS) {
    // Forced to pay
    return jailPayFee({ ...board, lastRoll: { dice, from: 10, to: 10 }, turnSequence: board.turnSequence + 1 }, player);
  }

  const updated = updatePlayerState(board, player, { jailTurns: newJailTurns });
  return { ...updated, lastRoll: { dice, from: 10, to: 10 }, phase: 'end-turn', turnSequence: board.turnSequence + 1 };
}

export function calculateNetWorth(board: MonopolyBoard): [number, number] {
  const worth: [number, number] = [
    board.players[0].cash,
    board.players[1].cash,
  ];

  for (const [indexStr, prop] of Object.entries(board.properties)) {
    const spaceIndex = Number(indexStr);
    const space = BOARD[spaceIndex];
    if (!space) continue;

    const idx = playerIdx(prop.owner);
    worth[idx] += space.price ?? 0;

    if (prop.houses > 0 && prop.houses <= 4) {
      worth[idx] += prop.houses * HOUSE_VALUE;
    } else if (prop.houses === 5) {
      worth[idx] += HOTEL_VALUE; // 4 houses + hotel upgrade = $250
    }
  }

  return worth;
}

export function performRoll(board: MonopolyBoard, player: Player, dice: [number, number]): MonopolyBoard {
  const newDoublesCount = isDoubles(dice) ? board.doublesCount + 1 : 0;

  // 3 doubles = go to jail
  if (newDoublesCount >= 3) {
    const updated = { ...board, doublesCount: newDoublesCount, turnSequence: board.turnSequence + 1 };
    return sendToJail(updated, player);
  }

  const moveResult = movePlayer(board, player, dice);
  let updated = { ...moveResult.board, doublesCount: newDoublesCount, turnSequence: board.turnSequence + 1 };

  const landing = resolveLanding(updated, player);
  return { ...landing.board, phase: landing.phase };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/monopoly/logic.ts
git commit -m "feat(monopoly): add core game logic"
```

---

## Task 4: Game Logic Tests

**Files:**
- Create: `src/lib/monopoly/logic.test.ts`

- [ ] **Step 1: Create unit tests**

```typescript
import { describe, test, expect } from 'vitest';
import {
  createInitialBoard, rollDice, isDoubles, movePlayer, sendToJail,
  calculateRent, resolveLanding, buyProperty, endTurn, buildHouse,
  canBuildOnProperty, getBuildableProperties, jailPayFee, jailRollForDoubles,
  calculateNetWorth, performRoll, playerIdx, getPlayerState, ownsFullGroup,
} from './logic';
import { MonopolyBoard, STARTING_CASH, GO_SALARY, JAIL_FEE, MAX_TURNS, HOUSE_VALUE, HOTEL_VALUE } from './types';
import { BOARD } from './board-data';

describe('createInitialBoard', () => {
  test('creates board with correct initial state', () => {
    const board = createInitialBoard();
    expect(board.players[0].cash).toBe(STARTING_CASH);
    expect(board.players[1].cash).toBe(STARTING_CASH);
    expect(board.players[0].position).toBe(0);
    expect(board.players[1].position).toBe(0);
    expect(board.activePlayer).toBe(1);
    expect(board.phase).toBe('roll');
    expect(board.currentTurn).toBe(1);
    expect(board.turnSequence).toBe(0);
    expect(board.winner).toBeNull();
  });
});

describe('rollDice', () => {
  test('returns two numbers between 1 and 6', () => {
    for (let i = 0; i < 100; i++) {
      const [a, b] = rollDice();
      expect(a).toBeGreaterThanOrEqual(1);
      expect(a).toBeLessThanOrEqual(6);
      expect(b).toBeGreaterThanOrEqual(1);
      expect(b).toBeLessThanOrEqual(6);
    }
  });
});

describe('isDoubles', () => {
  test('returns true for matching dice', () => {
    expect(isDoubles([3, 3])).toBe(true);
  });
  test('returns false for non-matching dice', () => {
    expect(isDoubles([3, 4])).toBe(false);
  });
});

describe('movePlayer', () => {
  test('moves player forward', () => {
    const board = createInitialBoard();
    const { board: updated } = movePlayer(board, 1, [3, 4]);
    expect(getPlayerState(updated, 1).position).toBe(7);
  });

  test('wraps around and collects GO salary', () => {
    let board = createInitialBoard();
    board = { ...board, players: [{ ...board.players[0], position: 38 }, board.players[1]] };
    const { board: updated, passedGo } = movePlayer(board, 1, [3, 4]);
    expect(getPlayerState(updated, 1).position).toBe(5);
    expect(passedGo).toBe(true);
    expect(getPlayerState(updated, 1).cash).toBe(STARTING_CASH + GO_SALARY);
  });
});

describe('sendToJail', () => {
  test('sends player to position 10 and marks as in jail', () => {
    let board = createInitialBoard();
    board = { ...board, players: [{ ...board.players[0], position: 30 }, board.players[1]] };
    const updated = sendToJail(board, 1);
    expect(getPlayerState(updated, 1).position).toBe(10);
    expect(getPlayerState(updated, 1).inJail).toBe(true);
    expect(updated.phase).toBe('end-turn');
  });
});

describe('calculateRent', () => {
  test('returns base rent for unimproved property', () => {
    let board = createInitialBoard();
    board = { ...board, properties: { 1: { owner: 2, houses: 0 } } };
    const rent = calculateRent(board, 1, 7);
    expect(rent).toBe(2); // East Hastings base rent
  });

  test('returns double rent for full color group', () => {
    let board = createInitialBoard();
    board = { ...board, properties: { 1: { owner: 2, houses: 0 }, 3: { owner: 2, houses: 0 } } };
    const rent = calculateRent(board, 1, 7);
    expect(rent).toBe(4); // 2 * 2 = doubled base rent
  });

  test('returns house rent', () => {
    let board = createInitialBoard();
    board = { ...board, properties: { 1: { owner: 2, houses: 2 }, 3: { owner: 2, houses: 2 } } };
    const rent = calculateRent(board, 1, 7);
    expect(rent).toBe(30); // East Hastings with 2 houses
  });

  test('railroad rent scales with count', () => {
    let board = createInitialBoard();
    board = { ...board, properties: { 5: { owner: 1, houses: 0 }, 15: { owner: 1, houses: 0 } } };
    expect(calculateRent(board, 5, 7)).toBe(50); // 2 railroads owned
  });

  test('utility rent uses dice total', () => {
    let board = createInitialBoard();
    board = { ...board, properties: { 12: { owner: 1, houses: 0 } } };
    expect(calculateRent(board, 12, 8)).toBe(32); // 8 * 4
  });
});

describe('buyProperty', () => {
  test('deducts price and assigns ownership', () => {
    let board = createInitialBoard();
    board = { ...board, players: [{ ...board.players[0], position: 1 }, board.players[1]] };
    const updated = buyProperty(board, 1);
    expect(getPlayerState(updated, 1).cash).toBe(STARTING_CASH - 60);
    expect(updated.properties[1]).toEqual({ owner: 1, houses: 0 });
  });
});

describe('buildHouse', () => {
  test('builds a house when owning full group', () => {
    let board = createInitialBoard();
    board = { ...board, properties: { 1: { owner: 1, houses: 0 }, 3: { owner: 1, houses: 0 } } };
    const updated = buildHouse(board, 1, 1);
    expect(updated.properties[1].houses).toBe(1);
    expect(getPlayerState(updated, 1).cash).toBe(STARTING_CASH - 50);
  });

  test('enforces even building', () => {
    let board = createInitialBoard();
    board = { ...board, properties: { 1: { owner: 1, houses: 1 }, 3: { owner: 1, houses: 0 } } };
    expect(canBuildOnProperty(board, 1, 1)).toBe(false);
    expect(canBuildOnProperty(board, 1, 3)).toBe(true);
  });
});

describe('endTurn', () => {
  test('switches to other player', () => {
    let board = createInitialBoard();
    board = { ...board, lastRoll: { dice: [3, 4], from: 0, to: 7 } };
    const updated = endTurn(board);
    expect(updated.activePlayer).toBe(2);
    expect(updated.currentTurn).toBe(2);
    expect(updated.phase).toBe('roll');
  });

  test('keeps same player on doubles', () => {
    let board = createInitialBoard();
    board = { ...board, lastRoll: { dice: [3, 3], from: 0, to: 6 }, doublesCount: 1 };
    const updated = endTurn(board);
    expect(updated.activePlayer).toBe(1);
    expect(updated.phase).toBe('roll');
  });

  test('ends game after MAX_TURNS', () => {
    let board = createInitialBoard();
    board = { ...board, currentTurn: MAX_TURNS, lastRoll: { dice: [3, 4], from: 0, to: 7 } };
    const updated = endTurn(board);
    expect(updated.phase).toBe('game-over');
    expect(updated.finalNetWorth).toBeDefined();
  });
});

describe('jailPayFee', () => {
  test('deducts fee and frees player', () => {
    let board = createInitialBoard();
    board = { ...board, players: [{ ...board.players[0], inJail: true, jailTurns: 0 }, board.players[1]] };
    const updated = jailPayFee(board, 1);
    expect(getPlayerState(updated, 1).cash).toBe(STARTING_CASH - JAIL_FEE);
    expect(getPlayerState(updated, 1).inJail).toBe(false);
    expect(updated.phase).toBe('roll');
  });
});

describe('calculateNetWorth', () => {
  test('includes cash and property values', () => {
    let board = createInitialBoard();
    board = { ...board, properties: { 1: { owner: 1, houses: 2 }, 39: { owner: 2, houses: 0 } } };
    const [p1, p2] = calculateNetWorth(board);
    expect(p1).toBe(STARTING_CASH + 60 + 2 * HOUSE_VALUE); // cash + property price + 2 houses
    expect(p2).toBe(STARTING_CASH + 400); // cash + Shaughnessy price
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/lib/monopoly/logic.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/monopoly/logic.test.ts
git commit -m "test(monopoly): add unit tests for game logic"
```

---

## Task 5: Game Hook

**Files:**
- Create: `src/hooks/useMonopolyGame.ts`

- [ ] **Step 1: Create the game state hook**

```typescript
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Player } from '@/lib/types';
import { MonopolyGame, MonopolyBoard, MonopolyPhase } from '@/lib/monopoly/types';
import {
  createInitialBoard, rollDice, performRoll, buyProperty, endTurn,
  buildHouse, jailPayFee, jailRollForDoubles, resolveLanding,
  getPlayerState, getBuildableProperties,
} from '@/lib/monopoly/logic';
import { recordMatchResult, GameType } from '@/lib/match-results';

const POLL_INTERVAL_MS = 1500;

interface UseMonopolyGameReturn {
  game: MonopolyGame | null;
  loading: boolean;
  error: string | null;
  myPlayer: Player | null;
  isMyTurn: boolean;
  roll: () => Promise<void>;
  buy: () => Promise<void>;
  pass: () => Promise<void>;
  build: (spaceIndex: number) => Promise<void>;
  endMyTurn: () => Promise<void>;
  payJailFee: () => Promise<void>;
  rollForDoubles: () => Promise<void>;
  buildableProperties: number[];
  resetGame: () => Promise<void>;
}

export function useMonopolyGame(gameId: string): UseMonopolyGameReturn {
  const [game, setGame] = useState<MonopolyGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const gameRef = useRef<MonopolyGame | null>(null);
  const matchRecorded = useRef(false);

  const getMyPlayer = useCallback((): Player | null => {
    const name = sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
    if (!game) return null;
    if (name === game.player1_name) return 1;
    if (name === game.player2_name) return 2;
    return null;
  }, [game]);

  const myPlayer = getMyPlayer();
  const isMyTurn = game?.board.activePlayer === myPlayer && game?.board.phase !== 'game-over';

  const fetchGame = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (fetchError || !data) {
      if (!gameRef.current) setError('Game not found');
      return;
    }

    const fresh = data as MonopolyGame;
    const prev = gameRef.current;

    if (prev && fresh.board.turnSequence <= prev.board.turnSequence) return;

    gameRef.current = fresh;
    setGame(fresh);
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchGame]);

  // Record match result when game ends
  useEffect(() => {
    if (!game || game.board.phase !== 'game-over' || matchRecorded.current) return;
    if (!game.player1_id || !game.player2_id || !game.player1_name || !game.player2_name) return;
    matchRecorded.current = true;

    const winner = game.board.winner;
    const isDraw = winner === null;

    recordMatchResult({
      game_type: 'monopoly' as GameType,
      winner_id: winner === 1 ? game.player1_id : winner === 2 ? game.player2_id : null,
      winner_name: winner === 1 ? game.player1_name : winner === 2 ? game.player2_name : null,
      loser_id: winner === 1 ? game.player2_id : winner === 2 ? game.player1_id : null,
      loser_name: winner === 1 ? game.player2_name : winner === 2 ? game.player1_name : null,
      is_draw: isDraw,
      metadata: game.board.finalNetWorth ? { netWorth: game.board.finalNetWorth } : null,
      player1_id: game.player1_id,
      player1_name: game.player1_name,
      player2_id: game.player2_id,
      player2_name: game.player2_name,
    });
  }, [game]);

  const updateBoard = useCallback(async (newBoard: MonopolyBoard) => {
    const current = gameRef.current;
    if (!current) return;

    const optimistic = { ...current, board: newBoard };
    gameRef.current = optimistic;
    setGame(optimistic);

    const { error: updateError } = await supabase
      .from('games')
      .update({
        board: newBoard,
        current_turn: newBoard.activePlayer,
        winner: newBoard.winner,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .eq('board->>turnSequence', String(current.board.turnSequence));

    if (updateError) {
      await fetchGame();
    }
  }, [gameId, fetchGame]);

  const roll = useCallback(async () => {
    const current = gameRef.current;
    if (!current || !myPlayer || current.board.activePlayer !== myPlayer) return;
    if (current.board.phase !== 'roll') return;

    const dice = rollDice();
    const newBoard = performRoll(current.board, myPlayer, dice);
    await updateBoard(newBoard);
  }, [myPlayer, updateBoard]);

  const buy = useCallback(async () => {
    const current = gameRef.current;
    if (!current || !myPlayer || current.board.phase !== 'buy-decision') return;

    const newBoard = buyProperty(current.board, myPlayer);
    await updateBoard({ ...newBoard, phase: 'end-turn', turnSequence: newBoard.turnSequence + 1 });
  }, [myPlayer, updateBoard]);

  const pass = useCallback(async () => {
    const current = gameRef.current;
    if (!current || !myPlayer || current.board.phase !== 'buy-decision') return;

    await updateBoard({ ...current.board, phase: 'end-turn', turnSequence: current.board.turnSequence + 1 });
  }, [myPlayer, updateBoard]);

  const build = useCallback(async (spaceIndex: number) => {
    const current = gameRef.current;
    if (!current || !myPlayer) return;

    const newBoard = buildHouse(current.board, myPlayer, spaceIndex);
    await updateBoard({ ...newBoard, turnSequence: newBoard.turnSequence + 1 });
  }, [myPlayer, updateBoard]);

  const endMyTurn = useCallback(async () => {
    const current = gameRef.current;
    if (!current || !myPlayer || current.board.phase !== 'end-turn') return;

    const newBoard = endTurn(current.board);
    await updateBoard(newBoard);
  }, [myPlayer, updateBoard]);

  const payJailFee = useCallback(async () => {
    const current = gameRef.current;
    if (!current || !myPlayer || current.board.phase !== 'jail-decision') return;

    const newBoard = jailPayFee(current.board, myPlayer);
    await updateBoard({ ...newBoard, turnSequence: current.board.turnSequence + 1 });
  }, [myPlayer, updateBoard]);

  const rollForDoubles = useCallback(async () => {
    const current = gameRef.current;
    if (!current || !myPlayer || current.board.phase !== 'jail-decision') return;

    const dice = rollDice();
    const newBoard = jailRollForDoubles(current.board, myPlayer, dice);
    await updateBoard(newBoard);
  }, [myPlayer, updateBoard]);

  const buildableProperties = game && myPlayer ? getBuildableProperties(game.board, myPlayer) : [];

  const resetGame = useCallback(async () => {
    const newBoard = createInitialBoard();
    const { error: updateError } = await supabase
      .from('games')
      .update({
        board: newBoard,
        current_turn: 1,
        winner: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (!updateError) {
      matchRecorded.current = false;
      gameRef.current = null;
      await fetchGame();
    }
  }, [gameId, fetchGame]);

  return {
    game, loading, error, myPlayer, isMyTurn,
    roll, buy, pass, build, endMyTurn, payJailFee, rollForDoubles,
    buildableProperties, resetGame,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useMonopolyGame.ts
git commit -m "feat(monopoly): add game state hook with Supabase sync"
```

---

## Task 6: UI Components

**Files:**
- Create: `src/components/monopoly/DiceDisplay.tsx`
- Create: `src/components/monopoly/PlayerPanel.tsx`
- Create: `src/components/monopoly/PropertyCard.tsx`
- Create: `src/components/monopoly/JailDecision.tsx`
- Create: `src/components/monopoly/GameOverSummary.tsx`
- Create: `src/components/monopoly/BuildMenu.tsx`
- Create: `src/components/monopoly/MonopolyBoard.tsx`

- [ ] **Step 1: Create DiceDisplay**

```typescript
'use client';

import { LastRoll } from '@/lib/monopoly/types';

interface DiceDisplayProps {
  lastRoll: LastRoll | null;
}

export function DiceDisplay({ lastRoll }: DiceDisplayProps) {
  if (!lastRoll) return null;

  const [d1, d2] = lastRoll.dice;
  const total = d1 + d2;
  const doubles = d1 === d2;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-lg font-bold text-text-primary">
          {d1}
        </div>
        <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-lg font-bold text-text-primary">
          {d2}
        </div>
      </div>
      <span className="text-sm text-text-secondary">
        = {total}{doubles && ' (Doubles!)'}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Create PlayerPanel**

```typescript
'use client';

import { Player } from '@/lib/types';
import { MonopolyBoard, PropertyOwnership } from '@/lib/monopoly/types';
import { BOARD } from '@/lib/monopoly/board-data';

interface PlayerPanelProps {
  board: MonopolyBoard;
  player: Player;
  name: string;
  isActive: boolean;
}

export function PlayerPanel({ board, player, name, isActive }: PlayerPanelProps) {
  const state = board.players[player - 1];
  const ownedProperties = Object.entries(board.properties)
    .filter(([, prop]) => prop.owner === player)
    .map(([idx]) => Number(idx));

  return (
    <div className={`rounded-2xl border p-4 ${isActive ? 'border-player1 bg-player1/5' : 'border-border bg-surface/50'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text-primary">{name}</h3>
        {isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-player1/10 text-player1 font-medium">Active</span>}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Cash</span>
          <span className="text-sm font-semibold text-text-primary">${state.cash}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Position</span>
          <span className="text-sm text-text-primary">{BOARD[state.position]?.name ?? 'GO'}</span>
        </div>
        {state.inJail && (
          <div className="text-xs text-red-500 font-medium">In Jail (Turn {state.jailTurns + 1}/3)</div>
        )}
        {ownedProperties.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border">
            <span className="text-xs text-text-secondary">Properties ({ownedProperties.length})</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {ownedProperties.map(idx => {
                const space = BOARD[idx];
                return (
                  <span
                    key={idx}
                    className="text-xs px-1.5 py-0.5 rounded bg-background border border-border text-text-secondary"
                    title={space.name}
                  >
                    {space.name.split(' ')[0]}
                    {board.properties[idx].houses > 0 && ` (${board.properties[idx].houses}H)`}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create PropertyCard**

```typescript
'use client';

import { BOARD } from '@/lib/monopoly/board-data';
import { MonopolyBoard } from '@/lib/monopoly/types';
import { Player } from '@/lib/types';
import { getPlayerState } from '@/lib/monopoly/logic';

interface PropertyCardProps {
  board: MonopolyBoard;
  player: Player;
  onBuy: () => void;
  onPass: () => void;
}

export function PropertyCard({ board, player, onBuy, onPass }: PropertyCardProps) {
  const state = getPlayerState(board, player);
  const space = BOARD[state.position];
  if (!space || !space.price) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 max-w-sm mx-auto">
      <h3 className="text-lg font-bold text-text-primary mb-1">{space.name}</h3>
      {space.color && (
        <div className="text-xs text-text-secondary mb-3 capitalize">{space.color.replace('-', ' ')} group</div>
      )}
      <div className="space-y-1 mb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">Price</span>
          <span className="font-semibold">${space.price}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Base Rent</span>
          <span>${space.rent[0]}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Your Cash</span>
          <span className="font-semibold">${state.cash}</span>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onBuy}
          className="flex-1 px-4 py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition-colors cursor-pointer"
        >
          Buy ${space.price}
        </button>
        <button
          onClick={onPass}
          className="flex-1 px-4 py-2 rounded-xl bg-background border border-border text-text-secondary font-medium hover:bg-surface transition-colors cursor-pointer"
        >
          Pass
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create JailDecision**

```typescript
'use client';

import { MonopolyBoard, JAIL_FEE } from '@/lib/monopoly/types';
import { Player } from '@/lib/types';
import { getPlayerState } from '@/lib/monopoly/logic';

interface JailDecisionProps {
  board: MonopolyBoard;
  player: Player;
  onPayFee: () => void;
  onRollForDoubles: () => void;
}

export function JailDecision({ board, player, onPayFee, onRollForDoubles }: JailDecisionProps) {
  const state = getPlayerState(board, player);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 max-w-sm mx-auto">
      <h3 className="text-lg font-bold text-text-primary mb-2">In Jail</h3>
      <p className="text-sm text-text-secondary mb-4">
        Turn {state.jailTurns + 1} of 3. Roll doubles to escape, or pay ${JAIL_FEE}.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onRollForDoubles}
          className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Roll for Doubles
        </button>
        <button
          onClick={onPayFee}
          disabled={state.cash < JAIL_FEE}
          className="flex-1 px-4 py-2 rounded-xl bg-background border border-border text-text-secondary font-medium hover:bg-surface transition-colors cursor-pointer disabled:opacity-50"
        >
          Pay ${JAIL_FEE}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create GameOverSummary**

```typescript
'use client';

import { MonopolyBoard } from '@/lib/monopoly/types';

interface GameOverSummaryProps {
  board: MonopolyBoard;
  player1Name: string;
  player2Name: string;
  onPlayAgain: () => void;
}

export function GameOverSummary({ board, player1Name, player2Name, onPlayAgain }: GameOverSummaryProps) {
  const winnerName = board.winner === 1 ? player1Name : board.winner === 2 ? player2Name : null;
  const [nw1, nw2] = board.finalNetWorth ?? [0, 0];

  return (
    <div className="rounded-2xl border border-border bg-surface p-8 max-w-md mx-auto text-center">
      <h2 className="text-2xl font-bold text-text-primary mb-2">
        {winnerName ? `${winnerName} Wins!` : "It's a Draw!"}
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        {board.currentTurn > 60 ? 'Turn limit reached — highest net worth wins.' : 'Opponent went bankrupt!'}
      </p>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-background p-4">
          <p className="text-xs text-text-secondary mb-1">{player1Name}</p>
          <p className="text-lg font-bold text-text-primary">${nw1.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-background p-4">
          <p className="text-xs text-text-secondary mb-1">{player2Name}</p>
          <p className="text-lg font-bold text-text-primary">${nw2.toLocaleString()}</p>
        </div>
      </div>
      <button
        onClick={onPlayAgain}
        className="px-6 py-2.5 rounded-xl bg-player1 text-white font-medium hover:opacity-90 transition-opacity cursor-pointer"
      >
        Play Again
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Create BuildMenu**

```typescript
'use client';

import { BOARD } from '@/lib/monopoly/board-data';
import { MonopolyBoard } from '@/lib/monopoly/types';

interface BuildMenuProps {
  board: MonopolyBoard;
  buildableProperties: number[];
  onBuild: (spaceIndex: number) => void;
  onDone: () => void;
}

export function BuildMenu({ board, buildableProperties, onBuild, onDone }: BuildMenuProps) {
  if (buildableProperties.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-text-primary">Build Houses</h4>
        <button
          onClick={onDone}
          className="text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          Done Building
        </button>
      </div>
      <div className="space-y-2">
        {buildableProperties.map(idx => {
          const space = BOARD[idx];
          const houses = board.properties[idx]?.houses ?? 0;
          return (
            <button
              key={idx}
              onClick={() => onBuild(idx)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-background transition-colors cursor-pointer"
            >
              <span className="text-sm text-text-primary">{space.name} ({houses}H)</span>
              <span className="text-xs text-text-secondary">${space.housePrice}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create MonopolyBoard**

```typescript
'use client';

import { MonopolyBoard as BoardState, PropertyOwnership } from '@/lib/monopoly/types';
import { BOARD } from '@/lib/monopoly/board-data';
import { Player } from '@/lib/types';

interface MonopolyBoardProps {
  board: BoardState;
}

const COLOR_MAP: Record<string, string> = {
  'brown': '#8B4513',
  'light-blue': '#87CEEB',
  'pink': '#FF69B4',
  'orange': '#FFA500',
  'red': '#FF0000',
  'yellow': '#FFD700',
  'green': '#008000',
  'dark-blue': '#00008B',
};

function getBoardPosition(index: number): { row: number; col: number; side: 'bottom' | 'left' | 'top' | 'right' } {
  if (index <= 10) return { row: 10, col: 10 - index, side: 'bottom' };
  if (index <= 20) return { row: 10 - (index - 10), col: 0, side: 'left' };
  if (index <= 30) return { row: 0, col: index - 20, side: 'top' };
  return { row: index - 30, col: 10, side: 'right' };
}

function SpaceCell({ index, board }: { index: number; board: BoardState }) {
  const space = BOARD[index];
  const pos = getBoardPosition(index);
  const ownership = board.properties[index];
  const isCorner = (pos.col === 0 && pos.row === 0) || (pos.col === 10 && pos.row === 0) ||
                   (pos.col === 0 && pos.row === 10) || (pos.col === 10 && pos.row === 10);

  const p1Here = board.players[0].position === index;
  const p2Here = board.players[1].position === index;

  return (
    <div
      className={`relative border border-border/50 flex flex-col items-center justify-center overflow-hidden ${isCorner ? 'w-16 h-16' : pos.side === 'top' || pos.side === 'bottom' ? 'w-10 h-16' : 'w-16 h-10'}`}
      title={space.name}
    >
      {space.color && (
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ backgroundColor: COLOR_MAP[space.color] ?? '#ccc' }}
        />
      )}
      <span className="text-[6px] text-text-secondary text-center leading-tight px-0.5 mt-1">
        {space.name.length > 12 ? space.name.slice(0, 10) + '…' : space.name}
      </span>
      {ownership && (
        <div className={`w-2 h-2 rounded-full absolute bottom-1 left-1 ${ownership.owner === 1 ? 'bg-player1' : 'bg-player2'}`} />
      )}
      <div className="absolute bottom-1 right-1 flex gap-0.5">
        {p1Here && <div className="w-2.5 h-2.5 rounded-full bg-player1 border border-white" />}
        {p2Here && <div className="w-2.5 h-2.5 rounded-full bg-player2 border border-white" />}
      </div>
    </div>
  );
}

export function MonopolyBoardView({ board }: MonopolyBoardProps) {
  // Build 11x11 grid
  const topRow = Array.from({ length: 11 }, (_, i) => 20 + i); // 20-30
  const bottomRow = Array.from({ length: 11 }, (_, i) => 10 - i); // 10-0
  const leftCol = Array.from({ length: 9 }, (_, i) => 19 - i); // 19-11
  const rightCol = Array.from({ length: 9 }, (_, i) => 31 + i); // 31-39

  return (
    <div className="inline-block">
      {/* Top row */}
      <div className="flex">
        {topRow.map(i => <SpaceCell key={i} index={i} board={board} />)}
      </div>
      {/* Middle rows */}
      <div className="flex">
        <div className="flex flex-col">
          {leftCol.map(i => <SpaceCell key={i} index={i} board={board} />)}
        </div>
        <div className="flex-1 flex items-center justify-center bg-surface/30 border border-border/30" style={{ minWidth: '360px', minHeight: '360px' }}>
          <div className="text-center p-4">
            <h2 className="text-xl font-bold text-text-primary mb-1">Vancouver</h2>
            <p className="text-xs text-text-secondary">Monopoly</p>
            <p className="text-xs text-text-secondary mt-2">Turn {board.currentTurn}/60</p>
          </div>
        </div>
        <div className="flex flex-col">
          {rightCol.map(i => <SpaceCell key={i} index={i} board={board} />)}
        </div>
      </div>
      {/* Bottom row */}
      <div className="flex">
        {bottomRow.map(i => <SpaceCell key={i} index={i} board={board} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add src/components/monopoly/
git commit -m "feat(monopoly): add UI components"
```

---

## Task 7: Game Page

**Files:**
- Create: `src/app/monopoly/[gameId]/page.tsx`

- [ ] **Step 1: Create the game page**

```typescript
'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useMonopolyGame } from '@/hooks/useMonopolyGame';
import { useGameSounds } from '@/hooks/useSound';
import { MonopolyBoardView } from '@/components/monopoly/MonopolyBoard';
import { PlayerPanel } from '@/components/monopoly/PlayerPanel';
import { DiceDisplay } from '@/components/monopoly/DiceDisplay';
import { PropertyCard } from '@/components/monopoly/PropertyCard';
import { JailDecision } from '@/components/monopoly/JailDecision';
import { GameOverSummary } from '@/components/monopoly/GameOverSummary';
import { BuildMenu } from '@/components/monopoly/BuildMenu';
import { TurnIndicator } from '@/components/TurnIndicator';
import { SettingsButton } from '@/components/SettingsButton';
import { BOARD } from '@/lib/monopoly/board-data';

export default function MonopolyGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const {
    game, loading, error, myPlayer, isMyTurn,
    roll, buy, pass, build, endMyTurn, payJailFee, rollForDoubles,
    buildableProperties, resetGame,
  } = useMonopolyGame(gameId);
  const { play } = useGameSounds();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary">Loading game...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error ?? 'Game not found'}</p>
      </div>
    );
  }

  const { board } = game;
  const player1Name = game.player1_name ?? 'Player 1';
  const player2Name = game.player2_name ?? 'Player 2';

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <SettingsButton />

      {/* Back button */}
      <button
        onClick={() => router.push('/')}
        className="mb-4 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
      >
        &larr; Back
      </button>

      <div className="max-w-7xl mx-auto">
        {/* Turn Indicator */}
        {board.phase !== 'game-over' && (
          <div className="mb-4">
            <TurnIndicator
              currentPlayer={board.activePlayer}
              isMyTurn={isMyTurn}
              playerName={board.activePlayer === 1 ? player1Name : player2Name}
            />
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left panel: Player info */}
          <div className="lg:w-64 space-y-4">
            <PlayerPanel board={board} player={1} name={player1Name} isActive={board.activePlayer === 1} />
            <PlayerPanel board={board} player={2} name={player2Name} isActive={board.activePlayer === 2} />
          </div>

          {/* Center: Board */}
          <div className="flex-1 flex flex-col items-center">
            <div className="overflow-auto">
              <MonopolyBoardView board={board} />
            </div>
          </div>

          {/* Right panel: Actions */}
          <div className="lg:w-72 space-y-4">
            {/* Dice display */}
            {board.lastRoll && <DiceDisplay lastRoll={board.lastRoll} />}

            {/* Phase-specific actions */}
            {board.phase === 'game-over' && (
              <GameOverSummary
                board={board}
                player1Name={player1Name}
                player2Name={player2Name}
                onPlayAgain={resetGame}
              />
            )}

            {board.phase === 'jail-decision' && isMyTurn && (
              <JailDecision
                board={board}
                player={myPlayer!}
                onPayFee={payJailFee}
                onRollForDoubles={rollForDoubles}
              />
            )}

            {board.phase === 'buy-decision' && isMyTurn && (
              <PropertyCard board={board} player={myPlayer!} onBuy={() => { play('bounce'); buy(); }} onPass={pass} />
            )}

            {board.phase === 'roll' && isMyTurn && (
              <motion.button
                onClick={() => { play('drop'); roll(); }}
                className="w-full px-6 py-3 rounded-xl bg-player1 text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                whileTap={{ scale: 0.95 }}
              >
                Roll Dice
              </motion.button>
            )}

            {board.phase === 'end-turn' && isMyTurn && (
              <div className="space-y-3">
                {buildableProperties.length > 0 && (
                  <BuildMenu
                    board={board}
                    buildableProperties={buildableProperties}
                    onBuild={build}
                    onDone={endMyTurn}
                  />
                )}
                <motion.button
                  onClick={endMyTurn}
                  className="w-full px-6 py-3 rounded-xl bg-surface border border-border text-text-primary font-medium hover:bg-background transition-colors cursor-pointer"
                  whileTap={{ scale: 0.95 }}
                >
                  End Turn
                </motion.button>
              </div>
            )}

            {!isMyTurn && board.phase !== 'game-over' && (
              <p className="text-center text-sm text-text-secondary py-4">
                Waiting for opponent...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/monopoly/
git commit -m "feat(monopoly): add game page"
```

---

## Task 8: Integration — Inbox, Leaderboard, Home Page

**Files:**
- Modify: `src/lib/inbox-types.ts:1`
- Modify: `src/hooks/useInbox.ts:39`
- Modify: `src/components/inbox/InboxGameItem.tsx:71-89`
- Modify: `src/lib/match-results.ts:3`
- Modify: `src/hooks/useMatchHistory.ts:8`
- Modify: `src/hooks/useMatchHistory.ts:28-32`
- Modify: `src/hooks/useMatchHistory.ts:51-53`
- Modify: `src/components/Leaderboard.tsx:8-13`
- Modify: `src/components/Leaderboard.tsx:104-123`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update InboxGameType**

In `src/lib/inbox-types.ts`, change line 1:

```typescript
export type InboxGameType = 'connect-four' | 'tic-tac-toe' | 'checkers' | 'battleship' | 'mini-golf' | 'monopoly';
```

- [ ] **Step 2: Update useInbox filter**

In `src/hooks/useInbox.ts`, change the `.in('game_type', [...])` at line 39:

```typescript
        .in('game_type', ['connect-four', 'tic-tac-toe', 'checkers', 'battleship', 'mini-golf', 'monopoly'])
```

- [ ] **Step 3: Add Monopoly icon and label to InboxGameItem**

In `src/components/inbox/InboxGameItem.tsx`, add before the `GameIcon` function:

```typescript
function MonopolyMini() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#008000]/10 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#008000" strokeWidth="2">
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
      </svg>
    </div>
  );
}
```

Add `case 'monopoly': return <MonopolyMini />;` to the `GameIcon` switch.
Add `case 'monopoly': return 'Monopoly';` to the `gameLabel` switch.

- [ ] **Step 4: Update match-results GameType**

In `src/lib/match-results.ts`, change line 3:

```typescript
export type GameType = 'connect-four' | 'tic-tac-toe' | 'wordle' | 'mini-golf' | 'monopoly';
```

- [ ] **Step 5: Update useMatchHistory MatchResult type**

In `src/hooks/useMatchHistory.ts`, change the `game_type` in the `MatchResult` interface (line 8):

```typescript
  game_type: 'connect-four' | 'tic-tac-toe' | 'wordle' | 'mini-golf' | 'monopoly';
```

Add `'monopoly'` to the `by_game` object in `LeaderboardStats` (after line 32):

```typescript
    'monopoly': { ricky: number; lilian: number; draws: number };
```

Add `'monopoly': { ricky: 0, lilian: 0, draws: 0 },` to the `by_game` initialization in `computeStats`.

Update the `gameKey` cast to include monopoly:

```typescript
    const gameKey = r.game_type as 'connect-four' | 'tic-tac-toe' | 'mini-golf' | 'monopoly';
```

- [ ] **Step 6: Update Leaderboard component**

In `src/components/Leaderboard.tsx`, add `'monopoly'` to the `by_game` interface and add a `GameStat` entry:

```typescript
<GameStat
  label="Monopoly"
  ricky={stats.by_game['monopoly'].ricky}
  lilian={stats.by_game['monopoly'].lilian}
  draws={stats.by_game['monopoly'].draws}
/>
```

- [ ] **Step 7: Add Monopoly to home page**

In `src/app/page.tsx`, add a `MonopolyIcon` component:

```typescript
function MonopolyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M4 24h20M7 24V10l7-5 7 5v14" stroke="#008000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <rect x="11" y="16" width="6" height="8" rx="0.5" fill="#008000" opacity="0.6" />
      <rect x="10" y="11" width="3" height="3" rx="0.5" fill="#008000" opacity="0.4" />
      <rect x="15" y="11" width="3" height="3" rx="0.5" fill="#008000" opacity="0.4" />
    </svg>
  );
}
```

Add `handlePlayMonopolyGame` callback following the same pattern as `handlePlayConnectFour`:

```typescript
const handlePlayMonopolyGame = useCallback(async () => {
  setConnecting('monopoly');

  const [{ supabase }, { createInitialBoard }] = await Promise.all([
    import('@/lib/supabase'),
    import('@/lib/monopoly/logic'),
  ]);

  const isRicky = playerName === 'Ricky';
  const myId = PLAYER_IDS[playerName];

  async function findGames() {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('game_type', 'monopoly')
      .is('winner', null)
      .order('created_at', { ascending: false })
      .limit(10);
    return data;
  }

  function findMyGame(games: any[] | null) {
    if (!games) return { activeGame: null, joinableGame: null };
    const activeGame = games.find((g) => {
      if (isRicky) return g.player1_name === 'Ricky';
      return g.player2_name === 'Lilian';
    }) || null;
    const joinableGame = games.find((g) => {
      if (isRicky) return g.player1_name === null && g.player2_name === 'Lilian';
      return g.player2_name === null && g.player1_name === 'Ricky';
    }) || null;
    return { activeGame, joinableGame };
  }

  async function joinGame(gameId: string) {
    const updateField = isRicky
      ? { player1_id: myId, player1_name: playerName }
      : { player2_id: myId, player2_name: playerName };
    const { error: joinError } = await supabase
      .from('games')
      .update({ ...updateField, updated_at: new Date().toISOString() })
      .eq('id', gameId)
      .select()
      .single();
    if (joinError) { setConnecting(null); return false; }
    return true;
  }

  const existingGames = await findGames();
  let { activeGame, joinableGame } = findMyGame(existingGames);

  if (activeGame) { router.push(`/monopoly/${activeGame.id}`); return; }
  if (joinableGame) { if (await joinGame(joinableGame.id)) router.push(`/monopoly/${joinableGame.id}`); return; }

  await new Promise((resolve) => setTimeout(resolve, 1000));
  const retryGames = await findGames();
  ({ activeGame, joinableGame } = findMyGame(retryGames));

  if (activeGame) { router.push(`/monopoly/${activeGame.id}`); return; }
  if (joinableGame) { if (await joinGame(joinableGame.id)) router.push(`/monopoly/${joinableGame.id}`); return; }

  const insertData = isRicky
    ? { game_type: 'monopoly', board: createInitialBoard(), current_turn: 1 as const, winner: null, player1_id: myId, player1_name: playerName, player2_id: null, player2_name: null }
    : { game_type: 'monopoly', board: createInitialBoard(), current_turn: 1 as const, winner: null, player1_id: null, player1_name: null, player2_id: myId, player2_name: playerName };

  const { data, error } = await supabase
    .from('games')
    .insert(insertData)
    .select('id')
    .single();

  if (error || !data) { setConnecting(null); return; }
  router.push(`/monopoly/${data.id}`);
}, [playerName, router]);
```

Add the game card to the grid:

```typescript
<ClickableGameCard
  title="Monopoly"
  description="Vancouver-themed property trading. Roll, buy, build, and bankrupt."
  color="#008000"
  icon={<MonopolyIcon />}
  delay={0.6}
  onClick={handlePlayMonopolyGame}
  loading={connecting === 'monopoly'}
/>
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/inbox-types.ts src/hooks/useInbox.ts src/components/inbox/InboxGameItem.tsx src/lib/match-results.ts src/hooks/useMatchHistory.ts src/components/Leaderboard.tsx src/app/page.tsx
git commit -m "feat(monopoly): integrate with inbox, leaderboard, and home page"
```

---

## Task 9: Verify & Fix

- [ ] **Step 1: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/lib/monopoly/logic.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Run the dev server and verify the game loads**

Run: `npm run dev`
Navigate to `http://localhost:3000`, select a player, click Monopoly card, verify game page renders.

- [ ] **Step 4: Fix any issues found, commit**

```bash
git add -A
git commit -m "fix(monopoly): resolve build/type issues"
```
