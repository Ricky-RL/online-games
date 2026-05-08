import { describe, it, expect } from 'vitest';
import {
  BOARD_SIZE,
  TOTAL_SHIP_CELLS,
  createEmptyGrid,
  createInitialBoard,
  generateRandomPlacement,
  countValidPlacementLayouts,
  isValidPlacement,
  isCompleteFleet,
  isBoardReadyToPlay,
  startBoardIfReady,
  buildShipGrid,
  makeAttack,
  getAttackResult,
  isShipSunk,
  areAllShipsSunk,
  shouldKeepTurn,
  checkWinner,
  getSunkShips,
  isAlreadyAttacked,
  countHits,
  totalAttacks,
} from './battleship-logic';
import type { ShipPlacement, Attack, BattleshipBoardState } from './types';

describe('createEmptyGrid', () => {
  it('creates a BOARD_SIZE x BOARD_SIZE grid of nulls', () => {
    const grid = createEmptyGrid();
    expect(grid).toHaveLength(BOARD_SIZE);
    grid.forEach((row) => {
      expect(row).toHaveLength(BOARD_SIZE);
      row.forEach((cell) => {
        expect(cell).toBeNull();
      });
    });
  });
});

describe('createInitialBoard', () => {
  it('returns correct initial structure', () => {
    const board = createInitialBoard();
    expect(board.player1Ships).toEqual([]);
    expect(board.player2Ships).toEqual([]);
    expect(board.player1Attacks).toEqual([]);
    expect(board.player2Attacks).toEqual([]);
    expect(board.phase).toBe('setup');
  });
});

describe('generateRandomPlacement', () => {
  it('has at least one complete legal layout available', () => {
    expect(countValidPlacementLayouts()).toBeGreaterThan(0);
  });

  it('produces varied legal layouts across repeated runs', () => {
    const serializedLayouts = new Set<string>();

    for (let i = 0; i < 40; i++) {
      const placements = generateRandomPlacement();
      expect(isValidPlacement(placements)).toBe(true);

      const key = placements
        .map((placement) => `${placement.shipId}:${placement.cells.map(([r, c]) => `${r},${c}`).join('|')}`)
        .sort()
        .join(';');

      serializedLayouts.add(key);
    }

    expect(serializedLayouts.size).toBeGreaterThan(1);
  });

  it('returns 3 ships', () => {
    const placements = generateRandomPlacement();
    expect(placements).toHaveLength(3);
  });

  it('returns ships with correct sizes', () => {
    const placements = generateRandomPlacement();
    const battleship = placements.find((p) => p.shipId === 'battleship');
    const cruiser = placements.find((p) => p.shipId === 'cruiser');
    const lShip = placements.find((p) => p.shipId === 'l-ship');

    expect(battleship!.cells).toHaveLength(3);
    expect(cruiser!.cells).toHaveLength(2);
    expect(lShip!.cells).toHaveLength(4);
  });

  it('places all cells within bounds', () => {
    const placements = generateRandomPlacement();
    for (const placement of placements) {
      for (const [row, col] of placement.cells) {
        expect(row).toBeGreaterThanOrEqual(0);
        expect(row).toBeLessThan(BOARD_SIZE);
        expect(col).toBeGreaterThanOrEqual(0);
        expect(col).toBeLessThan(BOARD_SIZE);
      }
    }
  });

  it('has no overlapping cells', () => {
    const placements = generateRandomPlacement();
    const allCells = new Set<string>();
    for (const placement of placements) {
      for (const [row, col] of placement.cells) {
        const key = `${row},${col}`;
        expect(allCells.has(key)).toBe(false);
        allCells.add(key);
      }
    }
  });

  it('produces valid placements over 50 runs (fuzz test)', () => {
    for (let i = 0; i < 50; i++) {
      const placements = generateRandomPlacement();
      expect(isValidPlacement(placements)).toBe(true);

      // Verify total cells
      const totalCells = placements.reduce((sum, p) => sum + p.cells.length, 0);
      expect(totalCells).toBe(TOTAL_SHIP_CELLS);
    }
  });
});

