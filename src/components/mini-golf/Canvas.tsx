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
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const bounceCountRef = useRef<number>(0);
  const [aiming, setAiming] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [animating, setAnimating] = useState(false);
  const strokeRef = useRef(currentStroke);
  const { player1Color, player2Color } = useColors();

  const level = LEVELS[levelId];

  useEffect(() => {
    strokeRef.current = currentStroke;
  }, [currentStroke]);

  useEffect(() => {
    physicsRef.current = createPhysicsState(level);
    bounceCountRef.current = 0;
  }, [level]);

  const getScale = useCallback(() => {
    const container = containerRef.current;
    if (!container) return 1;
    const { width, height } = container.getBoundingClientRect();
    return Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT);
  }, []);

  const canvasToWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scale = getScale();
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  }, [getScale]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isMyTurn || animating || !physicsRef.current) return;
    const pos = canvasToWorld(e.clientX, e.clientY);
    const ball = physicsRef.current;
    const dist = Math.sqrt((pos.x - ball.x) ** 2 + (pos.y - ball.y) ** 2);
    if (dist > BALL_RADIUS * 4) return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setAiming(true);
    setDragStart(pos);
    setDragCurrent(pos);
  }, [isMyTurn, animating, canvasToWorld]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!aiming) return;
    setDragCurrent(canvasToWorld(e.clientX, e.clientY));
  }, [aiming, canvasToWorld]);

  const handlePointerUp = useCallback(() => {
    if (!aiming || !dragStart || !dragCurrent || !physicsRef.current) {
      setAiming(false);
      return;
    }

    const dx = dragStart.x - dragCurrent.x;
    const dy = dragStart.y - dragCurrent.y;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_POWER);

    if (power < 5) {
      setAiming(false);
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    const angle = Math.atan2(dx, -dy);
    const shot: Shot = { angle, power };

    onShotTaken(shot);

    physicsRef.current = shootBall(physicsRef.current, angle, power);
    bounceCountRef.current = 0;
    setAnimating(true);
    setAiming(false);
    setDragStart(null);
    setDragCurrent(null);
  }, [aiming, dragStart, dragCurrent, onShotTaken]);

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
          onBounce?.();
        }
      }

      if (checkWaterHazard({ x: state.x, y: state.y }, level)) {
        state = createPhysicsState(level);
        onSplash?.();
      }

      const portalExit = checkPortal({ x: state.x, y: state.y }, level);
      if (portalExit) {
        state = { ...state, x: portalExit.x, y: portalExit.y };
      }

      physicsRef.current = state;

      if (!state.moving) {
        setAnimating(false);
        if (state.sunk) {
          onSink?.();
          onHoleComplete(strokeRef.current);
        } else if (strokeRef.current >= MAX_STROKES) {
          onHoleComplete(PENALTY_SCORE);
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [animating, level, onHoleComplete, onBounce, onSink, onSplash]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const scale = getScale();
      canvas.width = CANVAS_WIDTH * scale * window.devicePixelRatio;
      canvas.height = CANVAS_HEIGHT * scale * window.devicePixelRatio;
      canvas.style.width = `${CANVAS_WIDTH * scale}px`;
      canvas.style.height = `${CANVAS_HEIGHT * scale}px`;
      ctx.scale(scale * window.devicePixelRatio, scale * window.devicePixelRatio);

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
          const pos = getMovingWallPosition(mw, timeRef.current);
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
      if (physicsRef.current && !physicsRef.current.sunk) {
        const ballColor = playerNumber === 1 ? player1Color : player2Color;
        ctx.fillStyle = ballColor;
        ctx.beginPath();
        ctx.arc(physicsRef.current.x, physicsRef.current.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Aiming line
      if (aiming && dragStart && dragCurrent && physicsRef.current) {
        const dx = dragStart.x - dragCurrent.x;
        const dy = dragStart.y - dragCurrent.y;
        const power = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_POWER);
        const angle = Math.atan2(dx, -dy);

        const lineLen = power * 0.8;
        const endX = physicsRef.current.x + Math.sin(angle) * lineLen;
        const endY = physicsRef.current.y - Math.cos(angle) * lineLen;

        ctx.strokeStyle = power >= MAX_POWER * 0.95 ? '#FF4444' : '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(physicsRef.current.x, physicsRef.current.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [level, aiming, dragStart, dragCurrent, getScale, player1Color, player2Color, playerNumber]);

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
        className="rounded-lg shadow-lg"
      />
    </div>
  );
}
