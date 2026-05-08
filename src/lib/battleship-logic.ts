import type {
  Player,
  BattleshipGrid,
  ShipDefinition,
  ShipPlacement,
  ShipId,
  Attack,
  BattleshipBoardState,
} from './types';

export const BOARD_SIZE = 8;

export const FLEET: ShipDefinition[] = [
  { id: 'battleship', name: 'Battleship', size: 3 },
  { id: 'cruiser', name: 'Cruiser', size: 2 },
  { id: 'l-ship', name: 'Aircraft Carrier', size: 4, shape: [[0, 0], [1, 0], [2, 0], [2, 1]] },
];

export const TOTAL_SHIP_CELLS = 9;

let cachedPlacementCandidates: Map<ShipId, ShipPlacement[]> | null = null;
let cachedPlacementLayoutCount: number | null = null;
let cachedPlacementLayoutCounts: Map<string, number> | null = null;

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

function getDefaultRandom(): number {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] / 0x1_0000_0000;
  }
  return Math.random();
}

function shuffleArray<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomIndex = Math.min(Math.floor(random() * (i + 1)), i);
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }
  return shuffled;
}

export function generateRandomPlacement(random: () => number = getDefaultRandom): ShipPlacement[] {
  const shipOrder = shuffleArray(FLEET, random);
  const occupied = new Set<string>();
  const placementsByShip = new Map<ShipId, ShipPlacement>();

  function backtrack(shipIndex: number): boolean {
    if (shipIndex === shipOrder.length) {
      return true;
    }

    const ship = shipOrder[shipIndex];
    const candidates = getPlacementCandidatesByShip().get(ship.id) ?? [];
    const shuffledCandidates = shuffleArray(candidates, random);

    for (const candidate of shuffledCandidates) {
      if (hasOccupiedCell(candidate, occupied)) {
        continue;
      }

      const candidateKeys = candidate.cells.map(([row, col]) => getCellKey(row, col));
      for (const key of candidateKeys) {
        occupied.add(key);
      }
      placementsByShip.set(ship.id, clonePlacement(candidate));

      if (backtrack(shipIndex + 1)) {
        return true;
      }

      placementsByShip.delete(ship.id);
      for (const key of candidateKeys) {
        occupied.delete(key);
      }
    }

    return false;
  }

  if (!backtrack(0)) {
    throw new Error('Unable to generate a valid ship placement');
  }

  return FLEET.map((ship) => {
    const placement = placementsByShip.get(ship.id);
    if (!placement) {
      throw new Error(`Missing generated placement for ${ship.id}`);
    }
    return clonePlacement(placement);
  });
}

export function countValidPlacementLayouts(): number {
  if (cachedPlacementLayoutCount !== null) {
    return cachedPlacementLayoutCount;
  }

  cachedPlacementLayoutCount = countLayoutsFrom(0, new Set(), getPlacementLayoutCountMemo());
  return cachedPlacementLayoutCount;
}

function getPlacementLayoutAt(layoutIndex: number): ShipPlacement[] {
  const memo = getPlacementLayoutCountMemo();

  function select(shipIndex: number, occupied: Set<string>, targetIndex: number): ShipPlacement[] {
    if (shipIndex === FLEET.length) {
      return [];
    }

    const ship = FLEET[shipIndex];
    const candidates = getPlacementCandidatesByShip().get(ship.id) ?? [];

    for (const candidate of candidates) {
      if (hasOccupiedCell(candidate, occupied)) {
        continue;
      }

      const nextOccupied = addPlacementToOccupied(candidate, occupied);
      const branchCount = countLayoutsFrom(shipIndex + 1, nextOccupied, memo);

      if (targetIndex < branchCount) {
        return [clonePlacement(candidate), ...select(shipIndex + 1, nextOccupied, targetIndex)];
      }

      targetIndex -= branchCount;
    }

    throw new Error(`Placement layout index out of range: ${layoutIndex}`);
  }

  return select(0, new Set(), layoutIndex);
}

function getPlacementLayoutCountMemo(): Map<string, number> {
  if (!cachedPlacementLayoutCounts) {
    cachedPlacementLayoutCounts = new Map();
  }
  return cachedPlacementLayoutCounts;
}

function countLayoutsFrom(shipIndex: number, occupied: Set<string>, memo: Map<string, number>): number {
  if (shipIndex === FLEET.length) {
    return 1;
  }

  const memoKey = `${shipIndex}|${Array.from(occupied).sort().join(';')}`;
  const memoized = memo.get(memoKey);
  if (memoized !== undefined) {
    return memoized;
  }

  const ship = FLEET[shipIndex];
  const candidates = getPlacementCandidatesByShip().get(ship.id) ?? [];
  let count = 0;

  for (const candidate of candidates) {
    if (hasOccupiedCell(candidate, occupied)) {
      continue;
    }

    count += countLayoutsFrom(shipIndex + 1, addPlacementToOccupied(candidate, occupied), memo);
  }

  memo.set(memoKey, count);
  return count;
}

