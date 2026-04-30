# Daily Wordle Mode

## Summary

Add a "Daily Wordle" option to the game creation flow. When selected, the game's answer is fetched from the NYT Wordle API instead of being randomly generated. The rest of the gameplay (2-player co-op, 6 shared guesses) remains unchanged.

## API Route

**`GET /api/daily-wordle`**

- Fetches today's word from `https://www.nytimes.com/svc/wordle/v2/{YYYY-MM-DD}.json`
- Uses Eastern Time (`America/New_York`) for the date boundary (NYT resets at midnight ET)
- Returns `{ word: "CRANE" }` (uppercased)
- Returns `{ error: "..." }` with 502 status if NYT API is unavailable

## Database

Add column to `wordle_games`:

```sql
ALTER TABLE wordle_games ADD COLUMN answer_word text;
```

When `answer_word` is set, the game uses it directly. When null, falls back to `answer_index` (existing behavior).

## Game Logic Changes

**`src/lib/wordle-logic.ts`** — modify `getAnswer`:

```typescript
export function getAnswer(index: number, answerWord?: string | null): string {
  if (answerWord) return answerWord.toUpperCase();
  return WORDLE_ANSWERS[index];
}
```

## Type Changes

**`src/lib/wordle-types.ts`** — add to `WordleGame`:

```typescript
answer_word?: string | null;
```

## Game Creation Flow

**`src/app/page.tsx`:**

After clicking the "Wordle" game card, show two sub-options:
- **"Random"** — current behavior (`generateAnswerIndex()`, no `answer_word`)
- **"Daily"** — calls `/api/daily-wordle`, stores returned word in `answer_word`, sets `answer_index` to 0 (ignored)

Multiple daily games can exist on the same day — no uniqueness constraint on `daily_date` or similar. It simply reuses the same daily word.

## Game Page Changes

**`src/hooks/useWordleGame.ts`** and **`src/app/wordle/[gameId]/page.tsx`:**

- Pass `game.answer_word` through to all `getAnswer()` calls so daily games resolve correctly.

## Error Handling

- If the NYT API call fails, show a toast/alert: "Couldn't fetch today's word. Try again or use Random."
- Do not create the game if the daily word fetch fails.

## Out of Scope

- Replay prevention (multiple daily games per player per day are fine)
- Special matchmaking for daily games
- Caching the daily word server-side (simple enough to fetch each time; can add later if needed)
- Any UI changes to the game page itself (game plays identically regardless of word source)
