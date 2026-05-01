# Favorite Games

## Overview

Players can favorite games by clicking a heart icon on each game card. Favorited games appear in a dedicated section at the top of the home page for quick access.

## UI

### Heart Icon

- Positioned top-right corner of each game card
- Outlined heart (unfilled) by default
- Filled red heart when favorited
- Click toggles favorite state
- Scale pulse animation on toggle
- Visible in both the favorites section cards and the main grid cards

### Favorites Section

- Appears above the main games grid (below inbox, above the "games" grid)
- Section header: "Favorites" with a heart icon
- Same card style as the main grid
- Cards are clickable to play (same behavior as main grid)
- Hidden entirely when no games are favorited
- Respects the player's custom game order for sorting

## Persistence

### localStorage (immediate)

- Key: `favorite-games-Ricky` / `favorite-games-Lilian`
- Value: JSON array of game slugs (e.g. `["connect-four", "wordle"]`)

### Supabase (sync)

- Table: `player_preferences` (existing)
- New column: `favorite_games` (text array, default `{}`)
- Synced on toggle and on app load (same pattern as `game_order`)

## Behavior

- Favorited games appear in BOTH the favorites section and the main grid
- Heart state stays in sync across both locations
- Per-player: each player has their own favorites
- Favorites section order follows the player's custom game ordering
- No limit on number of favorites
