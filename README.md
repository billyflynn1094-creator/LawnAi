# LawnAI 🌱

AI-powered lawn diagnostics. Point your camera at any lawn issue and get instant, location-aware guidance — powered by Gemini 2.0 Flash Vision.

## Features

- 📷 **Live camera capture** or photo upload
- 📍 **Location-aware** — soil type, hardiness zone, local weather
- 🤖 **Gemini Vision** — identifies diseases, pests, weeds, deficiencies
- 💊 **Product recommendations** with exact application rates
- 🌎 **Invasive species alerts** by region

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/lawn-ai.git
cd lawn-ai
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your keys:

| Variable | Where to get it |
|---|---|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) — free |
| `OPENWEATHER_API_KEY` | [OpenWeatherMap](https://openweathermap.org/api) — free tier |

> USDA Soil Survey and Hardiness Zone APIs are free with no key required.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Add your environment variables in the Vercel dashboard under **Settings → Environment Variables**.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| AI Vision | Gemini 2.0 Flash |
| Soil Data | USDA Web Soil Survey |
| Zone Data | USDA PHZM API |
| Weather | OpenWeatherMap |
| Geocoding | US Census Geocoder |
| Hosting | Vercel |
| Source | GitHub |

---

## Project Structure

```
lawn-ai/
├── app/
│   ├── layout.tsx          # Root layout + metadata
│   ├── page.tsx            # Main app page
│   ├── globals.css
│   └── api/
│       ├── analyze/        # Gemini vision endpoint
│       └── location/       # Location enrichment endpoint
├── components/
│   ├── Camera.tsx          # Camera capture + upload
│   ├── LocationBadge.tsx   # Location context display
│   └── Analysis.tsx        # AI results display
├── lib/
│   ├── gemini.ts           # Gemini client
│   ├── location.ts         # USDA + weather helpers
│   └── prompts.ts          # Lawn-specific AI prompts
├── .env.local.example
├── vercel.json
└── package.json
```

---

## Roadmap

- [ ] History — save and compare past scans
- [ ] Lawn journal — track treatment progress over time
- [ ] Streaming glasses / body camera support
- [ ] Voice guidance output
- [ ] Offline mode with cached recommendations
- [ ] Push notifications for seasonal treatment reminders
