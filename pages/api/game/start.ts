// pages/api/game/start.ts
import { NextRequest, NextResponse } from 'next/server';

const SUITS = ['♣', '♥', '♠', '♦'];
const VALUES = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];

function shuffle<T>(array: T[]): T[] {
  return array.sort(() => Math.random() - 0.5);
}

function createDeck() {
  const deck = SUITS.flatMap((suit) => VALUES.map((value) => ({ value, suit })));
  return shuffle(deck);
}

function determineManilha(card: { value: string }) {
  const idx = VALUES.indexOf(card.value);
  return VALUES[(idx + 1) % VALUES.length];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const numPlayers = Number(searchParams.get('players')) || 4;
  const cardsPerPlayer = Number(searchParams.get('cards')) || 3;

  const deck = createDeck();
  const middleCard = deck.shift();
  const manilha = determineManilha(middleCard!);

  const hands: Record<string, { value: string; suit: string }[]> = {};
  for (let i = 0; i < numPlayers; i++) {
    hands[i + 1] = deck.splice(0, cardsPerPlayer);
  }

  return NextResponse.json({
    middleCard,
    manilha,
    hands,
  });
}
