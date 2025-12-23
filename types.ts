export enum StudentLevel {
  ELEMENTARY = '초등학생',
  MIDDLE = '중학생',
  HIGH = '고등학생',
}

export type ThemeColor = 'indigo' | 'rose' | 'emerald' | 'amber' | 'violet' | 'sky';

export interface WordMeaning {
  context: string;
  emoji: string;
  definition: string;
  englishTranslation: string;
  hanja?: string;
  pronunciation?: string;
  exampleSentence: string;
  synonyms: string[];
  antonyms: string[];
  etymology?: string;
  wordStructure?: string;
}

export interface RelatedWord {
  word: string;
  emoji: string;
}

export interface WordData {
  word: string;
  emoji: string;
  pronunciation: string;
  meanings: WordMeaning[];
  literacyImprovement: string;
  relatedWords: RelatedWord[];
  tags: string[];
}

export interface SearchHistoryItem {
  word: string;
  level: StudentLevel;
  timestamp: number;
}