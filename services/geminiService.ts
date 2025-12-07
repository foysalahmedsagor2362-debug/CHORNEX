import { GoogleGenAI } from "@google/genai";
import { NewsResponse, Language, NewsHighlight } from "../types";

const CACHE_KEY = 'chornex_news_cache_v3';
// Cache valid for 15 minutes to avoid hitting rate limits frequently
const CACHE_DURATION_MS = 15 * 60 * 1000; 

const SYSTEM_INSTRUCTION = `
You are the automated news summarization engine for CHORNEX, a modern international news website.

YOUR JOB:
- Collect the latest global news.
- IMPORTANT: You MUST include exactly one (1) major news highlight specifically from Bangladesh.
- Produce ONLY short, clear highlight summaries.
- If there are no new updates compared to the provided previous highlights, return the previous highlights with a "NO NEW UPDATE" status.

WHAT TO FOCUS ON:
- International headlines (top priority).
- EXACTLY ONE major news story from Bangladesh.
- Global politics, economy, conflicts, technology, climate, major events.

SUMMARY STYLE:
- Each highlight should be 1–3 sentences.
- Must be factual, neutral, and concise.
- No opinions, no predictions, no exaggeration.

OUTPUT FORMAT:
Return valid JSON only. Do not use Markdown code blocks.
Structure:
{
  "generated_at": "YYYY-MM-DD HH:MM UTC",
  "language": "en or bn",
  "status": "OK" or "NO NEW UPDATE",
  "highlights": [
    {
      "headline": "...",
      "summary": "...",
      "url": "https://source.link/article",
      "category": "world/economy/tech/security/climate/bangladesh",
      "timestamp": "just now / 1m ago / 5m ago"
    }
  ]
}
`;

// Emergency data to show when API quota is completely exhausted and no cache exists
const FALLBACK_DATA: NewsResponse = {
  generated_at: new Date().toISOString(),
  language: 'en',
  status: 'QUOTA_EXCEEDED',
  highlights: [
    {
      headline: "System Maintenance: Live Feed Paused",
      summary: "The neural news engine is currently under high load or maintenance. We are serving an archival snapshot while we restore real-time connectivity.",
      category: "tech",
      timestamp: "System Message",
      url: "#"
    },
    {
      headline: "Global Markets Review",
      summary: "Major indices show resilience amidst shifting economic policies. Tech and energy sectors lead the volatility as investors await quarterly reports.",
      category: "economy",
      timestamp: "Archived",
      url: "#"
    },
    {
      headline: "International Cooperation on Climate",
      summary: "New frameworks for carbon reduction are being discussed by G20 nations, aiming for significant milestones by 2030.",
      category: "climate",
      timestamp: "Archived",
      url: "#"
    },
    {
      headline: "Development Update: Bangladesh",
      summary: "Infrastructure projects in major cities continue to progress, with new transport initiatives expected to ease congestion significantly.",
      category: "bangladesh",
      timestamp: "Archived",
      url: "#"
    }
  ]
};

// --- OPENAI FALLBACK HANDLER ---
const fetchOpenAIFallback = async (prompt: string, language: Language): Promise<NewsResponse> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API Key not configured");

  console.log("Attempting OpenAI Fallback...");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices[0]?.message?.content || "{}";
  return JSON.parse(text);
};

export const fetchNewsUpdates = async (
  language: Language,
  previousHighlights: NewsHighlight[] = []
): Promise<{ data: NewsResponse; sources: any[] }> => {
  
  // 1. Check for valid fresh cache before making any API calls
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { data, sources, timestamp, lang } = JSON.parse(cached);
      const isFresh = (Date.now() - timestamp) < CACHE_DURATION_MS;
      
      if (isFresh && lang === language) {
         console.log("Serving fresh cache to preserve API quota");
         return { data, sources };
      }
    } catch (e) {
      localStorage.removeItem(CACHE_KEY);
    }
  }

  // 2. Prepare Prompt
  const simplifiedContext = previousHighlights.map(h => ({
      headline: h.headline, 
      category: h.category
  }));

  const prompt = `
    Current Time: ${new Date().toISOString()}
    Target Language: ${language}
    
    Previous Highlights Context:
    ${JSON.stringify(simplifiedContext)}

    INSTRUCTION:
    1. Search/Generate absolute latest global news.
    2. Include exactly ONE major news from Bangladesh.
    3. Output raw JSON matching the schema.
  `;

  // 3. Attempt Gemini (Primary)
  try {
    if (!process.env.API_KEY) throw new Error("Gemini API Key missing");
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "{}";
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanText);

    // Extract grounding metadata for sources
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map((chunk: any) => chunk.web)
      .filter((web: any) => web && web.uri && web.title);

    // Cache success
    localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: parsedData,
        sources,
        timestamp: Date.now(),
        lang: language
    }));

    return { data: parsedData, sources };

  } catch (error: any) {
    console.warn("Primary Provider (Gemini) Failed:", error.message);
    
    // 4. Attempt OpenAI (Fallback)
    if (process.env.OPENAI_API_KEY) {
      try {
        const openAIData = await fetchOpenAIFallback(prompt, language);
        
        // Cache OpenAI success
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: openAIData,
            sources: [], // OpenAI doesn't provide grounding sources easily in this mode
            timestamp: Date.now(),
            lang: language
        }));

        return { data: openAIData, sources: [] };
      } catch (openAIError: any) {
        console.warn("Secondary Provider (OpenAI) Failed:", openAIError.message);
      }
    }

    // 5. Emergency Fallback (If both fail or no Cache)
    // Check if we have OLD cache to serve instead of generic fallback?
    if (cached) {
      try {
        const { data, sources } = JSON.parse(cached);
        return { 
            data: { ...data, status: 'QUOTA_EXCEEDED' }, 
            sources 
        };
      } catch (e) {}
    }
    
    return { data: FALLBACK_DATA, sources: [] };
  }
};