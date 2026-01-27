export interface SystemStatus {
  trader_id: string
  trader_name: string
  ai_model: string
  is_running: boolean
  start_time: string
  runtime_minutes: number
  call_count: number
  initial_balance: number
  scan_interval: string
  stop_until: string
  last_reset_time: string
  ai_provider: string
}

export interface AccountInfo {
  total_equity: number
  wallet_balance: number
  unrealized_profit: number // unrealized PnL（brokerageAPIofficial value）
  available_balance: number
  total_pnl: number
  total_pnl_pct: number
  initial_balance: number
  daily_pnl: number
  position_count: number
  margin_used: number
  margin_used_pct: number
}

export interface Position {
  symbol: string
  side: string
  entry_price: number
  mark_price: number
  quantity: number
  margin: number
  unrealized_pnl: number
  unrealized_pnl_pct: number
  liquidation_price: number
  margin_used: number
}

export interface DecisionAction {
  action: string
  symbol: string
  quantity: number
  margin: number
  price: number
  stop_loss?: number      // Stop loss price
  take_profit?: number    // Take profit price
  confidence?: number     // AI confidence (0-100)
  reasoning?: string      // Brief reasoning
  order_id: number
  timestamp: string
  success: boolean
  error?: string
}

export interface AccountSnapshot {
  total_balance: number
  available_balance: number
  total_unrealized_profit: number
  position_count: number
  margin_used_pct: number
}

export interface DecisionRecord {
  timestamp: string
  cycle_number: number
  input_prompt: string
  cot_trace: string
  decision_json: string
  account_state: AccountSnapshot
  positions: any[]
  candidate_stocks: string[]
  decisions: DecisionAction[]
  execution_log: string[]
  success: boolean
  error_message?: string
}

export interface Statistics {
  total_cycles: number
  successful_cycles: number
  failed_cycles: number
  total_open_positions: number
  total_close_positions: number
}

// AI Tradingrelated types
export interface TraderInfo {
  trader_id: string
  trader_name: string
  ai_model: string
  brokerage_id?: string
  is_running?: boolean
  show_in_competition?: boolean
  strategy_id?: string
  strategy_name?: string
  custom_prompt?: string
  use_stock_pool?: boolean
  use_oi_top?: boolean
  system_prompt_template?: string
}

export interface AIModel {
  id: string
  name: string
  provider: string
  enabled: boolean
  apiKey?: string
  customApiUrl?: string
  customModelName?: string
}

export interface Brokerage {
  id: string                     // UUID (empty for supported brokerage templates)
  brokerage_type: string          // "alpaca", "alpaca-paper", "ibkr", "simplefx", "oanda"
  account_name: string           // User-defined account name
  name: string                   // Display name
  type: 'broker' | 'forex'
  enabled: boolean
  apiKey?: string
  secretKey?: string
  masked_api_key?: string        // Masked API key (e.g., "PKCX...GO2")
  masked_secret_key?: string     // Masked secret key (e.g., "43WV...zag")
}

export interface CreateBrokerageRequest {
  exchange_type: string          // "alpaca", "alpaca-paper", "ibkr", "simplefx", "oanda"
  account_name: string           // User-defined account name
  enabled: boolean
  api_key?: string
  secret_key?: string
}

export interface CreateTraderRequest {
  name: string
  ai_model_id: string
  brokerage_id: string
  strategy_id?: string // StrategyID（new version，Usesave'sStrategyconfig）
  initial_balance?: number // optional：createwhenauto by backendget，editwhenmanualUpdate
  scan_interval_minutes?: number
  is_cross_margin?: boolean
  show_in_competition?: boolean // Show in competition
  trade_only_market_hours?: boolean // Only trade during market hours
  // withfields forbackward compatiblekeep，new versionUseStrategyconfig
  large_cap_margin?: number
  small_cap_margin?: number
  trading_symbols?: string
  custom_prompt?: string
  override_base_prompt?: boolean
  system_prompt_template?: string
  use_stock_pool?: boolean
  use_oi_top?: boolean
}

export interface UpdateModelConfigRequest {
  models: {
    [key: string]: {
      enabled: boolean
      api_key: string
      custom_api_url?: string
      custom_model_name?: string
    }
  }
}

export interface UpdateBrokerageConfigRequest {
  brokerages: {
    [key: string]: {
      enabled: boolean
      api_key: string
      secret_key: string
      passphrase?: string
      testnet?: boolean
      // Hyperliquid specific fields
      hyperliquid_wallet_addr?: string
      // Aster specific fields
      aster_user?: string
      aster_signer?: string
      aster_private_key?: string
      // LIGHTER specific fields
      lighter_wallet_addr?: string
      lighter_private_key?: string
      lighter_api_key_private_key?: string
      lighter_api_key_index?: number
    }
  }
}

