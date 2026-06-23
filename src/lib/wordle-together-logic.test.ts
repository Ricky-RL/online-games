import { describe, it, expect } from 'vitest';
import { createEmptyBoard, makeMove, checkWin, isDraw } from './wordle-together-logic';

describe('Wordle Together Logic', () => {
  it('creates empty board correctly', () => {
    const board = createEmptyBoard();
    expect(board.answer).toHaveLength(5);
    expect(board.player1_guesses).toEqual([]);
    expect(board.player2_guesses).toEqual([]);
    expect(board.player1_finished).toBe(false);
    expect(board.player2_finished).toBe(false);
  });

  it('submits valid guesses and updates board state', () => {
    const board = {
      answer: 'HELLO',
      player1_guesses: [],
      player2_guesses: [],
      player1_finished: false,
      player2_finished: false,
    };

    const res = makeMove(board, 'WORLD', 1);
    expect(res.board.player1_guesses).toEqual(['WORLD']);
    expect(res.board.player2_guesses).toEqual([]);
    expect(res.winner).toBeNull();
    expect(res.status).toBe('playing');
    expect(res.board.player1_finished).toBe(false);

    const res2 = makeMove(res.board, 'ABOUT', 2);
    expect(res2.board.player1_guesses).toEqual(['WORLD']);
    expect(res2.board.player2_guesses).toEqual(['ABOUT']);
    expect(res2.winner).toBeNull();
  });

  it('detects correct guess as win', () => {
    const board = {
      answer: 'HELLO',
      player1_guesses: ['WORLD'],
      player2_guesses: ['ABOUT'],
      player1_finished: false,
      player2_finished: false,
    };

    const res = makeMove(board, 'HELLO', 1);
    expect(res.winner).toBe(1);
    expect(res.status).toBe('won');
    expect(res.board.player1_finished).toBe(true);
    expect(res.board.player2_finished).toBe(false);
  });

  it('declares opponent winner if player runs out of guesses', () => {
    const board = {
      answer: 'HELLO',
      player1_guesses: ['WORLD', 'WORLD', 'WORLD', 'WORLD', 'WORLD'],
      player2_guesses: ['ABOUT'],
      player1_finished: false,
      player2_finished: false,
    };

    // Player 1 makes 6th incorrect guess
    const res = makeMove(board, 'WORLD', 1);
    expect(res.board.player1_finished).toBe(true);
    expect(res.winner).toBe(2); // Player 2 wins by default
    expect(res.status).toBe('won');
  });

  it('detects draw when both players run out of guesses', () => {
    const board = {
      answer: 'HELLO',
      player1_guesses: ['WORLD', 'WORLD', 'WORLD', 'WORLD', 'WORLD', 'WORLD'],
      player2_guesses: ['ABOUT', 'ABOUT', 'ABOUT', 'ABOUT', 'ABOUT'],
      player1_finished: true,
      player2_finished: false,
    };

    // Player 2 makes 6th incorrect guess
    const res = makeMove(board, 'ABOUT', 2);
    expect(res.board.player2_finished).toBe(true);
    expect(res.winner).toBeNull();
    expect(res.status).toBe('draw');
    expect(isDraw(res.board)).toBe(true);
  });

  it('evaluates checkWin correctly', () => {
    const boardFinished1 = {
      answer: 'HELLO',
      player1_guesses: ['HELLO'],
      player2_guesses: ['WORLD'],
      player1_finished: true,
      player2_finished: false,
    };
    expect(checkWin(boardFinished1)).toBe(1);

    const boardFinished2 = {
      answer: 'HELLO',
      player1_guesses: ['WORLD', 'WORLD', 'WORLD', 'WORLD', 'WORLD', 'WORLD'],
      player2_guesses: ['ABOUT'],
      player1_finished: true,
      player2_finished: false,
    };
    expect(checkWin(boardFinished2)).toBe(2);

    const drawBoard = {
      answer: 'HELLO',
      player1_guesses: ['WORLD', 'WORLD', 'WORLD', 'WORLD', 'WORLD', 'WORLD'],
      player2_guesses: ['ABOUT', 'ABOUT', 'ABOUT', 'ABOUT', 'ABOUT', 'ABOUT'],
      player1_finished: true,
      player2_finished: true,
    };
    expect(checkWin(drawBoard)).toBeNull();
    expect(isDraw(drawBoard)).toBe(true);
  });
});
