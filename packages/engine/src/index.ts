import 'dotenv/config';
import { runAgentDiscovery } from './scrapers/discovery.js';

async function main() {
    console.log("🚀 Starting Prop Scout Engine...");
    
    while (true) {
        try {
            await runAgentDiscovery();
            console.log("😴 Discovery cycle complete. Sleeping for 1 hour...");
            await new Promise(resolve => setTimeout(resolve, 60 * 60 * 1000));
        } catch (error) {
            console.error("❌ Error in discovery cycle:", error);
            await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // Wait 5 mins on error
        }
    }
}

main().catch(console.error);
