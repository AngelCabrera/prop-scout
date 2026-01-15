# 🧠 Prop Scout Knowledge Base

## 📂 Project Structure
**Monorepo** managed with npm workspaces.
- **`packages/api`**: Cloudflare Worker. Handles DB access (`real-estate-db`) and serves the Frontend (`/feed`).
- **`packages/engine`**: Node.js Service (EC2). Runs the Scraper and Recruiter.
- **`packages/shared`**: Shared TypeScript types (`PropertyPayload`, etc.).

## 🤖 Services & AI
- **LLM**: **Gemini 2.5 Flash** (via `GEMINI_API_KEY`). used for:
    - **Recruiter**: Vetting Instagram profiles from Google Search.
    - **Scraper**: Analyzing property captions to extract price, location, and specs.
- **Search**: **Google Custom Search API** (Recruiter 2.0).
- **Scraping**: **Apify** (Instagram Scraper) triggered via API.
- **Database**: **Cloudflare D1** (`real-estate-db`).

## 🚀 Deployment

### 1. API (Cloudflare Worker)
- **Deploy**: `npx wrangler deploy` (from `packages/api`).
- **Secrets**: Manage via `npx wrangler secret put <KEY>`.
- **Config**: `packages/api/wrangler.jsonc`.

### 2. Engine (EC2)
- **Method**: GitHub Actions (`.github/workflows/deploy.yml`).
- **Trigger**: Push to `main`.
- **Process Management**: **PM2** handles 2 separate processes:
    - `scout-scraper`: Daily @ 6:00 AM (`--scrape`).
    - `scout-recruiter`: Sundays @ 8:00 AM (`--recruit`).
- **Access**: SSH into the instance using the IP in `EC2_IP`.
    ```bash
    ssh -i ScoutKeyV2 ubuntu@<EC2_IP>
    ```

## 🔐 Environment Variables

### Local
- Managed in root `.env`. output to `process.env`.
- **Keys**: `GEMINI_API_KEY`, `APIFY_API_TOKEN`, `CF_API_URL`, `CF_API_SECRET`, `GOOGLE_SEARCH_CX`, `GOOGLE_SEARCH_KEY`.

### Remote (EC2)
- Injected by GitHub Actions from **GitHub Secrets**.
- Writes to `~/app/.env` on the server during deployment.
- **To Add New**: Add to GitHub Repo Secrets -> Update `deploy.yml` to inject it -> Push.

### Remote (API)
- Managed via Wrangler Secrets.
- **To Add New**: `npx wrangler secret put NEW_VAR`.

## 💾 Database (D1)
- **Local Interaction**:
    ```bash
    npx wrangler d1 execute real-estate-db --local --command "SELECT * FROM properties"
    ```
- **Remote Interaction**:
    ```bash
    npx wrangler d1 execute real-estate-db --remote --command "SELECT * FROM properties"
    ```
- **Migrations**: `packages/api/migrations/`.
    - Apply Remote: `npx wrangler d1 migrations apply real-estate-db --remote`

## 🧪 Testing & Development
- **Local Engine**:
    - Run Recruiter: `./node_modules/.bin/tsx packages/engine/src/index.ts recruit`
    - Run Scraper: `./node_modules/.bin/tsx packages/engine/src/index.ts scrape`
- **Frontend**: Visit `http://localhost:8787/feed` (if running `wrangler dev`) or the remote URL `https://scout-api.ajcs.workers.dev/feed`.
