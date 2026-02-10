package store

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// StrategyStore strategy storage
type StrategyStore struct {
	db *sql.DB
}

// Strategy strategy configuration
type Strategy struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	IsActive    bool      `json:"is_active"`  // whether it is active (a user can only have one active strategy)
	IsDefault   bool      `json:"is_default"` // whether it is a system default strategy
	Config      string    `json:"config"`     // strategy configuration in JSON format
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// StrategyConfig strategy configuration details (JSON structure)
type StrategyConfig struct {
	// stock source configuration (renamed from coin_source to match frontend)
	CoinSource CoinSourceConfig `json:"stock_source"`
	// quantitative data configuration
	Indicators IndicatorConfig `json:"indicators"`
	// custom prompt (appended at the end)
	CustomPrompt string `json:"custom_prompt,omitempty"`
	// risk control configuration
	RiskControl RiskControlConfig `json:"risk_control"`
	// execution configuration (Phase 2: Smart Order Execution)
	Execution ExecutionConfig `json:"execution"`
	// editable sections of System Prompt
	PromptSections PromptSectionsConfig `json:"prompt_sections,omitempty"`
}

// PromptSectionsConfig editable sections of System Prompt
type PromptSectionsConfig struct {
	// role definition (title + description)
	RoleDefinition string `json:"role_definition,omitempty"`
	// trading frequency awareness
	TradingFrequency string `json:"trading_frequency,omitempty"`
	// entry standards
	EntryStandards string `json:"entry_standards,omitempty"`
	// decision process
	DecisionProcess string `json:"decision_process,omitempty"`
}

// CoinSourceConfig stock/coin source configuration
type CoinSourceConfig struct {
	// source type: "static" | "coinpool" | "stockpool" | "ai100" | "oi_top" | "top_winners" | "top_losers" | "mixed"
	SourceType string `json:"source_type"`
	// static coin list (used when source_type = "static") - legacy field
	StaticCoins []string `json:"static_coins,omitempty"`
	// static stock list (used when source_type = "static") - new field for stock trading
	StaticStocks []string `json:"static_stocks,omitempty"`
	// whether to use AI500 pool (support both coin_pool and stock_pool naming)
	UseCoinPool  bool `json:"use_coin_pool"`
	UseStockPool bool `json:"use_stock_pool"` // alias for use_coin_pool
	// pool maximum count (support both naming conventions)
	CoinPoolLimit  int `json:"coin_pool_limit,omitempty"`
	StockPoolLimit int `json:"stock_pool_limit,omitempty"` // alias for coin_pool_limit
	// AI500 pool API URL (strategy-level configuration)
	CoinPoolAPIURL  string `json:"coin_pool_api_url,omitempty"`
	StockPoolAPIURL string `json:"stock_pool_api_url,omitempty"` // alias
	// whether to use AI100 Stocks
	UseAI100 bool `json:"use_ai100"`
	// AI100 maximum count
	AI100Limit int `json:"ai100_limit,omitempty"`
	// AI100 API URL (strategy-level configuration)
	AI100APIURL string `json:"ai100_api_url,omitempty"`
	// whether to use OI Top
	UseOITop bool `json:"use_oi_top"`
	// OI Top maximum count
	OITopLimit int `json:"oi_top_limit,omitempty"`
	// OI Top API URL (strategy-level configuration)
	OITopAPIURL string `json:"oi_top_api_url,omitempty"`
	// whether to use Movers Top
	UseMoversTop bool `json:"use_movers_top"`
	// Movers Top maximum count
	MoversTopLimit int `json:"movers_top_limit,omitempty"`
	// Movers Top API URL (strategy-level configuration)
	MoversTopAPIURL string `json:"movers_top_api_url,omitempty"`
	// whether to use Top Losers
	UseTopLosers bool `json:"use_top_losers"`
	// Top Losers maximum count
	TopLosersLimit int `json:"top_losers_limit,omitempty"`
	// Top Losers API URL (strategy-level configuration)
	TopLosersAPIURL string `json:"top_losers_api_url,omitempty"`
}

