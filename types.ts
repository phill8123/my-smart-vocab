export enum StudentLevel {
  ELEMENTARY = '초등학생',
  MIDDLE = '중학생',
  HIGH = '고등학생',
}

export type ThemeColor = 'indigo' | 'rose' | 'emerald' | 'amber' | 'violet' | 'sky';

export interface WordMeaning {
  context: string;
  definition: string;
  englishTranslation: string;
  hanja?: string;
  pronunciation?: string;
  exampleSentence: string;
  synonyms: string[];
  antonyms: string[];
  etymology?: string;
  wordStructure?: string;
  imageUrl?: string | null;
}

export interface WordData {
  word: string;
  pronunciation: string;
  meanings: WordMeaning[];
  literacyImprovement: string;
  relatedWords: string[];
  tags: string[];
}

export interface SearchHistoryItem {
  word: string;
  level: StudentLevel;
  timestamp: number;
}