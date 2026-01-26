package market

import "time"

// Data market data structure
type Data struct {
	Symbol            string
	CurrentPrice      float64
	PriceChange1h     float64 // 1-hour price change percentage
	PriceChange4h     float64 // 4-hour price change percentage
	CurrentEMA20      float64
	CurrentMACD       float64
	CurrentRSI7       float64
	OpenInterest      *OIData
	FundingRate       float64
	IntradaySeries    *IntradayData
	LongerTermContext *LongerTermData
	// Multi-timeframe data (new)
	TimeframeData  map[string]*TimeframeSeriesData `json:"timeframe_data,omitempty"`
	StockExtraData *StockExtraData                 `json:"stock_extra_data,omitempty"` // Stock-specific data
}

// StockExtraData contains stock-specific indicators (not applicable for crypto)
type StockExtraData struct {
	// News & Sentiment
	RecentNews []NewsItem `json:"recent_news,omitempty"`
	// Corporate Actions
	CorporateActions []CorpAction `json:"corporate_actions,omitempty"`
	// Volume Surge (2x+ average detection)
	VolumeSurge   bool    `json:"volume_surge"`
	VolumeRatio   float64 `json:"volume_ratio"` // Current volume / 20-day average
	AverageVolume float64 `json:"average_volume"`
	CurrentVolume float64 `json:"current_volume"`

	// Analyst Ratings (FMP API)
	AnalystRating     string  `json:"analyst_rating,omitempty"`      // Strong Buy/Buy/Hold/Sell/Strong Sell
	AnalystTargetHigh float64 `json:"analyst_target_high,omitempty"` // Highest price target
	AnalystTargetLow  float64 `json:"analyst_target_low,omitempty"`  // Lowest price target
	AnalystTargetAvg  float64 `json:"analyst_target_avg,omitempty"`  // Average price target

	// Earnings Calendar (FMP API)
	NextEarningsDate  string  `json:"next_earnings_date,omitempty"`  // Date of next earnings
	DaysUntilEarnings int     `json:"days_until_earnings,omitempty"` // Days until earnings
	EpsEstimate       float64 `json:"eps_estimate,omitempty"`        // EPS estimate
	EarningsTime      string  `json:"earnings_time,omitempty"`       // Before/After market

	// Short Interest (FINRA API)
	ShortInterest float64 `json:"short_interest,omitempty"` // Short interest as % of float
	DaysToCover   float64 `json:"days_to_cover,omitempty"`  // Days to cover based on avg volume
	SqueezeRisk   string  `json:"squeeze_risk,omitempty"`   // Low/Medium/High

	// Zero DTE Options (Alpaca Options API)
	ZeroDTEPutCallRatio float64 `json:"zero_dte_put_call_ratio,omitempty"` // Put/Call ratio
	ZeroDTESentiment    string  `json:"zero_dte_sentiment,omitempty"`      // Bullish/Bearish/Neutral
	MaxPainStrike       float64 `json:"max_pain_strike,omitempty"`         // Max pain strike price

	// Trade Flow - Institutional Activity (Alpaca Trades API)
	TradeFlowDirection string  `json:"trade_flow_direction,omitempty"` // Buying/Selling/Neutral
	BuySellRatio       float64 `json:"buy_sell_ratio,omitempty"`       // Buy volume / Sell volume
	InstitutionalVWAP  float64 `json:"institutional_vwap,omitempty"`   // VWAP from trade flow

	// Anchored VWAP (Session-based calculation)
	AnchoredVWAP    float64 `json:"anchored_vwap,omitempty"`     // VWAP from session start
	AnchoredVWAPDev float64 `json:"anchored_vwap_dev,omitempty"` // % deviation from current price
}

// NewsItem represents a news article for display
type NewsItem struct {
	Headline  string `json:"headline"`
	Source    string `json:"source"`
	CreatedAt string `json:"created_at"`
	Summary   string `json:"summary,omitempty"`
}

// CorpAction represents a corporate action summary
type CorpAction struct {
	Type        string  `json:"type"`
	ExDate      string  `json:"ex_date"`
	Description string  `json:"description"`
	CashAmount  float64 `json:"cash_amount,omitempty"`
}

// KlineBar single kline bar with OHLCV data
type KlineBar struct {
	Time   int64   `json:"time"`   // Unix timestamp in milliseconds
	Open   float64 `json:"open"`   // Open price
	High   float64 `json:"high"`   // High price
	Low    float64 `json:"low"`    // Low price
	Close  float64 `json:"close"`  // Close price
	Volume float64 `json:"volume"` // Volume
}

// TimeframeSeriesData series data for a single timeframe
type TimeframeSeriesData struct {
	Timeframe     string     `json:"timeframe"`       // Timeframe identifier, e.g. "5m", "15m", "1h"
	Klines        []KlineBar `json:"klines"`          // Full OHLCV kline data
	MidPrices     []float64  `json:"mid_prices"`      // Price series (deprecated, kept for compatibility)
	EMA20Values   []float64  `json:"ema20_values"`    // EMA20 series
	EMA50Values   []float64  `json:"ema50_values"`    // EMA50 series
	MACDValues    []float64  `json:"macd_values"`     // MACD series
	RSI7Values    []float64  `json:"rsi7_values"`     // RSI7 series
	RSI14Values   []float64  `json:"rsi14_values"`    // RSI14 series
	Volume        []float64  `json:"volume"`          // Volume series (deprecated, use Klines)
	ATR14         float64    `json:"atr14"`           // ATR14
	VWAPValues    []float64  `json:"vwap_values"`     // VWAP series
	CurrentVWAP   float64    `json:"current_vwap"`    // Current session VWAP
	VolumeProfile []float64  `json:"volume_profile"`  // Volume at price levels
}

