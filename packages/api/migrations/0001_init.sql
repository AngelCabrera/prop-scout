-- D1 MIGRATION: 0001_init.sql

-- 1. PROPERTIES (The Inventory)
CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Identity
    external_id TEXT UNIQUE,     -- Hash(Source + ID) to prevent duplicates
    url TEXT NOT NULL,
    source TEXT,                 -- 'MercadoLibre', 'Facebook', 'Website'
    
    -- Visuals
    image_url TEXT,              -- URL of the main photo (Hotlink)
    
    -- Financials
    price_usd INTEGER,           -- Normalized: 25000 (No cents)
    
    -- Location
    location_zone TEXT,          -- 'San Luis', 'Av. Perimetral'
    
    -- The AI Value Add
    ai_score INTEGER,            -- 0-100 (Computed by Gemini)
    ai_summary TEXT,             -- "Great water supply, safe zone, needs paint."
    water_status TEXT,           -- 'Tank', 'Well', 'Constant', 'None', 'Unknown'
    
    -- Structured Specs (JSON)
    -- Stores: { "bedrooms": 3, "bathrooms": 2, "m2": 120, "parking": 1 }
    specs JSON, 
    
    -- Life Cycle
    status TEXT DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'SOLD', 'ARCHIVED'
    created_at INTEGER DEFAULT (unixepoch()),
    last_seen INTEGER DEFAULT (unixepoch()) -- Updates every time the scraper finds it again
);

-- 2. DISCOVERY AGENTS (The Nodes)
CREATE TABLE IF NOT EXISTS discovery_agents (
    username TEXT PRIMARY KEY,   -- '@century21_cumana'
    platform TEXT,               -- 'IG', 'FB'
    status TEXT DEFAULT 'ACTIVE',
    city_scope TEXT,             -- 'Cumaná'
    last_scraped INTEGER
);

-- 3. DISCOVERY SITES (The Independent Webs)
CREATE TABLE IF NOT EXISTS discovery_sites (
    domain TEXT PRIMARY KEY,     -- 'inmobiliariasucre.com'
    inventory_url TEXT,          -- 'inmobiliariasucre.com/propiedades'
    last_scraped INTEGER
);

-- Indexes for the API 'Feed' Endpoint
CREATE INDEX idx_properties_feed ON properties(status, ai_score DESC, created_at DESC);
CREATE INDEX idx_properties_price ON properties(price_usd);