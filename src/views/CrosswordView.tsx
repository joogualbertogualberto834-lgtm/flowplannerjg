import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, RefreshCw, HelpCircle, CheckCircle2, ChevronRight, ChevronDown, ChevronLeft, Sparkles, BookOpen, Trophy, Gamepad2
} from 'lucide-react';
import { CrosswordData, GridCell, Clue } from '../crosswordTypes';
import { SPECIALTIES } from '../constants';
import { generateCrossword } from '../utils/crosswordGenerator';
import { processQuestions, generateRandomCrossword, parseManualFormat } from '../services/geminiService';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Modal } from '../components/ui/Modal';

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

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (crossword) {
      setUserGrid(crossword.grid.map(row => row.map(() => '')));
      setCellStatus({});
      setSelectedCell(null);
    }
  }, [crossword]);

  const checkWordCorrectness = (r: number, c: number, dir: 'across' | 'down', currentGrid: string[][]) => {
    if (!crossword) return;

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

    const isFull = cells.every(cell => currentGrid[cell.r][cell.c] !== '');
    if (!isFull) {
      const newStatus = { ...cellStatus };
      cells.forEach(cell => {
        const key = `${cell.r}-${cell.c}`;
        if (newStatus[key] !== 'neutral') newStatus[key] = 'neutral';
      });
      setCellStatus(newStatus);
      return;
    }

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
        if (inputText.includes('[') && inputText.includes(']')) {
          words = parseManualFormat(inputText);
        } else {
          words = await processQuestions(inputText);
        }
      } else {
        words = await generateRandomCrossword(topic);
      }

      let newCrossword = generateCrossword(words, 20);
      if (!newCrossword) {
        newCrossword = generateCrossword(words, 25);
      }

      if (newCrossword) {
        setCrossword(newCrossword);
      } else {
        alert("Não foi possível gerar um grid com essas palavras. Tente com termos mais curtos.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (crossword?.grid[r][c].isBlack) return;
    if (selectedCell?.r === r && selectedCell?.c === c) {
      setDirection(prev => prev === 'across' ? 'down' : 'across');
    } else {
      setSelectedCell({ r, c });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell || !crossword) return;
    const { r, c } = selectedCell;

    if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
      const newGrid = userGrid.map(row => [...row]);
      newGrid[r][c] = e.key.toUpperCase();
      setUserGrid(newGrid);

      checkWordCorrectness(r, c, 'across', newGrid);
      checkWordCorrectness(r, c, 'down', newGrid);

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
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Settings Column */}
        <div className={`space-y-6 ${crossword ? 'lg:col-span-1 hidden lg:block' : 'lg:col-span-3 lg:max-w-xl lg:mx-auto w-full'}`}>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <SectionHeader icon={<Gamepad2 className="text-emerald-600" />} title="Gerador de Cruzadas" />

            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setMode('manual')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'manual' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Colar Resumo
              </button>
              <button
                onClick={() => setMode('auto')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'auto' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Por Especialidade
              </button>
            </div>

            {mode === 'manual' ? (
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ex: Cole aqui suas anotações ou resumos do NotebookLM..."
                className="w-full h-40 p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none transition-all"
              />
            ) : (
              <div className="space-y-3 h-56 overflow-y-auto pr-2 custom-scrollbar border border-slate-200 rounded-xl bg-slate-50 p-2">
                {!selectedSpecialty ? (
                  SPECIALTIES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSpecialty(s.id)}
                      className="w-full text-left p-3 rounded-lg bg-white border border-slate-200 flex justify-between items-center group transition-all hover:border-emerald-500 hover:shadow-sm"
                    >
                      <span className="font-semibold text-slate-700">{s.name}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                    </button>
                  ))
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setSelectedSpecialty(null);
                        setTopic('');
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Voltar
                    </button>
                    {SPECIALTIES.find(s => s.id === selectedSpecialty)?.themes.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTopic(t)}
                        className={`w-full text-left p-3 flex justify-between items-center rounded-lg transition-all border ${topic === t ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold' : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'}`}
                      >
                        <span className="text-sm">{t}</span>
                        {topic === t && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isLoading || (mode === 'manual' && !inputText.trim()) || (mode === 'auto' && !topic)}
              className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-100 transition-all"
            >
              {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
              {isLoading ? 'GERANDO...' : 'INICIAR PALAVRAS CRUZADAS'}
            </button>
          </div>
        </div>

        {/* Grid and Clues Area */}
        {crossword && (
          <div className="lg:col-span-2 space-y-6">

            {/* Clue Header (Desktop) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="hidden md:flex bg-white p-6 rounded-2xl border border-slate-200 shadow-sm items-center gap-5 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
              <div className="bg-emerald-100 text-emerald-700 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-xl shadow-sm">
                {activeClue ? activeClue.number : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg text-slate-800 font-medium">
                  {activeClue ? activeClue.clue : 'Selecione um bloco no grid'}
                </p>
                {activeClue?.hint && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 font-semibold truncate uppercase">
                    <Sparkles className="w-3.5 h-3.5" />
                    {activeClue.hint}
                  </div>
                )}
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                {direction === 'across' ? 'Horizontal' : 'Vertical'}
              </div>
            </motion.div>

            {/* Render Grid & Mobile List */}
            <div className="flex flex-col xl:flex-row gap-6">

              {/* Grid Container */}
              <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center overflow-x-auto">
                <div
                  ref={gridRef}
                  onKeyDown={handleKeyDown}
                  tabIndex={0}
                  className="grid gap-[1px] bg-slate-300 p-[1px] rounded-sm focus:outline-none touch-none shadow-md shrink-0 mb-6"
                  style={{
                    gridTemplateColumns: `repeat(${crossword.size}, minmax(0, 1fr))`,
                    width: 'min(100%, 500px)',
                    aspectRatio: '1/1'
                  }}
                >
                  {crossword.grid.map((row, r) =>
                    row.map((cell, c) => {
                      const isActive = selectedCell?.r === r && selectedCell?.c === c;
                      const isInActiveWord = isCellInActiveWord(r, c);
                      const status = cellStatus[`${r}-${c}`] || 'neutral';

                      let cellColor = cell.isBlack ? 'bg-slate-800' : 'bg-white';
                      let textColor = 'text-slate-800';

                      if (status === 'correct') cellColor = 'bg-emerald-500';
                      if (status === 'incorrect') cellColor = 'bg-rose-500';
                      if (isActive) cellColor = 'bg-blue-600';
                      else if (isInActiveWord && status === 'neutral') cellColor = 'bg-blue-100';

                      if (status === 'correct' || status === 'incorrect' || isActive) {
                        textColor = 'text-white';
                      }

                      return (
                        <motion.div
                          key={`${r}-${c}`}
                          onClick={() => handleCellClick(r, c)}
                          animate={{
                            scale: status === 'correct' ? [1, 1.1, 1] : 1,
                            x: status === 'incorrect' ? [0, -3, 3, -3, 3, 0] : 0
                          }}
                          transition={{ duration: status === 'incorrect' ? 0.3 : 0.2 }}
                          className={`relative flex items-center justify-center text-sm md:text-lg lg:text-xl font-bold transition-colors cursor-pointer select-none ${cellColor} ${textColor}`}
                        >
                          {!cell.isBlack && (
                            <>
                              {cell.number && (
                                <span className={`absolute top-0.5 left-1 text-[8px] md:text-[9px] font-semibold leading-none ${(status === 'correct' || status === 'incorrect' || isActive) ? 'text-white/80' : 'text-slate-400'}`}>{cell.number}</span>
                              )}
                              {userGrid[r] && userGrid[r][c]}
                            </>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </div>

                <div className="flex w-full gap-3 mt-auto">
                  <button
                    onClick={() => setCrossword(null)}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center justify-center gap-2 transition-all"
                  >
                    Novo
                  </button>
                  <button
                    onClick={checkSolution}
                    className="flex-[2] py-3 px-4 bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all uppercase tracking-wide"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Validar
                  </button>
                </div>
              </div>

              {/* Sidebar Desktop list clues */}
              <div className="xl:w-64 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm overflow-y-auto max-h-[600px] custom-scrollbar">
                <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 sticky top-0 bg-white z-10 py-1">Horizontal</h3>
                <div className="space-y-2 mb-6">
                  {crossword.clues.across.map(clue => (
                    <div
                      key={`across-${clue.number}`}
                      onClick={() => {
                        setSelectedCell({ r: clue.row!, c: clue.col! });
                        setDirection('across');
                      }}
                      className={`text-sm p-3 rounded-xl cursor-pointer transition-all border ${selectedCell?.r === clue.row && direction === 'across' ? 'bg-blue-50 border-blue-200 text-blue-800 font-medium' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}
                    >
                      <span className="font-bold mr-2">{clue.number}.</span>
                      {clue.clue}
                    </div>
                  ))}
                </div>

                <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 sticky top-0 bg-white z-10 py-1">Vertical</h3>
                <div className="space-y-2">
                  {crossword.clues.down.map(clue => (
                    <div
                      key={`down-${clue.number}`}
                      onClick={() => {
                        setSelectedCell({ r: clue.row!, c: clue.col! });
                        setDirection('down');
                      }}
                      className={`text-sm p-3 rounded-xl cursor-pointer transition-all border ${selectedCell?.c === clue.col && direction === 'down' ? 'bg-blue-50 border-blue-200 text-blue-800 font-medium' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}
                    >
                      <span className="font-bold mr-2">{clue.number}.</span>
                      {clue.clue}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Mobile Sticky Clue */}
      {crossword && activeClue && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 p-4 z-40 pointer-events-none">
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl pointer-events-auto border border-slate-700 flex items-center gap-4">
            <div className="bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-lg">
              {activeClue.number}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{activeClue.clue}</p>
              <div className="text-[10px] text-amber-400 font-bold mt-1 uppercase">
                {activeClue.hint && (<span><Sparkles className="inline w-3 h-3 mr-1" />{activeClue.hint}</span>)}
              </div>
            </div>
            <button
              onClick={() => setDirection(prev => prev === 'across' ? 'down' : 'across')}
              className="p-2 bg-slate-800 rounded-lg"
            >
              <RefreshCw className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <Modal open={showSuccess} onClose={() => setShowSuccess(false)} title="Parabéns, Doutor(a)!">
            <div className="flex flex-col items-center text-center space-y-4 py-6">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                <Trophy className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Desafio Concluído</h3>
                <p className="text-slate-500 text-sm">Você preencheu perfeitamente todas as palavras-chave deste tema.</p>
              </div>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  setCrossword(null);
                }}
                className="w-full py-4 mt-6 bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all uppercase"
              >
                Voltar ao Menu
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

    </div>
  );
}
