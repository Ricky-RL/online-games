'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { TableauColumn, FoundationPile, StockPile } from './CardStack';
import { dealFromDeck, canPlaceOnTableau, canPlaceOnFoundation, isGameWon, canAutoComplete, getCard } from '@/lib/solitaire-logic';
import type { SolitaireGameState } from '@/lib/solitaire-types';

interface BoardProps {
  deck: number[];
  onWin: (moves: number, timeSeconds: number, startedAt: string) => void;
  savedState?: SolitaireGameState | null;
  onStateChange?: (state: SolitaireGameState) => void;
}

export function SolitaireBoard({ deck, onWin, savedState, onStateChange }: BoardProps) {
  const [state, setState] = useState<SolitaireGameState>(() => savedState ?? dealFromDeck(deck));
  const [undoStack, setUndoStack] = useState<SolitaireGameState[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  // Start timer on first interaction
  useEffect(() => {
    if (state.startedAt && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(state.startedAt!).getTime()) / 1000));
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state.startedAt]);

  // Persist to localStorage
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Check win condition
  useEffect(() => {
    if (isGameWon(state.foundations) && state.startedAt) {
      const timeSeconds = Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 1000);
      onWin(state.moves, timeSeconds, state.startedAt);
    }
  }, [state.foundations, state.moves, state.startedAt, onWin]);

  const ensureStarted = useCallback((s: SolitaireGameState): SolitaireGameState => {
    if (s.startedAt) return s;
    return { ...s, startedAt: new Date().toISOString() };
  }, []);

  const pushUndo = useCallback((s: SolitaireGameState) => {
    setUndoStack((prev) => [...prev.slice(-50), s]);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setState({ ...prev, moves: state.moves + 1 }); // Undo costs a move
  }, [undoStack, state.moves]);

  const handleDraw = useCallback(() => {
    setState((s) => {
      const started = ensureStarted(s);
      pushUndo(started);
      if (started.stock.length === 0) {
        // Recycle waste back to stock
        return { ...started, stock: [...started.waste].reverse(), waste: [], moves: started.moves + 1 };
      }
      const drawn = started.stock[started.stock.length - 1];
      const newFaceUp = new Set(started.faceUp);
      newFaceUp.add(drawn);
      return {
        ...started,
        stock: started.stock.slice(0, -1),
        waste: [...started.waste, drawn],
        faceUp: newFaceUp,
        moves: started.moves + 1,
      };
    });
  }, [ensureStarted, pushUndo]);

  const tryMoveToFoundation = useCallback((cardId: number, fromState: SolitaireGameState): SolitaireGameState | null => {
    const card = getCard(cardId);
    if (!canPlaceOnFoundation(cardId, fromState.foundations[card.suit], card.suit)) return null;
    const newFoundations = fromState.foundations.map((f, i) => i === card.suit ? [...f, cardId] : f);
    return { ...fromState, foundations: newFoundations };
  }, []);

  const moveCard = useCallback((cardId: number, source: { type: string; col?: number; cardIndex?: number }, target: { type: string; col?: number; suit?: number }) => {
    setState((s) => {
      const started = ensureStarted(s);
      pushUndo(started);

      let newState = { ...started };
      let cardsToMove: number[] = [];

      // Remove from source
      if (source.type === 'waste') {
        cardsToMove = [cardId];
        newState.waste = started.waste.slice(0, -1);
      } else if (source.type === 'tableau' && source.col !== undefined && source.cardIndex !== undefined) {
        cardsToMove = started.tableau[source.col].slice(source.cardIndex);
        newState.tableau = started.tableau.map((col, i) =>
          i === source.col ? col.slice(0, source.cardIndex) : col
        );
        // Flip new top card face-up
        const newCol = newState.tableau[source.col!];
        if (newCol.length > 0) {
          const newFaceUp = new Set(started.faceUp);
          newFaceUp.add(newCol[newCol.length - 1]);
          newState.faceUp = newFaceUp;
        }
      }

      // Place on target
      if (target.type === 'tableau' && target.col !== undefined) {
        if (!canPlaceOnTableau(cardId, newState.tableau[target.col])) {
          return started; // Invalid move
        }
        newState.tableau = newState.tableau.map((col, i) =>
          i === target.col ? [...col, ...cardsToMove] : col
        );
      } else if (target.type === 'foundation' && target.suit !== undefined) {
        if (cardsToMove.length > 1) return started; // Can only move single cards to foundation
        if (!canPlaceOnFoundation(cardId, newState.foundations[target.suit], target.suit)) {
          return started; // Invalid move
        }
        newState.foundations = newState.foundations.map((f, i) =>
          i === target.suit ? [...f, cardId] : f
        );
      }

      return { ...newState, moves: started.moves + 1 };
    });
  }, [ensureStarted, pushUndo]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dragData = active.data.current as { source: string; col?: number; cardIndex?: number } | undefined;
    if (!dragData) return;

    const dropData = over.data.current as { type: string; col?: number; suit?: number } | undefined;
    if (!dropData) return;

    const cardId = parseInt(String(active.id).replace('card-', ''));
    moveCard(cardId, { type: dragData.source, col: dragData.col, cardIndex: dragData.cardIndex }, dropData);
  }, [moveCard]);

  const handleDoubleClick = useCallback((cardId: number, source: { type: string; col?: number; cardIndex?: number }) => {
    setState((s) => {
      const started = ensureStarted(s);
      const result = tryMoveToFoundation(cardId, started);
      if (!result) return started;
      pushUndo(started);

      let newState = { ...result };

      // Remove from source
      if (source.type === 'waste') {
        newState.waste = started.waste.slice(0, -1);
      } else if (source.type === 'tableau' && source.col !== undefined && source.cardIndex !== undefined) {
        newState.tableau = started.tableau.map((col, i) =>
          i === source.col ? col.slice(0, source.cardIndex) : col
        );
        const newCol = newState.tableau[source.col!];
        if (newCol.length > 0) {
          const newFaceUp = new Set(started.faceUp);
          newFaceUp.add(newCol[newCol.length - 1]);
          newState.faceUp = newFaceUp;
        }
      }

      return { ...newState, moves: started.moves + 1 };
    });
  }, [ensureStarted, pushUndo, tryMoveToFoundation]);

  const handleAutoComplete = useCallback(() => {
    setState((s) => {
      let current = { ...s };
      let moved = true;
      while (moved) {
        moved = false;
        // Try waste
        if (current.waste.length > 0) {
          const result = tryMoveToFoundation(current.waste[current.waste.length - 1], current);
          if (result) {
            current = { ...result, waste: current.waste.slice(0, -1), moves: current.moves + 1 };
            moved = true;
            continue;
          }
        }
        // Try tableau tops
        for (let col = 0; col < 7; col++) {
          if (current.tableau[col].length === 0) continue;
          const topCard = current.tableau[col][current.tableau[col].length - 1];
          const result = tryMoveToFoundation(topCard, current);
          if (result) {
            current = {
              ...result,
              tableau: current.tableau.map((c, i) => i === col ? c.slice(0, -1) : c),
              moves: current.moves + 1,
            };
            moved = true;
            break;
          }
        }
      }
      return current;
    });
  }, [tryMoveToFoundation]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col items-center gap-3 p-2 sm:p-4 w-full max-w-[500px] mx-auto">
        {/* Top row: Stock + Waste ... Foundations */}
        <div className="flex w-full justify-between items-start">
          <StockPile
            stock={state.stock}
            waste={state.waste}
            onDraw={handleDraw}
            onWasteCardClick={(cardId) => handleDoubleClick(cardId, { type: 'waste' })}
          />
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((suit) => (
              <FoundationPile key={suit} suit={suit} cards={state.foundations[suit]} />
            ))}
          </div>
        </div>

        {/* Tableau */}
        <div className="flex gap-1 sm:gap-1.5 w-full justify-center mt-3">
          {state.tableau.map((col, i) => (
            <TableauColumn
              key={i}
              col={i}
              cards={col}
              faceUp={state.faceUp}
              onCardClick={(cardId) => {
                const cardIndex = col.indexOf(cardId);
                handleDoubleClick(cardId, { type: 'tableau', col: i, cardIndex });
              }}
            />
          ))}
        </div>

        {/* Stats + Controls */}
        <div className="flex items-center gap-4 sm:gap-6 mt-3 text-xs sm:text-sm text-text-secondary">
          <span>Moves: <strong className="text-text-primary">{state.moves}</strong></span>
          <span>Time: <strong className="text-text-primary">{formatTime(elapsed)}</strong></span>
        </div>

        <div className="flex items-center gap-3 mt-2">
          {undoStack.length > 0 && (
            <button
              onClick={handleUndo}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Undo
            </button>
          )}
          {canAutoComplete(state) && (
            <button
              onClick={handleAutoComplete}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-green-500/30 bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors cursor-pointer"
            >
              Auto-Complete
            </button>
          )}
        </div>
      </div>
    </DndContext>
  );
}
