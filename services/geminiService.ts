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

// Initialize AI Client Safely
let ai: GoogleGenAI;
try {
  // process.env.API_KEY is injected by Vite. If empty, the service will gracefully fail later.
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
} catch (e) {
  console.error("Failed to initialize Gemini Client", e);
}

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

  // 2. Validate Configuration
  if (!process.env.API_KEY) {
     console.warn("API Key is missing.");
     // Return a specific error highlight for missing configuration
     const configErrorData = { ...FALLBACK_DATA };
     configErrorData.highlights = [{
        headline: "Configuration Required",
        summary: "The News Engine API Key is missing. Please configure the API_KEY environment variable in your deployment settings.",
        category: "security",
        timestamp: "Setup Error",
        url: "#"
     }];
     return { data: configErrorData, sources: [] };
  }

  const model = "gemini-2.5-flash"; 
  
  // OPTIMIZATION: Reduce token usage by sending only minimal context
  const simplifiedContext = previousHighlights.map(h => ({
      headline: h.headline, 
      category: h.category
  }));

  const prompt = `
    Current Time: ${new Date().toISOString()}
    Target Language: ${language}
    
    Previous Highlights Context (Check for duplicates against this):
    ${JSON.stringify(simplifiedContext)}

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
      },
    });

    const text = response.text || "{}";
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

    // Save successful fetch to cache
    localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: parsedData,
        sources,
        timestamp: Date.now(),
        lang: language
    }));

    return { data: parsedData, sources };

  } catch (error: any) {
    console.error("News fetch error details:", error);
    
    // FAIL-SAFE STRATEGY:
    // Regardless of the error (Network, 429 Quota, Parsing, Auth), 
    // we try to serve CACHE first, then fall back to STATIC data.
    // We NEVER throw an error that crashes the UI.

    // 1. Try Cache (Any language is better than error)
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        try {
            const { data, sources } = JSON.parse(cached);
            // Mark as QUOTA_EXCEEDED so the UI shows the "Archive" badge
            return { 
                data: { ...data, status: 'QUOTA_EXCEEDED' }, 
                sources 
            };
        } catch (e) {
            // ignore cache parse error
        }
    }
    
    // 2. Return Static Fallback if no cache available
    return { data: FALLBACK_DATA, sources: [] };
  }
};