// Competition related types
export interface CompetitionTraderData {
  trader_id: string
  trader_name: string
  ai_model: string
  brokerage: string
  total_equity: number
  total_pnl: number
  total_pnl_pct: number
  position_count: number
  margin_used_pct: number
  is_running: boolean
}

export interface CompetitionData {
  traders: CompetitionTraderData[]
  count: number
}

// Trader Configuration Data for View Modal
export interface TraderConfigData {
  trader_id?: string
  trader_name: string
  ai_model: string
  brokerage_id: string
  strategy_id?: string  // StrategyID
  strategy_name?: string  // Strategyname
  is_cross_margin: boolean
  show_in_competition: boolean  // Show in competition
  trade_only_market_hours?: boolean  // Only trade during market hours
  scan_interval_minutes: number
  initial_balance: number
  is_running: boolean
  // withare legacy fields（backward compatible）
  large_cap_margin?: number
  small_cap_margin?: number
  trading_symbols?: string
  custom_prompt?: string
  override_base_prompt?: boolean
  system_prompt_template?: string
  use_stock_pool?: boolean
  use_oi_top?: boolean
}

// Backtest types
export interface BacktestRunSummary {
  symbol_count: number;
  decision_tf: string;
  processed_bars: number;
  progress_pct: number;
  equity_last: number;
  max_drawdown_pct: number;
  liquidated: boolean;
  liquidation_note?: string;
}

export interface BacktestRunMetadata {
  run_id: string;
  label?: string;
  user_id?: string;
  last_error?: string;
  version: number;
  state: string;
  created_at: string;
  updated_at: string;
  summary: BacktestRunSummary;
}

export interface BacktestRunsResponse {
  total: number;
  items: BacktestRunMetadata[];
}

export interface BacktestStatusPayload {
  run_id: string;
  state: string;
  progress_pct: number;
  processed_bars: number;
  current_time: number;
  decision_cycle: number;
  equity: number;
  unrealized_pnl: number;
  realized_pnl: number;
  note?: string;
  last_error?: string;
  last_updated_iso: string;
}

export interface BacktestEquityPoint {
  ts: number;
  equity: number;
  available: number;
  pnl: number;
  pnl_pct: number;
  dd_pct: number;
  cycle: number;
}

export interface BacktestTradeEvent {
  ts: number;
  symbol: string;
  action: string;
  side?: string;
  qty: number;
  price: number;
  fee: number;
  slippage: number;
  order_value: number;
  realized_pnl: number;
  margin?: number;
  cycle: number;
  position_after: number;
  liquidation: boolean;
  note?: string;
}

export interface BacktestMetrics {
  total_return_pct: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  profit_factor: number;
  win_rate: number;
  trades: number;
  avg_win: number;
  avg_loss: number;
  best_symbol: string;
  worst_symbol: string;
  liquidated: boolean;
  symbol_stats?: Record<
    string,
    {
      total_trades: number;
      winning_trades: number;
      losing_trades: number;
      total_pnl: number;
      avg_pnl: number;
      win_rate: number;
    }
  >;
}

export interface BacktestStartConfig {
  run_id?: string;
  ai_model_id?: string;
  symbols: string[];
  timeframes: string[];
  decision_timeframe: string;
  decision_cadence_nbars: number;
  start_ts: number;
  end_ts: number;
  initial_balance: number;
  fee_bps: number;
  slippage_bps: number;
  fill_policy: string;
  prompt_variant?: string;
  prompt_template?: string;
  custom_prompt?: string;
  override_prompt?: boolean;
  cache_ai?: boolean;
  replay_only?: boolean;
  checkpoint_interval_bars?: number;
  checkpoint_interval_seconds?: number;
  replay_decision_dir?: string;
  shared_ai_cache_path?: string;
  ai?: {
    provider?: string;
    model?: string;
    key?: string;
    secret_key?: string;
    base_url?: string;
  };
  margin?: {
    large_cap_margin?: number;
    small_cap_margin?: number;
  };
}

// Strategy Studio Types
export interface Strategy {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  config: StrategyConfig;
  created_at: string;
  updated_at: string;
}

export interface PromptSectionsConfig {
  role_definition?: string;
  trading_frequency?: string;
  entry_standards?: string;
  decision_process?: string;
}