// OIData Open Interest data
type OIData struct {
	Latest  float64
	Average float64
}

// IntradayData intraday data (3-minute interval)
type IntradayData struct {
	MidPrices   []float64
	EMA20Values []float64
	MACDValues  []float64
	RSI7Values  []float64
	RSI14Values []float64
	Volume      []float64
	ATR14       float64
}

// LongerTermData longer-term data (4-hour timeframe)
type LongerTermData struct {
	EMA20         float64
	EMA50         float64
	ATR3          float64
	ATR14         float64
	CurrentVolume float64
	AverageVolume float64
	MACDValues    []float64
	RSI14Values   []float64
}

// Binance API response structure
type ExchangeInfo struct {
	Symbols []SymbolInfo `json:"symbols"`
}

type SymbolInfo struct {
	Symbol            string `json:"symbol"`
	Status            string `json:"status"`
	BaseAsset         string `json:"baseAsset"`
	QuoteAsset        string `json:"quoteAsset"`
	ContractType      string `json:"contractType"`
	PricePrecision    int    `json:"pricePrecision"`
	QuantityPrecision int    `json:"quantityPrecision"`
}

type Kline struct {
	OpenTime            int64   `json:"openTime"`
	Open                float64 `json:"open"`
	High                float64 `json:"high"`
	Low                 float64 `json:"low"`
	Close               float64 `json:"close"`
	Volume              float64 `json:"volume"`
	CloseTime           int64   `json:"closeTime"`
	QuoteVolume         float64 `json:"quoteVolume"`
	Trades              int     `json:"trades"`
	TakerBuyBaseVolume  float64 `json:"takerBuyBaseVolume"`
	TakerBuyQuoteVolume float64 `json:"takerBuyQuoteVolume"`
}

type KlineResponse []interface{}

type PriceTicker struct {
	Symbol string `json:"symbol"`
	Price  string `json:"price"`
}

type Ticker24hr struct {
	Symbol             string `json:"symbol"`
	PriceChange        string `json:"priceChange"`
	PriceChangePercent string `json:"priceChangePercent"`
	Volume             string `json:"volume"`
	QuoteVolume        string `json:"quoteVolume"`
}

// SymbolFeatures feature data structure
type SymbolFeatures struct {
	Symbol           string    `json:"symbol"`
	Timestamp        time.Time `json:"timestamp"`
	Price            float64   `json:"price"`
	PriceChange15Min float64   `json:"price_change_15min"`
	PriceChange1H    float64   `json:"price_change_1h"`
	PriceChange4H    float64   `json:"price_change_4h"`
	Volume           float64   `json:"volume"`
	VolumeRatio5     float64   `json:"volume_ratio_5"`
	VolumeRatio20    float64   `json:"volume_ratio_20"`
	VolumeTrend      float64   `json:"volume_trend"`
	RSI14            float64   `json:"rsi_14"`
	SMA5             float64   `json:"sma_5"`
	SMA10            float64   `json:"sma_10"`
	SMA20            float64   `json:"sma_20"`
	HighLowRatio     float64   `json:"high_low_ratio"`
	Volatility20     float64   `json:"volatility_20"`
	PositionInRange  float64   `json:"position_in_range"`
}

// Alert alert data structure
type Alert struct {
	Type      string    `json:"type"`
	Symbol    string    `json:"symbol"`
	Value     float64   `json:"value"`
	Threshold float64   `json:"threshold"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

type Config struct {
	AlertThresholds AlertThresholds `json:"alert_thresholds"`
	UpdateInterval  int             `json:"update_interval"` // seconds
	CleanupConfig   CleanupConfig   `json:"cleanup_config"`
}

type AlertThresholds struct {
	VolumeSpike      float64 `json:"volume_spike"`
	PriceChange15Min float64 `json:"price_change_15min"`
	VolumeTrend      float64 `json:"volume_trend"`
	RSIOverbought    float64 `json:"rsi_overbought"`
	RSIOversold      float64 `json:"rsi_oversold"`
}
type CleanupConfig struct {
	InactiveTimeout   time.Duration `json:"inactive_timeout"`    // Inactive timeout duration
	MinScoreThreshold float64       `json:"min_score_threshold"` // Minimum score threshold
	NoAlertTimeout    time.Duration `json:"no_alert_timeout"`    // No alert timeout duration
	CheckInterval     time.Duration `json:"check_interval"`      // Check interval
}

var config = Config{
	AlertThresholds: AlertThresholds{
		VolumeSpike:      3.0,
		PriceChange15Min: 0.05,
		VolumeTrend:      2.0,
		RSIOverbought:    70,
		RSIOversold:      30,
	},
	CleanupConfig: CleanupConfig{
		InactiveTimeout:   30 * time.Minute,
		MinScoreThreshold: 15.0,
		NoAlertTimeout:    20 * time.Minute,
		CheckInterval:     5 * time.Minute,
	},
	UpdateInterval: 60, // 1 minute
}
