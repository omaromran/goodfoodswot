# GoodFood SWOT Analysis Platform

A production-ready SWOT analysis web application for GoodFood Canada. Employees submit strategic feedback (no login required); executives view real-time analytics and AI-powered insights.

## Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML/CSS/JavaScript (no frameworks)
- **Storage**: In-memory (designed for easy database upgrade)
- **AI**: Anthropic Claude API via server-side proxy (optional)

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
- For production, add a database (e.g. MongoDB, PostgreSQL, SQLite) and replace the in-memory `submissions` array in `server.js` with DB calls.
- Consider adding authentication for `/admin` and rate limiting for `/api/submissions` and `/api/analyze`.

## Brand

- **Colors**: Red `#E8342A`, Green `#1A6B3C`, Cream `#F7F2EC`, Charcoal `#1C1C1A`, Gold `#D4A853`, Blue `#3B5B9A`
- **Fonts**: Playfair Display (headings), DM Sans (body), DM Mono (stats)

## License

See [LICENSE](LICENSE).
