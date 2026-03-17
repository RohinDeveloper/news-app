# NewsAI — Personalized News Feed

A full-stack news app powered by Claude + web search. Curates real, up-to-date news based on your interests.

## Project Structure

```
news-app/
├── backend/          # Express API proxy
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/         # React + Vite UI
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## Setup

### 1. Get an Anthropic API key
Sign up at https://console.anthropic.com and create an API key.

### 2. Backend

```bash
cd backend
npm install

# Create your .env file
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

npm run dev
# Runs on http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

Open http://localhost:5173 in your browser. Select interests and hit **Refresh feed**.

## Features

- Pick from preset topics or add custom interests
- Preferences saved to localStorage (persist across sessions)
- Each story includes a "Why this story?" explanation
- "Read more" links to the original source
- Last-refreshed timestamp
- Backend proxies all API calls — your key stays secret on the server

## Deploying

### Backend
Deploy to any Node.js host: **Railway**, **Render**, **Fly.io**, or a plain VPS.
Set the `ANTHROPIC_API_KEY` and `FRONTEND_URL` environment variables on the host.

### Frontend
Build with `npm run build` in the frontend folder.
Deploy the `dist/` folder to **Vercel**, **Netlify**, or any static host.
Set the `VITE_API_URL` in your Vite config or use a reverse proxy to point `/api` at your backend.

### Connecting frontend to hosted backend
In `vite.config.js`, update the proxy target to your deployed backend URL for local dev.
For production, either set up a reverse proxy (e.g. Nginx) or update fetch calls to use the full backend URL via an env variable.
