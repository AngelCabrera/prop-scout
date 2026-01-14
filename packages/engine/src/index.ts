import 'dotenv/config';
import { runRecruiter } from './scrapers/recruiter.js';
import { runInstagramFeedScraper } from './scrapers/instagram_feed.js';

const args = process.argv.slice(2);
const MODE = args[0] || 'all'; // 'recruit', 'scrape', or 'all'

async function main() {
    console.log(`🚀 Starting Prop Scout Engine [Mode: ${MODE}]...`);
    
    try {
        if (MODE === 'recruit') {
            await runRecruiter();
        } else if (MODE === 'scrape') {
            await runInstagramFeedScraper();
        } else {
            // Legacy/Default: Run both in a loop
            while (true) {
                 console.log("Cycle Start: Agent Discovery & Recruitment");
                 await runRecruiter();
                 console.log("Cycle Start: Content Scraping");
                 await runInstagramFeedScraper();
                 console.log("😴 Discovery cycle complete. Sleeping for 24 hours...");
                 await new Promise(resolve => setTimeout(resolve, 24 * 60 * 60 * 1000));
            }
        }
    } catch (error) {
        console.error("❌ Error in engine execution:", error);
        process.exit(1);
    }
}

main().catch(console.error);
