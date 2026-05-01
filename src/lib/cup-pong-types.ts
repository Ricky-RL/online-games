export type Player = 1 | 2;

/** A cup's position on the table (top-down view, normalized 0-1 range) */
export interface CupPosition {
  x: number;
  y: number;
}

export interface Cup {
  id: number;        // 0-9 for each side
  position: CupPosition;
  standing: boolean; // false = eliminated
}

/** Direction vector for a throw (normalized) */
export interface ThrowVector {
  dx: number; // lateral direction (-1 to 1)
  dy: number; // forward direction (always positive, toward opponent)
}

/** Result of a single throw */
export interface ThrowResult {
  hit: boolean;
  cupId: number | null; // which cup was hit (null if miss)
  throwVector: ThrowVector;
  power: number; // 0-1, where 1 is max power
}

/** Data stored per turn for replay on opponent's screen */
export interface TurnThrow {
  player: Player;
  throwResult: ThrowResult;
}

export interface CupPongBoardState {
  /** Player 1's cups (at the "far" end from player 1's perspective) */
  player1Cups: Cup[];
  /** Player 2's cups (at the "far" end from player 2's perspective) */
  player2Cups: Cup[];
  /** Throws remaining in current turn: 2 at start of turn, decrements each throw */
  throwsRemaining: 0 | 1 | 2;
  /** Last completed turn's throws for replay/animation */
  lastTurnThrows: TurnThrow[];
  /** Current turn's first throw (stored locally until second throw commits both) */
  pendingThrow: TurnThrow | null;
}

export interface CupPongGame {
  id: string;
  game_type: 'cup-pong';
  board: CupPongBoardState;
  current_turn: Player;
  winner: Player | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  created_at: string;
  updated_at: string;
}
