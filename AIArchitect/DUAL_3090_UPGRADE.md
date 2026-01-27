# Dual RTX 3090 Optimized Configuration

This configuration is designed for when you replace the 3080 Ti with a second 3090. Total VRAM: 48GB.

## 🚀 Key Upgrades
- **Full Context**: Unlocks **32,768 tokens** for the Qwen2.5-32B model.
- **Improved Performance**: Higher VRAM allows for larger KV caches, reducing re-computations.
- **Load Balancing**: Distributes the secondary models to balance memory usage.

## 🛠️ The Configuration

Save this as `docker-compose.yml` (overwriting the old one) once the hardware is installed:

```yaml
services:
  llm_main:
    image: vllm/vllm-openai:v0.6.3.post1
    container_name: llm_main_qwen32b
    environment:
      - CUDA_VISIBLE_DEVICES=0,1
      - CUDA_DEVICE_ORDER=PCI_BUS_ID
    command: >
      --model Qwen/Qwen2.5-32B-Instruct-AWQ
      --quantization awq_marlin
      --dtype float16
      --max-model-len 32768
      --tensor-parallel-size 2
      --gpu-memory-utilization 0.90
      --trust-remote-code
      --enforce-eager
    ports:
      - "8060:8000"
    shm_size: '2gb'
    volumes:
      - huggingface_cache:/root/.cache/huggingface
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  llm_critic:
    image: vllm/vllm-openai:v0.6.3.post1
    container_name: llm_critic_qwen
    environment:
      - CUDA_VISIBLE_DEVICES=1
      - CUDA_DEVICE_ORDER=PCI_BUS_ID
    command: >
      --model Qwen/Qwen2.5-7B-Instruct-AWQ
      --quantization awq_marlin
      --dtype float16
      --max-model-len 4096
      --gpu-memory-utilization 0.85
      --trust-remote-code
    ports:
      - "8061:8000"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  embeddings:
    image: michaelf34/infinity:0.0.51
    container_name: embeddings_bge
    environment:
      - CUDA_VISIBLE_DEVICES=1
    command: v2 --model-id BAAI/bge-large-en-v1.5 --device cuda --port 80
    ports:
      - "8062:80"
```

## 📊 Expected Memory Map
- **GPU 0 (3090 #1)**: ~9GB (Main LLM) + OS/Display (~2GB) = **11GB / 24GB** (Plenty of headroom)
- **GPU 1 (3090 #2)**: ~9GB (Main LLM) + 5GB (Critic) + 2GB (Embeddings) = **16GB / 24GB** (Plenty of headroom for 32K context cache)
