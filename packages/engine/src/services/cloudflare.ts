import { PropertyPayload } from '@scout/shared';

export async function ingestProperties(properties: PropertyPayload[]) {
    if (properties.length === 0) return;
    
    console.log(`📤 Ingesting ${properties.length} properties to Cloudflare...`);
    
    const url = process.env.CF_API_URL;
    const secret = process.env.CF_API_SECRET;

    if (!url || !secret) {
        console.warn("⚠️ Cloudflare configuration missing. Skipping ingestion.");
        return;
    }

    try {
        const response = await fetch(`${url}/ingest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-secret': secret
            },
            body: JSON.stringify(properties)
        });

        if (!response.ok) {
            throw new Error(`Ingestion failed: ${response.statusText}`);
        }

        console.log("✅ Ingestion successful!");
    } catch (error) {
        console.error("❌ Cloudflare Ingestion Error:", error);
    }
}
