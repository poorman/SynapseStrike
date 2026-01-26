"""
AI Architect - Pydantic Schemas
Request/Response models for API endpoints
"""

from typing import Any
from pydantic import BaseModel, Field


# =============================================================================
# DECISION ENDPOINT SCHEMAS
# =============================================================================

class DecisionRequest(BaseModel):
    """Request schema for trading decision endpoint."""
    
    symbol: str = Field(..., description="Trading symbol (e.g., 'ES', 'NQ')")
    timeframe: str = Field(..., description="Chart timeframe (e.g., '1m', '5m')")
    market_context: dict[str, Any] = Field(
        ..., 
        description="Current market data including price, indicators, etc."
    )
    question: str = Field(
        default="Should I take this trade?",
        description="Decision question to ask the model"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "symbol": "ES",
                "timeframe": "1m",
                "market_context": {
                    "current_price": 5025.50,
                    "bid": 5025.25,
                    "ask": 5025.75,
                    "volume": 125000,
                    "vwap": 5020.00,
                    "rsi": 65.5,
                    "macd": {"value": 2.5, "signal": 1.8, "histogram": 0.7},
                    "trend": "BULLISH",
                    "support": 5000.00,
                    "resistance": 5050.00,
                },
                "question": "Should I take this long trade?"
            }
        }


class DecisionResponse(BaseModel):
    """Response schema for trading decision endpoint."""
    
    decision: str = Field(
        ..., 
        description="Trading decision: TAKE_TRADE or NO_TRADE"
    )
    confidence: float = Field(
        ..., 
        ge=0.0, 
        le=1.0, 
        description="Confidence score between 0.0 and 1.0"
    )
    reason: str = Field(
        ..., 
        description="Explanation for the decision"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "decision": "TAKE_TRADE",
                "confidence": 0.85,
                "reason": "Strong bullish momentum with RSI not overbought. Price above VWAP with increasing volume. Similar past trades had 72% win rate."
            }
        }


# =============================================================================
# TRADE CLOSED ENDPOINT SCHEMAS
# =============================================================================

class TradeClosedRequest(BaseModel):
    """Request schema for trade closed endpoint."""
    
    trade_id: str = Field(..., description="Unique trade identifier")
    entry: float = Field(..., description="Entry price")
    exit: float = Field(..., description="Exit price")
    result: float = Field(..., description="P/L result in points/ticks")
    context: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional trade context"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "trade_id": "trade_20240118_001",
                "entry": 5025.50,
                "exit": 5030.00,
                "result": 4.5,
                "context": {
                    "direction": "LONG",
                    "symbol": "ES",
                    "timeframe": "1m",
                    "entry_reason": "Breakout above resistance",
                    "exit_reason": "Target hit",
                    "duration_seconds": 180,
                    "market_context_at_entry": {
                        "rsi": 65.5,
                        "trend": "BULLISH"
                    }
                }
            }
        }


class TradeClosedResponse(BaseModel):
    """Response schema for trade closed endpoint."""
    
    status: str = Field(..., description="Processing status")
    trade_id: str = Field(..., description="Internal trade ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "learning_queued",
                "trade_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        }


# =============================================================================
# HEALTH ENDPOINT SCHEMAS
# =============================================================================

class HealthResponse(BaseModel):
    """Response schema for health check endpoint."""
    
    status: str = Field(..., description="Health status")
    version: str = Field(..., description="Application version")
    services: dict[str, str] = Field(..., description="Connected services")


# =============================================================================
# INTERNAL SCHEMAS
# =============================================================================

class SimilarTrade(BaseModel):
    """Schema for similar trade from vector search."""
    
    trade_id: str
    symbol: str
    similarity_score: float
    result: float
    decision: str
    reasoning: str
    market_context: dict[str, Any]


class ExtractedRule(BaseModel):
    """Schema for rule extracted from trade analysis."""
    
    rule_text: str
    rule_type: str  # ENTRY, EXIT, RISK, PATTERN, MISTAKE
    confidence: float
    source_trade_id: str


class TradeCritique(BaseModel):
    """Schema for post-trade critique."""
    
    summary: str
    what_went_well: list[str]
    what_went_wrong: list[str]
    lessons_learned: list[str]
    extracted_rules: list[ExtractedRule]
    overall_score: float  # 0.0 to 1.0
