import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CUMANA_PROFILE } from '../config/profiles.js';

// Use Gemini 3 Flash for fast classification of the Snippet
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const classifierModel = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash", // Latest stable model (1M tokens input, 65K output)
    generationConfig: { responseMimeType: "application/json" }
});

const SEARCH_QUERIES = [
    `"bienes raices" ${CUMANA_PROFILE.city}`,
    `"asesor inmobiliario" ${CUMANA_PROFILE.city}`,
    `"inmobiliaria" ${CUMANA_PROFILE.city}`,
    `"remax" ${CUMANA_PROFILE.city}`,
    `"century21" ${CUMANA_PROFILE.city}`,
    `"venta de casas" ${CUMANA_PROFILE.city}`
];

export async function runRecruiter() {
    console.log(`🕵️‍♂️ Recruiter 2.0 (Google API) started for ${CUMANA_PROFILE.city}...`);

    if (!process.env.GOOGLE_SEARCH_CX || !process.env.GOOGLE_SEARCH_KEY) {
        console.warn("⚠️ Google Search CX or Key missing. Skipping Recruiter 2.0 run.");
        return;
    }

    const candidates = new Map<string, any>(); // Map to dedup by username

    // 1. SEARCH PHASE (Loop through keywords)
    for (const query of SEARCH_QUERIES) {
        console.log(`� Searching: ${query}...`);
        
        try {
            const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
                params: {
                    key: process.env.GOOGLE_SEARCH_KEY,
                    cx: process.env.GOOGLE_SEARCH_CX,
                    q: `site:instagram.com ${query}`, // Force IG
                    num: 10 // Max per page
                }
            });

            if (!data.items) continue;

            for (const item of data.items) {
                // Extract username from URL
                // Format: https://www.instagram.com/username/
                const match = item.link.match(/instagram\.com\/([a-zA-Z0-9_.]+)\/?/);
                if (match && match[1]) {
                    const username = match[1];
                    // Filter generic IG pages
                    if (['p', 'reel', 'stories', 'explore', 'tags', 'tv'].includes(username)) continue;

                    // Store candidate with the snippet for AI analysis
                    // Use set to ensure uniqueness
                    if (!candidates.has(username)) {
                        candidates.set(username, {
                            username,
                            title: item.title,
                            snippet: item.snippet
                        });
                    }
                }
            }
        } catch (e: any) {
            console.error(`❌ Search failed for "${query}":`, e.message);
        }
    }

    console.log(`🧐 Found ${candidates.size} unique candidates. Vetting...`);

    // 2. VETTING PHASE (Batch or Fast Loop)
    const newRecruits = [];

    for (const [username, info] of candidates) {
        // AI JUDGMENT: Is this snippet describing a realtor in the target city?
        // CRITICAL UPDATE: Google already matched the City keyword. We just need to confirm they are an AGENT.
        const prompt = `
        Search Context: "Real Estate Agents in Cumaná, Venezuela"
        
        Analyze this Instagram Search Result:
        User: ${username}
        Title: ${info.title}
        Snippet: ${info.snippet}

        Task: Is this user a Real Estate Agent, Agency, or Realtor?
        
        Since this result came from a query for "Cumaná", assume the location match is likely correct unless the text explicitly contradicts it (e.g., "Real Estate in Madrid").
        
        Return JSON: { "is_agent": boolean, "confidence": number (0-100), "reason": "short explanation" }
        `;

        try {
            const result = await classifierModel.generateContent(prompt);
            const text = result.response.text();
            // Clean markdown json if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const analysis = JSON.parse(jsonStr);

            // Normalize confidence to 0-100 if it came back as 0-1
            let score = analysis.confidence;
            if (score <= 1) score = score * 100;

            if (analysis.is_agent && score > 60) {
                console.log(`✅ MATCH: ${username} (${analysis.reason}) - Score: ${score}`);
                newRecruits.push({
                    username: username,
                    platform: 'IG',
                    city_scope: CUMANA_PROFILE.city
                });
            } else {
                console.log(`❌ Rejected: ${username} (${analysis.reason})`);
            }
        } catch (e) {
            console.error("AI Check failed", e);
        }
    }

    // 3. ONBOARDING
    if (newRecruits.length > 0) {
        // Send to Cloudflare API
        try {
            await axios.post(`${process.env.CF_API_URL}/agents/recruit`, newRecruits, {
                headers: { 'x-api-secret': process.env.CF_API_SECRET }
            });
            console.log(`🎉 Added ${newRecruits.length} new agents!`);
        } catch (e) {
            console.error("Failed to save agents to DB", e);
        }
    } else {
        console.log("No new agents found this run.");
    }
}
