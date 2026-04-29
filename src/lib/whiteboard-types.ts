export interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export type NoteContentType = 'text' | 'drawing';

export interface WhiteboardNote {
  id: string;
  content_type: NoteContentType;
  text_content: string;
  drawing_data: Stroke[] | null;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  color: string;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotePosition {
  x: number;
  y: number;
}

export interface NoteSize {
  width: number;
  height: number;
}

export const NOTE_COLORS = [
  '#FFEB3B', // Yellow (default)
  '#FF8A80', // Red/pink
  '#80D8FF', // Light blue
  '#B9F6CA', // Light green
  '#EA80FC', // Purple
  '#FFD180', // Orange
  '#FFFFFF', // White
] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];
