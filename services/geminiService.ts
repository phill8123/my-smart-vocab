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
  // 상세 정보 조회 시에는 Schema 모드 대신 강력한 프롬프트 + 정규식 파싱 사용
  // 이유: Google Search 도구와 strict responseSchema가 충돌하여 빈 응답이나 에러를 유발하는 경우가 있음
  const prompt = `
    Find detailed 3-year admission data (2025, 2024, 2023) for: **${universityName} ${departmentName}**
    
    **INSTRUCTIONS**:
    1. **Search**: Use Google Search to find "2025학년도 ${universityName} ${departmentName} 수시 정시 등급", "2024 입결", "등록금", "취업률", "학과소개".
    2. **MANDATORY**: You MUST try to find **2025학년도 입시결과** (Su-si/Jeong-si). 
       - If exact 2025 data is not fully available, look for "2025 전형계획" or "모집요강" content.
       - If truly unavailable, clearly state "정보 없음" or use 2024 data as an estimate marked "(예상)".
    3. **Fields**:
       - 'admissionData': Array of objects for 2023, 2024, 2025.
       - 'description': Brief introduction (Korean).
       - 'tuitionFee': Annual fee (e.g. "약 800만원").
       - 'employmentRate': e.g. "75.2%".
       - 'departmentRanking': Reputation summary.

    **OUTPUT FORMAT**:
    - **EXTREMELY IMPORTANT**: Return **ONLY** a valid JSON object.
    - Do not add "Here is the JSON" or Markdown code blocks if possible.
    - Just the raw JSON string starting with '{' and ending with '}'.
    
    JSON Template:
    {
      "admissionData": [
        { "year": "2023", "susiGyogwa": "...", "susiJonghap": "...", "jeongsi": "..." },
        { "year": "2024", "susiGyogwa": "...", "susiJonghap": "...", "jeongsi": "..." },
        { "year": "2025", "susiGyogwa": "...", "susiJonghap": "...", "jeongsi": "..." }
      ],
      "description": "...",
      "tuitionFee": "...",
      "employmentRate": "...",
      "departmentRanking": "..."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // responseSchema 제거: 검색 도구와 함께 사용 시 안정성 확보
      }
    });

    const text = response.text || "";
    
    // JSON 추출을 위한 강력한 정규식 (Markdown 코드블록 무시하고 첫 번째 JSON 객체 탐색)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.error("Gemini Raw Response:", text);
      throw new Error("데이터 형식이 올바르지 않습니다 (JSON 파싱 실패).");
    }
    
    const jsonStr = jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    return parsed as UniversityDepartment;

  } catch (error) {
    console.error("Detail Error:", error);
    throw new Error("상세 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
};
