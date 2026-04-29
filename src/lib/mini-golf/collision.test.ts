import { describe, it, expect } from 'vitest';
import {
  lineSegmentIntersection,
  reflectVelocity,
  pointInPolygon,
  circleLineCollision,
} from './collision';

describe('lineSegmentIntersection', () => {
  it('detects intersection of crossing segments', () => {
    const result = lineSegmentIntersection(
      { x: 0, y: 0 }, { x: 10, y: 10 },
      { x1: 0, y1: 10, x2: 10, y2: 0 }
    );
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(5);
    expect(result!.y).toBeCloseTo(5);
  });

  it('returns null for parallel segments', () => {
    const result = lineSegmentIntersection(
      { x: 0, y: 0 }, { x: 10, y: 0 },
      { x1: 0, y1: 5, x2: 10, y2: 5 }
    );
    expect(result).toBeNull();
  });

  it('returns null for non-intersecting segments', () => {
    const result = lineSegmentIntersection(
      { x: 0, y: 0 }, { x: 5, y: 0 },
      { x1: 6, y1: -5, x2: 6, y2: 5 }
    );
    expect(result).toBeNull();
  });
});

describe('reflectVelocity', () => {
  it('reflects off a horizontal wall', () => {
    const result = reflectVelocity(3, 4, { x1: 0, y1: 5, x2: 10, y2: 5 });
    expect(result.vx).toBeCloseTo(3);
    expect(result.vy).toBeCloseTo(-4);
  });

  it('reflects off a vertical wall', () => {
    const result = reflectVelocity(4, 3, { x1: 5, y1: 0, x2: 5, y2: 10 });
    expect(result.vx).toBeCloseTo(-4);
    expect(result.vy).toBeCloseTo(3);
  });

  it('reflects off a 45-degree wall', () => {
    const result = reflectVelocity(5, 0, { x1: 0, y1: 0, x2: 10, y2: 10 });
    expect(result.vx).toBeCloseTo(0);
    expect(result.vy).toBeCloseTo(5);
  });
});

describe('circleLineCollision', () => {
  it('detects collision when circle is close to line', () => {
    const result = circleLineCollision(
      { x: 5, y: 2 }, 3,
      { x1: 0, y1: 0, x2: 10, y2: 0 }
    );
    expect(result).toBe(true);
  });

  it('returns false when circle is far from line', () => {
    const result = circleLineCollision(
      { x: 5, y: 10 }, 3,
      { x1: 0, y1: 0, x2: 10, y2: 0 }
    );
    expect(result).toBe(false);
  });
});

describe('pointInPolygon', () => {
  const square = [
    { x: 0, y: 0 }, { x: 10, y: 0 },
    { x: 10, y: 10 }, { x: 0, y: 10 },
  ];

  it('returns true for point inside polygon', () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
  });

  it('returns false for point outside polygon', () => {
    expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
  });
});