// IndicatorConfig indicator configuration
type IndicatorConfig struct {
	// K-line configuration
	Klines KlineConfig `json:"klines"`
	// raw kline data (OHLCV) - always enabled, required for AI analysis
	EnableRawKlines bool `json:"enable_raw_klines"`
	// technical indicator switches
	EnableEMA         bool `json:"enable_ema"`
	EnableMACD        bool `json:"enable_macd"`
	EnableRSI         bool `json:"enable_rsi"`
	EnableATR         bool `json:"enable_atr"`
	EnableVolume      bool `json:"enable_volume"`
	EnableOI          bool `json:"enable_oi"`           // open interest
	EnableFundingRate bool `json:"enable_funding_rate"` // funding rate
	// VWAP indicators (calculable from bar data)
	EnableVWAPIndicator bool `json:"enable_vwap_indicator"`          // Volume Weighted Average Price
	EnableAnchoredVWAP  bool `json:"enable_anchored_vwap"`           // Anchored VWAP from session start
	AnchoredVWAPPeriod  int  `json:"anchored_vwap_period,omitempty"` // Bars to anchor from (default: session start)
	EnableVolumeProfile bool `json:"enable_volume_profile"`          // Volume Profile with POC, VAH, VAL
	VolumeProfileBins   int  `json:"volume_profile_bins,omitempty"`  // Number of price bins (default: 24)
	// EMA period configuration
	EMAPeriods []int `json:"ema_periods,omitempty"` // default [20, 50]
	// RSI period configuration
	RSIPeriods []int `json:"rsi_periods,omitempty"` // default [7, 14]
	// ATR period configuration
	ATRPeriods []int `json:"atr_periods,omitempty"` // default [14]
	// external data sources
	ExternalDataSources []ExternalDataSource `json:"external_data_sources,omitempty"`
	// quantitative data sources (capital flow, position changes, price changes)
	EnableQuantData    bool   `json:"enable_quant_data"`            // whether to enable quantitative data
	QuantDataAPIURL    string `json:"quant_data_api_url,omitempty"` // quantitative data API address
	EnableQuantOI      bool   `json:"enable_quant_oi"`              // whether to show OI data
	EnableQuantNetflow bool   `json:"enable_quant_netflow"`         // whether to show Netflow data
	// OI ranking data (market-wide open interest increase/decrease rankings)
	EnableOIRanking   bool   `json:"enable_oi_ranking"`             // whether to enable OI ranking data
	OIRankingAPIURL   string `json:"oi_ranking_api_url,omitempty"`  // OI ranking API base URL
	OIRankingDuration string `json:"oi_ranking_duration,omitempty"` // duration: 1h, 4h, 24h
	OIRankingLimit    int    `json:"oi_ranking_limit,omitempty"`    // number of entries (default 10)

	// Stock Ranking Data Indicators (Alpaca Pro)
	EnableStockNews        bool `json:"enable_stock_news"`          // Real-time news & sentiment
	EnableTradeFlow        bool `json:"enable_trade_flow"`          // Trade flow analysis
	EnableVWAP             bool `json:"enable_vwap"`                // Multi-timeframe VWAP
	EnableCorporateActions bool `json:"enable_corporate_actions"`   // Corporate actions calendar
	EnableVolumeSurge      bool `json:"enable_volume_surge"`        // Volume surge detection
	EnableEarnings         bool `json:"enable_earnings"`            // Earnings calendar
	EnableAnalystRatings   bool `json:"enable_analyst_ratings"`     // Analyst ratings/price targets
	EnableShortInterest    bool `json:"enable_short_interest"`      // Short interest data
	EnableZeroDTE          bool `json:"enable_zero_dte"`            // Zero DTE options sentiment
	StockNewsLimit         int  `json:"stock_news_limit,omitempty"` // Number of news items (default 10)

	// Multi-Timeframe Confluence Engine
	EnableConfluence     bool     `json:"enable_confluence"`               // Enable multi-timeframe confluence mode
	ConfluenceTimeframes []string `json:"confluence_timeframes,omitempty"` // Timeframes to check for confluence
	ConfluenceRequireAll bool     `json:"confluence_require_all"`          // Require ALL timeframes to align (strict)
	ConfluenceMinMatch   int      `json:"confluence_min_match,omitempty"`  // Minimum timeframes that must align

	// ============================================================================
	// Phase 1: Core Profit Engine Features
	// ============================================================================

	// Phase 1.2: VWAP Deviation Entry System
	EnableVWAPDeviation bool    `json:"enable_vwap_deviation"`  // Enable VWAP deviation-based entries
	VWAPMinDeviationATR float64 `json:"vwap_min_deviation_atr"` // Min ATR deviation from VWAP (default: 1.5)
	VWAPMaxDeviationATR float64 `json:"vwap_max_deviation_atr"` // Max ATR deviation from VWAP (default: 2.5)
	VWAPEntryMode       string  `json:"vwap_entry_mode"`        // "mean_reversion" or "breakout" (default: mean_reversion)
	VWAPTimeframe       string  `json:"vwap_timeframe"`         // VWAP timeframe: "15m" | "1h" | "4h" | "1d" (default: "1h")

	// Phase 1.3: Volume Confirmation Filter
	EnableVolumeConfirmation bool    `json:"enable_volume_confirmation"` // Enable volume confirmation
	VolumeMinRatio           float64 `json:"volume_min_ratio"`           // Min volume ratio vs average (default: 1.5)
	VolumeLookbackPeriod     int     `json:"volume_lookback_period"`     // Volume lookback period in bars (default: 20)
	VolumeComparisonMethod   string  `json:"volume_comparison_method"`   // "sma" | "ema" | "median" (default: "sma")

	// Phase 1.4: Order Flow Analysis
	EnableOrderFlow              bool    `json:"enable_order_flow"`                // Enable order flow analysis
	OrderFlowLargeBlockThreshold float64 `json:"order_flow_large_block_threshold"` // Large block threshold in $ (default: 500000)
	OrderFlowTrackDarkPool       bool    `json:"order_flow_track_dark_pool"`       // Track dark pool activity
	OrderFlowSupplyDemandZones   bool    `json:"order_flow_supply_demand_zones"`   // Supply/demand zone detection
	OrderFlowInstitutionalWeight float64 `json:"order_flow_institutional_weight"`  // Institutional flow weight 0.0-1.0 (default: 0.7)

	// Trend Filter (EMA Stack) - Only trade with trend
	EnableTrendFilter bool  `json:"enable_trend_filter"` // Enable EMA-based trend filter
	TrendEMAPeriods   []int `json:"trend_ema_periods"`   // EMA periods for trend (default: [9, 21, 50])

	// RSI Zone Filter - Avoid overbought/oversold entries
	EnableRSIFilter   bool `json:"enable_rsi_filter"`   // Enable RSI zone filter
	RSIUpperThreshold int  `json:"rsi_upper_threshold"` // Avoid longs above this (default: 80)
	RSILowerThreshold int  `json:"rsi_lower_threshold"` // Avoid shorts below this (default: 20)

	// Event Filters (Trade Blackouts)
	EnableEarningsFilter  bool    `json:"enable_earnings_filter"`   // Skip trading around earnings
	EarningsBlackoutDays  int     `json:"earnings_blackout_days"`   // Days before/after earnings (default: 1)
	EnableFOMCFilter      bool    `json:"enable_fomc_filter"`       // Skip trading on Fed days
	EnableLowVolumeFilter bool    `json:"enable_low_volume_filter"` // Skip low volume periods
	LowVolumeThreshold    float64 `json:"low_volume_threshold"`     // Volume ratio threshold (default: 0.5)

	// ============================================================================
	// Algorithms Section
	// ============================================================================

	// VWAP + Slope & Stretch Algorithm
	EnableVWAPSlopeStretch bool   `json:"enable_vwap_slope_stretch"` // Enable VWAP + Slope & Stretch algorithm
	VWAPEntryTime          string `json:"vwap_entry_time"`           // Entry time in ET (default: "10:00")

	// Genetic Algorithm (multi-factor scoring with pre-evolved chromosome weights)
	EnableGeneticAlgo bool `json:"enable_genetic_algo"` // Enable Genetic Algorithm trading

	// Top Movers Scalping Algorithm
	EnableTopMoversScalping bool    `json:"enable_top_movers_scalping"`           // Enable Top Movers Scalping algorithm
	TMSMinPrice             float64 `json:"tms_min_price,omitempty"`              // Minimum price filter (default: 0.50)
	TMSMaxSpreadPct         float64 `json:"tms_max_spread_pct,omitempty"`         // Maximum bid-ask spread % (default: 0.5)
	TMSMinRVOL              float64 `json:"tms_min_rvol,omitempty"`               // Minimum relative volume (default: 2.0)
	TMSMaxTradesPerTicker   int     `json:"tms_max_trades_per_ticker,omitempty"`  // Max trades per ticker (default: 3)
	TMSConsecutiveLossLimit int     `json:"tms_consecutive_loss_limit,omitempty"` // Stop after N losses (default: 2)
	TMSTradingEndTime       string  `json:"tms_trading_end_time,omitempty"`       // Stop trading time ET (default: "10:15")
}

