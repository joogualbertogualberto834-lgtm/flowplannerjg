export type ThemeId = 'classic' | 'wood' | 'crystal' | 'stone' | 'parchment';

export interface Theme {
  id: ThemeId;
  name: string;
  bg: string;
  gridBg: string;
  cellBg: string;
  cellText: string;
  blackCell: string;
  activeCell: string;
  activeWord: string;
  correctCell: string;
  incorrectCell: string;
  font: string;
  border: string;
  shadow?: string;
  texture?: string;
}

export interface Clue {
  answer: string;
  clue: string;
  hint?: string;
  number?: number;
  row?: number;
  col?: number;
  direction?: 'across' | 'down';
}

export interface GridCell {
  char: string;
  isBlack: boolean;
  number?: number;
  userChar?: string;
  row: number;
  col: number;
}

export interface CrosswordData {
  grid: GridCell[][];
  clues: {
    across: Clue[];
    down: Clue[];
  };
  size: number;
}
