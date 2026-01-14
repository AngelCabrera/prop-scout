import axios from 'axios';
import * as cheerio from 'cheerio';
import { verifyAgentIdentity } from '../services/ai.js';
import { ACTIVE_PROFILES } from '../config/profiles.js';

const CUMANA_PROFILE = ACTIVE_PROFILES[0];

/**
 * THE RECRUITER 🕵️‍♂️
 * Hunts for new agent profiles on Google/Instagram
 */
export async function runRecruiter() {
    console.log(`🕵️‍♂️ Recruiter started for ${CUMANA_PROFILE.city}...`);

    // 1. SEARCH PHASE
    // Searching for "Inmobiliaria Cumaná Instagram" patterns
    const query = encodeURIComponent(`site:instagram.com "inmobiliaria" "${CUMANA_PROFILE.city}" -explore -tags`);
    // Using DuckDuckGo HTML endpoint as a zero-cost search
    const searchUrl = `https://html.duckduckgo.com/html/?q=${query}`;
    
    const candidates = new Set<string>();

    try {
        console.log(`🔍 Searching via DuckDuckGo: ${searchUrl}`);
        const { data } = await axios.get(searchUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } 
        });
        
        const $ = cheerio.load(data);
        
        $('.result__a').each((i, el) => {
            const href = $(el).attr('href');
            // Extract username: instagram.com/username/
            const match = href?.match(/instagram\.com\/([a-zA-Z0-9_.]+)\/?/);
            if (match && match[1]) {
                const username = match[1];
                // Filter out obviously non-user pages
                if (!['p', 'explore', 'reel', 'stories', 'tags', 'tv'].includes(username)) {
                    candidates.add(username);
                }
            }
        });
    } catch (e) {
        console.error("❌ Search failed:", e);
    }

    console.log(`🧐 Found ${candidates.size} candidates. Vetting with Gemini...`);

    // 2. VETTING PHASE (Gemini 2.5 Detective)
    const newRecruits = [];

    for (const username of candidates) {
        process.stdout.write(`Analyzing ${username}... `);
        
        // Validate Identity
        const check = await verifyAgentIdentity(username, CUMANA_PROFILE.city);
        
        if (check.is_legit_agent && (check.confidence_score || 0) > 80) {
            console.log(`✅ HIRED! (${check.agency_name || 'Independent'})`);
            newRecruits.push({
                username: username,
                platform: 'IG',
                city_scope: CUMANA_PROFILE.city
            });
        } else {
            console.log(`❌ Rejected.`);
        }
        
        // Safety delay
        await new Promise(r => setTimeout(r, 2000));
    }

    // 3. ONBOARDING (Save to DB via API)
    if (newRecruits.length > 0) {
        try {
            const url = `${process.env.CF_API_URL}/agents/recruit`;
            await axios.post(url, newRecruits, {
                headers: { 'x-api-secret': process.env.CF_API_SECRET }
            });
            console.log(`🎉 Added ${newRecruits.length} new agents to the roster!`);
        } catch (error) {
            console.error("❌ Failed to onboard recruits:", error);
        }
    } else {
        console.log("😴 No new recruits found this cycle.");
    }
}
