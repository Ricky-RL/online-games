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
