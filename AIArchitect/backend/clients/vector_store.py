"""
AI Architect - Vector Store Client
Qdrant client wrapper for semantic memory
"""

import logging
from typing import Any
from uuid import uuid4

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from config import settings

logger = logging.getLogger(__name__)


class VectorStore:
    """Qdrant vector store client for semantic memory."""
    
    def __init__(self, url: str | None = None):
        self.url = url or settings.QDRANT_URL
        self.client = AsyncQdrantClient(url=self.url)
        
        # Collection names
        self.trades_collection = settings.QDRANT_COLLECTION_TRADES
        self.rules_collection = settings.QDRANT_COLLECTION_RULES
        
        # Vector configuration
        self.dimension = settings.EMBEDDING_DIMENSION
    
    async def initialize_collections(self) -> None:
        """Initialize Qdrant collections if they don't exist."""
        collections = await self.client.get_collections()
        existing = {c.name for c in collections.collections}
        
        # Create trades collection
        if self.trades_collection not in existing:
            await self.client.create_collection(
                collection_name=self.trades_collection,
                vectors_config=VectorParams(
                    size=self.dimension,
                    distance=Distance.COSINE,
                ),
            )
            logger.info(f"Created collection: {self.trades_collection}")
        
        # Create rules collection
        if self.rules_collection not in existing:
            await self.client.create_collection(
                collection_name=self.rules_collection,
                vectors_config=VectorParams(
                    size=self.dimension,
                    distance=Distance.COSINE,
                ),
            )
            logger.info(f"Created collection: {self.rules_collection}")
    
    async def store_trade_memory(
        self,
        trade_id: str,
        embedding: list[float],
        metadata: dict[str, Any],
    ) -> str:
        """
        Store trade in vector memory.
        
        Args:
            trade_id: Unique trade identifier
            embedding: Vector embedding of trade context
            metadata: Trade metadata for filtering
            
        Returns:
            Point ID in Qdrant
        """
        point_id = str(uuid4())
        
        await self.client.upsert(
            collection_name=self.trades_collection,
            points=[
                PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        "trade_id": trade_id,
                        **metadata,
                    },
                )
            ],
        )
        
        logger.info(f"Stored trade memory: {trade_id}")
        return point_id
    
    async def store_rule_memory(
        self,
        rule_id: str,
        embedding: list[float],
        metadata: dict[str, Any],
    ) -> str:
        """
        Store rule in vector memory.
        
        Args:
            rule_id: Unique rule identifier
            embedding: Vector embedding of rule text
            metadata: Rule metadata for filtering
            
        Returns:
            Point ID in Qdrant
        """
        point_id = str(uuid4())
        
        await self.client.upsert(
            collection_name=self.rules_collection,
            points=[
                PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        "rule_id": rule_id,
                        **metadata,
                    },
                )
            ],
        )
        
        logger.info(f"Stored rule memory: {rule_id}")
        return point_id
    
    async def search_similar_trades(
        self,
        embedding: list[float],
        symbol: str | None = None,
        limit: int = 5,
        min_score: float = 0.7,
    ) -> list[dict[str, Any]]:
        """
        Search for similar past trades.
        
        Args:
            embedding: Query embedding
            symbol: Optional symbol filter
            limit: Maximum results
            min_score: Minimum similarity score
            
        Returns:
            List of similar trades with metadata
        """
        query_filter = None
        if symbol:
            query_filter = Filter(
                must=[
                    FieldCondition(
                        key="symbol",
                        match=MatchValue(value=symbol),
                    )
                ]
            )
        
        results = await self.client.search(
            collection_name=self.trades_collection,
            query_vector=embedding,
            query_filter=query_filter,
            limit=limit,
            score_threshold=min_score,
        )
        
        return [
            {
                "id": str(r.id),
                "score": r.score,
                **r.payload,
            }
            for r in results
        ]
    
    async def search_relevant_rules(
        self,
        embedding: list[float],
        rule_type: str | None = None,
        limit: int = 10,
        min_score: float = 0.6,
    ) -> list[dict[str, Any]]:
        """
        Search for relevant trading rules.
        
        Args:
            embedding: Query embedding
            rule_type: Optional rule type filter
            limit: Maximum results
            min_score: Minimum similarity score
            
        Returns:
            List of relevant rules with metadata
        """
        conditions = [
            FieldCondition(
                key="is_active",
                match=MatchValue(value=True),
            )
        ]
        
        if rule_type:
            conditions.append(
                FieldCondition(
                    key="rule_type",
                    match=MatchValue(value=rule_type),
                )
            )
        
        query_filter = Filter(must=conditions)
        
        results = await self.client.search(
            collection_name=self.rules_collection,
            query_vector=embedding,
            query_filter=query_filter,
            limit=limit,
            score_threshold=min_score,
        )
        
        return [
            {
                "id": str(r.id),
                "score": r.score,
                **r.payload,
            }
            for r in results
        ]
    
    async def delete_trade_memory(self, trade_id: str) -> None:
        """Delete trade from vector memory."""
        await self.client.delete(
            collection_name=self.trades_collection,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="trade_id",
                        match=MatchValue(value=trade_id),
                    )
                ]
            ),
        )
        logger.info(f"Deleted trade memory: {trade_id}")
    
    async def delete_rule_memory(self, rule_id: str) -> None:
        """Delete rule from vector memory."""
        await self.client.delete(
            collection_name=self.rules_collection,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="rule_id",
                        match=MatchValue(value=rule_id),
                    )
                ]
            ),
        )
        logger.info(f"Deleted rule memory: {rule_id}")
