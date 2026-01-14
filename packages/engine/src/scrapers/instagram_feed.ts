import { ApifyClient } from 'apify-client';
import { ingestProperties } from '../services/cloudflare.js';
import { analyzeListing } from '../services/ai.js';
import { CUMANA_PROFILE } from '../config/profiles.js';
import { PropertyPayload } from '@scout/shared';

const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

const VERIFIED_AGENTS = [
    'macorriere.remaxdestiny.ve', 
    'maria.remaxdestiny.ve', 
    'ramon.remaxdestiny.ve', 
    'hidelmarys.remaxdestiny.ve'
];

/**
 * CORE LOGIC: Analysis and Ingestion
 * Separated so we can "replay" data without re-scraping (saving $$)
 */
export async function processScrapedItems(items: any[]) {
    console.log(`📦 Processing ${items.length} items with AI...`);
    const properties: PropertyPayload[] = [];

    for (const post of items) {
        const caption = post.caption || "";
        if (caption.length < 50) continue;

        console.log(`🤖 Analyzing post from ${post.ownerUsername}...`);
        const analysis = await analyzeListing(caption, CUMANA_PROFILE);
        console.log(`🎯 AI Analysis: Price=${analysis?.price_usd}, Type=${analysis?.operation_type}, Score=${analysis?.ai_score}`);
        // Use the updated loose filter: Score > 60 OR valid price
        if (analysis && (analysis.price_usd > -1 || analysis.ai_score > 60)) {
            console.log(`✅ Valid Listing Found: ${analysis.ai_summary.slice(0, 50)}...`);
            properties.push({
                external_id: Buffer.from(post.url).toString('base64'),
                url: post.url,
                source: `IG: ${post.ownerUsername}`,
                image_url: post.displayUrl,
                
                price_usd: analysis.price_usd,
                location_zone: analysis.location_zone,
                
                ai_score: analysis.ai_score,
                ai_summary: analysis.ai_summary,
                water_status: analysis.water_status,
                operation_type: analysis.operation_type,
                specs: analysis.specs,
                
                country: CUMANA_PROFILE.country,
                state: 'Sucre',
                city: CUMANA_PROFILE.city
            } as any);
        } else {
             if (analysis) console.log(`❌ Rejected: ${analysis.ai_summary.slice(0, 50)}... (Score: ${analysis.ai_score})`);
        }
    }

    if (properties.length > 0) {
        await ingestProperties(properties);
    } else {
        console.log("ℹ️ No property listings found in this batch after analysis.");
    }
}

/**
 * ACTOR RUN: Optimized for cost
 * Old cost: ~$0.22/run (80 posts) → New cost: ~$0.02/run (8 posts) = 90% reduction
 */
export async function runInstagramFeedScraper() {
    console.log("📸 Starting Instagram Feed Extraction (Apify)...");
    
    // COST OPTIMIZATION: Using API-based scraper + limiting to latest 2 posts
    // Old cost: ~$0.22/run (80 posts) → New cost: ~$0.02/run (8 posts) = 90% reduction
    const runInput = {
        "directUrls": VERIFIED_AGENTS.map(u => `https://www.instagram.com/${u}/`),
        "resultsLimit": 5,  // Increased to 5 posts per profile as requested
        "resultsType": "posts"
    };

    try {
        console.log("🚀 Launching Apify Actor (Optimized: 2 posts/profile)...");
        // Keeping apify/instagram-scraper but with 90% cost reduction via resultsLimit
        const run = await client.actor("apify/instagram-scraper").call(runInput);
        console.log(`📥 Run complete. Dataset ID: ${run.defaultDatasetId}`);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        await processScrapedItems(items);
    } catch (error) {
        console.error("❌ Error in Instagram Scraper:", error);
    }
}
