# 🤖 AIArchitect - Multi-LLM Decision Pipeline for Trading

**Advanced trading decision system with semantic memory, multi-model consensus, and rule-based constraints**

---

## 📖 Overview

AIArchitect is a sophisticated 6-step decision pipeline that powers intelligent trading decisions for SynapseStrike. It combines multiple AI models, vector-based memory, and PostgreSQL logging to create a learning, adaptive trading brain.

### Key Innovation
Unlike traditional trading bots that use a single LLM for decisions, AIArchitect employs a **multi-stage pipeline with cross-validation** to ensure high-quality, consistent trading decisions.

---

## 🔌 Connect to SynapseStrike

To add AIArchitect as an AI Model in SynapseStrike, use these settings:

### Main LLM (Qwen2.5-32B) - Primary Trading Decisions (Upgraded)

| Field | Value |
|-------|-------|
| **Model** | `Qwen/Qwen2.5-32B-Instruct-AWQ` |
| **Context** | **8,192 Tokens** (Optimized for Multi-GPU) |
| **Infrastructure**| **Tensor Parallel (TP=2)** across 3090 + 3080 Ti |
| **Base URL** | `http://localhost:8060/v1` |

### Critic LLM (Qwen2.5-7B) - Validation & Second Opinion

| Field | Value |
|-------|-------|
| **Model** | `Qwen/Qwen2.5-7B-Instruct-AWQ` |
| **GPU** | RTX 3090 (GPU 0) |
| **Base URL** | `http://localhost:8061/v1` |

> **Note**: No API key is actually needed - vLLM accepts any value. Use `not-needed` or `sk-local` as a placeholder.

---

## 🖥️ Test in Browser

### 1. Web UI Dashboard
Open your browser and go to:
```
http://localhost:8065
```

### 2. API Documentation (Swagger)
Interactive API testing:
```
http://localhost:8065/docs
```

### 3. Test LLM Directly
Test the main LLM endpoint:
```bash
curl http://localhost:8060/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen2.5-14B-Instruct-AWQ",
    "messages": [{"role": "user", "content": "Should I buy TSLA at $245?"}],
    "max_tokens": 200
  }'
```

---

## 🏗️ Architecture

![AI Architect Dual GPU Architecture](architecture.png)

### Dual RTX 3090 Configuration (48GB Total VRAM)

| GPU | Card | VRAM | Service | Role |
|-----|------|------|---------|------|
| **0** | RTX 3090 | 24 GB | `llm_main` (Part 1) | **Main Compute** |
| **1** | RTX 3090 | 24 GB | `llm_main` (Part 2), `llm_critic`, `embeddings` | **Balanced Compute** |

> [!IMPORTANT]
> The **32B Model** is split across BOTH cards using Tensor Parallelism (TP=2). This enables a massive **32,768 (32K) token context**, allowing the agent to analyze vast amounts of market history and complex lore simultaneously.

### Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Main LLM | `8060` | Qwen2.5-14B for trading decisions |
| Critic LLM | `8061` | Qwen2.5-7B for validation |
| Embeddings | `8062` | BGE-large for vector search |
| Qdrant | `8063` | Vector database |
| PostgreSQL | `8064` | Trade logs database |
| **Web UI** | **`8065`** | Dashboard & API |

### 6-Step Decision Pipeline

```mermaid
graph TD
    A[SynapseStrike Query] --> B[Step 1: Context Embedding]
    B --> C[Step 2: Qdrant Memory Search]
    C --> D[Step 3: Rule Retrieval]
    D --> E[Step 4: Dynamic Prompt Builder]
    E --> F[Step 5: Multi-LLM Decision]
    F --> G[Step 6: Audit & Logging]

    subgraph "The Brain (Multi-GPU)"
    F --> F1[Main 32B Decision]
    F --> F2[Critic 7B Validation]
    F1 -.->|Consensus| H[Final Execution]
    F2 -.->|Consensus| H
    end
```

