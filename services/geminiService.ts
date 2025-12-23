import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { StudentLevel, WordData, WordMeaning } from "../types";

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
    pronunciation: { type: Type.STRING, description: "Phonetic pronunciation guide" },
    meanings: {
      type: Type.ARRAY,
      description: "A list of distinct meanings. If the word is a homonym or polysemous, list them separately. List up to 5 most frequently used meanings.",
      items: {
        type: Type.OBJECT,
        properties: {
          context: { type: Type.STRING, description: "A short label distinguishing this meaning (e.g., 'Fruit', 'Transportation')." },
          definition: { type: Type.STRING, description: "Definition tailored to the student level." },
          englishTranslation: { type: Type.STRING, description: "English translation for this specific meaning." },
          hanja: { type: Type.STRING, description: "Hanja for this specific meaning (if applicable)." },
          exampleSentence: { type: Type.STRING, description: "Example sentence using this specific meaning." },
          synonyms: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Synonyms." },
          antonyms: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Antonyms." },
          etymology: { type: Type.STRING, description: "Etymology specific to this meaning/Hanja." },
          wordStructure: { type: Type.STRING, description: "Morphological analysis if applicable." },
        },
        required: ["context", "definition", "englishTranslation", "exampleSentence", "etymology"]
      }
    },
    literacyImprovement: {
      type: Type.STRING,
      description: "A short text passage (2-5 sentences) improving literacy."
    },
    relatedWords: {
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "List of 3-4 related words."
    },
    tags: {
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "Keywords describing the word."
    }
  },
  required: ["word", "pronunciation", "meanings", "literacyImprovement", "relatedWords"],
};

const getPromptForImage = (word: string, context: string, level: StudentLevel): string => {
  const commonStyle = "Style: Flat 2D Vector Art, Emoticon/Sticker style. Thick bold outlines, solid flat colors, no shading, no gradients, no 3D effects. Minimalist and clean. White background. CRITICAL RULE: DO NOT include any text, letters, words, hangul, or characters in the image. Visuals only.";

  switch (level) {
    case StudentLevel.ELEMENTARY:
      return `${commonStyle}
      Subject: A very cute and adorable 2D sticker representing the word "${word}" in the context of "${context}".
      Details: Kawaii style, rounded shapes, expressive face if applicable, bright and cheerful colors. Looks like a popular messenger app sticker. Just the object or character, no writing.`;
    case StudentLevel.MIDDLE:
      return `${commonStyle}
      Subject: A clean and cool 2D icon representing the word "${word}" in the context of "${context}".
      Details: Modern flat design, geometric simplicity, bold lines, looks like a high-quality vector icon. Symbolism over realism. No text.`;
    case StudentLevel.HIGH:
      return `${commonStyle}
      Subject: A stylish and minimalist 2D vector illustration of the word "${word}" in the context of "${context}".
      Details: Sophisticated line art or flat graphic, limited color palette, trendy graphic design style. Simple but meaningful abstraction. No text.`;
    default:
      return `A simple 2D emoticon illustration of "${word}" (Context: ${context}). No text.`;
  }
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
    REQUIREMENTS:
    1. Homonyms/Polysemes: Separate distinct meanings (e.g. '배' -> Pear, Boat, Stomach).
    2. Context: Provide a short context label.
    3. Hanja: Provide specific Hanja.
    4. Output: JSON format.
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: wordSchema,
      systemInstruction: "You are a specialized Korean vocabulary AI. Identify and separate homonyms and polysemous words clearly."
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

export const generateImage = async (word: string, context: string, level: StudentLevel): Promise<string | undefined> => {
  try {
    const model = "gemini-2.5-flash-image";
    const prompt = getPromptForImage(word, context, level);
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "4:3" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  } catch (error) {
    console.warn(`Image generation failed for ${word}`, error);
    return undefined;
  }
  return undefined;
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { parts: [{ text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Speech generation failed", error);
    return undefined;
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