describe('isValidPlacement', () => {
  it('returns true for valid placement', () => {
    const placements: ShipPlacement[] = [
      { shipId: 'battleship', cells: [[0, 0], [0, 1], [0, 2]] },
      { shipId: 'cruiser', cells: [[2, 0], [2, 1]] },
      { shipId: 'l-ship', cells: [[4, 0], [5, 0], [6, 0], [6, 1]] },
    ];
    expect(isValidPlacement(placements)).toBe(true);
  });

  it('returns false for overlapping cells', () => {
    const placements: ShipPlacement[] = [
      { shipId: 'battleship', cells: [[0, 0], [0, 1], [0, 2]] },
      { shipId: 'cruiser', cells: [[0, 1], [0, 2]] }, // overlaps with battleship
      { shipId: 'l-ship', cells: [[4, 0], [5, 0], [6, 0], [6, 1]] },
    ];
    expect(isValidPlacement(placements)).toBe(false);
  });

  it('returns false for out-of-bounds cells', () => {
    const placements: ShipPlacement[] = [
      { shipId: 'battleship', cells: [[0, BOARD_SIZE - 2], [0, BOARD_SIZE - 1], [0, BOARD_SIZE]] }, // last cell out of bounds
      { shipId: 'cruiser', cells: [[2, 0], [2, 1]] },
      { shipId: 'l-ship', cells: [[4, 0], [5, 0], [6, 0], [6, 1]] },
    ];
    expect(isValidPlacement(placements)).toBe(false);
  });

  it('returns false for wrong ship size', () => {
    const placements: ShipPlacement[] = [
      { shipId: 'battleship', cells: [[0, 0], [0, 1]] }, // should be 3 cells
      { shipId: 'cruiser', cells: [[2, 0], [2, 1]] },
      { shipId: 'l-ship', cells: [[4, 0], [5, 0], [6, 0], [6, 1]] },
    ];
    expect(isValidPlacement(placements)).toBe(false);
  });

  it('returns false for an L ship with the wrong shape', () => {
    const placements: ShipPlacement[] = [
      { shipId: 'battleship', cells: [[0, 0], [0, 1], [0, 2]] },
      { shipId: 'cruiser', cells: [[2, 0], [2, 1]] },
      { shipId: 'l-ship', cells: [[4, 0], [4, 1], [5, 1], [5, 2]] },
    ];
    expect(isValidPlacement(placements)).toBe(false);
  });

  it('returns false for negative coordinates', () => {
    const placements: ShipPlacement[] = [
      { shipId: 'battleship', cells: [[-1, 0], [0, 0], [1, 0]] },
      { shipId: 'cruiser', cells: [[2, 0], [2, 1]] },
      { shipId: 'l-ship', cells: [[4, 0], [5, 0], [6, 0], [6, 1]] },
    ];
    expect(isValidPlacement(placements)).toBe(false);
  });
});

describe('board readiness', () => {
  const completeFleet: ShipPlacement[] = [
    { shipId: 'battleship', cells: [[0, 0], [0, 1], [0, 2]] },
    { shipId: 'cruiser', cells: [[2, 0], [2, 1]] },
    { shipId: 'l-ship', cells: [[4, 0], [5, 0], [6, 0], [6, 1]] },
  ];

  it('requires one valid placement for every ship', () => {
    expect(isCompleteFleet(completeFleet)).toBe(true);
    expect(isCompleteFleet(completeFleet.slice(0, 2))).toBe(false);
    expect(isCompleteFleet([
      completeFleet[0],
      completeFleet[1],
      { shipId: 'cruiser', cells: [[4, 0], [4, 1]] },
    ])).toBe(false);
  });

  it('reports a board ready only when both fleets are complete', () => {
    const board: BattleshipBoardState = {
      player1Ships: completeFleet,
      player2Ships: completeFleet,
      player1Attacks: [],
      player2Attacks: [],
      phase: 'setup',
    };

    expect(isBoardReadyToPlay(board)).toBe(true);
    expect(isBoardReadyToPlay({ ...board, player2Ships: [] })).toBe(false);
  });

  it('starts a setup board when both generated fleets are ready', () => {
    const board: BattleshipBoardState = {
      player1Ships: completeFleet,
      player2Ships: completeFleet,
      player1Attacks: [],
      player2Attacks: [],
      phase: 'setup',
    };

    expect(startBoardIfReady(board).phase).toBe('playing');
  });

  it('leaves incomplete and already-finished boards unchanged', () => {
    const incompleteBoard: BattleshipBoardState = {
      player1Ships: completeFleet,
      player2Ships: [],
      player1Attacks: [],
      player2Attacks: [],
      phase: 'setup',
    };
    const finishedBoard: BattleshipBoardState = {
      ...incompleteBoard,
      player2Ships: completeFleet,
      phase: 'finished',
    };

    expect(startBoardIfReady(incompleteBoard)).toBe(incompleteBoard);
    expect(startBoardIfReady(finishedBoard)).toBe(finishedBoard);
  });
});

