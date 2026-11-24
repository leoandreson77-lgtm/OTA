# 🚀 AI-Native OTA Platform

> **Next-Generation Booking Engine + Contact Center CRM**  
> One composable platform for B2B and B2C travel, built around LLM agents, real-time supply orchestration, and automated finance.

---

## 🏛️ Platform Architecture & Monorepo Structure

```
OTA/
├── packages/
│   ├── core/                  # Unified Trip Graph, Zod Schemas & Domain Models
│   │   ├── models/trip-graph.ts    # Single Trip Graph for B2B, B2C and Contact Center
│   │   ├── schemas/flight-search.ts # Flight queries, offers, fare brands, ancillaries
│   │   └── schemas/fare-rules.ts   # Fare basis rules, penalties, void windows
│   │
│   ├── ai-engine/             # LLM Copilot, Guardrails & Proactive Disruption
│   │   ├── copilot/agent-copilot.ts     # Real-time sentiment, fare rule explainer & NBA
│   │   ├── disruption/proactive-disruption.ts # < 2 min delay detection & WhatsApp rebook
│   │   └── guardrails/pii-redactor.ts   # PCI-DSS & GDPR card/passport redactor
│   │
│   ├── supply-orchestrator/   # GDS, NDC & LCC Aggregator with Look-To-Book Shield
│   │   ├── cache/look-to-book-shield.ts # Predictive cache saving GDS query fees
│   │   ├── rules/adm-prevention.ts      # Pre-ticketing checks preventing airline ADM fines
│   │   └── orchestrator.ts              # Margin & flex ranking + multi-source fallback
│   │
│   └── money-ops/             # Automated Financial Operations & Dispute Control
│       ├── chargeback/chargeback-engine.ts # Auto-builds 3DS/e-ticket evidence pack (Reason 10.4)
│       └── recon/three-way-reconciler.ts   # Continuous 3-way match: Trip vs PSP vs BSP/ARC
│
└── apps/
    ├── api/                   # Production-Ready REST/JSON Engine exposing all services
    │   └── src/server.ts      # Endpoints for search, copilot, disruption, recon & trips
    │
    └── web/                   # Interactive Control Center & Live Simulator
        ├── public/index.html  # Full Dashboard (Booking, Copilot Desktop, Disruption & Recon)
        └── server.js          # Lightweight Node HTTP server
```

---

## ⚡ Key Modules Implemented

### 1. Unified Trip Graph (`@ota/core`)
* One single source of truth for B2C retail, B2B agents, customer care, and accounts.
* Models PNR lifecycle, Flight Segments, Multi-passenger records, Payments, and Disruptions.

### 2. Supply Orchestrator & Look-to-Book Shield (`@ota/supply-orchestrator`)
* **Look-to-book shield:** Caches search results to protect against expensive GDS query penalties.
* **ADM / ACM Prevention:** Validates Ticketing Time Limits (TTL), passenger duplicate churning, and married segments before issuance.
* **Multi-supplier fallback:** Integrates Amadeus, Sabre, and NDC with margin and conversion ranking.

### 3. AI Contact Center & Agent Copilot (`@ota/ai-engine`)
* **Live Inbound Sentiment:** Detects frustration, anger, or dispute/lawyer threats in real time.
* **Fare Rule Explainer:** Converts cryptic airline fare sheets into plain-language cancellation math and customer scripts.
* **Next Best Action (NBA):** Provides instant recommended actions (e.g. $50 goodwill voucher, involuntary waiver).
* **Automated Wrap-Up & QA:** Scores 100% of calls automatically and creates CRM cases.

### 4. Proactive Disruption Recovery (`< 2 Min SLA`)
* Detects flight delays/cancellations.
* Prioritizes travelers by loyalty tier (Platinum/Gold) and corporate travel policies.
* Auto-prices zero-dollar rebooking alternatives on partner airlines.
* Dispatches proactive WhatsApp/SMS messages before the customer calls the contact center.

### 5. Money Ops & 3-Way Reconciliation (`@ota/money-ops`)
* **Continuous 3-Way Match:** Matches Booking DB vs PSP Gateway Captured Funds vs IATA BSP Billing reports.
* **Chargeback Evidence Pack:** Assembles 3DS cryptograms, e-ticket PDFs, and IP geolocation logs to boost chargeback win rates to 95%.

---

## 🛠️ Quickstart: How to Run

### Step 1: Start the API Engine
```bash
npm run start:api
# API will start on http://localhost:4000
```

### Step 2: Start the Web Dashboard
```bash
npm run start:web
# Web UI will be live at http://localhost:3000
```

Open `http://localhost:3000` in your browser to interact with the full platform live!