export interface StrategyConfig {
  stock_source: StockSourceConfig;
  indicators: IndicatorConfig;
  custom_prompt?: string;
  risk_control: RiskControlConfig;
  execution: ExecutionConfig;
  prompt_sections?: PromptSectionsConfig;
}

export interface StockSourceConfig {
  source_type: 'static' | 'coinpool' | 'stockpool' | 'ai100' | 'oi_top' | 'top_winners' | 'top_losers' | 'mixed';
  static_stocks?: string[];
  use_stock_pool: boolean;
  stock_pool_limit?: number;
  stock_pool_api_url?: string;  // AI500 symbolpool API URL
  use_ai100?: boolean;          // Enable AI100 Stocks data provider
  ai100_limit?: number;         // AI100 fetch limit
  ai100_api_url?: string;       // AI100 Stocks API URL
  use_oi_top?: boolean;
  oi_top_limit?: number;
  oi_top_api_url?: string;     // OI Top API URL
  use_movers_top?: boolean;
  movers_top_limit?: number;
  movers_top_api_url?: string;
  use_top_losers?: boolean;
  top_losers_limit?: number;
  top_losers_api_url?: string;
}

export interface IndicatorConfig {
  klines: KlineConfig;
  // Raw OHLCV kline data - required for AI analysis
  enable_raw_klines: boolean;
  // Technical indicators (optional)
  enable_ema: boolean;
  enable_macd: boolean;
  enable_rsi: boolean;
  enable_atr: boolean;
  enable_volume: boolean;
  enable_oi: boolean;
  enable_funding_rate: boolean;
  // VWAP indicators (calculated from bar data)
  enable_vwap_indicator?: boolean;   // Volume Weighted Average Price
  enable_anchored_vwap?: boolean;    // Anchored VWAP from session start
  anchored_vwap_period?: number;     // Bars to anchor from
  enable_volume_profile?: boolean;   // Volume Profile with POC, VAH, VAL
  volume_profile_bins?: number;      // Number of price bins
  ema_periods?: number[];
  rsi_periods?: number[];
  atr_periods?: number[];
  external_data_sources?: ExternalDataSource[];
  // Quant Data Sources (fund flow, position changes)
  enable_quant_data?: boolean;
  quant_data_api_url?: string;
  enable_quant_oi?: boolean;
  enable_quant_netflow?: boolean;
  // Stock Features (market-wide OI ranking)
  enable_oi_ranking?: boolean;
  oi_ranking_api_url?: string;
  oi_ranking_duration?: string;  // "1h", "4h", "24h"
  oi_ranking_limit?: number;
  // Stock Ranking Data Indicators
  enable_stock_news?: boolean;      // Real-time news & sentiment
  enable_trade_flow?: boolean;      // Trade flow analysis
  enable_vwap?: boolean;            // Multi-timeframe VWAP
  enable_corporate_actions?: boolean; // Corporate actions calendar
  enable_volume_surge?: boolean;    // Volume surge detection
  enable_earnings?: boolean;        // Earnings calendar
  enable_analyst_ratings?: boolean; // Analyst ratings/price targets
  enable_short_interest?: boolean;  // Short interest data
  enable_zero_dte?: boolean;        // Zero DTE options sentiment
  stock_news_limit?: number;        // Number of news items (default 10)
  // Multi-Timeframe Confluence Engine
  enable_confluence?: boolean;       // Enable multi-timeframe confluence mode
  confluence_timeframes?: string[];  // Timeframes to check for confluence (e.g., ['15m', '1h', '4h'])
  confluence_require_all?: boolean;  // Require ALL timeframes to align (strict mode)
  confluence_min_match?: number;     // Minimum number of timeframes that must align (2 of 3, etc.)

  // ============================================================================
  // Phase 1: Core Profit Engine Features
  // ============================================================================

  // Phase 1.2: VWAP Deviation Entry System
  enable_vwap_deviation?: boolean;     // Enable VWAP deviation-based entries
  vwap_min_deviation_atr?: number;     // Min ATR deviation from VWAP (default: 1.5)
  vwap_max_deviation_atr?: number;     // Max ATR deviation from VWAP (default: 2.5)
  vwap_entry_mode?: string;            // "mean_reversion" or "breakout" (default: mean_reversion)
  vwap_timeframe?: string;            // VWAP timeframe: "15m" | "1h" | "4h" | "1d" (default: "1h")

