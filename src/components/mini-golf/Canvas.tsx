'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { Level, PhysicsState, Shot, CANVAS_WIDTH, CANVAS_HEIGHT, BALL_RADIUS, MAX_POWER, MAX_STROKES, PENALTY_SCORE } from '@/lib/mini-golf/types';
import { createPhysicsState, shootBall, stepPhysics, getMovingWallPosition, checkWaterHazard, checkPortal } from '@/lib/mini-golf/physics';
import { LEVELS } from '@/lib/mini-golf/levels';
import { useColors } from '@/contexts/PlayerColorsContext';

interface MiniGolfCanvasProps {
  levelId: number;
  isMyTurn: boolean;
  currentStroke: number;
  playerNumber: 1 | 2;
  onShotTaken: (shot: Shot) => void;
  onHoleComplete: (strokes: number) => void;
  onBounce?: () => void;
  onSink?: () => void;
  onSplash?: () => void;
}

export function MiniGolfCanvas({
  levelId,
  isMyTurn,
  currentStroke,
  playerNumber,
  onShotTaken,
  onHoleComplete,
  onBounce,
  onSink,
  onSplash,
}: MiniGolfCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const physicsRef = useRef<PhysicsState | null>(null);
  const renderFrameRef = useRef<number>(0);
  const physicsFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const bounceCountRef = useRef<number>(0);
  const holeCompletedRef = useRef(false);
  const [animating, setAnimating] = useState(false);
  const strokeRef = useRef(currentStroke);
  const { player1Color, player2Color } = useColors();

  const aimingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragCurrentRef = useRef<{ x: number; y: number } | null>(null);
  const [, setRenderTick] = useState(0);

  const scaleRef = useRef(1);
  const dprRef = useRef(typeof window !== 'undefined' ? window.devicePixelRatio : 1);
  const canvasSizedRef = useRef(false);

  const onHoleCompleteRef = useRef(onHoleComplete);
  const onBounceRef = useRef(onBounce);
  const onSinkRef = useRef(onSink);
  const onSplashRef = useRef(onSplash);
  const isMyTurnRef = useRef(isMyTurn);

  useEffect(() => { onHoleCompleteRef.current = onHoleComplete; }, [onHoleComplete]);
  useEffect(() => { onBounceRef.current = onBounce; }, [onBounce]);
  useEffect(() => { onSinkRef.current = onSink; }, [onSink]);
  useEffect(() => { onSplashRef.current = onSplash; }, [onSplash]);
  useEffect(() => { isMyTurnRef.current = isMyTurn; }, [isMyTurn]);

  const level = LEVELS[levelId];

  useEffect(() => {
    strokeRef.current = currentStroke;
  }, [currentStroke]);

  useEffect(() => {
    physicsRef.current = createPhysicsState(level);
    bounceCountRef.current = 0;
    holeCompletedRef.current = false;
  }, [level]);

  const computeScale = useCallback(() => {
    const container = containerRef.current;
    if (!container) return 1;
    const { width, height } = container.getBoundingClientRect();
    return Math.min(Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT), 0.85);
  }, []);

  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale = computeScale();
    const dpr = dprRef.current;
    scaleRef.current = scale;

    const newWidth = Math.round(CANVAS_WIDTH * scale * dpr);
    const newHeight = Math.round(CANVAS_HEIGHT * scale * dpr);

    if (canvas.width !== newWidth || canvas.height !== newHeight) {
      canvas.width = newWidth;
      canvas.height = newHeight;
      canvas.style.width = `${CANVAS_WIDTH * scale}px`;
      canvas.style.height = `${CANVAS_HEIGHT * scale}px`;
      canvasSizedRef.current = true;
    }
  }, [computeScale]);

  useEffect(() => {
    sizeCanvas();

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      sizeCanvas();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [sizeCanvas]);

  const canvasToWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scale = scaleRef.current;
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (animating || !physicsRef.current) return;
    const pos = canvasToWorld(e.clientX, e.clientY);

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    aimingRef.current = true;
    dragStartRef.current = pos;
    dragCurrentRef.current = pos;
    setRenderTick(t => t + 1);
  }, [animating, canvasToWorld]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!aimingRef.current) return;
    dragCurrentRef.current = canvasToWorld(e.clientX, e.clientY);
  }, [canvasToWorld]);

  const handlePointerUp = useCallback(() => {
    if (!aimingRef.current || !dragStartRef.current || !dragCurrentRef.current || !physicsRef.current) {
      aimingRef.current = false;
      setRenderTick(t => t + 1);
      return;
    }

    if (!isMyTurnRef.current) {
      aimingRef.current = false;
      dragStartRef.current = null;
      dragCurrentRef.current = null;
      setRenderTick(t => t + 1);
      return;
    }

    const ball = physicsRef.current;
    const dx = ball.x - dragCurrentRef.current.x;
    const dy = ball.y - dragCurrentRef.current.y;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_POWER);

    if (power < 5) {
      aimingRef.current = false;
      dragStartRef.current = null;
      dragCurrentRef.current = null;
      setRenderTick(t => t + 1);
      return;
    }

    const angle = Math.atan2(dx, -dy);
    const shot: Shot = { angle, power };

    onShotTaken(shot);

    physicsRef.current = shootBall(physicsRef.current, angle, power);
    bounceCountRef.current = 0;
    holeCompletedRef.current = false;
    setAnimating(true);
    aimingRef.current = false;
    dragStartRef.current = null;
    dragCurrentRef.current = null;
  }, [onShotTaken]);

  // Physics loop — only runs while ball is moving
  useEffect(() => {
    if (!animating) return;

    const loop = () => {
      if (!physicsRef.current) return;
      timeRef.current += 1 / 60;

      const prev = physicsRef.current;
      let state = stepPhysics(prev, level, timeRef.current);

      if (state.vx !== prev.vx || state.vy !== prev.vy) {
        if (prev.moving && state.moving) {
          bounceCountRef.current++;
          onBounceRef.current?.();
        }
      }

      if (checkWaterHazard({ x: state.x, y: state.y }, level)) {
        state = createPhysicsState(level);
        onSplashRef.current?.();
      }

      const portalExit = checkPortal({ x: state.x, y: state.y }, level);
      if (portalExit) {
        state = { ...state, x: portalExit.x, y: portalExit.y };
      }

      physicsRef.current = state;

      if (!state.moving) {
        setAnimating(false);
        if (!holeCompletedRef.current) {
          if (state.sunk) {
            holeCompletedRef.current = true;
            onSinkRef.current?.();
            onHoleCompleteRef.current(strokeRef.current);
          } else if (strokeRef.current >= MAX_STROKES) {
            holeCompletedRef.current = true;
            onHoleCompleteRef.current(PENALTY_SCORE);
          }
        }
        return;
      }

      physicsFrameRef.current = requestAnimationFrame(loop);
    };

    physicsFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(physicsFrameRef.current);
  }, [animating, level]);

  // Render loop — only runs when animating or aiming
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const shouldRender = animating || aimingRef.current;
    if (!shouldRender) {
      renderOneFrame(ctx, canvas, level, scaleRef.current, dprRef.current, playerNumber, player1Color, player2Color, physicsRef.current, aimingRef.current, dragCurrentRef.current, isMyTurnRef.current, timeRef.current);
      return;
    }

    const render = () => {
      renderOneFrame(ctx, canvas, level, scaleRef.current, dprRef.current, playerNumber, player1Color, player2Color, physicsRef.current, aimingRef.current, dragCurrentRef.current, isMyTurnRef.current, timeRef.current);
      renderFrameRef.current = requestAnimationFrame(render);
    };

    renderFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(renderFrameRef.current);
  }, [animating, level, player1Color, player2Color, playerNumber]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventScroll = (e: TouchEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener('touchstart', preventScroll, { passive: false });
    canvas.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventScroll);
      canvas.removeEventListener('touchmove', preventScroll);
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

function renderOneFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  level: Level,
  scale: number,
  dpr: number,
  playerNumber: 1 | 2,
  player1Color: string,
  player2Color: string,
  physics: PhysicsState | null,
  aiming: boolean,
  dragCurrent: { x: number; y: number } | null,
  isMyTurn: boolean,
  time: number,
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale * dpr, scale * dpr);

  // Background
  ctx.fillStyle = '#264573';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Sand zones
  if (level.sand) {
    ctx.fillStyle = '#C4A882';
    for (const zone of level.sand) {
      ctx.beginPath();
      ctx.moveTo(zone.points[0].x, zone.points[0].y);
      for (let i = 1; i < zone.points.length; i++) {
        ctx.lineTo(zone.points[i].x, zone.points[i].y);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  // Water zones
  if (level.water) {
    ctx.fillStyle = '#1a5276';
    for (const zone of level.water) {
      ctx.beginPath();
      ctx.moveTo(zone.points[0].x, zone.points[0].y);
      for (let i = 1; i < zone.points.length; i++) {
        ctx.lineTo(zone.points[i].x, zone.points[i].y);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  // Walls
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  for (const wall of level.walls) {
    ctx.beginPath();
    ctx.moveTo(wall.x1, wall.y1);
    ctx.lineTo(wall.x2, wall.y2);
    ctx.stroke();
  }

  // Moving walls
  if (level.movingWalls) {
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    for (const mw of level.movingWalls) {
      const pos = getMovingWallPosition(mw, time);
      ctx.beginPath();
      ctx.moveTo(pos.x1, pos.y1);
      ctx.lineTo(pos.x2, pos.y2);
      ctx.stroke();
    }
  }

  // Bumpers
  if (level.bumpers) {
    ctx.fillStyle = '#FF6B6B';
    for (const bumper of level.bumpers) {
      ctx.beginPath();
      ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Portals
  if (level.portals) {
    for (const portal of level.portals) {
      ctx.strokeStyle = '#A855F7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(portal.in.x, portal.in.y, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(portal.out.x, portal.out.y, 15, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Hole
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.arc(level.hole.x, level.hole.y, level.hole.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Ball
  if (physics && !physics.sunk) {
    const ballColor = playerNumber === 1 ? player1Color : player2Color;
    ctx.fillStyle = ballColor;
    ctx.beginPath();
    ctx.arc(physics.x, physics.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Aiming line
  if (aiming && dragCurrent && physics) {
    const ball = physics;
    const dx = ball.x - dragCurrent.x;
    const dy = ball.y - dragCurrent.y;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_POWER);
    const angle = Math.atan2(dx, -dy);

    const lineLen = power * 0.8;
    const endX = ball.x + Math.sin(angle) * lineLen;
    const endY = ball.y - Math.cos(angle) * lineLen;

    const lineColor = !isMyTurn ? '#888888' : power >= MAX_POWER * 0.95 ? '#FF4444' : '#FFFFFF';
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!isMyTurn) {
      ctx.fillStyle = '#888888';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Not your turn', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);
    }
  }
}
