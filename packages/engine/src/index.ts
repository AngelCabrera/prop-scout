import 'dotenv/config';
import { runAgentDiscovery } from './scrapers/discovery.js';

async function main() {
    console.log("🚀 Starting Prop Scout Engine...");
    
    while (true) {
        try {
            await runAgentDiscovery();
            console.log("😴 Discovery cycle complete. Sleeping for 24 hours to protect free tier quota...");
            await new Promise(resolve => setTimeout(resolve, 24 * 60 * 60 * 1000));
        } catch (error) {
            console.error("❌ Error in discovery cycle:", error);
            await new Promise(resolve => setTimeout(resolve, 1 * 60 * 60 * 1000)); // Wait 1 hour on error
        }
    }
}

main().catch(console.error);
