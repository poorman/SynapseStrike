# 🤖 AIArchitect System - Complete Reference for Antigravity AI

**Use this document to understand and work with AIArchitect on this machine.**

---

## 📁 Project Structure

```
SynapseStrike/AIArchitect/
├── docker-compose.yml      # All services (LLMs, DBs, Backend)
├── .env                    # Environment configuration
├── init.sql                # PostgreSQL schema
├── rules/                  # Trading rules (YAML files)
├── backend/
│   ├── main.py             # FastAPI app + 6-step decision pipeline
│   ├── config.py           # Configuration settings
│   ├── models.py           # SQLAlchemy ORM models
│   ├── schemas.py          # Pydantic schemas
│   ├── database.py         # DB connection
│   ├── clients/            # LLM/Embedding/Qdrant clients
│   ├── pipelines/          # Decision pipeline logic
│   ├── prompts/            # Prompt templates
│   ├── templates/          # Jinja2 HTML templates
│   └── static/             # CSS/JS assets
└── README.md               # Full documentation
```

---

## 🖼️ Architecture Overview

![AIArchitect Whiteboard Diagram](whiteboard_architecture.jpg)

---

## 🔌 Service Architecture

### Port Allocation

| Service | Port | Description |
|---------|------|-------------|
| Main LLM | `8060` | Qwen2.5-14B - Primary trading decisions |
| Critic LLM | `8061` | Qwen2.5-7B - Validation/second opinion |
| Embeddings | `8062` | BGE-large - Vector embeddings |
| Qdrant | `8063` | Vector database for semantic search |
| PostgreSQL | `8064` | Trade logs and history |
| **Backend/Web UI** | **`8065`** | FastAPI + Dashboard |

### GPU Allocation

| GPU | Card | VRAM | Service |
|-----|------|------|---------|
| GPU 0 | RTX 3090 | 24 GB | Main LLM (Qwen2.5-14B) |
| GPU 1 | RTX 3080 Ti | 12 GB | Critic LLM + Embeddings |

---

## 🔑 Hardcoded API Configuration

Use these settings consistently across all AI models:

```yaml
# Main LLM (Primary Trading Decisions)
API_ENDPOINT: http://localhost:8060/v1
API_KEY: sk-aiarchitect-main-001
MODEL_NAME: Qwen/Qwen2.5-14B-Instruct-AWQ

# Critic LLM (Validation)
API_ENDPOINT: http://localhost:8061/v1
API_KEY: sk-aiarchitect-critic-001
MODEL_NAME: Qwen/Qwen2.5-7B-Instruct-AWQ

# Embeddings
API_ENDPOINT: http://localhost:8062/embeddings
API_KEY: sk-aiarchitect-embed-001
MODEL_NAME: BAAI/bge-large-en-v1.5

# Backend API
API_ENDPOINT: http://localhost:8065/api
API_KEY: sk-aiarchitect-backend-001
```

> **Note**: vLLM accepts any API key value. These are consistent placeholders.

---

## 🎯 The 6-Step Decision Pipeline

AIArchitect implements a sophisticated trading decision pipeline:

```
┌─────────────────────────────────────────────────────────────┐
│  INPUT: Market Data (symbol, price, volume, indicators)    │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Context Embedding                                 │
│  • Convert market data → 768-dim vector                    │
│  • Uses: BGE-large-en-v1.5 (Port 8062)                     │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Semantic Search                                   │
│  • Query Qdrant for top 5 similar past trades              │
│  • Uses: Qdrant Vector DB (Port 8063)                      │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Rule Retrieval                                    │
│  • Load applicable trading rules from rules/ directory     │
│  • Risk limits, constraints, blacklists                    │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Dynamic Prompt Building                           │
│  • Combine: Market + History + Rules → Context-aware prompt│
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Multi-LLM Analysis                                │
│  • Main LLM (Qwen2.5-14B) → Primary decision               │
│  • Critic LLM (Qwen2.5-7B) → Validates reasoning           │
│  • Consensus required for execution                        │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: Decision Logging                                  │
│  • Store to PostgreSQL (structured logs)                   │
│  • Upsert to Qdrant (vector memory for future learning)    │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  OUTPUT: { action, quantity, confidence, reasoning }       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Common Operations

### Start All Services
```bash
cd /path/to/SynapseStrike/AIArchitect
docker compose up -d
```

### Check Service Status
```bash
docker compose ps
docker logs llm_main_qwen          # Main LLM logs
docker logs llm_critic_qwen        # Critic LLM logs
docker logs aiarchitect_backend    # Backend logs
```

### Test LLM Directly
```bash
curl http://localhost:8060/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-aiarchitect-main-001" \
  -d '{
    "model": "Qwen/Qwen2.5-14B-Instruct-AWQ",
    "messages": [{"role": "user", "content": "Should I buy TSLA at $245?"}],
    "max_tokens": 200
  }'
