import { describe, expect, it } from 'vitest';
import {
  canPlayCard,
  createUnoBoard,
  drawCardForTurn,
  getPlayableCards,
  passAfterDraw,
  playUnoCard,
  type UnoBoardState,
  type UnoCard,
} from './uno-logic';

function card(id: string, color: UnoCard['color'], rank: UnoCard['rank']): UnoCard {
  return { id, color, rank };
}

function baseBoard(): UnoBoardState {
  return {
    hands: {
      '1': [card('r5', 'red', '5')],
      '2': [card('b7', 'blue', '7')],
    },
    drawPile: [card('d1', 'green', '1')],
    discardPile: [card('top', 'red', '2')],
    activeColor: 'red',
    activePlayer: 1,
    hasDrawnThisTurn: false,
    drawnCardId: null,
    lastAction: null,
    moveCount: 0,
    turnSequence: 0,
    scores: { '1': 0, '2': 0 },
  };
}

describe('uno logic', () => {
  it('creates a valid starting board', () => {
    const board = createUnoBoard(1, () => 0.42);
    expect(board.hands['1']).toHaveLength(7);
    expect(board.hands['2']).toHaveLength(7);
    expect(board.discardPile).toHaveLength(1);
    expect(board.drawPile.length).toBe(108 - 15);
    expect(board.activePlayer).toBe(1);
    expect(board.discardPile[0].color).not.toBe('wild');
  });

  it('allows matching by color and by rank', () => {
    const board = baseBoard();
    const colorCard = card('r9', 'red', '9');
    const rankCard = card('b2', 'blue', '2');
    const offCard = card('g4', 'green', '4');
    board.hands['1'] = [colorCard, rankCard, offCard];

    expect(canPlayCard(board, 1, colorCard)).toBe(true);
    expect(canPlayCard(board, 1, rankCard)).toBe(true);
    expect(canPlayCard(board, 1, offCard)).toBe(false);
  });

  it('blocks wild-draw4 when player has current color', () => {
    const board = baseBoard();
    const wildDraw4 = card('wd4', 'wild', 'wild-draw4');
    const redMatch = card('r7', 'red', '7');
    board.hands['1'] = [wildDraw4, redMatch];
    expect(canPlayCard(board, 1, wildDraw4)).toBe(false);
  });

  it('only allows playing the drawn card after drawing', () => {
    const board = baseBoard();
    board.drawPile = [card('drawn', 'red', '8')];
    board.hands['1'] = [card('old', 'red', '9')];

    const draw = drawCardForTurn(board, 1, () => 0.3);
    const next = draw.board;
    expect(next.hasDrawnThisTurn).toBe(true);
    expect(next.drawnCardId).toBe('drawn');
    expect(getPlayableCards(next, 1).map((c) => c.id)).toEqual(['drawn']);
  });

  it('supports draw then pass flow', () => {
    const board = baseBoard();
    board.drawPile = [card('drawn', 'blue', '9')];

    const draw = drawCardForTurn(board, 1, () => 0.3);
    const passed = passAfterDraw(draw.board, 1);
    expect(passed.activePlayer).toBe(2);
    expect(passed.hasDrawnThisTurn).toBe(false);
    expect(passed.drawnCardId).toBeNull();
  });

  it('makes reverse behave like skip in two-player play', () => {
    const board = baseBoard();
    const reverse = card('rev', 'red', 'reverse');
    board.hands['1'] = [reverse];

    const result = playUnoCard(board, 1, 'rev');
    expect(result.winner).toBe(1);
    expect(result.board.activePlayer).toBe(1);
  });

  it('applies draw2 and keeps turn with current player', () => {
    const board = baseBoard();
    const draw2 = card('d2', 'red', 'draw2');
    board.hands['1'] = [draw2];
    board.hands['2'] = [card('x1', 'green', '3')];
    board.drawPile = [card('a', 'blue', '1'), card('b', 'yellow', '2')];

    const result = playUnoCard(board, 1, 'd2', undefined, () => 0.4);
    expect(result.winner).toBe(1);
    expect(result.board.hands['2']).toHaveLength(3);
    expect(result.board.activePlayer).toBe(1);
  });

  it('requires chosen color for wild cards', () => {
    const board = baseBoard();
    const wild = card('w1', 'wild', 'wild');
    board.hands['1'] = [wild];
    expect(() => playUnoCard(board, 1, 'w1')).toThrow('Choose a color');
  });
});