// KlineConfig K-line configuration
type KlineConfig struct {
	// primary timeframe: "1m", "3m", "5m", "15m", "1h", "4h"
	PrimaryTimeframe string `json:"primary_timeframe"`
	// primary timeframe K-line count
	PrimaryCount int `json:"primary_count"`
	// longer timeframe
	LongerTimeframe string `json:"longer_timeframe,omitempty"`
	// longer timeframe K-line count
	LongerCount int `json:"longer_count,omitempty"`
	// whether to enable multi-timeframe analysis
	EnableMultiTimeframe bool `json:"enable_multi_timeframe"`
	// selected timeframe list (new: supports multi-timeframe selection)
	SelectedTimeframes []string `json:"selected_timeframes,omitempty"`
}

// ExternalDataSource external data source configuration
type ExternalDataSource struct {
	Name        string            `json:"name"`   // data source name
	Type        string            `json:"type"`   // type: "api" | "webhook"
	URL         string            `json:"url"`    // API URL
	Method      string            `json:"method"` // HTTP method
	Headers     map[string]string `json:"headers,omitempty"`
	DataPath    string            `json:"data_path,omitempty"`    // JSON data path
	RefreshSecs int               `json:"refresh_secs,omitempty"` // refresh interval (seconds)
}

// RiskControlConfig risk control configuration
// All parameters are clearly defined without ambiguity:
//
// Position Limits:
//   - MaxPositions: max number of stocks held simultaneously (CODE ENFORCED)
//
// Trading Margin (brokerage margin for opening positions):
//   - LargeCapMaxMargin: Large Cap max brokerage margin (AI guided)
//   - SmallCapMaxMargin: Small Cap max brokerage margin (AI guided)
//
// Position Value Limits (single position notional value / account equity):
//   - LargeCapMaxPositionValueRatio: Large Cap max = equity × ratio (CODE ENFORCED)
//   - SmallCapMaxPositionValueRatio: Small Cap max = equity × ratio (CODE ENFORCED)
//
// Risk Controls:
//   - MaxMarginUsage: max margin utilization percentage (CODE ENFORCED)
//   - MinPositionSize: minimum position size in USD (CODE ENFORCED)
//   - MinRiskRewardRatio: min take_profit / stop_loss ratio (AI guided)
//   - MinConfidence: min AI confidence to open position (AI guided)
type RiskControlConfig struct {
	// Max number of stocks held simultaneously (CODE ENFORCED)
	MaxPositions int `json:"max_positions"`

	// Large Cap brokerage margin for opening positions (AI guided)
	LargeCapMaxMargin int `json:"large_cap_max_margin"`
	// Small Cap brokerage margin for opening positions (AI guided)
	SmallCapMaxMargin int `json:"small_cap_max_margin"`

	// Large Cap single position max value = equity × this ratio (CODE ENFORCED, default: 5)
	LargeCapMaxPositionValueRatio float64 `json:"large_cap_max_position_value_ratio"`
	// Small Cap single position max value = equity × this ratio (CODE ENFORCED, default: 1)
	SmallCapMaxPositionValueRatio float64 `json:"small_cap_max_position_value_ratio"`

	// Max position size in USD (CODE ENFORCED, 0 = no limit)
	// This is an absolute cap regardless of equity ratio - e.g. set to 1000 for $1000 max per trade
	MaxPositionSizeUSD float64 `json:"max_position_size_usd"`

	// Max margin utilization (e.g. 0.9 = 90%) (CODE ENFORCED)
	MaxMarginUsage float64 `json:"max_margin_usage"`
	// Min position size in USDT (CODE ENFORCED)
	MinPositionSize float64 `json:"min_position_size"`

	// Min take_profit / stop_loss ratio (AI guided)
	MinRiskRewardRatio float64 `json:"min_risk_reward_ratio"`
	// Min AI confidence to open position (AI guided)
	MinConfidence int `json:"min_confidence"`

	// ============================================================================
	// Phase 1: New Risk Management Features
	// ============================================================================

	// ATR-Based Stop Loss
	UseATRStopLoss    bool    `json:"use_atr_stop_loss"`   // Enable ATR-based stop loss (default: true)
	ATRStopMultiplier float64 `json:"atr_stop_multiplier"` // ATR multiplier for stop loss (default: 1.5)
	ATRPeriod         int     `json:"atr_period"`          // ATR calculation period (default: 14)

	// Position Sizing by Risk
	UseRiskBasedSizing bool    `json:"use_risk_based_sizing"` // Enable risk-based position sizing
	RiskPerTradePct    float64 `json:"risk_per_trade_pct"`    // Risk per trade as % of equity (default: 1%)
	MaxPositionPct     float64 `json:"max_position_pct"`      // Max position size as % of equity (default: 10%)

	// Daily Loss Limit
	UseDailyLossLimit bool    `json:"use_daily_loss_limit"` // Enable daily loss limit
	DailyLossLimitPct float64 `json:"daily_loss_limit_pct"` // Daily loss limit as % of equity (default: 2%)

	// Trailing Stop
	UseTrailingStop     bool    `json:"use_trailing_stop"`     // Enable ATR-based trailing stop
	TrailingStopATR     float64 `json:"trailing_stop_atr"`     // Trail by X ATR (default: 1.5)
	TrailingActivationR float64 `json:"trailing_activation_r"` // Activate after X R profit (default: 1.0)

	// Partial Profit Taking
	UsePartialProfits bool    `json:"use_partial_profits"` // Enable partial profit taking
	PartialProfitPct  float64 `json:"partial_profit_pct"`  // % to close at first target (default: 50%)
	PartialProfitR    float64 `json:"partial_profit_r"`    // R-multiple for first target (default: 2.0)

	// End-of-Day Position Close
	// When enabled, all positions are automatically closed 5 minutes before market close (3:55 PM ET).
	// Behavior per algo type:
	//   - VWAPer: Should typically be ON (day-trade strategy, no overnight holds)
	//   - Scalper: Should typically be ON (intraday scalping, no overnight risk)
	//   - Swing/Custom: Can be OFF (positions may be held overnight)
	// When disabled, positions are held past market close (overnight).
	CloseAtEOD     bool   `json:"close_at_eod"`      // Auto-close all positions before market close
	CloseAtEODTime string `json:"close_at_eod_time"` // Time to close in HH:MM ET format (default: "15:55")

	// Market Hours Filter
	UseMarketHoursFilter bool   `json:"use_market_hours_filter"` // Only trade during market hours
	MarketOpenTime       string `json:"market_open_time"`        // Market open time (default: "09:30")
	MarketCloseTime      string `json:"market_close_time"`       // Market close time (default: "16:00")
	MarketTimezone       string `json:"market_timezone"`         // Timezone (default: "America/New_York")
}

