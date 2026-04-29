import { describe, it, expect } from 'vitest';
import { generateGrid, GRID_SIZE, DIRECTION_VECTORS, getWordCells } from './word-search-logic';
import type { WordPlacement } from './word-search-types';

describe('word-search-logic', () => {
  describe('generateGrid', () => {
    it('returns a 10x10 grid of uppercase letters', () => {
      const result = generateGrid(['TIGER', 'LION', 'EAGLE']);
      expect(result.grid).toHaveLength(GRID_SIZE);
      result.grid.forEach((row) => {
        expect(row).toHaveLength(GRID_SIZE);
        row.forEach((cell) => {
          expect(cell).toMatch(/^[A-Z]$/);
        });
      });
    });

    it('places all requested words in the grid', () => {
      const words = ['TIGER', 'LION', 'EAGLE'];
      const result = generateGrid(words);
      expect(result.words).toHaveLength(3);
      result.words.forEach((placement) => {
        expect(words).toContain(placement.word);
      });
    });

    it('placed words match grid content', () => {
      const result = generateGrid(['TIGER', 'LION']);
      result.words.forEach((placement) => {
        const cells = getWordCells(placement);
        const extracted = cells.map(([r, c]) => result.grid[r][c]).join('');
        expect(extracted).toBe(placement.word);
      });
    });

    it('handles maximum word count (12 words)', () => {
      const words = ['TIGER', 'LION', 'EAGLE', 'PANDA', 'WHALE', 'ZEBRA', 'COBRA', 'DOVE', 'FROG', 'BEAR', 'WOLF', 'DEER'];
      const result = generateGrid(words);
      expect(result.words.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('getWordCells', () => {
    it('returns correct cells for a horizontal word', () => {
      const placement: WordPlacement = { word: 'CAT', start: [0, 0], end: [0, 2], direction: 'right' };
      const cells = getWordCells(placement);
      expect(cells).toEqual([[0, 0], [0, 1], [0, 2]]);
    });

    it('returns correct cells for a diagonal word', () => {
      const placement: WordPlacement = { word: 'HI', start: [1, 1], end: [2, 2], direction: 'down-right' };
      const cells = getWordCells(placement);
      expect(cells).toEqual([[1, 1], [2, 2]]);
    });

    it('returns correct cells for a reversed word', () => {
      const placement: WordPlacement = { word: 'ABC', start: [0, 2], end: [0, 0], direction: 'left' };
      const cells = getWordCells(placement);
      expect(cells).toEqual([[0, 2], [0, 1], [0, 0]]);
    });
  });

  describe('DIRECTION_VECTORS', () => {
    it('has all 8 directions', () => {
      expect(Object.keys(DIRECTION_VECTORS)).toHaveLength(8);
    });
  });
});
