# GoodFood SWOT Analysis Platform

A production-ready SWOT analysis web application for GoodFood Canada. Employees submit strategic feedback (no login required); executives view real-time analytics and AI-powered insights.

## Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML/CSS/JavaScript (no frameworks)
- **Storage**: JSON file by default; optional **Turso** (libSQL) for hosted deployments where the filesystem is ephemeral
- **AI**: OpenAI API via server-side proxy (optional)

## Project Structure

```
├── server.js           # Express server, API, static files
├── package.json
├── .env                 # PORT, NODE_ENV, OPENAI_API_KEY
├── .gitignore
├── README.md
└── public/
    ├── index.html       # Employee submission form
    └── admin.html       # Admin dashboard
```

## Setup

1. **Clone and install**

   ```bash
   cd goodfoodswot
   npm install
   ```

2. **Environment**

   Create or edit `.env`:

   ```
   PORT=3000
   NODE_ENV=development
   OPENAI_API_KEY=your_key_here   # Optional; omit to disable AI analysis
   ```

3. **Run**

   ```bash
   npm start
   ```

   Or with auto-reload:

   ```bash
   npm run dev
   ```

4. **Open**

   - Employee form: [http://localhost:3000](http://localhost:3000)
   - Admin dashboard: [http://localhost:3000/admin](http://localhost:3000/admin)

## API

| Method | Endpoint             | Description                    |
|--------|----------------------|--------------------------------|
| GET    | `/api/submissions`   | List all submissions           |
| POST   | `/api/submissions`   | Create a submission            |
| DELETE | `/api/submissions`   | Clear all submissions          |
| POST   | `/api/analyze`       | Run AI analysis (body: `{ prompt }`) |

## Features

- **Employee form**: Name, email, department, tenure, SWOT quadrants (add/remove items), optional comments (800 chars). Validation and toast notifications.
- **Admin dashboard**: Stats strip, SWOT quadrant overview, participation by department, theme panels (top items per quadrant), submissions table. Auto-refresh every 30s, Clear All with confirmation.
- **AI analysis**: Click “AI Analysis” to send aggregated SWOT data to OpenAI and display executive summary, syntheses, strategic position, and five priority actions. Requires `OPENAI_API_KEY` in `.env`.

## Deployment

- Set `NODE_ENV=production` and `PORT` as needed.
- Keep `.env` out of version control (already in `.gitignore`).

### Why submissions disappear after restart (Railway, Render, etc.)

Many hosts use an **ephemeral filesystem**: the app’s disk is wiped on every restart or redeploy. The default JSON file (`data/submissions.json`) then disappears. Use one of the options below so data persists.

### Option 1: Turso (recommended for hosted apps)

[Turso](https://turso.tech) is a free, hosted SQLite-compatible DB. Submissions are stored there and survive restarts.

1. Create a Turso account and a database at [turso.tech](https://turso.tech).
2. Get the database URL and an auth token (e.g. `turso db show mydb --url` and `turso db tokens create mydb`).
3. In your host’s environment (e.g. Railway, Render), set:
   - `TURSO_DATABASE_URL` = your database URL (e.g. `libsql://my-db-xxx.turso.io`)
   - `TURSO_AUTH_TOKEN` = your auth token
4. Redeploy. The app will use Turso instead of the JSON file; submissions will persist across restarts.

### Option 2: Persistent volume (if your host supports it)

If the host lets you mount a persistent volume, set:

- `DATA_PATH` = the path to that volume (e.g. `/data` or `/app/persistent`).

The app will write `submissions.json` there so it survives restarts.

## Brand

- **Colors**: Red `#E8342A`, Green `#1A6B3C`, Cream `#F7F2EC`, Charcoal `#1C1C1A`, Gold `#D4A853`, Blue `#3B5B9A`
- **Fonts**: Playfair Display (headings), DM Sans (body), DM Mono (stats)

## License

See [LICENSE](LICENSE).
