'use client';

import type { Point } from '@/lib/types';

interface JengaDragPathProps {
  path: Point[];
  playerTrace: Point[];
  currentDeviation: number;
  isActive: boolean;
  timeRemaining: number;
  grade?: 'A' | 'B' | 'C' | 'F' | null;
  blockPosition: { x: number; y: number };
}

function deviationColor(deviation: number): string {
  if (deviation < 0.1) return '#22c55e'; // green
  if (deviation <= 0.3) return '#eab308'; // yellow
  return '#ef4444'; // red
}

function gradeColor(grade: 'A' | 'B' | 'C' | 'F'): string {
  switch (grade) {
    case 'A': return '#22c55e';
    case 'B': return '#eab308';
    case 'C': return '#f97316';
    case 'F': return '#ef4444';
  }
}

export function JengaDragPath({
  path,
  playerTrace,
  currentDeviation,
  isActive,
  timeRemaining,
  grade,
  blockPosition,
}: JengaDragPathProps) {
  if (path.length < 2) return null;

  const pathPoints = path.map(p => `${p.x},${p.y}`).join(' ');
  const tracePoints = playerTrace.length >= 2
    ? playerTrace.map(p => `${p.x},${p.y}`).join(' ')
    : null;

  // Compute SVG viewBox to fit path + some padding
  const allPoints = [...path, ...playerTrace];
  const minX = Math.min(...allPoints.map(p => p.x)) - 20;
  const minY = Math.min(...allPoints.map(p => p.y)) - 20;
  const maxX = Math.max(...allPoints.map(p => p.x)) + 20;
  const maxY = Math.max(...allPoints.map(p => p.y)) + 20;
  const width = maxX - minX;
  const height = maxY - minY;

  const showFlash = isActive && timeRemaining <= 3;
  const pathColor = isActive ? deviationColor(currentDeviation) : '#94a3b8';

  // Current drag point (last in trace)
  const currentPoint = playerTrace.length > 0 ? playerTrace[playerTrace.length - 1] : null;

  return (
    <div
      className="absolute pointer-events-none z-30"
      style={{
        left: `${blockPosition.x + minX}px`,
        top: `${blockPosition.y + minY}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`${minX} ${minY} ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Guide path */}
        <polyline
          points={pathPoints}
          fill="none"
          stroke={pathColor}
          strokeWidth="2.5"
          strokeDasharray={isActive ? 'none' : '4 4'}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={showFlash ? undefined : 0.8}
          className={showFlash ? 'animate-pulse' : undefined}
        />

        {/* Start indicator */}
        <circle
          cx={path[0].x}
          cy={path[0].y}
          r={5}
          fill="none"
          stroke={pathColor}
          strokeWidth="2"
          opacity={0.9}
        />

        {/* End indicator (target) */}
        <circle
          cx={path[path.length - 1].x}
          cy={path[path.length - 1].y}
          r={4}
          fill={pathColor}
          opacity={0.6}
        />

        {/* Player trace */}
        {tracePoints && (
          <polyline
            points={tracePoints}
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />
        )}
      </svg>

      {/* Real-time deviation indicator near drag point */}
      {isActive && currentPoint && (
        <div
          className="absolute text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md whitespace-nowrap"
          style={{
            left: `${currentPoint.x - minX + 12}px`,
            top: `${currentPoint.y - minY - 8}px`,
            backgroundColor: deviationColor(currentDeviation),
            color: 'white',
          }}
        >
          {(currentDeviation * 100).toFixed(0)}%
        </div>
      )}

      {/* Countdown at <= 3s remaining */}
      {isActive && timeRemaining <= 3 && timeRemaining > 0 && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-black text-red-500 animate-pulse"
        >
          {Math.ceil(timeRemaining)}
        </div>
      )}

      {/* Grade display after completion — uses CSS animation for fade */}
      {grade && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-black animate-[grade-fade_1.5s_ease-out_forwards]"
          style={{
            color: gradeColor(grade),
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {grade}
        </div>
      )}
    </div>
  );
}
