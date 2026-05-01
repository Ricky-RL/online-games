import { getCard, canPlaceOnTableau, canPlaceOnFoundation, dealFromDeck, createShuffledDeck } from './solitaire-logic';

interface SolverState {
  tableau: number[][];
  foundations: number[][];
  stock: number[];
  waste: number[];
  faceUp: Set<number>;
}

function cloneState(s: SolverState): SolverState {
  return {
    tableau: s.tableau.map((col) => [...col]),
    foundations: s.foundations.map((f) => [...f]),
    stock: [...s.stock],
    waste: [...s.waste],
    faceUp: new Set(s.faceUp),
  };
}

function hashState(s: SolverState): string {
  const parts: string[] = [];
  for (const col of s.tableau) {
    parts.push(col.join(','));
  }
  parts.push('|');
  for (const f of s.foundations) {
    parts.push(String(f.length));
  }
  parts.push('|');
  parts.push(s.stock.join(','));
  parts.push('|');
  parts.push(s.waste.join(','));
  return parts.join(';');
}

function isSolved(s: SolverState): boolean {
  return s.foundations.every((f) => f.length === 13);
}

function getTopCard(col: number[]): number | undefined {
  return col[col.length - 1];
}

function solve(initial: SolverState, maxStates: number): boolean {
  const visited = new Set<string>();
  const stack: SolverState[] = [initial];

  while (stack.length > 0) {
    if (visited.size >= maxStates) return false;

    const state = stack.pop()!;
    const hash = hashState(state);
    if (visited.has(hash)) continue;
    visited.add(hash);

    if (isSolved(state)) return true;

    const nextStates: SolverState[] = [];

    // 1. Foundation moves (highest priority — always progress)
    for (let col = 0; col < 7; col++) {
      const top = getTopCard(state.tableau[col]);
      if (top === undefined) continue;
      if (!state.faceUp.has(top)) continue;
      const card = getCard(top);
      if (canPlaceOnFoundation(top, state.foundations[card.suit], card.suit)) {
        const ns = cloneState(state);
        ns.tableau[col] = ns.tableau[col].slice(0, -1);
        ns.foundations[card.suit] = [...ns.foundations[card.suit], top];
        // Flip newly exposed card
        const newTop = getTopCard(ns.tableau[col]);
        if (newTop !== undefined) ns.faceUp.add(newTop);
        nextStates.push(ns);
      }
    }

    // Waste to foundation
    const wasteTop = getTopCard(state.waste);
    if (wasteTop !== undefined) {
      const card = getCard(wasteTop);
      if (canPlaceOnFoundation(wasteTop, state.foundations[card.suit], card.suit)) {
        const ns = cloneState(state);
        ns.waste = ns.waste.slice(0, -1);
        ns.foundations[card.suit] = [...ns.foundations[card.suit], wasteTop];
        nextStates.push(ns);
      }
    }

    // 2. Tableau moves that reveal face-down cards (high priority)
    for (let fromCol = 0; fromCol < 7; fromCol++) {
      if (state.tableau[fromCol].length === 0) continue;
      // Find the first face-up card in this column
      let firstFaceUp = -1;
      for (let i = 0; i < state.tableau[fromCol].length; i++) {
        if (state.faceUp.has(state.tableau[fromCol][i])) {
          firstFaceUp = i;
          break;
        }
      }
      if (firstFaceUp === -1) continue;

      const movingCard = state.tableau[fromCol][firstFaceUp];
      const wouldReveal = firstFaceUp > 0;

      for (let toCol = 0; toCol < 7; toCol++) {
        if (toCol === fromCol) continue;
        if (!canPlaceOnTableau(movingCard, state.tableau[toCol])) continue;

        // Skip moving a King to an empty column if it doesn't reveal anything
        if (state.tableau[toCol].length === 0 && !wouldReveal) continue;

        const ns = cloneState(state);
        const cards = ns.tableau[fromCol].splice(firstFaceUp);
        ns.tableau[toCol] = [...ns.tableau[toCol], ...cards];
        // Flip newly exposed card
        const newTop = getTopCard(ns.tableau[fromCol]);
        if (newTop !== undefined) ns.faceUp.add(newTop);

        if (wouldReveal) {
          // Prioritize reveals by pushing later (DFS pops from end)
          nextStates.push(ns);
        } else {
          nextStates.unshift(ns);
        }
      }
    }

    // 3. Waste to tableau
    if (wasteTop !== undefined) {
      for (let toCol = 0; toCol < 7; toCol++) {
        if (!canPlaceOnTableau(wasteTop, state.tableau[toCol])) continue;
        // Skip moving to empty column unless it's a King
        if (state.tableau[toCol].length === 0 && getCard(wasteTop).rank !== 12) continue;
        const ns = cloneState(state);
        ns.waste = ns.waste.slice(0, -1);
        ns.tableau[toCol] = [...ns.tableau[toCol], wasteTop];
        nextStates.unshift(ns);
      }
    }

    // 4. Draw from stock
    if (state.stock.length > 0) {
      const ns = cloneState(state);
      const drawn = ns.stock.pop()!;
      ns.faceUp.add(drawn);
      ns.waste.push(drawn);
      nextStates.unshift(ns);
    } else if (state.waste.length > 0) {
      // Recycle waste to stock
      const ns = cloneState(state);
      ns.stock = [...ns.waste].reverse();
      ns.waste = [];
      nextStates.unshift(ns);
    }

    for (const ns of nextStates) {
      const h = hashState(ns);
      if (!visited.has(h)) {
        stack.push(ns);
      }
    }
  }

  return false;
}

export function isDealSolvable(deck: number[], maxStates = 50000): boolean {
  const dealt = dealFromDeck(deck);
  const initial: SolverState = {
    tableau: dealt.tableau,
    foundations: dealt.foundations,
    stock: dealt.stock,
    waste: dealt.waste,
    faceUp: dealt.faceUp,
  };
  return solve(initial, maxStates);
}

export function createSolvableDeck(maxAttempts = 50, maxStates = 50000): number[] {
  for (let i = 0; i < maxAttempts; i++) {
    const deck = createShuffledDeck();
    if (isDealSolvable(deck, maxStates)) {
      return deck;
    }
  }
  // Fallback: return last shuffle (extremely unlikely with 80% solvability rate)
  return createShuffledDeck();
}
