import { runAgentDiscovery } from './scrapers/discovery';

async function main() {
    console.log("🚀 Starting Prop Scout Engine...");
    await runAgentDiscovery();
}

main().catch(console.error);
