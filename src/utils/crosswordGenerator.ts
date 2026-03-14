import { Clue, CrosswordData, GridCell } from '../types';

/**
 * A more robust crossword generator.
 */
export function generateCrossword(words: { answer: string; clue: string }[], size: number = 20): CrosswordData | null {
  // Unique words by answer and sort by length descending
  const seenAnswers = new Set<string>();
  const sortedWords = words
    .map(w => ({ ...w, answer: w.answer.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/g, '') }))
    .filter(w => {
      if (w.answer.length < 2 || w.answer.length > size || seenAnswers.has(w.answer)) return false;
      seenAnswers.add(w.answer);
      return true;
    })
    .sort((a, b) => b.answer.length - a.answer.length);

  if (sortedWords.length < 3) return null;

  let bestResult: { grid: string[][], placedWords: Clue[] } | null = null;

  // Try multiple times with different starting words to find the best layout
  const attempts = Math.min(sortedWords.length, 5);
  
  for (let attempt = 0; attempt < attempts; attempt++) {
    const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
    const currentPlacedWords: Clue[] = [];

    // Place the "attempt-th" word as the first word to vary the starting point
    const first = sortedWords[attempt];
    const startRow = Math.floor(size / 2);
    const startCol = Math.max(0, Math.floor((size - first.answer.length) / 2));
    
    for (let i = 0; i < first.answer.length; i++) {
      grid[startRow][startCol + i] = first.answer[i];
    }
    currentPlacedWords.push({ ...first, row: startRow, col: startCol, direction: 'across' });

    // Try to place other words
    const remainingWords = [...sortedWords.slice(0, attempt), ...sortedWords.slice(attempt + 1)];
    
    for (const word of remainingWords) {
      let bestPlacement: { row: number; col: number; direction: 'across' | 'down'; score: number } | null = null;

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          for (const dir of ['across', 'down'] as const) {
            if (canPlace(grid, word.answer, r, c, dir, size)) {
              const score = calculateScore(grid, word.answer, r, c, dir);
              if (score > 0 && (!bestPlacement || score > bestPlacement.score)) {
                bestPlacement = { row: r, col: c, direction: dir, score };
              }
            }
          }
        }
      }

      if (bestPlacement) {
        placeWord(grid, word.answer, bestPlacement.row, bestPlacement.col, bestPlacement.direction);
        currentPlacedWords.push({ ...word, row: bestPlacement.row, col: bestPlacement.col, direction: bestPlacement.direction });
      } else {
        // Fallback: Try to place without intersection if we really need to
        let fallbackPlacement: { row: number; col: number; direction: 'across' | 'down' } | null = null;
        for (let r = 0; r < size && !fallbackPlacement; r++) {
          for (let c = 0; c < size && !fallbackPlacement; c++) {
            for (const dir of ['across', 'down'] as const) {
              if (canPlace(grid, word.answer, r, c, dir, size, true)) {
                fallbackPlacement = { row: r, col: c, direction: dir };
              }
            }
          }
        }
        if (fallbackPlacement) {
          placeWord(grid, word.answer, fallbackPlacement.row, fallbackPlacement.col, fallbackPlacement.direction);
          currentPlacedWords.push({ ...word, row: fallbackPlacement.row, col: fallbackPlacement.col, direction: fallbackPlacement.direction });
        }
      }
    }

    if (!bestResult || currentPlacedWords.length > bestResult.placedWords.length) {
      bestResult = { grid, placedWords: currentPlacedWords };
    }
    
    // If we placed all words, we can stop
    if (currentPlacedWords.length === sortedWords.length) break;
  }

  if (!bestResult || bestResult.placedWords.length < 3) return null;

  const { grid, placedWords } = bestResult;

  // Assign numbers and build final structure
  const finalGrid: GridCell[][] = Array(size).fill(null).map((_, r) => 
    Array(size).fill(null).map((_, c) => ({
      char: grid[r][c],
      isBlack: grid[r][c] === '',
      row: r,
      col: c
    }))
  );

  const acrossClues: Clue[] = [];
  const downClues: Clue[] = [];
  let currentNumber = 1;

  const startPositions = new Set<string>();
  placedWords.forEach(pw => startPositions.add(`${pw.row}-${pw.col}`));
  
  const sortedStarts = Array.from(startPositions)
    .map(s => {
      const [r, c] = s.split('-').map(Number);
      return { r, c };
    })
    .sort((a, b) => a.r !== b.r ? a.r - b.r : a.c - b.c);

  const numberMap = new Map<string, number>();
  sortedStarts.forEach(pos => {
    numberMap.set(`${pos.r}-${pos.c}`, currentNumber++);
  });

  placedWords.forEach(pw => {
    const num = numberMap.get(`${pw.row}-${pw.col}`)!;
    pw.number = num;
    finalGrid[pw.row!][pw.col!].number = num;

    if (pw.direction === 'across') acrossClues.push(pw);
    else downClues.push(pw);
  });

  acrossClues.sort((a, b) => a.number! - b.number!);
  downClues.sort((a, b) => a.number! - b.number!);

  return {
    grid: finalGrid,
    clues: {
      across: acrossClues,
      down: downClues
    },
    size
  };
}

function canPlace(grid: string[][], word: string, row: number, col: number, direction: 'across' | 'down', size: number, allowNoIntersection: boolean = false): boolean {
  if (direction === 'across') {
    if (col + word.length > size) return false;
    
    // Check cell before and after (must be empty or boundary)
    if (col > 0 && grid[row][col - 1] !== '') return false;
    if (col + word.length < size && grid[row][col + word.length] !== '') return false;

    let intersections = 0;
    for (let i = 0; i < word.length; i++) {
      const current = grid[row][col + i];
      
      // Must match existing char or be empty
      if (current !== '' && current !== word[i]) return false;
      if (current === word[i]) intersections++;

      // If placing in empty cell, check top/bottom neighbors to avoid parallel words
      if (current === '') {
        if (row > 0 && grid[row - 1][col + i] !== '') return false;
        if (row < size - 1 && grid[row + 1][col + i] !== '') return false;
      }
    }
    return allowNoIntersection || intersections > 0;
  } else {
    if (row + word.length > size) return false;
    
    // Check cell above and below
    if (row > 0 && grid[row - 1][col] !== '') return false;
    if (row + word.length < size && grid[row + word.length][col] !== '') return false;

    let intersections = 0;
    for (let i = 0; i < word.length; i++) {
      const current = grid[row + i][col];
      
      if (current !== '' && current !== word[i]) return false;
      if (current === word[i]) intersections++;

      // Check left/right neighbors
      if (current === '') {
        if (col > 0 && grid[row + i][col - 1] !== '') return false;
        if (col < size - 1 && grid[row + i][col + 1] !== '') return false;
      }
    }
    return allowNoIntersection || intersections > 0;
  }
}

function calculateScore(grid: string[][], word: string, row: number, col: number, direction: 'across' | 'down'): number {
  let score = 0;
  for (let i = 0; i < word.length; i++) {
    const r = direction === 'across' ? row : row + i;
    const c = direction === 'across' ? col + i : col;
    if (grid[r][c] === word[i]) score += 10;
  }
  return score;
}

function placeWord(grid: string[][], word: string, row: number, col: number, direction: 'across' | 'down') {
  for (let i = 0; i < word.length; i++) {
    const r = direction === 'across' ? row : row + i;
    const c = direction === 'across' ? col + i : col;
    grid[r][c] = word[i];
  }
}
