import type {
  Player,
  BattleshipGrid,
  ShipDefinition,
  ShipPlacement,
  ShipId,
  Attack,
  BattleshipBoardState,
} from './types';

export const BOARD_SIZE = 7;

export const FLEET: ShipDefinition[] = [
  { id: 'battleship', name: 'Battleship', size: 3 },
  { id: 'cruiser', name: 'Cruiser', size: 2 },
  { id: 'destroyer', name: 'Destroyer', size: 2 },
];

export const TOTAL_SHIP_CELLS = 7;

export function createEmptyGrid(): BattleshipGrid {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

export function createInitialBoard(): BattleshipBoardState {
  return {
    player1Ships: [],
    player2Ships: [],
    player1Attacks: [],
    player2Attacks: [],
    phase: 'setup',
  };
}

export function generateRandomPlacement(): ShipPlacement[] {
  const placements: ShipPlacement[] = [];
  const occupied = new Set<string>();

  for (const ship of FLEET) {
    let placed = false;

    while (!placed) {
      const horizontal = Math.random() < 0.5;
      const row = Math.floor(Math.random() * BOARD_SIZE);
      const col = Math.floor(Math.random() * BOARD_SIZE);

      const cells: [number, number][] = [];
      let valid = true;

      for (let i = 0; i < ship.size; i++) {
        const r = horizontal ? row : row + i;
        const c = horizontal ? col + i : col;

        if (r >= BOARD_SIZE || c >= BOARD_SIZE) {
          valid = false;
          break;
        }

        const key = `${r},${c}`;
        if (occupied.has(key)) {
          valid = false;
          break;
        }

        cells.push([r, c]);
      }

      if (valid) {
        for (const [r, c] of cells) {
          occupied.add(`${r},${c}`);
        }
        placements.push({ shipId: ship.id, cells });
        placed = true;
      }
    }
  }

  return placements;
}

export function isValidPlacement(placements: ShipPlacement[]): boolean {
  const occupied = new Set<string>();

  for (const placement of placements) {
    const shipDef = FLEET.find((s) => s.id === placement.shipId);
    if (!shipDef) return false;
    if (placement.cells.length !== shipDef.size) return false;

    for (const [row, col] of placement.cells) {
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
        return false;
      }

      const key = `${row},${col}`;
      if (occupied.has(key)) return false;
      occupied.add(key);
    }
  }

  return true;
}

export function buildShipGrid(placements: ShipPlacement[]): (ShipId | null)[][] {
  const grid: (ShipId | null)[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );

  for (const placement of placements) {
    for (const [row, col] of placement.cells) {
      grid[row][col] = placement.shipId;
    }
  }

  return grid;
}

export function getAttackResult(
  row: number,
  col: number,
  targetShips: ShipPlacement[]
): { result: 'hit' | 'miss'; shipId?: ShipId } {
  for (const ship of targetShips) {
    for (const [r, c] of ship.cells) {
      if (r === row && c === col) {
        return { result: 'hit', shipId: ship.shipId };
      }
    }
  }
  return { result: 'miss' };
}

export function isAlreadyAttacked(row: number, col: number, attacks: Attack[]): boolean {
  return attacks.some((a) => a.row === row && a.col === col);
}

export function isShipSunk(shipId: ShipId, targetShips: ShipPlacement[], attacks: Attack[]): boolean {
  const ship = targetShips.find((s) => s.shipId === shipId);
  if (!ship) return false;

  return ship.cells.every(([r, c]) =>
    attacks.some((a) => a.row === r && a.col === c && a.result === 'hit')
  );
}

export function areAllShipsSunk(targetShips: ShipPlacement[], attacks: Attack[]): boolean {
  return targetShips.every((ship) => isShipSunk(ship.shipId, targetShips, attacks));
}

export function shouldKeepTurn(attackResult: 'hit' | 'miss'): boolean {
  return attackResult === 'hit';
}

export function checkWinner(board: BattleshipBoardState): Player | null {
  if (areAllShipsSunk(board.player2Ships, board.player1Attacks)) {
    return 1;
  }
  if (areAllShipsSunk(board.player1Ships, board.player2Attacks)) {
    return 2;
  }
  return null;
}

export function getSunkShips(targetShips: ShipPlacement[], attacks: Attack[]): ShipPlacement[] {
  return targetShips.filter((ship) => isShipSunk(ship.shipId, targetShips, attacks));
}

export function countHits(attacks: Attack[]): number {
  return attacks.filter((a) => a.result === 'hit').length;
}

export function totalAttacks(board: BattleshipBoardState): number {
  return board.player1Attacks.length + board.player2Attacks.length;
}

export function makeAttack(
  board: BattleshipBoardState,
  row: number,
  col: number,
  attacker: Player
): BattleshipBoardState {
  if (board.phase !== 'playing') {
    throw new Error('Cannot attack: game is not in playing phase');
  }

  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    throw new Error(`Attack out of bounds: (${row}, ${col})`);
  }

  const attacks = attacker === 1 ? board.player1Attacks : board.player2Attacks;
  if (isAlreadyAttacked(row, col, attacks)) {
    throw new Error(`Cell (${row}, ${col}) has already been attacked`);
  }

  const targetShips = attacker === 1 ? board.player2Ships : board.player1Ships;
  const { result, shipId } = getAttackResult(row, col, targetShips);

  const newAttack: Attack = { row, col, result };
  if (shipId) {
    newAttack.shipId = shipId;
  }

  const newBoard: BattleshipBoardState = {
    ...board,
    player1Attacks:
      attacker === 1 ? [...board.player1Attacks, newAttack] : [...board.player1Attacks],
    player2Attacks:
      attacker === 2 ? [...board.player2Attacks, newAttack] : [...board.player2Attacks],
  };

  const winner = checkWinner(newBoard);
  if (winner !== null) {
    newBoard.phase = 'finished';
  }

  return newBoard;
}
