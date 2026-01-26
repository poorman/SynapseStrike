"""
AI Architect - Reflection Prompt Templates
Prompts for post-trade critique and rule extraction
"""

import json
from typing import Any


CRITIQUE_SYSTEM_PROMPT = """You are an expert trading coach and analyst. Your role is to objectively critique completed trades and extract lessons.

## Your Approach
- Be objective and analytical
- Look for patterns in both wins and losses
- Identify what could be improved
- Acknowledge what was done well
- Focus on actionable insights

## Response Format
Respond with valid JSON in this exact format:
{
    "summary": "Brief overall assessment of the trade",
    "what_went_well": ["Point 1", "Point 2"],
    "what_went_wrong": ["Point 1", "Point 2"],
    "lessons_learned": ["Lesson 1", "Lesson 2"],
    "overall_score": 0.0 to 1.0
}

## Scoring Guidelines
- 0.0-0.3: Poor execution, major mistakes
- 0.4-0.6: Average, room for improvement
- 0.7-0.8: Good execution, minor issues
- 0.9-1.0: Excellent, textbook trade
"""


RULE_EXTRACTION_SYSTEM_PROMPT = """You are a trading systems expert. Your role is to extract actionable trading rules from trade analysis.

## Rule Types
- ENTRY: Rules about when to enter trades
- EXIT: Rules about when to exit trades
- RISK: Rules about position sizing and risk management
- PATTERN: Market patterns to look for
- MISTAKE: Common mistakes to avoid

## Response Format
Respond with valid JSON in this exact format:
{
    "rules": [
        {
            "rule_text": "Clear, actionable rule statement",
            "rule_type": "ENTRY|EXIT|RISK|PATTERN|MISTAKE",
            "confidence": 0.0 to 1.0
        }
    ]
}

## Guidelines
- Rules should be specific and actionable
- Avoid vague or overly broad rules
- Confidence reflects how strongly the trade supports this rule
- Maximum 5 rules per trade
- Focus on the most important insights
"""


def build_critique_prompt(trade_summary: str) -> list[dict[str, str]]:
    """
    Build prompt for trade critique.
    
    Args:
        trade_summary: Summary of the completed trade
        
    Returns:
        List of message dicts for chat completion
    """
    user_message = f"""Please analyze and critique this completed trade:

{trade_summary}

Provide your assessment in the required JSON format. Be thorough but constructive.
"""
    
    return [
        {"role": "system", "content": CRITIQUE_SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]


def build_rule_extraction_prompt(
    trade_summary: str,
    critique: dict[str, Any],
) -> list[dict[str, str]]:
    """
    Build prompt for rule extraction.
    
    Args:
        trade_summary: Summary of the completed trade
        critique: Critique from previous analysis
        
    Returns:
        List of message dicts for chat completion
    """
    critique_text = json.dumps(critique, indent=2)
    
    user_message = f"""Based on this trade and its critique, extract actionable trading rules:

## Trade Summary
{trade_summary}

## Critique
```json
{critique_text}
```

Extract the most important rules from this trade. Focus on patterns that would help in future similar situations.
Provide your response in the required JSON format.
"""
    
    return [
        {"role": "system", "content": RULE_EXTRACTION_SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]


def build_pattern_analysis_prompt(
    trades: list[dict[str, Any]],
    time_period: str = "recent",
) -> list[dict[str, str]]:
    """
    Build prompt for analyzing patterns across multiple trades.
    
    Args:
        trades: List of trade data
        time_period: Description of the time period
        
    Returns:
        List of message dicts for chat completion
    """
    system_prompt = """You are a trading pattern analyst. Your role is to identify recurring patterns across multiple trades.

## Analysis Focus
- Common characteristics of winning trades
- Common characteristics of losing trades
- Time-of-day patterns
- Indicator confluence patterns
- Risk management patterns

## Response Format
{
    "winning_patterns": ["Pattern 1", "Pattern 2"],
    "losing_patterns": ["Pattern 1", "Pattern 2"],
    "recommendations": ["Recommendation 1", "Recommendation 2"],
    "new_rules": [
        {
            "rule_text": "Rule statement",
            "rule_type": "PATTERN",
            "confidence": 0.0 to 1.0
        }
    ]
}
"""
    
    trades_summary = "\n".join([
        f"- {t.get('symbol', 'N/A')} | {t.get('direction', 'N/A')} | "
        f"Result: {t.get('result', 0):.2f} | "
        f"Entry Reason: {t.get('entry_reason', 'N/A')}"
        for t in trades
    ])
    
    user_message = f"""Analyze these {time_period} trades for patterns:

{trades_summary}

Total trades: {len(trades)}
Wins: {sum(1 for t in trades if t.get('result', 0) > 0)}
Losses: {sum(1 for t in trades if t.get('result', 0) <= 0)}

Identify patterns and provide recommendations in JSON format.
"""
    
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]