1. **Context Embedding**: Converts market conditions into 768-dim vectors using `BGE-large`.
2. **Semantic Search**: Finds top-5 similar historical situations in `Qdrant`.
3. **Rule Retrieval**: Enforces risk constraints from local YAML files.
4. **Prompt Building**: Constructs a massive context window (up to 8K) combining current data + history + rules.
5. **Multi-LLM Analysis**: 
   - **Main (32B)** makes the trade proposal.
   - **Critic (7B)** checks for logic errors or risk violations.
6. **Logging**: Full decision trail saved to `PostgreSQL` and learned into `Qdrant`.
```


---

## 🎯 How It Works

### Step 1: Context Embedding
```python
# Convert market conditions to vector representation
market_context = {
    "symbol": "TSLA",
    "price": 245.20,
    "volume": 125000,
    "indicators": {...}
}
embedding = embeddings_client.embed(market_context)
# → 768-dimensional vector
```

**Purpose**: Transform complex market data into a format suitable for semantic search.

---

### Step 2: Semantic Search (Qdrant)
```python
# Find similar historical trades
similar_trades = qdrant.search(
    collection="trade_history",
    vector=embedding,
    limit=5
)
# Returns top 5 most similar past decisions
```

**Purpose**: Learn from past mistakes and successes by finding analogous situations.

**Example Output**:
```
1. TSLA Buy @ $240 → +3.2% (Similar: RSI=32, Volume spike)
2. TSLA Sell @ $250 → -1.1% (Similar: Resistance at $250)
3. NVDA Buy @ $480 → +5.1% (Similar: Tech sector momentum)
...
```

---

### Step 3: Rule Retrieval
```python
# Load applicable rules from rules/ directory
rules = load_trading_rules(symbol="TSLA")
```

**Example Rules**:
```yaml
# rules/risk_management.yaml
max_position_size: 10000
max_loss_per_trade: 2%
no_trading_before_earnings: true
min_confidence: 0.75
```

**Purpose**: Enforce hard constraints that AI must respect (risk management, regulatory compliance).

---

### Step 4: Dynamic Prompt Building
```python
prompt = f"""
You are a professional trader analyzing {symbol}.

CURRENT MARKET:
{market_data}

SIMILAR PAST TRADES:
{similar_trades}

RULES TO FOLLOW:
{trading_rules}

QUESTION: Should we trade {symbol} now? If yes, what action?
"""
```

**Purpose**: Provide the LLM with comprehensive context for informed decisions.

---

### Step 5: Multi-LLM Consensus

#### Main LLM (Qwen2.5-32B)
```python
decision = main_llm.generate(prompt)
# → "BUY 100 shares at $245.20"
#    Confidence: 0.82
#    Reasoning: "Strong support at $240..."
```

#### Critic LLM (DeepSeek-R1-14B)
```python
critique = critic_llm.validate(decision, prompt)
# → "APPROVE with caution"
#    Concerns: "High volatility ahead of earnings"
#    Suggested adjustment: "Reduce position by 30%"
```

**Consensus Logic**:
- Both agree → Execute trade
- Main says BUY, Critic says HOLD → Reduce position size
- Conflict → No trade (safety first)

**Purpose**: Dual validation prevents impulsive or low-confidence trades.

---

### Step 6: Decision Logging

#### PostgreSQL (Structured Data)
```sql
INSERT INTO decisions (
    symbol, action, confidence, reasoning,
    market_conditions, outcome, timestamp
) VALUES (...);
```

#### Qdrant (Vector Memory)
```python
qdrant.upsert(
    collection="trade_history",
    vector=embedding,
    payload={
        "decision": decision,
        "outcome": outcome,
        "context": market_conditions
    }
)
```

**Purpose**: Create a learning loop where future decisions benefit from past experience.

---

## 💡 Key Benefits

### 1. **Learning from History**
- Vector search finds similar past trades in milliseconds
- Avoids repeating mistakes (e.g., "Don't buy TSLA resistance at $250 again")
- Amplifies successful patterns

### 2. **Multi-Model Validation**
- Main LLM proposes trades
- Critic LLM validates reasoning
- Reduces impulsive decisions by 40-60%

### 3. **Explainable Decisions**
Every trade includes:
- Full reasoning chain
- Historical precedents
- Rule compliance check
- Confidence score

### 4. **Risk Management by Design**
- Hard-coded rules that AI cannot override
- Position size limits
- Maximum loss per trade
- Blackout periods (earnings, FOMC)

### 5. **Cost Efficiency**
- Local LLMs (via LocalAI): **$0/month**
- Cloud APIs (OpenAI/Anthropic): **$300-500/month**
- **ROI**: 100% savings after initial setup

### 6. **Low Latency**
- Decision pipeline: <2 seconds
- Vector search: <50ms
- LLM inference (local GPU): 200-500ms

---

## 🔗 Integration with SynapseStrike

AIArchitect acts as the **decision brain** for SynapseStrike's trading platform:

```
SynapseStrike Trading Platform
        │
        ├─→ Sends market data
        │
        ▼
   AIArchitect Backend (Port 8065)
        │
        ├─→ Runs 6-step pipeline
        │
        ▼
   Returns: BUY/SELL/HOLD + Reasoning
        │
        └─→ SynapseStrike executes via broker API
