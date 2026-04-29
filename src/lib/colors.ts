export interface ColorPreset {
  name: string;
  hex: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  { name: 'Crimson', hex: '#E63946' },
  { name: 'Amber', hex: '#FFBE0B' },
  { name: 'Ocean', hex: '#0077B6' },
  { name: 'Emerald', hex: '#06D6A0' },
  { name: 'Coral', hex: '#FF6B6B' },
  { name: 'Violet', hex: '#7B2CBF' },
  { name: 'Tangerine', hex: '#F77F00' },
  { name: 'Sky', hex: '#48CAE4' },
];

export function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function confettiColors(hex: string): string[] {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);

  const lighten = (value: number, amount: number) =>
    Math.min(255, Math.round(value + (255 - value) * amount));

  const toHex = (r: number, g: number, b: number) =>
    `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

  const lighter1 = toHex(lighten(r, 0.3), lighten(g, 0.3), lighten(b, 0.3));
  const lighter2 = toHex(lighten(r, 0.6), lighten(g, 0.6), lighten(b, 0.6));

  return [hex, lighter1, lighter2];
}
