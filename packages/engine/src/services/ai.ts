import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MarketProfile } from '../config/profiles';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'REDACTED');

// 🚀 MODEL 1: The Speed Demon (Parsing HTML)
const parserModel = genAI.getGenerativeModel({ 
    model: "gemini-3-flash-preview",
    systemInstruction: "You are a specialized Data Extraction Bot for Venezuela. You DO NOT hallucinate. If a price is missing, you return -1. You understand 'k', 'mil', 'millones' (Bs vs USD context).",
    generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
    }
});

// 🕵️ MODEL 2: The Detective (Agent Verification)
const detectiveModel = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    tools: [
        { googleSearch: {} } as any
    ]
});

/**
 * TASK 1: ANALYZE LISTING (Uses Gemini 3 Flash)
 */
export async function analyzeListing(text: string, profile: MarketProfile) {
    const prompt = `
    You are a Real Estate Expert in ${profile.city}, ${profile.country}.
    Strategy: ${profile.price_strategy}.
    
    INPUT TEXT:
    "${text.slice(0, 20000)}" 
    
    INSTRUCTIONS:
    1. Extract Price (${profile.currency}). Handle "20" -> 20,000 logic if LATAM_CHAOS.
    2. Water Status: Look for 'Tanque', 'Pozo', 'Cisterna'.
    3. Score (0-100): Based on location safety and value.
    
    OUTPUT JSON SCHEMA:
    {
        "price_usd": number,
        "location_zone": string,
        "water_status": "Tank" | "Well" | "None" | "Unknown",
        "ai_score": number,
        "ai_summary": string,
        "specs": { "bedrooms": number, "bathrooms": number, "m2": number }
    }
    `;

    try {
        const result = await parserModel.generateContent(prompt);
        return JSON.parse(result.response.text());
    } catch (error) {
        console.error("⚡ Parser Error (Gemini 3):", error);
        return null;
    }
}

/**
 * TASK 2: VERIFY AGENT (Uses Gemini 2.5 Flash + Google Search)
 */
export async function verifyAgentIdentity(username: string, city: string) {
    const prompt = `
    Research this Instagram user: "${username}" in the context of Real Estate in ${city}.
    
    Use Google Search to find:
    1. Do they have a profile on other sites (Century21, Remax, LinkedIn)?
    2. Are there scam reports?
    
    Return JSON:
    {
        "is_legit_agent": boolean,
        "agency_name": string | null,
        "confidence_score": number (0-100),
        "found_on_web": boolean
    }
    `;

    try {
        const result = await detectiveModel.generateContent(prompt);
        const text = result.response.text();
        
        const jsonStr = text.replace(/```json|```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("🕵️ Detective Error (Gemini 2.5):", error);
        return { is_legit_agent: false, confidence_score: 0 };
    }
}