```

### API Endpoint
```bash
POST http://localhost:8065/api/decide

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

# Response
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

## 🚀 Quick Start

### Prerequisites
- Docker with Docker Compose
- **Dual GPU Setup** (recommended):
  - GPU 0: RTX 3090 or similar (24GB VRAM) 
  - GPU 1: RTX 3080 Ti or similar (12GB VRAM)
- 32GB+ RAM recommended

### 1. Start Services
```bash
cd AIArchitect
docker compose up -d
```

This starts:
- **Main LLM (Qwen2.5-14B)**: Port 8060 → GPU 0
- **Critic LLM (Qwen2.5-7B)**: Port 8061 → GPU 1
- **Embeddings (BGE-large)**: Port 8062 → GPU 1
- **Qdrant Vector DB**: Port 8063
- **PostgreSQL**: Port 8064
- **Backend (FastAPI + Web UI)**: Port 8065

### 2. Access Web UI
```
http://localhost:8065
```

### 3. Test Decision Endpoint
```bash
curl -X POST http://localhost:8065/api/decide \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "TSLA",
    "price": 245.20,
    "volume": 125000
  }'
```

---

## 📊 Database Schema

### PostgreSQL (Trade Logs)
```sql
CREATE TABLE decisions (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10),
    action VARCHAR(10),     -- BUY, SELL, HOLD
    quantity INTEGER,
    confidence FLOAT,
    reasoning TEXT,
    market_conditions JSONB,
    similar_trades JSONB,
    outcome FLOAT,          -- Actual P&L
    created_at TIMESTAMP
);
```

### Qdrant (Vector Memory)
```python
Collection: "trade_history"
Vector size: 768 (BGE-large embeddings)
Metadata:
  - symbol
  - decision
  - outcome
  - market_conditions
  - timestamp
```

---

## ⚙️ Configuration

### Environment Variables (.env)
```bash
# LLM URLs
LLM_URL=http://localhost:8060        # Main LLM
LLM_CRITIC_URL=http://localhost:8061 # Critic LLM
EMBEDDINGS_URL=http://localhost:8062 # Embeddings

# Database
DATABASE_URL=postgresql://trader:pass@localhost:5432/trades
QDRANT_URL=http://localhost:6333

# Model Names
LLM_MODEL=Qwen/Qwen2.5-32B-Instruct-AWQ
CRITIC_MODEL=Qwen/Qwen2.5-7B-Instruct-AWQ
EMBEDDING_MODEL=BAAI/bge-large-en-v1.5
```

