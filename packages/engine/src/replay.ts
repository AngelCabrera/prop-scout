import 'dotenv/config';
import { ApifyClient } from 'apify-client';
import { processScrapedItems } from './scrapers/instagram_feed.js';

const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

async function replay() {
    console.log("🔄 Replaying last scraped data to save costs...");
    
    try {
        // 1. Get the latest run of the scraper
        const actor = client.actor("apify/instagram-scraper");
        const runs = await actor.runs().list({ limit: 1, desc: true });
        
        if (runs.items.length === 0) {
            console.error("❌ No previous runs found.");
            return;
        }

        const lastRun = runs.items[0];
        console.log(`📂 Reusing Dataset from Run: ${lastRun.id} (Status: ${lastRun.status})`);

        // 2. Fetch the items from its dataset
        const { items } = await client.dataset(lastRun.defaultDatasetId).listItems();
        
        // 3. Filter for specific agent macorriere.remaxdestiny.ve
        const filteredItems = items.filter((item: any) => item.ownerUsername === 'macorriere.remaxdestiny.ve');
        console.log(`🎯 Found ${filteredItems.length} items for macorriere.remaxdestiny.ve`);

        // 4. Re-run only the AI Analysis & Filtering
        await processScrapedItems(filteredItems);
        
        console.log("✅ Replay complete!");
    } catch (error) {
        console.error("❌ Replay failed:", error);
    }
}

replay();
