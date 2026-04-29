import { SpaceDefinition, ColorGroup } from './types';

export const BOARD: SpaceDefinition[] = [
  // Position 0: GO
  { index: 0, name: 'GO', type: 'corner', cornerType: 'go', rent: [] },
  // Brown
  { index: 1, name: 'East Hastings', type: 'property', color: 'brown', price: 60, rent: [2, 10, 30, 90, 160, 250], housePrice: 50 },
  { index: 2, name: 'Community Chest', type: 'corner', cornerType: 'free-parking', rent: [] }, // No-op space
  { index: 3, name: 'Chinatown', type: 'property', color: 'brown', price: 60, rent: [4, 20, 60, 180, 320, 450], housePrice: 50 },
  // Tax
  { index: 4, name: 'Income Tax', type: 'tax', taxAmount: 200, rent: [] },
  // Railroad 1
  { index: 5, name: 'Waterfront Station', type: 'railroad', price: 200, rent: [25, 50, 100, 200] },
  // Light Blue
  { index: 6, name: 'Commercial Drive', type: 'property', color: 'light-blue', price: 100, rent: [6, 30, 90, 270, 400, 550], housePrice: 50 },
  { index: 7, name: 'Chance', type: 'corner', cornerType: 'free-parking', rent: [] }, // No-op space
  { index: 8, name: 'Main Street', type: 'property', color: 'light-blue', price: 100, rent: [6, 30, 90, 270, 400, 550], housePrice: 50 },
  { index: 9, name: 'Kingsway', type: 'property', color: 'light-blue', price: 120, rent: [8, 40, 100, 300, 450, 600], housePrice: 50 },
  // Position 10: Jail
  { index: 10, name: 'Jail / Just Visiting', type: 'corner', cornerType: 'jail', rent: [] },
  // Pink
  { index: 11, name: 'Kitsilano', type: 'property', color: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], housePrice: 100 },
  // Utility 1
  { index: 12, name: 'BC Hydro', type: 'utility', price: 150, rent: [4, 10] },
  { index: 13, name: 'Point Grey', type: 'property', color: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], housePrice: 100 },
  { index: 14, name: 'Jericho Beach', type: 'property', color: 'pink', price: 160, rent: [12, 60, 180, 500, 700, 900], housePrice: 100 },
  // Railroad 2
  { index: 15, name: 'Commercial-Broadway', type: 'railroad', price: 200, rent: [25, 50, 100, 200] },
  // Orange
  { index: 16, name: 'Gastown', type: 'property', color: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], housePrice: 100 },
  { index: 17, name: 'Community Chest', type: 'corner', cornerType: 'free-parking', rent: [] }, // No-op
  { index: 18, name: 'Yaletown', type: 'property', color: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], housePrice: 100 },
  { index: 19, name: 'Coal Harbour', type: 'property', color: 'orange', price: 200, rent: [16, 80, 220, 600, 800, 1000], housePrice: 100 },
  // Position 20: Free Parking
  { index: 20, name: 'Free Parking', type: 'corner', cornerType: 'free-parking', rent: [] },
  // Red
  { index: 21, name: 'Robson Street', type: 'property', color: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], housePrice: 150 },
  { index: 22, name: 'Chance', type: 'corner', cornerType: 'free-parking', rent: [] }, // No-op
  { index: 23, name: 'Davie Street', type: 'property', color: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], housePrice: 150 },
  { index: 24, name: 'Denman Street', type: 'property', color: 'red', price: 240, rent: [20, 100, 300, 750, 925, 1100], housePrice: 150 },
  // Railroad 3
  { index: 25, name: 'Metrotown Station', type: 'railroad', price: 200, rent: [25, 50, 100, 200] },
  // Yellow
  { index: 26, name: 'Granville Island', type: 'property', color: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], housePrice: 150 },
  { index: 27, name: 'Olympic Village', type: 'property', color: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], housePrice: 150 },
  // Utility 2
  { index: 28, name: 'Metro Vancouver Water', type: 'utility', price: 150, rent: [4, 10] },
  { index: 29, name: 'Science World', type: 'property', color: 'yellow', price: 280, rent: [24, 120, 360, 850, 1025, 1200], housePrice: 150 },
  // Position 30: Go to Jail
  { index: 30, name: 'Go to Jail', type: 'corner', cornerType: 'go-to-jail', rent: [] },
  // Green
  { index: 31, name: 'Stanley Park', type: 'property', color: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], housePrice: 200 },
  { index: 32, name: 'English Bay', type: 'property', color: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], housePrice: 200 },
  { index: 33, name: 'Community Chest', type: 'corner', cornerType: 'free-parking', rent: [] }, // No-op
  { index: 34, name: 'UBC', type: 'property', color: 'green', price: 320, rent: [28, 150, 450, 1000, 1200, 1400], housePrice: 200 },
  // Railroad 4
  { index: 35, name: 'King George Station', type: 'railroad', price: 200, rent: [25, 50, 100, 200] },
  { index: 36, name: 'Chance', type: 'corner', cornerType: 'free-parking', rent: [] }, // No-op
  // Dark Blue
  { index: 37, name: 'West Vancouver', type: 'property', color: 'dark-blue', price: 350, rent: [35, 175, 500, 1100, 1300, 1500], housePrice: 200 },
  // Tax
  { index: 38, name: 'Luxury Tax', type: 'tax', taxAmount: 100, rent: [] },
  { index: 39, name: 'Shaughnessy', type: 'property', color: 'dark-blue', price: 400, rent: [50, 200, 600, 1400, 1700, 2000], housePrice: 200 },
];

export function getPropertiesInGroup(color: ColorGroup): number[] {
  return BOARD.filter(s => s.color === color).map(s => s.index);
}

export function getRailroadIndices(): number[] {
  return BOARD.filter(s => s.type === 'railroad').map(s => s.index);
}

export function getUtilityIndices(): number[] {
  return BOARD.filter(s => s.type === 'utility').map(s => s.index);
}
