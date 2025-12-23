import { GoogleGenAI, Type, Schema } from "@google/genai";
import { StudentLevel, WordData } from "../types";

// Vercel 배포 시 TypeScript 빌드 오류 방지를 위한 전역 변수 선언
declare const process: {
  env: {
    API_KEY: string;
  }
};

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const wordSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING, description: "The word being defined" },
    emoji: { type: Type.STRING, description: "A single representative emoji for the word. If it's a homonym, choose the most common meaning's emoji." },
    pronunciation: { type: Type.STRING, description: "Standard Korean pronunciation (Hangul sound) and Romanization. e.g. '사:과 / sa-gwa'" },
    meanings: {
      type: Type.ARRAY,
      description: "A list of distinct meanings. If the word is a homonym (same spelling, different origin) or polysemous (same origin, multiple meanings), list them separately.",
      items: {
        type: Type.OBJECT,
        properties: {
          context: { type: Type.STRING, description: "A short label distinguishing this meaning (e.g., 'Fruit', 'Transportation')." },
          emoji: { type: Type.STRING, description: "A specific emoji representing this particular meaning (e.g. 🍐 for pear, ⛵ for boat)." },
          definition: { type: Type.STRING, description: "Definition tailored to the student level." },
          englishTranslation: { type: Type.STRING, description: "English translation for this specific meaning." },
          hanja: { type: Type.STRING, description: "Hanja for this specific meaning (if applicable)." },
          exampleSentence: { type: Type.STRING, description: "Example sentence using this specific meaning." },
          synonyms: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Synonyms." },
          antonyms: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Antonyms." },
          etymology: { type: Type.STRING, description: "Etymology specific to this meaning/Hanja." },
          wordStructure: { type: Type.STRING, description: "Morphological analysis if applicable." },
        },
        required: ["context", "emoji", "definition", "englishTranslation", "exampleSentence", "etymology"]
      }
    },
    literacyImprovement: {
      type: Type.STRING,
      description: "A short text passage (2-5 sentences) improving literacy."
    },
    relatedWords: {
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT,
        properties: {
            word: { type: Type.STRING, description: "The related word." },
            emoji: { type: Type.STRING, description: "A representative emoji for this word." }
        },
        required: ["word", "emoji"]
      }, 
      description: "List of 3-4 related words with representative emojis."
    },
    tags: {
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "Keywords describing the word."
    }
  },
  required: ["word", "emoji", "pronunciation", "meanings", "literacyImprovement", "relatedWords"],
};

const fetchTextDefinition = async (word: string, level: StudentLevel, modelName: string): Promise<WordData> => {
  let levelInstructions = "";

  if (level === StudentLevel.ELEMENTARY) {
    levelInstructions = `
      TARGET AUDIENCE: 7-10 year old Korean children.
      ROLE: A kind, cheerful kindergarten teacher.
      TONE: Friendly, warm, enthusiastic. Use emojis.
      DEFINITION RULES: Use simple native Korean words. Avoid difficult Hanja. Ending: "~해요". Explain like you are telling a story.
      ETYMOLOGY RULES: Explain as "단어의 비밀" (Secret of the word) in a fun way.
    `;
  } else if (level === StudentLevel.MIDDLE) {
    levelInstructions = `
      TARGET AUDIENCE: 14-16 year old Korean teenagers.
      ROLE: A cool and knowledgeable school subject teacher.
      TONE: Informative, standard, encouraging but not childish.
      DEFINITION RULES: Standard textbook definition. Ending: "~이다" or "~입니다". Connect to school subjects if possible.
      ETYMOLOGY RULES: "글자 풀이". Break down the word structure logically.
    `;
  } else {
    levelInstructions = `
      TARGET AUDIENCE: 17-19 year old Korean students (High school/Pre-college).
      ROLE: A university professor or academic mentor.
      TONE: Formal, academic, precise, intellectual.
      DEFINITION RULES: Comprehensive, academic definition suitable for essays or exams. Ending: "~다". Include nuance and usage context.
      ETYMOLOGY RULES: Strict Hanja breakdown and academic origin.
    `;
  }

  const prompt = `
    Analyze the Korean word: "${word}".
    ${levelInstructions}
    
    *** CRITICAL INSTRUCTION: STRICT SPELLING ENFORCEMENT ***
    1. EXACT MATCH ONLY: 
       - You must ONLY provide definitions for words that are spelled EXACTLY as "${word}" (Hangul).
       - ABSOLUTELY DO NOT include words that sound the same but have different spelling (Homophones).
       - Example FAILURE: User searches "경의" (Respect), AI returns "경이" (Wonder). -> THIS IS FORBIDDEN.
       - Example SUCCESS: User searches "배", AI returns "배 (Pear)", "배 (Boat)", "배 (Stomach)". -> This is allowed (Homonyms with same spelling).
       - Example SUCCESS: User searches "눈", AI returns "눈 (Eye)", "눈 (Snow)". -> This is allowed.
    
    2. HOMONYM vs POLYSEME:
       - If the exact spelling "${word}" corresponds to multiple different Hanja origins (Homonyms), list them as separate meanings.
       - If the exact spelling "${word}" has one origin but multiple meanings (Polysemes), list them as separate meanings.
       - Ensure 'hanja' field is accurate for each meaning to allow distinguishing homonyms.

    REQUIREMENTS:
    - Context: Provide a short context label (e.g. 'Body Part', 'Nature').
    - Emoji: Provide a specific emoji for EACH meaning.
    - Hanja: Provide specific Hanja for each meaning.
    - Output: JSON format.
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: wordSchema,
      systemInstruction: "You are a strict Korean vocabulary AI. You NEVER confuse words with different spellings, even if they sound identical. You strictly define ONLY the word provided in the prompt.",
      thinkingConfig: { thinkingBudget: 0 }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No text response from AI");
  
  // Clean up potential Markdown formatting (e.g., ```json ... ```) which often breaks JSON parsing
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
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("단어 정보를 가져오는데 실패했습니다. 잠시 후 다시 시도해주세요.");
  }
};