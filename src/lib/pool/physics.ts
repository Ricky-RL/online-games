import {
  BallState,
  Point,
  Shot,
  BALL_RADIUS,
  BASE_SPEED,
  MAX_POWER,
  FRICTION_RATE,
  MIN_SPEED,
  COLLISION_DAMPING,
  TABLE_WIDTH,
  TABLE_HEIGHT,
  CUSHION_WIDTH,
  POCKETS,
  getPocketRadius,
} from './types';

export function shootCueBall(balls: BallState[], shot: Shot): BallState[] {
  const clampedPower = Math.min(shot.power, MAX_POWER);
  const speed = (clampedPower / MAX_POWER) * BASE_SPEED;
  return balls.map((ball) => {
    if (ball.id !== 0) return ball;
    return {
      ...ball,
      x: shot.cueBallX,
      y: shot.cueBallY,
      vx: Math.sin(shot.angle) * speed,
      vy: -Math.cos(shot.angle) * speed,
    };
  });
}

export function isAnyBallMoving(balls: BallState[]): boolean {
  return balls.some(
    (b) => !b.pocketed && (Math.abs(b.vx) > MIN_SPEED / 2 || Math.abs(b.vy) > MIN_SPEED / 2)
  );
}

export function stepPhysics(balls: BallState[]): { balls: BallState[]; pocketed: number[] } {
  const updated = balls.map((b) => ({ ...b }));
  const newlyPocketed: number[] = [];

  // Move balls
  for (const ball of updated) {
    if (ball.pocketed) continue;
    ball.x += ball.vx;
    ball.y += ball.vy;
  }

  // Ball-to-ball collisions
  for (let i = 0; i < updated.length; i++) {
    if (updated[i].pocketed) continue;
    for (let j = i + 1; j < updated.length; j++) {
      if (updated[j].pocketed) continue;
      resolveBallCollision(updated[i], updated[j]);
    }
  }

  // Wall collisions (cushions)
  const minX = CUSHION_WIDTH + BALL_RADIUS;
  const maxX = TABLE_WIDTH - CUSHION_WIDTH - BALL_RADIUS;
  const minY = CUSHION_WIDTH + BALL_RADIUS;
  const maxY = TABLE_HEIGHT - CUSHION_WIDTH - BALL_RADIUS;

  for (const ball of updated) {
    if (ball.pocketed) continue;

    if (ball.x < minX) {
      ball.x = minX;
      ball.vx = -ball.vx * COLLISION_DAMPING;
    } else if (ball.x > maxX) {
      ball.x = maxX;
      ball.vx = -ball.vx * COLLISION_DAMPING;
    }

    if (ball.y < minY) {
      ball.y = minY;
      ball.vy = -ball.vy * COLLISION_DAMPING;
    } else if (ball.y > maxY) {
      ball.y = maxY;
      ball.vy = -ball.vy * COLLISION_DAMPING;
    }
  }

  // Pocket detection
  for (const ball of updated) {
    if (ball.pocketed) continue;
    for (const [pocketIndex, pocket] of POCKETS.entries()) {
      const dist = Math.sqrt((ball.x - pocket.x) ** 2 + (ball.y - pocket.y) ** 2);
      if (dist < getPocketRadius(pocketIndex)) {
        ball.pocketed = true;
        ball.vx = 0;
        ball.vy = 0;
        newlyPocketed.push(ball.id);
        break;
      }
    }
  }

  // Apply friction
  for (const ball of updated) {
    if (ball.pocketed) continue;
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (speed < MIN_SPEED) {
      ball.vx = 0;
      ball.vy = 0;
    } else {
      ball.vx *= (1 - FRICTION_RATE);
      ball.vy *= (1 - FRICTION_RATE);
    }
  }

  return { balls: updated, pocketed: newlyPocketed };
}

function resolveBallCollision(a: BallState, b: BallState): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = BALL_RADIUS * 2;

  if (dist >= minDist || dist === 0) return;

  // Normalize collision vector
  const nx = dx / dist;
  const ny = dy / dist;

  // Relative velocity
  const dvx = a.vx - b.vx;
  const dvy = a.vy - b.vy;

  // Relative velocity along collision normal
  const dvn = dvx * nx + dvy * ny;

  // Don't resolve if balls moving apart
  if (dvn <= 0) return;

  // Equal mass elastic collision
  a.vx -= dvn * nx * COLLISION_DAMPING;
  a.vy -= dvn * ny * COLLISION_DAMPING;
  b.vx += dvn * nx * COLLISION_DAMPING;
  b.vy += dvn * ny * COLLISION_DAMPING;

  // Separate overlapping balls
  const overlap = minDist - dist;
  a.x -= (overlap / 2) * nx;
  a.y -= (overlap / 2) * ny;
  b.x += (overlap / 2) * nx;
  b.y += (overlap / 2) * ny;
}

export function simulateShot(balls: BallState[], shot: Shot): { finalBalls: BallState[]; allPocketed: number[] } {
  let current = shootCueBall(balls, shot);
  const allPocketed: number[] = [];
  let maxSteps = 3000; // safety limit

  while (isAnyBallMoving(current) && maxSteps > 0) {
    const { balls: next, pocketed } = stepPhysics(current);
    current = next;
    allPocketed.push(...pocketed);
    maxSteps--;
  }

  return { finalBalls: current, allPocketed };
}

export function getDefaultCueBallPosition(): Point {
  return {
    x: TABLE_WIDTH / 2,
    y: CUSHION_WIDTH + (TABLE_HEIGHT - 2 * CUSHION_WIDTH) * 0.75,
  };
}

export function isValidCueBallPlacement(x: number, y: number, balls: BallState[]): boolean {
  const minX = CUSHION_WIDTH + BALL_RADIUS;
  const maxX = TABLE_WIDTH - CUSHION_WIDTH - BALL_RADIUS;
  const minY = CUSHION_WIDTH + BALL_RADIUS;
  const maxY = TABLE_HEIGHT - CUSHION_WIDTH - BALL_RADIUS;

  if (x < minX || x > maxX || y < minY || y > maxY) return false;

  // Check no overlap with other balls
  for (const ball of balls) {
    if (ball.pocketed || ball.id === 0) continue;
    const dist = Math.sqrt((x - ball.x) ** 2 + (y - ball.y) ** 2);
    if (dist < BALL_RADIUS * 2.2) return false;
  }

  return true;
}
