"""
AI Architect - Learning Pipeline
Asynchronous pipeline for post-trade learning
"""

import json
import logging
from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import select

from clients.llm_client import CriticLLMClient
from clients.embeddings_client import EmbeddingsClient
from clients.vector_store import VectorStore
from database import async_session
from models import Trade, Rule, Statistic, LearningQueue
from prompts.reflection_prompt import build_critique_prompt, build_rule_extraction_prompt
from config import settings

logger = logging.getLogger(__name__)


class LearningPipeline:
    """
    Asynchronous pipeline for learning from completed trades.
    
    Pipeline Steps:
    1. Summarize finished trade
    2. Critique trade using critic LLM
    3. Extract rules and mistakes
    4. Assign confidence scores
    5. Store in Qdrant and PostgreSQL
    """
    
    def __init__(self):
        self.critic = CriticLLMClient()
        self.embeddings = EmbeddingsClient()
        self.vector_store = VectorStore()
    
    async def record_trade(
        self,
        trade_id: str,
        entry: float,
        exit: float,
        result: float,
        context: dict[str, Any],
    ) -> str:
        """
        Record a completed trade in the database.
        
        Args:
            trade_id: External trade identifier
            entry: Entry price
            exit: Exit price
            result: P/L result
            context: Trade context
            
        Returns:
            Internal trade UUID
        """
        async with async_session() as session:
            # Create trade record
            trade = Trade(
                trade_id=trade_id,
                symbol=context.get("symbol", "UNKNOWN"),
                timeframe=context.get("timeframe", "1m"),
                entry_price=entry,
                exit_price=exit,
                direction=context.get("direction", "LONG"),
                result=result,
                result_percent=((exit - entry) / entry * 100) if entry else 0,
                trade_context=context,
                market_context=context.get("market_context_at_entry", {}),
                closed_at=datetime.utcnow(),
            )
            
            session.add(trade)
            await session.commit()
            await session.refresh(trade)
            
            # Add to learning queue
            queue_item = LearningQueue(trade_id=trade.id)
            session.add(queue_item)
            await session.commit()
            
            logger.info(f"Recorded trade: {trade_id} -> {trade.id}")
            return str(trade.id)
    
    async def execute_learning(self, trade_id: str) -> None:
        """
        Execute the learning pipeline for a trade.
        
        Args:
            trade_id: Internal trade UUID
        """
        logger.info(f"Learning pipeline started for trade: {trade_id}")
        
        try:
            async with async_session() as session:
                # Get trade
                result = await session.execute(
                    select(Trade).where(Trade.id == trade_id)
                )
                trade = result.scalar_one_or_none()
                
                if not trade:
                    logger.error(f"Trade not found: {trade_id}")
                    return
                
                # Step 1: Generate trade summary
                trade_summary = self._create_trade_summary(trade)
                
                # Step 2: Critique the trade
                critique = await self._critique_trade(trade, trade_summary)
                
                # Step 3: Extract rules
                extracted_rules = await self._extract_rules(trade, critique)
                
                # Step 4: Store in vector memory
                await self._store_in_memory(trade, trade_summary, extracted_rules)
                
                # Step 5: Update database
                trade.critique = critique.get("summary", "")
                trade.extracted_rules = extracted_rules
                trade.learning_processed_at = datetime.utcnow()
                
                # Step 6: Store rules in database
                await self._store_rules(session, trade, extracted_rules)
                
                # Step 7: Update statistics
                await self._update_statistics(session, trade)
                
                # Update learning queue
                queue_result = await session.execute(
                    select(LearningQueue).where(LearningQueue.trade_id == trade.id)
                )
                queue_item = queue_result.scalar_one_or_none()
                if queue_item:
                    queue_item.status = "COMPLETED"
                    queue_item.completed_at = datetime.utcnow()
                
                await session.commit()
                
            logger.info(f"Learning pipeline completed for trade: {trade_id}")
            
        except Exception as e:
            logger.error(f"Learning pipeline failed for {trade_id}: {e}", exc_info=True)
            
            # Update queue with error
            async with async_session() as session:
                queue_result = await session.execute(
                    select(LearningQueue).where(LearningQueue.trade_id == trade_id)
                )
                queue_item = queue_result.scalar_one_or_none()
                if queue_item:
                    queue_item.status = "FAILED"
                    queue_item.last_error = str(e)
                    queue_item.attempts += 1
                await session.commit()
    
    def _create_trade_summary(self, trade: Trade) -> str:
        """Create a text summary of the trade."""
        result_type = "WIN" if trade.result and trade.result > 0 else "LOSS"
        
        summary = f"""
Trade Summary:
- Symbol: {trade.symbol}
- Timeframe: {trade.timeframe}
- Direction: {trade.direction}
- Entry: {trade.entry_price}
- Exit: {trade.exit_price}
- Result: {trade.result} ({result_type})
- Result %: {trade.result_percent:.2f}%

Market Context at Entry:
{json.dumps(trade.market_context or {}, indent=2)}

Trade Context:
{json.dumps(trade.trade_context or {}, indent=2)}
"""
        return summary.strip()
    
    async def _critique_trade(
        self,
        trade: Trade,
        trade_summary: str,
    ) -> dict[str, Any]:
        """Critique the trade using the critic LLM."""
        messages = build_critique_prompt(trade_summary)
        
        try:
            response = await self.critic.get_json_response(
                messages=messages,
                temperature=0.4,
                max_tokens=2048,
            )
            return response
        except Exception as e:
            logger.warning(f"Critique JSON failed, using text: {e}")
            text = await self.critic.get_text_response(
                messages=messages,
                temperature=0.4,
                max_tokens=2048,
            )
            return {
                "summary": text,
                "what_went_well": [],
                "what_went_wrong": [],
                "lessons_learned": [],
                "overall_score": 0.5,
            }
    
    async def _extract_rules(
        self,
        trade: Trade,
        critique: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """Extract trading rules from the critique."""
        messages = build_rule_extraction_prompt(
            trade_summary=self._create_trade_summary(trade),
            critique=critique,
        )
        
        try:
            response = await self.critic.get_json_response(
                messages=messages,
                temperature=0.3,
                max_tokens=1024,
            )
            
            rules = response.get("rules", [])
            if not isinstance(rules, list):
                rules = []
            
            return rules
            
        except Exception as e:
            logger.warning(f"Rule extraction failed: {e}")
            return []
    
    async def _store_in_memory(
        self,
        trade: Trade,
        trade_summary: str,
        extracted_rules: list[dict[str, Any]],
    ) -> None:
        """Store trade and rules in vector memory."""
        # Embed and store trade
        trade_embedding = await self.embeddings.embed(trade_summary)
        
        await self.vector_store.store_trade_memory(
            trade_id=str(trade.id),
            embedding=trade_embedding,
            metadata={
                "symbol": trade.symbol,
                "timeframe": trade.timeframe,
                "direction": trade.direction,
                "result": float(trade.result) if trade.result else 0,
                "result_type": "WIN" if (trade.result and trade.result > 0) else "LOSS",
            },
        )
        
        # Embed and store each rule
        for rule in extracted_rules:
            rule_text = rule.get("rule_text", "")
            if rule_text:
                rule_embedding = await self.embeddings.embed(rule_text)
                
                await self.vector_store.store_rule_memory(
                    rule_id=str(uuid4()),
                    embedding=rule_embedding,
                    metadata={
                        "rule_text": rule_text,
                        "rule_type": rule.get("rule_type", "PATTERN"),
                        "confidence": rule.get("confidence", 0.5),
                        "source_trade_id": str(trade.id),
                        "is_active": True,
                    },
                )
    
    async def _store_rules(
        self,
        session,
        trade: Trade,
        extracted_rules: list[dict[str, Any]],
    ) -> None:
        """Store extracted rules in the database."""
        for rule_data in extracted_rules:
            rule_text = rule_data.get("rule_text", "")
            if not rule_text:
                continue
            
            rule = Rule(
                rule_id=f"rule_{trade.id}_{uuid4().hex[:8]}",
                rule_text=rule_text,
                rule_type=rule_data.get("rule_type", "PATTERN"),
                confidence=rule_data.get("confidence", 0.5),
                source_trade_id=trade.id,
                is_active=True,
            )
            session.add(rule)
    
    async def _update_statistics(self, session, trade: Trade) -> None:
        """Update trading statistics."""
        # Get or create statistics record
        result = await session.execute(
            select(Statistic).where(
                Statistic.symbol == trade.symbol,
                Statistic.timeframe == trade.timeframe,
            )
        )
        stat = result.scalar_one_or_none()
        
        if not stat:
            stat = Statistic(
                symbol=trade.symbol,
                timeframe=trade.timeframe,
            )
            session.add(stat)
        
        # Update counts
        stat.total_trades += 1
        
        if trade.result and trade.result > 0:
            stat.winning_trades += 1
            stat.total_pnl += trade.result
            if trade.result > stat.max_win:
                stat.max_win = trade.result
        else:
            stat.losing_trades += 1
            if trade.result:
                stat.total_pnl += trade.result
                if trade.result < stat.max_loss:
                    stat.max_loss = trade.result
        
        # Update ratios
        if stat.total_trades > 0:
            stat.win_rate = stat.winning_trades / stat.total_trades
        
        if stat.winning_trades > 0:
            # Get all wins for average
            wins_result = await session.execute(
                select(Trade).where(
                    Trade.symbol == trade.symbol,
                    Trade.result > 0,
                )
            )
            wins = wins_result.scalars().all()
            if wins:
                stat.avg_win = sum(float(w.result) for w in wins) / len(wins)
        
        if stat.losing_trades > 0:
            # Get all losses for average
            losses_result = await session.execute(
                select(Trade).where(
                    Trade.symbol == trade.symbol,
                    Trade.result < 0,
                )
            )
            losses = losses_result.scalars().all()
            if losses:
                stat.avg_loss = sum(float(l.result) for l in losses) / len(losses)
        
        # Calculate profit factor
        if stat.avg_loss and stat.avg_loss < 0:
            gross_wins = stat.avg_win * stat.winning_trades
            gross_losses = abs(stat.avg_loss * stat.losing_trades)
            if gross_losses > 0:
                stat.profit_factor = gross_wins / gross_losses
        
        # Calculate expectancy
        if stat.win_rate:
            stat.expectancy = (
                (stat.win_rate * stat.avg_win) + 
                ((1 - stat.win_rate) * stat.avg_loss)
            )
