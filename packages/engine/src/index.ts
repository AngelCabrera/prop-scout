import 'dotenv/config';
import { runAgentDiscovery } from './scrapers/discovery.js';

async function main() {
    console.log("🚀 Starting Prop Scout Engine...");
    console.log("✅ Deployed via GitHub Actions Automation");
    await runAgentDiscovery();
}

main().catch(console.error);