// ExecutionConfig order execution configuration (Phase 2)
// Smart order execution to reduce slippage and market impact
type ExecutionConfig struct {
	// Smart Limit Orders - Place limit orders to reduce slippage
	EnableLimitOrders   bool    `json:"enable_limit_orders"`         // Enable smart limit orders (default: false)
	LimitOffsetATRMult  float64 `json:"limit_offset_atr_multiplier"` // ATR multiplier for limit offset (default: 0.5)
	LimitTimeoutSeconds int     `json:"limit_timeout_seconds"`       // Timeout before switching to market order (default: 5-10s)

	// TWAP (Time-Weighted Average Price) - Split large orders to reduce market impact
	EnableTWAP          bool    `json:"enable_twap"`           // Enable TWAP for large orders (default: false)
	TWAPDurationSeconds int     `json:"twap_duration_seconds"` // Duration to split order over (default: 60s)
	TWAPMinSize         float64 `json:"twap_min_size"`         // Minimum order size to trigger TWAP (default: $50,000)
	TWAPSliceCount      int     `json:"twap_slice_count"`      // Number of slices to split order into (default: 5-10)

	// Order Type Preference
	PreferredOrderType string `json:"preferred_order_type"` // "market" | "limit" | "smart" (default: "market")
}

func (s *StrategyStore) initTables() error {
	_, err := s.db.Exec(`
		CREATE TABLE IF NOT EXISTS strategies (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL DEFAULT '',
			name TEXT NOT NULL,
			description TEXT DEFAULT '',
			is_active BOOLEAN DEFAULT 0,
			is_default BOOLEAN DEFAULT 0,
			config TEXT NOT NULL DEFAULT '{}',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return err
	}

	// create indexes
	_, _ = s.db.Exec(`CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id)`)
	_, _ = s.db.Exec(`CREATE INDEX IF NOT EXISTS idx_strategies_is_active ON strategies(is_active)`)

	// trigger: automatically update updated_at on update
	_, err = s.db.Exec(`
		CREATE TRIGGER IF NOT EXISTS update_strategies_updated_at
		AFTER UPDATE ON strategies
		BEGIN
			UPDATE strategies SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
		END
	`)

	return err
}

func (s *StrategyStore) initDefaultData() error {
	// No longer pre-populate strategies - create on demand when user configures
	return nil
}

// GetDefaultStrategyConfig returns the default strategy configuration for the given language
func GetDefaultStrategyConfig(lang string) StrategyConfig {
	config := StrategyConfig{
		CoinSource: CoinSourceConfig{
			SourceType:      "coinpool",
			UseCoinPool:     true,
			CoinPoolLimit:   10,
			CoinPoolAPIURL:  "http://172.22.189.252:30006/api/ai500/list?auth=cm_568c67eae410d912c54c",
			UseOITop:        false,
			OITopLimit:      20,
			OITopAPIURL:     "http://172.22.189.252:30006/api/oi/top-ranking?limit=20&duration=1h&auth=cm_568c67eae410d912c54c",
			UseMoversTop:    false,
			MoversTopLimit:  100,
			MoversTopAPIURL: "https://invest-soft.com/api/winners/list?sort=des&limit=100&auth=pluq8P0XTgucCN6kyxey5EPTof36R54lQc3rfgQsoNQ",
			UseTopLosers:    false,
			TopLosersLimit:  100,
			TopLosersAPIURL: "https://invest-soft.com/api/losers/list?sort=des&limit=100&auth=pluq8P0XTgucCN6kyxey5EPTof36R54lQc3rfgQsoNQ",
		},
		Indicators: IndicatorConfig{
			Klines: KlineConfig{
				PrimaryTimeframe:     "5m",
				PrimaryCount:         30,
				LongerTimeframe:      "4h",
				LongerCount:          10,
				EnableMultiTimeframe: true,
				SelectedTimeframes:   []string{"5m", "15m", "1h", "4h"},
			},
			EnableRawKlines:   true, // Required - raw OHLCV data for AI analysis
			EnableEMA:         false,
			EnableMACD:        false,
			EnableRSI:         false,
			EnableATR:         false,
			EnableVolume:      true,
			EnableOI:          false, // Disabled - crypto exchange feature
			EnableFundingRate: false, // Disabled - crypto exchange feature
			// VWAP indicators - enabled by default (calculated from bar data)
			EnableVWAPIndicator: true,
			EnableAnchoredVWAP:  true,
			AnchoredVWAPPeriod:  0, // 0 = session start
			EnableVolumeProfile: true,
			VolumeProfileBins:   24, // Default 24 price bins
			EMAPeriods:          []int{20, 50},
			RSIPeriods:          []int{7, 14},
			ATRPeriods:          []int{14},
			EnableQuantData:     false, // Disabled - crypto data source
			QuantDataAPIURL:     "",
			EnableQuantOI:       false,
			EnableQuantNetflow:  false,
			// OI ranking data - disabled for stock trading
			EnableOIRanking:   false,
			OIRankingAPIURL:   "",
			OIRankingDuration: "1h",
			OIRankingLimit:    10,
			// Stock Ranking Data Indicators (Alpaca Pro)
			EnableStockNews:        false,
			EnableTradeFlow:        false,
			EnableVWAP:             false,
			EnableCorporateActions: false,
			EnableVolumeSurge:      false,
			EnableEarnings:         false,
			EnableAnalystRatings:   false,
			EnableShortInterest:    false,
			StockNewsLimit:         10,

			// Phase 1: Entry Signals & Trade Filters
			EnableVWAPDeviation: true,             // VWAP deviation entry enabled
			VWAPMinDeviationATR: 1.0,              // Min 1 ATR from VWAP
			VWAPMaxDeviationATR: 2.5,              // Max 2.5 ATR from VWAP
			VWAPEntryMode:       "mean_reversion", // Default: buy dips to VWAP

			EnableVolumeConfirmation: true, // Volume confirmation enabled
			VolumeMinRatio:           1.5,  // Min 1.5x average volume

			EnableTrendFilter: true,             // EMA trend filter enabled
			TrendEMAPeriods:   []int{9, 21, 50}, // Standard EMA stack

			EnableRSIFilter:   false, // RSI filter disabled by default
			RSIUpperThreshold: 80,
			RSILowerThreshold: 20,

			EnableEarningsFilter:  true, // Earnings blackout enabled
			EarningsBlackoutDays:  1,    // 1 day before/after
			EnableFOMCFilter:      true, // FOMC blackout enabled
			EnableLowVolumeFilter: true, // Low volume filter enabled
			LowVolumeThreshold:    0.5,  // Skip if volume < 0.5x avg
		},
		RiskControl: RiskControlConfig{
			MaxPositions:                  3,   // Max 3 stocks simultaneously (CODE ENFORCED)
			LargeCapMaxMargin:             5,   // Large Cap brokerage margin (AI guided)
			SmallCapMaxMargin:             5,   // Small Cap brokerage margin (AI guided)
			LargeCapMaxPositionValueRatio: 5.0, // Large Cap: max position = 5x equity (CODE ENFORCED)
			SmallCapMaxPositionValueRatio: 1.0, // Small Cap: max position = 1x equity (CODE ENFORCED)
			MaxMarginUsage:                0.9, // Max 90% margin usage (CODE ENFORCED)
			MinPositionSize:               12,  // Min 12 USD per position (CODE ENFORCED)
			MinRiskRewardRatio:            3.0, // Min 3:1 profit/loss ratio (AI guided)
			MinConfidence:                 75,  // Min 75% confidence (AI guided)

			// Phase 1: Risk Management Features (with sensible defaults)
			UseATRStopLoss:    true, // ATR-based stop loss enabled
			ATRStopMultiplier: 1.5,  // Stop at 1.5x ATR from entry
			ATRPeriod:         14,   // Standard 14-period ATR

			UseRiskBasedSizing: true, // Risk-based position sizing
			RiskPerTradePct:    0.01, // 1% risk per trade
			MaxPositionPct:     0.10, // Max 10% of equity in single position

			UseDailyLossLimit: true, // Daily loss limit enabled
			DailyLossLimitPct: 0.02, // Stop trading after 2% daily loss

			UseTrailingStop:     false, // Trailing stop disabled by default
			TrailingStopATR:     1.5,   // Trail by 1.5 ATR when enabled
			TrailingActivationR: 1.0,   // Activate after 1R profit

			UsePartialProfits: false, // Partial profits disabled by default
			PartialProfitPct:  0.50,  // Take 50% at first target
			PartialProfitR:    2.0,   // First target at 2R

			CloseAtEOD:           true,    // Auto-close positions before market close (default: on for day-trade)
			CloseAtEODTime:       "15:55", // 3:55 PM ET (5 min before close)

			UseMarketHoursFilter: true, // Market hours filter enabled
			MarketOpenTime:       "09:30",
			MarketCloseTime:      "16:00",
			MarketTimezone:       "America/New_York",
		},
		// Phase 2: Execution Configuration (Smart Order Execution)
		Execution: ExecutionConfig{
			EnableLimitOrders:   false, // Disabled by default (test first)
			LimitOffsetATRMult:  0.5,   // 0.5 ATR offset from VWAP
			LimitTimeoutSeconds: 5,     // 5 second timeout before market order

			EnableTWAP:          false, // Disabled by default (for large accounts)
			TWAPDurationSeconds: 60,    // Spread over 60 seconds
			TWAPMinSize:         50000, // Only for $50k+ orders
			TWAPSliceCount:      6,     // 6 slices

			PreferredOrderType: "market", // Market orders by default
		},
	}

	// Use English stock trading prompts for all languages
	config.PromptSections = PromptSectionsConfig{
		RoleDefinition: `# You are a professional stock trading AI

Your task is to make trading decisions based on the provided market data. You are an experienced quantitative trader skilled in technical analysis and risk management.`,
		TradingFrequency: `# ⏱️ Trading Frequency Awareness

- Excellent trader: 2-4 trades per day ≈ 0.1-0.2 trades per hour
- >2 trades per hour = overtrading
- Single position holding time ≥ 30-60 minutes
If you find yourself trading every cycle → standards are too low; if closing positions in <30 minutes → too impulsive.`,
		EntryStandards: `# 🎯 Entry Standards (Strict)

Only enter positions when multiple signals resonate. Freely use any effective analysis methods, avoid low-quality behaviors such as single indicators, contradictory signals, sideways consolidation, or immediately restarting after closing positions.`,
		DecisionProcess: `# 📋 Decision Process

1. Check positions → whether to take profit/stop loss
2. Scan candidate stocks + multi-timeframe → whether strong signals exist
3. Write chain of thought first, then output structured JSON`,
	}

	return config
}

// Create create a strategy
func (s *StrategyStore) Create(strategy *Strategy) error {
	_, err := s.db.Exec(`
		INSERT INTO strategies (id, user_id, name, description, is_active, is_default, config)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, strategy.ID, strategy.UserID, strategy.Name, strategy.Description, strategy.IsActive, strategy.IsDefault, strategy.Config)
	return err
}

