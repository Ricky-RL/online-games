# Word Search Game Design

Two-player async competitive word search for the online games platform.

## Concept

Both players search the same 10x10 grid for hidden words from a themed pack. Each player gets 5 minutes. Most words found wins; ties broken by speed. Players solve independently and asynchronously — results are compared when both finish.

## Game Flow

1. **Start** — Player 1 picks a theme pack (e.g., "Animals"). System generates a 10x10 grid with 8-12 words hidden in all 8 directions (horizontal, vertical, diagonal, and all reversed).
2. **Player 1 solves** — 5-minute timer starts on first interaction. Swipe/tap to highlight words. Found words check off the word list.
3. **Player 1 submits** — Timer expires or player taps "Done". Sees: "You found 9/11 words. Lilian hasn't played yet." Opponent gets inbox notification.
4. **Player 2 solves** — Same grid, same words, fresh 5-minute timer. Cannot see Player 1's results.
5. **Results** — Full comparison shown to both players. Winner declared. Accessible anytime from Match History.

## Data Model

Single row in the existing `games` table:

```
game_type: 'word-search'

board (JSONB): {
  grid: [['T','I','G','E','R',...], ...],   // 10x10 letter grid
  words: [
    { word: 'TIGER', start: [0,0], end: [0,4], direction: 'right' },
    { word: 'LION', start: [3,7], end: [0,7], direction: 'up' },
    ...
  ],
  theme: 'animals',
  timeLimit: 300,                            // seconds
  player1Result: {                           // null until P1 submits
    foundWords: ['TIGER', 'LION', ...],
    timeUsed: 247,                           // seconds elapsed
    startedAt: '2026-04-29T10:00:00Z',
    submittedAt: '2026-04-29T10:04:07Z'
  },
  player2Result: null                        // null until P2 submits
}

current_turn: 1 (P1 hasn't played) → 2 (P1 done, P2's turn) → stays 2 after both done
winner: null → 1 or 2 (set after both submit)
```

## Winner Determination

After both players submit:
1. Player with more found words wins.
2. If tied on word count, faster time wins.
3. If tied on both (extremely unlikely), declare a draw.

## Match Results Integration

After Player 2 submits and winner is determined, call `recordMatchResult()` with:
- `game_type: 'word-search'`
- `metadata: { theme: "animals", p1Words: 9, p2Words: 7, p1Time: 247, p2Time: 300 }`

## Results Screen

Serves as both the post-game view and the Match History detail view:
- Winner banner at top
- Side-by-side score comparison (words found + time taken per player)
- Word-by-word breakdown with colored checkmarks showing who found each word
- Words neither player found shown dimmed
- Expandable "View solved grid" showing all word positions highlighted

## Theme Packs

Stored client-side as a TypeScript module. Each pack has:
- `id: string` (e.g., 'animals')
- `name: string` (e.g., 'Animals')
- `words: string[]` (pool of 15-20 words; 8-12 randomly selected per game)

Initial packs: Animals, Food, Countries, Sports, Colors, Movies.

## Grid Generation

Runs client-side when Player 1 creates the game:
1. Select 8-12 words randomly from the theme pack's word pool.
2. Place each word in the 10x10 grid in a random valid direction (8 directions).
3. If a word can't be placed without conflicts, retry with a different position/direction.
4. Fill remaining empty cells with random uppercase letters.
5. Store the complete grid and word placements in the `board` JSONB field.

## Interaction Model

- **Select a word**: Tap first letter, drag to last letter (or tap both endpoints). Valid selections highlight the word and check it off the list.
- **Invalid selection**: If the highlighted letters don't match any remaining word, the selection clears with a brief shake animation.
- **Word list**: Displayed alongside the grid. Found words are crossed off with the player's color.
- **Timer**: Visible countdown. Flashes/pulses in final 30 seconds.

## Information Hiding

The hook returns different data based on game state:
- **During Player 1's turn**: Full board (grid + words) for P1. No opponent results (there are none).
- **During Player 2's turn**: Full board for P2. Player 1's result is withheld (hook filters it out).
- **After both submit**: Full board + both results to both players.

This is a client-side courtesy (trust-based platform, no RLS enforcement).

## Edge Cases

| Case | Behavior |
|------|----------|
| Browser crash mid-solve | Progress lost. On reload, game is still playable (no partial state saved). Timer resets. |
| Player never submits | Game stays in inbox indefinitely. No timeout for v1. |
| Tie on words and time | Declare a draw. |
| Word placement overlap | Words may share letters at intersections. Highlighting handles overlapping cells. |

## Integration Points (Existing Files to Modify)

1. `src/lib/inbox-types.ts` — add `'word-search'` to `InboxGameType` union
2. `src/hooks/useInbox.ts` — add `'word-search'` to `.in('game_type', [...])` filter
3. `src/components/inbox/InboxGameItem.tsx` — add icon and label
4. `src/lib/match-results.ts` — add `'word-search'` to `GameType` union
5. `src/hooks/useMatchHistory.ts` — extend `MatchResult` type
6. `src/components/MatchHistory.tsx` — add to `gameIcon()` and `gameLabel()` switches
7. `src/app/page.tsx` — add Word Search to game selection on landing page

## New Files

- `src/lib/word-search-logic.ts` — grid generation, word placement, validation
- `src/lib/word-search-logic.test.ts` — unit tests
- `src/lib/word-search-themes.ts` — theme pack definitions
- `src/hooks/useWordSearchGame.ts` — game state hook (polling, submission, info hiding)
- `src/app/word-search/[gameId]/page.tsx` — game page
- `src/app/word-search/page.tsx` — lobby (theme pack selection)
- `src/components/word-search/Grid.tsx` — interactive letter grid
- `src/components/word-search/WordList.tsx` — word checklist
- `src/components/word-search/Timer.tsx` — countdown display
- `src/components/word-search/Results.tsx` — comparison view (also used by match history)
