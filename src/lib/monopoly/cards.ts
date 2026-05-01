import { CardDefinition, CardEffect } from './types';

export const COMMUNITY_CHEST_CARDS: CardDefinition[] = [
  { text: 'Advance to GO. Collect $200.', effect: { kind: 'move-to', position: 0, collectGo: true } },
  { text: 'Bank error in your favour. Collect $200.', effect: { kind: 'cash', amount: 200 } },
  { text: "Doctor's fees. Pay $50.", effect: { kind: 'cash', amount: -50 } },
  { text: 'From sale of stock you get $50.', effect: { kind: 'cash', amount: 50 } },
  { text: 'Go to Jail. Go directly to Jail. Do not pass GO. Do not collect $200.', effect: { kind: 'go-to-jail' } },
  { text: 'Grand Opera Night. Collect $50 from opponent.', effect: { kind: 'collect-from-opponent', amount: 50 } },
  { text: 'Holiday fund matures. Receive $100.', effect: { kind: 'cash', amount: 100 } },
  { text: 'Income tax refund. Collect $20.', effect: { kind: 'cash', amount: 20 } },
  { text: 'It is your birthday. Collect $10 from opponent.', effect: { kind: 'collect-from-opponent', amount: 10 } },
  { text: 'Life insurance matures. Collect $100.', effect: { kind: 'cash', amount: 100 } },
  { text: 'Hospital fees. Pay $100.', effect: { kind: 'cash', amount: -100 } },
  { text: 'School fees. Pay $50.', effect: { kind: 'cash', amount: -50 } },
  { text: 'Consultancy fee. Receive $25.', effect: { kind: 'cash', amount: 25 } },
  { text: 'You are assessed for street repairs: $40 per house, $115 per hotel.', effect: { kind: 'repairs', perHouse: 40, perHotel: 115 } },
  { text: 'You have won second prize in a beauty contest. Collect $10.', effect: { kind: 'cash', amount: 10 } },
  { text: 'You inherit $100.', effect: { kind: 'cash', amount: 100 } },
];

export const CHANCE_CARDS: CardDefinition[] = [
  { text: 'Advance to GO. Collect $200.', effect: { kind: 'move-to', position: 0, collectGo: true } },
  { text: 'Advance to Robson Street. If you pass GO, collect $200.', effect: { kind: 'move-to', position: 21, collectGo: true } },
  { text: 'Advance to Coal Harbour. If you pass GO, collect $200.', effect: { kind: 'move-to', position: 19, collectGo: true } },
  { text: 'Advance to the nearest Railroad. Pay the owner twice the normal rent.', effect: { kind: 'advance-to-nearest-railroad' } },
  { text: 'Advance to the nearest Railroad. Pay the owner twice the normal rent.', effect: { kind: 'advance-to-nearest-railroad' } },
  { text: 'Advance to the nearest Utility. If unowned, you may buy it. If owned, pay 10x dice roll.', effect: { kind: 'advance-to-nearest-utility' } },
  { text: 'Bank pays you dividend of $50.', effect: { kind: 'cash', amount: 50 } },
  { text: 'Go back 3 spaces.', effect: { kind: 'move-back', spaces: 3 } },
  { text: 'Go to Jail. Go directly to Jail. Do not pass GO. Do not collect $200.', effect: { kind: 'go-to-jail' } },
  { text: 'Make general repairs on all your property: $25 per house, $100 per hotel.', effect: { kind: 'repairs', perHouse: 25, perHotel: 100 } },
  { text: 'Pay poor tax of $15.', effect: { kind: 'cash', amount: -15 } },
  { text: 'Take a trip to Waterfront Station. If you pass GO, collect $200.', effect: { kind: 'move-to', position: 5, collectGo: true } },
  { text: 'Take a walk along English Bay. Advance to Stanley Park.', effect: { kind: 'move-to', position: 31, collectGo: true } },
  { text: 'You have been elected Chairperson. Collect $50 from opponent.', effect: { kind: 'collect-from-opponent', amount: 50 } },
  { text: 'Your building loan matures. Receive $150.', effect: { kind: 'cash', amount: 150 } },
  { text: 'You have won a crossword competition. Collect $100.', effect: { kind: 'cash', amount: 100 } },
];

export function drawRandomCard(cards: CardDefinition[]): CardDefinition {
  return cards[Math.floor(Math.random() * cards.length)];
}
