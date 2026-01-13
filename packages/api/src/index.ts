import { Hono } from 'hono';
import { Bindings, PropertyPayload } from './types';

const app = new Hono<{ Bindings: Bindings }>();

/**
 * MIDDLEWARE: Security Check
 * Only allow requests with the correct API Secret.
 */
app.use('/ingest/*', async (c, next) => {
  const secret = c.req.header('x-api-secret');
  if (secret !== c.env.API_SECRET) {
    return c.text('Unauthorized: Invalid API Secret', 401);
  }
  await next();
});

/**
 * POST /ingest
 * Receives an array of properties from the AWS Scraper.
 */
app.post('/ingest', async (c) => {
  try {
    const properties = await c.req.json<PropertyPayload[]>();
    
    if (!Array.isArray(properties) || properties.length === 0) {
      return c.json({ message: 'No properties provided' }, 400);
    }

    const stmt = c.env.DB.prepare(`
      INSERT INTO properties (
        external_id, url, source, image_url, price_usd, location_zone, 
        ai_score, ai_summary, water_status, specs, status, last_seen
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', unixepoch()
      )
      ON CONFLICT(external_id) DO UPDATE SET
        price_usd = excluded.price_usd,
        status = 'AVAILABLE',
        last_seen = unixepoch(),
        ai_score = excluded.ai_score;
    `);

    // Execute in batch for performance
    const batch = properties.map(p => stmt.bind(
      p.external_id,
      p.url,
      p.source,
      p.image_url || null,
      p.price_usd,
      p.location_zone,
      p.ai_score,
      p.ai_summary,
      p.water_status,
      JSON.stringify(p.specs || {})
    ));

    const results = await c.env.DB.batch(batch);
    return c.json({ message: 'Ingestion successful', count: results.length });

  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

/**
 * GET /feed
 * Renders a simple HTML table for quick viewing on Mobile.
 */
app.get('/feed', async (c) => {
  // Get top 50 active listings, sorted by AI Score
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM properties 
    WHERE status = 'AVAILABLE' 
    ORDER BY created_at DESC 
    LIMIT 50
  `).all();

  // Simple HTML Template
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cumaná Scout</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 10px; background: #f4f4f5; }
        .card { background: white; padding: 15px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .tag.score { background: #dcfce7; color: #166534; }
        .tag.water { background: #dbeafe; color: #1e40af; }
        .price { font-size: 1.25rem; font-weight: bold; color: #111; }
        .zone { color: #666; font-size: 0.9rem; }
        a { display: block; margin-top: 10px; color: #2563eb; text-decoration: none; }
        img { width: 100%; height: 200px; object-fit: cover; border-radius: 4px; margin-bottom: 10px; background: #eee; }
      </style>
    </head>
    <body>
      <h1>🏡 Cumaná Scout</h1>
      ${results.length === 0 ? '<p>No properties yet.</p>' : ''}
      
      ${results.map((p: any) => `
        <div class="card">
          ${p.image_url ? `<img src="${p.image_url}" loading="lazy" />` : ''}
          <div style="display:flex; justify-content:space-between; align-items:center;">
             <span class="price">$${p.price_usd.toLocaleString()}</span>
             <span class="tag score">Score: ${p.ai_score}</span>
          </div>
          <div class="zone">📍 ${p.location_zone} | ${p.source}</div>
          <p style="margin: 8px 0; font-size: 0.95rem;">${p.ai_summary}</p>
          <div>
            <span class="tag water">💧 ${p.water_status}</span>
          </div>
          <a href="${p.url}" target="_blank">View Listing →</a>
        </div>
      `).join('')}
    </body>
  </html>
  `;

  return c.html(html);
});

export default app;
