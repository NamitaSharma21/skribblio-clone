import { WordChoice } from '../types.js';

interface WordEntry {
  word: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const DEFAULT_WORD_BANK: WordEntry[] = [
  // Animals
  { word: 'Cat', category: 'Animals', difficulty: 'easy' },
  { word: 'Dog', category: 'Animals', difficulty: 'easy' },
  { word: 'Fish', category: 'Animals', difficulty: 'easy' },
  { word: 'Duck', category: 'Animals', difficulty: 'easy' },
  { word: 'Lion', category: 'Animals', difficulty: 'easy' },
  { word: 'Bear', category: 'Animals', difficulty: 'easy' },
  { word: 'Frog', category: 'Animals', difficulty: 'easy' },
  { word: 'Elephant', category: 'Animals', difficulty: 'medium' },
  { word: 'Giraffe', category: 'Animals', difficulty: 'medium' },
  { word: 'Penguin', category: 'Animals', difficulty: 'medium' },
  { word: 'Dolphin', category: 'Animals', difficulty: 'medium' },
  { word: 'Kangaroo', category: 'Animals', difficulty: 'medium' },
  { word: 'Octopus', category: 'Animals', difficulty: 'medium' },
  { word: 'Chameleon', category: 'Animals', difficulty: 'hard' },
  { word: 'Platypus', category: 'Animals', difficulty: 'hard' },
  { word: 'Jellyfish', category: 'Animals', difficulty: 'medium' },
  { word: 'Flamingo', category: 'Animals', difficulty: 'medium' },
  { word: 'Hedgehog', category: 'Animals', difficulty: 'hard' },

  // Food & Drinks
  { word: 'Pizza', category: 'Food', difficulty: 'easy' },
  { word: 'Burger', category: 'Food', difficulty: 'easy' },
  { word: 'Apple', category: 'Food', difficulty: 'easy' },
  { word: 'Banana', category: 'Food', difficulty: 'easy' },
  { word: 'Cookie', category: 'Food', difficulty: 'easy' },
  { word: 'Ice Cream', category: 'Food', difficulty: 'easy' },
  { word: 'Donut', category: 'Food', difficulty: 'easy' },
  { word: 'Spaghetti', category: 'Food', difficulty: 'medium' },
  { word: 'Sushi', category: 'Food', difficulty: 'medium' },
  { word: 'Pancake', category: 'Food', difficulty: 'medium' },
  { word: 'Sandwich', category: 'Food', difficulty: 'medium' },
  { word: 'Watermelon', category: 'Food', difficulty: 'medium' },
  { word: 'Chocolate', category: 'Food', difficulty: 'medium' },
  { word: 'Avocado', category: 'Food', difficulty: 'medium' },
  { word: 'Croissant', category: 'Food', difficulty: 'hard' },
  { word: 'Pineapple', category: 'Food', difficulty: 'medium' },

  // Objects & Everyday Items
  { word: 'Chair', category: 'Objects', difficulty: 'easy' },
  { word: 'Clock', category: 'Objects', difficulty: 'easy' },
  { word: 'Phone', category: 'Objects', difficulty: 'easy' },
  { word: 'Book', category: 'Objects', difficulty: 'easy' },
  { word: 'Guitar', category: 'Objects', difficulty: 'easy' },
  { word: 'Candle', category: 'Objects', difficulty: 'easy' },
  { word: 'Scissors', category: 'Objects', difficulty: 'easy' },
  { word: 'Umbrella', category: 'Objects', difficulty: 'medium' },
  { word: 'Telescope', category: 'Objects', difficulty: 'medium' },
  { word: 'Microphone', category: 'Objects', difficulty: 'medium' },
  { word: 'Headphones', category: 'Objects', difficulty: 'medium' },
  { word: 'Backpack', category: 'Objects', difficulty: 'medium' },
  { word: 'Flashlight', category: 'Objects', difficulty: 'medium' },
  { word: 'Hourglass', category: 'Objects', difficulty: 'hard' },
  { word: 'Microscope', category: 'Objects', difficulty: 'hard' },
  { word: 'Parachute', category: 'Objects', difficulty: 'hard' },

  // Nature & Places
  { word: 'Sun', category: 'Nature', difficulty: 'easy' },
  { word: 'Moon', category: 'Nature', difficulty: 'easy' },
  { word: 'Tree', category: 'Nature', difficulty: 'easy' },
  { word: 'Cloud', category: 'Nature', difficulty: 'easy' },
  { word: 'Mountain', category: 'Nature', difficulty: 'easy' },
  { word: 'Rainbow', category: 'Nature', difficulty: 'easy' },
  { word: 'Beach', category: 'Nature', difficulty: 'easy' },
  { word: 'Volcano', category: 'Nature', difficulty: 'medium' },
  { word: 'Waterfall', category: 'Nature', difficulty: 'medium' },
  { word: 'Island', category: 'Nature', difficulty: 'medium' },
  { word: 'Campfire', category: 'Nature', difficulty: 'medium' },
  { word: 'Castle', category: 'Places', difficulty: 'medium' },
  { word: 'Pyramid', category: 'Places', difficulty: 'medium' },
  { word: 'Lighthouse', category: 'Places', difficulty: 'medium' },
  { word: 'Hospital', category: 'Places', difficulty: 'medium' },
  { word: 'Space Station', category: 'Places', difficulty: 'hard' },

  // Actions & Sports
  { word: 'Dancing', category: 'Actions', difficulty: 'medium' },
  { word: 'Swimming', category: 'Actions', difficulty: 'medium' },
  { word: 'Fishing', category: 'Actions', difficulty: 'medium' },
  { word: 'Sleeping', category: 'Actions', difficulty: 'easy' },
  { word: 'Cooking', category: 'Actions', difficulty: 'easy' },
  { word: 'Skateboarding', category: 'Actions', difficulty: 'hard' },
  { word: 'Soccer', category: 'Sports', difficulty: 'easy' },
  { word: 'Basketball', category: 'Sports', difficulty: 'easy' },
  { word: 'Bowling', category: 'Sports', difficulty: 'medium' },
  { word: 'Archery', category: 'Sports', difficulty: 'hard' },
  { word: 'Surfing', category: 'Sports', difficulty: 'medium' },

  // Fantasy & Misc
  { word: 'Robot', category: 'Fantasy', difficulty: 'easy' },
  { word: 'Ghost', category: 'Fantasy', difficulty: 'easy' },
  { word: 'Alien', category: 'Fantasy', difficulty: 'easy' },
  { word: 'Dragon', category: 'Fantasy', difficulty: 'medium' },
  { word: 'Unicorn', category: 'Fantasy', difficulty: 'medium' },
  { word: 'Wizard', category: 'Fantasy', difficulty: 'medium' },
  { word: 'Pirate', category: 'Fantasy', difficulty: 'medium' },
  { word: 'Superhero', category: 'Fantasy', difficulty: 'medium' },
  { word: 'Astronaut', category: 'Fantasy', difficulty: 'hard' },
  { word: 'Time Machine', category: 'Fantasy', difficulty: 'hard' }
];

export class WordManager {
  private wordBank: WordEntry[];
  private usedWords: Set<string> = new Set();