describe('buildShipGrid', () => {
  it('maps ship placements to grid correctly', () => {
    const placements: ShipPlacement[] = [
      { shipId: 'battleship', cells: [[0, 0], [0, 1], [0, 2]] },
      { shipId: 'cruiser', cells: [[2, 3], [3, 3]] },
      { shipId: 'l-ship', cells: [[4, 5], [5, 5], [6, 5], [6, 6]] },
    ];

    const grid = buildShipGrid(placements);

    expect(grid[0][0]).toBe('battleship');
    expect(grid[0][1]).toBe('battleship');
    expect(grid[0][2]).toBe('battleship');
    expect(grid[2][3]).toBe('cruiser');
    expect(grid[3][3]).toBe('cruiser');
    expect(grid[4][5]).toBe('l-ship');
    expect(grid[5][5]).toBe('l-ship');
    expect(grid[6][5]).toBe('l-ship');
    expect(grid[6][6]).toBe('l-ship');
    expect(grid[1][1]).toBeNull();
    expect(grid[6][4]).toBeNull();
  });

  it('returns all nulls for empty placements', () => {
    const grid = buildShipGrid([]);
    grid.forEach((row) => {
      row.forEach((cell) => {
        expect(cell).toBeNull();
      });
    });
  });
});

describe('getAttackResult', () => {
  const targetShips: ShipPlacement[] = [
    { shipId: 'battleship', cells: [[0, 0], [0, 1], [0, 2]] },
    { shipId: 'cruiser', cells: [[3, 3], [4, 3]] },
  ];

  it('returns hit with correct shipId when hitting a ship', () => {
    const result = getAttackResult(0, 1, targetShips);
    expect(result.result).toBe('hit');
    expect(result.shipId).toBe('battleship');
  });

  it('returns hit for cruiser', () => {
    const result = getAttackResult(3, 3, targetShips);
    expect(result.result).toBe('hit');
    expect(result.shipId).toBe('cruiser');
  });

  it('returns miss when no ship is at the cell', () => {
    const result = getAttackResult(5, 5, targetShips);
    expect(result.result).toBe('miss');
    expect(result.shipId).toBeUndefined();
  });
});

describe('isAlreadyAttacked', () => {
  const attacks: Attack[] = [
    { row: 0, col: 0, result: 'hit', shipId: 'battleship' },
    { row: 3, col: 3, result: 'miss' },
  ];

  it('returns true for already attacked cell', () => {
    expect(isAlreadyAttacked(0, 0, attacks)).toBe(true);
    expect(isAlreadyAttacked(3, 3, attacks)).toBe(true);
  });

  it('returns false for unattacked cell', () => {
    expect(isAlreadyAttacked(1, 1, attacks)).toBe(false);
  });
});

