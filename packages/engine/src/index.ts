import 'dotenv/config';
import { runAgentDiscovery } from './scrapers/discovery.js';

async function main() {
    console.log("🚀 Starting Prop Scout Engine...");
    await runAgentDiscovery();
}

main().catch(console.error);
