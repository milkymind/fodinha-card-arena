// Example utility functions for card game logic
export function formatCard(card: string) {
  if (!card || card.length < 2) return { value: '', suit: '' };
  return { 
    value: card.substring(0, card.length - 1),
    suit: card.charAt(card.length - 1)
  };
}

export function isRedCard(card: string): boolean {
  if (!card || card.length < 2) return false;
  const suit = card.charAt(card.length - 1);
  return suit === '♥' || suit === '♦';
}

export function getCardStrength(card: string, manilha: string): number {
  if (!card || !manilha) return 0;
  
  const cardValue = card.substring(0, card.length - 1);
  const cardSuit = card.charAt(card.length - 1);
  const manilhaSuit = manilha.charAt(manilha.length - 1);
  
  // Manilha cards are strongest
  if (cardSuit === manilhaSuit) {
    switch (cardValue) {
      case 'J': return 14; // Highest manilha
      case 'Q': return 13;
      case 'K': return 12;
      case 'A': return 11; // Lowest manilha
      default: return 0;
    }
  }
  
  // Regular card strength
  switch (cardValue) {
    case 'A': return 10;
    case 'K': return 9;
    case 'Q': return 8;
    case 'J': return 7;
    case '10': return 6;
    case '9': return 5;
    case '8': return 4;
    case '7': return 3;
    case '6': return 2;
    case '5': return 1;
    case '4': return 0;
    default: return 0;
  }
}

// Tests
describe('Card Game Utilities', () => {
  describe('formatCard', () => {
    it('formats a valid card correctly', () => {
      expect(formatCard('A♠')).toEqual({ value: 'A', suit: '♠' });
      expect(formatCard('10♥')).toEqual({ value: '10', suit: '♥' });
      expect(formatCard('K♦')).toEqual({ value: 'K', suit: '♦' });
    });

    it('handles invalid cards', () => {
      expect(formatCard('')).toEqual({ value: '', suit: '' });
      expect(formatCard('X')).toEqual({ value: '', suit: '' });
    });
  });

  describe('isRedCard', () => {
    it('identifies red cards correctly', () => {
      expect(isRedCard('A♥')).toBe(true);
      expect(isRedCard('K♦')).toBe(true);
    });

    it('identifies black cards correctly', () => {
      expect(isRedCard('A♠')).toBe(false);
      expect(isRedCard('K♣')).toBe(false);
    });

    it('handles invalid cards', () => {
      expect(isRedCard('')).toBe(false);
      expect(isRedCard('X')).toBe(false);
    });
  });

  describe('getCardStrength', () => {
    it('calculates manilha card strength correctly', () => {
      // If 4♠ is the manilha, then ♠ cards are manilhas
      expect(getCardStrength('J♠', '4♠')).toBe(14); // Strongest manilha
      expect(getCardStrength('Q♠', '4♠')).toBe(13);
      expect(getCardStrength('K♠', '4♠')).toBe(12);
      expect(getCardStrength('A♠', '4♠')).toBe(11); // Weakest manilha
    });

    it('calculates regular card strength correctly', () => {
      expect(getCardStrength('A♥', '4♠')).toBe(10); // Not manilha
      expect(getCardStrength('K♥', '4♠')).toBe(9);
      expect(getCardStrength('4♥', '4♠')).toBe(0); // Weakest regular card
    });

    it('handles invalid inputs', () => {
      expect(getCardStrength('', '4♠')).toBe(0);
      expect(getCardStrength('A♥', '')).toBe(0);
    });
  });
}); 