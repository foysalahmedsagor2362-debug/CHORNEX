import { GoogleGenAI } from "@google/genai";
import { NewsResponse, Language, NewsHighlight } from "../types";

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

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchNewsUpdates = async (
  language: Language,
  previousHighlights: NewsHighlight[] = []
): Promise<{ data: NewsResponse; sources: any[] }> => {
  
  const model = "gemini-2.5-flash"; // Supports search grounding
  
  const prompt = `
    Current Time: ${new Date().toISOString()}
    Target Language: ${language}
    
    Previous Highlights Context:
    ${JSON.stringify(previousHighlights)}

    INSTRUCTION:
    1. Search for the absolute latest global news.
    2. Search specifically for major news events in Bangladesh from the last 12 hours.
    3. Compare with the "Previous Highlights Context".
    4. If significant new stories exist, generate a new list. This list MUST contain:
       - Top global news highlights.
       - EXACTLY ONE highlight specifically about Bangladesh (category: "bangladesh").
    5. Ensure each highlight includes a valid source URL in the "url" field.
    6. If the news cycle is slow and nothing major has changed since the previous list, return status "NO NEW UPDATE" and include the previous list.
    7. Output raw JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        // responseMimeType is NOT allowed with googleSearch, so we parse manually
      },
    });

    const text = response.text || "{}";
    
    // Clean markdown if present (e.g. ```json ... ```)
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsedData: NewsResponse;
    try {
        parsedData = JSON.parse(cleanText);
    } catch (e) {
        console.error("Failed to parse JSON", text);
        throw new Error("Invalid response format from news engine.");
    }

    // Extract grounding metadata for sources
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map((chunk: any) => chunk.web)
      .filter((web: any) => web && web.uri && web.title);

    return { data: parsedData, sources };

  } catch (error) {
    console.error("News fetch error:", error);
    throw error;
  }
};