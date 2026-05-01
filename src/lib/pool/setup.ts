import { BallState, TABLE_WIDTH, TABLE_HEIGHT, BALL_RADIUS, CUSHION_WIDTH } from './types';

export function createInitialBalls(): BallState[] {
  const balls: BallState[] = [];

  // Cue ball - left quarter of table
  balls.push({
    id: 0,
    x: CUSHION_WIDTH + (TABLE_WIDTH - 2 * CUSHION_WIDTH) * 0.25,
    y: TABLE_HEIGHT / 2,
    vx: 0,
    vy: 0,
    pocketed: false,
  });

  // Rack position - right quarter of table
  const rackX = CUSHION_WIDTH + (TABLE_WIDTH - 2 * CUSHION_WIDTH) * 0.75;
  const rackY = TABLE_HEIGHT / 2;
  const spacing = BALL_RADIUS * 2.05;

  // Standard 8-ball rack: 5 rows, 8-ball in center of 3rd row
  const rackOrder = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];

  let ballIndex = 0;
  for (let row = 0; row < 5; row++) {
    const ballsInRow = row + 1;
    const rowX = rackX + row * spacing * Math.cos(Math.PI / 6);
    const startY = rackY - (ballsInRow - 1) * spacing / 2;

    for (let col = 0; col < ballsInRow; col++) {
      const id = rackOrder[ballIndex];
      balls.push({
        id,
        x: rowX,
        y: startY + col * spacing,
        vx: 0,
        vy: 0,
        pocketed: false,
      });
      ballIndex++;
    }
  }

  return balls;
}
