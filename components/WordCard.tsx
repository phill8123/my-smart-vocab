import React, { useState, useRef, useEffect } from 'react';
import { Volume2, BookOpen, Sparkles, Square, Lightbulb, Search, PenTool, History, Image as ImageIcon, Layers, ArrowRightLeft, Copy, ImageOff, RefreshCw, Loader2 } from 'lucide-react';
import { WordData, StudentLevel, ThemeColor } from '../types';
import { generateSpeech } from '../services/geminiService';

interface WordCardProps {
  data: WordData;
  level: StudentLevel;
  themeColor: ThemeColor;
  onRelatedWordClick: (word: string) => void;
  onRetryImage: (index: number) => void;
}

interface LazyImageProps {
  src?: string | null;
  alt: string;
  context: string;
  onRetry?: () => void;
}

const LazyImage: React.FC<LazyImageProps> = ({ src, alt, onRetry }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  const isLoadingFromApi = src === undefined;
  const hasImage = typeof src === 'string';
  const isError = src === null;

  return (
    <div ref={imgRef} className="w-full bg-slate-100/50 flex justify-center items-center py-4 border-b border-slate-100 min-h-[250px] relative overflow-hidden group">
      {(isLoadingFromApi || (hasImage && !isLoaded)) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
           <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
           <div className="flex flex-col items-center gap-3 opacity-30">
             <div className="bg-slate-300 rounded-full p-4"><ImageIcon size={32} /></div>
             <span className="text-sm font-medium text-slate-500">{isLoadingFromApi ? '그림을 그리고 있어요...' : '이미지 불러오는 중...'}</span>
           </div>
        </div>
      )}
      {isError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-3">
            <div className="bg-slate-100 p-3 rounded-full group-hover:bg-slate-200 transition-colors"><ImageOff size={24} /></div>
            <div className="text-center">
                <p className="text-xs font-medium mb-2 text-slate-500">이미지를 불러오지 못했습니다</p>
                {onRetry && (
                    <button onClick={(e) => { e.stopPropagation(); onRetry(); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all">
                        <RefreshCw size={12} /> 다시 그리기
                    </button>
                )}
            </div>
        </div>
      )}
      {isVisible && hasImage && (
        <img src={src} alt={alt} onLoad={() => setIsLoaded(true)} className={`max-h-64 object-contain w-full transition-opacity duration-700 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`} />
      )}
    </div>
  );
};

export const WordCard: React.FC<WordCardProps> = ({ data, level, themeColor, onRelatedWordClick, onRetryImage }) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [loadingAudioIndex, setLoadingAudioIndex] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCache = useRef<Map<number, Promise<string | undefined>>>(new Map());

  useEffect(() => {
    return () => { stopAudio(); if (audioContextRef.current) audioContextRef.current.close(); };
  }, []);

  const stopAudio = () => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) {}
      audioSourceRef.current = null;
    }
    setPlayingIndex(null);
  };

  const getAudioPromise = (text: string, index: number) => {
    if (audioCache.current.has(index)) return audioCache.current.get(index)!;
    const promise = generateSpeech(text);
    audioCache.current.set(index, promise);
    return promise;
  };

  const playAudio = async (textToSpeak: string, index: number) => {
    if (playingIndex === index) { stopAudio(); return; }
    stopAudio();
    setLoadingAudioIndex(index);

    try {
      const base64Audio = await getAudioPromise(textToSpeak, index);
      if (!base64Audio) throw new Error("Audio generation failed");

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) channelData[i] = dataInt16[i] / 32768.0;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setPlayingIndex(null);
      
      audioSourceRef.current = source;
      source.start();
      setPlayingIndex(index);
    } catch (error) {
      console.error("Audio playback error:", error);
      setPlayingIndex(null);
    } finally {
      setLoadingAudioIndex(null);
    }
  };

  const isElementary = level === StudentLevel.ELEMENTARY;
  const isPolysemous = data.meanings.length > 1;

  return (
    <div className="w-full space-y-8 animate-card-entrance">
      <div className={`w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100`}>
        <div className={`p-6 sm:p-8 ${isElementary ? 'bg-green-50' : 'bg-slate-50'}`}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-800 leading-tight">{data.word}</h2>
                {data.pronunciation && <span className="text-slate-500 text-lg font-mono tracking-tight">[{data.pronunciation}]</span>}
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
        const textToSpeak = `${data.word}. ${meaning.context}의 뜻은, ${meaning.definition}. 예를 들어, ${meaning.exampleSentence}`;
        return (
          <div key={idx} className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 relative">
            <div className={`px-6 py-4 flex items-center justify-between border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <div className="flex items-center gap-3">
                    <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white shadow-sm ${idx === 0 ? `bg-${themeColor}-500` : 'bg-slate-400'}`}>{idx + 1}</span>
                    <h3 className={`text-xl font-bold text-slate-800`}>{meaning.context}</h3>
                    {meaning.hanja && <span className="text-xl text-slate-700 font-black font-serif ml-1 tracking-wide">({meaning.hanja})</span>}
                </div>
                <button onClick={() => playAudio(textToSpeak, idx)} onMouseEnter={() => getAudioPromise(textToSpeak, idx)} disabled={loadingAudioIndex === idx} className={`p-2.5 rounded-full transition-all flex items-center justify-center ${playingIndex === idx ? `bg-${themeColor}-100 text-${themeColor}-600` : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                    {loadingAudioIndex === idx ? <Loader2 size={24} className="animate-spin text-slate-400" /> : playingIndex === idx ? <Square size={20} className="fill-current" /> : <Volume2 size={24} />}
                </button>
            </div>
            <LazyImage src={meaning.imageUrl} alt={`${data.word} - ${meaning.context}`} context={meaning.context} onRetry={() => onRetryImage(idx)} />
            <div className="p-6 sm:p-8 space-y-6">
                <div>
                    <div className="flex items-center gap-2 mb-2 text-slate-400 text-sm font-bold uppercase tracking-wider"><BookOpen size={14} /> 뜻 ({meaning.englishTranslation})</div>
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
            <div className="flex flex-wrap gap-2.5">{data.relatedWords.map((word, i) => <button key={i} onClick={() => onRelatedWordClick(word)} className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white text-violet-700 hover:bg-violet-100 transition-colors border border-violet-200 text-base font-medium shadow-sm"><Search size={14} className="text-violet-400" /> {word}</button>)}</div>
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
