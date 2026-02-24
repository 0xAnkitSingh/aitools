# AI Tools

A suite of developer-focused utilities that solve everyday friction points when working with Large Language Models.

## The Problem

Anyone who regularly uses ChatGPT, Claude, or other LLMs has encountered these issues:

**Invisible formatting garbage** — AI-generated text is riddled with zero-width spaces, non-breaking spaces, smart quotes, em-dashes, and other Unicode artifacts. These invisible characters silently break code, cause regex mismatches, trigger copy-paste bugs in CMSs, and can even flag content as AI-generated. Most people don't even know they're there.

**Opaque and unpredictable costs** — LLM pricing is scattered across dozens of provider pages, each with different units (per-token, per-1K, per-1M). Comparing costs across 30+ models from 6 providers requires a spreadsheet. Prices change frequently, and there's no single source of truth.

## What This Solves

### AI Text Cleaner (`/`)

Paste any AI-generated text and instantly strip out:

- Hidden Unicode characters (zero-width spaces, soft hyphens, directional marks)
- Non-breaking spaces → regular spaces
- Smart/curly quotes → straight quotes
- Em-dashes and en-dashes → standard hyphens
- Unicode ellipsis → three dots
- Trailing whitespace
- Markdown artifacts (asterisks, heading syntax)

Each cleaning operation reports exactly what was found and fixed. Global statistics are persisted to MongoDB so usage accumulates across sessions.

### LLM Cost Calculator (`/calculator`)

Estimate monthly costs across **30+ models** from OpenAI, Anthropic, Google, DeepSeek, xAI, and Cohere — all in one place.

- **Usage presets** for common patterns (chatbot, content generation, data analysis, document summarization)
- **Configurable parameters**: input/output tokens per request, requests per day, days per month
- **Tier filtering** (High-End / Mid-Range / Budget) and provider tabs
- **Cost breakdown** with input vs output distribution visualization
- **Quick compare** panel showing the 5 cheapest alternatives for your exact usage
- **Save/load calculations** to localStorage
- **Automated weekly price updates** — a cron job fetches the latest pricing from [LiteLLM's community-maintained dataset](https://github.com/BerriAI/litellm) every Monday and persists to MongoDB. Manual refresh available via the UI.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: MongoDB (Atlas or local)
- **Pricing Data**: [LiteLLM](https://github.com/BerriAI/litellm) community pricing JSON
- **Deployment**: Vercel (with Cron support)

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance (local or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your MongoDB connection string

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the AI Text Cleaner, or [http://localhost:3000/calculator](http://localhost:3000/calculator) for the Cost Calculator.

### Environment Variables

| Variable | Description | Required |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `CRON_SECRET` | Bearer token for securing the cron endpoint | No (recommended for production) |

## API Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/stats` | GET | Fetch global cleaning statistics |
| `/api/stats` | POST | Increment cleaning statistics |
| `/api/models` | GET | Fetch model pricing from MongoDB (falls back to hardcoded data) |
| `/api/models/refresh` | POST | Trigger a live price refresh from LiteLLM |
| `/api/cron/update-prices` | GET | Weekly cron endpoint for automated price updates |

## Project Structure

```
app/
├── api/
│   ├── cron/update-prices/   # Weekly price update cron
│   ├── models/               # Model pricing CRUD
│   │   ├── route.ts          # GET models
│   │   └── refresh/route.ts  # POST trigger refresh
│   └── stats/route.ts        # Cleaning statistics
├── calculator/page.tsx       # Cost calculator page
├── components/
│   ├── CostCalculator.tsx    # Calculator UI
│   ├── Navbar.tsx            # Shared navigation
│   └── TextCleaner.tsx       # Text cleaner UI
├── lib/
│   ├── cleaner.ts            # Text cleaning logic
│   ├── models.ts             # Model definitions & cost math
│   ├── mongodb.ts            # Database connection
│   └── price-fetcher.ts      # LiteLLM pricing fetcher
├── globals.css
├── layout.tsx
└── page.tsx
```

## Deployment

Deploy to Vercel for automatic cron support:

```bash
vercel deploy
```

The `vercel.json` configures a weekly cron job (`0 6 * * 1` — every Monday at 6 AM UTC) to automatically refresh model pricing.

## License

MIT
