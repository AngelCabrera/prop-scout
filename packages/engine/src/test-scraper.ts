import 'dotenv/config';
import { runInstagramFeedScraper } from './scrapers/instagram_feed.js';

async function test() {
    console.log("🧪 Starting Local Scraper Test...");
    try {
        await runInstagramFeedScraper();
        console.log("✅ Test completed!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }
}

test();
