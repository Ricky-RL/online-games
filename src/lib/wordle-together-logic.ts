import { generateAnswerIndex, getAnswer, isValidGuess } from './wordle-logic';

export interface WordleTogetherBoard {
  answer: string;
  player1_guesses: string[];
  player2_guesses: string[];
  player1_finished: boolean;
  player2_finished: boolean;
}

export function createEmptyBoard(): WordleTogetherBoard {
  const index = generateAnswerIndex();
  const answer = getAnswer(index).toUpperCase();
  return {
    answer,
    player1_guesses: [],
    player2_guesses: [],
    player1_finished: false,
    player2_finished: false,
  };
}

export function makeMove(
  board: WordleTogetherBoard,
  word: string,
  player: 1 | 2
): {
  board: WordleTogetherBoard;
  winner: 1 | 2 | null;
  status: 'playing' | 'won' | 'lost' | 'draw';
} {
  const upperWord = word.toUpperCase();
  if (!isValidGuess(upperWord)) {
    throw new Error('Not a valid word');
  }

  // Clone guesses
  const player1_guesses = [...board.player1_guesses];
  const player2_guesses = [...board.player2_guesses];
  let player1_finished = board.player1_finished;
  let player2_finished = board.player2_finished;

  if (player === 1) {
    if (player1_finished) throw new Error('Player 1 already finished');
    player1_guesses.push(upperWord);
  } else {
    if (player2_finished) throw new Error('Player 2 already finished');
    player2_guesses.push(upperWord);
  }

  const isCorrect = upperWord === board.answer;
  let winner: 1 | 2 | null = null;
  let status: 'playing' | 'won' | 'lost' | 'draw' = 'playing';

  if (isCorrect) {
    winner = player;
    status = 'won'; // 'won' from the perspective of the winner
    if (player === 1) {
      player1_finished = true;
    } else {
      player2_finished = true;
    }
  } else {
    const guessCount = player === 1 ? player1_guesses.length : player2_guesses.length;
    if (guessCount >= 6) {
      if (player === 1) {
        player1_finished = true;
      } else {
        player2_finished = true;
      }

      // If one player runs out of guesses, they lose. In a 2-player game,
      // this means the other player wins immediately by default.
      // If the other player is already finished, then both failed, resulting in a draw.
      if (player === 1) {
        if (player2_finished && !board.player2_guesses.includes(board.answer)) {
          status = 'draw';
        } else {
          winner = 2;
          status = 'won'; // Player 2 wins
        }
      } else {
        if (player1_finished && !board.player1_guesses.includes(board.answer)) {
          status = 'draw';
        } else {
          winner = 1;
          status = 'won'; // Player 1 wins
        }
      }
    }
  }

  return {
    board: {
      answer: board.answer,
      player1_guesses,
      player2_guesses,
      player1_finished,
      player2_finished,
    },
    winner,
    status,
  };
}

export function checkWin(board: WordleTogetherBoard): 1 | 2 | null {
  // Check if player 1 guessed it
  if (board.player1_guesses.includes(board.answer)) {
    return 1;
  }
  // Check if player 2 guessed it
  if (board.player2_guesses.includes(board.answer)) {
    return 2;
  }
  // If player 1 ran out of guesses and player 2 hasn't guessed it (or ran out), player 2 wins
  if (board.player1_guesses.length >= 6 && !board.player2_guesses.includes(board.answer)) {
    if (board.player2_guesses.length >= 6) {
      return null; // Both failed (draw)
    }
    return 2;
  }
  // If player 2 ran out of guesses
  if (board.player2_guesses.length >= 6 && !board.player1_guesses.includes(board.answer)) {
    if (board.player1_guesses.length >= 6) {
      return null; // Draw
    }
    return 1;
  }
  return null;
}

export function isDraw(board: WordleTogetherBoard): boolean {
  return (
    board.player1_guesses.length >= 6 &&
    board.player2_guesses.length >= 6 &&
    !board.player1_guesses.includes(board.answer) &&
    !board.player2_guesses.includes(board.answer)
  );
}
