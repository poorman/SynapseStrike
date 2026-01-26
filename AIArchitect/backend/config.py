import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # LLM Configuration
    LLM_URL: str = os.getenv("LLM_URL", "http://host.docker.internal:8050")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-oss-20b")
    LLM_CRITIC_URL: str = os.getenv("LLM_CRITIC_URL", "http://llm_critic:8000")
    
    # Embeddings (uses LocalAI embeddings endpoint or dedicated service)
    EMBEDDINGS_URL: str = os.getenv("EMBEDDINGS_URL", "http://host.docker.internal:8050")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://trader:traderpass@localhost:8064/trades")
    
    # Qdrant
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:8063")
    QDRANT_COLLECTION_TRADES: str = "trades_memory"
    QDRANT_COLLECTION_RULES: str = "rules_memory"
    
    # Embedding dimension (BGE-large = 1024, LocalAI default = 384)
    EMBEDDING_DIMENSION: int = int(os.getenv("EMBEDDING_DIMENSION", "384"))
    
    # Pipeline settings
    MAX_SIMILAR_TRADES: int = 5
    MAX_RULES_CONTEXT: int = 10
    MIN_RULE_CONFIDENCE: float = 0.6

    class Config:
        env_file = ".env"

settings = Settings()
