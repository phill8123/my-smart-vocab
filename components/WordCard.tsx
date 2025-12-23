import React from 'react';
import { BookOpen, Sparkles, Lightbulb, Search, PenTool, History, Layers, ArrowRightLeft, Copy, Split } from 'lucide-react';
import { WordData, StudentLevel, ThemeColor } from '../types';

interface WordCardProps {
  data: WordData;
  level: StudentLevel;
  themeColor: ThemeColor;
  onRelatedWordClick: (word: string) => void;
}

export const WordCard: React.FC<WordCardProps> = ({ data, level, themeColor, onRelatedWordClick }) => {
  const isElementary = level === StudentLevel.ELEMENTARY;
  
  // Logic to distinguish Homonyms vs Polysemes
  const hasMultipleMeanings = data.meanings.length > 1;
  
  // Treat undefined/empty hanja as a distinct 'Native' origin.
  // This ensures words like "말" (Horse-Hanja vs Speech-Native) are correctly identified as Homonyms.
  const distinctOrigins = new Set(data.meanings.map(m => m.hanja ? m.hanja.trim() : 'NATIVE_ORIGIN'));
  
  // If there are multiple meanings and distinct origins (different Hanja or Hanja vs Native), it's a Homonym.
  const isHomonym = hasMultipleMeanings && distinctOrigins.size > 1;
  
  // If there are multiple meanings but they share the same origin (same Hanja or all Native), it's Polysemous.
  const isPolysemous = hasMultipleMeanings && !isHomonym;

  return (
    <div className="w-full space-y-8 animate-card-entrance">
      <div className={`w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100`}>
        <div className={`p-6 sm:p-8 ${isElementary ? 'bg-green-50' : 'bg-slate-50'}`}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-3">
                    {/* Show top emoji only if it's NOT a homonym, to avoid confusion. For homonyms, we rely on meaning-specific emojis. */}
                    {!isHomonym && data.emoji && <span className="text-4xl sm:text-5xl filter drop-shadow-sm">{data.emoji}</span>}
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-800 leading-tight">{data.word}</h2>
                </div>
                {data.pronunciation && <span className="text-slate-500 text-lg font-mono tracking-tight">[{data.pronunciation}]</span>}
                
                {isHomonym && (
                  <span className={`flex items-center gap-1 ml-1 px-3 py-1 rounded-full text-xs font-bold border ${isElementary ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
                    <Split size={12} /> 동음이의어
                  </span>
                )}
                
                {isPolysemous && (
                  <span className={`flex items-center gap-1 ml-1 px-3 py-1 rounded-full text-xs font-bold border ${isElementary ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
                    <Layers size={12} /> 다의어
                  </span>
                )}
            </div>
            {data.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                    {data.tags.map((tag, i) => <span key={i} className={`text-xs px-2 py-1 rounded-md bg-white/60 border border-slate-200/60 text-slate-500 font-medium`}>#{tag}</span>)}
                </div>
            )}
        </div>
      </div>

      {data.meanings.map((meaning, idx) => {
        return (
          <div key={idx} className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 relative">
            <div className={`px-6 py-4 flex items-center justify-between border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <div className="flex items-center gap-3">
                    <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white shadow-sm ${idx === 0 ? `bg-${themeColor}-500` : 'bg-slate-400'}`}>{idx + 1}</span>
                    {meaning.emoji && <span className="text-2xl filter drop-shadow-sm ml-1" role="img" aria-label={meaning.context}>{meaning.emoji}</span>}
                    <h3 className={`text-xl font-bold text-slate-800 ml-1`}>{meaning.context}</h3>
                    {meaning.hanja && <span className="text-xl text-slate-700 font-black font-serif ml-1 tracking-wide">({meaning.hanja})</span>}
                </div>
            </div>
            
            <div className="p-6 sm:p-8 space-y-6">
                <div>
                    <div className="flex items-center gap-2 mb-2 text-slate-500 text-sm font-bold uppercase tracking-wider">
                        <BookOpen size={14} /> 뜻 <span className="text-slate-900 font-extrabold ml-1">({meaning.englishTranslation})</span>
                    </div>
                    <p className={`text-lg sm:text-xl leading-relaxed font-medium text-slate-800 break-keep`}>{meaning.definition}</p>
                </div>
                <div className={`p-4 rounded-xl bg-amber-50 border border-amber-100 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={48} className="text-amber-500" /></div>
                    <p className="text-lg text-slate-700 italic leading-loose relative z-10 break-keep">"{meaning.exampleSentence}"</p>
                </div>
                {(meaning.synonyms?.length > 0 || meaning.antonyms?.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        {meaning.synonyms?.length > 0 && (
                             <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="flex items-center gap-1 text-xs font-bold text-slate-500 uppercase tracking-wider"><Copy size={12} /> 유의어</span>
                                <div className="flex flex-wrap gap-2">{meaning.synonyms.map((s, i) => <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 text-sm font-medium shadow-sm">{s}</span>)}</div>
                             </div>
                        )}
                         {meaning.antonyms?.length > 0 && (
                             <div className="flex flex-col gap-2 p-3 bg-red-50/50 rounded-lg border border-red-100">
                                <span className="flex items-center gap-1 text-xs font-bold text-red-400 uppercase tracking-wider"><ArrowRightLeft size={12} /> 반의어</span>
                                <div className="flex flex-wrap gap-2">{meaning.antonyms.map((s, i) => <span key={i} className="px-2 py-1 bg-white border border-red-100 rounded text-red-700 text-sm font-medium shadow-sm">{s}</span>)}</div>
                             </div>
                        )}
                    </div>
                )}
                {((meaning.etymology && meaning.etymology.length > 2) || (meaning.wordStructure && meaning.wordStructure.length > 2)) && (
                    <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-sm mt-2">
                        <div className="flex items-center gap-2 mb-2 text-blue-600 font-bold uppercase tracking-wider"><History size={14} /> {isElementary ? '단어의 비밀' : '어원 풀이'}</div>
                         <p className="text-slate-700 leading-relaxed whitespace-pre-line break-keep">{meaning.etymology}{meaning.wordStructure && `\n\n${meaning.wordStructure}`}</p>
                    </div>
                )}
            </div>
          </div>
        );
      })}

      <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 p-6 sm:p-8 space-y-6">
        {data.relatedWords?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 text-violet-600 font-bold text-sm uppercase tracking-wider"><Lightbulb size={18} /> 함께 배우면 좋은 단어</div>
            <div className="flex flex-wrap gap-2.5">
              {data.relatedWords.map((item, i) => (
                <button key={i} onClick={() => onRelatedWordClick(item.word)} className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white text-violet-700 hover:bg-violet-100 transition-colors border border-violet-200 text-base font-medium shadow-sm">
                  <span className="text-lg leading-none filter drop-shadow-sm">{item.emoji}</span>
                  <span>{item.word}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {data.literacyImprovement && (
          <div className="p-5 rounded-xl border border-emerald-100 bg-emerald-50">
            <div className="flex items-center gap-2 mb-3 text-emerald-600 font-bold text-sm uppercase tracking-wider"><PenTool size={18} /> 문해력 쑥쑥</div>
            <p className="text-lg text-slate-700 leading-loose whitespace-pre-line break-keep">{data.literacyImprovement}</p>
          </div>
        )}
      </div>
    </div>
  );
};