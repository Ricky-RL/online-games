'use client';

import { use, useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJengaGame } from '@/hooks/useJengaGame';
import { useGameSounds } from '@/hooks/useSound';
import { getJengaGameStatus, calculateBlockRisk, getPlayerScores, getMinimumRiskThreshold, getMovePoints, getEarlyGameMultiplier, generatePullPath, measureDragDeviation, computeEarlyReleaseDeviation, computeCascadeEffects } from '@/lib/jenga-logic';
import { JengaTower } from '@/components/jenga/JengaTower';
import { JengaDragPath } from '@/components/jenga/JengaDragPath';
import { JengaHowToPlay } from '@/components/jenga/JengaHowToPlay';
import { JengaWobbleMeter } from '@/components/jenga/JengaWobbleMeter';
import { TurnIndicator } from '@/components/TurnIndicator';
import { WinCelebration } from '@/components/WinCelebration';
import { EndGameDialog } from '@/components/EndGameDialog';
import type { Player, Point } from '@/lib/types';

function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('player-name') || localStorage.getItem('player-name');
}

function deviationToGrade(deviation: number): 'A' | 'B' | 'C' | 'F' {
  if (deviation <= 0.05) return 'A';
  if (deviation <= 0.20) return 'B';
  if (deviation <= 0.50) return 'C';
  return 'F';
}

