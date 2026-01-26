# 🚀 SynapseStrike - AI-Powered Trading Ecosystem

**A complete AI trading platform combining local LLMs, advanced decision engines, and automated trading**

---

## 📦 Repository Structure

```
SynapseStrike/
├── SynapseStrike/          # Go-based trading platform
├── LocalAI/                # Self-hosted LLM infrastructure  
├── AIArchitect/            # Python decision pipeline backend
├── README.md               # This file
├── CHANGELOG.md            # Version history
├── ENHANCEMENT_PLAN.html   # Feature roadmap & integration guide
├── install.sh              # Interactive installer
├── LICENSE                 # Apache 2.0 License
└── .env.example            # Environment configuration template
```

## 🎯 Three Pillars

### 1. **SynapseStrike Trading Platform**
- Go-based high-performance trading engine
- Multi-broker support (Alpaca, Interactive Brokers, etc.)
- Real-time market data processing
- Advanced order management
- **Location**: `SynapseStrike/`

### 2. **LocalAI** 
- Self-hosted LLM infrastructure
- 8192 token context size
- OpenAI-compatible API
- GPU-accelerated inference
- **Zero monthly API costs**
- **Location**: `LocalAI/`
- **Port**: 8050

### 3. **AIArchitect**
- 6-step decision pipeline
- Multi-LLM consensus (Qwen2.5-32B + DeepSeek-R1-14B)
- Semantic memory with Qdrant vector DB
- PostgreSQL trade logging
- FastAPI web interface
- **Location**: `AIArchitect/`
- **Port**: 8065

---

## 🚀 Quick Start

### Prerequisites
- **Docker** with Docker Compose
- **NVIDIA GPU** with 24GB+ VRAM (recommended) or CPU
- **50GB** disk space
- **Linux/macOS** (Windows via WSL2)

### One-Command Install

```bash
./install.sh
```

The installer will guide you through:
1. Checking prerequisites
2. Selecting components to install
3. Configuring services
4. Starting containers

### Manual Installation

#### 1. LocalAI (Self-Hosted LLMs)
```bash
cd LocalAI
docker compose up -d
```

#### 2. AIArchitect (Decision Engine)
```bash
cd AIArchitect
cp .env.example .env  # Edit with your settings
docker compose up -d
```

#### 3. Trading Platform
```bash
cd SynapseStrike
./install.sh
```

---

## 🌐 Service Endpoints

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| LocalAI | 8050 | http://localhost:8050 | LLM API & Chat UI |
| AIArchitect Backend | 8065 | http://localhost:8065 | Decision Pipeline Web UI |
| Qdrant Vector DB | 8063 | http://localhost:8063/dashboard | Semantic Memory |
| PostgreSQL | 8064 | localhost:8064 | Trade Logs Database |
| Main LLM | 8060 | http://localhost:8060 | Qwen2.5-32B vLLM |
| Critic LLM | 8061 | http://localhost:8061 | DeepSeek-R1-14B vLLM |
| Embeddings | 8062 | http://localhost:8062 | BGE-large embeddings |

---

## 💡 Key Features

### 🤖 AI-Powered Decision Making
- **Multi-LLM Consensus**: Primary + Critic models validate each other
- **Semantic Memory**: Learn from historical trades via vector search
- **Rule-Based Constraints**: Never break risk management rules
- **Cost Effective**: $200-500/month savings vs cloud APIs

### 📊 Advanced Trading
- **Multi-Timeframe Analysis**: Trade when all timeframes align
- **Adaptive Position Sizing**: Kelly Criterion-based sizing
- **Smart Entry/Exit**: Limit orders at VWAP ± ATR
- **Real-Time Metrics**: Sharpe ratio, max drawdown, P&L tracking

### 🔒 Privacy & Security
- **100% Local Execution**: Trading decisions never leave your server
- **No API Rate Limits**: Unlimited requests to your own LLMs
- **Complete Audit Trail**: Every decision logged in PostgreSQL
- **Encrypted Communication**: TLS between services

---

## 📚 Documentation

### Getting Started
1. **Read This**: [ENHANCEMENT_PLAN.html](./ENHANCEMENT_PLAN.html) - Feature roadmap and integration guide
2. **LocalAI Setup**: [LocalAI/README.md](./LocalAI/README.md)
3. **AIArchitect Guide**: [AIArchitect/README.md](./AIArchitect/README.md)
4. **Trading Platform**: [SynapseStrike/README.md](./SynapseStrike/README.md)

### Configuration
- **Environment Variables**: Copy `.env.example` to `.env` in each component directory
- **Trading Rules**: Add custom rules to `AIArchitect/rules/`
- **Model Configuration**: Edit `LocalAI/models/*.yaml`

---

## 🔧 Hardware Requirements

### Minimum (CPU-Only)
- **CPU**: 8+ cores
- **RAM**: 32GB
- **Storage**: 50GB SSD
- **Note**: Much slower inference

### Recommended (GPU)
- **GPU**: NVIDIA RTX 3090 (24GB VRAM)
- **CPU**: 16+ cores
- **RAM**: 64GB
- **Storage**: 100GB NVMe SSD

### Optimal (Production)
- **GPU**: NVIDIA RTX 4090 or A6000 (40GB+ VRAM)
- **CPU**: 32+ cores
- **RAM**: 128GB
- **Storage**: 500GB NVMe SSD
- **Network**: 1Gbps for real-time data

---

## 💰 Cost Analysis

### Cloud AI Costs (Monthly)
- OpenAI GPT-4: ~$300-500
- Claude 3 Opus: ~$200-400
- Embeddings API: ~$50-100
- **Total**: **$550-1000/month**

### SynapseStrike (One-Time + Hosting)
- Hardware (RTX 3090): $1200 one-time
- Electricity: ~$30/month
- **ROI**: **2-3 months**

---

## 🛣️ Roadmap

See [ENHANCEMENT_PLAN.html](./ENHANCEMENT_PLAN.html) for the complete feature roadmap, including:

**Tier 1** (High Priority)
- Multi-timeframe analysis engine
- Adaptive position sizing (Kelly Criterion)
- Smart limit order entry
- ATR-based trailing stops
- News/earnings event filter

**Tier 2** (Competitive Edge)
- Paper trading simulator
- Strategy backtesting
- Multi-strategy portfolio
- Real-time performance dashboard

**Tier 3** (Cutting Edge)
- Order flow analysis
- Social sentiment integration
- Options flow tracking
- Advanced ML pattern recognition

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📝 License

Apache 2.0 - See [LICENSE](./LICENSE)

---

## ⚠️ Disclaimer

**Trading involves substantial risk of loss. This software is for educational and research purposes. Past performance does not guarantee future results. Use at your own risk.**

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/poorman/SynapseStrike/issues)
- **Discussions**: [GitHub Discussions](https://github.com/poorman/SynapseStrike/discussions)
- **Enhancement Plan**: [ENHANCEMENT_PLAN.html](./ENHANCEMENT_PLAN.html)

---

## 🎯 Quick Commands

```bash
# Start all services
./install.sh

# Check status
docker ps

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Clean restart
docker compose down -v && docker compose up -d
```

---

**Built with ❤️ for traders who value privacy, control, and cost efficiency**

🚀 **Start Trading Smarter, Not Harder**