  constructor(customWords: string[] = []) {
    this.wordBank = [...DEFAULT_WORD_BANK];
    if (customWords && customWords.length > 0) {
      customWords.forEach(cw => {
        const trimmed = cw.trim();
        if (trimmed.length > 1) {
          this.wordBank.push({
            word: trimmed,
            category: 'Custom',
            difficulty: 'medium'
          });
        }
      });
    }
  }

  public getWordChoices(count: number = 3): WordChoice[] {
    const available = this.wordBank.filter(w => !this.usedWords.has(w.word.toLowerCase()));
    const pool = available.length >= count ? available : this.wordBank;

    // Pick random distinct words
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    return selected.map(item => ({
      word: item.word,
      category: item.category,
      difficulty: item.difficulty
    }));
  }

  public markWordUsed(word: string): void {
    this.usedWords.add(word.toLowerCase());
  }

  public resetUsedWords(): void {
    this.usedWords.clear();
  }

  public static normalize(word: string): string {
    return word.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  public static isCorrectGuess(guess: string, target: string): boolean {
    return this.normalize(guess) === this.normalize(target);
  }

  public static isCloseGuess(guess: string, target: string): boolean {
    const normGuess = this.normalize(guess);
    const normTarget = this.normalize(target);

    if (normGuess === normTarget) return false; // That's a correct guess, not close

    const distance = this.levenshtein(normGuess, normTarget);
    if (normTarget.length <= 4) {
      return distance === 1;
    }
    return distance <= 2;
  }

  public static levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // deletion
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return dp[m][n];
  }

  public static generateHints(word: string, revealedIndices: Set<number>): string[] {
    return word.split('').map((char, index) => {
      if (char === ' ' || char === '-') {
        return char;
      }
      return revealedIndices.has(index) ? char : '';
    });
  }

  public static getEligibleHintIndices(word: string, revealedIndices: Set<number>): number[] {
    const eligible: number[] = [];
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      if (char !== ' ' && char !== '-' && !revealedIndices.has(i)) {
        eligible.push(i);
      }
    }
    return eligible;
  }
}