describe('isShipSunk', () => {
  const ships: ShipPlacement[] = [
    { shipId: 'battleship', cells: [[0, 0], [0, 1], [0, 2]] },
    { shipId: 'cruiser', cells: [[3, 3], [4, 3]] },
  ];

  it('returns true when all cells of a ship are hit', () => {
    const attacks: Attack[] = [
      { row: 0, col: 0, result: 'hit', shipId: 'battleship' },
      { row: 0, col: 1, result: 'hit', shipId: 'battleship' },
      { row: 0, col: 2, result: 'hit', shipId: 'battleship' },
    ];
    expect(isShipSunk('battleship', ships, attacks)).toBe(true);
  });

  it('returns false when only some cells are hit', () => {
    const attacks: Attack[] = [
      { row: 0, col: 0, result: 'hit', shipId: 'battleship' },
      { row: 0, col: 1, result: 'hit', shipId: 'battleship' },
    ];
    expect(isShipSunk('battleship', ships, attacks)).toBe(false);
  });

  it('returns false when no cells are hit', () => {
    const attacks: Attack[] = [
      { row: 5, col: 5, result: 'miss' },
    ];
    expect(isShipSunk('battleship', ships, attacks)).toBe(false);
  });

  it('returns false for a ship that does not exist in placements', () => {
    expect(isShipSunk('destroyer', ships, [])).toBe(false);
  });
});

describe('areAllShipsSunk', () => {
  const ships: ShipPlacement[] = [
    { shipId: 'battleship', cells: [[0, 0], [0, 1], [0, 2]] },
    { shipId: 'cruiser', cells: [[3, 3], [4, 3]] },
  ];

  it('returns true when all ships are sunk', () => {
    const attacks: Attack[] = [
      { row: 0, col: 0, result: 'hit', shipId: 'battleship' },
      { row: 0, col: 1, result: 'hit', shipId: 'battleship' },
      { row: 0, col: 2, result: 'hit', shipId: 'battleship' },
      { row: 3, col: 3, result: 'hit', shipId: 'cruiser' },
      { row: 4, col: 3, result: 'hit', shipId: 'cruiser' },
    ];
    expect(areAllShipsSunk(ships, attacks)).toBe(true);
  });

  it('returns false when only some ships are sunk', () => {
    const attacks: Attack[] = [
      { row: 0, col: 0, result: 'hit', shipId: 'battleship' },
      { row: 0, col: 1, result: 'hit', shipId: 'battleship' },
      { row: 0, col: 2, result: 'hit', shipId: 'battleship' },
    ];
    expect(areAllShipsSunk(ships, attacks)).toBe(false);
  });

  it('returns false when no ships are sunk', () => {
    const attacks: Attack[] = [
      { row: 5, col: 5, result: 'miss' },
    ];
    expect(areAllShipsSunk(ships, attacks)).toBe(false);
  });
});

describe('shouldKeepTurn', () => {
  it('returns true for hit', () => {
    expect(shouldKeepTurn('hit')).toBe(true);
  });

  it('returns false for miss', () => {
    expect(shouldKeepTurn('miss')).toBe(false);
  });
});

describe('checkWinner', () => {
  it('returns null when no winner', () => {
    const board: BattleshipBoardState = {
      player1Ships: [{ shipId: 'battleship', cells: [[0, 0], [0, 1], [0, 2]] }],
      player2Ships: [{ shipId: 'battleship', cells: [[3, 3], [3, 4], [3, 5]] }],
      player1Attacks: [{ row: 3, col: 3, result: 'hit', shipId: 'battleship' }],
      player2Attacks: [],
      phase: 'playing',
    };
    expect(checkWinner(board)).toBeNull();
  });

  it('returns 1 when player 1 sinks all of player 2 ships', () => {
    const board: BattleshipBoardState = {
      player1Ships: [{ shipId: 'battleship', cells: [[0, 0], [0, 1], [0, 2]] }],
      player2Ships: [{ shipId: 'cruiser', cells: [[3, 3], [4, 3]] }],
      player1Attacks: [
        { row: 3, col: 3, result: 'hit', shipId: 'cruiser' },
        { row: 4, col: 3, result: 'hit', shipId: 'cruiser' },
      ],
      player2Attacks: [],
      phase: 'playing',
    };
    expect(checkWinner(board)).toBe(1);
  });

  it('returns 2 when player 2 sinks all of player 1 ships', () => {
    const board: BattleshipBoardState = {
      player1Ships: [{ shipId: 'destroyer', cells: [[1, 1], [1, 2]] }],
      player2Ships: [{ shipId: 'battleship', cells: [[5, 5], [5, 6], [6, 6]] }],
      player1Attacks: [],
      player2Attacks: [
        { row: 1, col: 1, result: 'hit', shipId: 'destroyer' },
        { row: 1, col: 2, result: 'hit', shipId: 'destroyer' },
      ],
      phase: 'playing',
    };
    expect(checkWinner(board)).toBe(2);
  });
});

