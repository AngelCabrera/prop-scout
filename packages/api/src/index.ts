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
        ai_score, ai_summary, water_status, operation_type, specs, status, last_seen
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', unixepoch()
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
      p.operation_type || 'Unknown',
      JSON.stringify(p.specs || {})
    ));

    const results = await c.env.DB.batch(batch);
    return c.json({ message: 'Ingestion successful', count: results.length });

  } catch (err) {
    console.error(err);
    return c.json({ error: 'Ingestion failed' }, 500);
  }
});

/**
 * GET /agents
 * Returns list of active agents for scraping
 */
app.get('/agents', async (c) => {
  const city = c.req.query('city');
  const platform = c.req.query('platform') || 'IG';
  
  // Select ACTIVE agents for the specific city
  const query = `
    SELECT username FROM discovery_agents 
    WHERE status = 'ACTIVE' 
    AND platform = ? 
    ${city ? "AND city_scope = ?" : ""}
  `;
  
  const params = city ? [platform, city] : [platform];
  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  
  return c.json(results);
});

/**
 * POST /agents/recruit
 * Adds new discovered agents to the database
 */
app.post('/agents/recruit', async (c) => {
  const secret = c.req.header('x-api-secret');
  if (secret !== c.env.API_SECRET) return c.text('Unauthorized', 401);

  const agents = await c.req.json<any[]>();
  
  const stmt = c.env.DB.prepare(`
    INSERT OR IGNORE INTO discovery_agents (username, platform, status, city_scope, last_checked)
    VALUES (?, ?, 'ACTIVE', ?, unixepoch())
  `);

  const batch = agents.map(a => stmt.bind(a.username, a.platform, a.city_scope));
  const res = await c.env.DB.batch(batch);

  return c.json({ count: res.length });
});

/**
 * GET /feed
 * Renders a simple HTML table for quick viewing on Mobile.
 */
app.get('/feed', async (c) => {
  // Get top 50 active listings, sorted by AI Score
  // Get sort parameter, default to 'newest'
  // Whitelist sort options to prevent SQL injection and ensure default behavior
  const sort = c.req.query('sort') || 'newest';
  
  const sortMap: Record<string, string> = {
    'newest': 'last_seen DESC',
    'oldest': 'last_seen ASC',
    'price_asc': 'price_usd ASC',
    'price_desc': 'price_usd DESC',
    'score': 'ai_score DESC'
  };

  const orderBy = sortMap[sort] || 'last_seen DESC';

  const { results } = await c.env.DB.prepare(`
    SELECT * FROM properties 
    WHERE status = 'AVAILABLE' 
    ORDER BY ${orderBy}
    LIMIT 100
  `).all();

  // Simple HTML Template
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Property Scout</title>
      <style>
        body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 20px; background: #f0f2f5; margin: 0; }
        h1 { text-align: center; margin-bottom: 30px; color: #1a1a1a; }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .card { 
            background: white; 
            border-radius: 12px; 
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); 
            overflow: hidden;
            transition: transform 0.2s;
            display: flex;
            flex-direction: column;
        }
        
        .card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }

        .card-content { padding: 16px; flex-grow: 1; display: flex; flex-direction: column; }

        .tag { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
        .tag.score { background: #dcfce7; color: #166534; }
        .tag.water { background: #dbeafe; color: #1e40af; }
        .tag.type { background: #fee2e2; color: #991b1b; }
        .tag.type.rental { background: #fef9c3; color: #854d0e; }
        
        .price { font-size: 1.5rem; font-weight: 800; color: #111; letter-spacing: -0.5px; }
        .zone { color: #666; font-size: 0.85rem; margin-top: 4px; line-height: 1.4; }
        
        a.btn { 
            display: block; 
            text-align: center;
            background: #2563eb;
            color: white;
            padding: 10px;
            margin-top: auto;
            text-decoration: none;
            font-weight: 600;
            border-radius: 8px;
            transition: background 0.2s;
        }
        a.btn:hover { background: #1d4ed8; }

        img { width: 100%; height: 250px; object-fit: cover; background: #eee; }
      </style>
    </head>
    <body>
    <body>
      <h1>🏡 Prop Scout</h1>
      
      <div style="text-align: center; margin-bottom: 20px;">
        <label for="sort" style="margin-right: 10px; font-weight: bold; color: #444;">Sort by:</label>
        <select id="sort" onchange="window.location.search = '?sort=' + this.value" style="padding: 8px; border-radius: 6px; border: 1px solid #ccc;">
            <option value="newest" ${c.req.query('sort') === 'newest' ? 'selected' : ''}>📅 Newest First</option>
            <option value="oldest" ${c.req.query('sort') === 'oldest' ? 'selected' : ''}>📅 Oldest First</option>
            <option value="price_asc" ${c.req.query('sort') === 'price_asc' ? 'selected' : ''}>💰 Price: Low to High</option>
            <option value="price_desc" ${c.req.query('sort') === 'price_desc' ? 'selected' : ''}>💰 Price: High to Low</option>
            <option value="score" ${c.req.query('sort') === 'score' ? 'selected' : ''}>🌟 AI Score</option>
        </select>
      </div>

      ${results.length === 0 ? '<p style="text-align:center">No properties yet.</p>' : ''}
      
      <div class="grid">
      ${results.map((p: any) => `
        <div class="card">
          ${p.image_url ? `<img src="https://images.weserv.nl/?url=${encodeURIComponent(p.image_url)}&w=400" loading="lazy" referrerpolicy="no-referrer" />` : ''}
          <div class="card-content">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                 <span class="price">${p.price_usd > 0 ? '$' + p.price_usd.toLocaleString() : 'Consultar'}</span>
                 <span class="tag score">Score: ${p.ai_score}</span>
              </div>
              <div class="zone">
                📍 ${p.location_zone} | ${p.source}<br/>
                <small style="color:#999" class="date-display" data-timestamp="${p.last_seen * 1000}">
                  Updated: Loading...
                </small>
              </div>
              <p style="margin: 12px 0; font-size: 0.95rem; line-height: 1.5; color: #4b5563;">${p.ai_summary}</p>
              <div style="display:flex; gap: 8px; margin-bottom: 16px;">
                <span class="tag water">💧 ${p.water_status}</span>
                <span class="tag type ${p.operation_type === 'Rental' ? 'rental' : ''}">${p.operation_type === 'Sale' ? '💰 Sale' : (p.operation_type === 'Rental' ? '🔑 Rental' : '❓ Unknown')}</span>
              </div>
              <a href="${p.url}" target="_blank" class="btn">View Listing →</a>
          </div>
        </div>
      `).join('')}
      </div>

      <script>
        // CLIENT-SIDE DATE FORMATTING
        // This ensures the date corresponds to the user's browser time, not the server's UTC time.
        document.querySelectorAll('.date-display').forEach(el => {
            const ts = parseInt(el.getAttribute('data-timestamp'));
            const date = new Date(ts);
            // Format example: 1/13/2026, 9:35 PM
            el.innerHTML = 'Updated: ' + date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            el.title = date.toString();
        });
      </script>
    </body>
  </html>
  `;

  return c.html(html);
});

export default app;