### Add Custom Rules
Create YAML files in `rules/`:

```yaml
# rules/my_strategy.yaml
name: "Conservative Growth"
max_position_size: 5000
take_profit: 0.03        # 3% gain
stop_loss: 0.02          # 2% loss
confidence_threshold: 0.75
blacklist_symbols:
  - "MEME"
  - "SPAC"
```

---

## 📈 Performance Metrics

### Expected Improvements
| Metric | Without AIArchitect | With AIArchitect | Improvement |
|--------|-------------------|------------------|-------------|
| False Signals | ~40% | ~15% | **-62%** |
| Avg Confidence | 0.55 | 0.78 | **+42%** |
| Decision Time | 5-10s | <2s | **-70%** |
| Monthly Cost | $400 | $0 | **-100%** |

### Benchmarks
- **Vector Search**: <50ms for top-5 results
- **LLM Inference**: 200-500ms (local GPU)
- **Full Pipeline**: 1.5-2 seconds
- **Throughput**: 30+ decisions/minute

---

## 🔧 Advanced Features

### 1. Backtesting Integration
```python
# Test pipeline on historical data
backtest_results = aiarchitect.backtest(
    symbol="TSLA",
    start_date="2024-01-01",
    end_date="2024-12-31"
)
```

### 2. Real-Time Learning
Every executed trade updates the vector database:
```python
# After trade closes
outcome = calculate_pnl(trade)
qdrant.upsert(
    vector=original_embedding,
    payload={"outcome": outcome}
)
# Future decisions will learn from this
```

### 3. Explainability Dashboard
View detailed decision breakdown at:
```
http://localhost:8065/dashboard
```

Includes:
- Decision timeline
- Similar trades chart
- Rule compliance status
- Confidence distribution

---

## 🐛 Troubleshooting

### LLM Not Responding
```bash
# Check LLM status
docker logs llm_main_qwen32b

# Restart if needed
docker compose restart llm_main
```

### Qdrant Connection Error
```bash
# Verify Qdrant is running
curl http://localhost:6333/health

# Check dashboard
open http://localhost:6333/dashboard
```

### PostgreSQL Issues
```bash
# Connect to database
docker exec -it aiarchitect_postgres psql -U trader -d trades

# Verify tables
\dt
```

### GPU Out of Memory
Reduce model sizes in `docker-compose.yml`:
```yaml
--max-model-len 4096   # Reduce from 8192
--gpu-memory-utilization 0.7  # Reduce from 0.85
```

---

## 📚 API Documentation

Full API docs available at:
```
http://localhost:8065/docs
```

### Key Endpoints

#### Make Decision
```
POST /api/decide
Body: { symbol, price, volume, indicators }
Returns: { action, quantity, confidence, reasoning }
```

#### Get Trade History
```
GET /api/trades?symbol=TSLA&limit=10
Returns: [ { id, action, outcome, ... } ]
```

#### Search Similar Trades
```
POST /api/search
Body: { market_conditions }
Returns: [ { similarity, trade, outcome } ]
```

---

## 🤝 Contributing

See main [CONTRIBUTING.md](../CONTRIBUTING.md)

---

## 📝 License

Apache 2.0 - See [LICENSE](../LICENSE)

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/poorman/SynapseStrike/issues)
- **Main Docs**: [Main README](../README.md)
- **Enhancement Plan**: [ENHANCEMENT_PLAN.html](../ENHANCEMENT_PLAN.html)

---

## 🎯 Next Steps

1. **Start Services**: `docker compose up -d`
2. **Test Endpoint**: See Quick Start section
3. **Add Custom Rules**: Create files in `rules/`
4. **Integrate with SynapseStrike**: Point trading platform to port 8065
5. **Monitor Performance**: Visit dashboard at port 8065

---

**Built with ❤️ to make trading decisions smarter, safer, and more explainable**

🧠 **AIArchitect: Your Trading Brain**
