const path = require('path');
const fs = require('fs');

// Load .env from project directory (where server.js lives) then from cwd
const envPath = path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });
if (!process.env.OPENAI_API_KEY) {
  require('dotenv').config({ path: path.join(process.cwd(), '.env') });
}
// Allow key to be set by env var OPENAI_API_KEY (from .env or shell)
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const HAS_OPENAI_KEY = OPENAI_API_KEY.length > 0 && OPENAI_API_KEY !== 'your_key_here';

const express = require('express');
const cors = require('cors');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Admin users (for now: single hardcoded account; later move to env or DB)
const ADMIN_USERS = { omar: 'test123@' };

const sessionSecret = (process.env.SESSION_SECRET || 'goodfood-swot-secret-change-in-production').trim();

// Storage: optional Turso (persists on ephemeral hosts) or JSON file (with optional DATA_PATH)
const TURSO_URL = (process.env.TURSO_DATABASE_URL || '').trim();
const TURSO_TOKEN = (process.env.TURSO_AUTH_TOKEN || '').trim();
const USE_TURSO = TURSO_URL && TURSO_TOKEN;
const DATA_DIR = process.env.DATA_PATH ? path.resolve(process.env.DATA_PATH) : path.join(__dirname, 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

let tursoClient = null;
if (USE_TURSO) {
  try {
    const { createClient } = require('@libsql/client');
    tursoClient = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  } catch (err) {
    console.warn('Turso client init failed, falling back to file:', err.message);
  }
}

function loadSubmissionsSync() {
  try {
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      const raw = fs.readFileSync(SUBMISSIONS_FILE, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.warn('Could not load submissions file:', err.message);
  }
  return [];
}

async function loadSubmissionsTurso() {
  if (!tursoClient) return [];
  try {
    await tursoClient.execute('CREATE TABLE IF NOT EXISTS store (key TEXT PRIMARY KEY, value TEXT)');
    const rs = await tursoClient.execute({ sql: "SELECT value FROM store WHERE key = 'submissions'", args: [] });
    const row = rs.rows[0];
    if (row && row[0] != null) {
      const data = JSON.parse(String(row[0]));
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.warn('Turso load failed:', err.message);
  }
  return [];
}

function saveSubmissionsSync(arr) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(arr, null, 2), 'utf8');
  } catch (err) {
    console.error('Could not save submissions:', err.message);
  }
}

async function saveSubmissionsTurso(arr) {
  if (!tursoClient) return;
  try {
    await tursoClient.execute({
      sql: "INSERT OR REPLACE INTO store (key, value) VALUES ('submissions', ?)",
      args: [JSON.stringify(arr)],
    });
  } catch (err) {
    console.error('Turso save failed:', err.message);
  }
}

async function saveSubmissions(arr) {
  if (tursoClient) await saveSubmissionsTurso(arr);
  else saveSubmissionsSync(arr);
}

let submissions = USE_TURSO ? [] : loadSubmissionsSync();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: false, maxAge: 24 * 60 * 60 * 1000 },
}));
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized' });
}

// Auth: login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const expectedPassword = ADMIN_USERS[username];
  if (!username || !password || expectedPassword !== password) {
    return res.status(401).json({ success: false, error: 'Invalid username or password' });
  }
  req.session.user = username;
  res.json({ success: true, user: username });
});

// Auth: current user
app.get('/api/admin/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ success: true, user: req.session.user });
  }
  res.status(401).json({ success: false, error: 'Not logged in' });
});

// Auth: logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => {});
  res.json({ success: true });
});

// API: Get all submissions (admin only)
app.get('/api/submissions', requireAuth, (req, res) => {
  res.json({ success: true, data: [...submissions] });
});

// API: Create submission (public - employee form)
app.post('/api/submissions', async (req, res) => {
  const body = req.body;
  const id = Date.now().toString();
  const record = {
    id,
    timestamp: new Date().toISOString(),
    name: body.name || '',
    email: body.email || '',
    dept: body.dept || '',
    tenure: body.tenure || '',
    strengths: Array.isArray(body.strengths) ? body.strengths : [],
    weaknesses: Array.isArray(body.weaknesses) ? body.weaknesses : [],
    opportunities: Array.isArray(body.opportunities) ? body.opportunities : [],
    threats: Array.isArray(body.threats) ? body.threats : [],
    comments: body.comments || '',
  };
  submissions.push(record);
  await saveSubmissions(submissions);
  res.status(201).json({ success: true, data: record });
});

// API: Clear all submissions (admin only)
app.delete('/api/submissions', requireAuth, async (req, res) => {
  submissions.length = 0;
  await saveSubmissions(submissions);
  res.json({ success: true, data: [] });
});

// Debug: check if OpenAI key is loaded (admin only)
app.get('/api/analyze/status', requireAuth, (req, res) => {
  res.json({
    configured: HAS_OPENAI_KEY,
    env_path: envPath,
    cwd: process.cwd(),
    __dirname,
  });
});

// API: AI analysis (server-side proxy, admin only)
app.post('/api/analyze', requireAuth, async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing prompt' });
  }
  if (!HAS_OPENAI_KEY) {
    return res.status(503).json({
      success: false,
      error: 'AI not configured. Add OPENAI_API_KEY to your .env file (in the same folder as server.js) and restart the server.',
    });
  }
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.error?.message || 'OpenAI API error',
      });
    }
    const text = data.choices?.[0]?.message?.content ?? '';
    res.json({ success: true, data: { text } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Analysis failed' });
  }
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

(async function start() {
  if (USE_TURSO) {
    submissions = await loadSubmissionsTurso();
    console.log('Turso: loaded', submissions.length, 'submissions');
  }
  app.listen(PORT, () => {
    console.log(`GoodFood SWOT server running at http://localhost:${PORT}`);
    console.log('.env path checked:', envPath);
    if (USE_TURSO) console.log('Storage: Turso (persistent)');
    else console.log('Storage: JSON file at', SUBMISSIONS_FILE);
    if (!HAS_OPENAI_KEY) {
      console.warn('OPENAI_API_KEY not set. Add it to .env in the same folder as server.js and restart.');
    } else {
      console.log('OpenAI API key loaded (' + OPENAI_API_KEY.substring(0, 12) + '...). AI Analysis enabled.');
    }
  });
})();
