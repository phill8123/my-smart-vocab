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
  // [강력한 에러 방지] 
  // 1. responseMimeType: 'application/json'으로 JSON 강제
  // 2. responseSchema는 제거하여 검색 결과 텍스트가 섞이는 문제 방지
  // 3. try-catch에서 에러 발생 시 빈 객체 리턴하여 모달이 깨지는 것 방지

  const prompt = `
    Role: Korean University Admissions Expert.
    Task: Find detailed admission data for: **${universityName} ${departmentName}**.
    
    Instructions:
    1. **Search**: Use Google Search to find "2025학년도 ${universityName} ${departmentName} 수시 정시 등급", "2024 입결", "등록금", "취업률", "학과소개".
    2. **Admission Data**: Find data for 2025, 2024, 2023. If 2025 is not available, use 2024 data and mark clearly.
    3. **Output format**: JSON only.
    
    JSON Structure:
    {
      "admissionData": [
        { "year": "2025", "susiGyogwa": "...", "susiJonghap": "...", "jeongsi": "..." },
        { "year": "2024", "susiGyogwa": "...", "susiJonghap": "...", "jeongsi": "..." },
        { "year": "2023", "susiGyogwa": "...", "susiJonghap": "...", "jeongsi": "..." }
      ],
      "description": "Short department introduction in Korean.",
      "tuitionFee": "Yearly tuition (e.g. 780만원)",
      "employmentRate": "Employment rate (e.g. 75%)",
      "departmentRanking": "Department reputation/ranking summary"
    }
  `;

  const fallbackData: UniversityDepartment = {
    id: "", // caller will merge
    universityName,
    departmentName,
    location: "", // caller will merge
    field: "", // caller will merge
    admissionData: [],
    description: "상세 정보를 불러오는 데 실패했습니다. 아래 버튼을 통해 '대학어디가'나 '네이버'에서 직접 확인해보세요.",
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
        responseMimeType: "application/json", // JSON 모드 강제
      }
    });

    let jsonStr = response.text || "{}";
    
    // 마크다운 코드 블록 제거 (혹시 포함될 경우)
    if (jsonStr.includes("```")) {
       jsonStr = jsonStr.replace(/^```\w*\s*/, "").replace(/\s*```$/, "").trim();
    }

    const parsed = JSON.parse(jsonStr);

    return {
      id: "",
      universityName,
      departmentName,
      location: "",
      field: "",
      admissionData: Array.isArray(parsed.admissionData) ? parsed.admissionData : [],
      description: parsed.description || "정보를 불러올 수 없습니다.",
      tuitionFee: parsed.tuitionFee || "-",
      employmentRate: parsed.employmentRate || "-",
      departmentRanking: parsed.departmentRanking || "-"
    };

  } catch (error) {
    console.error("Detail Error (Handled):", error);
    // 에러를 던지지 않고 기본값(fallbackData)을 반환하여 모달이 닫히거나 에러 화면이 뜨는 것을 방지
    return fallbackData;
  }
};
