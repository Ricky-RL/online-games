'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import {
  BallState, Shot, Point,
  TABLE_WIDTH, TABLE_HEIGHT, BALL_RADIUS, POCKET_RADIUS,
  CUSHION_WIDTH, MAX_POWER, POCKETS, BALL_COLORS,
  isSolid, isStripe, isEightBall,
} from '@/lib/pool/types';
import { shootCueBall, stepPhysics, isAnyBallMoving } from '@/lib/pool/physics';

interface PoolCanvasProps {
  balls: BallState[];
  isMyTurn: boolean;
  phase: 'playing' | 'ball-in-hand' | 'finished';
  playerNumber: 1 | 2;
  onShotTaken: (shot: Shot) => void;
  onBallPlaced?: (x: number, y: number) => void;
  replayShot: Shot | null;
  isReplaying: boolean;
  onReplayComplete: () => void;
  previousBalls?: BallState[];
}

export function PoolCanvas({
  balls,
  isMyTurn,
  phase,
  playerNumber,
  onShotTaken,
  onBallPlaced,
  replayShot,
  isReplaying,
  onReplayComplete,
  previousBalls,
}: PoolCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ballsRef = useRef<BallState[]>(balls);
  const animatingRef = useRef(false);
  const [animating, setAnimating] = useState(false);
  const physicsFrameRef = useRef<number>(0);
  const renderFrameRef = useRef<number>(0);

  const aimingRef = useRef(false);
  const [aiming, setAiming] = useState(false);
  const dragStartRef = useRef<Point | null>(null);
  const dragCurrentRef = useRef<Point | null>(null);
  const [, setRenderTick] = useState(0);

  const scaleRef = useRef(1);
  const dprRef = useRef(typeof window !== 'undefined' ? window.devicePixelRatio : 1);
  const isMyTurnRef = useRef(isMyTurn);
  const onShotTakenRef = useRef(onShotTaken);
  const onReplayCompleteRef = useRef(onReplayComplete);

  useEffect(() => { isMyTurnRef.current = isMyTurn; }, [isMyTurn]);
  useEffect(() => { onShotTakenRef.current = onShotTaken; }, [onShotTaken]);
  useEffect(() => { onReplayCompleteRef.current = onReplayComplete; }, [onReplayComplete]);

  // Update balls when props change (but not during animation)
  useEffect(() => {
    if (!animatingRef.current) {
      ballsRef.current = balls;
      setRenderTick((t) => t + 1);
    }
  }, [balls]);

  // Handle replay
  useEffect(() => {
    if (!isReplaying || !replayShot || !previousBalls) return;

    ballsRef.current = previousBalls;
    const shotBalls = shootCueBall(previousBalls, replayShot);
    ballsRef.current = shotBalls;
    animatingRef.current = true;
    setAnimating(true);
  }, [isReplaying, replayShot, previousBalls]);

  // Responsive sizing
  const computeScale = useCallback(() => {
    const container = containerRef.current;
    if (!container) return 1;
    const { width, height } = container.getBoundingClientRect();
    const scaleX = (width * 0.95) / TABLE_WIDTH;
    const scaleY = (height * 0.95) / TABLE_HEIGHT;
    return Math.min(scaleX, scaleY);
  }, []);

  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale = computeScale();
    const dpr = dprRef.current;
    scaleRef.current = scale;

    const newWidth = Math.round(TABLE_WIDTH * scale * dpr);
    const newHeight = Math.round(TABLE_HEIGHT * scale * dpr);

    if (canvas.width !== newWidth || canvas.height !== newHeight) {
      canvas.width = newWidth;
      canvas.height = newHeight;
      canvas.style.width = `${TABLE_WIDTH * scale}px`;
      canvas.style.height = `${TABLE_HEIGHT * scale}px`;
    }
  }, [computeScale]);

  useEffect(() => {
    sizeCanvas();
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => sizeCanvas());
    observer.observe(container);
    return () => observer.disconnect();
  }, [sizeCanvas]);

  const canvasToWorld = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scale = scaleRef.current;
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  }, []);

  // Pointer events for aiming
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (animating || phase === 'finished') return;
    if (phase === 'ball-in-hand') {
      // Place cue ball mode
      const pos = canvasToWorld(e.clientX, e.clientY);
      onBallPlaced?.(pos.x, pos.y);
      return;
    }
    if (!isMyTurnRef.current) return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const pos = canvasToWorld(e.clientX, e.clientY);
    aimingRef.current = true;
    setAiming(true);
    dragStartRef.current = pos;
    dragCurrentRef.current = pos;
    setRenderTick((t) => t + 1);
  }, [animating, phase, canvasToWorld, onBallPlaced]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!aimingRef.current) return;
    dragCurrentRef.current = canvasToWorld(e.clientX, e.clientY);
    setRenderTick((t) => t + 1);
  }, [canvasToWorld]);

  const handlePointerUp = useCallback(() => {
    if (!aimingRef.current || !dragStartRef.current || !dragCurrentRef.current) {
      aimingRef.current = false;
      setAiming(false);
      return;
    }

    const cueBall = ballsRef.current.find((b) => b.id === 0 && !b.pocketed);
    if (!cueBall) { aimingRef.current = false; setAiming(false); return; }

    const dx = cueBall.x - dragCurrentRef.current.x;
    const dy = cueBall.y - dragCurrentRef.current.y;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_POWER);

    if (power < 5) {
      aimingRef.current = false;
      setAiming(false);
      dragStartRef.current = null;
      dragCurrentRef.current = null;
      setRenderTick((t) => t + 1);
      return;
    }

    const angle = Math.atan2(dx, -dy);
    const shot: Shot = { angle, power, cueBallX: cueBall.x, cueBallY: cueBall.y };

    onShotTakenRef.current(shot);

    // Start local animation
    const shotBalls = shootCueBall(ballsRef.current, shot);
    ballsRef.current = shotBalls;
    animatingRef.current = true;
    setAnimating(true);

    aimingRef.current = false;
    setAiming(false);
    dragStartRef.current = null;
    dragCurrentRef.current = null;
  }, []);

  // Physics loop
  useEffect(() => {
    if (!animating) return;

    const loop = () => {
      const { balls: next } = stepPhysics(ballsRef.current);
      ballsRef.current = next;

      if (!isAnyBallMoving(next)) {
        animatingRef.current = false;
        setAnimating(false);
        if (isReplaying) {
          onReplayCompleteRef.current();
        }
        return;
      }

      physicsFrameRef.current = requestAnimationFrame(loop);
    };

    physicsFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(physicsFrameRef.current);
  }, [animating, isReplaying]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const shouldLoop = animating || aiming;

    const renderFrame = () => {
      renderTable(ctx, canvas, scaleRef.current, dprRef.current, ballsRef.current, aimingRef.current, dragCurrentRef.current, phase);
      if (shouldLoop) {
        renderFrameRef.current = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();
    if (shouldLoop) {
      return () => cancelAnimationFrame(renderFrameRef.current);
    }
  }, [animating, aiming, phase, balls]);

  // Prevent scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    canvas.addEventListener('touchstart', prevent, { passive: false });
    canvas.addEventListener('touchmove', prevent, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', prevent);
      canvas.removeEventListener('touchmove', prevent);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center w-full h-full"
      style={{ touchAction: 'none', overscrollBehavior: 'none' }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="rounded-lg shadow-lg cursor-crosshair"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}

function renderTable(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  scale: number,
  dpr: number,
  balls: BallState[],
  aiming: boolean,
  dragCurrent: Point | null,
  phase: string,
) {
  ctx.save();
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);

  // Table border (wood)
  ctx.fillStyle = '#5D3A1A';
  ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

  // Felt (green playing surface)
  ctx.fillStyle = '#0A6B35';
  ctx.fillRect(CUSHION_WIDTH, CUSHION_WIDTH, TABLE_WIDTH - 2 * CUSHION_WIDTH, TABLE_HEIGHT - 2 * CUSHION_WIDTH);

  // Pockets
  for (const pocket of POCKETS) {
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
  }

  // Balls
  for (const ball of balls) {
    if (ball.pocketed) continue;
    renderBall(ctx, ball);
  }

  // Aiming line
  if (aiming && dragCurrent) {
    const cueBall = balls.find((b) => b.id === 0 && !b.pocketed);
    if (cueBall) {
      const dx = cueBall.x - dragCurrent.x;
      const dy = cueBall.y - dragCurrent.y;
      const power = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_POWER);

      if (power >= 5) {
        const angle = Math.atan2(dx, -dy);
        const lineLen = 40 + power * 0.3;
        const endX = cueBall.x + Math.sin(angle) * lineLen;
        const endY = cueBall.y - Math.cos(angle) * lineLen;

        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(cueBall.x, cueBall.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);

        // Power indicator
        const powerPct = power / MAX_POWER;
        const barWidth = 60;
        const barHeight = 6;
        const barX = cueBall.x - barWidth / 2;
        const barY = cueBall.y + BALL_RADIUS + 12;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        const color = powerPct < 0.33 ? '#4CAF50' : powerPct < 0.66 ? '#FF9800' : '#F44336';
        ctx.fillStyle = color;
        ctx.fillRect(barX, barY, barWidth * powerPct, barHeight);
      }
    }
  }

  // Ball-in-hand indicator
  if (phase === 'ball-in-hand') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(CUSHION_WIDTH, CUSHION_WIDTH, TABLE_WIDTH - 2 * CUSHION_WIDTH, TABLE_HEIGHT - 2 * CUSHION_WIDTH);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('Tap to place cue ball', TABLE_WIDTH / 2, TABLE_HEIGHT / 2);
  }

  ctx.restore();
}

function renderBall(ctx: CanvasRenderingContext2D, ball: BallState) {
  const { id, x, y } = ball;
  const color = BALL_COLORS[id] || '#FFF';

  ctx.beginPath();
  ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);

  if (id === 0) {
    // Cue ball: white with subtle shadow
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#CCC';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  } else if (isStripe(id)) {
    // Stripes: white ball with colored stripe band
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    // Stripe band
    ctx.beginPath();
    ctx.arc(x, y, BALL_RADIUS, -0.6, 0.6);
    ctx.arc(x, y, BALL_RADIUS, Math.PI - 0.6, Math.PI + 0.6);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    // Solids (and 8-ball): filled with color
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Number on ball (except cue ball)
  if (id > 0) {
    ctx.font = `bold ${BALL_RADIUS * 0.9}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // White circle background for number
    ctx.beginPath();
    ctx.arc(x, y, BALL_RADIUS * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.fillText(String(id), x, y + 0.5);
  }
}
