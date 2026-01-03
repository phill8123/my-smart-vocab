import { GoogleGenAI, Type, Schema } from "@google/genai";
import { StudentLevel, WordData } from "../types";

// Vercel 배포 시 TypeScript 빌드 오류 방지를 위한 전역 변수 선언
declare const process: {
  env: {
    API_KEY: string;
  }
};

// Initialize Gemini Client
// API 키가 없는 경우 빈 문자열로 초기화하여 초기 로딩 크래시 방지 (호출 시점 검증)
const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

const wordSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING, description: "The word being defined (in its original language)" },
    emoji: { type: Type.STRING, description: "A single representative emoji." },
    pronunciation: { type: Type.STRING, description: "Pronunciation guide. For Korean: '[Sound] / Romanization'. For English: 'IPA [phonetic] / Hangul reading' (e.g., [æpl] 애플)." },
    meanings: {
      type: Type.ARRAY,
      description: "List of meanings.",
      items: {
        type: Type.OBJECT,
        properties: {
          context: { type: Type.STRING, description: "Context label (e.g., 'Fruit', 'Law')." },
          emoji: { type: Type.STRING, description: "Specific emoji." },
          definition: { type: Type.STRING, description: "Definition in KOREAN." },
          englishTranslation: { type: Type.STRING, description: "CRITICAL: The direct translation word. If input is Korean -> English word (e.g. 'Apple'). If input is English -> KOREAN word (e.g. '사과' or '귀')." },
          hanja: { type: Type.STRING, description: "If Korean: The Hanja (e.g. 謝過). If English: Leave empty or provide Latin/Greek root if Academic level." },
          exampleSentence: { type: Type.STRING, description: "Example sentence (Korean for Korean words, English with Korean translation for English words)." },
          synonyms: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Synonyms." },
          antonyms: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Antonyms." },
          etymology: { type: Type.STRING, description: "Etymology explanation." },
          wordStructure: { type: Type.STRING, description: "Morphological analysis." },
        },
        required: ["context", "emoji", "definition", "englishTranslation", "exampleSentence", "etymology"]
      }
    },
    literacyImprovement: {
      type: Type.STRING,
      description: "A short text passage improving literacy/vocabulary usage."
    },
    idioms: {
      type: Type.ARRAY,
      description: "Idioms or collocations.",
      items: {
        type: Type.OBJECT,
        properties: {
          expression: { type: Type.STRING, description: "Idiom expression." },
          meaning: { type: Type.STRING, description: "Meaning of the idiom." }
        },
        required: ["expression", "meaning"]
      }
    },
    relatedWords: {
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT,
        properties: {
            word: { type: Type.STRING, description: "Related word." },
            emoji: { type: Type.STRING, description: "Emoji." }
        },
        required: ["word", "emoji"]
      }, 
      description: "Related words."
    },
    tags: {
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "Keywords."
    }
  },
  required: ["word", "emoji", "pronunciation", "meanings", "literacyImprovement", "relatedWords", "idioms"],
};

const fetchTextDefinition = async (word: string, level: StudentLevel, modelName: string): Promise<WordData> => {
  // 1. API 키 검증 (Vercel 배포 오류 방지용)
  if (!apiKey || apiKey === "undefined") {
    throw new Error("API 키가 설정되지 않았습니다. Vercel 환경 변수(API_KEY)를 확인해주세요.");
  }

  let levelInstructions = "";

  if (level === StudentLevel.ELEMENTARY) {
    levelInstructions = `
      TARGET AUDIENCE: 7-10 year old Korean children.
      ROLE: Kindergarten teacher.
      TONE: Friendly, warm, use emojis, ending "~해요".
      DEFINITION: Simple Korean.
      IF ENGLISH WORD: Explain meaning in very simple Korean.
    `;
  } else if (level === StudentLevel.MIDDLE) {
    levelInstructions = `
      TARGET AUDIENCE: 14-16 year old Korean teenagers.
      ROLE: School subject teacher.
      TONE: Informative, standard, ending "~이다/입니다".
      DEFINITION: Textbook style.
    `;
  } else if (level === StudentLevel.HIGH) {
    levelInstructions = `
      TARGET AUDIENCE: 17-19 year old Korean students.
      ROLE: High school teacher.
      TONE: Formal, precise.
      DEFINITION: Essay/Exam suitable.
    `;
  } else {
    // ACADEMIC (Expert)
    levelInstructions = `
      TARGET AUDIENCE: Professionals/Adults.
      ROLE: University Professor.
      TONE: Academic, rigorous.
      DEFINITION: Scholarly depth.
    `;
  }

  const prompt = `
    Analyze the word: "${word}".
    
    1. **LANGUAGE DETECTION**:
       - If "${word}" is **Korean**: Act as a Korean-Korean Dictionary (国語辞典).
         - 'hanja' field is required.
         - 'englishTranslation' MUST be the English translation.
       - If "${word}" is **English**: Act as an English-Korean Dictionary (英韓辞典).
         - 'definition' MUST be in KOREAN.
         - 'englishTranslation' MUST be the direct KOREAN equivalent word (e.g. for input 'ear', return '귀').
         - 'hanja' field should be empty (or Latin root if Academic).
         - 'pronunciation' should provide IPA and Korean phonetic reading.
         - 'exampleSentence' should be in English, followed by Korean translation.
    
    ${levelInstructions}
    
    2. **STRICT RULES**:
       - **Homonyms**: If the word has multiple meanings with different origins (e.g. '배' pear/boat/stomach OR 'bank' river/money), list them as separate meanings in the array.
       - **Spelling**: 
         - For Korean: Strict exact match only.
         - For English: Case-insensitive (Apple = apple).
    
    REQUIREMENTS:
    - Output: JSON format based on the schema.
    - Context: Provide a short context label (e.g. 'Body Part', 'Nature').
    - Emoji: Provide a specific emoji for EACH meaning.
    - Idioms: Include common Korean idioms (for Korean words) or useful collocations (for English words).
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: wordSchema,
      systemInstruction: "You are a bilingual (Korean/English) vocabulary AI helper. You define words based on the user's input language, always providing definitions in KOREAN suitable for the requested student level.",
      thinkingConfig: { thinkingBudget: 0 }
    }
  });

  const text = response.text;
  if (!text) throw new Error("AI 응답이 비어있습니다.");
  
  // Clean up potential Markdown formatting
  const cleanedText = text.replace(/```json|```/g, '').trim();
  
  try {
    return JSON.parse(cleanedText) as WordData;
  } catch (e) {
    console.error("JSON Parsing Error:", e);
    throw new Error("데이터를 처리하는 중 문제가 발생했습니다.");
  }
};

export const fetchWordDefinition = async (word: string, level: StudentLevel, model: string = 'gemini-3-flash-preview'): Promise<WordData> => {
  try {
    return await fetchTextDefinition(word, level, model);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const errorMessage = error.message || error.toString();
    if (errorMessage.includes("API 키")) {
      throw new Error(errorMessage);
    }
    throw new Error(`[오류 발생] ${errorMessage}`);
  }
};
