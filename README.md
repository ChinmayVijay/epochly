# Epochly.ai — Explore Any Topic Through Time

An AI-powered timeline app built with React + Vite.

## Setup (3 steps)

**1. Install dependencies**
```bash
npm install
```

**2. Add your Anthropic API key**
```bash
cp .env.example .env
```
Then open `.env` and replace `your_api_key_here` with your actual key from https://console.anthropic.com

**3. Run the app**
```bash
npm run dev
```

Open http://localhost:5173 in your browser. That's it!

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import your repo
3. Add environment variable: `VITE_ANTHROPIC_API_KEY` = your key
4. Click Deploy ✓

## Project Structure

```
src/
  App.jsx              # Main app, state management, API call
  components/
    SearchBar.jsx      # Search input + button
    TopicPills.jsx     # Preset topic buttons
    Timeline.jsx       # Timeline + expandable nodes
    EmptyState.jsx     # Idle / loading / error states
```
