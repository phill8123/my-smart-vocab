import React from 'react';
import { StudentLevel } from '../types';

interface LevelBadgeProps {
  level: StudentLevel;
  selected?: boolean;
  onClick?: () => void;
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({ level, selected = false, onClick }) => {
  const getColors = (lvl: StudentLevel) => {
    switch (lvl) {
      case StudentLevel.ELEMENTARY:
        return selected 
          ? 'bg-green-500 text-white border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]' 
          : 'bg-slate-800 text-green-400 border-slate-700 hover:bg-slate-700 hover:border-green-500/50';
      case StudentLevel.MIDDLE:
        return selected 
          ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]' 
          : 'bg-slate-800 text-blue-400 border-slate-700 hover:bg-slate-700 hover:border-blue-500/50';
      case StudentLevel.HIGH:
        return selected 
          ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
          : 'bg-slate-800 text-purple-400 border-slate-700 hover:bg-slate-700 hover:border-purple-500/50';
      case StudentLevel.ACADEMIC:
        return selected 
          ? 'bg-cyan-600 text-white border-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.4)]' 
          : 'bg-slate-800 text-cyan-400 border-slate-700 hover:bg-slate-700 hover:border-cyan-500/50';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 border ${getColors(level)}`}
    >
      {level}
    </button>
  );
};
