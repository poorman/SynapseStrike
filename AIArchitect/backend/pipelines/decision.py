"""
AI Architect - Decision Pipeline
Synchronous pipeline for trading decisions
"""

import json
import logging
from typing import Any

from clients.llm_client import MainLLMClient
from clients.embeddings_client import EmbeddingsClient
from clients.vector_store import VectorStore
from prompts.decision_prompt import build_decision_prompt
from config import settings

logger = logging.getLogger(__name__)


class DecisionPipeline:
    """
    Synchronous pipeline for making trading decisions.
    
    Pipeline Steps:
    1. Embed current market context
    2. Query vector DB for similar past trades
    3. Retrieve high-confidence rules
    4. Build dynamic system prompt
    5. Call main LLM
    6. Return single decision response
    """
    
    def __init__(self):
        self.llm = MainLLMClient()
        self.embeddings = EmbeddingsClient()
        self.vector_store = VectorStore()
    
    async def execute(
        self,
        symbol: str,
        timeframe: str,
        market_context: dict[str, Any],
        question: str,
    ) -> dict[str, Any]:
        """
        Execute the decision pipeline.
        
        Args:
            symbol: Trading symbol
            timeframe: Chart timeframe
            market_context: Current market data
            question: Decision question
            
        Returns:
            Decision result with confidence and reasoning
        """
        logger.info(f"Decision pipeline started for {symbol} {timeframe}")
        
        # Step 1: Create context summary for embedding
        context_text = self._format_context_for_embedding(
            symbol=symbol,
            timeframe=timeframe,
            market_context=market_context,
        )
        
        # Step 2: Generate embedding
        embedding = await self.embeddings.embed(context_text)
        logger.debug("Generated context embedding")
        
        # Step 3: Search for similar past trades
        similar_trades = await self.vector_store.search_similar_trades(
            embedding=embedding,
            symbol=symbol,
            limit=settings.MAX_SIMILAR_TRADES,
        )
        logger.info(f"Found {len(similar_trades)} similar trades")
        
        # Step 4: Search for relevant rules
        relevant_rules = await self.vector_store.search_relevant_rules(
            embedding=embedding,
            limit=settings.MAX_RULES_CONTEXT,
            min_score=settings.MIN_RULE_CONFIDENCE,
        )
        logger.info(f"Found {len(relevant_rules)} relevant rules")
        
        # Step 5: Build prompt
        messages = build_decision_prompt(
            symbol=symbol,
            timeframe=timeframe,
            market_context=market_context,
            question=question,
            similar_trades=similar_trades,
            relevant_rules=relevant_rules,
        )
        
        # Step 6: Call LLM
        try:
            response = await self.llm.get_json_response(
                messages=messages,
                temperature=0.3,  # Lower for more deterministic decisions
                max_tokens=1024,
            )
        except Exception as e:
            logger.warning(f"JSON response failed, trying text: {e}")
            text_response = await self.llm.get_text_response(
                messages=messages,
                temperature=0.3,
                max_tokens=1024,
            )
            response = self._parse_text_response(text_response)
        
        # Validate and normalize response
        result = self._normalize_response(response)
        
        logger.info(
            f"Decision: {result['decision']} "
            f"(confidence: {result['confidence']:.2f})"
        )
        
        return result
    
    def _format_context_for_embedding(
        self,
        symbol: str,
        timeframe: str,
        market_context: dict[str, Any],
    ) -> str:
        """Format market context for embedding."""
        parts = [
            f"Symbol: {symbol}",
            f"Timeframe: {timeframe}",
        ]
        
        # Add key market metrics
        if "current_price" in market_context:
            parts.append(f"Price: {market_context['current_price']}")
        
        if "trend" in market_context:
            parts.append(f"Trend: {market_context['trend']}")
        
        if "rsi" in market_context:
            parts.append(f"RSI: {market_context['rsi']}")
        
        if "volume" in market_context:
            parts.append(f"Volume: {market_context['volume']}")
        
        # Add any additional context
        for key, value in market_context.items():
            if key not in ["current_price", "trend", "rsi", "volume"]:
                if isinstance(value, (int, float, str)):
                    parts.append(f"{key}: {value}")
        
        return " | ".join(parts)
    
    def _parse_text_response(self, text: str) -> dict[str, Any]:
        """Parse text response when JSON fails."""
        text_lower = text.lower()
        
        # Determine decision
        if "take_trade" in text_lower or "take trade" in text_lower:
            decision = "TAKE_TRADE"
        elif "no_trade" in text_lower or "no trade" in text_lower:
            decision = "NO_TRADE"
        else:
            decision = "NO_TRADE"  # Default to safe option
        
        # Extract confidence (look for numbers)
        import re
        confidence_match = re.search(r'confidence[:\s]+(\d+\.?\d*)', text_lower)
        if confidence_match:
            confidence = min(float(confidence_match.group(1)), 1.0)
        else:
            confidence = 0.5
        
        return {
            "decision": decision,
            "confidence": confidence,
            "reason": text[:500],  # First 500 chars as reason
        }
    
    def _normalize_response(self, response: dict[str, Any]) -> dict[str, Any]:
        """Normalize and validate LLM response."""
        # Normalize decision
        decision = response.get("decision", "NO_TRADE").upper()
        if decision not in ["TAKE_TRADE", "NO_TRADE"]:
            decision = "NO_TRADE"
        
        # Normalize confidence
        confidence = response.get("confidence", 0.5)
        if isinstance(confidence, str):
            try:
                confidence = float(confidence)
            except ValueError:
                confidence = 0.5
        confidence = max(0.0, min(1.0, confidence))
        
        # Get reason
        reason = response.get("reason", response.get("reasoning", "No reasoning provided"))
        
        return {
            "decision": decision,
            "confidence": confidence,
            "reason": str(reason),
        }