describe('getSunkShips', () => {
  const ships: ShipPlacement[] = [
    { shipId: 'battleship', cells: [[0, 0], [0, 1], [0, 2]] },
    { shipId: 'cruiser', cells: [[3, 3], [4, 3]] },
    { shipId: 'destroyer', cells: [[6, 0], [6, 1]] },
  ];

  it('returns empty array when no ships are sunk', () => {
    const attacks: Attack[] = [
      { row: 0, col: 0, result: 'hit', shipId: 'battleship' },
    ];
    expect(getSunkShips(ships, attacks)).toEqual([]);
  });

  it('returns only fully sunk ships', () => {
    const attacks: Attack[] = [
      { row: 3, col: 3, result: 'hit', shipId: 'cruiser' },
      { row: 4, col: 3, result: 'hit', shipId: 'cruiser' },
      { row: 0, col: 0, result: 'hit', shipId: 'battleship' },
    ];
    const sunk = getSunkShips(ships, attacks);
    expect(sunk).toHaveLength(1);
    expect(sunk[0].shipId).toBe('cruiser');
  });

  it('returns all ships when all are sunk', () => {
    const attacks: Attack[] = [
      { row: 0, col: 0, result: 'hit', shipId: 'battleship' },
      { row: 0, col: 1, result: 'hit', shipId: 'battleship' },
      { row: 0, col: 2, result: 'hit', shipId: 'battleship' },
      { row: 3, col: 3, result: 'hit', shipId: 'cruiser' },
      { row: 4, col: 3, result: 'hit', shipId: 'cruiser' },
      { row: 6, col: 0, result: 'hit', shipId: 'destroyer' },
      { row: 6, col: 1, result: 'hit', shipId: 'destroyer' },
    ];
    const sunk = getSunkShips(ships, attacks);
    expect(sunk).toHaveLength(3);
  });
});

describe('countHits', () => {
  it('counts only hit attacks', () => {
    const attacks: Attack[] = [
      { row: 0, col: 0, result: 'hit', shipId: 'battleship' },
      { row: 1, col: 1, result: 'miss' },
      { row: 2, col: 2, result: 'hit', shipId: 'cruiser' },
      { row: 3, col: 3, result: 'miss' },
    ];
    expect(countHits(attacks)).toBe(2);
  });

  it('returns 0 for empty attacks', () => {
    expect(countHits([])).toBe(0);
  });

  it('returns 0 when all are misses', () => {
    const attacks: Attack[] = [
      { row: 0, col: 0, result: 'miss' },
      { row: 1, col: 1, result: 'miss' },
    ];
    expect(countHits(attacks)).toBe(0);
  });
});

describe('totalAttacks', () => {
  it('returns the sum of both players attack lists', () => {
    const board: BattleshipBoardState = {
      player1Ships: [],
      player2Ships: [],
      player1Attacks: [
        { row: 0, col: 0, result: 'miss' },
        { row: 1, col: 1, result: 'hit', shipId: 'battleship' },
      ],
      player2Attacks: [
        { row: 2, col: 2, result: 'miss' },
      ],
      phase: 'playing',
    };
    expect(totalAttacks(board)).toBe(3);
  });

  it('returns 0 for empty board', () => {
    const board = createInitialBoard();
    expect(totalAttacks(board)).toBe(0);
  });
});

