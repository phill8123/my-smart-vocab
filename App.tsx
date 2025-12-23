import React, { useState, useEffect } from 'react';
import { Search, GraduationCap, Loader2, BookMarked, ArrowRight, Palette, ArrowUp, RotateCcw, Settings, Zap, BrainCircuit } from 'lucide-react';
import { StudentLevel, WordData, SearchHistoryItem, ThemeColor } from './types';
import { fetchWordDefinition } from './services/geminiService';
import { LevelBadge } from './components/LevelBadge';
import { WordCard } from './components/WordCard';

const STORAGE_KEY = 'vocab_history';
const THEME_KEY = 'vocab_theme';

const COLORS: ThemeColor[] = ['indigo', 'rose', 'emerald', 'amber', 'violet', 'sky'];
const MODELS = {
  BASIC: 'gemini-3-flash-preview',
  ADVANCED: 'gemini-3-pro-preview'
};

const App: React.FC = () => {
  const [inputWord, setInputWord] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<StudentLevel>(StudentLevel.ELEMENTARY);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WordData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState('');
  const [themeColor, setThemeColor] = useState<ThemeColor>('indigo');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(MODELS.BASIC);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) { console.error(e); }
    }
    const savedTheme = localStorage.getItem(THEME_KEY) as ThemeColor;
    if (savedTheme && COLORS.includes(savedTheme)) setThemeColor(savedTheme);
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 200);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const executeSearch = async (word: string, customLevel?: StudentLevel, customModel?: string) => {
    if (!word.trim()) return;
    
    // Use custom params or fall back to state
    const targetLevel = customLevel || selectedLevel;
    const targetModel = customModel || selectedModel;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchWordDefinition(word, targetLevel, targetModel);
      setResult(data);
      setLoading(false);
      
      const newItem: SearchHistoryItem = { word: data.word, level: targetLevel, timestamp: Date.now() };
      const newHistory = [newItem, ...history.filter(h => h.word !== data.word)].slice(0, 50);
      setHistory(newHistory);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
      setLoading(false);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputWord.trim()) return;
    executeSearch(inputWord);
  };

  const handleRefresh = () => { 
    setInputWord(''); 
    setResult(null); 
    setError(null); 
  };

  const handleRelatedWordClick = (word: string) => {
    setInputWord(word);
    executeSearch(word);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredHistory = history.filter(item => item.word.toLowerCase().includes(historyFilter.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 pb-20 relative">
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`bg-${themeColor}-600 p-2 rounded-lg text-white transition-colors duration-300`}><GraduationCap size={24} /></div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100 transition-colors duration-300">맞춤 단어 사전</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => { setShowSettings(!showSettings); setShowColorPicker(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border ${showSettings ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                <span className={`text-xs font-bold ${selectedModel === MODELS.ADVANCED ? `text-${themeColor}-400` : 'text-slate-500'}`}>{selectedModel === MODELS.BASIC ? 'Basic' : 'Pro'}</span>
                <Settings size={20} />
              </button>
              {showSettings && (
                <div className="absolute right-0 top-12 bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-3 z-30 animate-in fade-in slide-in-from-top-2 w-64">
                   <p className="text-xs font-semibold text-slate-400 mb-3 px-1">AI 모델 선택</p>
                   <div className="space-y-2">
                      <button onClick={() => { setSelectedModel(MODELS.BASIC); setShowSettings(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${selectedModel === MODELS.BASIC ? `bg-${themeColor}-600/20 border border-${themeColor}-500/50 text-${themeColor}-100` : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent text-slate-300'}`}>
                         <div className={`p-2 rounded-lg ${selectedModel === MODELS.BASIC ? `bg-${themeColor}-600` : 'bg-slate-600'}`}><Zap size={16} className="text-white" /></div>
                         <div className="text-left"><div className="text-sm font-bold">기본 (Fast)</div><div className="text-xs opacity-70">빠른 응답 속도</div></div>
                      </button>
                      <button onClick={() => { setSelectedModel(MODELS.ADVANCED); setShowSettings(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${selectedModel === MODELS.ADVANCED ? `bg-${themeColor}-600/20 border border-${themeColor}-500/50 text-${themeColor}-100` : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent text-slate-300'}`}>
                         <div className={`p-2 rounded-lg ${selectedModel === MODELS.ADVANCED ? `bg-${themeColor}-600` : 'bg-slate-600'}`}><BrainCircuit size={16} className="text-white" /></div>
                         <div className="text-left"><div className="text-sm font-bold">고성능 (Pro)</div><div className="text-xs opacity-70">더 정확하고 깊이 있는 설명</div></div>
                      </button>
                   </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button onClick={() => { setShowColorPicker(!showColorPicker); setShowSettings(false); }} className={`p-2 rounded-full transition-colors ${showColorPicker ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:bg-slate-800'}`}><Palette size={20} /></button>
              {showColorPicker && (
                  <div className="absolute right-0 top-12 bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-3 z-30 animate-in fade-in slide-in-from-top-2 w-48">
                      <p className="text-xs font-semibold text-slate-400 mb-2 px-1">테마 색상 선택</p>
                      <div className="grid grid-cols-3 gap-2">{COLORS.map((color) => <button key={color} onClick={() => { setThemeColor(color); localStorage.setItem(THEME_KEY, color); setShowColorPicker(false); }} className={`w-10 h-10 rounded-full bg-${color}-500 hover:scale-110 transition-all flex items-center justify-center ${themeColor === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`} />)}</div>
                  </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {(showColorPicker || showSettings) && <div className="fixed inset-0 z-10" onClick={() => { setShowColorPicker(false); setShowSettings(false); }}></div>}

      <main className="max-w-md mx-auto px-4 py-6">
        <div className="mb-6">
          <p className="text-sm font-semibold text-slate-400 mb-3 ml-1">학년을 선택해주세요</p>
          <div className="flex justify-between gap-2">
            <LevelBadge level={StudentLevel.ELEMENTARY} selected={selectedLevel === StudentLevel.ELEMENTARY} onClick={() => setSelectedLevel(StudentLevel.ELEMENTARY)} />
            <LevelBadge level={StudentLevel.MIDDLE} selected={selectedLevel === StudentLevel.MIDDLE} onClick={() => setSelectedLevel(StudentLevel.MIDDLE)} />
            <LevelBadge level={StudentLevel.HIGH} selected={selectedLevel === StudentLevel.HIGH} onClick={() => setSelectedLevel(StudentLevel.HIGH)} />
          </div>
        </div>

        <form onSubmit={handleSearch} className="mb-8 relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className={`text-slate-500 group-focus-within:text-${themeColor}-500 transition-colors`} size={20} /></div>
          <input type="text" value={inputWord} onChange={(e) => setInputWord(e.target.value)} placeholder="단어를 입력하세요 (예: 배, 눈, 사과)" className={`w-full pl-11 ${inputWord ? 'pr-28' : 'pr-14'} py-4 bg-slate-800 border-2 border-slate-700 rounded-2xl text-lg text-white placeholder-slate-500 focus:outline-none focus:border-${themeColor}-500 focus:ring-4 focus:ring-${themeColor}-500/20 transition-all shadow-sm`} />
          {inputWord && <button type="button" onClick={handleRefresh} className="absolute right-14 top-2 bottom-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 p-2 rounded-xl transition-all flex items-center justify-center aspect-square" title="초기화"><RotateCcw size={20} /></button>}
          <button type="submit" disabled={loading || !inputWord.trim()} className={`absolute right-2 top-2 bottom-2 bg-${themeColor}-600 hover:bg-${themeColor}-700 disabled:bg-slate-700 disabled:text-slate-500 text-white p-2 rounded-xl transition-colors flex items-center justify-center aspect-square shadow-sm`}>{loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}</button>
        </form>

        {error && <div className="mb-6 p-4 bg-red-900/30 border border-red-800/50 text-red-400 rounded-xl text-center text-sm font-medium animate-pulse">{error}</div>}

        {result ? (
          <WordCard data={result} level={selectedLevel} themeColor={themeColor} onRelatedWordClick={handleRelatedWordClick} />
        ) : (
          <div className="space-y-6">
            {!loading && history.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4 text-slate-500 font-semibold text-xs uppercase tracking-wider"><BookMarked size={14} /> 최근 검색한 단어</div>
                <div className="relative mb-4 group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className={`text-slate-500 group-focus-within:text-${themeColor}-500 transition-colors`} size={14} /></div>
                    <input type="text" value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)} placeholder="기록에서 찾기..." className={`w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-${themeColor}-500 focus:ring-2 focus:ring-${themeColor}-500/20 transition-all placeholder:text-slate-500`} />
                </div>
                <div className="grid gap-2">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((item, idx) => (
                        <div key={idx} onClick={() => { setInputWord(item.word); setSelectedLevel(item.level); window.scrollTo({ top: 0, behavior: 'smooth' }); executeSearch(item.word, item.level); }} className={`bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm flex items-center justify-between cursor-pointer hover:border-${themeColor}-500/50 hover:bg-slate-800/80 transition-all`}>
                            <div><span className="font-bold text-slate-200 mr-2">{item.word}</span><span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">{item.level}</span></div>
                            <ArrowRight size={16} className="text-slate-600" />
                        </div>
                    ))
                  ) : <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-xl"><p className="text-sm">검색 결과가 없습니다.</p></div>}
                </div>
              </div>
            )}
            {!loading && history.length === 0 && (
              <div className="text-center py-12 text-slate-600">
                <BookMarked size={48} className="mx-auto mb-4 opacity-20" />
                <p>궁금한 단어를 검색해보세요!</p>
                <p className="text-sm mt-1 text-slate-500">학년에 맞춰 쉽게 설명해드립니다.</p>
              </div>
            )}
          </div>
        )}
      </main>
      {showScrollTop && <button onClick={scrollToTop} className={`fixed bottom-6 right-6 p-4 bg-${themeColor}-600 text-white rounded-full shadow-xl hover:bg-${themeColor}-700 hover:-translate-y-1 transition-all duration-300 z-40 animate-in fade-in slide-in-from-bottom-8 group`} aria-label="맨 위로 스크롤"><ArrowUp size={24} className="group-hover:-translate-y-0.5 transition-transform duration-300" /></button>}
    </div>
  );
};
export default App;