  // Phase 1.3: Volume Confirmation Filter
  enable_volume_confirmation?: boolean; // Enable volume confirmation
  volume_min_ratio?: number;           // Min volume ratio vs average (default: 1.5)
  volume_lookback_period?: number;      // Volume lookback period in bars (default: 20)
  volume_comparison_method?: string;    // "sma" | "ema" | "median" (default: "sma")

  // Phase 1.4: Order Flow Analysis
  enable_order_flow?: boolean;         // Enable order flow analysis
  order_flow_large_block_threshold?: number; // Large block threshold in $ (default: 500000)
  order_flow_track_dark_pool?: boolean; // Track dark pool activity
  order_flow_supply_demand_zones?: boolean; // Supply/demand zone detection
  order_flow_institutional_weight?: number; // Institutional flow weight 0.0-1.0 (default: 0.7)

  // ============================================================================
  // Algorithms Section
  // ============================================================================

  // VWAP + Slope & Stretch Algorithm
  enable_vwap_slope_stretch?: boolean;   // Enable VWAP + Slope & Stretch algorithm
  vwap_entry_time?: string;              // Entry time in ET (default: "10:00")

  // Top Movers Scalping Algorithm
  enable_top_movers_scalping?: boolean;  // Enable Top Movers Scalping algorithm
  tms_min_price?: number;                // Minimum price filter (default: 0.50)
  tms_max_spread_pct?: number;           // Maximum bid-ask spread % (default: 0.5)
  tms_min_rvol?: number;                 // Minimum relative volume (default: 2.0)
  tms_max_trades_per_ticker?: number;    // Max trades per ticker per day (default: 3)
  tms_consecutive_loss_limit?: number;   // Stop after N consecutive losses (default: 2)
  tms_trading_end_time?: string;         // Stop trading after this time ET (default: "10:15")
}

export interface KlineConfig {
  primary_timeframe: string;
  primary_count: number;
  longer_timeframe?: string;
  longer_count?: number;
  enable_multi_timeframe: boolean;
  // add new：supportSelectmultiplewheninterval
  selected_timeframes?: string[];
}

export interface ExternalDataSource {
  name: string;
  type: 'api' | 'webhook';
  url: string;
  method: string;
  headers?: Record<string, string>;
  data_path?: string;
  refresh_secs?: number;
}

export interface RiskControlConfig {
  // Max number of stocks held simultaneously (CODE ENFORCED)
  max_positions: number;

  // Trading Margin - brokerage margin for opening positions (AI guided)
  large_cap_max_margin: number;    // Large Cap max brokerage margin
  small_cap_max_margin: number;    // Small Cap max brokerage margin

  // Position Value Ratio - single position notional value / account equity (CODE ENFORCED)
  // Max position value = equity × this ratio
  large_cap_max_position_value_ratio?: number;     // default: 5 (Large Cap max position = 5x equity)
  small_cap_max_position_value_ratio?: number;     // default: 1 (Small Cap max position = 1x equity)

  // Max Amount per Trade - absolute cap on position size in USD (CODE ENFORCED)
  max_position_size_usd?: number;                  // 0 = no limit, e.g. 1000 for $1000 max per trade

  // Risk Parameters
  max_margin_usage: number;        // Max margin utilization, e.g. 0.9 = 90% (CODE ENFORCED)
  min_position_size: number;       // Min position size in  (CODE ENFORCED)
  min_risk_reward_ratio: number;   // Min take_profit / stop_loss ratio (AI guided)
  min_confidence: number;          // Min AI confidence to open position (AI guided)

  // ============================================================================
  // Phase 1: Risk Management Features
  // ============================================================================

  // ATR-Based Stop Loss
  use_atr_stop_loss?: boolean;      // Enable ATR-based stop loss (default: true)
  atr_stop_multiplier?: number;     // ATR multiplier for stop loss (default: 1.5)
  atr_period?: number;              // ATR calculation period (default: 14)

  // Position Sizing by Risk
  use_risk_based_sizing?: boolean;  // Enable risk-based position sizing
  risk_per_trade_pct?: number;      // Risk per trade as % of equity (default: 1%)
  max_position_pct?: number;        // Max position size as % of equity (default: 10%)

  // Daily Loss Limit
  use_daily_loss_limit?: boolean;   // Enable daily loss limit
  daily_loss_limit_pct?: number;    // Daily loss limit as % of equity (default: 2%)

  // Trailing Stop
  use_trailing_stop?: boolean;      // Enable ATR-based trailing stop
  trailing_stop_atr?: number;       // Trail by X ATR (default: 1.5)
  trailing_activation_r?: number;   // Activate after X R profit (default: 1.0)

