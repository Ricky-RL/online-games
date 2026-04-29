'use client';

import { WordleRow } from './WordleRow';
import type { WordleGuess, LetterState } from '@/lib/wordle-types';

interface WordleBoardProps {
  guesses: WordleGuess[];
  evaluations: LetterState[][];
  currentInput: string;
  opponentTyping: string | null;
  maxGuesses: number;
  gameOver: boolean;
  shakeRow?: boolean;
}

export function WordleBoard({
  guesses,
  evaluations,
  currentInput,
  opponentTyping,
  maxGuesses,
  gameOver,
  shakeRow,
}: WordleBoardProps) {
  const rows = [];

  for (let i = 0; i < maxGuesses; i++) {
    if (i < guesses.length) {
      rows.push(
        <WordleRow
          key={i}
          letters={guesses[i].word}
          evaluation={evaluations[i]}
          animate={true}
        />
      );
    } else if (i === guesses.length && !gameOver) {
      rows.push(
        <WordleRow
          key={i}
          letters={currentInput}
          isActive={true}
          shake={shakeRow}
        />
      );
    } else {
      rows.push(<WordleRow key={i} letters="" />);
    }
  }

  return (
    <div className="flex flex-col gap-[5px]">
      {/* Opponent typing preview - shown above the board */}
      {opponentTyping && !gameOver && (
        <div className="mb-1">
          <WordleRow letters={opponentTyping} isPreview={true} />
        </div>
      )}
      {rows}
    </div>
  );
}
