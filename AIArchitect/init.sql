-- =============================================================================
-- AI Architect Trading System - PostgreSQL Schema
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TRADES TABLE - Complete trade history with P/L tracking
-- =============================================================================
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id VARCHAR(255) UNIQUE NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    timeframe VARCHAR(20) NOT NULL,
    
    -- Entry/Exit
    entry_price DECIMAL(18, 8) NOT NULL,
    exit_price DECIMAL(18, 8),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    
    -- Results
    result DECIMAL(18, 8),
    result_percent DECIMAL(10, 4),
    
    -- Decision metadata
    decision VARCHAR(20) CHECK (decision IN ('TAKE_TRADE', 'NO_TRADE')),
    confidence DECIMAL(5, 4),
    reasoning TEXT,
    
    -- Context (JSON)
    market_context JSONB,
    trade_context JSONB,
    
    -- Learning metadata
    critique TEXT,
    extracted_rules JSONB,
    learning_processed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_created_at ON trades(created_at DESC);
CREATE INDEX idx_trades_result ON trades(result);
CREATE INDEX idx_trades_learning_processed ON trades(learning_processed_at);

-- =============================================================================
-- RULES TABLE - Extracted trading rules with confidence scores
-- =============================================================================
CREATE TABLE rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- Rule content
    rule_text TEXT NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('ENTRY', 'EXIT', 'RISK', 'PATTERN', 'MISTAKE')),
    
    -- Confidence and validation
    confidence DECIMAL(5, 4) NOT NULL DEFAULT 0.5,
    times_validated INTEGER DEFAULT 0,
    times_violated INTEGER DEFAULT 0,
    
    -- Source tracking
    source_trade_id UUID REFERENCES trades(id),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rules_type ON rules(rule_type);
CREATE INDEX idx_rules_confidence ON rules(confidence DESC);
CREATE INDEX idx_rules_active ON rules(is_active);

-- =============================================================================
-- STATISTICS TABLE - Aggregated performance metrics
-- =============================================================================
CREATE TABLE statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(50) NOT NULL,
    timeframe VARCHAR(20) NOT NULL,
    
    -- Counts
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    
    -- P/L
    total_pnl DECIMAL(18, 8) DEFAULT 0,
    avg_win DECIMAL(18, 8) DEFAULT 0,
    avg_loss DECIMAL(18, 8) DEFAULT 0,
    max_win DECIMAL(18, 8) DEFAULT 0,
    max_loss DECIMAL(18, 8) DEFAULT 0,
    
    -- Ratios
    win_rate DECIMAL(5, 4) DEFAULT 0,
    profit_factor DECIMAL(10, 4) DEFAULT 0,
    expectancy DECIMAL(18, 8) DEFAULT 0,
    
    -- Timestamps
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(symbol, timeframe)
);

-- =============================================================================
-- LEARNING QUEUE TABLE - Async processing queue
-- =============================================================================
CREATE TABLE learning_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID REFERENCES trades(id) NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    
    -- Timestamps
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_learning_queue_status ON learning_queue(status);
CREATE INDEX idx_learning_queue_queued_at ON learning_queue(queued_at);

-- =============================================================================
-- MEMORY SNAPSHOTS TABLE - Track what's in vector DB
-- =============================================================================
CREATE TABLE memory_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_name VARCHAR(255) NOT NULL,
    point_id VARCHAR(255) NOT NULL,
    
    -- Source reference
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('TRADE', 'RULE', 'PATTERN')),
    source_id UUID NOT NULL,
    
    -- Metadata
    embedding_model VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(collection_name, point_id)
);

-- =============================================================================
-- FUNCTION: Update updated_at timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to relevant tables
CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rules_updated_at BEFORE UPDATE ON rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_statistics_updated_at BEFORE UPDATE ON statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
