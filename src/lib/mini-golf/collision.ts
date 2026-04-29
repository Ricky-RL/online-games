import { Point, LineSegment } from './types';

export function lineSegmentIntersection(
  p1: Point,
  p2: Point,
  wall: LineSegment
): Point | null {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const wx = wall.x2 - wall.x1;
  const wy = wall.y2 - wall.y1;

  const denom = dx * wy - dy * wx;
  if (Math.abs(denom) < 1e-10) return null;

  const t = ((wall.x1 - p1.x) * wy - (wall.y1 - p1.y) * wx) / denom;
  const u = ((wall.x1 - p1.x) * dy - (wall.y1 - p1.y) * dx) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return { x: p1.x + t * dx, y: p1.y + t * dy };
  }
  return null;
}

export function reflectVelocity(
  vx: number,
  vy: number,
  wall: LineSegment
): { vx: number; vy: number } {
  const wx = wall.x2 - wall.x1;
  const wy = wall.y2 - wall.y1;
  const len = Math.sqrt(wx * wx + wy * wy);
  const nx = -wy / len;
  const ny = wx / len;

  const dot = vx * nx + vy * ny;
  return {
    vx: vx - 2 * dot * nx,
    vy: vy - 2 * dot * ny,
  };
}

export function circleLineCollision(
  center: Point,
  radius: number,
  wall: LineSegment
): boolean {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const lenSq = dx * dx + dy * dy;

  let t = ((center.x - wall.x1) * dx + (center.y - wall.y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = wall.x1 + t * dx;
  const closestY = wall.y1 + t * dy;

  const distSq = (center.x - closestX) ** 2 + (center.y - closestY) ** 2;
  return distSq <= radius * radius;
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
