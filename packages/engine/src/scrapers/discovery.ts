import { verifyAgentIdentity } from '../services/ai.js';
import { ACTIVE_PROFILES } from '../config/profiles.js';

export async function runAgentDiscovery() {
    const potentialAgents = ['@tuinmueble_cumana', '@venezuela_ventas_123', '@century21_sucre'];

    const profile = ACTIVE_PROFILES[0]; // Cumaná

    console.log("🕵️ Starting Agent Verification with Gemini 2.5 Flash...");

    for (const username of potentialAgents) {
        const analysis = await verifyAgentIdentity(username, profile.city);

        console.log(`User: ${username}`);
        console.log(`Legit: ${analysis.is_legit_agent}`);
        console.log(`Agency: ${analysis.agency_name}`);
        console.log(`Confidence: ${analysis.confidence_score}%`);
        console.log("---");

        if (analysis.is_legit_agent && analysis.confidence_score > 80) {
            console.log("✅ Added to Trusted List");
        }
    }
}
