package decision

import (
	"SynapseStrike/logger"
	"SynapseStrike/market"
	"SynapseStrike/mcp"
	"SynapseStrike/provider"
	"SynapseStrike/security"
	"SynapseStrike/store"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// ============================================================================
// Pre-compiled regular expressions (performance optimization)
// ============================================================================

var (
	// Safe regex: precisely match ```json code blocks
	reJSONFence      = regexp.MustCompile(`(?is)` + "```json\\s*(\\[\\s*\\{.*?\\}\\s*\\])\\s*```")
	reJSONArray      = regexp.MustCompile(`(?is)\[\s*\{.*?\}\s*\]`)
	reArrayHead      = regexp.MustCompile(`^\[\s*\{`)
	reArrayOpenSpace = regexp.MustCompile(`^\[\s+\{`)
	reInvisibleRunes = regexp.MustCompile("[\u200B\u200C\u200D\uFEFF]")

	// XML tag extraction (supports any characters in reasoning chain)
	reReasoningTag = regexp.MustCompile(`(?s)<reasoning>(.*?)</reasoning>`)
	reDecisionTag  = regexp.MustCompile(`(?s)<decision>(.*?)</decision>`)
)

// ============================================================================
// Type Definitions
// ============================================================================

// PositionInfo position information
type PositionInfo struct {
	Symbol           string  `json:"symbol"`
	Side             string  `json:"side"` // "long" or "short"
	EntryPrice       float64 `json:"entry_price"`
	MarkPrice        float64 `json:"mark_price"`
	Quantity         float64 `json:"quantity"`
	Leverage         int     `json:"leverage"`
	UnrealizedPnL    float64 `json:"unrealized_pnl"`
	UnrealizedPnLPct float64 `json:"unrealized_pnl_pct"`
	PeakPnLPct       float64 `json:"peak_pnl_pct"` // Historical peak profit percentage
	LiquidationPrice float64 `json:"liquidation_price"`
	MarginUsed       float64 `json:"margin_used"`
	UpdateTime       int64   `json:"update_time"` // Position update timestamp (milliseconds)
}

// AccountInfo account information
type AccountInfo struct {
	TotalEquity      float64 `json:"total_equity"`      // Account equity
	AvailableBalance float64 `json:"available_balance"` // Available balance
	UnrealizedPnL    float64 `json:"unrealized_pnl"`    // Unrealized profit/loss
	TotalPnL         float64 `json:"total_pnl"`         // Total profit/loss
	TotalPnLPct      float64 `json:"total_pnl_pct"`     // Total profit/loss percentage
	MarginUsed       float64 `json:"margin_used"`       // Used margin
	MarginUsedPct    float64 `json:"margin_used_pct"`   // Margin usage rate
	PositionCount    int     `json:"position_count"`    // Number of positions
}

// CandidateStock candidate stock (from stock pool)
type CandidateStock struct {
	Symbol  string   `json:"symbol"`
	Sources []string `json:"sources"` // Sources: "ai500" and/or "oi_top"
}

// OITopData open interest growth top data (for AI decision reference)
type OITopData struct {
	Rank              int     // OI Top ranking
	OIDeltaPercent    float64 // Open interest change percentage (1 hour)
	OIDeltaValue      float64 // Open interest change value
	PriceDeltaPercent float64 // Price change percentage
}

// TradingStats trading statistics (for AI input)
type TradingStats struct {
	TotalTrades    int     `json:"total_trades"`     // Total number of trades (closed)
	WinRate        float64 `json:"win_rate"`         // Win rate (%)
	ProfitFactor   float64 `json:"profit_factor"`    // Profit factor
	SharpeRatio    float64 `json:"sharpe_ratio"`     // Sharpe ratio
	TotalPnL       float64 `json:"total_pnl"`        // Total profit/loss
	AvgWin         float64 `json:"avg_win"`          // Average win
	AvgLoss        float64 `json:"avg_loss"`         // Average loss
	MaxDrawdownPct float64 `json:"max_drawdown_pct"` // Maximum drawdown (%)
}

// RecentOrder recently completed order (for AI input)
type RecentOrder struct {
	Symbol       string  `json:"symbol"`        // Trading pair
	Side         string  `json:"side"`          // long/short
	EntryPrice   float64 `json:"entry_price"`   // Entry price
	ExitPrice    float64 `json:"exit_price"`    // Exit price
	RealizedPnL  float64 `json:"realized_pnl"`  // Realized profit/loss
	PnLPct       float64 `json:"pnl_pct"`       // Profit/loss percentage
	EntryTime    string  `json:"entry_time"`    // Entry time
	ExitTime     string  `json:"exit_time"`     // Exit time
	HoldDuration string  `json:"hold_duration"` // Hold duration, e.g. "2h30m"
}

// Context trading context (complete information passed to AI)
type Context struct {
	CurrentTime      string                             `json:"current_time"`
	RuntimeMinutes   int                                `json:"runtime_minutes"`
	CallCount        int                                `json:"call_count"`
	Account          AccountInfo                        `json:"account"`
	Positions        []PositionInfo                     `json:"positions"`
	CandidateStocks  []CandidateStock                   `json:"candidate_stocks"`
	PromptVariant    string                             `json:"prompt_variant,omitempty"`
	TradingStats     *TradingStats                      `json:"trading_stats,omitempty"`
	RecentOrders     []RecentOrder                      `json:"recent_orders,omitempty"`
	MarketDataMap    map[string]*market.Data            `json:"-"`
	MultiTFMarket    map[string]map[string]*market.Data `json:"-"`
	OITopDataMap     map[string]*OITopData              `json:"-"`
	QuantDataMap     map[string]*QuantData              `json:"-"`
	OIRankingData    *provider.OIRankingData            `json:"-"` // Market-wide OI ranking data
	LargeCapLeverage int                                `json:"-"`
	SmallCapLeverage int                                `json:"-"`
	Timeframes       []string                           `json:"-"`
}

// Decision AI trading decision
type Decision struct {
	Symbol string `json:"symbol"`
	Action string `json:"action"` // "open_long", "open_short", "close_long", "close_short", "hold", "wait"

	// Opening position parameters
	Leverage        int     `json:"leverage,omitempty"`
	PositionSizeUSD float64 `json:"position_size_usd,omitempty"`
	StopLoss        float64 `json:"stop_loss,omitempty"`
	TakeProfit      float64 `json:"take_profit,omitempty"`

	// Common parameters
	Confidence int     `json:"confidence,omitempty"` // Confidence level (0-100)
	RiskUSD    float64 `json:"risk_usd,omitempty"`   // Maximum USD risk
	Reasoning  string  `json:"reasoning"`
}

// FullDecision AI's complete decision (including chain of thought)
type FullDecision struct {
	SystemPrompt        string     `json:"system_prompt"`
	UserPrompt          string     `json:"user_prompt"`
	CoTTrace            string     `json:"cot_trace"`
	Decisions           []Decision `json:"decisions"`
	RawResponse         string     `json:"raw_response"`
	Timestamp           time.Time  `json:"timestamp"`
	AIRequestDurationMs int64      `json:"ai_request_duration_ms,omitempty"`
}

// QuantData quantitative data structure (fund flow, position changes, price changes)
type QuantData struct {
	Symbol      string             `json:"symbol"`
	Price       float64            `json:"price"`
	Netflow     *NetflowData       `json:"netflow,omitempty"`
	OI          map[string]*OIData `json:"oi,omitempty"`
	PriceChange map[string]float64 `json:"price_change,omitempty"`
}

type NetflowData struct {
	Institution *FlowTypeData `json:"institution,omitempty"`
	Personal    *FlowTypeData `json:"personal,omitempty"`
}

type FlowTypeData struct {
	Future map[string]float64 `json:"future,omitempty"`
	Spot   map[string]float64 `json:"spot,omitempty"`
}

type OIData struct {
	CurrentOI float64                 `json:"current_oi"`
	Delta     map[string]*OIDeltaData `json:"delta,omitempty"`
}

type OIDeltaData struct {
	OIDelta        float64 `json:"oi_delta"`
	OIDeltaValue   float64 `json:"oi_delta_value"`
	OIDeltaPercent float64 `json:"oi_delta_percent"`
}

// ============================================================================
// StrategyEngine - Core Strategy Execution Engine
// ============================================================================

// StrategyEngine strategy execution engine
type StrategyEngine struct {
	config *store.StrategyConfig
}

// NewStrategyEngine creates strategy execution engine
func NewStrategyEngine(config *store.StrategyConfig) *StrategyEngine {
	return &StrategyEngine{config: config}
}

// GetRiskControlConfig gets risk control configuration
func (e *StrategyEngine) GetRiskControlConfig() store.RiskControlConfig {
	return e.config.RiskControl
}

// GetConfig gets complete strategy configuration
func (e *StrategyEngine) GetConfig() *store.StrategyConfig {
	return e.config
}

// ============================================================================
// Entry Functions - Main API
// ============================================================================

// GetFullDecision gets AI's complete trading decision (batch analysis of all stocks and positions)
// Uses default strategy configuration - for production use GetFullDecisionWithStrategy with explicit config
func GetFullDecision(ctx *Context, mcpClient mcp.AIClient) (*FullDecision, error) {
	defaultConfig := store.GetDefaultStrategyConfig("en")
	engine := NewStrategyEngine(&defaultConfig)
	return GetFullDecisionWithStrategy(ctx, mcpClient, engine, "")
}

// GetFullDecisionWithStrategy uses StrategyEngine to get AI decision (unified prompt generation)
func GetFullDecisionWithStrategy(ctx *Context, mcpClient mcp.AIClient, engine *StrategyEngine, variant string) (*FullDecision, error) {
	if ctx == nil {
		return nil, fmt.Errorf("context is nil")
	}
	if engine == nil {
		defaultConfig := store.GetDefaultStrategyConfig("en")
		engine = NewStrategyEngine(&defaultConfig)
	}

	// 1. Fetch market data using strategy config
	if len(ctx.MarketDataMap) == 0 {
		if err := fetchMarketDataWithStrategy(ctx, engine); err != nil {
			return nil, fmt.Errorf("failed to fetch market data: %w", err)
		}
	}

	// Ensure OITopDataMap is initialized
	if ctx.OITopDataMap == nil {
		ctx.OITopDataMap = make(map[string]*OITopData)
		oiPositions, err := provider.GetOITopPositions()
		if err == nil {
			for _, pos := range oiPositions {
				ctx.OITopDataMap[pos.Symbol] = &OITopData{
					Rank:              pos.Rank,
					OIDeltaPercent:    pos.OIDeltaPercent,
					OIDeltaValue:      pos.OIDeltaValue,
					PriceDeltaPercent: pos.PriceDeltaPercent,
				}
			}
		}
	}

	riskConfig := engine.GetRiskControlConfig()

	// =========================================================================
	// Local Function Provider: bypass AI calls entirely, use algorithmic logic
	// =========================================================================
	if mcpClient.GetProvider() == mcp.ProviderLocalFunc {
		return GetLocalFunctionDecision(ctx, engine, mcpClient.GetModel())
	}

	// =========================================================================
	// Batched AI Calls: Split candidates into chunks to fit within LLM context
	// Each batch gets its own AI call with a subset of stocks, then results
	// are merged into a single FullDecision.
	// =========================================================================
	const batchSize = 2 // Max stocks per AI call (tuned for ~16K context LLMs)

	allCandidates := ctx.CandidateStocks
	needsBatching := len(allCandidates) > batchSize

	if needsBatching {
		logger.Infof("📦 [Batch Mode] Splitting %d candidates into batches of %d (%d AI calls)",
			len(allCandidates), batchSize, (len(allCandidates)+batchSize-1)/batchSize)
	}

	var allDecisions []Decision
	var allCoTTraces []string
	var allUserPrompts []string
	var allRawResponses []string
	var systemPrompt string
	var totalAIDurationMs int64
	var lastErr error

	// Split candidates into batches
	for batchIdx := 0; batchIdx < len(allCandidates); batchIdx += batchSize {
		end := batchIdx + batchSize
		if end > len(allCandidates) {
			end = len(allCandidates)
		}
		batchStocks := allCandidates[batchIdx:end]
		batchNum := batchIdx/batchSize + 1
		totalBatches := (len(allCandidates) + batchSize - 1) / batchSize

		if needsBatching {
			symbols := make([]string, len(batchStocks))
			for i, s := range batchStocks {
				symbols[i] = s.Symbol
			}
			logger.Infof("📦 [Batch %d/%d] Processing stocks: %s", batchNum, totalBatches, strings.Join(symbols, ", "))
		}

		// Create a sub-context with only this batch's candidates
		batchCtx := &Context{
			CurrentTime:    ctx.CurrentTime,
			CallCount:      ctx.CallCount,
			RuntimeMinutes: ctx.RuntimeMinutes,
			Account:        ctx.Account,
			Positions:      ctx.Positions,
			CandidateStocks: batchStocks,
			MarketDataMap:  ctx.MarketDataMap,
			OITopDataMap:   ctx.OITopDataMap,
			QuantDataMap:   ctx.QuantDataMap,
			RecentOrders:   ctx.RecentOrders,
		}

		// Build prompts for this batch
		systemPrompt = engine.BuildSystemPrompt(ctx.Account.TotalEquity, variant)
		userPrompt := engine.BuildUserPrompt(batchCtx)

		// Call AI API
		aiCallStart := time.Now()
		var aiResponse string
		var err error

		if mcpClient.GetProvider() == mcp.ProviderArchitect {
			symbol := "BTCUSDT"
			if len(batchStocks) > 0 {
				symbol = batchStocks[0].Symbol
			}
			timeframe := engine.GetConfig().Indicators.Klines.PrimaryTimeframe
			if timeframe == "" {
				timeframe = "1m"
			}
			req, _ := mcp.NewRequestBuilder().
				WithSystemPrompt(systemPrompt).
				WithUserPrompt(userPrompt).
				WithMetadataItem("market_context", batchCtx).
				WithMetadataItem("symbol", symbol).
				WithMetadataItem("timeframe", timeframe).
				WithMetadataItem("question", userPrompt).
				Build()
			aiResponse, err = mcpClient.CallWithRequest(req)
		} else {
			aiResponse, err = mcpClient.CallWithMessages(systemPrompt, userPrompt)
		}

		aiCallDuration := time.Since(aiCallStart)
		totalAIDurationMs += aiCallDuration.Milliseconds()

		if err != nil {
			lastErr = fmt.Errorf("AI API call failed (batch %d/%d): %w", batchNum, totalBatches, err)
			if needsBatching {
				logger.Warnf("⚠️  [Batch %d/%d] AI call failed: %v — skipping batch", batchNum, totalBatches, err)
				allCoTTraces = append(allCoTTraces, fmt.Sprintf("## Batch %d/%d — FAILED\nError: %v", batchNum, totalBatches, err))
			} else {
				return nil, fmt.Errorf("AI API call failed: %w", err)
			}
			continue
		}

		if needsBatching {
			logger.Infof("✅ [Batch %d/%d] AI responded in %.1fs", batchNum, totalBatches, float64(aiCallDuration.Milliseconds())/1000)
		}

		// Parse this batch's response
		batchDecision, parseErr := parseFullDecisionResponse(
			aiResponse,
			ctx.Account.TotalEquity,
			riskConfig.LargeCapMaxMargin,
			riskConfig.SmallCapMaxMargin,
			riskConfig.LargeCapMaxPositionValueRatio,
			riskConfig.SmallCapMaxPositionValueRatio,
		)

		if batchDecision != nil {
			if batchDecision.CoTTrace != "" {
				header := fmt.Sprintf("## Batch %d/%d", batchNum, totalBatches)
				allCoTTraces = append(allCoTTraces, header+"\n"+batchDecision.CoTTrace)
			}
			// Collect decisions (skip generic "ALL wait" if we have real decisions from other batches)
			for _, d := range batchDecision.Decisions {
				if d.Symbol == "ALL" && d.Action == "wait" && needsBatching {
					// Only add ALL/wait if this is the only batch or no other decisions exist
					continue
				}
				allDecisions = append(allDecisions, d)
			}
		}

		allUserPrompts = append(allUserPrompts, userPrompt)
		allRawResponses = append(allRawResponses, aiResponse)

		if parseErr != nil && !needsBatching {
			return batchDecision, fmt.Errorf("failed to parse AI response: %w", parseErr)
		} else if parseErr != nil {
			logger.Warnf("⚠️  [Batch %d/%d] Parse error (non-fatal): %v", batchNum, totalBatches, parseErr)
		}
	}

	// If all batches failed, return the last error
	if len(allDecisions) == 0 && lastErr != nil {
		return nil, lastErr
	}

	// If no decisions from any batch, add a default wait
	if len(allDecisions) == 0 {
		allDecisions = append(allDecisions, Decision{
			Symbol:    "ALL",
			Action:    "wait",
			Reasoning: "No actionable signals found across all batches",
		})
	}

	// Merge all batch results into a single FullDecision
	mergedCoT := strings.Join(allCoTTraces, "\n\n---\n\n")
	mergedPrompts := strings.Join(allUserPrompts, "\n\n===BATCH SEPARATOR===\n\n")
	mergedRaw := strings.Join(allRawResponses, "\n\n===BATCH SEPARATOR===\n\n")

	if needsBatching {
		logger.Infof("📦 [Batch Mode] Complete: %d batches, %d decisions, total AI time %.1fs",
			(len(allCandidates)+batchSize-1)/batchSize, len(allDecisions), float64(totalAIDurationMs)/1000)
	}

	return &FullDecision{
		SystemPrompt:        systemPrompt,
		UserPrompt:          mergedPrompts,
		CoTTrace:            mergedCoT,
		Decisions:           allDecisions,
		RawResponse:         mergedRaw,
		Timestamp:           time.Now(),
		AIRequestDurationMs: totalAIDurationMs,
	}, nil
}

// ============================================================================
// Market Data Fetching
// ============================================================================

// fetchMarketDataWithStrategy fetches market data using strategy config (multiple timeframes)
func fetchMarketDataWithStrategy(ctx *Context, engine *StrategyEngine) error {
	config := engine.GetConfig()
	ctx.MarketDataMap = make(map[string]*market.Data)

	timeframes := config.Indicators.Klines.SelectedTimeframes
	primaryTimeframe := config.Indicators.Klines.PrimaryTimeframe
	klineCount := config.Indicators.Klines.PrimaryCount

	// Compatible with old configuration
	if len(timeframes) == 0 {
		if primaryTimeframe != "" {
			timeframes = append(timeframes, primaryTimeframe)
		} else {
			timeframes = append(timeframes, "5m") // Default to 5m for stocks
		}
		if config.Indicators.Klines.LongerTimeframe != "" {
			timeframes = append(timeframes, config.Indicators.Klines.LongerTimeframe)
		}
	}

	// Merge confluence timeframes if enabled
	if config.Indicators.EnableConfluence && len(config.Indicators.ConfluenceTimeframes) > 0 {
		existingTfs := make(map[string]bool)
		for _, tf := range timeframes {
			existingTfs[tf] = true
		}
		for _, tf := range config.Indicators.ConfluenceTimeframes {
			if !existingTfs[tf] {
				timeframes = append(timeframes, tf)
				existingTfs[tf] = true
			}
		}
	}

	if primaryTimeframe == "" && len(timeframes) > 0 {
		primaryTimeframe = timeframes[0]
	}
	if klineCount <= 0 {
		klineCount = 30
	}

	logger.Infof("📊 Strategy timeframes: %v, Primary: %s, Kline count: %d", timeframes, primaryTimeframe, klineCount)

	// Helper function to detect if symbol is a stock (vs crypto)
	// Stocks: TSLA, AAPL, DJT, ONDS (no USDT suffix)
	// Crypto: BTCUSDT, ETHUSDT (has USDT suffix)
	isStockSymbol := func(symbol string) bool {
		symbol = strings.ToUpper(symbol)
		// If it ends with USDT, USD, or other crypto suffixes, it's crypto
		if strings.HasSuffix(symbol, "USDT") || strings.HasSuffix(symbol, "BUSD") ||
			strings.HasSuffix(symbol, "USDC") || strings.HasSuffix(symbol, "BTC") ||
			strings.HasSuffix(symbol, "ETH") {
			return false
		}
		// If it's all letters (no digits) and 1-5 chars, likely a stock ticker
		if len(symbol) <= 5 {
			for _, r := range symbol {
				if r < 'A' || r > 'Z' {
					return false
				}
			}
			return true
		}
		return false
	}

	// 1. First fetch data for position stocks (must fetch)
	for _, pos := range ctx.Positions {
		var data *market.Data
		var err error

		if isStockSymbol(pos.Symbol) {
			data, err = market.GetStockDataWithTimeframes(pos.Symbol, timeframes, primaryTimeframe, klineCount)
		} else {
			data, err = market.GetWithTimeframes(pos.Symbol, timeframes, primaryTimeframe, klineCount)
		}

		if err != nil {
			logger.Infof("⚠️  Failed to fetch market data for position %s: %v", pos.Symbol, err)
			continue
		}
		ctx.MarketDataMap[pos.Symbol] = data
	}

	// 2. Fetch data for all candidate stocks
	positionSymbols := make(map[string]bool)
	for _, pos := range ctx.Positions {
		positionSymbols[pos.Symbol] = true
	}

	const minOIThresholdMillions = 15.0 // 15M USD minimum open interest value (only for crypto)

	for _, stock := range ctx.CandidateStocks {
		if _, exists := ctx.MarketDataMap[stock.Symbol]; exists {
			continue
		}

		var data *market.Data
		var err error

		isStock := isStockSymbol(stock.Symbol)
		if isStock {
			data, err = market.GetStockDataWithTimeframes(stock.Symbol, timeframes, primaryTimeframe, klineCount)
		} else {
			data, err = market.GetWithTimeframes(stock.Symbol, timeframes, primaryTimeframe, klineCount)
		}

		if err != nil {
			logger.Infof("⚠️  Failed to fetch market data for %s: %v", stock.Symbol, err)
			continue
		}

		// Liquidity filter (only for crypto, stocks don't have OI)
		if !isStock {
			isExistingPosition := positionSymbols[stock.Symbol]
			if !isExistingPosition && data.OpenInterest != nil && data.CurrentPrice > 0 {
				oiValue := data.OpenInterest.Latest * data.CurrentPrice
				oiValueInMillions := oiValue / 1_000_000
				if oiValueInMillions < minOIThresholdMillions {
					logger.Infof("⚠️  %s OI value too low (%.2fM USD < %.1fM), skipping stock",
						stock.Symbol, oiValueInMillions, minOIThresholdMillions)
					continue
				}
			}
		}

		ctx.MarketDataMap[stock.Symbol] = data
	}

	logger.Infof("📊 Successfully fetched multi-timeframe market data for %d stocks", len(ctx.MarketDataMap))
	return nil
}

// ============================================================================
// Candidate Stocks
// ============================================================================

// GetCandidateStocks gets candidate stocks based on strategy configuration
func (e *StrategyEngine) GetCandidateStocks() ([]CandidateStock, error) {
	var candidates []CandidateStock
	symbolSources := make(map[string][]string)

	stockSource := e.config.CoinSource

	if stockSource.CoinPoolAPIURL != "" {
		provider.SetCoinPoolAPI(stockSource.CoinPoolAPIURL)
	}
	if stockSource.OITopAPIURL != "" {
		provider.SetOITopAPI(stockSource.OITopAPIURL)
	}

	switch stockSource.SourceType {
	case "static":
		// Support both StaticStocks (new stock trading) and StaticCoins (legacy crypto)
		staticSymbols := stockSource.StaticStocks
		logger.Infof("📊 GetCandidateStocks: StaticStocks=%v, StaticCoins=%v", stockSource.StaticStocks, stockSource.StaticCoins)
		if len(staticSymbols) == 0 {
			staticSymbols = stockSource.StaticCoins // fallback to legacy field
		}
		for _, symbol := range staticSymbols {
			symbol = market.Normalize(symbol)
			candidates = append(candidates, CandidateStock{
				Symbol:  symbol,
				Sources: []string{"static"},
			})
		}
		return candidates, nil

	case "coinpool", "stockpool": // stockpool is the stock trading alias
		return e.getStockPoolStocks(stockSource.CoinPoolLimit)

	case "ai100":
		return e.getAI100Stocks(stockSource.AI100Limit)

	case "oi_top":
		return e.getOITopStocks(stockSource.OITopLimit)

	case "movers_top", "top_winners":
		return e.getTopWinnersStocks(stockSource.MoversTopLimit)

	case "top_losers":
		return e.getTopLosersStocks(stockSource.TopLosersLimit)

	case "mixed":
		// Check both UseCoinPool (legacy) and UseStockPool (new stock trading)
		usePool := stockSource.UseCoinPool || stockSource.UseStockPool
		poolLimit := stockSource.CoinPoolLimit
		if poolLimit == 0 {
			poolLimit = stockSource.StockPoolLimit
		}
		if usePool {
			poolStocks, err := e.getStockPoolStocks(poolLimit)
			if err != nil {
				logger.Infof("⚠️  Failed to get AI500 pool: %v", err)
			} else {
				for _, stock := range poolStocks {
					symbolSources[stock.Symbol] = append(symbolSources[stock.Symbol], "ai500")
				}
			}
		}

		// AI100 support in mixed mode
		if stockSource.UseAI100 {
			ai100Stocks, err := e.getAI100Stocks(stockSource.AI100Limit)
			if err != nil {
				logger.Infof("⚠️  Failed to get AI100 pool: %v", err)
			} else {
				for _, stock := range ai100Stocks {
					symbolSources[stock.Symbol] = append(symbolSources[stock.Symbol], "ai100")
				}
			}
		}

		if stockSource.UseOITop {
			oiStocks, err := e.getOITopStocks(stockSource.OITopLimit)
			if err != nil {
				logger.Infof("⚠️  Failed to get OI Top: %v", err)
			} else {
				for _, stock := range oiStocks {
					symbolSources[stock.Symbol] = append(symbolSources[stock.Symbol], "oi_top")
				}
			}
		}

		if stockSource.UseMoversTop {
			moversStocks, err := e.getTopWinnersStocks(stockSource.MoversTopLimit)
			if err != nil {
				logger.Infof("⚠️  Failed to get Top Winners: %v", err)
			} else {
				for _, stock := range moversStocks {
					symbolSources[stock.Symbol] = append(symbolSources[stock.Symbol], "top_winners")
				}
			}
		}

		if stockSource.UseTopLosers {
			losersStocks, err := e.getTopLosersStocks(stockSource.TopLosersLimit)
			if err != nil {
				logger.Infof("⚠️  Failed to get Top Losers: %v", err)
			} else {
				for _, stock := range losersStocks {
					symbolSources[stock.Symbol] = append(symbolSources[stock.Symbol], "top_losers")
				}
			}
		}

		// Support both StaticStocks (new stock trading) and StaticCoins (legacy crypto)
		mixedStaticSymbols := stockSource.StaticStocks
		if len(mixedStaticSymbols) == 0 {
			mixedStaticSymbols = stockSource.StaticCoins // fallback to legacy field
		}
		for _, symbol := range mixedStaticSymbols {
			symbol = market.Normalize(symbol)
			if _, exists := symbolSources[symbol]; !exists {
				symbolSources[symbol] = []string{"static"}
			} else {
				symbolSources[symbol] = append(symbolSources[symbol], "static")
			}
		}

		for symbol, sources := range symbolSources {
			candidates = append(candidates, CandidateStock{
				Symbol:  symbol,
				Sources: sources,
			})
		}
		return candidates, nil

	default:
		return nil, fmt.Errorf("unknown stock source type: %s", stockSource.SourceType)
	}
}

func (e *StrategyEngine) getStockPoolStocks(limit int) ([]CandidateStock, error) {
	if limit <= 0 {
		limit = 30
	}

	symbols, err := provider.GetTopRatedCoins(limit)
	if err != nil {
		return nil, err
	}

	var candidates []CandidateStock
	for _, symbol := range symbols {
		candidates = append(candidates, CandidateStock{
			Symbol:  symbol,
			Sources: []string{"ai500"},
		})
	}
	return candidates, nil
}

func (e *StrategyEngine) getAI100Stocks(limit int) ([]CandidateStock, error) {
	if limit <= 0 {
		limit = 10
	}

	// Set AI100 API URL if configured
	stockSource := e.config.CoinSource
	if stockSource.AI100APIURL != "" {
		provider.SetAI100API(stockSource.AI100APIURL)
	}

	symbols, err := provider.GetAI100TopStocks(limit)
	if err != nil {
		return nil, err
	}

	var candidates []CandidateStock
	for _, symbol := range symbols {
		candidates = append(candidates, CandidateStock{
			Symbol:  symbol,
			Sources: []string{"ai100"},
		})
	}
	return candidates, nil
}

func (e *StrategyEngine) getOITopStocks(limit int) ([]CandidateStock, error) {
	if limit <= 0 {
		limit = 20
	}

	// Set OI Top API URL if configured
	stockSource := e.config.CoinSource
	if stockSource.OITopAPIURL != "" {
		provider.SetOITopAPI(stockSource.OITopAPIURL)
	}

	positions, err := provider.GetOITopPositions()
	if err != nil {
		return nil, err
	}

	var candidates []CandidateStock
	for _, pos := range positions {
		candidates = append(candidates, CandidateStock{
			Symbol:  market.Normalize(pos.Symbol),
			Sources: []string{"oi_top"},
		})
	}

	// limit symbols
	if len(candidates) > limit {
		candidates = candidates[:limit]
	}

	return candidates, nil
}

func (e *StrategyEngine) getTopWinnersStocks(limit int) ([]CandidateStock, error) {
	if limit <= 0 {
		limit = 100
	}

	// Set Top Winners API URL if configured
	stockSource := e.config.CoinSource
	if stockSource.MoversTopAPIURL != "" {
		provider.SetTopWinnersAPI(stockSource.MoversTopAPIURL)
	}

	symbols, err := provider.GetTopWinnersStocks(limit)
	if err != nil {
		return nil, err
	}

	var candidates []CandidateStock
	for _, symbol := range symbols {
		candidates = append(candidates, CandidateStock{
			Symbol:  symbol,
			Sources: []string{"top_winners"},
		})
	}
	return candidates, nil
}

func (e *StrategyEngine) getTopLosersStocks(limit int) ([]CandidateStock, error) {
	if limit <= 0 {
		limit = 100
	}

	// Set Top Losers API URL if configured
	stockSource := e.config.CoinSource
	if stockSource.TopLosersAPIURL != "" {
		provider.SetTopLosersAPI(stockSource.TopLosersAPIURL)
	}

	symbols, err := provider.GetTopLosersStocks(limit)
	if err != nil {
		return nil, err
	}

	var candidates []CandidateStock
	for _, symbol := range symbols {
		candidates = append(candidates, CandidateStock{
			Symbol:  symbol,
			Sources: []string{"top_losers"},
		})
	}
	return candidates, nil
}

// Deprecated: Use getTopWinnersStocks instead
func (e *StrategyEngine) getMoversTopStocks(limit int) ([]CandidateStock, error) {
	return e.getTopWinnersStocks(limit)
}

// ============================================================================
// External & Quant Data
// ============================================================================

// FetchMarketData fetches market data based on strategy configuration
func (e *StrategyEngine) FetchMarketData(symbol string) (*market.Data, error) {
	return market.Get(symbol)
}

// FetchExternalData fetches external data sources
func (e *StrategyEngine) FetchExternalData() (map[string]interface{}, error) {
	externalData := make(map[string]interface{})

	for _, source := range e.config.Indicators.ExternalDataSources {
		data, err := e.fetchSingleExternalSource(source)
		if err != nil {
			logger.Infof("⚠️  Failed to fetch external data source [%s]: %v", source.Name, err)
			continue
		}
		externalData[source.Name] = data
	}

	return externalData, nil
}

func (e *StrategyEngine) fetchSingleExternalSource(source store.ExternalDataSource) (interface{}, error) {
	// SSRF Protection: Validate URL before making request
	if err := security.ValidateURL(source.URL); err != nil {
		return nil, fmt.Errorf("external source URL validation failed: %w", err)
	}

	timeout := time.Duration(source.RefreshSecs) * time.Second
	if timeout == 0 {
		timeout = 30 * time.Second
	}

	// Use SSRF-safe HTTP client
	client := security.SafeHTTPClient(timeout)

	req, err := http.NewRequest(source.Method, source.URL, nil)
	if err != nil {
		return nil, err
	}

	for k, v := range source.Headers {
		req.Header.Set(k, v)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	if source.DataPath != "" {
		result = extractJSONPath(result, source.DataPath)
	}

	return result, nil
}

func extractJSONPath(data interface{}, path string) interface{} {
	parts := strings.Split(path, ".")
	current := data

	for _, part := range parts {
		if m, ok := current.(map[string]interface{}); ok {
			current = m[part]
		} else {
			return nil
		}
	}

	return current
}

// FetchQuantData fetches quantitative data for a single stock
func (e *StrategyEngine) FetchQuantData(symbol string) (*QuantData, error) {
	if !e.config.Indicators.EnableQuantData || e.config.Indicators.QuantDataAPIURL == "" {
		return nil, nil
	}

	apiURL := e.config.Indicators.QuantDataAPIURL
	url := strings.Replace(apiURL, "{symbol}", symbol, -1)

	// SSRF Protection: Validate URL before making request
	resp, err := security.SafeGet(url, 10*time.Second)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var apiResp struct {
		Code int        `json:"code"`
		Data *QuantData `json:"data"`
	}

	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	if apiResp.Code != 0 {
		return nil, fmt.Errorf("API returned error code: %d", apiResp.Code)
	}

	return apiResp.Data, nil
}

// FetchQuantDataBatch batch fetches quantitative data
func (e *StrategyEngine) FetchQuantDataBatch(symbols []string) map[string]*QuantData {
	result := make(map[string]*QuantData)

	if !e.config.Indicators.EnableQuantData || e.config.Indicators.QuantDataAPIURL == "" {
		return result
	}

	for _, symbol := range symbols {
		data, err := e.FetchQuantData(symbol)
		if err != nil {
			logger.Infof("⚠️  Failed to fetch quantitative data for %s: %v", symbol, err)
			continue
		}
		if data != nil {
			result[symbol] = data
		}
	}

	return result
}

// FetchOIRankingData fetches market-wide OI ranking data
func (e *StrategyEngine) FetchOIRankingData() *provider.OIRankingData {
	indicators := e.config.Indicators
	if !indicators.EnableOIRanking {
		return nil
	}

	baseURL := indicators.OIRankingAPIURL
	if baseURL == "" {
		baseURL = "http://172.22.189.252:30006"
	}

	// Get auth key from existing API URL or use default
	authKey := "cm_568c67eae410d912c54c"
	if indicators.QuantDataAPIURL != "" {
		if idx := strings.Index(indicators.QuantDataAPIURL, "auth="); idx != -1 {
			authKey = indicators.QuantDataAPIURL[idx+5:]
			if ampIdx := strings.Index(authKey, "&"); ampIdx != -1 {
				authKey = authKey[:ampIdx]
			}
		}
	}

	duration := indicators.OIRankingDuration
	if duration == "" {
		duration = "1h"
	}

	limit := indicators.OIRankingLimit
	if limit <= 0 {
		limit = 10
	}

	logger.Infof("📊 Fetching OI ranking data (duration: %s, limit: %d)", duration, limit)

	data, err := provider.GetOIRankingData(baseURL, authKey, duration, limit)
	if err != nil {
		logger.Warnf("⚠️  Failed to fetch OI ranking data: %v", err)
		return nil
	}

	logger.Infof("✓ OI ranking data ready: %d top, %d low positions",
		len(data.TopPositions), len(data.LowPositions))

	return data
}

// ============================================================================
// Prompt Building - System Prompt
// ============================================================================

// BuildSystemPrompt builds System Prompt according to strategy configuration
func (e *StrategyEngine) BuildSystemPrompt(accountEquity float64, variant string) string {
	var sb strings.Builder
	riskControl := e.config.RiskControl
	promptSections := e.config.PromptSections
	indicators := e.config.Indicators

	// 1. Role definition (editable)
	if promptSections.RoleDefinition != "" {
		sb.WriteString(promptSections.RoleDefinition)
		sb.WriteString("\n\n")
	} else {
		sb.WriteString("# You are a professional stock trading AI\n\n")
		sb.WriteString("Your task is to make trading decisions based on provided market data.\n\n")
	}

	// 2. Trading mode variant
	switch strings.ToLower(strings.TrimSpace(variant)) {
	case "aggressive":
		sb.WriteString("## Mode: Aggressive\n- Prioritize capturing trend breakouts, can build positions in batches when confidence ≥ 70\n- Allow higher positions, but must strictly set stop-loss and explain risk-reward ratio\n\n")
	case "conservative":
		sb.WriteString("## Mode: Conservative\n- Only open positions when multiple signals resonate\n- Prioritize cash preservation, must pause for multiple periods after consecutive losses\n\n")
	case "scalping":
		sb.WriteString("## Mode: Scalping\n- Focus on short-term momentum, smaller profit targets but require quick action\n- If price doesn't move as expected within two bars, immediately reduce position or stop-loss\n\n")
	}

	// 3. Hard constraints (risk control)
	largeCapPosValueRatio := riskControl.LargeCapMaxPositionValueRatio
	if largeCapPosValueRatio <= 0 {
		largeCapPosValueRatio = 5.0
	}
	smallCapPosValueRatio := riskControl.SmallCapMaxPositionValueRatio
	if smallCapPosValueRatio <= 0 {
		smallCapPosValueRatio = 1.0
	}

	sb.WriteString("# Hard Constraints (Risk Control)\n\n")
	sb.WriteString("## CODE ENFORCED (Backend validation, cannot be bypassed):\n")
	sb.WriteString(fmt.Sprintf("- Max Positions: %d stocks simultaneously\n", riskControl.MaxPositions))
	sb.WriteString(fmt.Sprintf("- Position Value Limit (Small Caps): max %.0f USD (= equity %.0f × %.1fx)\n",
		accountEquity*smallCapPosValueRatio, accountEquity, smallCapPosValueRatio))
	sb.WriteString(fmt.Sprintf("- Position Value Limit (Large Cap): max %.0f USD (= equity %.0f × %.1fx)\n",
		accountEquity*largeCapPosValueRatio, accountEquity, largeCapPosValueRatio))
	sb.WriteString(fmt.Sprintf("- Max Margin Usage: ≤%.0f%%\n", riskControl.MaxMarginUsage*100))
	sb.WriteString(fmt.Sprintf("- Min Position Size: ≥%.0f USD\n\n", riskControl.MinPositionSize))

	sb.WriteString("## AI GUIDED (Recommended, you should follow):\n")
	sb.WriteString(fmt.Sprintf("- Trading Leverage: Small Caps max %dx | Large Cap max %dx\n",
		riskControl.SmallCapMaxMargin, riskControl.LargeCapMaxMargin))
	sb.WriteString(fmt.Sprintf("- Risk-Reward Ratio: ≥1:%.1f (take_profit / stop_loss)\n", riskControl.MinRiskRewardRatio))
	sb.WriteString(fmt.Sprintf("- Min Confidence: ≥%d to open position\n\n", riskControl.MinConfidence))

	// Position sizing guidance
	sb.WriteString("## Position Sizing Guidance\n")
	sb.WriteString("Calculate `position_size_usd` based on your confidence and the Position Value Limits above:\n")
	sb.WriteString("- High confidence (≥85): Use 80-100%% of max position value limit\n")
	sb.WriteString("- Medium confidence (70-84): Use 50-80%% of max position value limit\n")
	sb.WriteString("- Low confidence (60-69): Use 30-50%% of max position value limit\n")
	sb.WriteString(fmt.Sprintf("- Example: With equity %.0f and Large Cap ratio %.1fx, max is %.0f USD\n",
		accountEquity, largeCapPosValueRatio, accountEquity*largeCapPosValueRatio))
	sb.WriteString("- **DO NOT** just use available_balance as position_size_usd. Use the Position Value Limits!\n\n")

	// 4. Trading frequency (editable)
	if promptSections.TradingFrequency != "" {
		sb.WriteString(promptSections.TradingFrequency)
		sb.WriteString("\n\n")
	} else {
		sb.WriteString("# ⏱️ Trading Frequency Awareness\n\n")
		sb.WriteString("- Excellent traders: 2-4 trades/day ≈ 0.1-0.2 trades/hour\n")
		sb.WriteString("- >2 trades/hour = Overtrading\n")
		sb.WriteString("- Single position hold time ≥ 30-60 minutes\n")
		sb.WriteString("If you find yourself trading every period → standards too low; if closing positions < 30 minutes → too impatient.\n\n")
	}

	// 5. Entry standards (editable)
	if promptSections.EntryStandards != "" {
		sb.WriteString(promptSections.EntryStandards)
		sb.WriteString("\n\nYou have the following indicator data:\n")
		e.writeAvailableIndicators(&sb)
		sb.WriteString(fmt.Sprintf("\n**Confidence ≥ %d** required to open positions.\n\n", riskControl.MinConfidence))
	} else {
		sb.WriteString("# 🎯 Entry Standards (Strict)\n\n")
		sb.WriteString("Only open positions when multiple signals resonate. You have:\n")
		e.writeAvailableIndicators(&sb)
		sb.WriteString(fmt.Sprintf("\nFeel free to use any effective analysis method, but **confidence ≥ %d** required to open positions; avoid low-quality behaviors such as single indicators, contradictory signals, sideways consolidation, reopening immediately after closing, etc.\n\n", riskControl.MinConfidence))
	}

	// 6. Decision process (editable)
	if promptSections.DecisionProcess != "" {
		sb.WriteString(promptSections.DecisionProcess)
		sb.WriteString("\n\n")
	} else {
		sb.WriteString("# 📋 Decision Process\n\n")
		sb.WriteString("1. Check positions → Should we take profit/stop-loss\n")
		sb.WriteString("2. Scan candidate stocks + multi-timeframe → Are there strong signals\n")
		sb.WriteString("3. Write chain of thought first, then output structured JSON\n\n")
	}

	// 7. Output format - CRITICAL: Must use exact XML tags
	sb.WriteString("# ⚠️ OUTPUT FORMAT (CRITICAL - MUST FOLLOW EXACTLY)\n\n")
	sb.WriteString("**YOUR RESPONSE MUST START WITH `<reasoning>` TAG AND END WITH `</decision>` TAG**\n\n")
	sb.WriteString("## MANDATORY Structure (Copy This Exactly):\n\n")
	sb.WriteString("```\n")
	sb.WriteString("<reasoning>\n")
	sb.WriteString("## Chain of Thought Analysis\n\n")
	sb.WriteString("### 1. Account & Risk Assessment\n")
	sb.WriteString("- Current equity: $XXX\n")
	sb.WriteString("- Available margin: $XXX\n")
	sb.WriteString("- Open positions: X\n\n")
	sb.WriteString("### 2. Stock-by-Stock Analysis\n")
	sb.WriteString("For each candidate stock, analyze:\n")
	sb.WriteString("- **SYMBOL**: Price action, trend direction, key levels\n")
	sb.WriteString("- Indicators: RSI, MACD, Volume signals\n")
	sb.WriteString("- Decision: BUY/SELL/WAIT and why\n\n")
	sb.WriteString("### 3. Final Decision Summary\n")
	sb.WriteString("- Selected trades and reasoning\n")
	sb.WriteString("</reasoning>\n\n")
	sb.WriteString("<decision>\n")
	sb.WriteString("```json\n")
	sb.WriteString("[{\"symbol\": \"XXX\", \"action\": \"wait\"}]\n")
	sb.WriteString("```\n")
	sb.WriteString("</decision>\n")
	sb.WriteString("```\n\n")
	sb.WriteString("## ⚠️ PARSING RULES (FAILURE = REJECTED RESPONSE)\n\n")
	sb.WriteString("1. **FIRST LINE** of your response MUST be exactly: `<reasoning>`\n")
	sb.WriteString("2. **LAST LINES** MUST be: `</decision>` (with JSON inside)\n")
	sb.WriteString("3. **NO TEXT** before `<reasoning>` or after `</decision>`\n")
	sb.WriteString("4. **JSON MUST** be inside ```json code fence within `<decision>` tags\n\n")
	sb.WriteString("## JSON Decision Array Format:\n\n")
	sb.WriteString("```json\n[\n")
	// Use the actual configured position value ratio for Large Cap in the example
	examplePositionSize := accountEquity * largeCapPosValueRatio
	sb.WriteString(fmt.Sprintf("  {\"symbol\": \"AAPL\", \"action\": \"open_short\", \"leverage\": %d, \"position_size_usd\": %.0f, \"stop_loss\": 97000, \"take_profit\": 91000, \"confidence\": 85, \"risk_usd\": 300},\n",
		riskControl.LargeCapMaxMargin, examplePositionSize))
	sb.WriteString("  {\"symbol\": \"MSFT\", \"action\": \"close_long\"},\n")
	sb.WriteString("  {\"symbol\": \"GOOGL\", \"action\": \"wait\"}\n")
	sb.WriteString("]\n```\n\n")
	sb.WriteString("## Field Description\n\n")
	sb.WriteString("- `action`: open_long | open_short | close_long | close_short | hold | wait\n")
	sb.WriteString(fmt.Sprintf("- `confidence`: 0-100 (opening recommended ≥ %d)\n", riskControl.MinConfidence))
	sb.WriteString("- Required when opening: leverage, position_size_usd, stop_loss, take_profit, confidence, risk_usd\n")
	sb.WriteString("- **IMPORTANT**: All numeric values must be calculated numbers, NOT formulas/expressions (e.g., use `27.76` not `3000 * 0.01`)\n\n")

	// 8. Multi-Timeframe Confluence Instructions
	if indicators.EnableConfluence {
		sb.WriteString("# 🛡️ Multi-Timeframe Confluence Engine (CRITICAL)\n\n")
		sb.WriteString("You are in **Confluence Mode**. You MUST check signals across all provided timeframes before opening or closing positions.\n")
		if indicators.ConfluenceRequireAll {
			sb.WriteString(fmt.Sprintf("- **STRICT REQUIREMENT**: Every single selected timeframe (%s) MUST show the same trend direction and signal resonance. If they do not align, output `wait` for that symbol.\n",
				strings.Join(indicators.ConfluenceTimeframes, ", ")))
		} else {
			minMatch := indicators.ConfluenceMinMatch
			if minMatch <= 0 {
				minMatch = 2
			}
			sb.WriteString(fmt.Sprintf("- **CONFLUENCE REQUIREMENT**: At least %d out of %d timeframes (%s) MUST align. If fewer than %d timeframes agree, output `wait` for that symbol.\n",
				minMatch, len(indicators.ConfluenceTimeframes), strings.Join(indicators.ConfluenceTimeframes, ", "), minMatch))
		}
		sb.WriteString("- Analyze the 'trend alignment' between short-term (e.g., 5m/15m) and higher-term (e.g., 1h/4h) structures.\n")
		sb.WriteString("- Trade only in the direction of the macro trend if confluence is present.\n\n")
	}

	// 8.5. VWAP + Slope & Stretch Algorithm (Tier 1)
	if indicators.EnableVWAPSlopeStretch {
		sb.WriteString("# 📈 VWAP + Slope & Stretch Algorithm (CRITICAL - Tier 1)\n\n")
		sb.WriteString("**This algorithm is ACTIVE. You MUST apply these entry conditions before opening ANY position.**\n\n")

		// Get entry time with default
		entryTime := indicators.VWAPEntryTime
		if entryTime == "" {
			entryTime = "10:00"
		}

		// Fetch sell_trigger values from AI100 API
		ai100Client := market.GetAI100Client()
		sellTriggers, _ := ai100Client.FetchSellTriggers()

		sb.WriteString(fmt.Sprintf("## Entry Time: %s AM ET\n\n", entryTime))

		sb.WriteString("## Entry Conditions (ALL must be TRUE to open a LONG position):\n")
		sb.WriteString(fmt.Sprintf("1. **Price @ %s AM > VWAP**: Current price must be ABOVE VWAP\n", entryTime))
		sb.WriteString(fmt.Sprintf("2. **VWAP Slope Positive**: VWAP is trending UP (VWAP @ %s AM > VWAP @ 9:40 AM)\n", entryTime))
		sb.WriteString("3. **Stretch Filter**: Price not overextended (Stretch < 0.5 × OR_Volatility)\n")
		sb.WriteString("4. **Momentum Filter**: Sufficient momentum from open (Momentum > 0.25 × OR_Volatility)\n\n")

		sb.WriteString("## Key Metrics to Calculate:\n")
		sb.WriteString(fmt.Sprintf("- **VWAP**: Volume Weighted Average Price from 9:30 AM to %s AM\n", entryTime))
		sb.WriteString(fmt.Sprintf("- **VWAP Slope** = (VWAP @ %s AM - VWAP @ 9:40 AM) / VWAP @ 9:40 AM\n", entryTime))
		sb.WriteString("- **VWAP Stretch** = (Current_Price - VWAP) / VWAP\n")
		sb.WriteString("- **OR Volatility** = max(OR_High - VWAP, VWAP - OR_Low) / VWAP (Opening Range: 9:30-10:00 AM)\n")
		sb.WriteString(fmt.Sprintf("- **Momentum** = (Price @ %s AM - Open) / Open\n\n", entryTime))

		sb.WriteString("## Exit Rules:\n")
		sb.WriteString("- **Take Profit**: Use the stock-specific sell_trigger % from the table below\n")
		sb.WriteString("- **Stop Loss**: Day's Open Price (protection)\n")
		sb.WriteString("- **Time Exit**: Close position by 3:55 PM ET if neither TP nor SL hit\n\n")

		// Write sell_trigger table for candidate stocks
		if len(sellTriggers) > 0 {
			sb.WriteString("## Stock-Specific Take Profit Targets (from AI100 optimization):\n")
			sb.WriteString("| Symbol | Take Profit % |\n")
			sb.WriteString("|--------|---------------|\n")
			for symbol, trigger := range sellTriggers {
				sb.WriteString(fmt.Sprintf("| %s | %.2f%% |\n", symbol, trigger))
			}
			sb.WriteString("\n")
		}

		sb.WriteString("## IMPORTANT:\n")
		sb.WriteString("- If ANY entry condition fails, output `wait` for that symbol\n")
		sb.WriteString("- In your reasoning, explicitly state each condition check result\n")
		sb.WriteString("- This is a MOMENTUM strategy - buy when trending UP above VWAP\n\n")
	}

	// 9. Custom Prompt
	if e.config.CustomPrompt != "" {
		sb.WriteString("# 📌 Personalized Trading Strategy\n\n")
		sb.WriteString(e.config.CustomPrompt)
		sb.WriteString("\n\n")
		sb.WriteString("Note: The above personalized strategy is a supplement to the basic rules and cannot violate the basic risk control principles.\n")
	}

	return sb.String()
}

func (e *StrategyEngine) writeAvailableIndicators(sb *strings.Builder) {
	indicators := e.config.Indicators
	kline := indicators.Klines

	sb.WriteString(fmt.Sprintf("- %s price series", kline.PrimaryTimeframe))
	if kline.EnableMultiTimeframe {
		sb.WriteString(fmt.Sprintf(" + %s K-line series\n", kline.LongerTimeframe))
	} else {
		sb.WriteString("\n")
	}

	if indicators.EnableEMA {
		sb.WriteString("- EMA indicators")
		if len(indicators.EMAPeriods) > 0 {
			sb.WriteString(fmt.Sprintf(" (periods: %v)", indicators.EMAPeriods))
		}
		sb.WriteString("\n")
	}

	if indicators.EnableMACD {
		sb.WriteString("- MACD indicators\n")
	}

	if indicators.EnableRSI {
		sb.WriteString("- RSI indicators")
		if len(indicators.RSIPeriods) > 0 {
			sb.WriteString(fmt.Sprintf(" (periods: %v)", indicators.RSIPeriods))
		}
		sb.WriteString("\n")
	}

	if indicators.EnableATR {
		sb.WriteString("- ATR indicators")
		if len(indicators.ATRPeriods) > 0 {
			sb.WriteString(fmt.Sprintf(" (periods: %v)", indicators.ATRPeriods))
		}
		sb.WriteString("\n")
	}

	if indicators.EnableVolume {
		sb.WriteString("- Volume data\n")
	}

	if indicators.EnableOI {
		sb.WriteString("- Open Interest (OI) data\n")
	}

	if indicators.EnableFundingRate {
		sb.WriteString("- Funding rate\n")
	}

	if len(e.config.CoinSource.StaticCoins) > 0 || e.config.CoinSource.UseStockPool || e.config.CoinSource.UseOITop {
		sb.WriteString("- AI500 / OI_Top filter tags (if available)\n")
	}

	if indicators.EnableQuantData {
		sb.WriteString("- Quantitative data (institutional/retail fund flow, position changes, multi-period price changes)\n")
	}

	// VWAP indicators
	if indicators.EnableVWAPIndicator {
		sb.WriteString("- VWAP (Volume Weighted Average Price) series\n")
	}

	// Volume Profile
	if indicators.EnableVolumeProfile {
		bins := indicators.VolumeProfileBins
		if bins <= 0 {
			bins = 24
		}
		sb.WriteString(fmt.Sprintf("- Volume Profile (%d price levels)\n", bins))
	}

	// Stock-specific indicators
	if indicators.EnableStockNews {
		sb.WriteString("- Stock news & sentiment\n")
	}

	if indicators.EnableCorporateActions {
		sb.WriteString("- Corporate actions (dividends, splits, etc.)\n")
	}

	if indicators.EnableVolumeSurge {
		sb.WriteString("- Volume surge detection (2x+ average)\n")
	}

	if indicators.EnableAnalystRatings {
		sb.WriteString("- Analyst ratings & price targets\n")
	}

	if indicators.EnableEarnings {
		sb.WriteString("- Earnings calendar (upcoming earnings dates & estimates)\n")
	}

	if indicators.EnableShortInterest {
		sb.WriteString("- Short interest & squeeze risk\n")
	}

	if indicators.EnableZeroDTE {
		sb.WriteString("- Zero DTE options sentiment (put/call ratio, max pain)\n")
	}

	if indicators.EnableTradeFlow {
		sb.WriteString("- Trade flow analysis (institutional buy/sell activity)\n")
	}

	if indicators.EnableAnchoredVWAP {
		sb.WriteString("- Session-anchored VWAP (from 9:30 AM ET market open)\n")
	}

	if indicators.EnableConfluence {
		mode := "Relaxed"
		if indicators.ConfluenceRequireAll {
			mode = "Strict"
		}
		sb.WriteString(fmt.Sprintf("- Multi-Timeframe Confluence Engine (%s Mode: %v)\n",
			mode, indicators.ConfluenceTimeframes))
	}

	if indicators.EnableVWAPSlopeStretch {
		entryTime := indicators.VWAPEntryTime
		if entryTime == "" {
			entryTime = "10:00"
		}
		sb.WriteString(fmt.Sprintf("- **VWAP + Slope & Stretch Algorithm** (Entry: %s AM ET) - Tier 1 Entry Filter\n", entryTime))
	}
}

// ============================================================================
// Prompt Building - User Prompt
// ============================================================================

// BuildUserPrompt builds User Prompt based on strategy configuration
func (e *StrategyEngine) BuildUserPrompt(ctx *Context) string {
	var sb strings.Builder

	// System status
	sb.WriteString(fmt.Sprintf("Time: %s | Period: #%d | Runtime: %d minutes\n\n",
		ctx.CurrentTime, ctx.CallCount, ctx.RuntimeMinutes))

	// Market Reference (SPY)
	if spyData, hasSPY := ctx.MarketDataMap["SPY"]; hasSPY {
		sb.WriteString(fmt.Sprintf("SPY: %.2f (1h: %+.2f%%, 4h: %+.2f%%) | MACD: %.4f | RSI: %.2f\n\n",
			spyData.CurrentPrice, spyData.PriceChange1h, spyData.PriceChange4h,
			spyData.CurrentMACD, spyData.CurrentRSI7))
	}

	// Account information
	sb.WriteString(fmt.Sprintf("Account: Equity %.2f | Balance %.2f (%.1f%%) | PnL %+.2f%% | Margin %.1f%% | Positions %d\n\n",
		ctx.Account.TotalEquity,
		ctx.Account.AvailableBalance,
		(ctx.Account.AvailableBalance/ctx.Account.TotalEquity)*100,
		ctx.Account.TotalPnLPct,
		ctx.Account.MarginUsedPct,
		ctx.Account.PositionCount))

	// Recently completed orders (placed before positions to ensure visibility)
	if len(ctx.RecentOrders) > 0 {
		sb.WriteString("## Recent Completed Trades\n")
		for i, order := range ctx.RecentOrders {
			resultStr := "Profit"
			if order.RealizedPnL < 0 {
				resultStr = "Loss"
			}
			sb.WriteString(fmt.Sprintf("%d. %s %s | Entry %.4f Exit %.4f | %s: %+.2f USD (%+.2f%%) | %s→%s (%s)\n",
				i+1, order.Symbol, order.Side,
				order.EntryPrice, order.ExitPrice,
				resultStr, order.RealizedPnL, order.PnLPct,
				order.EntryTime, order.ExitTime, order.HoldDuration))
		}
		sb.WriteString("\n")
	}

	// Position information
	if len(ctx.Positions) > 0 {
		sb.WriteString("## Current Positions\n")
		for i, pos := range ctx.Positions {
			sb.WriteString(e.formatPositionInfo(i+1, pos, ctx))
		}
	} else {
		sb.WriteString("Current Positions: None\n\n")
	}

	// Candidate stocks
	stocksWithData := 0
	stocksWithoutData := 0
	for _, stock := range ctx.CandidateStocks {
		if _, hasData := ctx.MarketDataMap[stock.Symbol]; hasData {
			stocksWithData++
		} else {
			stocksWithoutData++
		}
	}

	sb.WriteString(fmt.Sprintf("## Candidate Stocks (%d configured, %d with market data)\n\n", len(ctx.CandidateStocks), stocksWithData))

	displayedCount := 0
	// First, show stocks WITH market data
	for _, stock := range ctx.CandidateStocks {
		marketData, hasData := ctx.MarketDataMap[stock.Symbol]
		if !hasData {
			continue
		}
		displayedCount++

		sourceTags := e.formatStockSourceTag(stock.Sources)
		sb.WriteString(fmt.Sprintf("### %d. %s%s\n\n", displayedCount, stock.Symbol, sourceTags))
		sb.WriteString(e.formatMarketData(marketData))

		if ctx.QuantDataMap != nil {
			if quantData, hasQuant := ctx.QuantDataMap[stock.Symbol]; hasQuant {
				sb.WriteString(e.formatQuantData(quantData))
			}
		}
		sb.WriteString("\n")
	}

	// Then, list stocks WITHOUT market data (so AI knows about them)
	if stocksWithoutData > 0 {
		sb.WriteString("### Stocks Pending Market Data:\n")
		for _, stock := range ctx.CandidateStocks {
			if _, hasData := ctx.MarketDataMap[stock.Symbol]; !hasData {
				sourceTags := e.formatStockSourceTag(stock.Sources)
				sb.WriteString(fmt.Sprintf("- %s%s (market data unavailable)\n", stock.Symbol, sourceTags))
			}
		}
		sb.WriteString("\n")
	}
	sb.WriteString("\n")

	// OI Ranking data (market-wide open interest changes)
	if ctx.OIRankingData != nil {
		sb.WriteString(provider.FormatOIRankingForAI(ctx.OIRankingData))
	}

	sb.WriteString("---\n\n")
	sb.WriteString("## 🚨 FINAL REMINDER - OUTPUT FORMAT\n\n")
	sb.WriteString("Your response MUST follow this EXACT structure:\n\n")
	sb.WriteString("1. Start with `<reasoning>` (no text before it)\n")
	sb.WriteString("2. Write detailed Chain of Thought analysis for each stock\n")
	sb.WriteString("3. Close with `</reasoning>`\n")
	sb.WriteString("4. Open `<decision>` tag\n")
	sb.WriteString("5. Write JSON array inside ```json code fence\n")
	sb.WriteString("6. Close with `</decision>` (no text after it)\n\n")
	sb.WriteString("**BEGIN YOUR RESPONSE WITH `<reasoning>` NOW:**\n")

	return sb.String()
}

func (e *StrategyEngine) formatPositionInfo(index int, pos PositionInfo, ctx *Context) string {
	var sb strings.Builder

	holdingDuration := ""
	if pos.UpdateTime > 0 {
		durationMs := time.Now().UnixMilli() - pos.UpdateTime
		durationMin := durationMs / (1000 * 60)
		if durationMin < 60 {
			holdingDuration = fmt.Sprintf(" | Holding Duration %d min", durationMin)
		} else {
			durationHour := durationMin / 60
			durationMinRemainder := durationMin % 60
			holdingDuration = fmt.Sprintf(" | Holding Duration %dh %dm", durationHour, durationMinRemainder)
		}
	}

	positionValue := pos.Quantity * pos.MarkPrice
	if positionValue < 0 {
		positionValue = -positionValue
	}

	sb.WriteString(fmt.Sprintf("%d. %s %s | Entry %.4f Current %.4f | Qty %.4f | Position Value %.2f USD | PnL%+.2f%% | PnL Amount%+.2f USD | Peak PnL%.2f%% | Leverage %dx | Margin %.0f | Liq Price %.4f%s\n\n",
		index, pos.Symbol, strings.ToUpper(pos.Side),
		pos.EntryPrice, pos.MarkPrice, pos.Quantity, positionValue, pos.UnrealizedPnLPct, pos.UnrealizedPnL, pos.PeakPnLPct,
		pos.Leverage, pos.MarginUsed, pos.LiquidationPrice, holdingDuration))

	if marketData, ok := ctx.MarketDataMap[pos.Symbol]; ok {
		sb.WriteString(e.formatMarketData(marketData))

		if ctx.QuantDataMap != nil {
			if quantData, hasQuant := ctx.QuantDataMap[pos.Symbol]; hasQuant {
				sb.WriteString(e.formatQuantData(quantData))
			}
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

func (e *StrategyEngine) formatStockSourceTag(sources []string) string {
	if len(sources) > 1 {
		return " (AI500+OI_Top dual signal)"
	} else if len(sources) == 1 {
		switch sources[0] {
		case "ai500":
			return " (AI500)"
		case "oi_top":
			return " (OI_Top position growth)"
		case "static":
			return " (Manual selection)"
		}
	}
	return ""
}

// ============================================================================
// Market Data Formatting
// ============================================================================

func (e *StrategyEngine) formatMarketData(data *market.Data) string {
	var sb strings.Builder
	indicators := e.config.Indicators

	sb.WriteString(fmt.Sprintf("current_price = %.4f", data.CurrentPrice))

	if indicators.EnableEMA {
		sb.WriteString(fmt.Sprintf(", current_ema20 = %.3f", data.CurrentEMA20))
	}

	if indicators.EnableMACD {
		sb.WriteString(fmt.Sprintf(", current_macd = %.3f", data.CurrentMACD))
	}

	if indicators.EnableRSI {
		sb.WriteString(fmt.Sprintf(", current_rsi7 = %.3f", data.CurrentRSI7))
	}

	sb.WriteString("\n\n")

	if indicators.EnableOI || indicators.EnableFundingRate {
		sb.WriteString(fmt.Sprintf("Additional data for %s:\n\n", data.Symbol))

		if indicators.EnableOI && data.OpenInterest != nil {
			sb.WriteString(fmt.Sprintf("Open Interest: Latest: %.2f Average: %.2f\n\n",
				data.OpenInterest.Latest, data.OpenInterest.Average))
		}

		if indicators.EnableFundingRate {
			sb.WriteString(fmt.Sprintf("Funding Rate: %.2e\n\n", data.FundingRate))
		}
	}

	if len(data.TimeframeData) > 0 {
		timeframeOrder := []string{"1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w"}
		for _, tf := range timeframeOrder {
			if tfData, ok := data.TimeframeData[tf]; ok {
				sb.WriteString(fmt.Sprintf("=== %s Timeframe (oldest → latest) ===\n\n", strings.ToUpper(tf)))
				e.formatTimeframeSeriesData(&sb, tfData, indicators)
			}
		}
	} else {
		// Compatible with old data format
		if data.IntradaySeries != nil {
			klineConfig := indicators.Klines
			sb.WriteString(fmt.Sprintf("Intraday series (%s intervals, oldest → latest):\n\n", klineConfig.PrimaryTimeframe))

			if len(data.IntradaySeries.MidPrices) > 0 {
				sb.WriteString(fmt.Sprintf("Mid prices: %s\n\n", formatFloatSlice(data.IntradaySeries.MidPrices)))
			}

			if indicators.EnableEMA && len(data.IntradaySeries.EMA20Values) > 0 {
				sb.WriteString(fmt.Sprintf("EMA indicators (20-period): %s\n\n", formatFloatSlice(data.IntradaySeries.EMA20Values)))
			}

			if indicators.EnableMACD && len(data.IntradaySeries.MACDValues) > 0 {
				sb.WriteString(fmt.Sprintf("MACD indicators: %s\n\n", formatFloatSlice(data.IntradaySeries.MACDValues)))
			}

			if indicators.EnableRSI {
				if len(data.IntradaySeries.RSI7Values) > 0 {
					sb.WriteString(fmt.Sprintf("RSI indicators (7-Period): %s\n\n", formatFloatSlice(data.IntradaySeries.RSI7Values)))
				}
				if len(data.IntradaySeries.RSI14Values) > 0 {
					sb.WriteString(fmt.Sprintf("RSI indicators (14-Period): %s\n\n", formatFloatSlice(data.IntradaySeries.RSI14Values)))
				}
			}

			if indicators.EnableVolume && len(data.IntradaySeries.Volume) > 0 {
				sb.WriteString(fmt.Sprintf("Volume: %s\n\n", formatFloatSlice(data.IntradaySeries.Volume)))
			}

			if indicators.EnableATR {
				sb.WriteString(fmt.Sprintf("3m ATR (14-period): %.3f\n\n", data.IntradaySeries.ATR14))
			}
		}

		if data.LongerTermContext != nil && indicators.Klines.EnableMultiTimeframe {
			sb.WriteString(fmt.Sprintf("Longer-term context (%s timeframe):\n\n", indicators.Klines.LongerTimeframe))

			if indicators.EnableEMA {
				sb.WriteString(fmt.Sprintf("20-Period EMA: %.3f vs. 50-Period EMA: %.3f\n\n",
					data.LongerTermContext.EMA20, data.LongerTermContext.EMA50))
			}

			if indicators.EnableATR {
				sb.WriteString(fmt.Sprintf("3-Period ATR: %.3f vs. 14-Period ATR: %.3f\n\n",
					data.LongerTermContext.ATR3, data.LongerTermContext.ATR14))
			}

			if indicators.EnableVolume {
				sb.WriteString(fmt.Sprintf("Current Volume: %.3f vs. Average Volume: %.3f\n\n",
					data.LongerTermContext.CurrentVolume, data.LongerTermContext.AverageVolume))
			}

			if indicators.EnableMACD && len(data.LongerTermContext.MACDValues) > 0 {
				sb.WriteString(fmt.Sprintf("MACD indicators: %s\n\n", formatFloatSlice(data.LongerTermContext.MACDValues)))
			}

			if indicators.EnableRSI && len(data.LongerTermContext.RSI14Values) > 0 {
				sb.WriteString(fmt.Sprintf("RSI indicators (14-Period): %s\n\n", formatFloatSlice(data.LongerTermContext.RSI14Values)))
			}
		}
	}

	// Stock-specific extra data (news, corporate actions, volume surge)
	if data.StockExtraData != nil {
		sb.WriteString(e.formatStockExtraDataForPrompt(data.StockExtraData, indicators))
	}

	return sb.String()
}

func (e *StrategyEngine) formatTimeframeSeriesData(sb *strings.Builder, data *market.TimeframeSeriesData, indicators store.IndicatorConfig) {
	if len(data.Klines) > 0 {
		sb.WriteString("Time(UTC)      Open      High      Low       Close     Volume\n")
		for i, k := range data.Klines {
			t := time.Unix(k.Time/1000, 0).UTC()
			timeStr := t.Format("01-02 15:04")
			marker := ""
			if i == len(data.Klines)-1 {
				marker = "  <- current"
			}
			sb.WriteString(fmt.Sprintf("%-14s %-9.4f %-9.4f %-9.4f %-9.4f %-12.2f%s\n",
				timeStr, k.Open, k.High, k.Low, k.Close, k.Volume, marker))
		}
		sb.WriteString("\n")
	} else if len(data.MidPrices) > 0 {
		sb.WriteString(fmt.Sprintf("Mid prices: %s\n\n", formatFloatSlice(data.MidPrices)))
		if indicators.EnableVolume && len(data.Volume) > 0 {
			sb.WriteString(fmt.Sprintf("Volume: %s\n\n", formatFloatSlice(data.Volume)))
		}
	}

	if indicators.EnableEMA {
		if len(data.EMA20Values) > 0 {
			sb.WriteString(fmt.Sprintf("EMA20: %s\n", formatFloatSlice(data.EMA20Values)))
		}
		if len(data.EMA50Values) > 0 {
			sb.WriteString(fmt.Sprintf("EMA50: %s\n", formatFloatSlice(data.EMA50Values)))
		}
	}

	if indicators.EnableMACD && len(data.MACDValues) > 0 {
		sb.WriteString(fmt.Sprintf("MACD: %s\n", formatFloatSlice(data.MACDValues)))
	}

	if indicators.EnableRSI {
		if len(data.RSI7Values) > 0 {
			sb.WriteString(fmt.Sprintf("RSI7: %s\n", formatFloatSlice(data.RSI7Values)))
		}
		if len(data.RSI14Values) > 0 {
			sb.WriteString(fmt.Sprintf("RSI14: %s\n", formatFloatSlice(data.RSI14Values)))
		}
	}

	if indicators.EnableATR && data.ATR14 > 0 {
		sb.WriteString(fmt.Sprintf("ATR14: %.4f\n", data.ATR14))
	}

	// VWAP indicator
	if indicators.EnableVWAPIndicator {
		if data.CurrentVWAP > 0 {
			sb.WriteString(fmt.Sprintf("Current VWAP: %.4f\n", data.CurrentVWAP))
		}
		if len(data.VWAPValues) > 0 {
			sb.WriteString(fmt.Sprintf("VWAP Series: %s\n", formatFloatSlice(data.VWAPValues)))
		}
	}

	// Volume Profile
	if indicators.EnableVolumeProfile && len(data.VolumeProfile) > 0 {
		sb.WriteString(fmt.Sprintf("Volume Profile (price levels low→high): %s\n", formatFloatSlice(data.VolumeProfile)))
	}

	sb.WriteString("\n")
}

func (e *StrategyEngine) formatStockExtraDataForPrompt(data *market.StockExtraData, indicators store.IndicatorConfig) string {
	var sb strings.Builder

	// Volume Surge Detection
	if indicators.EnableVolumeSurge && data.VolumeSurge {
		sb.WriteString(fmt.Sprintf("⚡ VOLUME SURGE DETECTED: Current Volume %.0f (%.1fx avg of %.0f)\n\n",
			data.CurrentVolume, data.VolumeRatio, data.AverageVolume))
	}

	// Analyst Ratings
	if indicators.EnableAnalystRatings && data.AnalystRating != "" {
		sb.WriteString(fmt.Sprintf("📊 Analyst Rating: %s | Target: $%.2f (Low: $%.2f, High: $%.2f)\n\n",
			data.AnalystRating, data.AnalystTargetAvg, data.AnalystTargetLow, data.AnalystTargetHigh))
	}

	// Earnings Calendar
	if indicators.EnableEarnings && data.NextEarningsDate != "" {
		timeStr := ""
		if data.EarningsTime != "" {
			timeStr = fmt.Sprintf(" (%s)", data.EarningsTime)
		}
		sb.WriteString(fmt.Sprintf("📅 Next Earnings: %s%s (%d days) | EPS Est: $%.2f\n\n",
			data.NextEarningsDate, timeStr, data.DaysUntilEarnings, data.EpsEstimate))
	}

	// Short Interest
	if indicators.EnableShortInterest && data.ShortInterest > 0 {
		sb.WriteString(fmt.Sprintf("🩳 Short Interest: %.1f%% of float | Days to Cover: %.1f | Squeeze Risk: %s\n\n",
			data.ShortInterest, data.DaysToCover, data.SqueezeRisk))
	}

	// Zero DTE Options
	if indicators.EnableZeroDTE && data.ZeroDTESentiment != "" {
		sb.WriteString(fmt.Sprintf("⏰ Zero DTE: %s | Put/Call Ratio: %.2f | Max Pain: $%.2f\n\n",
			data.ZeroDTESentiment, data.ZeroDTEPutCallRatio, data.MaxPainStrike))
	}

	// Trade Flow (Institutional)
	if indicators.EnableTradeFlow && data.TradeFlowDirection != "" {
		sb.WriteString(fmt.Sprintf("🏦 Institutional Flow: %s | Buy/Sell Ratio: %.2f | Inst. VWAP: $%.2f\n\n",
			data.TradeFlowDirection, data.BuySellRatio, data.InstitutionalVWAP))
	}

	// Anchored VWAP
	if indicators.EnableAnchoredVWAP && data.AnchoredVWAP > 0 {
		devStr := "at"
		if data.AnchoredVWAPDev > 0.5 {
			devStr = fmt.Sprintf("+%.1f%% above", data.AnchoredVWAPDev)
		} else if data.AnchoredVWAPDev < -0.5 {
			devStr = fmt.Sprintf("%.1f%% below", data.AnchoredVWAPDev)
		}
		sb.WriteString(fmt.Sprintf("📍 Session VWAP: $%.2f (Price is %s VWAP)\n\n",
			data.AnchoredVWAP, devStr))
	}

	// Recent News
	if indicators.EnableStockNews && len(data.RecentNews) > 0 {
		sb.WriteString("📰 Recent News:\n")
		for i, news := range data.RecentNews {
			sb.WriteString(fmt.Sprintf("%d. [%s] %s (%s)\n",
				i+1, news.Source, news.Headline, news.CreatedAt))
			if news.Summary != "" {
				sb.WriteString(fmt.Sprintf("   %s\n", news.Summary))
			}
		}
		sb.WriteString("\n")
	}

	// Corporate Actions
	if indicators.EnableCorporateActions && len(data.CorporateActions) > 0 {
		sb.WriteString("📋 Corporate Actions:\n")
		for _, action := range data.CorporateActions {
			sb.WriteString(fmt.Sprintf("- %s: %s (Ex-Date: %s)",
				action.Type, action.Description, action.ExDate))
			if action.CashAmount > 0 {
				sb.WriteString(fmt.Sprintf(" - $%.2f", action.CashAmount))
			}
			sb.WriteString("\n")
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

func (e *StrategyEngine) formatQuantData(data *QuantData) string {
	if data == nil {
		return ""
	}

	indicators := e.config.Indicators
	if !indicators.EnableQuantOI && !indicators.EnableQuantNetflow {
		return ""
	}

	var sb strings.Builder
	sb.WriteString("📊 Quantitative Data:\n")

	if len(data.PriceChange) > 0 {
		sb.WriteString("Price Change: ")
		timeframes := []string{"5m", "15m", "1h", "4h", "12h", "24h"}
		parts := []string{}
		for _, tf := range timeframes {
			if v, ok := data.PriceChange[tf]; ok {
				parts = append(parts, fmt.Sprintf("%s: %+.4f%%", tf, v*100))
			}
		}
		sb.WriteString(strings.Join(parts, " | "))
		sb.WriteString("\n")
	}

	if indicators.EnableQuantNetflow && data.Netflow != nil {
		sb.WriteString("Fund Flow (Netflow):\n")
		timeframes := []string{"5m", "15m", "1h", "4h", "12h", "24h"}

		if data.Netflow.Institution != nil {
			if data.Netflow.Institution.Future != nil && len(data.Netflow.Institution.Future) > 0 {
				sb.WriteString("  Institutional Futures:\n")
				for _, tf := range timeframes {
					if v, ok := data.Netflow.Institution.Future[tf]; ok {
						sb.WriteString(fmt.Sprintf("    %s: %s\n", tf, formatFlowValue(v)))
					}
				}
			}
			if data.Netflow.Institution.Spot != nil && len(data.Netflow.Institution.Spot) > 0 {
				sb.WriteString("  Institutional Spot:\n")
				for _, tf := range timeframes {
					if v, ok := data.Netflow.Institution.Spot[tf]; ok {
						sb.WriteString(fmt.Sprintf("    %s: %s\n", tf, formatFlowValue(v)))
					}
				}
			}
		}

		if data.Netflow.Personal != nil {
			if data.Netflow.Personal.Future != nil && len(data.Netflow.Personal.Future) > 0 {
				sb.WriteString("  Retail Futures:\n")
				for _, tf := range timeframes {
					if v, ok := data.Netflow.Personal.Future[tf]; ok {
						sb.WriteString(fmt.Sprintf("    %s: %s\n", tf, formatFlowValue(v)))
					}
				}
			}
			if data.Netflow.Personal.Spot != nil && len(data.Netflow.Personal.Spot) > 0 {
				sb.WriteString("  Retail Spot:\n")
				for _, tf := range timeframes {
					if v, ok := data.Netflow.Personal.Spot[tf]; ok {
						sb.WriteString(fmt.Sprintf("    %s: %s\n", tf, formatFlowValue(v)))
					}
				}
			}
		}
	}

	if indicators.EnableQuantOI && len(data.OI) > 0 {
		for exchange, oiData := range data.OI {
			if len(oiData.Delta) > 0 {
				sb.WriteString(fmt.Sprintf("Open Interest (%s):\n", exchange))
				for _, tf := range []string{"5m", "15m", "1h", "4h", "12h", "24h"} {
					if d, ok := oiData.Delta[tf]; ok {
						sb.WriteString(fmt.Sprintf("    %s: %+.4f%% (%s)\n", tf, d.OIDeltaPercent, formatFlowValue(d.OIDeltaValue)))
					}
				}
			}
		}
	}

	return sb.String()
}

func formatFlowValue(v float64) string {
	sign := ""
	if v >= 0 {
		sign = "+"
	}
	absV := v
	if absV < 0 {
		absV = -absV
	}
	if absV >= 1e9 {
		return fmt.Sprintf("%s%.2fB", sign, v/1e9)
	} else if absV >= 1e6 {
		return fmt.Sprintf("%s%.2fM", sign, v/1e6)
	} else if absV >= 1e3 {
		return fmt.Sprintf("%s%.2fK", sign, v/1e3)
	}
	return fmt.Sprintf("%s%.2f", sign, v)
}

func formatFloatSlice(values []float64) string {
	strValues := make([]string, len(values))
	for i, v := range values {
		strValues[i] = fmt.Sprintf("%.4f", v)
	}
	return "[" + strings.Join(strValues, ", ") + "]"
}

// ============================================================================
// AI Response Parsing
// ============================================================================

func parseFullDecisionResponse(aiResponse string, accountEquity float64, largeCapLeverage, smallCapLeverage int, largeCapPosRatio, smallCapPosRatio float64) (*FullDecision, error) {
	cotTrace := extractCoTTrace(aiResponse)

	// Detect potentially truncated response (max_tokens reached)
	trimmed := strings.TrimSpace(aiResponse)
	if len(trimmed) > 0 {
		lastChar := trimmed[len(trimmed)-1]
		if lastChar != ']' && lastChar != '}' && lastChar != '`' && !strings.HasSuffix(trimmed, "</decision>") {
			logger.Warnf("⚠️  AI response may be truncated (last char: '%c', length: %d). Consider increasing AI_MAX_TOKENS.", lastChar, len(trimmed))
		}
	}

	decisions, err := extractDecisions(aiResponse)
	if err != nil {
		return &FullDecision{
			CoTTrace:  cotTrace,
			Decisions: []Decision{},
		}, fmt.Errorf("failed to extract decisions (response length: %d): %w", len(aiResponse), err)
	}

	if err := validateDecisions(decisions, accountEquity, largeCapLeverage, smallCapLeverage, largeCapPosRatio, smallCapPosRatio); err != nil {
		return &FullDecision{
			CoTTrace:  cotTrace,
			Decisions: decisions,
		}, fmt.Errorf("decision validation failed: %w", err)
	}

	return &FullDecision{
		CoTTrace:  cotTrace,
		Decisions: decisions,
	}, nil
}

func extractCoTTrace(response string) string {
	if match := reReasoningTag.FindStringSubmatch(response); match != nil && len(match) > 1 {
		logger.Infof("✓ Extracted reasoning chain using <reasoning> tag")
		return strings.TrimSpace(match[1])
	}

	if decisionIdx := strings.Index(response, "<decision>"); decisionIdx > 0 {
		logger.Infof("✓ Extracted content before <decision> tag as reasoning chain")
		return strings.TrimSpace(response[:decisionIdx])
	}

	jsonStart := strings.Index(response, "[")
	if jsonStart > 0 {
		logger.Infof("⚠️  Extracted reasoning chain using old format ([ character separator)")
		return strings.TrimSpace(response[:jsonStart])
	}

	return strings.TrimSpace(response)
}

func extractDecisions(response string) ([]Decision, error) {
	s := removeInvisibleRunes(response)
	s = strings.TrimSpace(s)
	s = fixMissingQuotes(s)

	var jsonPart string
	if match := reDecisionTag.FindStringSubmatch(s); match != nil && len(match) > 1 {
		jsonPart = strings.TrimSpace(match[1])
		logger.Infof("✓ Extracted JSON using <decision> tag")
	} else {
		jsonPart = s
		logger.Infof("⚠️  <decision> tag not found, searching JSON in full text")
	}

	jsonPart = fixMissingQuotes(jsonPart)

	if m := reJSONFence.FindStringSubmatch(jsonPart); m != nil && len(m) > 1 {
		jsonContent := strings.TrimSpace(m[1])
		jsonContent = compactArrayOpen(jsonContent)
		jsonContent = fixMissingQuotes(jsonContent)
		if err := validateJSONFormat(jsonContent); err != nil {
			return nil, fmt.Errorf("JSON format validation failed: %w\nJSON content: %s\nFull response:\n%s", err, jsonContent, response)
		}
		var decisions []Decision
		if err := json.Unmarshal([]byte(jsonContent), &decisions); err != nil {
			return nil, fmt.Errorf("JSON parsing failed: %w\nJSON content: %s", err, jsonContent)
		}
		return decisions, nil
	}

	jsonContent := strings.TrimSpace(reJSONArray.FindString(jsonPart))
	if jsonContent == "" {
		logger.Infof("⚠️  [SafeFallback] AI didn't output JSON decision, entering safe wait mode")

		cotSummary := jsonPart
		if len(cotSummary) > 240 {
			cotSummary = cotSummary[:240] + "..."
		}

		fallbackDecision := Decision{
			Symbol:    "ALL",
			Action:    "wait",
			Reasoning: fmt.Sprintf("Model didn't output structured JSON decision, entering safe wait; summary: %s", cotSummary),
		}

		return []Decision{fallbackDecision}, nil
	}

	jsonContent = compactArrayOpen(jsonContent)
	jsonContent = fixMissingQuotes(jsonContent)

	if err := validateJSONFormat(jsonContent); err != nil {
		return nil, fmt.Errorf("JSON format validation failed: %w\nJSON content: %s\nFull response:\n%s", err, jsonContent, response)
	}

	var decisions []Decision
	if err := json.Unmarshal([]byte(jsonContent), &decisions); err != nil {
		return nil, fmt.Errorf("JSON parsing failed: %w\nJSON content: %s", err, jsonContent)
	}

	return decisions, nil
}

func fixMissingQuotes(jsonStr string) string {
	jsonStr = strings.ReplaceAll(jsonStr, "\u201c", "\"")
	jsonStr = strings.ReplaceAll(jsonStr, "\u201d", "\"")
	jsonStr = strings.ReplaceAll(jsonStr, "\u2018", "'")
	jsonStr = strings.ReplaceAll(jsonStr, "\u2019", "'")

	jsonStr = strings.ReplaceAll(jsonStr, "［", "[")
	jsonStr = strings.ReplaceAll(jsonStr, "］", "]")
	jsonStr = strings.ReplaceAll(jsonStr, "｛", "{")
	jsonStr = strings.ReplaceAll(jsonStr, "｝", "}")
	jsonStr = strings.ReplaceAll(jsonStr, "：", ":")
	jsonStr = strings.ReplaceAll(jsonStr, "，", ",")

	jsonStr = strings.ReplaceAll(jsonStr, "【", "[")
	jsonStr = strings.ReplaceAll(jsonStr, "】", "]")
	jsonStr = strings.ReplaceAll(jsonStr, "〔", "[")
	jsonStr = strings.ReplaceAll(jsonStr, "〕", "]")
	jsonStr = strings.ReplaceAll(jsonStr, "、", ",")

	jsonStr = strings.ReplaceAll(jsonStr, "　", " ")

	return jsonStr
}

func validateJSONFormat(jsonStr string) error {
	trimmed := strings.TrimSpace(jsonStr)

	if !reArrayHead.MatchString(trimmed) {
		if strings.HasPrefix(trimmed, "[") && !strings.Contains(trimmed[:min(20, len(trimmed))], "{") {
			return fmt.Errorf("not a valid decision array (must contain objects {}), actual content: %s", trimmed[:min(50, len(trimmed))])
		}
		return fmt.Errorf("JSON must start with [{ (whitespace allowed), actual: %s", trimmed[:min(20, len(trimmed))])
	}

	if strings.Contains(jsonStr, "~") {
		return fmt.Errorf("JSON cannot contain range symbol ~, all numbers must be precise single values")
	}

	for i := 0; i < len(jsonStr)-4; i++ {
		if jsonStr[i] >= '0' && jsonStr[i] <= '9' &&
			jsonStr[i+1] == ',' &&
			jsonStr[i+2] >= '0' && jsonStr[i+2] <= '9' &&
			jsonStr[i+3] >= '0' && jsonStr[i+3] <= '9' &&
			jsonStr[i+4] >= '0' && jsonStr[i+4] <= '9' {
			return fmt.Errorf("JSON numbers cannot contain thousand separator comma, found: %s", jsonStr[i:min(i+10, len(jsonStr))])
		}
	}

	return nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func removeInvisibleRunes(s string) string {
	return reInvisibleRunes.ReplaceAllString(s, "")
}

func compactArrayOpen(s string) string {
	return reArrayOpenSpace.ReplaceAllString(strings.TrimSpace(s), "[{")
}

// ============================================================================
// Decision Validation
// ============================================================================

func validateDecisions(decisions []Decision, accountEquity float64, largeCapLeverage, smallCapLeverage int, largeCapPosRatio, smallCapPosRatio float64) error {
	for i, decision := range decisions {
		if err := validateDecision(&decision, accountEquity, largeCapLeverage, smallCapLeverage, largeCapPosRatio, smallCapPosRatio); err != nil {
			return fmt.Errorf("decision #%d validation failed: %w", i+1, err)
		}
	}
	return nil
}

func validateDecision(d *Decision, accountEquity float64, largeCapLeverage, smallCapLeverage int, largeCapPosRatio, smallCapPosRatio float64) error {
	validActions := map[string]bool{
		"open_long":   true,
		"open_short":  true,
		"close_long":  true,
		"close_short": true,
		"hold":        true,
		"wait":        true,
	}

	if !validActions[d.Action] {
		return fmt.Errorf("invalid action: %s", d.Action)
	}

	if d.Action == "open_long" || d.Action == "open_short" {
		maxLeverage := smallCapLeverage
		posRatio := smallCapPosRatio
		maxPositionValue := accountEquity * posRatio
		if d.Symbol == "AAPL" || d.Symbol == "MSFT" {
			maxLeverage = largeCapLeverage
			posRatio = largeCapPosRatio
			maxPositionValue = accountEquity * posRatio
		}

		if d.Leverage <= 0 {
			return fmt.Errorf("leverage must be greater than 0: %d", d.Leverage)
		}
		if d.Leverage > maxLeverage {
			logger.Infof("⚠️  [Leverage Fallback] %s leverage exceeded (%dx > %dx), auto-adjusting to limit %dx",
				d.Symbol, d.Leverage, maxLeverage, maxLeverage)
			d.Leverage = maxLeverage
		}
		if d.PositionSizeUSD <= 0 {
			return fmt.Errorf("position size must be greater than 0: %.2f", d.PositionSizeUSD)
		}

		const minPositionSizeGeneral = 12.0
		const minPositionSizeLargeCap = 60.0

		if d.Symbol == "AAPL" || d.Symbol == "MSFT" {
			if d.PositionSizeUSD < minPositionSizeLargeCap {
				return fmt.Errorf("%s opening amount too small (%.2f USD), must be ≥%.2f USD", d.Symbol, d.PositionSizeUSD, minPositionSizeLargeCap)
			}
		} else {
			if d.PositionSizeUSD < minPositionSizeGeneral {
				return fmt.Errorf("opening amount too small (%.2f USD), must be ≥%.2f USD", d.PositionSizeUSD, minPositionSizeGeneral)
			}
		}

		tolerance := maxPositionValue * 0.01
		if d.PositionSizeUSD > maxPositionValue+tolerance {
			// Auto-adjust position size to max allowed (like we do for leverage)
			originalSize := d.PositionSizeUSD
			d.PositionSizeUSD = maxPositionValue
			if d.Symbol == "AAPL" || d.Symbol == "MSFT" {
				logger.Infof("⚠️  [Position Size Fallback] %s Large Cap position size exceeded (%.0f > %.0f USD), auto-adjusting to limit %.0f USD",
					d.Symbol, originalSize, maxPositionValue, d.PositionSizeUSD)
			} else {
				logger.Infof("⚠️  [Position Size Fallback] %s Small Cap position size exceeded (%.0f > %.0f USD), auto-adjusting to limit %.0f USD",
					d.Symbol, originalSize, maxPositionValue, d.PositionSizeUSD)
			}
		}
		if d.StopLoss <= 0 || d.TakeProfit <= 0 {
			return fmt.Errorf("stop loss and take profit must be greater than 0")
		}

		if d.Action == "open_long" {
			if d.StopLoss >= d.TakeProfit {
				return fmt.Errorf("for long positions, stop loss price must be less than take profit price")
			}
		} else {
			if d.StopLoss <= d.TakeProfit {
				return fmt.Errorf("for short positions, stop loss price must be greater than take profit price")
			}
		}

		var entryPrice float64
		if d.Action == "open_long" {
			entryPrice = d.StopLoss + (d.TakeProfit-d.StopLoss)*0.2
		} else {
			entryPrice = d.StopLoss - (d.StopLoss-d.TakeProfit)*0.2
		}

		var riskPercent, rewardPercent, riskRewardRatio float64
		if d.Action == "open_long" {
			riskPercent = (entryPrice - d.StopLoss) / entryPrice * 100
			rewardPercent = (d.TakeProfit - entryPrice) / entryPrice * 100
			if riskPercent > 0 {
				riskRewardRatio = rewardPercent / riskPercent
			}
		} else {
			riskPercent = (d.StopLoss - entryPrice) / entryPrice * 100
			rewardPercent = (entryPrice - d.TakeProfit) / entryPrice * 100
			if riskPercent > 0 {
				riskRewardRatio = rewardPercent / riskPercent
			}
		}

		if riskRewardRatio < 3.0 {
			return fmt.Errorf("risk/reward ratio too low (%.2f:1), must be ≥3.0:1 [risk: %.2f%% reward: %.2f%%] [stop loss: %.2f take profit: %.2f]",
				riskRewardRatio, riskPercent, rewardPercent, d.StopLoss, d.TakeProfit)
		}
	}

	return nil
}

// ============================================================================
// Algorithmic Fallback (Non-AI Bulletproof Trading)
// ============================================================================

// GetAlgorithmicDecision gets a trading decision using purely technical algorithms (Non-AI Fallback)
func GetAlgorithmicDecision(ctx *Context, engine *StrategyEngine) (*FullDecision, error) {
	if ctx == nil || engine == nil {
		return nil, fmt.Errorf("context or engine is nil")
	}

	config := engine.GetConfig()
	var decisions []Decision
	var cotBuilder strings.Builder

	cotBuilder.WriteString("## 🤖 Algorithmic Decision Engine (Non-AI Fallback)\n\n")
	cotBuilder.WriteString(fmt.Sprintf("**Timestamp:** %s\n\n", time.Now().Format("2006-01-02 15:04:05 MST")))
	cotBuilder.WriteString(fmt.Sprintf("### Account Status\n- Equity: $%.2f\n- Available: $%.2f\n- Open Positions: %d\n\n",
		ctx.Account.TotalEquity, ctx.Account.AvailableBalance, ctx.Account.PositionCount))

	// 1. Check VWAP Slope & Stretch Algorithm (if enabled)
	if config.Indicators.EnableVWAPSlopeStretch {
		cotBuilder.WriteString("### 📊 VWAP Slope & Stretch Analysis\n\n")
		for _, stock := range ctx.CandidateStocks {
			decision, analysis, passed := calculateVWAPSlopeStretchWithAnalysis(ctx, stock.Symbol, config)
			cotBuilder.WriteString(analysis)
			if passed && decision != nil {
				decisions = append(decisions, *decision)
			}
		}
	}

	// 2. Handle position safekeeping (manage open positions if no algorithmic signal)
	safekeepingDecisions := HandlePositionSafekeeping(ctx, engine)
	if len(safekeepingDecisions) > 0 {
		cotBuilder.WriteString("### 📈 Position Management\n\n")
		for _, d := range safekeepingDecisions {
			cotBuilder.WriteString(fmt.Sprintf("- **%s**: %s - %s\n", d.Symbol, d.Action, d.Reasoning))
		}
		cotBuilder.WriteString("\n")
	}
	decisions = append(decisions, safekeepingDecisions...)

	// If no decisions, just wait/hold
	if len(decisions) == 0 {
		cotBuilder.WriteString("### ⏳ Final Decision\nNo algorithmic signals found across all candidates. Entering **WAIT** mode.\n")
		decisions = append(decisions, Decision{
			Symbol:    "ALL",
			Action:    "wait",
			Reasoning: "No algorithmic signals found, entering wait mode (Non-AI Fallback)",
		})
	} else {
		cotBuilder.WriteString("### ✅ Final Decisions\n")
		for _, d := range decisions {
			if d.Action == "open_long" || d.Action == "open_short" {
				cotBuilder.WriteString(fmt.Sprintf("- **%s** → %s (Confidence: %d%%, Size: $%.2f, TP: $%.2f, SL: $%.2f)\n",
					d.Symbol, strings.ToUpper(d.Action), d.Confidence, d.PositionSizeUSD, d.TakeProfit, d.StopLoss))
			} else {
				cotBuilder.WriteString(fmt.Sprintf("- **%s** → %s\n", d.Symbol, d.Action))
			}
		}
	}

	return &FullDecision{
		CoTTrace:  cotBuilder.String(),
		Decisions: decisions,
		Timestamp: time.Now(),
	}, nil
}

// calculateVWAPSlopeStretchWithAnalysis returns detailed analysis string for Chain of Thought
func calculateVWAPSlopeStretchWithAnalysis(ctx *Context, symbol string, config *store.StrategyConfig) (*Decision, string, bool) {
	var analysis strings.Builder
	analysis.WriteString(fmt.Sprintf("#### %s Analysis\n\n", symbol))

	marketData, ok := ctx.MarketDataMap[symbol]
	if !ok || marketData.TimeframeData == nil {
		analysis.WriteString("❌ No market data available\n\n")
		return nil, analysis.String(), false
	}

	tfData, ok := marketData.TimeframeData["5m"]
	if !ok || len(tfData.Klines) < 20 {
		analysis.WriteString("❌ Insufficient 5m K-line data\n\n")
		return nil, analysis.String(), false
	}

	loc, _ := time.LoadLocation("America/New_York")
	indicatorCfg := &config.Indicators
	entryTime := indicatorCfg.VWAPEntryTime
	if entryTime == "" {
		entryTime = "10:00"
	}

	var entryHour, entryMin int
	fmt.Sscanf(entryTime, "%d:%d", &entryHour, &entryMin)

	// Calculate Opening Range
	var orHigh, orLow float64 = 0, 1e12
	var foundEntry bool
	for _, k := range tfData.Klines {
		t := time.Unix(k.Time/1000, 0).In(loc)
		if (t.Hour() == 9 && t.Minute() >= 30) || (t.Hour() < entryHour || (t.Hour() == entryHour && t.Minute() < entryMin)) {
			if k.High > orHigh {
				orHigh = k.High
			}
			if orLow == 0 || k.Low < orLow {
				orLow = k.Low
			}
		}
		if t.Hour() == entryHour && t.Minute() == entryMin {
			foundEntry = true
		}
	}

	// Market Snapshot
	currentPrice := marketData.CurrentPrice
	currentVWAP := tfData.CurrentVWAP
	dayOpen := tfData.Klines[0].Open
	priceChange := ((currentPrice - dayOpen) / dayOpen) * 100

	analysis.WriteString(fmt.Sprintf("**📊 Market Snapshot at %s**\n", entryTime))
	analysis.WriteString(fmt.Sprintf("- Day Open: $%.2f\n", dayOpen))
	analysis.WriteString(fmt.Sprintf("- Current Price: $%.2f (%+.2f%% from open)\n", currentPrice, priceChange))
	analysis.WriteString(fmt.Sprintf("- VWAP: $%.2f\n", currentVWAP))
	analysis.WriteString(fmt.Sprintf("- Opening Range: $%.2f - $%.2f\n\n", orLow, orHigh))

	// Entry Conditions
	analysis.WriteString("**✅ Entry Conditions Checked (ALL MUST PASS)**\n\n")

	now := time.Now().In(loc)
	allPassed := true

	// Condition 1: Time Check
	timeOK := now.Hour() > entryHour || (now.Hour() == entryHour && now.Minute() >= entryMin)
	if timeOK && foundEntry {
		analysis.WriteString(fmt.Sprintf("✓ **Time Check**: After %s entry time\n", entryTime))
	} else {
		analysis.WriteString(fmt.Sprintf("✗ **Time Check**: Before %s entry time - SKIPPED\n\n", entryTime))
		return nil, analysis.String(), false
	}

	// Condition 2: Price > VWAP
	priceAboveVWAP := currentPrice > currentVWAP
	if priceAboveVWAP {
		analysis.WriteString(fmt.Sprintf("✓ **Price > VWAP**: $%.2f > $%.2f — Stock trading ABOVE average price (bullish)\n", currentPrice, currentVWAP))
	} else {
		analysis.WriteString(fmt.Sprintf("✗ **Price > VWAP**: $%.2f <= $%.2f — FAILED\n", currentPrice, currentVWAP))
		allPassed = false
	}

	// Condition 3: VWAP Slope Positive
	var vwap940, vwapEntry float64 = 0, currentVWAP
	if len(tfData.VWAPValues) > 0 {
		for i, k := range tfData.Klines {
			t := time.Unix(k.Time/1000, 0).In(loc)
			if t.Hour() == 9 && t.Minute() == 40 && i < len(tfData.VWAPValues) {
				vwap940 = tfData.VWAPValues[i]
				break
			}
		}
	}

	slopePositive := vwap940 == 0 || vwapEntry > vwap940
	if slopePositive {
		if vwap940 > 0 {
			analysis.WriteString(fmt.Sprintf("✓ **VWAP Trending Up (Slope > 0)**: VWAP@%s $%.2f > VWAP@9:40 $%.2f — Buyers in control\n", entryTime, vwapEntry, vwap940))
		} else {
			analysis.WriteString("✓ **VWAP Trending Up**: Slope assumed positive (no 9:40 data)\n")
		}
	} else {
		analysis.WriteString(fmt.Sprintf("✗ **VWAP Trending Up**: VWAP@%s $%.2f <= VWAP@9:40 $%.2f — FAILED\n", entryTime, vwapEntry, vwap940))
		allPassed = false
	}

	// Condition 4: Stretch (Not Overextended)
	orVolatility := (orHigh - orLow) / vwapEntry
	stretch := (currentPrice - vwapEntry) / vwapEntry
	stretchThreshold := 0.5 * orVolatility

	stretchOK := stretch < stretchThreshold
	if stretchOK {
		analysis.WriteString(fmt.Sprintf("✓ **Price Not Overextended (Stretch < 0.5×Vol)**: %.4f < %.4f — Safe entry point\n", stretch, stretchThreshold))
	} else {
		analysis.WriteString(fmt.Sprintf("✗ **Price Not Overextended**: Stretch %.4f >= %.4f — FAILED (price too far from VWAP)\n", stretch, stretchThreshold))
		allPassed = false
	}

	// Condition 5: Momentum
	momentum := (currentPrice - dayOpen) / dayOpen
	momentumThreshold := 0.25 * orVolatility

	momentumOK := momentum > momentumThreshold
	if momentumOK {
		analysis.WriteString(fmt.Sprintf("✓ **Enough Momentum (Mom > 0.25×Vol)**: %.4f > %.4f — Solid upward momentum\n", momentum, momentumThreshold))
	} else {
		analysis.WriteString(fmt.Sprintf("✗ **Enough Momentum**: %.4f <= %.4f — FAILED (weak momentum)\n", momentum, momentumThreshold))
		allPassed = false
	}

	analysis.WriteString("\n")

	if !allPassed || !priceAboveVWAP || !slopePositive || !stretchOK || !momentumOK {
		analysis.WriteString("❌ **CONDITIONS NOT MET** → SKIP this stock\n\n")
		return nil, analysis.String(), false
	}

	// All conditions passed - calculate position
	analysis.WriteString("✅ **ALL CONDITIONS PASSED** → BUY SIGNAL\n\n")

	posRatio := config.RiskControl.SmallCapMaxPositionValueRatio
	if symbol == "AAPL" || symbol == "MSFT" || symbol == "TSLA" || symbol == "NVDA" || symbol == "GOOGL" || symbol == "META" || symbol == "AMZN" {
		posRatio = config.RiskControl.LargeCapMaxPositionValueRatio
	}
	if posRatio <= 0 {
		posRatio = 1.0
	}

	positionSize := ctx.Account.TotalEquity * posRatio * 0.8
	ai100Client := market.GetAI100Client()
	tpPct := ai100Client.GetSellTrigger(symbol)
	if tpPct <= 0 {
		tpPct = 12.0 // Default 12%
	}

	stopLoss := dayOpen
	takeProfit := currentPrice * (1 + tpPct/100)

	analysis.WriteString("**📋 Exit Plan:**\n")
	analysis.WriteString(fmt.Sprintf("- **Take Profit (TP)**: Sell at $%.2f (+%.2f%% profit)\n", takeProfit, tpPct))
	analysis.WriteString(fmt.Sprintf("- **Stop Loss (SL)**: Sell at $%.2f (day's open price — protection)\n", stopLoss))
	analysis.WriteString(fmt.Sprintf("- **Position Size**: $%.2f\n\n", positionSize))

	decision := &Decision{
		Symbol:          symbol,
		Action:          "open_long",
		Leverage:        config.RiskControl.SmallCapMaxMargin,
		PositionSizeUSD: positionSize,
		StopLoss:        stopLoss,
		TakeProfit:      takeProfit,
		Confidence:      90,
		Reasoning:       fmt.Sprintf("VWAP Algorithm: All 4 conditions passed. Price $%.2f > VWAP $%.2f, Slope Positive, Stretch %.4f < %.4f, Momentum %.4f > %.4f", currentPrice, currentVWAP, stretch, stretchThreshold, momentum, momentumThreshold),
	}

	return decision, analysis.String(), true
}

// calculateVWAPSlopeStretch translates technical VWAP rules into a Decision (legacy, kept for compatibility)
func calculateVWAPSlopeStretch(ctx *Context, symbol string, config *store.StrategyConfig) (*Decision, bool) {
	decision, _, passed := calculateVWAPSlopeStretchWithAnalysis(ctx, symbol, config)
	return decision, passed
}

// HandlePositionSafekeeping manages TP/SL for open positions without AI
func HandlePositionSafekeeping(ctx *Context, engine *StrategyEngine) []Decision {
	var decisions []Decision

	for _, pos := range ctx.Positions {
		ai100Client := market.GetAI100Client()
		tpPct := ai100Client.GetSellTrigger(pos.Symbol)

		// Check if TP hit
		if pos.UnrealizedPnLPct >= tpPct {
			decisions = append(decisions, Decision{
				Symbol:    pos.Symbol,
				Action:    "close_" + pos.Side,
				Reasoning: fmt.Sprintf("Algorithmic TP hit: %.2f%% >= %.2f%% (Non-AI Fallback)", pos.UnrealizedPnLPct, tpPct),
			})
			continue
		}

		// Check if Stop Loss hit (fallback SL if not set on exchange)
		slPct := -2.0 // Default -2%
		if pos.UnrealizedPnLPct <= slPct {
			decisions = append(decisions, Decision{
				Symbol:    pos.Symbol,
				Action:    "close_" + pos.Side,
				Reasoning: fmt.Sprintf("Algorithmic SL hit: %.2f%% <= %.2f%% (Non-AI Fallback)", pos.UnrealizedPnLPct, slPct),
			})
			continue
		}

		// Default: hold
		decisions = append(decisions, Decision{
			Symbol:    pos.Symbol,
			Action:    "hold",
			Reasoning: "Maintaining position (Non-AI Fallback)",
		})
	}

	return decisions
}

// ============================================================================
// TacticEngine - Alias for StrategyEngine to support separate Tactics page
// ============================================================================

// TacticEngine is identical to StrategyEngine but used for the Tactics page
// This allows Tactics and Strategies to have separate data storage
type TacticEngine = StrategyEngine

// NewTacticEngine creates a tactic execution engine
// TacticConfig is identical to StrategyConfig
func NewTacticEngine(config *store.TacticConfig) *TacticEngine {
	// TacticConfig and StrategyConfig share the same structure
	strategyConfig := (*store.StrategyConfig)(config)
	return NewStrategyEngine(strategyConfig)
}