// Update update a strategy
func (s *StrategyStore) Update(strategy *Strategy) error {
	_, err := s.db.Exec(`
		UPDATE strategies SET
			name = ?, description = ?, config = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ? AND user_id = ?
	`, strategy.Name, strategy.Description, strategy.Config, strategy.ID, strategy.UserID)
	return err
}

// Delete delete a strategy
func (s *StrategyStore) Delete(userID, id string) error {
	// do not allow deleting system default strategy
	var isDefault bool
	s.db.QueryRow(`SELECT is_default FROM strategies WHERE id = ?`, id).Scan(&isDefault)
	if isDefault {
		return fmt.Errorf("cannot delete system default strategy")
	}

	_, err := s.db.Exec(`DELETE FROM strategies WHERE id = ? AND user_id = ?`, id, userID)
	return err
}

// List get user's strategy list
func (s *StrategyStore) List(userID string) ([]*Strategy, error) {
	// get user's own strategies + system default strategy
	rows, err := s.db.Query(`
		SELECT id, user_id, name, description, is_active, is_default, config, created_at, updated_at
		FROM strategies
		WHERE user_id = ? OR is_default = 1
		ORDER BY is_default DESC, created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var strategies []*Strategy
	for rows.Next() {
		var st Strategy
		var createdAt, updatedAt string
		err := rows.Scan(
			&st.ID, &st.UserID, &st.Name, &st.Description,
			&st.IsActive, &st.IsDefault, &st.Config,
			&createdAt, &updatedAt,
		)
		if err != nil {
			return nil, err
		}
		st.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
		st.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updatedAt)
		strategies = append(strategies, &st)
	}
	return strategies, nil
}

// Get get a single strategy
func (s *StrategyStore) Get(userID, id string) (*Strategy, error) {
	var st Strategy
	var createdAt, updatedAt string
	err := s.db.QueryRow(`
		SELECT id, user_id, name, description, is_active, is_default, config, created_at, updated_at
		FROM strategies
		WHERE id = ? AND (user_id = ? OR is_default = 1)
	`, id, userID).Scan(
		&st.ID, &st.UserID, &st.Name, &st.Description,
		&st.IsActive, &st.IsDefault, &st.Config,
		&createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}
	st.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
	st.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updatedAt)
	return &st, nil
}

// GetActive get user's currently active strategy
func (s *StrategyStore) GetActive(userID string) (*Strategy, error) {
	var st Strategy
	var createdAt, updatedAt string
	err := s.db.QueryRow(`
		SELECT id, user_id, name, description, is_active, is_default, config, created_at, updated_at
		FROM strategies
		WHERE user_id = ? AND is_active = 1
	`, userID).Scan(
		&st.ID, &st.UserID, &st.Name, &st.Description,
		&st.IsActive, &st.IsDefault, &st.Config,
		&createdAt, &updatedAt,
	)
	if err == sql.ErrNoRows {
		// no active strategy, return system default strategy
		return s.GetDefault()
	}
	if err != nil {
		return nil, err
	}
	st.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
	st.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updatedAt)
	return &st, nil
}

// GetDefault get system default strategy
func (s *StrategyStore) GetDefault() (*Strategy, error) {
	var st Strategy
	var createdAt, updatedAt string
	err := s.db.QueryRow(`
		SELECT id, user_id, name, description, is_active, is_default, config, created_at, updated_at
		FROM strategies
		WHERE is_default = 1
		LIMIT 1
	`).Scan(
		&st.ID, &st.UserID, &st.Name, &st.Description,
		&st.IsActive, &st.IsDefault, &st.Config,
		&createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}
	st.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
	st.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updatedAt)
	return &st, nil
}

// SetActive set active strategy (will first deactivate other strategies in the same category)
// Category is determined by name: "cursor" strategies are one category, all others (default) are another
func (s *StrategyStore) SetActive(userID, strategyID string) error {
	// First, get the strategy to determine its category
	var strategyName string
	err := s.db.QueryRow(`SELECT name FROM strategies WHERE id = ?`, strategyID).Scan(&strategyName)
	if err != nil {
		return fmt.Errorf("failed to get strategy: %w", err)
	}

	// Determine category based on name (case-insensitive)
	lowerName := strings.ToLower(strategyName)
	isCursor := strings.Contains(lowerName, "cursor")

	// begin transaction
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Only deactivate strategies in the same category
	// Cursor strategies: name contains "cursor"
	// Default strategies: name does NOT contain "cursor"
	if isCursor {
		// Deactivate only cursor strategies for the user
		_, err = tx.Exec(`UPDATE strategies SET is_active = 0 WHERE user_id = ? AND LOWER(name) LIKE '%cursor%'`, userID)
	} else {
		// Deactivate only non-cursor (default) strategies for the user
		_, err = tx.Exec(`UPDATE strategies SET is_active = 0 WHERE user_id = ? AND LOWER(name) NOT LIKE '%cursor%'`, userID)
	}
	if err != nil {
		return err
	}

	// activate specified strategy
	_, err = tx.Exec(`UPDATE strategies SET is_active = 1 WHERE id = ? AND (user_id = ? OR is_default = 1)`, strategyID, userID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// Deactivate deactivate a specific strategy
func (s *StrategyStore) Deactivate(userID, strategyID string) error {
	_, err := s.db.Exec(`UPDATE strategies SET is_active = 0 WHERE id = ? AND user_id = ?`, strategyID, userID)
	return err
}

// Duplicate duplicate a strategy (used to create custom strategy based on default strategy)
func (s *StrategyStore) Duplicate(userID, sourceID, newID, newName string) error {
	// get source strategy
	source, err := s.Get(userID, sourceID)
	if err != nil {
		return fmt.Errorf("failed to get source strategy: %w", err)
	}

	// create new strategy
	newStrategy := &Strategy{
		ID:          newID,
		UserID:      userID,
		Name:        newName,
		Description: "Created based on [" + source.Name + "]",
		IsActive:    false,
		IsDefault:   false,
		Config:      source.Config,
	}

	return s.Create(newStrategy)
}

// ParseConfig parse strategy configuration JSON
func (s *Strategy) ParseConfig() (*StrategyConfig, error) {
	var config StrategyConfig
	if err := json.Unmarshal([]byte(s.Config), &config); err != nil {
		return nil, fmt.Errorf("failed to parse strategy configuration: %w", err)
	}
	return &config, nil
}

// SetConfig set strategy configuration
func (s *Strategy) SetConfig(config *StrategyConfig) error {
	data, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to serialize strategy configuration: %w", err)
	}
	s.Config = string(data)
	return nil
}
