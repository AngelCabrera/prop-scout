import 'dotenv/config';
import { runRecruiter } from './scrapers/recruiter.js';
import { runInstagramFeedScraper } from './scrapers/instagram_feed.js';

async function main() {
    console.log("🚀 Starting Prop Scout Engine (Self-Driving Mode)...");
    
    while (true) {
        try {
            // 1. THE RECRUITER (Weekly - or every X cycles)
            // For now, let's run it once per restart or checking a flag, 
            // but strict schedule is better handled by separate process or check time.
            // Simple approach: Run Recruiter, then Feed. Recruiter finds new targets for Feed.
            
            console.log("Cycle Start: Agent Discovery & Recruitment");
            await runRecruiter();

            console.log("Cycle Start: Content Scraping");
            await runInstagramFeedScraper();
            
            console.log("😴 Discovery cycle complete. Sleeping for 24 hours...");
            await new Promise(resolve => setTimeout(resolve, 24 * 60 * 60 * 1000));
        } catch (error) {
            console.error("❌ Error in engine cycle:", error);
            await new Promise(resolve => setTimeout(resolve, 1 * 60 * 60 * 1000)); // Wait 1 hour on error
        }
    }
}

main().catch(console.error);
