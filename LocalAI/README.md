# LocalAI Configuration

Self-hosted AI models for SynapseStrike trading platform.

## Quick Start

```bash
docker compose up -d
```

## Configuration

- **Context Size**: 8192 tokens (increased from default 4096)
- **GPU**: NVIDIA CUDA 12 support
- **Port**: 8050
- **API**: OpenAI-compatible endpoint

## Available Models

LocalAI will automatically download and configure models on first startup.

Default models include:
- GPT-4 compatible model (gpt-oss-20b)
- Text embeddings (BGE-large-en-v1.5)
- Voice synthesis (Piper TTS)

## Usage

Once running, the API is available at:
```
http://localhost:8050/v1/
```

### Example API Call

```bash
curl http://localhost:8050/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Analyze TSLA stock"}],
    "temperature": 0.7
  }'
```

## Web UI

Access the chat interface at:
```
http://localhost:8050/chat/gpt-4
```

## Integration with AIArchitect

AIArchitect backend can use LocalAI as its LLM provider by setting:

```bash
LLM_URL=http://localhost:8050
LLM_MODEL=gpt-4
```

## Troubleshooting

### Context Size Errors

If you see "exceeds available context size" errors, increase `CONTEXT_SIZE` in docker-compose.yml.

### GPU Not Detected

Ensure NVIDIA Docker runtime is installed:
```bash
nvidia-smi
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
```

### Model Not Loading

Check logs:
```bash
docker logs localai
```

Models are automatically downloaded on first use, which may take several minutes.

## Cost Savings

Running LocalAI eliminates cloud LLM API costs:
- **OpenAI GPT-4**: ~$0.03/1K tokens
- **LocalAI**: $0.00/1K tokens (after initial setup)

Expected savings: **$200-500/month** for active trading bots.
