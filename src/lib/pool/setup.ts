import { BallState, TABLE_WIDTH, TABLE_HEIGHT, BALL_RADIUS, CUSHION_WIDTH } from './types';

export function createInitialBalls(): BallState[] {
  const balls: BallState[] = [];

  // Cue ball - bottom quarter of table (portrait orientation)
  balls.push({
    id: 0,
    x: TABLE_WIDTH / 2,
    y: CUSHION_WIDTH + (TABLE_HEIGHT - 2 * CUSHION_WIDTH) * 0.75,
    vx: 0,
    vy: 0,
    pocketed: false,
  });

  // Rack position - top quarter of table
  const rackX = TABLE_WIDTH / 2;
  const rackY = CUSHION_WIDTH + (TABLE_HEIGHT - 2 * CUSHION_WIDTH) * 0.25;
  const spacing = BALL_RADIUS * 2.05;

  // Standard 8-ball rack: 5 rows, 8-ball in center of 3rd row
  // Point of triangle faces the cue ball (bottom), wider rows go up
  const rackOrder = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];

  let ballIndex = 0;
  for (let row = 0; row < 5; row++) {
    const ballsInRow = row + 1;
    const rowY = rackY - row * spacing * Math.cos(Math.PI / 6);
    const startX = rackX - (ballsInRow - 1) * spacing / 2;

    for (let col = 0; col < ballsInRow; col++) {
      const id = rackOrder[ballIndex];
      balls.push({
        id,
        x: startX + col * spacing,
        y: rowY,
        vx: 0,
        vy: 0,
        pocketed: false,
      });
      ballIndex++;
    }
  }

  return balls;
}
