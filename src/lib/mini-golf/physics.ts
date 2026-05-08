import { PhysicsState, Level, Point, BALL_RADIUS, BASE_SPEED, MAX_POWER, FRICTION_RATE, SINK_SPEED_THRESHOLD, MIN_SPEED, SAND_FRICTION_MULTIPLIER, BUMPER_BOOST } from './types';
import { circleLineCollision, reflectVelocity, pointInPolygon } from './collision';

export function createPhysicsState(level: Level): PhysicsState {
  return {
    x: level.start.x,
    y: level.start.y,
    vx: 0,
    vy: 0,
    moving: false,
    sunk: false,
  };
}

export function shootBall(state: PhysicsState, angle: number, power: number): PhysicsState {
  if (state.moving) return state;
  const clampedPower = Math.min(power, MAX_POWER);
  const speed = (clampedPower / MAX_POWER) * BASE_SPEED;
  return {
    ...state,
    vx: Math.sin(angle) * speed,
    vy: -Math.cos(angle) * speed,
    moving: true,
  };
}

export function stepPhysics(state: PhysicsState, level: Level, time: number = 0): PhysicsState {
  if (!state.moving || state.sunk) return state;

  let { x, y, vx, vy } = state;
  const speed = Math.sqrt(vx * vx + vy * vy);

  if (speed < MIN_SPEED) {
    return { x, y, vx: 0, vy: 0, moving: false, sunk: false };
  }

  let nextX = x + vx;
  let nextY = y + vy;

  for (const wall of level.walls) {
    if (circleLineCollision({ x: nextX, y: nextY }, BALL_RADIUS, wall)) {
      const resolved = resolveWallCollision({ x: nextX, y: nextY }, BALL_RADIUS, vx, vy, wall);
      vx = resolved.vx;
      vy = resolved.vy;
      nextX = resolved.x;
      nextY = resolved.y;
      break;
    }
  }

  if (level.movingWalls) {
    for (const mw of level.movingWalls) {
      const wallPos = getMovingWallPosition(mw, time);
      if (circleLineCollision({ x: nextX, y: nextY }, BALL_RADIUS, wallPos)) {
        const resolved = resolveWallCollision({ x: nextX, y: nextY }, BALL_RADIUS, vx, vy, wallPos);
        vx = resolved.vx;
        vy = resolved.vy;
        nextX = resolved.x;
        nextY = resolved.y;
        break;
      }
    }
  }

  if (level.bumpers) {
    for (const bumper of level.bumpers) {
      const dist = Math.sqrt((nextX - bumper.x) ** 2 + (nextY - bumper.y) ** 2);
      if (dist <= BALL_RADIUS + bumper.radius) {
        const nx = (nextX - bumper.x) / dist;
        const ny = (nextY - bumper.y) / dist;
        const dot = vx * nx + vy * ny;
        vx = (vx - 2 * dot * nx) * BUMPER_BOOST;
        vy = (vy - 2 * dot * ny) * BUMPER_BOOST;
        nextX = x + vx;
        nextY = y + vy;
        break;
      }
    }
  }

  let frictionMultiplier = 1;
  if (level.sand) {
    for (const zone of level.sand) {
      if (pointInPolygon({ x: nextX, y: nextY }, zone.points)) {
        frictionMultiplier = SAND_FRICTION_MULTIPLIER;
        break;
      }
    }
  }

  const friction = 1 - FRICTION_RATE * frictionMultiplier;
  vx *= friction;
  vy *= friction;

  const distToHole = Math.sqrt((nextX - level.hole.x) ** 2 + (nextY - level.hole.y) ** 2);
  const currentSpeed = Math.sqrt(vx * vx + vy * vy);
  if (distToHole < level.hole.radius && currentSpeed < SINK_SPEED_THRESHOLD) {
    return { x: level.hole.x, y: level.hole.y, vx: 0, vy: 0, moving: false, sunk: true };
  }

  return { x: nextX, y: nextY, vx, vy, moving: true, sunk: false };
}

export function getMovingWallPosition(
  wall: { start: { x1: number; y1: number; x2: number; y2: number }; end: { x1: number; y1: number; x2: number; y2: number }; speed: number },
  time: number
): { x1: number; y1: number; x2: number; y2: number } {
  const t = (Math.sin(time * wall.speed) + 1) / 2;
  return {
    x1: wall.start.x1 + (wall.end.x1 - wall.start.x1) * t,
    y1: wall.start.y1 + (wall.end.y1 - wall.start.y1) * t,
    x2: wall.start.x2 + (wall.end.x2 - wall.start.x2) * t,
    y2: wall.start.y2 + (wall.end.y2 - wall.start.y2) * t,
  };
}

export function checkWaterHazard(pos: Point, level: Level): boolean {
  if (!level.water) return false;
  for (const zone of level.water) {
    if (pointInPolygon(pos, zone.points)) return true;
  }
  return false;
}

export function checkPortal(pos: Point, level: Level, prevPos: Point = pos): Point | null {
  if (!level.portals) return null;
  for (const portal of level.portals) {
    const hitRadius = BALL_RADIUS + 10;
    const distSq = pointToSegmentDistanceSq(portal.in, prevPos, pos);
    if (distSq < hitRadius * hitRadius) {
      return portal.out;
    }
  }
  return null;
}

function resolveWallCollision(
  center: Point,
  radius: number,
  vx: number,
  vy: number,
  wall: { x1: number; y1: number; x2: number; y2: number }
): { x: number; y: number; vx: number; vy: number } {
  const normal = getCollisionNormal(center, radius, wall, vx, vy);
  if (!normal) return { x: center.x, y: center.y, vx, vy };

  const dot = vx * normal.nx + vy * normal.ny;
  const reflected = dot < 0 ? reflectVelocity(vx, vy, wall) : { vx, vy };
  const separation = normal.penetration + 0.05;

  return {
    x: center.x + normal.nx * separation,
    y: center.y + normal.ny * separation,
    vx: reflected.vx,
    vy: reflected.vy,
  };
}

function getCollisionNormal(
  center: Point,
  radius: number,
  wall: { x1: number; y1: number; x2: number; y2: number },
  vx: number,
  vy: number
): { nx: number; ny: number; penetration: number } | null {
  const wx = wall.x2 - wall.x1;
  const wy = wall.y2 - wall.y1;
  const lenSq = wx * wx + wy * wy;
  if (lenSq < 1e-8) return null;

  let t = ((center.x - wall.x1) * wx + (center.y - wall.y1) * wy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = wall.x1 + t * wx;
  const closestY = wall.y1 + t * wy;
  const dx = center.x - closestX;
  const dy = center.y - closestY;
  const distSq = dx * dx + dy * dy;
  if (distSq > radius * radius) return null;

  if (distSq < 1e-8) {
    const len = Math.sqrt(lenSq);
    let nx = -wy / len;
    let ny = wx / len;
    if (vx * nx + vy * ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    return { nx, ny, penetration: radius };
  }

  const dist = Math.sqrt(distSq);
  return {
    nx: dx / dist,
    ny: dy / dist,
    penetration: radius - dist,
  };
}

function pointToSegmentDistanceSq(point: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;

  if (lenSq < 1e-8) {
    const dx = point.x - a.x;
    const dy = point.y - a.y;
    return dx * dx + dy * dy;
  }

  let t = ((point.x - a.x) * abx + (point.y - a.y) * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = a.x + t * abx;
  const closestY = a.y + t * aby;
  const dx = point.x - closestX;
  const dy = point.y - closestY;
  return dx * dx + dy * dy;
}
