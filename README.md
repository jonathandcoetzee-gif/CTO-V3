# Revenue OS

An AI-powered Revenue Operating System where ACE (an LLM orchestrator) schedules and routes four automated income pipelines — YouTube content, sneaker arbitrage, e-book publishing, and NFT minting — via n8n workflows.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ACE Core (Node.js)                    │
│  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ index.js  │ │ticket-   │ │ state-   │ │conv-     │  │
│  │ (Express  │ │system.js │ │manager.js│ │optimizer │  │
│  │ +heartbeat)│ │(queue)   │ │(metrics) │ │.js (A/B) │  │
│  └─────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│        │            │           │              │        │
│        └────────────┴───┬───────┴──────────────┘        │
│                         │                               │
│                  ┌──────▼──────┐                        │
│                  │ inference.js │ (OpenAI gpt-4o)        │
│                  └──────┬──────┘                        │
│                         │                               │
│                  ┌──────▼──────┐                        │
│                  │  router.js  │ → POST /webhook/*      │
│                  └─────────────┘                        │
└─────────────────────────────────────────────────────────┘
                          │
                HTTP POST /webhook/*
                          │
                ┌─────────▼──────────┐
                │   n8n (Docker)     │
                │   Workflow Engine  │
                └──────┬───┬───┬────┘
          ┌────────────┘   │   └────────────┐
          ▼                ▼                ▼
   ┌──────────┐   ┌──────────────┐   ┌──────────┐
   │ YouTube  │   │ Sneaker Arb  │   │   NFT     │
   │ Pipeline │   │   Pipeline   │   │ Pipeline  │
   └──────────┘   └──────────────┘   └──────────┘
   ┌──────────┐
   │  E-Book  │
   │ Pipeline │
   └──────────┘
```

## Revenue Priority (fastest to cash first)

1. **Sneaker Arbitrage** — Capture ≥30% price spreads between StockX and GOAT (hourly scans)
2. **ACE Client Stores** — Potential deployed storefronts for clients (growth lever)
3. **YouTube Automation** — Daily faceless videos with AdSense/affiliate revenue
4. **E-Book Generation** — KDP royalties from weekly AI-generated books
5. **NFT Minting** — Generative art minted every 2 hours

## Quick Start

### Prerequisites
- Docker 20.10+ & Docker Compose
- Node.js 18+
- API keys (see `.env.template`)

### Setup

```bash
# 1. Clone and configure
cp .env.template .env
# Edit .env with your API keys

# 2. Start n8n + ACE Core
npm run docker:up

# 3. Import n8n workflows (auto on first boot, or manually):
#    Open http://localhost:5678 → Settings → Import

# 4. Verify ACE Core is running
curl http://localhost:3001/health
```

### API Endpoints (ACE Core)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/webhook/ace` | Main ticket ingestion |
| POST | `/webhook/ace/optimize` | Generate funnel variants |
| POST | `/webhook/ace/ticket` | Manual ticket enqueue |
| GET | `/webhook/ace/queue` | Queue inspection |
| GET | `/health` | Health check |
| GET | `/state` | Full system state |
| GET | `/metrics` | Revenue/KPI summary |

## Project Structure

```
revenue-os/
├── ace-core/           # ACE orchestrator (Node.js + Express)
│   ├── index.js        # HTTP server + heartbeat loop
│   ├── ticket-system.js # JSON-backed task queue
│   ├── state-manager.js # Performance metrics store
│   ├── inference.js    # OpenAI decision layer (gpt-4o)
│   ├── router.js       # n8n webhook dispatcher
│   └── conv-optimizer.js # Conversion A/B test agent
├── services/           # Revenue pipeline scripts
│   ├── youtube-agent/  # Video script + upload
│   ├── sneaker-arb/    # StockX/GOAT arbitrage
│   ├── ebook-agent/    # KDP e-book generation
│   ├── nft-agent/      # NFT art minting
│   └── billing/        # Stripe + ROI tracking
├── cloud-config/       # Service wrappers
├── n8n/workflows/      # n8n workflow JSON definitions
├── docker/             # Docker Compose + Dockerfiles
├── .env.template       # API key template
└── package.json        # Top-level dependencies
```

## Wallet

NFT minting revenues are collected at: **0x9339e763c59f1dAB9147aF508FaB229f0227cFB6**

## KPIs

- **Total Daily Revenue** (sum of all streams)
- **Profit per Stream** (revenue minus API credits, gas fees, infra)
- **ACE Decision Accuracy** (% of tickets completed without failure)
- **Pipeline Uptime** (each workflow runs on schedule)
- **Arbitrage Gap Capture Rate** (% of detected ≥30% gaps executed)
- **Conversion Lift** (improvement from optimizer A/B test wins)