export default function JengaGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { game, loading, error, deleted, dragStartTime, pullBlockAction, startDrag, completeDrag, resetGame } = useJengaGame(gameId);
  const { play } = useGameSounds();
  const router = useRouter();
  const prevStatus = useRef<string | null>(null);
  const [myName, setMyName] = useState<string | null>(null);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<[number, number] | null>(null);
  const [pullingBlock, setPullingBlock] = useState<[number, number] | null>(null);
  const [flashingBlocks, setFlashingBlocks] = useState<string[]>([]);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragPath, setDragPath] = useState<Point[]>([]);
  const [playerTrace, setPlayerTrace] = useState<Point[]>([]);
  const [currentDeviation, setCurrentDeviation] = useState(0);
  const [dragGrade, setDragGrade] = useState<'A' | 'B' | 'C' | 'F' | null>(null);
  const [dragBlockPosition, setDragBlockPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [timeRemaining, setTimeRemaining] = useState(15);

  // Refs for drag performance and correctness
  const playerTraceRef = useRef<Point[]>([]);
  const lastDeviationCalcRef = useRef(0);
  const pointerTypeRef = useRef<string>('mouse');

  // Practice mode
  const [showPracticeOverlay, setShowPracticeOverlay] = useState(false);
  const [showPracticeComplete, setShowPracticeComplete] = useState(false);

  // First-game auto-show tooltip
  const hasCheckedFirstGame = useRef(false);

  useEffect(() => { setMyName(getMyName()); }, []);
  useEffect(() => { if (deleted) router.push('/'); }, [deleted, router]);

  const gameStatus = useMemo(() => {
    if (!game) return null;
    return getJengaGameStatus(game);
  }, [game]);

  useEffect(() => {
    if (gameStatus === 'won' && prevStatus.current !== 'won') {
      play('win');
      // Increment match count once per game completion (fix #6)
      const count = parseInt(localStorage.getItem('jenga-match-count') || '0', 10);
      localStorage.setItem('jenga-match-count', String(count + 1));
    }
    prevStatus.current = gameStatus;
  }, [gameStatus, play]);

  // Auto-show how-to-play on first game
  // NOTE: Spec prefers keying off match history (works cross-device), but using
  // localStorage as acceptable proxy since match count is now correctly incremented
  // only on game completion (fix #6).
  useEffect(() => {
    if (hasCheckedFirstGame.current || !game) return;
    hasCheckedFirstGame.current = true;
    const matchCount = parseInt(localStorage.getItem('jenga-match-count') || '0', 10);
    if (matchCount === 0) {
      setShowHowToPlay(true);
    }
  }, [game]);

  const myPlayerNumber: Player | null = useMemo(() => {
    if (!game || !myName) return null;
    if (game.player1_name === myName) return 1;
    if (game.player2_name === myName) return 2;
    return null;
  }, [game, myName]);

  const isMyTurn = useMemo(() => {
    if (!game || !myPlayerNumber) return false;
    return game.current_turn === myPlayerNumber;
  }, [game, myPlayerNumber]);

  const opponentName = useMemo(() => {
    if (!game || !myPlayerNumber) return null;
    return myPlayerNumber === 1 ? game.player2_name : game.player1_name;
  }, [game, myPlayerNumber]);

  const selectedRisk = useMemo(() => {
    if (!game || !selectedBlock) return null;
    return calculateBlockRisk(game.board, selectedBlock[0], selectedBlock[1]);
  }, [game, selectedBlock]);

  const scores = useMemo(() => {
    if (!game) return { player1: 0, player2: 0 };
    return getPlayerScores(game.board);
  }, [game]);

  const riskThreshold = useMemo(() => {
    if (!game) return 0;
    return getMinimumRiskThreshold(game.board);
  }, [game]);

  // Timer for drag countdown
  useEffect(() => {
    if (!dragStartTime) {
      setTimeRemaining(15);
      return;
    }
    const interval = setInterval(() => {
      const elapsed = (Date.now() - dragStartTime) / 1000;
      setTimeRemaining(Math.max(0, 15 - elapsed));
    }, 100);
    return () => clearInterval(interval);
  }, [dragStartTime]);

  const handleBlockClick = useCallback((row: number, col: number) => {
    if (isDragging) return; // Don't change selection during drag
    if (selectedBlock && selectedBlock[0] === row && selectedBlock[1] === col) {
      setSelectedBlock(null);
    } else {
      setSelectedBlock([row, col]);
      setDragGrade(null);
    }
  }, [selectedBlock, isDragging]);

  const handleDragStart = useCallback((row: number, col: number) => {
    if (!game) return;
    setIsDragging(true);
    setPlayerTrace([]);
    playerTraceRef.current = [];
    setCurrentDeviation(0);
    setDragGrade(null);

    // Detect touch device for tolerance zone (fix #5)
    pointerTypeRef.current = navigator.maxTouchPoints > 0 ? 'touch' : 'mouse';

    // Check practice mode
    const firstPullDone = localStorage.getItem('jenga-first-pull-done');
    if (!firstPullDone) {
      setShowPracticeOverlay(true);
    }

    // Compute block position for path overlay (approximate center of block)
    const isPerp = row % 2 === 1;
    const blockW = isPerp ? 20 : 36;
    const totalRowW = 3 * blockW + 2 * 2;
    const towerPixelW = 180;
    const startX = (towerPixelW - totalRowW) / 2;
    const x = startX + col * (blockW + 2) + blockW / 2;

    const BLOCK_FACE_H = 18;
    const BLOCK_TOP_H = 7;
    const ROW_HEIGHT = BLOCK_FACE_H + BLOCK_TOP_H + 1;
    const towerPixelH = game.board.tower.length * ROW_HEIGHT + 50;
    const y = towerPixelH - 40 - (row + 1) * ROW_HEIGHT + (BLOCK_FACE_H + BLOCK_TOP_H) / 2;

    setDragBlockPosition({ x, y });

    try {
      const path = generatePullPath(row, col, game.board.tower.length);
      setDragPath(path);
    } catch {
      setDragPath([]);
    }

    startDrag(row, col);
  }, [game, startDrag]);

  const handleDragMove = useCallback((point: Point) => {
    if (!isDragging) return;
    const next = [...playerTraceRef.current, point];
    playerTraceRef.current = next;
    setPlayerTrace(next);

    // Throttle deviation calculation to every 50ms (fix #4)
    const now = Date.now();
    if (now - lastDeviationCalcRef.current > 50) {
      lastDeviationCalcRef.current = now;
      if (dragPath.length > 0 && next.length >= 2) {
        try {
          // Transform to block-local coordinates (fix #1)
          const localTrace = next.map(p => ({
            x: p.x - dragBlockPosition.x,
            y: p.y - dragBlockPosition.y,
          }));
          // Use 28px tolerance for touch, 20px for mouse (fix #5)
          const tolerance = pointerTypeRef.current === 'touch' ? 28 : 20;
          const deviation = measureDragDeviation(dragPath, localTrace, tolerance);
          setCurrentDeviation(deviation);
          // Mobile haptics when deviation is high
          if (deviation > 0.3 && typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
          }
        } catch {
          // Function may not be available yet
        }
      }
    }
  }, [isDragging, dragPath, dragBlockPosition]);

  const handleDragEnd = useCallback(async () => {
    if (!isDragging || !selectedBlock) return;

    setIsDragging(false);
    setShowPracticeOverlay(false);

    // Read from ref to avoid stale closure (fix #2)
    const trace = playerTraceRef.current;

    // Compute final deviation
    let finalDeviation = 0.5; // default fallback
    if (dragPath.length > 0 && trace.length >= 2) {
      try {
        // Transform to block-local coordinates (fix #1)
        const localTrace = trace.map(p => ({
          x: p.x - dragBlockPosition.x,
          y: p.y - dragBlockPosition.y,
        }));
        // Use 28px tolerance for touch, 20px for mouse (fix #5)
        const tolerance = pointerTypeRef.current === 'touch' ? 28 : 20;
        finalDeviation = measureDragDeviation(dragPath, localTrace, tolerance);

        // Apply early release penalty if path not completed (fix #3)
        if (localTrace.length > 0 && dragPath.length > 0) {
          const lastTracePoint = localTrace[localTrace.length - 1];
          let maxProgress = 0;
          for (let i = 0; i < dragPath.length; i++) {
            const dx = lastTracePoint.x - dragPath[i].x;
            const dy = lastTracePoint.y - dragPath[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 15) {
              maxProgress = Math.max(maxProgress, i / (dragPath.length - 1));
            }
          }
          const pathCompletionRatio = maxProgress;
          if (pathCompletionRatio < 0.9) {
            finalDeviation = computeEarlyReleaseDeviation(finalDeviation, pathCompletionRatio);
          }
        }
      } catch {
        finalDeviation = 0.5;
      }
    }

    // Show grade
    const grade = deviationToGrade(finalDeviation);
    setDragGrade(grade);

    play('drop');
    const [row, col] = selectedBlock;
    setPullingBlock([row, col]);

    // Mark first pull done for practice mode
    const firstPullDone = localStorage.getItem('jenga-first-pull-done');
    if (!firstPullDone) {
      localStorage.setItem('jenga-first-pull-done', 'true');
      setShowPracticeComplete(true);
      setTimeout(() => setShowPracticeComplete(false), 2000);
    }

    await new Promise(r => setTimeout(r, 300));
    setPullingBlock(null);
    setSelectedBlock(null);

    // Compute cascade targets BEFORE the pull modifies state (fix #8)
    const cascadeTargets = game ? computeCascadeEffects(row, col, game.board.tower) : [];

    await completeDrag(row, col, finalDeviation);

    // Use pre-computed targets for flash
    if (cascadeTargets.length > 0) {
      const keys = cascadeTargets.map((e) => `${e.targetRow}-${e.targetCol}`);
      setFlashingBlocks(keys);
      setTimeout(() => setFlashingBlocks([]), 400);
    }

    // Clear drag state
    playerTraceRef.current = [];
    setPlayerTrace([]);
    setDragPath([]);
    setCurrentDeviation(0);
    setTimeout(() => setDragGrade(null), 1500);
  }, [isDragging, selectedBlock, dragPath, dragBlockPosition, play, completeDrag, game]);

  // Backwards-compatible confirm pull (for keyboard/button fallback)
  const handleConfirmPull = useCallback(async () => {
    if (!selectedBlock) return;
    play('drop');
    const [row, col] = selectedBlock;
    setSelectedBlock(null);
    setPullingBlock([row, col]);
    await new Promise(r => setTimeout(r, 300));
    setPullingBlock(null);
    await pullBlockAction(row, col);

    // Trigger cascade flash
    if (game) {
      try {
        const affected = computeCascadeEffects(row, col, game.board.tower);
        const keys = affected.map((e) => `${e.targetRow}-${e.targetCol}`);
        setFlashingBlocks(keys);
        setTimeout(() => setFlashingBlocks([]), 400);
      } catch {
        // computeCascadeEffects may not exist yet
      }
    }
  }, [selectedBlock, pullBlockAction, play, game]);

  const handleReset = useCallback(async () => {
    await resetGame();
    router.push('/');
  }, [resetGame, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-secondary text-sm">Loading game...</div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-player1 text-sm">Error: {error}</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-secondary text-sm">Game not found</div>
      </div>
    );
  }

  if (gameStatus === 'won' && game.winner) {
    const winnerName = game.winner === 1 ? game.player1_name : game.player2_name;
    const isMe = game.winner === myPlayerNumber;
    const finalScores = getPlayerScores(game.board);
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
        <WinCelebration
          winner={game.winner}
          winnerName={winnerName}
          isMe={isMe}
          onPlayAgain={handleReset}
          onHome={handleReset}
        />
        <div className="flex items-center gap-4 text-sm text-text-secondary">
          <span>{game.player1_name}: <strong className="text-text-primary">{finalScores.player1} pts</strong></span>
          <span className="text-text-secondary/40">vs</span>
          <span>{game.player2_name}: <strong className="text-text-primary">{finalScores.player2} pts</strong></span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4 relative">
        {/* How to Play button */}
        <button
          onClick={() => setShowHowToPlay(true)}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm transition-all cursor-pointer text-sm font-semibold"
          aria-label="How to play"
        >
          ?
        </button>

        {/* Scoreboard */}
        <div className="flex items-center gap-5 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-player1" />
            <span className="font-medium text-text-primary">{scores.player1}</span>
            <span className="text-text-secondary text-xs">{game.player1_name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-player2" />
            <span className="font-medium text-text-primary">{scores.player2}</span>
            <span className="text-text-secondary text-xs">{game.player2_name}</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <TurnIndicator
            currentPlayer={game.current_turn}
            isMyTurn={isMyTurn}
            playerName={opponentName}
          />
          <JengaWobbleMeter wobble={game.board.wobble_score} />
          <div className="text-xs font-medium text-amber-600">
            Min risk: {riskThreshold}%
          </div>
        </div>

        {gameStatus === 'waiting' && (
          <p className="text-sm text-text-secondary">Opponent can join anytime</p>
        )}

        {/* Tower with drag path overlay */}
        <div className="relative">
          <JengaTower
            state={game.board}
            isMyTurn={isMyTurn}
            selectedBlock={selectedBlock}
            pullingBlock={pullingBlock}
            onBlockClick={handleBlockClick}
            disabled={!isMyTurn || gameStatus === 'won'}
            riskThreshold={riskThreshold}
            flashingBlocks={flashingBlocks}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          />

          {/* Drag path overlay */}
          {(isDragging || dragGrade) && dragPath.length > 0 && (
            <JengaDragPath
              path={dragPath}
              playerTrace={playerTrace}
              currentDeviation={currentDeviation}
              isActive={isDragging}
              timeRemaining={timeRemaining}
              grade={dragGrade}
              blockPosition={dragBlockPosition}
            />
          )}

          {/* Practice mode overlay */}
          {showPracticeOverlay && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
              <div className="bg-black/80 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg">
                Trace this path!
              </div>
            </div>
          )}

          {/* Practice complete message */}
          {showPracticeComplete && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
              <div className="bg-emerald-600/90 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg">
                Got it! Good luck.
              </div>
            </div>
          )}
        </div>

        {/* Pull interaction area */}
        {selectedBlock && isMyTurn && !isDragging && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-text-secondary">
              Risk: <strong className="text-text-primary">{selectedRisk}%</strong>
              {' · '}
              {(() => {
                const moveIdx = game!.board.move_history.length;
                const mult = getEarlyGameMultiplier(moveIdx);
                const pts = getMovePoints(selectedRisk ?? 0, moveIdx);
                return (
                  <>
                    <span className="text-emerald-500 font-medium">+{pts} pts</span>
                    {mult > 1 && <span className="text-amber-500 text-xs ml-1">({mult}x early bonus)</span>}
                  </>
                );
              })()}
            </span>
            <p className="text-xs text-text-secondary/70">
              Hold &amp; Drag to Pull
            </p>
            {/* Fallback button for accessibility / old flow */}
            <button
              onClick={handleConfirmPull}
              className="px-5 py-2 text-xs font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary transition-colors shadow-sm cursor-pointer"
            >
              Quick Pull (no drag)
            </button>
            <button
              onClick={() => setSelectedBlock(null)}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {/* During drag: show status */}
        {isDragging && (
          <div className="text-sm text-text-secondary text-center">
            <span className="font-medium">Pulling...</span>
            <span className="ml-2 text-xs">{timeRemaining.toFixed(1)}s remaining</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-text-secondary/30 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={() => setShowEndDialog(true)}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-player1/20 bg-player1/5 text-player1/80 hover:bg-player1/10 hover:border-player1/40 hover:text-player1 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            End Game
          </button>
        </div>
      </div>

      <EndGameDialog
        open={showEndDialog}
        onConfirm={handleReset}
        onCancel={() => setShowEndDialog(false)}
      />
      <JengaHowToPlay
        open={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />
    </>
  );
}