function getPlacementCandidatesByShip(): Map<ShipId, ShipPlacement[]> {
  if (cachedPlacementCandidates) {
    return cachedPlacementCandidates;
  }

  cachedPlacementCandidates = new Map<ShipId, ShipPlacement[]>(
    FLEET.map((ship) => [ship.id, getShipPlacementCandidates(ship)])
  );
  return cachedPlacementCandidates;
}

function getShipPlacementCandidates(ship: ShipDefinition): ShipPlacement[] {
  const candidates: ShipPlacement[] = [];

  if (ship.shape) {
    const orientations = getShapeOrientations(ship.shape);

    for (const shape of orientations) {
      const maxRowOffset = Math.max(...shape.map(([row]) => row));
      const maxColOffset = Math.max(...shape.map(([, col]) => col));

      for (let row = 0; row < BOARD_SIZE - maxRowOffset; row++) {
        for (let col = 0; col < BOARD_SIZE - maxColOffset; col++) {
          candidates.push({
            shipId: ship.id,
            cells: shape.map(([rowOffset, colOffset]) => [
              row + rowOffset,
              col + colOffset,
            ] as [number, number]),
          });
        }
      }
    }

    return candidates;
  }

  for (const horizontal of [true, false]) {
    const maxRow = horizontal ? BOARD_SIZE : BOARD_SIZE - ship.size + 1;
    const maxCol = horizontal ? BOARD_SIZE - ship.size + 1 : BOARD_SIZE;

    for (let row = 0; row < maxRow; row++) {
      for (let col = 0; col < maxCol; col++) {
        const cells: [number, number][] = Array.from({ length: ship.size }, (_, i) => [
          horizontal ? row : row + i,
          horizontal ? col + i : col,
        ] as [number, number]);
        candidates.push({ shipId: ship.id, cells });
      }
    }
  }

  return candidates;
}

function getShapeOrientations(shape: [number, number][]): [number, number][][] {
  const orientations = new Map<string, [number, number][]>();

  for (const mirror of [1, -1]) {
    for (let rotation = 0; rotation < 4; rotation++) {
      const transformed = shape.map(([row, col]) => {
        const mirroredCol = col * mirror;
        if (rotation === 0) return [row, mirroredCol] as [number, number];
        if (rotation === 1) return [mirroredCol, -row] as [number, number];
        if (rotation === 2) return [-row, -mirroredCol] as [number, number];
        return [-mirroredCol, row] as [number, number];
      });

      const normalized = normalizeCells(transformed);
      orientations.set(getShapeKey(normalized), normalized);
    }
  }

  return Array.from(orientations.values());
}

function normalizeCells(cells: [number, number][]): [number, number][] {
  const minRow = Math.min(...cells.map(([row]) => row));
  const minCol = Math.min(...cells.map(([, col]) => col));
  return cells
    .map(([row, col]) => [row - minRow, col - minCol] as [number, number])
    .sort(([rowA, colA], [rowB, colB]) => rowA - rowB || colA - colB);
}

function getShapeKey(cells: [number, number][]): string {
  return normalizeCells(cells).map(([row, col]) => getCellKey(row, col)).join('|');
}

function clonePlacement(placement: ShipPlacement): ShipPlacement {
  return {
    shipId: placement.shipId,
    cells: placement.cells.map(([row, col]) => [row, col] as [number, number]),
  };
}

function hasOccupiedCell(placement: ShipPlacement, occupied: Set<string>): boolean {
  return placement.cells.some(([row, col]) => occupied.has(getCellKey(row, col)));
}

function addPlacementToOccupied(placement: ShipPlacement, occupied: Set<string>): Set<string> {
  const nextOccupied = new Set(occupied);
  for (const [row, col] of placement.cells) {
    nextOccupied.add(getCellKey(row, col));
  }
  return nextOccupied;
}

function getCellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function isValidPlacement(placements: ShipPlacement[]): boolean {
  const occupied = new Set<string>();

  for (const placement of placements) {
    const shipDef = FLEET.find((s) => s.id === placement.shipId);
    if (!shipDef) return false;
    if (placement.cells.length !== shipDef.size) return false;

    const candidateKeys = new Set(
      getShipPlacementCandidates(shipDef).map((candidate) => getShapeKey(candidate.cells))
    );
    if (!candidateKeys.has(getShapeKey(placement.cells))) return false;

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

export function isCompleteFleet(placements: ShipPlacement[]): boolean {
  if (placements.length !== FLEET.length) {
    return false;
  }

  const shipIds = new Set(placements.map((placement) => placement.shipId));
  return FLEET.every((ship) => shipIds.has(ship.id)) && isValidPlacement(placements);
}

export function isBoardReadyToPlay(board: BattleshipBoardState): boolean {
  return isCompleteFleet(board.player1Ships) && isCompleteFleet(board.player2Ships);
}

export function startBoardIfReady(board: BattleshipBoardState): BattleshipBoardState {
  if (board.phase !== 'setup' || !isBoardReadyToPlay(board)) {
    return board;
  }

  return {
    ...board,
    phase: 'playing',
  };
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