  // Partial Profit Taking
  use_partial_profits?: boolean;    // Enable partial profit taking
  partial_profit_pct?: number;      // % to close at first target (default: 50%)
  partial_profit_r?: number;        // R-multiple for first target (default: 2.0)

  // Market Hours Filter
  use_market_hours_filter?: boolean; // Only trade during market hours
  market_open_time?: string;         // Market open time (default: "09:30")
  market_close_time?: string;        // Market close time (default: "16:00")
  market_timezone?: string;          // Timezone (default: "America/New_York")
}

// Execution Configuration (Phase 2: Smart Order Execution)
export interface ExecutionConfig {
  // Smart Limit Orders - Place limit orders to reduce slippage
  enable_limit_orders?: boolean;        // Enable smart limit orders (default: false)
  limit_offset_atr_multiplier?: number; // ATR multiplier for limit offset (default: 0.5)
  limit_timeout_seconds?: number;       // Timeout before switching to market order (default: 5-10s)

  // TWAP (Time-Weighted Average Price) - Split large orders to reduce market impact
  enable_twap?: boolean;                // Enable TWAP for large orders (default: false)
  twap_duration_seconds?: number;       // Duration to split order over (default: 60s)
  twap_min_size?: number;               // Minimum order size to trigger TWAP (default: $50,000)
  twap_slice_count?: number;            // Number of slices to split order into (default: 5-10)

  // Order Type Preference
  preferred_order_type?: string;        // "market" | "limit" | "smart" (default: "market")
}


// Debate Arena Types
export type DebateStatus = 'pending' | 'running' | 'voting' | 'completed' | 'cancelled';
export type DebatePersonality = 'bull' | 'bear' | 'analyst' | 'contrarian' | 'risk_manager';

export interface DebateDecision {
  action: string;
  symbol: string;
  confidence: number;
  margin?: number;
  position_pct?: number;
  position_size_usd?: number;
  stop_loss?: number;
  take_profit?: number;
  reasoning: string;
  // Execution tracking
  executed?: boolean;
  executed_at?: string;
  order_id?: string;
  error?: string;
}

export interface DebateSession {
  id: string;
  user_id: string;
  name: string;
  strategy_id: string;
  status: DebateStatus;
  symbol: string;
  interval_minutes: number;
  prompt_variant: string;
  trader_id?: string;
  max_rounds: number;
  current_round: number;
  final_decision?: DebateDecision;
  final_decisions?: DebateDecision[];  // Multi-stock decisions
  auto_execute: boolean;
  created_at: string;
  updated_at: string;
}

export interface DebateParticipant {
  id: string;
  session_id: string;
  ai_model_id: string;
  ai_model_name: string;
  provider: string;
  personality: DebatePersonality;
  color: string;
  speak_order: number;
  created_at: string;
}

export interface DebateMessage {
  id: string;
  session_id: string;
  round: number;
  ai_model_id: string;
  ai_model_name: string;
  provider: string;
  personality: DebatePersonality;
  message_type: string;
  content: string;
  decision?: DebateDecision;
  decisions?: DebateDecision[];  // Multi-stock decisions
  confidence: number;
  created_at: string;
}

export interface DebateVote {
  id: string;
  session_id: string;
  ai_model_id: string;
  ai_model_name: string;
  action: string;
  symbol: string;
  confidence: number;
  margin?: number;
  position_pct?: number;
  stop_loss_pct?: number;
  take_profit_pct?: number;
  reasoning: string;
  created_at: string;
}

export interface DebateSessionWithDetails extends DebateSession {
  participants: DebateParticipant[];
  messages: DebateMessage[];
  votes: DebateVote[];
}

export interface CreateDebateRequest {
  name: string;
  strategy_id: string;
  symbol: string;
  max_rounds?: number;
  interval_minutes?: number;  // 5, 15, 30, 60 minutes
  prompt_variant?: string;    // balanced, aggressive, conservative, scalping
  auto_execute?: boolean;
  trader_id?: string;         // Trader to use for auto-execute
  // OI Ranking data options
  enable_oi_ranking?: boolean;  // Whether to include OI ranking data
  oi_ranking_limit?: number;    // Number of OI ranking entries (default 10)
  oi_duration?: string;         // Duration for OI data (1h, 4h, 24h, etc.)
  participants: {
    ai_model_id: string;
    personality: DebatePersonality;
  }[];
}

export interface DebatePersonalityInfo {
  id: DebatePersonality;
  name: string;
  emoji: string;
  color: string;
  description: string;
}
