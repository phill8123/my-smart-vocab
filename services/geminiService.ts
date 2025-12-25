import { GoogleGenAI, Type } from "@google/genai";
import { SearchResponse, UniversityDepartment } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = "gemini-3-flash-preview";

// 1. 가벼운 검색 (기본 정보만 조회)
export const searchDepartments = async (query: string): Promise<SearchResponse> => {
  const prompt = `
    당신은 대한민국 '대학어디가' 입시 전문가입니다.
    사용자 검색어: "${query}"
    
    **지시사항**:
    1. 검색어와 관련된 대학/학과 리스트를 반환하세요.
    2. **속도 최적화를 위해 대학명, 학과명, 계열, 위치 정보만 반환하세요.**
    3. 입시 결과, 설명, 등록금 등 세부 정보는 절대 생성하지 마세요.
    4. **[CRITICAL] 순위 선정 기준**: '정시(수능) 입시결과(백분위)'와 '대학 인지도/평판(Reputation)'을 종합적으로 고려하여, 입학 성적이 높고 명문대일수록 리스트의 **상단**에 위치시켜야 합니다.
    5. **상위 20개 내외의 가장 관련성 높은 결과만 반환하세요.**
    6. 'estimatedTotalCount'는 전체 개설 대학 수(추정)를 정수로 입력하세요.

    **응답 형식**: JSON 포맷만 반환하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2048 }, 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimatedTotalCount: { type: Type.INTEGER },
            departments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  universityName: { type: Type.STRING },
                  departmentName: { type: Type.STRING },
                  location: { type: Type.STRING },
                  field: { type: Type.STRING }
                },
                required: ["universityName", "departmentName", "location", "field"]
              }
            }
          },
          required: ["estimatedTotalCount", "departments"]
        }
      }
    });

    let jsonStr = response.text;
    if (!jsonStr) throw new Error("API returned empty response");
    
    jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/```$/, "").trim();

    const parsed = JSON.parse(jsonStr) as { estimatedTotalCount: number, departments: Omit<UniversityDepartment, 'id' | 'admissionData' | 'description' | 'tuitionFee' | 'employmentRate' | 'departmentRanking'>[] };
    
    const fullDepartments: UniversityDepartment[] = parsed.departments.map((dept, index) => ({
      ...dept,
      id: `${dept.universityName}-${dept.departmentName}-${index}`,
      admissionData: [],
      description: "",
      tuitionFee: "",
      employmentRate: "",
      departmentRanking: ""
    }));

    return {
      estimatedTotalCount: parsed.estimatedTotalCount,
      departments: fullDepartments
    };
  } catch (error) {
    console.error("Search Error:", error);
    throw error;
  }
};

// 2. 상세 정보 조회 (모달 오픈 시 호출)
export const getDepartmentDetails = async (universityName: string, departmentName: string): Promise<UniversityDepartment> => {
  // [Robust Implementation]
  // 1. Removed responseMimeType: 'application/json' to prevent conflict with googleSearch tool.
  // 2. Used Regex to extract JSON from the text response which may contain grounding info.
  // 3. Guaranteed fallback data return on ANY error to prevent UI crash.

  const prompt = `
    Role: Korean University Admissions Expert.
    Task: Find detailed admission data for: **${universityName} ${departmentName}**.
    
    Instructions:
    1. **Search**: Use Google Search to find "2025학년도 ${universityName} ${departmentName} 수시 정시 등급", "2024 입결", "등록금", "취업률", "학과소개".
    2. **Data Extraction**:
       - Admission Data (2025, 2024, 2023). If 2025 is missing, estimate or use 2024.
       - Description, Tuition, Employment Rate, Ranking.
    3. **Output Format**: 
       - Return a **SINGLE JSON OBJECT** inside code blocks or just raw JSON.
       - Do not include conversational text outside the JSON.

    JSON Structure:
    {
      "admissionData": [
        { "year": "2025", "susiGyogwa": "...", "susiJonghap": "...", "jeongsi": "..." },
        { "year": "2024", "susiGyogwa": "...", "susiJonghap": "...", "jeongsi": "..." }
      ],
      "description": "...",
      "tuitionFee": "...",
      "employmentRate": "...",
      "departmentRanking": "..."
    }
  `;

  // Safe fallback data
  const fallbackData: UniversityDepartment = {
    id: "",
    universityName,
    departmentName,
    location: "",
    field: "",
    admissionData: [],
    description: "상세 정보를 불러오는 데 실패했습니다. 잠시 후 다시 시도해주시거나 '대학어디가'를 참고해주세요.",
    tuitionFee: "-",
    employmentRate: "-",
    departmentRanking: "-"
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // Note: responseMimeType is intentionally omitted to allow the model to use the tool freely.
      }
    });

    const text = response.text || "";
    
    // Extract JSON using Regex (first looking for code block, then general object)
    let jsonStr = "";
    const codeBlockMatch = text.match(/```json([\s\S]*?)```/);
    
    if (codeBlockMatch && codeBlockMatch[1]) {
      jsonStr = codeBlockMatch[1].trim();
    } else {
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }
    }

    if (!jsonStr) {
      console.warn("No JSON found in response. Raw text:", text);
      return fallbackData;
    }

    const parsed = JSON.parse(jsonStr);

    return {
      id: "",
      universityName,
      departmentName,
      location: "",
      field: "",
      admissionData: Array.isArray(parsed.admissionData) ? parsed.admissionData : [],
      description: parsed.description || "정보 없음",
      tuitionFee: parsed.tuitionFee || "-",
      employmentRate: parsed.employmentRate || "-",
      departmentRanking: parsed.departmentRanking || "-"
    };

  } catch (error) {
    console.error("Detail API Error (Handled):", error);
    return fallbackData;
  }
};