describe('makeAttack', () => {
  const baseBoardPlaying: BattleshipBoardState = {
    player1Ships: [
      { shipId: 'battleship', cells: [[0, 0], [0, 1], [0, 2]] },
      { shipId: 'cruiser', cells: [[2, 0], [2, 1]] },
      { shipId: 'l-ship', cells: [[4, 0], [5, 0], [6, 0], [6, 1]] },
    ],
    player2Ships: [
      { shipId: 'battleship', cells: [[6, 0], [6, 1], [6, 2]] },
      { shipId: 'cruiser', cells: [[5, 5], [5, 6]] },
      { shipId: 'l-ship', cells: [[3, 3], [4, 3], [5, 3], [5, 4]] },
    ],
    player1Attacks: [],
    player2Attacks: [],
    phase: 'playing',
  };

  it('records a hit correctly', () => {
    const result = makeAttack(baseBoardPlaying, 6, 0, 1);
    expect(result.player1Attacks).toHaveLength(1);
    expect(result.player1Attacks[0]).toEqual({
      row: 6,
      col: 0,
      result: 'hit',
      shipId: 'battleship',
    });
  });

  it('records a miss correctly', () => {
    const result = makeAttack(baseBoardPlaying, 1, 1, 1);
    expect(result.player1Attacks).toHaveLength(1);
    expect(result.player1Attacks[0]).toEqual({
      row: 1,
      col: 1,
      result: 'miss',
    });
  });

  it('player 2 attacks player 1 ships', () => {
    const result = makeAttack(baseBoardPlaying, 0, 0, 2);
    expect(result.player2Attacks).toHaveLength(1);
    expect(result.player2Attacks[0].result).toBe('hit');
    expect(result.player2Attacks[0].shipId).toBe('battleship');
  });

  it('throws when cell was already attacked', () => {
    const afterFirst = makeAttack(baseBoardPlaying, 6, 0, 1);
    expect(() => makeAttack(afterFirst, 6, 0, 1)).toThrow('already been attacked');
  });

  it('throws for out-of-bounds row', () => {
    expect(() => makeAttack(baseBoardPlaying, -1, 0, 1)).toThrow('out of bounds');
    expect(() => makeAttack(baseBoardPlaying, BOARD_SIZE, 0, 1)).toThrow('out of bounds');
  });

  it('throws for out-of-bounds col', () => {
    expect(() => makeAttack(baseBoardPlaying, 0, -1, 1)).toThrow('out of bounds');
    expect(() => makeAttack(baseBoardPlaying, 0, BOARD_SIZE, 1)).toThrow('out of bounds');
  });

  it('throws when phase is not playing', () => {
    const setupBoard: BattleshipBoardState = { ...baseBoardPlaying, phase: 'setup' };
    expect(() => makeAttack(setupBoard, 0, 0, 1)).toThrow('not in playing phase');
  });

  it('throws when phase is finished', () => {
    const finishedBoard: BattleshipBoardState = { ...baseBoardPlaying, phase: 'finished' };
    expect(() => makeAttack(finishedBoard, 0, 0, 1)).toThrow('not in playing phase');
  });

  it('sets phase to finished when all enemy ships are sunk', () => {
    // Set up a board where player 2 has only an L ship left with 1 cell unhit
    const almostWonBoard: BattleshipBoardState = {
      ...baseBoardPlaying,
      player2Ships: [
        { shipId: 'l-ship', cells: [[3, 3], [4, 3], [5, 3], [5, 4]] },
      ],
      player1Attacks: [
        { row: 3, col: 3, result: 'hit', shipId: 'l-ship' },
        { row: 4, col: 3, result: 'hit', shipId: 'l-ship' },
        { row: 5, col: 3, result: 'hit', shipId: 'l-ship' },
      ],
    };

    const result = makeAttack(almostWonBoard, 5, 4, 1);
    expect(result.phase).toBe('finished');
  });

  it('does not mutate the original board', () => {
    const result = makeAttack(baseBoardPlaying, 6, 0, 1);
    expect(baseBoardPlaying.player1Attacks).toHaveLength(0);
    expect(result.player1Attacks).toHaveLength(1);
  });
});
