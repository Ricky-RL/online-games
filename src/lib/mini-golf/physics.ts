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

export function stepPhysics(state: PhysicsState, level: Level): PhysicsState {
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
      const reflected = reflectVelocity(vx, vy, wall);
      vx = reflected.vx;
      vy = reflected.vy;
      nextX = x + vx;
      nextY = y + vy;
      break;
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

export function checkPortal(pos: Point, level: Level): Point | null {
  if (!level.portals) return null;
  for (const portal of level.portals) {
    const dist = Math.sqrt((pos.x - portal.in.x) ** 2 + (pos.y - portal.in.y) ** 2);
    if (dist < BALL_RADIUS + 10) {
      return portal.out;
    }
  }
  return null;
}
