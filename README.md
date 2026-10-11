# ⚽ MTL Football Hub

Next-generation football intelligence platform featuring real-time match tracking, AI-powered match predictions, live TV & streaming, interactive group chats, and futuristic cyberpunk analytics.

## 🚀 Key Features

- **Live Match & TV Streaming**: Real-time scores, dynamic video streaming, and responsive match commentary.
- **AI Match Predictions**: Machine-learning backed football intelligence and past prediction performance metrics.
- **Interactive Group Chats**: Real-time fan community channels powered by Supabase.
- **Fixtures & Clubs**: Comprehensive league fixtures, club dossiers, and lineup intelligence.
- **Cyberpunk HUD Interface**: High-tech responsive UI styled with Tailwind CSS, custom glow effects, and modern fonts (Orbitron, Rajdhani, Outfit, Inter).
- **Full-Stack Architecture**: Powered by Vite + React 19, TypeScript, Express backend server, and Supabase integration.

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Framer Motion
- **Backend**: Node.js, Express, TypeScript (TSX)
- **Database & Realtime**: Supabase (Auth & Realtime channels)
- **Build Tool**: Vite 8

## 📦 Setup & Development

```bash
# Install dependencies
npm install

# Start local development server (Express + Vite)
npm run dev

# Build for production
npm run build
```

## 🔒 Environment Variables

Copy `.env.example` to `.env` and fill in:
- `OPENAI_API_KEY`: API key for AI predictions
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase public anonymous key
- `VITE_GOOGLE_CSE_CX`: Google Custom Search Engine ID
