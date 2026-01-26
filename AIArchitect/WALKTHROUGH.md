# AI Architect - Implementation Walkthrough

## Summary

Successfully implemented a complete **AI trading decision system** with memory, reflection, and learning capabilities.

## Project Location
`~/scripts/AI Architect/`

## Files Created

| File | Purpose |
|------|---------|
| [docker-compose.yml](file:///home/pbieda/scripts/AI%20Architect/docker-compose.yml) | 6 services: LLMs, embeddings, Qdrant, PostgreSQL, backend |
| [init.sql](file:///home/pbieda/scripts/AI%20Architect/init.sql) | Database schema for trades, rules, statistics |
| [main.py](file:///home/pbieda/scripts/AI%20Architect/backend/main.py) | FastAPI app with /api/decision and /api/trade/closed |
| [decision.py](file:///home/pbieda/scripts/AI%20Architect/backend/pipelines/decision.py) | Sync pipeline: embed → search → prompt → LLM |
| [learning.py](file:///home/pbieda/scripts/AI%20Architect/backend/pipelines/learning.py) | Async pipeline: critique → rules → memory |

## Port Mapping

| Port | Service |
|------|---------|
| 8060 | Qwen2.5-32B (Main LLM) |
| 8061 | DeepSeek-R1-14B (Critic) |
| 8062 | BGE-large (Embeddings) |
| 8063 | Qdrant (Vector Memory) |
| 8064 | PostgreSQL (Trade Logs) |
| 8065 | FastAPI Backend |

## Quick Start

```bash
cd ~/scripts/AI\ Architect
docker compose up -d
```

## API Endpoints

- **POST /api/decision** - Get trading decision
- **POST /api/trade/closed** - Submit completed trade for learning
- **GET /api/rules** - View extracted trading rules
- **GET /api/statistics/{symbol}** - View performance stats

## Architecture Highlights

1. **Deterministic Orchestration** - LLM never controls execution
2. **Semantic Memory** - Past trades searchable by similarity
3. **Auto-learning** - Rules extracted from each trade
4. **Fully Local** - No cloud dependencies
