import { describe, expect, it } from 'vitest';
import {
  canPlayCard,
  drawCardForTurn,
  passAfterDraw,
  playCrazyEightsCard,
  type CrazyEightsBoardState,
  type CrazyEightsCard,
} from './crazy-eights-logic';

function card(id: string, suit: CrazyEightsCard['suit'], rank: CrazyEightsCard['rank']): CrazyEightsCard {
  return { id, suit, rank };
}

function baseBoard(): CrazyEightsBoardState {
  return {
    hands: {
      '1': [card('p1-1', 'hearts', '5')],
      '2': [card('p2-1', 'clubs', '9')],
    },
    drawPile: [card('draw-1', 'spades', '4')],
    discardPile: [card('top', 'hearts', '2')],
    activeSuit: 'hearts',
    activePlayer: 1,
    hasDrawnThisTurn: false,
    drawnCardId: null,
    lastAction: null,
    moveCount: 0,
    turnSequence: 0,
    scores: { '1': 0, '2': 0 },
  };
}

describe('crazy eights logic', () => {
  it('allows matching by suit or rank', () => {
    const board = baseBoard();
    const bySuit = card('suit-match', 'hearts', 'J');
    const byRank = card('rank-match', 'spades', '2');
    const blocked = card('blocked', 'clubs', '7');
    board.hands['1'] = [bySuit, byRank, blocked];

    expect(canPlayCard(board, 1, bySuit)).toBe(true);
    expect(canPlayCard(board, 1, byRank)).toBe(true);
    expect(canPlayCard(board, 1, blocked)).toBe(false);
  });

  it('requires a chosen suit when playing an eight', () => {
    const board = baseBoard();
    const eight = card('wild-8', 'clubs', '8');
    board.hands['1'] = [eight];

    expect(() => playCrazyEightsCard(board, 1, 'wild-8')).toThrow('Choose a suit');

    const result = playCrazyEightsCard(board, 1, 'wild-8', 'spades');
    expect(result.winner).toBe(1);
    expect(result.board.activeSuit).toBe('spades');
  });

  it('draws one card at a time until a playable card is found', () => {
    const board = baseBoard();
    board.hands['1'] = [card('stuck', 'clubs', 'K')];
    board.drawPile = [
      card('draw-a', 'clubs', '3'),
      card('draw-b', 'spades', '6'),
      card('draw-c', 'diamonds', '2'),
    ];

    const draw1 = drawCardForTurn(board, 1, () => 0.4);
    expect(draw1.playable).toBe(false);
    expect(draw1.board.drawnCardId).toBeNull();

    const draw2 = drawCardForTurn(draw1.board, 1, () => 0.4);
    expect(draw2.playable).toBe(false);
    expect(draw2.board.drawnCardId).toBeNull();

    const draw3 = drawCardForTurn(draw2.board, 1, () => 0.4);
    expect(draw3.playable).toBe(true);
    expect(draw3.drawnCard?.id).toBe('draw-c');
    expect(draw3.board.drawnCardId).toBe('draw-c');
    expect(canPlayCard(draw3.board, 1, card('stuck', 'clubs', 'K'))).toBe(false);
  });

  it('requires continuing to draw once a turn starts drawing', () => {
    const board = baseBoard();
    const alreadyPlayable = card('already-playable', 'hearts', 'K');
    const blocker = card('blocker', 'clubs', '3');
    board.hands['1'] = [alreadyPlayable, blocker];
    board.drawPile = [card('draw-nope', 'spades', '6')];

    const draw = drawCardForTurn(board, 1, () => 0.2);
    expect(draw.playable).toBe(false);
    expect(draw.board.drawnCardId).toBeNull();
    expect(canPlayCard(draw.board, 1, alreadyPlayable)).toBe(false);
  });

  it('restricts pass to only when no more cards are drawable', () => {
    const board = baseBoard();
    expect(() => passAfterDraw(board, 1)).toThrow('Draw first');

    const withPlayableDrawn: CrazyEightsBoardState = {
      ...board,
      hasDrawnThisTurn: true,
      drawnCardId: 'draw-a',
    };
    expect(() => passAfterDraw(withPlayableDrawn, 1)).toThrow('must play');

    const withDrawableCards: CrazyEightsBoardState = {
      ...board,
      hasDrawnThisTurn: true,
      drawnCardId: null,
      drawPile: [card('draw-a', 'clubs', '3')],
    };
    expect(() => passAfterDraw(withDrawableCards, 1)).toThrow('Keep drawing');

    const validPass: CrazyEightsBoardState = {
      ...board,
      hasDrawnThisTurn: true,
      drawnCardId: null,
      drawPile: [],
      discardPile: [card('only-top', 'hearts', '2')],
    };
    const passed = passAfterDraw(validPass, 1);
    expect(passed.activePlayer).toBe(2);
    expect(passed.hasDrawnThisTurn).toBe(false);
  });

  it('calculates winner score from opponent hand when last card is played', () => {
    const board = baseBoard();
    board.hands['1'] = [card('winning', 'hearts', 'A')];
    board.hands['2'] = [
      card('opp-1', 'clubs', 'K'),
      card('opp-2', 'spades', '8'),
      card('opp-3', 'diamonds', '4'),
    ];

    const result = playCrazyEightsCard(board, 1, 'winning');
    expect(result.winner).toBe(1);
    expect(result.board.scores['1']).toBe(64);
    expect(result.board.scores['2']).toBe(-64);
  });
});
