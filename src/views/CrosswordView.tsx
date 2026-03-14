import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  Play,
  RefreshCw,
  Send,
  HelpCircle,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Sparkles,
  BookOpen,
  Trophy,
  Palette,
  Layout,
  Smartphone
} from 'lucide-react';
import { CrosswordData, GridCell, Clue, Theme } from '../crosswordTypes';
import { SPECIALTIES, THEMES } from '../constants';
import { generateCrossword } from '../utils/crosswordGenerator';
import { processQuestions, generateRandomCrossword, parseManualFormat } from '../services/geminiService';

export function CrosswordView() {
  const [inputText, setInputText] = useState('');
  const [crossword, setCrossword] = useState<CrosswordData | null>(null);
  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [cellStatus, setCellStatus] = useState<Record<string, 'correct' | 'incorrect' | 'neutral'>>({});
  const [selectedTheme, setSelectedTheme] = useState<Theme>(THEMES[0]);
  const [lastTap, setLastTap] = useState(0);

  const gridRef = useRef<HTMLDivElement>(null);

  // Initialize user grid when crossword changes
  useEffect(() => {
    if (crossword) {
      setUserGrid(crossword.grid.map(row => row.map(() => '')));
      setCellStatus({});
      setSelectedCell(null);
    }
  }, [crossword]);

  const checkWordCorrectness = (r: number, c: number, dir: 'across' | 'down', currentGrid: string[][]) => {
    if (!crossword) return;

    // Find start and end of the word
    let startR = r, startC = c;
    if (dir === 'across') {
      while (startC > 0 && !crossword.grid[r][startC - 1].isBlack) startC--;
    } else {
      while (startR > 0 && !crossword.grid[startR - 1][c].isBlack) startR--;
    }

    let cells: { r: number; c: number }[] = [];
    let currR = startR, currC = startC;
    while (currR < crossword.size && currC < crossword.size && !crossword.grid[currR][currC].isBlack) {
      cells.push({ r: currR, c: currC });
      if (dir === 'across') currC++; else currR++;
    }

    // Check if word is full
    const isFull = cells.every(cell => currentGrid[cell.r][cell.c] !== '');
    if (!isFull) {
      // If not full, we might want to clear previous status for these cells if they were marked
      // but let's keep it simple: only update status when full or when a letter makes it definitely wrong?
      // User said "ao digitar a palavra", usually implies when finished.
      const newStatus = { ...cellStatus };
      cells.forEach(cell => {
        const key = `${cell.r}-${cell.c}`;
        if (newStatus[key] !== 'neutral') newStatus[key] = 'neutral';
      });
      setCellStatus(newStatus);
      return;
    }

    // Check if correct
    const isCorrect = cells.every(cell => currentGrid[cell.r][cell.c] === crossword.grid[cell.r][cell.c].char);

    const newStatus = { ...cellStatus };
    cells.forEach(cell => {
      newStatus[`${cell.r}-${cell.c}`] = isCorrect ? 'correct' : 'incorrect';
    });
    setCellStatus(newStatus);
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      setCrossword(null);
      let words: { answer: string; clue: string }[] = [];
      if (mode === 'manual') {
        // If it contains brackets, use manual parser, otherwise use AI
        if (inputText.includes('[') && inputText.includes(']')) {
          words = parseManualFormat(inputText);
        } else {
          words = await processQuestions(inputText);
        }
      } else {
        words = await generateRandomCrossword(topic);
      }

      let newCrossword = generateCrossword(words, 20);

      // Se falhar com 20, tenta com 25 (mais espaço ajuda a conectar palavras longas)
      if (!newCrossword) {
        newCrossword = generateCrossword(words, 25);
      }

      if (newCrossword) {
        setCrossword(newCrossword);
      } else {
        alert("Não foi possível gerar um grid com essas palavras. Tente temas com termos mais variados ou adicione mais conteúdo.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (crossword?.grid[r][c].isBlack) return;

    const now = Date.now();
    if (selectedCell?.r === r && selectedCell?.c === c) {
      // Toggle direction on click of same cell
      setDirection(prev => prev === 'across' ? 'down' : 'across');
    } else {
      setSelectedCell({ r, c });
    }
    setLastTap(now);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell || !crossword) return;

    const { r, c } = selectedCell;

    if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
      const newGrid = userGrid.map(row => [...row]);
      newGrid[r][c] = e.key.toUpperCase();
      setUserGrid(newGrid);

      // Check correctness for both directions because typing a letter affects both
      checkWordCorrectness(r, c, 'across', newGrid);
      checkWordCorrectness(r, c, 'down', newGrid);

      // Move to next cell
      if (direction === 'across') {
        if (c + 1 < crossword.size && !crossword.grid[r][c + 1].isBlack) {
          setSelectedCell({ r, c: c + 1 });
        }
      } else {
        if (r + 1 < crossword.size && !crossword.grid[r + 1][c].isBlack) {
          setSelectedCell({ r: r + 1, c });
        }
      }
    } else if (e.key === 'Backspace') {
      const newGrid = userGrid.map(row => [...row]);
      if (newGrid[r][c] === '') {
        // Move back
        let prevR = r, prevC = c;
        if (direction === 'across') {
          if (c > 0 && !crossword.grid[r][c - 1].isBlack) prevC--;
        } else {
          if (r > 0 && !crossword.grid[r - 1][c].isBlack) prevR--;
        }
        setSelectedCell({ r: prevR, c: prevC });
      } else {
        newGrid[r][c] = '';
        setUserGrid(newGrid);
        // Clear status when deleting
        checkWordCorrectness(r, c, 'across', newGrid);
        checkWordCorrectness(r, c, 'down', newGrid);
      }
    } else if (e.key.startsWith('Arrow')) {
      let nr = r, nc = c;
      if (e.key === 'ArrowRight') nc++;
      if (e.key === 'ArrowLeft') nc--;
      if (e.key === 'ArrowDown') nr++;
      if (e.key === 'ArrowUp') nr--;

      if (nr >= 0 && nr < crossword.size && nc >= 0 && nc < crossword.size && !crossword.grid[nr][nc].isBlack) {
        setSelectedCell({ r: nr, c: nc });
      }
    }
  };

  const checkSolution = () => {
    if (!crossword) return;
    let correct = true;
    crossword.grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (!cell.isBlack && userGrid[r][c] !== cell.char) {
          correct = false;
        }
      });
    });

    if (correct) {
      setShowSuccess(true);
    } else {
      alert("Algumas palavras estão incorretas. Continue tentando!");
    }
  };

  const isCellInActiveWord = (r: number, c: number) => {
    if (!selectedCell || !crossword) return false;
    const { r: sr, c: sc } = selectedCell;

    if (direction === 'across') {
      if (r !== sr) return false;
      // Find start and end of word
      let start = sc;
      while (start > 0 && !crossword.grid[r][start - 1].isBlack) start--;
      let end = sc;
      while (end < crossword.size - 1 && !crossword.grid[r][end + 1].isBlack) end++;
      return c >= start && c <= end;
    } else {
      if (c !== sc) return false;
      let start = sr;
      while (start > 0 && !crossword.grid[start - 1][c].isBlack) start--;
      let end = sr;
      while (end < crossword.size - 1 && !crossword.grid[end + 1][c].isBlack) end++;
      return r >= start && r <= end;
    }
  };

  const getActiveClue = () => {
    if (!selectedCell || !crossword) return null;
    const { r, c } = selectedCell;

    // Find the clue that starts at the beginning of this word
    let startR = r, startC = c;
    if (direction === 'across') {
      while (startC > 0 && !crossword.grid[r][startC - 1].isBlack) startC--;
    } else {
      while (startR > 0 && !crossword.grid[startR - 1][c].isBlack) startR--;
    }

    const clues = direction === 'across' ? crossword.clues.across : crossword.clues.down;
    return clues.find(clue => clue.row === startR && clue.col === startC);
  };

  const activeClue = getActiveClue();

  return (
    <div className={`h-full flex flex-col md:flex-row overflow-hidden relative ${selectedTheme.bg} ${selectedTheme.cellText}`}>
      {selectedTheme.texture && (
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: `url(${selectedTheme.texture})` }}
        />
      )}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2 md:gap-4 bg-white/80 p-2 rounded shadow backdrop-blur-sm">
        {/* Theme Selector */}
        <div className="relative group">
          <button className="p-2 border border-[#141414] hover:bg-black/5 rounded-sm flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden md:inline text-xs font-bold uppercase tracking-widest">Tema</span>
          </button>
          <div className="absolute right-0 top-full mt-2 bg-white border border-[#141414] shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50 w-48">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTheme(t)}
                className={`w-full text-left px-4 py-3 text-xs uppercase font-bold tracking-widest hover:bg-black/5 flex items-center justify-between ${selectedTheme.id === t.id ? 'bg-black/10' : ''}`}
              >
                {t.name}
                {selectedTheme.id === t.id && <CheckCircle2 className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>

        <div className="h-8 w-px bg-[#141414]/20 mx-2" />

        <button
          onClick={() => setMode('manual')}
          className={`px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs uppercase font-bold tracking-widest border border-[#141414] transition-all ${mode === 'manual' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-black/5'}`}
        >
          Manual
        </button>
        <button
          onClick={() => setMode('auto')}
          className={`px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs uppercase font-bold tracking-widest border border-[#141414] transition-all ${mode === 'auto' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-black/5'}`}
        >
          Automático
        </button>
      </div>

      <main className="flex flex-col md:flex-row h-[calc(100vh-72px)] md:h-[calc(100vh-100px)] overflow-hidden relative">
        {/* Column 1: Input/Settings Sidebar */}
        <div className={`w-full md:w-80 border-r border-[#141414]/20 p-4 md:p-6 flex flex-col gap-4 md:gap-6 overflow-y-auto bg-white/40 backdrop-blur-sm transition-all ${crossword ? 'hidden md:flex' : 'flex'}`}>
          {mode === 'manual' ? (
            <>
              <div className="space-y-2">
                <h2 className="text-xl font-serif italic">Conversor de Resumos</h2>
                <p className="text-sm opacity-70">Cole resumos do NotebookLM, apostilas ou anotações.</p>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ex: Cole aqui seu resumo sobre Insuficiência Cardíaca..."
                className="flex-1 bg-transparent border border-[#141414] p-4 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#141414] resize-none"
              />
            </>
          ) : (
            <div className="space-y-6 flex flex-col flex-1 overflow-hidden">
              <div className="space-y-2">
                <h2 className="text-xl font-serif italic">Gerador Automático</h2>
                <p className="text-sm opacity-70">Escolha especialidade e tema.</p>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {!selectedSpecialty ? (
                  SPECIALTIES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSpecialty(s.id)}
                      className="w-full text-left p-4 border border-[#141414] flex justify-between items-center group transition-all hover:bg-black/5"
                    >
                      <span className="font-serif italic text-lg">{s.name}</span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  ))
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setSelectedSpecialty(null);
                        setTopic('');
                      }}
                      className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-4 hover:opacity-70"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Voltar
                    </button>

                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-50 mb-2">
                      Temas em {SPECIALTIES.find(s => s.id === selectedSpecialty)?.name}
                    </h3>

                    {SPECIALTIES.find(s => s.id === selectedSpecialty)?.themes.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTopic(t)}
                        className={`w-full text-left p-4 border border-[#141414] flex justify-between items-center group transition-all ${topic === t ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-black/5'}`}
                      >
                        <span className="font-serif italic">{t}</span>
                        {topic === t && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isLoading || (mode === 'manual' && !inputText.trim()) || (mode === 'auto' && !topic)}
            className="w-full bg-[#141414] text-[#E4E3E0] py-4 font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:opacity-90 disabled:opacity-30 transition-all shrink-0"
          >
            {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            {isLoading ? 'Processando...' : 'Gerar Cruzada'}
          </button>
        </div>

        {/* Column 2: Grid Area */}
        <div className={`flex-1 p-4 md:p-8 flex flex-col items-center overflow-y-auto transition-all ${selectedTheme.bg}`}>
          {crossword ? (
            <div className="w-full max-w-4xl flex flex-col gap-4 md:gap-8 items-center pb-24 md:pb-0">
              {/* Active Clue Bar (Desktop) */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`hidden md:flex w-full ${selectedTheme.gridBg} ${selectedTheme.cellBg} p-6 rounded-sm items-center gap-6 shadow-xl min-h-[100px] border ${selectedTheme.border} ${selectedTheme.shadow}`}
              >
                <div className={`${selectedTheme.activeCell} text-white w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-xl shadow-lg`}>
                  {activeClue ? activeClue.number : '?'}
                </div>
                <div className="flex-1">
                  <p className={`text-lg italic leading-tight ${selectedTheme.font}`}>
                    {activeClue ? activeClue.clue : 'Toque em uma célula para começar'}
                  </p>
                  {activeClue?.hint && (
                    <div className="mt-2 flex items-center gap-2 text-xs uppercase tracking-widest text-[#F27D26] font-bold">
                      <Sparkles className="w-4 h-4" />
                      Dica Médica: {activeClue.hint}
                    </div>
                  )}
                </div>
                <div className="text-[10px] uppercase tracking-widest opacity-50 font-bold">
                  {direction === 'across' ? 'Horizontal' : 'Vertical'}
                </div>
              </motion.div>

              {/* The Grid */}
              <div
                ref={gridRef}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                className={`grid gap-px ${selectedTheme.gridBg} border ${selectedTheme.border} p-px shadow-2xl focus:outline-none touch-none`}
                style={{
                  gridTemplateColumns: `repeat(${crossword.size}, minmax(0, 1fr))`,
                  width: 'min(85vw, 70vh)',
                  aspectRatio: '1/1'
                }}
              >
                {crossword.grid.map((row, r) =>
                  row.map((cell, c) => {
                    const isActive = selectedCell?.r === r && selectedCell?.c === c;
                    const isInActiveWord = isCellInActiveWord(r, c);
                    const status = cellStatus[`${r}-${c}`] || 'neutral';

                    let cellColor = cell.isBlack ? selectedTheme.blackCell : selectedTheme.cellBg;
                    let textColor = selectedTheme.cellText;

                    if (status === 'correct') cellColor = selectedTheme.correctCell;
                    if (status === 'incorrect') cellColor = selectedTheme.incorrectCell;
                    if (isActive) cellColor = selectedTheme.activeCell;
                    else if (isInActiveWord) cellColor = selectedTheme.activeWord;

                    if (status === 'correct' || status === 'incorrect' || isActive) {
                      textColor = 'text-white';
                    }

                    return (
                      <motion.div
                        key={`${r}-${c}`}
                        onClick={() => handleCellClick(r, c)}
                        animate={{
                          backgroundColor: cellColor.replace('bg-', '').replace('[', '').replace(']', ''),
                          scale: status === 'correct' ? [1, 1.1, 1] : 1,
                          x: status === 'incorrect' ? [0, -4, 4, -4, 4, 0] : 0
                        }}
                        transition={{
                          duration: status === 'incorrect' ? 0.4 : 0.2,
                          times: status === 'incorrect' ? [0, 0.2, 0.4, 0.6, 0.8, 1] : undefined
                        }}
                        className={`relative flex items-center justify-center text-sm md:text-xl font-bold transition-all cursor-pointer select-none
                          ${cell.isBlack ? selectedTheme.blackCell : ''}
                          ${textColor}
                          ${selectedTheme.font}
                          hover:opacity-90
                        `}
                      >
                        {!cell.isBlack && (
                          <>
                            {cell.number && (
                              <span className={`absolute top-0.5 left-0.5 text-[8px] md:text-[10px] leading-none ${(status === 'correct' || status === 'incorrect' || isActive) ? 'text-white/70' : 'opacity-50'}`}>{cell.number}</span>
                            )}
                            {userGrid[r] && userGrid[r][c]}
                          </>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full md:w-auto px-4">
                <button
                  onClick={checkSolution}
                  className={`w-full md:w-auto px-6 md:px-12 py-3 md:py-4 ${selectedTheme.gridBg} text-white font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 shadow-lg`}
                >
                  <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
                  Verificar
                </button>
                <button
                  onClick={() => setCrossword(null)}
                  className={`w-full md:w-auto px-6 md:px-12 py-3 md:py-4 border-2 ${selectedTheme.border} font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black/5`}
                >
                  <RefreshCw className="w-5 h-5 md:w-6 md:h-6" />
                  Limpar
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-6 max-w-md">
                <div className="w-24 h-24 bg-[#141414] text-[#E4E3E0] rounded-full flex items-center justify-center mx-auto shadow-xl">
                  <BookOpen className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-serif italic">Pronto para o desafio?</h2>
                <p className="opacity-60">Insira questões à esquerda ou escolha um tema para começar a estudar de forma dinâmica.</p>
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="p-4 border border-[#141414]/20 rounded-lg">
                    <Sparkles className="w-5 h-5 mb-2 text-[#F27D26]" />
                    <p className="text-xs font-bold uppercase opacity-40">IA Inteligente</p>
                    <p className="text-sm">Processa questões complexas automaticamente.</p>
                  </div>
                  <div className="p-4 border border-[#141414]/20 rounded-lg">
                    <Trophy className="w-5 h-5 mb-2 text-[#F27D26]" />
                    <p className="text-xs font-bold uppercase opacity-40">Gamificação</p>
                    <p className="text-sm">Fixe o conteúdo enquanto joga.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Clues Sidebar (Questions) */}
        {crossword && (
          <div className="hidden lg:flex w-96 border-l border-[#141414]/20 p-6 flex-col gap-8 overflow-y-auto bg-white/40 backdrop-blur-sm">
            <div className="space-y-6">
              <h2 className={`text-2xl italic border-b border-[#141414]/20 pb-2 ${selectedTheme.font}`}>Lista de Perguntas</h2>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-bold uppercase tracking-widest text-[#F27D26] flex items-center gap-2 text-xs">
                    <ChevronRight className="w-4 h-4" /> Horizontal
                  </h3>
                  <div className="space-y-3">
                    {crossword.clues.across.map(clue => (
                      <div
                        key={`across-${clue.number}`}
                        className={`text-sm p-3 transition-all cursor-pointer border-l-4 ${selectedCell?.r === clue.row && direction === 'across' ? 'border-[#F27D26] bg-[#F27D26]/10' : 'border-transparent hover:bg-black/5'}`}
                        onClick={() => {
                          setSelectedCell({ r: clue.row!, c: clue.col! });
                          setDirection('across');
                        }}
                      >
                        <span className="font-bold mr-2">{clue.number}.</span>
                        {clue.clue}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold uppercase tracking-widest text-[#F27D26] flex items-center gap-2 text-xs">
                    <ChevronDown className="w-4 h-4" /> Vertical
                  </h3>
                  <div className="space-y-3">
                    {crossword.clues.down.map(clue => (
                      <div
                        key={`down-${clue.number}`}
                        className={`text-sm p-3 transition-all cursor-pointer border-l-4 ${selectedCell?.c === clue.col && direction === 'down' ? 'border-[#F27D26] bg-[#F27D26]/10' : 'border-transparent hover:bg-black/5'}`}
                        onClick={() => {
                          setSelectedCell({ r: clue.row!, c: clue.col! });
                          setDirection('down');
                        }}
                      >
                        <span className="font-bold mr-2">{clue.number}.</span>
                        {clue.clue}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Sticky Clue Bar */}
      {crossword && activeClue && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#141414] text-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-40 border-t border-[#F27D26]">
          <div className="flex items-center gap-4">
            <div className="bg-[#F27D26] text-white w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold">
              {activeClue.number}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-serif italic leading-tight truncate">
                {activeClue.clue}
              </p>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#F27D26] font-bold mt-1">
                <Sparkles className="w-3 h-3" />
                Dica: {activeClue.hint || '...'}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[8px] uppercase tracking-widest opacity-50">{direction === 'across' ? 'Horiz' : 'Vert'}</span>
              <button
                onClick={() => setDirection(prev => prev === 'across' ? 'down' : 'across')}
                className="p-1 border border-white/20 rounded"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#141414]/90 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#E4E3E0] p-12 max-w-lg w-full text-center space-y-8 border-4 border-[#F27D26]"
            >
              <div className="w-24 h-24 bg-[#F27D26] text-white rounded-full flex items-center justify-center mx-auto">
                <Trophy className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-serif italic">Parabéns, Doutor(a)!</h2>
                <p className="text-lg opacity-70">Você completou o desafio com perfeição. O conteúdo está fixado!</p>
              </div>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  setCrossword(null);
                }}
                className="w-full bg-[#141414] text-[#E4E3E0] py-4 font-bold uppercase tracking-widest hover:opacity-90"
              >
                Novo Desafio
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
