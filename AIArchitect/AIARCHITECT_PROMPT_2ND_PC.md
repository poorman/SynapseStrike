# 🤖 AIArchitect - Connection Guide for SynapseStrike

**Use this document to connect SynapseStrike on PC2 to AIArchitect running on 10.0.0.247**

---

## 🔌 Quick Setup for SynapseStrike

### OpenAI-Compatible AI Model Configuration

Add this AI model in SynapseStrike settings:

| Field | Value |
|-------|-------|
| **Name** | `AI Architect (Full Pipeline)` |
| **Type** | `Local AI (localai)` or `OpenAI Compatible` |
| **Base URL** | `http://10.0.0.247:8065/v1` |
| **API Key** | `sk-aiarchitect-001` |
| **Model** | `ai-architect` |

> **Important**: Use port `8065` (Backend) NOT the individual LLM ports. This runs the full 6-step pipeline.

---

## 🧠 How the AI Models Work Together

AIArchitect is NOT a single AI model - it's an **orchestrated pipeline** of 6 AI services working together:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        YOUR MESSAGE FROM SYNAPSESTRIKE                      │
│                  "Should I buy TSLA at $245?"                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BACKEND API (Port 8065)                                │
│                  Orchestrates all AI services                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ STEP 1        │           │ STEP 2        │           │ STEP 3        │
│ Embeddings    │──────────▶│ Qdrant Search │──────────▶│ Rules         │
│ (Port 8062)   │           │ (Port 8063)   │           │ (YAML files)  │
│               │           │               │           │               │
│ Converts text │           │ Finds similar │           │ Loads risk    │
│ to 768-dim    │           │ past trades   │           │ management    │
│ vectors       │           │ from memory   │           │ constraints   │
└───────────────┘           └───────────────┘           └───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ STEP 4: Build Dynamic Prompt  │
                    │ Combines: Market + History +  │
                    │ Rules → Context-aware prompt  │
                    └───────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │ STEP 5a           │           │ STEP 5b           │
        │ Main LLM          │           │ Critic LLM        │
        │ (Port 8060)       │           │ (Port 8061)       │
        │                   │           │                   │
        │ Qwen2.5-14B       │           │ Qwen2.5-7B        │
        │ Makes decision    │           │ Validates it      │
        │ GPU 0: RTX 3090   │           │ GPU 1: RTX 3080Ti │
        └───────────────────┘           └───────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
                    ┌───────────────────────────────┐
                    │ CONSENSUS ENGINE              │
                    │ Both LLMs must agree          │
                    │ for trade execution           │
                    └───────────────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────────────────────────────────┐
        │ STEP 6: Log Decision                                  │
        │ • PostgreSQL (Port 8064) - Structured trade logs      │
        │ • Qdrant (Port 8063) - Vector memory for learning     │
        └───────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RESPONSE TO SYNAPSESTRIKE                            │
│   { action: "BUY", confidence: 0.82, reasoning: "..." }                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📡 Available Endpoints

### Primary Endpoint (Use This!)

| Endpoint | Port | URL | Purpose |
|----------|------|-----|---------|
| **Backend API** | 8065 | `http://10.0.0.247:8065/v1` | Full pipeline, OpenAI-compatible |

### Direct Access (Advanced)

| Service | Port | URL | When to Use |
|---------|------|-----|-------------|
| Main LLM | 8060 | `http://10.0.0.247:8060/v1` | Direct chat (skips pipeline) |
| Critic LLM | 8061 | `http://10.0.0.247:8061/v1` | Direct validation |
| Embeddings | 8062 | `http://10.0.0.247:8062` | Text to vectors |
| Qdrant | 8063 | `http://10.0.0.247:8063` | Vector database |
| PostgreSQL | 8064 | `10.0.0.247:8064` | Trade logs |

---

## 🧪 Test Connection from PC2

```bash
# Test Backend API (recommended)
curl http://10.0.0.247:8065/v1/models

# Test trading decision
curl -X POST http://10.0.0.247:8065/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-aiarchitect-001" \
  -d '{
    "model": "ai-architect",
    "messages": [{"role": "user", "content": "Should I buy TSLA at $245?"}]
  }'
```

---

## ⚡ Key Benefits of Using Port 8065

1. **Full Pipeline** - Uses all 6 steps (embeddings, memory, rules, dual LLM)
2. **Learning** - Remembers past trades and learns from outcomes
3. **Validation** - Two LLMs cross-check each decision
4. **Risk Management** - Applies trading rules automatically
5. **OpenAI Compatible** - Works with any OpenAI-compatible client

---

## 🔧 If Connection Fails

### Check Services on 10.0.0.247

```bash
# In WSL on the AIArchitect machine
docker compose ps
curl http://localhost:8065/health
```

### Port Forwarding (WSL)

If services run in WSL, ensure Windows port forwarding is set up:

```powershell
# Run as Administrator in PowerShell on 10.0.0.247
$wslIP = "172.18.27.225"  # Check with: wsl hostname -I
netsh interface portproxy add v4tov4 listenport=8065 listenaddress=0.0.0.0 connectport=8065 connectaddress=$wslIP
```

---

## 📊 Example SynapseStrike Integration

When SynapseStrike sends a trade query, AIArchitect:

1. **Embeds** the market context into vectors
2. **Searches** for similar past trades in Qdrant
3. **Loads** applicable trading rules
4. **Builds** a context-aware prompt
5. **Asks** Main LLM (14B) for decision
6. **Validates** with Critic LLM (7B)
7. **Returns** `{action, confidence, reasoning}`

---

## 🔑 API Keys (Consistent Placeholders)

```yaml
Main Backend:    sk-aiarchitect-001
Main LLM:        sk-aiarchitect-main-001
Critic LLM:      sk-aiarchitect-critic-001
Embeddings:      sk-aiarchitect-embed-001
```

> Note: vLLM accepts any API key. These are placeholders for consistency.

---

**Last Updated**: 2026-01-27
**AIArchitect Server**: 10.0.0.247
