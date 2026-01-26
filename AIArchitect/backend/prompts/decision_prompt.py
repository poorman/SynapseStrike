"""
AI Architect - Decision Prompt Templates
System and user prompts for trading decisions
"""

import json
from typing import Any


DECISION_SYSTEM_PROMPT = """You are an expert quantitative trading analyst and decision-maker. Your role is to analyze market conditions and provide trading decisions.

## Your Capabilities
- Analyze technical indicators (RSI, MACD, volume, trend)
- Consider price action and market structure
- Factor in historical similar situations
- Apply learned trading rules
- Provide clear, actionable decisions

## Decision Types
- TAKE_TRADE: Market conditions favor entering the trade
- NO_TRADE: Conditions are unfavorable or uncertain

## Response Format
You MUST respond with valid JSON in this exact format:
{
    "decision": "TAKE_TRADE" or "NO_TRADE",
    "confidence": 0.0 to 1.0,
    "reason": "Clear explanation of the decision"
}

## Guidelines
- Be conservative: when in doubt, choose NO_TRADE
- Consider risk/reward ratio
- Reference similar past trades if available
- Apply relevant trading rules
- Confidence should reflect certainty, not optimism
"""


def build_decision_prompt(
    symbol: str,
    timeframe: str,
    market_context: dict[str, Any],
    question: str,
    similar_trades: list[dict[str, Any]],
    relevant_rules: list[dict[str, Any]],
) -> list[dict[str, str]]:
    """
    Build the complete prompt for trading decision.
    
    Args:
        symbol: Trading symbol
        timeframe: Chart timeframe
        market_context: Current market data
        question: Decision question
        similar_trades: Similar past trades from memory
        relevant_rules: Relevant trading rules
        
    Returns:
        List of message dicts for chat completion
    """
    # Build system prompt with context
    system_parts = [DECISION_SYSTEM_PROMPT]
    
    # Add relevant rules if available
    if relevant_rules:
        rules_text = "\n## Active Trading Rules (Apply These)\n"
        for i, rule in enumerate(relevant_rules, 1):
            confidence = rule.get("confidence", 0.5)
            rule_text = rule.get("rule_text", "")
            rule_type = rule.get("rule_type", "PATTERN")
            rules_text += f"{i}. [{rule_type}] (Confidence: {confidence:.0%}) {rule_text}\n"
        system_parts.append(rules_text)
    
    # Add similar trades if available
    if similar_trades:
        trades_text = "\n## Similar Past Trades (Reference These)\n"
        for i, trade in enumerate(similar_trades, 1):
            result = trade.get("result", 0)
            result_type = "WIN" if result > 0 else "LOSS"
            similarity = trade.get("score", trade.get("similarity_score", 0))
            trades_text += f"{i}. [{result_type}] (Similarity: {similarity:.0%}) Result: {result:.2f}\n"
        system_parts.append(trades_text)
    
    system_prompt = "\n".join(system_parts)
    
    # Build user message
    user_message = f"""## Current Trading Setup

**Symbol**: {symbol}
**Timeframe**: {timeframe}

**Market Context**:
```json
{json.dumps(market_context, indent=2)}
```

**Question**: {question}

Please analyze this setup and provide your trading decision in JSON format.
"""
    
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]


def build_context_summary(
    symbol: str,
    timeframe: str,
    market_context: dict[str, Any],
) -> str:
    """Build a text summary of market context for embedding."""
    parts = [f"Trading {symbol} on {timeframe} timeframe."]
    
    # Price info
    if "current_price" in market_context:
        parts.append(f"Current price: {market_context['current_price']}")
    
    # Trend
    if "trend" in market_context:
        parts.append(f"Trend: {market_context['trend']}")
    
    # Key indicators
    indicators = []
    if "rsi" in market_context:
        indicators.append(f"RSI {market_context['rsi']}")
    if "macd" in market_context:
        macd = market_context["macd"]
        if isinstance(macd, dict):
            indicators.append(f"MACD {macd.get('value', 0):.2f}")
    
    if indicators:
        parts.append("Indicators: " + ", ".join(indicators))
    
    # Support/Resistance
    levels = []
    if "support" in market_context:
        levels.append(f"Support: {market_context['support']}")
    if "resistance" in market_context:
        levels.append(f"Resistance: {market_context['resistance']}")
    
    if levels:
        parts.append(" | ".join(levels))
    
    return " ".join(parts)
