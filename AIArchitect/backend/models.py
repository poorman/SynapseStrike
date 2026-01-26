"""
AI Architect - SQLAlchemy ORM Models
Database models for trades, rules, and statistics
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """SQLAlchemy declarative base."""
    pass


class Trade(Base):
    """Trade model - stores complete trade history."""
    
    __tablename__ = "trades"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    trade_id = Column(String(255), unique=True, nullable=False)
    symbol = Column(String(50), nullable=False)
    timeframe = Column(String(20), nullable=False)
    
    # Entry/Exit
    entry_price = Column(Numeric(18, 8), nullable=False)
    exit_price = Column(Numeric(18, 8))
    direction = Column(String(10), nullable=False)  # LONG or SHORT
    
    # Results
    result = Column(Numeric(18, 8))
    result_percent = Column(Numeric(10, 4))
    
    # Decision metadata
    decision = Column(String(20))  # TAKE_TRADE or NO_TRADE
    confidence = Column(Numeric(5, 4))
    reasoning = Column(Text)
    
    # Context (JSON)
    market_context = Column(JSONB)
    trade_context = Column(JSONB)
    
    # Learning metadata
    critique = Column(Text)
    extracted_rules = Column(JSONB)
    learning_processed_at = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    closed_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    rules = relationship("Rule", back_populates="source_trade")
    learning_queue_items = relationship("LearningQueue", back_populates="trade")


class Rule(Base):
    """Rule model - stores extracted trading rules."""
    
    __tablename__ = "rules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    rule_id = Column(String(255), unique=True, nullable=False)
    
    # Rule content
    rule_text = Column(Text, nullable=False)
    rule_type = Column(String(50), nullable=False)  # ENTRY, EXIT, RISK, PATTERN, MISTAKE
    
    # Confidence and validation
    confidence = Column(Numeric(5, 4), nullable=False, default=0.5)
    times_validated = Column(Integer, default=0)
    times_violated = Column(Integer, default=0)
    
    # Source tracking
    source_trade_id = Column(UUID(as_uuid=True), ForeignKey("trades.id"))
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    source_trade = relationship("Trade", back_populates="rules")


class Statistic(Base):
    """Statistics model - aggregated performance metrics."""
    
    __tablename__ = "statistics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    symbol = Column(String(50), nullable=False)
    timeframe = Column(String(20), nullable=False)
    
    # Counts
    total_trades = Column(Integer, default=0)
    winning_trades = Column(Integer, default=0)
    losing_trades = Column(Integer, default=0)
    
    # P/L
    total_pnl = Column(Numeric(18, 8), default=0)
    avg_win = Column(Numeric(18, 8), default=0)
    avg_loss = Column(Numeric(18, 8), default=0)
    max_win = Column(Numeric(18, 8), default=0)
    max_loss = Column(Numeric(18, 8), default=0)
    
    # Ratios
    win_rate = Column(Numeric(5, 4), default=0)
    profit_factor = Column(Numeric(10, 4), default=0)
    expectancy = Column(Numeric(18, 8), default=0)
    
    # Timestamps
    period_start = Column(DateTime(timezone=True))
    period_end = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint("symbol", "timeframe", name="uq_statistics_symbol_timeframe"),
    )


class LearningQueue(Base):
    """Learning queue model - async processing queue."""
    
    __tablename__ = "learning_queue"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    trade_id = Column(UUID(as_uuid=True), ForeignKey("trades.id"), nullable=False)
    
    # Status tracking
    status = Column(String(20), default="PENDING")  # PENDING, PROCESSING, COMPLETED, FAILED
    attempts = Column(Integer, default=0)
    last_error = Column(Text)
    
    # Timestamps
    queued_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    trade = relationship("Trade", back_populates="learning_queue_items")


class MemorySnapshot(Base):
    """Memory snapshot model - tracks what's in vector DB."""
    
    __tablename__ = "memory_snapshots"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    collection_name = Column(String(255), nullable=False)
    point_id = Column(String(255), nullable=False)
    
    # Source reference
    source_type = Column(String(50), nullable=False)  # TRADE, RULE, PATTERN
    source_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Metadata
    embedding_model = Column(String(255))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint("collection_name", "point_id", name="uq_memory_collection_point"),
    )
