import { Level } from './types';

export const LEVELS: Level[] = [
  // ============ EASY TIER (ids 0-4) ============

  // Level 0: Straight Shot - A gentle corridor with a slight narrowing
  {
    id: 0,
    name: 'Straight Shot',
    tier: 'easy',
    par: 2,
    start: { x: 200, y: 600 },
    hole: { x: 200, y: 100, radius: 12 },
    walls: [
      // Left wall
      { x1: 120, y1: 50, x2: 120, y2: 650 },
      // Right wall
      { x1: 280, y1: 50, x2: 280, y2: 650 },
      // Top wall
      { x1: 120, y1: 50, x2: 280, y2: 50 },
      // Bottom wall
      { x1: 120, y1: 650, x2: 280, y2: 650 },
    ],
  },

  // Level 1: Gentle Bend - An L-shaped course
  {
    id: 1,
    name: 'Gentle Bend',
    tier: 'easy',
    par: 2,
    start: { x: 120, y: 600 },
    hole: { x: 300, y: 120, radius: 12 },
    walls: [
      // Bottom-left section (vertical corridor going up)
      { x1: 60, y1: 350, x2: 60, y2: 650 },
      { x1: 180, y1: 450, x2: 180, y2: 650 },
      // Bottom wall
      { x1: 60, y1: 650, x2: 180, y2: 650 },
      // Transition corner
      { x1: 60, y1: 350, x2: 60, y2: 80 },
      { x1: 60, y1: 80, x2: 340, y2: 80 },
      // Top-right section (horizontal corridor going right)
      { x1: 340, y1: 80, x2: 340, y2: 170 },
      { x1: 180, y1: 450, x2: 180, y2: 170 },
      { x1: 180, y1: 170, x2: 340, y2: 170 },
    ],
  },

  // Level 2: The Funnel - Wide to narrow
  {
    id: 2,
    name: 'The Funnel',
    tier: 'easy',
    par: 2,
    start: { x: 200, y: 600 },
    hole: { x: 200, y: 100, radius: 12 },
    walls: [
      // Left side (angled inward)
      { x1: 80, y1: 650, x2: 160, y2: 300 },
      { x1: 160, y1: 300, x2: 160, y2: 50 },
      // Right side (angled inward)
      { x1: 320, y1: 650, x2: 240, y2: 300 },
      { x1: 240, y1: 300, x2: 240, y2: 50 },
      // Top wall
      { x1: 160, y1: 50, x2: 240, y2: 50 },
      // Bottom wall
      { x1: 80, y1: 650, x2: 320, y2: 650 },
    ],
  },

  // Level 3: Zigzag - Simple S-curve
  {
    id: 3,
    name: 'Zigzag',
    tier: 'easy',
    par: 3,
    start: { x: 100, y: 620 },
    hole: { x: 300, y: 80, radius: 12 },
    walls: [
      // Outer boundary
      { x1: 50, y1: 50, x2: 350, y2: 50 },
      { x1: 50, y1: 660, x2: 350, y2: 660 },
      { x1: 50, y1: 50, x2: 50, y2: 660 },
      { x1: 350, y1: 50, x2: 350, y2: 660 },
      // Internal zigzag walls
      { x1: 50, y1: 450, x2: 260, y2: 450 },
      { x1: 140, y1: 250, x2: 350, y2: 250 },
    ],
  },

  // Level 4: Wide Open - Big room with one center obstacle
  {
    id: 4,
    name: 'Wide Open',
    tier: 'easy',
    par: 2,
    start: { x: 200, y: 580 },
    hole: { x: 200, y: 120, radius: 12 },
    walls: [
      // Outer boundary
      { x1: 60, y1: 60, x2: 340, y2: 60 },
      { x1: 60, y1: 640, x2: 340, y2: 640 },
      { x1: 60, y1: 60, x2: 60, y2: 640 },
      { x1: 340, y1: 60, x2: 340, y2: 640 },
      // Center obstacle
      { x1: 170, y1: 330, x2: 230, y2: 330 },
      { x1: 170, y1: 370, x2: 230, y2: 370 },
      { x1: 170, y1: 330, x2: 170, y2: 370 },
      { x1: 230, y1: 330, x2: 230, y2: 370 },
    ],
    bumpers: [
      { x: 130, y: 350, radius: 12 },
      { x: 270, y: 350, radius: 12 },
    ],
  },

  // ============ MEDIUM TIER (ids 5-9) ============

  // Level 5: Sandtrap Alley - Straight path with sand on both sides
  {
    id: 5,
    name: 'Sandtrap Alley',
    tier: 'medium',
    par: 3,
    start: { x: 200, y: 600 },
    hole: { x: 200, y: 100, radius: 12 },
    walls: [
      // Outer boundary
      { x1: 60, y1: 50, x2: 340, y2: 50 },
      { x1: 60, y1: 650, x2: 340, y2: 650 },
      { x1: 60, y1: 50, x2: 60, y2: 650 },
      { x1: 340, y1: 50, x2: 340, y2: 650 },
      // Corridor walls (narrow path through sand)
      { x1: 150, y1: 200, x2: 150, y2: 500 },
      { x1: 250, y1: 200, x2: 250, y2: 500 },
    ],
    sand: [
      { points: [{ x: 60, y: 200 }, { x: 150, y: 200 }, { x: 150, y: 500 }, { x: 60, y: 500 }] },
      { points: [{ x: 250, y: 200 }, { x: 340, y: 200 }, { x: 340, y: 500 }, { x: 250, y: 500 }] },
    ],
  },

  // Level 6: Water Crossing - Must avoid a water hazard
  {
    id: 6,
    name: 'Water Crossing',
    tier: 'medium',
    par: 3,
    start: { x: 200, y: 600 },
    hole: { x: 200, y: 100, radius: 12 },
    walls: [
      // Outer boundary
      { x1: 80, y1: 50, x2: 320, y2: 50 },
      { x1: 80, y1: 650, x2: 320, y2: 650 },
      { x1: 80, y1: 50, x2: 80, y2: 650 },
      { x1: 320, y1: 50, x2: 320, y2: 650 },
      // Bridge walls (narrow safe path on left side)
      { x1: 80, y1: 320, x2: 140, y2: 320 },
      { x1: 80, y1: 380, x2: 140, y2: 380 },
    ],
    water: [
      { points: [{ x: 140, y: 310 }, { x: 320, y: 310 }, { x: 320, y: 390 }, { x: 140, y: 390 }] },
    ],
    bumpers: [
      { x: 200, y: 220, radius: 15 },
      { x: 200, y: 480, radius: 15 },
    ],
  },

  // Level 7: Bumper Room - Multiple bumpers to navigate through
  {
    id: 7,
    name: 'Bumper Room',
    tier: 'medium',
    par: 3,
    start: { x: 200, y: 600 },
    hole: { x: 200, y: 100, radius: 12 },
    walls: [
      // Outer boundary
      { x1: 70, y1: 50, x2: 330, y2: 50 },
      { x1: 70, y1: 650, x2: 330, y2: 650 },
      { x1: 70, y1: 50, x2: 70, y2: 650 },
      { x1: 330, y1: 50, x2: 330, y2: 650 },
    ],
    bumpers: [
      { x: 150, y: 200, radius: 18 },
      { x: 250, y: 200, radius: 18 },
      { x: 200, y: 300, radius: 18 },
      { x: 130, y: 400, radius: 18 },
      { x: 270, y: 400, radius: 18 },
      { x: 200, y: 500, radius: 18 },
    ],
  },

  // Level 8: The Dogleg - Sharp turn right then up
  {
    id: 8,
    name: 'The Dogleg',
    tier: 'medium',
    par: 4,
    start: { x: 100, y: 600 },
    hole: { x: 300, y: 100, radius: 12 },
    walls: [
      // Vertical corridor (bottom-left)
      { x1: 60, y1: 380, x2: 60, y2: 650 },
      { x1: 160, y1: 450, x2: 160, y2: 650 },
      { x1: 60, y1: 650, x2: 160, y2: 650 },
      // Corner
      { x1: 60, y1: 380, x2: 160, y2: 380 },
      { x1: 160, y1: 380, x2: 340, y2: 380 },
      { x1: 160, y1: 450, x2: 240, y2: 450 },
      // Vertical corridor (top-right)
      { x1: 240, y1: 60, x2: 240, y2: 450 },
      { x1: 340, y1: 60, x2: 340, y2: 380 },
      { x1: 240, y1: 60, x2: 340, y2: 60 },
    ],
    sand: [
      { points: [{ x: 160, y: 380 }, { x: 240, y: 380 }, { x: 240, y: 450 }, { x: 160, y: 450 }] },
    ],
  },

  // Level 9: Narrow Passage - Tight corridors with sand traps
  {
    id: 9,
    name: 'Narrow Passage',
    tier: 'medium',
    par: 4,
    start: { x: 320, y: 600 },
    hole: { x: 80, y: 100, radius: 12 },
    walls: [
      // Outer boundary
      { x1: 40, y1: 50, x2: 360, y2: 50 },
      { x1: 40, y1: 650, x2: 360, y2: 650 },
      { x1: 40, y1: 50, x2: 40, y2: 650 },
      { x1: 360, y1: 50, x2: 360, y2: 650 },
      // Maze walls creating winding path
      { x1: 40, y1: 480, x2: 280, y2: 480 },
      { x1: 120, y1: 320, x2: 360, y2: 320 },
      { x1: 40, y1: 170, x2: 240, y2: 170 },
    ],
    sand: [
      { points: [{ x: 40, y: 170 }, { x: 120, y: 170 }, { x: 120, y: 320 }, { x: 40, y: 320 }] },
    ],
    bumpers: [
      { x: 300, y: 400, radius: 14 },
      { x: 100, y: 240, radius: 14 },
    ],
  },

  // ============ HARD TIER (ids 10-14) ============

  // Level 10: Portal Jump - Use a portal to reach the hole
  {
    id: 10,
    name: 'Portal Jump',
    tier: 'hard',
    par: 4,
    start: { x: 200, y: 600 },
    hole: { x: 300, y: 100, radius: 12 },
    walls: [
      // Outer boundary
      { x1: 50, y1: 50, x2: 350, y2: 50 },
      { x1: 50, y1: 650, x2: 350, y2: 650 },
      { x1: 50, y1: 50, x2: 50, y2: 650 },
      { x1: 350, y1: 50, x2: 350, y2: 650 },
      // Wall blocking direct path to hole
      { x1: 200, y1: 50, x2: 200, y2: 250 },
      { x1: 200, y1: 250, x2: 350, y2: 250 },
      // Wall creating portal chamber
      { x1: 50, y1: 400, x2: 200, y2: 400 },
    ],
    portals: [
      { in: { x: 100, y: 500 }, out: { x: 300, y: 170 } },
    ],
    bumpers: [
      { x: 150, y: 300, radius: 15 },
      { x: 280, y: 400, radius: 15 },
    ],
  },

  // Level 11: Moving Target - Moving walls block the path
  {
    id: 11,
    name: 'Moving Target',
    tier: 'hard',
    par: 4,
    start: { x: 200, y: 600 },
    hole: { x: 200, y: 100, radius: 12 },
    walls: [
      // Outer boundary
      { x1: 70, y1: 50, x2: 330, y2: 50 },
      { x1: 70, y1: 650, x2: 330, y2: 650 },
      { x1: 70, y1: 50, x2: 70, y2: 650 },
      { x1: 330, y1: 50, x2: 330, y2: 650 },
    ],
    movingWalls: [
      {
        start: { x1: 70, y1: 250, x2: 200, y2: 250 },
        end: { x1: 200, y1: 250, x2: 330, y2: 250 },
        speed: 1.5,
      },
      {
        start: { x1: 200, y1: 450, x2: 330, y2: 450 },
        end: { x1: 70, y1: 450, x2: 200, y2: 450 },
        speed: 1.2,
      },
    ],
    bumpers: [
      { x: 130, y: 350, radius: 14 },
      { x: 270, y: 350, radius: 14 },
    ],
  },

  // Level 12: Island Green - Hole surrounded by water
  {
    id: 12,
    name: 'Island Green',
    tier: 'hard',
    par: 4,
    start: { x: 200, y: 600 },
    hole: { x: 200, y: 200, radius: 12 },
    walls: [
      // Outer boundary
      { x1: 50, y1: 50, x2: 350, y2: 50 },
      { x1: 50, y1: 650, x2: 350, y2: 650 },
      { x1: 50, y1: 50, x2: 50, y2: 650 },
      { x1: 350, y1: 50, x2: 350, y2: 650 },
      // Island walls (small square around hole area with entrance gap at bottom)
      { x1: 150, y1: 150, x2: 250, y2: 150 },
      { x1: 150, y1: 260, x2: 180, y2: 260 },
      { x1: 220, y1: 260, x2: 250, y2: 260 },
      { x1: 150, y1: 150, x2: 150, y2: 260 },
      { x1: 250, y1: 150, x2: 250, y2: 260 },
    ],
    water: [
      // Water moat around island (top)
      { points: [{ x: 100, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 150 }, { x: 100, y: 150 }] },
      // Water moat (bottom)
      { points: [{ x: 100, y: 260 }, { x: 300, y: 260 }, { x: 300, y: 310 }, { x: 100, y: 310 }] },
      // Water moat (left)
      { points: [{ x: 100, y: 150 }, { x: 150, y: 150 }, { x: 150, y: 260 }, { x: 100, y: 260 }] },
      // Water moat (right)
      { points: [{ x: 250, y: 150 }, { x: 300, y: 150 }, { x: 300, y: 260 }, { x: 250, y: 260 }] },
    ],
    bumpers: [
      { x: 120, y: 420, radius: 14 },
      { x: 280, y: 420, radius: 14 },
      { x: 200, y: 500, radius: 14 },
    ],
  },

  // Level 13: Gauntlet - Long winding path with multiple hazards
  {
    id: 13,
    name: 'The Gauntlet',
    tier: 'hard',
    par: 5,
    start: { x: 80, y: 620 },
    hole: { x: 320, y: 80, radius: 12 },
    walls: [
      // Outer boundary
      { x1: 40, y1: 40, x2: 360, y2: 40 },
      { x1: 40, y1: 660, x2: 360, y2: 660 },
      { x1: 40, y1: 40, x2: 40, y2: 660 },
      { x1: 360, y1: 40, x2: 360, y2: 660 },
      // Maze walls (winding snake path)
      { x1: 40, y1: 530, x2: 270, y2: 530 },
      { x1: 130, y1: 400, x2: 360, y2: 400 },
      { x1: 40, y1: 270, x2: 230, y2: 270 },
      { x1: 150, y1: 140, x2: 360, y2: 140 },
    ],
    sand: [
      { points: [{ x: 270, y: 400 }, { x: 360, y: 400 }, { x: 360, y: 530 }, { x: 270, y: 530 }] },
    ],
    water: [
      { points: [{ x: 40, y: 270 }, { x: 130, y: 270 }, { x: 130, y: 400 }, { x: 40, y: 400 }] },
    ],
    bumpers: [
      { x: 300, y: 330, radius: 12 },
      { x: 100, y: 200, radius: 12 },
    ],
    portals: [
      { in: { x: 320, y: 470 }, out: { x: 80, y: 200 } },
    ],
  },

  // Level 14: Chaos Course - Everything at once
  {
    id: 14,
    name: 'Chaos Course',
    tier: 'hard',
    par: 5,
    start: { x: 80, y: 620 },
    hole: { x: 320, y: 80, radius: 12 },
    walls: [
      // Outer boundary
      { x1: 40, y1: 40, x2: 360, y2: 40 },
      { x1: 40, y1: 660, x2: 360, y2: 660 },
      { x1: 40, y1: 40, x2: 40, y2: 660 },
      { x1: 360, y1: 40, x2: 360, y2: 660 },
      // Internal walls creating chambers
      { x1: 150, y1: 500, x2: 150, y2: 660 },
      { x1: 250, y1: 400, x2: 360, y2: 400 },
      { x1: 40, y1: 350, x2: 180, y2: 350 },
      { x1: 200, y1: 200, x2: 200, y2: 350 },
      { x1: 250, y1: 40, x2: 250, y2: 200 },
    ],
    sand: [
      { points: [{ x: 200, y: 400 }, { x: 250, y: 400 }, { x: 250, y: 500 }, { x: 200, y: 500 }] },
    ],
    water: [
      { points: [{ x: 40, y: 200 }, { x: 140, y: 200 }, { x: 140, y: 350 }, { x: 40, y: 350 }] },
    ],
    bumpers: [
      { x: 100, y: 450, radius: 14 },
      { x: 300, y: 300, radius: 14 },
      { x: 200, y: 150, radius: 14 },
      { x: 320, y: 550, radius: 14 },
    ],
    portals: [
      { in: { x: 300, y: 600 }, out: { x: 100, y: 130 } },
    ],
    movingWalls: [
      {
        start: { x1: 250, y1: 200, x2: 360, y2: 200 },
        end: { x1: 250, y1: 130, x2: 360, y2: 130 },
        speed: 1.0,
      },
    ],
  },
];

export const EASY_LEVEL_IDS = LEVELS.filter(l => l.tier === 'easy').map(l => l.id);
export const MEDIUM_LEVEL_IDS = LEVELS.filter(l => l.tier === 'medium').map(l => l.id);
export const HARD_LEVEL_IDS = LEVELS.filter(l => l.tier === 'hard').map(l => l.id);