```

### Make Trading Decision
```bash
curl -X POST http://localhost:8065/api/decide \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "TSLA",
    "price": 245.20,
    "volume": 125000,
    "indicators": {"rsi": 32, "macd": "bullish"}
  }'
```

---

## 📊 API Endpoints

### Backend API (Port 8065)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/decide` | POST | Execute 6-step decision pipeline |
| `/api/trades` | GET | Get trade history |
| `/api/search` | POST | Semantic search for similar trades |
| `/docs` | GET | Swagger API documentation |
| `/` | GET | Web UI Dashboard |

### Decision Request Schema
```json
{
  "symbol": "TSLA",
  "price": 245.20,
  "volume": 125000,
  "indicators": {
    "rsi": 32,
    "macd": "bullish",
    "support": 240,
    "resistance": 250
  }
}
```

### Decision Response Schema
```json
{
  "action": "BUY",
  "quantity": 100,
  "confidence": 0.82,
  "reasoning": "Strong support at $240, RSI oversold...",
  "similar_trades": [...],
  "rules_applied": [...]
}
```

---

## ⚙️ Configuration Files

### .env (Environment Variables)
```bash
# LLM Server
LLM_URL=http://llm_main:8000
LLM_MODEL=Qwen/Qwen2.5-14B-Instruct-AWQ

# Database
POSTGRES_PASSWORD=traderpass

# Qdrant
QDRANT_URL=http://qdrant:6333
```

### Adding Trading Rules
Create YAML files in `rules/` directory:
```yaml
# rules/my_strategy.yaml
name: "Conservative Growth"
max_position_size: 5000
take_profit: 0.03
stop_loss: 0.02
confidence_threshold: 0.75
blacklist_symbols:
  - "MEME"
  - "SPAC"
```

---

## 🔧 Key Files to Edit

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Service configuration, GPU allocation |
| `.env` | Environment variables |
| `backend/main.py` | FastAPI routes + decision pipeline |
| `backend/config.py` | Configuration settings |
| `backend/pipelines/` | Pipeline step implementations |
| `backend/prompts/` | Prompt templates for LLMs |
| `rules/*.yaml` | Trading rules and constraints |

---

## 🐛 Troubleshooting

### GPU Memory Issues
```yaml
# In docker-compose.yml, reduce:
--max-model-len 4096          # from 8192
--gpu-memory-utilization 0.7  # from 0.85
```

### Service Not Starting
```bash
docker compose logs <service_name>
docker compose restart <service_name>
```

### Database Connection
```bash
docker exec -it aiarchitect_postgres psql -U trader -d trades
\dt  # List tables
```

---

## 📌 Quick Reference Card

```
╔══════════════════════════════════════════════════════════════╗
║                    AIArchitect Quick Ref                     ║
╠══════════════════════════════════════════════════════════════╣
║ Main LLM:     http://localhost:8060/v1                       ║
║ Critic LLM:   http://localhost:8061/v1                       ║
║ Embeddings:   http://localhost:8062                          ║
║ Qdrant:       http://localhost:8063                          ║
║ PostgreSQL:   localhost:8064 (user: trader, pass: traderpass)║
║ Backend UI:   http://localhost:8065                          ║
╠══════════════════════════════════════════════════════════════╣
║ Start:       docker compose up -d                            ║
║ Stop:        docker compose down                             ║
║ Logs:        docker compose logs -f <service>                ║
║ API Docs:    http://localhost:8065/docs                      ║
╚══════════════════════════════════════════════════════════════╝
```

---

**This document provides complete context for working with AIArchitect on this machine.**
