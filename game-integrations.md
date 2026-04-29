# Player Color Customization — Integration Guide for New Games

When building a new game for this site, you must integrate the player color system so Ricky and Lilian's chosen colors appear on their game pieces/tokens/markers.

## How it works

Players pick a color from 8 presets via a settings modal. Their choice is stored in Supabase and exposed to all components via React context + CSS custom properties.

## Integration steps

### 1. Use the Tailwind utility classes

For any element that should reflect a player's color:

```tsx
// Player 1 (Ricky) background
<div className="bg-player1" />

// Player 2 (Lilian) background
<div className="bg-player2" />

// Text colors
<span className="text-player1">Ricky</span>
<span className="text-player2">Lilian</span>
```

These classes resolve `var(--color-player1)` and `var(--color-player2)` at runtime, so they automatically pick up whatever color each player has chosen.

### 2. For dynamic values (shadows, confetti, gradients)

When you need the hex value directly (not via a CSS class), use the context hook:

```tsx
import { useColors } from '@/contexts/PlayerColorsContext';
import { hexToRgba, confettiColors } from '@/lib/colors';

function MyGamePiece({ player }: { player: 1 | 2 }) {
  const { player1Color, player2Color } = useColors();
  const color = player === 1 ? player1Color : player2Color;
  const shadow = hexToRgba(color, 0.4);

  return (
    <div
      className={player === 1 ? 'bg-player1' : 'bg-player2'}
      style={{ boxShadow: `0 4px 12px ${shadow}` }}
    />
  );
}
```

### 3. Available utilities

From `src/lib/colors.ts`:

| Export | Purpose |
|--------|---------|
| `COLOR_PRESETS` | Array of `{ name, hex }` for the 8 available colors |
| `hexToRgba(hex, alpha)` | Convert hex to rgba string (for shadows, overlays) |
| `confettiColors(hex)` | Returns `[base, lighter1, lighter2]` for celebrations |

From `src/contexts/PlayerColorsContext.tsx`:

| Export | Purpose |
|--------|---------|
| `useColors()` | Returns `{ player1Color, player2Color, loading, updateMyColor }` |

### 4. What NOT to do

- Do not hardcode `#E63946` or `#FFBE0B` for player colors. Always use `bg-player1`/`bg-player2` or the context hook.
- Do not define your own color variables for players. Use the existing system.
- Do not put color selection UI in your game. The global settings modal (gear icon) handles that.

### 5. Player identity

Players are identified by name in localStorage/sessionStorage (`'player-name'`). To determine which player number the current user is in your game:

```tsx
const playerName = sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
const isPlayer1 = playerName === 'Ricky';
```

Player 1 is always Ricky, Player 2 is always Lilian.

### 6. The SettingsButton

The `<SettingsButton />` component is already rendered on the home page. If your game has its own page layout, add it there too:

```tsx
import { SettingsButton } from '@/components/SettingsButton';

// Add anywhere in your page component — it's fixed-positioned top-right
<SettingsButton />
```

It only renders after a player has identified themselves.

## Architecture reference

```
globals.css          — defines @utility bg-player1/bg-player2 using var(--color-player1/2)
PlayerColorsContext  — wraps app, sets --color-player1/2 inline on a div
usePlayerColors      — fetches from Supabase player_preferences table, polls every 5s
SettingsButton       — gear icon, opens SettingsModal
SettingsModal        — 8 color circles, disables opponent's color
```
