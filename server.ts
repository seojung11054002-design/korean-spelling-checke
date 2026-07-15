import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini AI to prevent crash if key is missing during startup
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing. AI Studio secrets panel에서 API Key를 설정해주세요.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function generateContentWithFallbackAndRetry(
  ai: GoogleGenAI,
  params: {
    contents: string;
    config: any;
  }
): Promise<any> {
  const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.5-flash"];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    let attempt = 0;
    const maxRetries = 2; // 2 attempts per model
    let delay = 1000; // start with 1 second delay

    while (attempt < maxRetries) {
      try {
        console.log(`[AI-API] Attempting model ${modelName} (attempt ${attempt + 1}/${maxRetries})...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (error: any) {
        lastError = error;
        attempt++;
        
        const errorString = String(error.message || error);
        const isTransient = 
          errorString.includes("503") || 
          errorString.includes("UNAVAILABLE") || 
          errorString.includes("429") || 
          errorString.includes("temp") || 
          errorString.includes("demand") ||
          error.status === 503 || 
          error.status === 429;

        if (isTransient) {
          if (attempt < maxRetries) {
            console.warn(`[AI-API] Transient error on ${modelName}: ${errorString}. Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
          } else {
            console.warn(`[AI-API] All retries failed for model ${modelName}. Trying next fallback model if available...`);
          }
        } else {
          // If it's a non-transient error (e.g. invalid request or auth error), throw it immediately
          throw error;
        }
      }
    }
  }

  throw lastError || new Error("All attempts and fallback models failed.");
}

// API Routes
app.post("/api/check", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "검사할 텍스트를 입력해주세요." });
    }

    if (text.trim().length === 0) {
      return res.json({
        correctedText: "",
        corrections: [],
      });
    }

    const ai = getAiClient();

    const systemInstruction = `
당신은 대한민국 최고의 한국어 문법 및 맞춤법 전문가입니다.
사용자가 입력한 한국어 텍스트를 분석하여 띄어쓰기(spacing), 맞춤법(spelling), 문법 및 표준어 오류(grammar), 올바르지 않은 표현이나 스타일(style) 등을 꼼꼼하게 검사하고 교정해야 합니다.

규칙:
1. 원문의 의미와 뉘앙스를 훼손하지 않으면서 자연스러운 현대 한국어로 교정합니다.
2. 만약 오류가 전혀 없다면, 'correctedText'를 원문과 동일하게 설정하고, 'corrections' 배열은 빈 배열([])로 반환합니다.
3. 교정 대상이 여러 개 있을 경우 각각 분리하여 'corrections' 배열에 추가합니다.
4. 설명('explanation')은 왜 틀렸는지 원인을 아주 짧고 직관적인 존댓말로 설명합니다. 빠른 처리를 위해 핵심 규정만 1문장 이내(35자 내외)로 극도로 명확하게 작성하십시오.
5. 'category'는 'spacing'(띄어쓰기), 'spelling'(맞춤법), 'grammar'(문법), 'style'(표현/문체) 중 하나로 정확하게 지정하십시오.
`;

    const response = await generateContentWithFallbackAndRetry(ai, {
      contents: `다음 한국어 텍스트의 맞춤법, 띄어쓰기, 문법을 교정해주세요:\n\n${text}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            correctedText: {
              type: Type.STRING,
              description: "오류가 완벽히 교정된 전체 텍스트. 줄바꿈과 포맷을 가급적 유지하십시오.",
            },
            corrections: {
              type: Type.ARRAY,
              description: "원문에서 발견된 교정 항목들의 목록입니다.",
              items: {
                type: Type.OBJECT,
                properties: {
                  original: {
                    type: Type.STRING,
                    description: "원문에서 잘못된 단어 또는 어구 (정확히 원문에 포함된 철자여야 함)",
                  },
                  corrected: {
                    type: Type.STRING,
                    description: "올바르게 교정된 단어 또는 어구",
                  },
                  category: {
                    type: Type.STRING,
                    description: "오류 종류: 'spacing', 'spelling', 'grammar', 'style' 중 하나",
                  },
                  explanation: {
                    type: Type.STRING,
                    description: "어째서 틀렸는지에 대한 아주 짧은 핵심 설명 (1문장 이내)",
                  },
                },
                required: ["original", "corrected", "category", "explanation"],
              },
            },
          },
          required: ["correctedText", "corrections"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Gemini로부터 비어있는 응답을 받았습니다.");
    }

    let cleanedText = resultText.trim();
    // Strip markdown code block wrappers if present (e.g. ```json ... ```)
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText
        .replace(/^```(?:json)?\n?/i, "")
        .replace(/\n?```$/, "")
        .trim();
    }

    try {
      const data = JSON.parse(cleanedText);
      
      // Ensure expected fields exist and have correct types
      if (typeof data.correctedText !== "string") {
        data.correctedText = text;
      }
      if (!Array.isArray(data.corrections)) {
        data.corrections = [];
      } else {
        // Sanitize corrections to ensure they match our interface
        data.corrections = data.corrections.filter((c: any) => {
          return (
            c &&
            typeof c.original === "string" &&
            typeof c.corrected === "string" &&
            typeof c.explanation === "string" &&
            ["spacing", "spelling", "grammar", "style"].includes(c.category)
          );
        });
      }
      
      res.json(data);
    } catch (parseError: any) {
      console.error("JSON Parse Error:", parseError, "Original Result Text:", resultText);
      throw new Error("응답 데이터를 분석하는 데 실패했습니다. 올바른 형식의 JSON이 아닙니다.");
    }
  } catch (error: any) {
    console.error("Spelling Check API Error:", error);
    res.status(500).json({
      error: "맞춤법 검사 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      details: error.message,
    });
  }
});

// Configure Vite or Static Files
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
