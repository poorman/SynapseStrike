package trader

import (
	"SynapseStrike/decision"
	"SynapseStrike/logger"
	"SynapseStrike/market"
	"SynapseStrike/mcp"
	"SynapseStrike/store"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"
)

// AutoTraderConfig auto trading configuration (simplified version - AI makes all decisions)
type AutoTraderConfig struct {
	// Trader identification
	ID      string // Trader unique identifier (for log directory, etc.)
	Name    string // Trader display name
	AIModel string // AI model: "qwen" or "deepseek"

	// Trading platform selection
	Exchange   string // Exchange type: "binance", "bybit", "okx", "bitget", "hyperliquid", "aster" or "lighter"
	ExchangeID string // Exchange account UUID (for multi-account support)

	// Binance API configuration
	BinanceAPIKey    string
	BinanceSecretKey string

	// Bybit API configuration
	BybitAPIKey    string
	BybitSecretKey string

	// OKX API configuration
	OKXAPIKey     string
	OKXSecretKey  string
	OKXPassphrase string

	// Bitget API configuration
	BitgetAPIKey     string
	BitgetSecretKey  string
	BitgetPassphrase string

	// Hyperliquid configuration
	HyperliquidPrivateKey string
	HyperliquidWalletAddr string
	HyperliquidTestnet    bool

	// Aster configuration
	AsterUser       string // Aster main wallet address
	AsterSigner     string // Aster API wallet address
	AsterPrivateKey string // Aster API wallet private key

	// LIGHTER configuration
	LighterWalletAddr       string // LIGHTER wallet address (L1 wallet)
	LighterPrivateKey       string // LIGHTER L1 private key (for account identification)
	LighterAPIKeyPrivateKey string // LIGHTER API Key private key (40 bytes, for transaction signing)
	LighterAPIKeyIndex      int    // LIGHTER API Key index (0-255)
	LighterTestnet          bool   // Whether to use testnet

	// AI configuration
	UseQwen     bool
	DeepSeekKey string
	QwenKey     string

	// Custom AI API configuration
	CustomAPIURL    string
	CustomAPIKey    string
	CustomModelName string

	// Scan configuration
	ScanInterval time.Duration // Scan interval (recommended 3 minutes)

	// Account configuration
	InitialBalance float64 // Initial balance (for P&L calculation, must be set manually)

	// Risk control (only as hints, AI can make autonomous decisions)
	MaxDailyLoss    float64       // Maximum daily loss percentage (hint)
	MaxDrawdown     float64       // Maximum drawdown percentage (hint)
	StopTradingTime time.Duration // Pause duration after risk control triggers

	// Position mode
	IsCrossMargin bool // true=cross margin mode, false=isolated margin mode

	// Competition visibility
	ShowInCompetition bool // Whether to show in competition page

	// Market hours trading restriction
	TradeOnlyMarketHours bool // If true, only trade during stock market hours (9:30 AM - 4:00 PM ET)

	// Strategy configuration (use complete strategy config)
	StrategyConfig *store.StrategyConfig // Strategy configuration (includes coin sources, indicators, risk control, prompts, etc.)
}

// AutoTrader automatic trader
type AutoTrader struct {
	id                    string // Trader unique identifier
	name                  string // Trader display name
	aiModel               string // AI model name
	exchange              string // Trading platform type (binance/bybit/etc)
	exchangeID            string // Exchange account UUID
	showInCompetition     bool   // Whether to show in competition page
	config                AutoTraderConfig
	trader                Trader // Use Trader interface (supports multiple platforms)
	mcpClient             mcp.AIClient
	store                 *store.Store             // Data storage (decision records, etc.)
	strategyEngine        *decision.StrategyEngine // Strategy engine (uses strategy configuration)
	cycleNumber           int                      // Current cycle number
	initialBalance        float64
	dailyPnL              float64
	customPrompt          string // Custom trading strategy prompt
	overrideBasePrompt    bool   // Whether to override base prompt
	lastResetTime         time.Time
	stopUntil             time.Time
	isRunning             bool
	startTime             time.Time          // System start time
	callCount             int                // AI call count
	positionFirstSeenTime map[string]int64   // Position first seen time (symbol_side -> timestamp in milliseconds)
	stopMonitorCh         chan struct{}      // Used to stop monitoring goroutine
	monitorWg             sync.WaitGroup     // Used to wait for monitoring goroutine to finish
	peakPnLCache          map[string]float64 // Peak profit cache (symbol -> peak P&L percentage)
	peakPnLCacheMutex     sync.RWMutex       // Cache read-write lock
	lastBalanceSyncTime   time.Time          // Last balance sync time
	userID                string             // User ID

	// VWAP Pre-Entry Phase fields
	vwapCollectors   map[string]*VWAPCollector // Per-symbol VWAP collectors
	vwapPreEntryMode bool                      // True if in pre-entry collection phase
	vwapCollectorsMu sync.RWMutex              // Mutex for vwapCollectors map
}

// NewAutoTrader creates an automatic trader
// st parameter is used to store decision records to database
func NewAutoTrader(config AutoTraderConfig, st *store.Store, userID string) (*AutoTrader, error) {
	// Set default values
	if config.ID == "" {
		config.ID = "default_trader"
	}
	if config.Name == "" {
		config.Name = "Default Trader"
	}
	if config.AIModel == "" {
		if config.UseQwen {
			config.AIModel = "qwen"
		} else {
			config.AIModel = "deepseek"
		}
	}

	// Initialize AI client based on provider
	var mcpClient mcp.AIClient
	aiModel := config.AIModel
	if config.UseQwen && aiModel == "" {
		aiModel = "qwen"
	}

	switch aiModel {
	case "claude":
		mcpClient = mcp.NewClaudeClient()
		mcpClient.SetAPIKey(config.CustomAPIKey, config.CustomAPIURL, config.CustomModelName)
		logger.Infof("🤖 [%s] Using Claude AI", config.Name)

	case "kimi":
		mcpClient = mcp.NewKimiClient()
		mcpClient.SetAPIKey(config.CustomAPIKey, config.CustomAPIURL, config.CustomModelName)
		logger.Infof("🤖 [%s] Using Kimi (Moonshot) AI", config.Name)

	case "gemini":
		mcpClient = mcp.NewGeminiClient()
		mcpClient.SetAPIKey(config.CustomAPIKey, config.CustomAPIURL, config.CustomModelName)
		logger.Infof("🤖 [%s] Using Google Gemini AI", config.Name)

	case "grok":
		mcpClient = mcp.NewGrokClient()
		mcpClient.SetAPIKey(config.CustomAPIKey, config.CustomAPIURL, config.CustomModelName)
		logger.Infof("🤖 [%s] Using xAI Grok AI", config.Name)

	case "openai":
		mcpClient = mcp.NewOpenAIClient()
		mcpClient.SetAPIKey(config.CustomAPIKey, config.CustomAPIURL, config.CustomModelName)
		logger.Infof("🤖 [%s] Using OpenAI", config.Name)

	case "qwen":
		mcpClient = mcp.NewQwenClient()
		apiKey := config.QwenKey
		if apiKey == "" {
			apiKey = config.CustomAPIKey
		}
		mcpClient.SetAPIKey(apiKey, config.CustomAPIURL, config.CustomModelName)
		logger.Infof("🤖 [%s] Using Alibaba Cloud Qwen AI", config.Name)

	case "localai":
		mcpClient = mcp.NewLocalAIClient()
		mcpClient.SetAPIKey(config.CustomAPIKey, config.CustomAPIURL, config.CustomModelName)
		logger.Infof("🤖 [%s] Using LocalAI", config.Name)

	case "custom":
		mcpClient = mcp.New()
		mcpClient.SetAPIKey(config.CustomAPIKey, config.CustomAPIURL, config.CustomModelName)
		logger.Infof("🤖 [%s] Using custom AI API: %s (model: %s)", config.Name, config.CustomAPIURL, config.CustomModelName)

	default: // deepseek or empty
		mcpClient = mcp.NewDeepSeekClient()
		apiKey := config.DeepSeekKey
		if apiKey == "" {
			apiKey = config.CustomAPIKey
		}
		mcpClient.SetAPIKey(apiKey, config.CustomAPIURL, config.CustomModelName)
		logger.Infof("🤖 [%s] Using DeepSeek AI", config.Name)
	}

	if config.CustomAPIURL != "" || config.CustomModelName != "" {
		logger.Infof("🔧 [%s] Custom config - URL: %s, Model: %s", config.Name, config.CustomAPIURL, config.CustomModelName)
	}

	// Set default trading platform
	if config.Exchange == "" {
		config.Exchange = "binance"
	}

	// Create corresponding trader based on configuration
	var trader Trader
	var err error

	// Record position mode (general)
	marginModeStr := "Cross Margin"
	if !config.IsCrossMargin {
		marginModeStr = "Isolated Margin"
	}
	logger.Infof("📊 [%s] Position mode: %s", config.Name, marginModeStr)

	switch config.Exchange {
	case "binance":
		logger.Infof("🏦 [%s] Using Binance Futures trading", config.Name)
		trader = NewFuturesTrader(config.BinanceAPIKey, config.BinanceSecretKey, userID)
	case "bybit":
		logger.Infof("🏦 [%s] Using Bybit Futures trading", config.Name)
		trader = NewBybitTrader(config.BybitAPIKey, config.BybitSecretKey)
	case "okx":
		logger.Infof("🏦 [%s] Using OKX Futures trading", config.Name)
		trader = NewOKXTrader(config.OKXAPIKey, config.OKXSecretKey, config.OKXPassphrase)
	case "bitget":
		logger.Infof("🏦 [%s] Using Bitget Futures trading", config.Name)
		trader = NewBitgetTrader(config.BitgetAPIKey, config.BitgetSecretKey, config.BitgetPassphrase)
	case "hyperliquid":
		logger.Infof("🏦 [%s] Using Hyperliquid trading", config.Name)
		trader, err = NewHyperliquidTrader(config.HyperliquidPrivateKey, config.HyperliquidWalletAddr, config.HyperliquidTestnet)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize Hyperliquid trader: %w", err)
		}
	case "aster":
		logger.Infof("🏦 [%s] Using Aster trading", config.Name)
		trader, err = NewAsterTrader(config.AsterUser, config.AsterSigner, config.AsterPrivateKey)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize Aster trader: %w", err)
		}
	case "lighter":
		logger.Infof("🏦 [%s] Using LIGHTER trading", config.Name)

		if config.LighterWalletAddr == "" || config.LighterAPIKeyPrivateKey == "" {
			return nil, fmt.Errorf("Lighter requires wallet address and API Key private key")
		}

		// Lighter only supports mainnet (testnet disabled)
		trader, err = NewLighterTraderV2(
			config.LighterWalletAddr,
			config.LighterAPIKeyPrivateKey,
			config.LighterAPIKeyIndex,
			false, // Always use mainnet for Lighter
		)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize LIGHTER trader: %w", err)
		}
		logger.Infof("✓ LIGHTER trader initialized successfully")
	case "alpaca", "alpaca-live":
		logger.Infof("🏦 [%s] Using Alpaca (Live) stock trading", config.Name)
		trader = NewAlpacaTrader(config.BinanceAPIKey, config.BinanceSecretKey, false)
	case "alpaca-paper":
		logger.Infof("🏦 [%s] Using Alpaca (Paper) stock trading", config.Name)
		trader = NewAlpacaTrader(config.BinanceAPIKey, config.BinanceSecretKey, true)
	default:
		return nil, fmt.Errorf("unsupported trading platform: %s", config.Exchange)
	}

	// Validate initial balance configuration, auto-fetch from exchange if 0
	if config.InitialBalance <= 0 {
		logger.Infof("📊 [%s] Initial balance not set, attempting to fetch current balance from exchange...", config.Name)
		account, err := trader.GetBalance()
		if err != nil {
			return nil, fmt.Errorf("initial balance not set and unable to fetch balance from exchange: %w", err)
		}
		// Try multiple balance field names (different exchanges return different formats)
		balanceKeys := []string{"total_equity", "totalWalletBalance", "wallet_balance", "totalEq", "balance"}
		var foundBalance float64
		for _, key := range balanceKeys {
			if balance, ok := account[key].(float64); ok && balance > 0 {
				foundBalance = balance
				break
			}
		}
		if foundBalance > 0 {
			config.InitialBalance = foundBalance
			logger.Infof("✓ [%s] Auto-fetched initial balance: %.2f USDT", config.Name, foundBalance)
			// Save to database so it persists across restarts
			if st != nil {
				if err := st.Trader().UpdateInitialBalance(userID, config.ID, foundBalance); err != nil {
					logger.Infof("⚠️  [%s] Failed to save initial balance to database: %v", config.Name, err)
				} else {
					logger.Infof("✓ [%s] Initial balance saved to database", config.Name)
				}
			}
		} else {
			return nil, fmt.Errorf("initial balance must be greater than 0, please set InitialBalance in config or ensure exchange account has balance")
		}
	}

	// Get last cycle number (for recovery)
	var cycleNumber int
	if st != nil {
		cycleNumber, _ = st.Decision().GetLastCycleNumber(config.ID)
		logger.Infof("📊 [%s] Decision records will be stored to database", config.Name)
	}

	// Create strategy engine (must have strategy config)
	if config.StrategyConfig == nil {
		return nil, fmt.Errorf("[%s] strategy not configured", config.Name)
	}
	strategyEngine := decision.NewStrategyEngine(config.StrategyConfig)
	logger.Infof("✓ [%s] Using strategy engine (strategy configuration loaded)", config.Name)

	return &AutoTrader{
		id:                    config.ID,
		name:                  config.Name,
		aiModel:               config.AIModel,
		exchange:              config.Exchange,
		exchangeID:            config.ExchangeID,
		showInCompetition:     config.ShowInCompetition,
		config:                config,
		trader:                trader,
		mcpClient:             mcpClient,
		store:                 st,
		strategyEngine:        strategyEngine,
		cycleNumber:           cycleNumber,
		initialBalance:        config.InitialBalance,
		lastResetTime:         time.Now(),
		startTime:             time.Now(),
		callCount:             0,
		isRunning:             false,
		positionFirstSeenTime: make(map[string]int64),
		stopMonitorCh:         make(chan struct{}),
		monitorWg:             sync.WaitGroup{},
		peakPnLCache:          make(map[string]float64),
		peakPnLCacheMutex:     sync.RWMutex{},
		lastBalanceSyncTime:   time.Now(),
		userID:                userID,
	}, nil
}

// Run runs the automatic trading main loop
func (at *AutoTrader) Run() error {
	at.isRunning = true
	at.stopMonitorCh = make(chan struct{})
	at.startTime = time.Now()

	logger.Info("🚀 AI-driven automatic trading system started")
	logger.Infof("💰 Initial balance: %.2f USDT", at.initialBalance)
	logger.Infof("⚙️  Scan interval: %v", at.config.ScanInterval)
	if at.config.TradeOnlyMarketHours {
		logger.Info("⏰ Market hours only mode: Trading restricted to 9:30 AM - 4:00 PM ET (Mon-Fri)")
	}

	// Check if VWAP algorithm is enabled
	vwapEnabled := false
	if at.strategyEngine != nil {
		config := at.strategyEngine.GetConfig()
		if config != nil && config.Indicators.EnableVWAPSlopeStretch {
			vwapEnabled = true
			logger.Info("📊 VWAP + Slope & Stretch Algorithm enabled - will use 1-min intervals during pre-entry phase")
		}
	}

	logger.Info("🤖 AI will make full decisions on leverage, position size, stop loss/take profit, etc.")
	at.monitorWg.Add(1)
	defer at.monitorWg.Done()

	// Start drawdown monitoring
	at.startDrawdownMonitor()

	// Determine initial scan interval (VWAP pre-entry uses 1-min)
	currentInterval := at.getVWAPAwareInterval()
	ticker := time.NewTicker(currentInterval)
	defer ticker.Stop()

	if vwapEnabled && at.isVWAPPreEntryTime() {
		logger.Infof("📊 [VWAP] Pre-entry phase active - using 1-minute intervals until entry time")
		logger.Infof("📊 [VWAP] Collecting initial VWAP data, no trading until entry time")
		// Get candidate symbols from strategy engine
		if at.strategyEngine != nil {
			candidates, _ := at.strategyEngine.GetCandidateStocks()
			var symbols []string
			for _, c := range candidates {
				symbols = append(symbols, c.Symbol)
			}
			if len(symbols) > 0 {
				at.collectVWAPBars(symbols)
			}
		}
	} else {
		// Execute immediately on first run (if market is open or market hours check is disabled)
		if !at.config.TradeOnlyMarketHours || isMarketOpen() {
			// If started after entry time, only manage positions
			if vwapEnabled && at.isVWAPPostEntryTime() {
				logger.Infof("📊 [VWAP] Pre-entry/Post-entry check: Started after entry time - only managing existing positions")
				at.runVWAPPositionManagement()
			} else if err := at.runCycle(); err != nil {
				logger.Infof("❌ Execution failed: %v", err)
			}
		} else {
			logger.Info("⏸️  Market is closed, skipping trading cycle")
		}
	}

	for at.isRunning {
		select {
		case <-ticker.C:
			// Check market hours if enabled
			if at.config.TradeOnlyMarketHours && !isMarketOpen() {
				logger.Info("⏸️  Market is closed, skipping trading cycle")
				continue
			}

			// Dynamic interval adjustment for VWAP mode
			if vwapEnabled {
				newInterval := at.getVWAPAwareInterval()
				if newInterval != currentInterval {
					ticker.Reset(newInterval)
					currentInterval = newInterval
					if newInterval == 1*time.Minute {
						logger.Infof("📊 [VWAP] Switched to 1-minute intervals for pre-entry data collection")
					} else {
						logger.Infof("📊 [VWAP] Switched back to normal interval: %v", newInterval)
					}
				}

				// During VWAP pre-entry phase (9:30-10:00), only collect data, don't trade
				if at.isVWAPPreEntryTime() {
					logger.Infof("📊 [VWAP] Pre-entry phase - collecting data, skipping trading until entry time")
					// Get candidate symbols from strategy engine
					if at.strategyEngine != nil {
						candidates, _ := at.strategyEngine.GetCandidateStocks()
						var symbols []string
						for _, c := range candidates {
							symbols = append(symbols, c.Symbol)
						}
						if len(symbols) > 0 {
							at.collectVWAPBars(symbols)
						}
					}
					continue
				}

				// After entry time (e.g., after 10:00 AM), only manage existing positions
				// No new buys allowed - only holds and sells (TP or near market close)
				if at.isVWAPPostEntryTime() {
					logger.Infof("📊 [VWAP] Post-entry phase - only managing existing positions, no new buys")
					at.runVWAPPositionManagement()
					continue
				}
			}

			if err := at.runCycle(); err != nil {
				logger.Infof("❌ Execution failed: %v", err)
			}
		case <-at.stopMonitorCh:
			logger.Infof("[%s] ⏹ Stop signal received, exiting automatic trading main loop", at.name)
			return nil
		}
	}

	return nil
}

// Stop stops the automatic trading
func (at *AutoTrader) Stop() {
	if !at.isRunning {
		return
	}
	at.isRunning = false
	close(at.stopMonitorCh) // Notify monitoring goroutine to stop
	at.monitorWg.Wait()     // Wait for monitoring goroutine to finish
	logger.Info("⏹ Automatic trading system stopped")
}

// runCycle runs one trading cycle (using AI full decision-making)
func (at *AutoTrader) runCycle() error {
	at.callCount++

	logger.Info("\n" + strings.Repeat("=", 70) + "\n")
	logger.Infof("⏰ %s - AI decision cycle #%d", time.Now().Format("2006-01-02 15:04:05"), at.callCount)
	logger.Info(strings.Repeat("=", 70))

	// Create decision record
	record := &store.DecisionRecord{
		ExecutionLog: []string{},
		Success:      true,
	}

	// 1. Check if trading needs to be stopped
	if time.Now().Before(at.stopUntil) {
		remaining := at.stopUntil.Sub(time.Now())
		logger.Infof("⏸ Risk control: Trading paused, remaining %.0f minutes", remaining.Minutes())
		record.Success = false
		record.ErrorMessage = fmt.Sprintf("Risk control paused, remaining %.0f minutes", remaining.Minutes())
		at.saveDecision(record)
		return nil
	}

	// 1.5. Check market hours (only for stock trading with TradeOnlyMarketHours enabled)
	if at.config.TradeOnlyMarketHours {
		if !isMarketOpen() {
			logger.Infof("🕒 Market is closed (outside 9:30 AM - 4:00 PM ET). Skipping trading cycle.")
			record.Success = false
			record.ErrorMessage = "Market is closed (outside 9:30 AM - 4:00 PM ET)"
			at.saveDecision(record)
			return nil
		}
	}

	// 2. Reset daily P&L (reset every day)
	if time.Since(at.lastResetTime) > 24*time.Hour {
		at.dailyPnL = 0
		at.lastResetTime = time.Now()
		logger.Info("📅 Daily P&L reset")
	}

	// 4. Collect trading context
	ctx, err := at.buildTradingContext()
	if err != nil {
		record.Success = false
		record.ErrorMessage = fmt.Sprintf("Failed to build trading context: %v", err)
		at.saveDecision(record)
		return fmt.Errorf("failed to build trading context: %w", err)
	}

	// Save equity snapshot independently (decoupled from AI decision, used for drawing profit curve)
	at.saveEquitySnapshot(ctx)

	logger.Info(strings.Repeat("=", 70))
	for _, stock := range ctx.CandidateStocks {
		record.CandidateCoins = append(record.CandidateCoins, stock.Symbol)
	}

	logger.Infof("📊 Account equity: %.2f USDT | Available: %.2f USDT | Positions: %d",
		ctx.Account.TotalEquity, ctx.Account.AvailableBalance, ctx.Account.PositionCount)

	// 5. Use strategy engine to call AI for decision
	logger.Infof("🤖 Requesting AI analysis and decision... [Strategy Engine]")
	aiDecision, err := decision.GetFullDecisionWithStrategy(ctx, at.mcpClient, at.strategyEngine, "balanced")

	// [Bulletproof] Trigger Algorithmic Fallback if AI API fails (Quota limit, etc.)
	if err != nil {
		errStr := err.Error()
		// Catch 429: Resource Exhausted (Quota), or generic AI call failure
		if strings.Contains(errStr, "429") || strings.Contains(errStr, "RESOURCE_EXHAUSTED") ||
			strings.Contains(errStr, "AI API call failed") {
			logger.Warnf("⚠️ AI API Failure detected: %v", err)
			logger.Infof("🛡️ [Bulletproof] Triggering Algorithmic Fallback...")

			fallbackDecision, fallbackErr := decision.GetAlgorithmicDecision(ctx, at.strategyEngine)
			if fallbackErr != nil {
				logger.Errorf("❌ Fallback failed with error: %v", fallbackErr)
			} else if fallbackDecision == nil {
				logger.Errorf("❌ Fallback returned nil decision")
			}

			if fallbackErr == nil && fallbackDecision != nil {
				logger.Infof("✅ Fallback SUCCESS: Proceeding with technical algorithm")
				aiDecision = fallbackDecision
				err = nil // Clear error as we have a fallback decision
				record.ExecutionLog = append(record.ExecutionLog, "Fallback: Triggered technical algorithm due to AI failure")
			}
		}
	}

	if aiDecision != nil && aiDecision.AIRequestDurationMs > 0 {
		record.AIRequestDurationMs = aiDecision.AIRequestDurationMs
		logger.Infof("⏱️ AI call duration: %.2f seconds", float64(record.AIRequestDurationMs)/1000)
		record.ExecutionLog = append(record.ExecutionLog,
			fmt.Sprintf("AI call duration: %d ms", record.AIRequestDurationMs))
	}

	// Save chain of thought, decisions, and input prompt even if there's an error (for debugging)
	if aiDecision != nil {
		record.SystemPrompt = aiDecision.SystemPrompt // Save system prompt
		record.InputPrompt = aiDecision.UserPrompt
		record.CoTTrace = aiDecision.CoTTrace
		record.RawResponse = aiDecision.RawResponse // Save raw AI response for debugging
		if len(aiDecision.Decisions) > 0 {
			decisionJSON, _ := json.MarshalIndent(aiDecision.Decisions, "", "  ")
			record.DecisionJSON = string(decisionJSON)
		}
	}

	if err != nil {
		record.Success = false
		record.ErrorMessage = fmt.Sprintf("Failed to get AI decision: %v", err)

		// Print system prompt and AI chain of thought (output even with errors for debugging)
		if aiDecision != nil {
			logger.Info("\n" + strings.Repeat("=", 70) + "\n")
			logger.Infof("📋 System prompt (error case)")
			logger.Info(strings.Repeat("=", 70))
			logger.Info(aiDecision.SystemPrompt)
			logger.Info(strings.Repeat("=", 70))

			if aiDecision.CoTTrace != "" {
				logger.Info("\n" + strings.Repeat("-", 70) + "\n")
				logger.Info("💭 AI chain of thought analysis (error case):")
				logger.Info(strings.Repeat("-", 70))
				logger.Info(aiDecision.CoTTrace)
				logger.Info(strings.Repeat("-", 70))
			}
		}

		at.saveDecision(record)
		return fmt.Errorf("failed to get AI decision: %w", err)
	}

	// // 5. Print system prompt
	// logger.Infof("\n" + strings.Repeat("=", 70))
	// logger.Infof("📋 System prompt [template: %s]", at.systemPromptTemplate)
	// logger.Info(strings.Repeat("=", 70))
	// logger.Info(decision.SystemPrompt)
	// logger.Infof(strings.Repeat("=", 70) + "\n")

	// 6. Print AI chain of thought
	// logger.Infof("\n" + strings.Repeat("-", 70))
	// logger.Info("💭 AI chain of thought analysis:")
	// logger.Info(strings.Repeat("-", 70))
	// logger.Info(decision.CoTTrace)
	// logger.Infof(strings.Repeat("-", 70) + "\n")

	// 7. Print AI decisions
	// logger.Infof("📋 AI decision list (%d items):\n", len(decision.Decisions))
	// for i, d := range decision.Decisions {
	//     logger.Infof("  [%d] %s: %s - %s", i+1, d.Symbol, d.Action, d.Reasoning)
	//     if d.Action == "open_long" || d.Action == "open_short" {
	//        logger.Infof("      Leverage: %dx | Position: %.2f USDT | Stop loss: %.4f | Take profit: %.4f",
	//           d.Leverage, d.PositionSizeUSD, d.StopLoss, d.TakeProfit)
	//     }
	// }
	logger.Info()
	logger.Info(strings.Repeat("-", 70))
	// 8. Sort decisions: ensure close positions first, then open positions (prevent position stacking overflow)
	logger.Info(strings.Repeat("-", 70))

	// 8. Sort decisions: ensure close positions first, then open positions (prevent position stacking overflow)
	sortedDecisions := sortDecisionsByPriority(aiDecision.Decisions)

	logger.Info("🔄 Execution order (optimized): Close positions first → Open positions later")
	for i, d := range sortedDecisions {
		logger.Infof("  [%d] %s %s", i+1, d.Symbol, d.Action)
	}
	logger.Info()

	// Execute decisions and record results
	for _, d := range sortedDecisions {
		actionRecord := store.DecisionAction{
			Action:     d.Action,
			Symbol:     d.Symbol,
			Quantity:   0,
			Leverage:   d.Leverage,
			Price:      0,
			StopLoss:   d.StopLoss,
			TakeProfit: d.TakeProfit,
			Confidence: d.Confidence,
			Reasoning:  d.Reasoning,
			Timestamp:  time.Now(),
			Success:    false,
		}

		if err := at.executeDecisionWithRecord(&d, &actionRecord); err != nil {
			logger.Infof("❌ Failed to execute decision (%s %s): %v", d.Symbol, d.Action, err)
			actionRecord.Error = err.Error()
			record.ExecutionLog = append(record.ExecutionLog, fmt.Sprintf("❌ %s %s failed: %v", d.Symbol, d.Action, err))
		} else {
			actionRecord.Success = true
			record.ExecutionLog = append(record.ExecutionLog, fmt.Sprintf("✓ %s %s succeeded", d.Symbol, d.Action))
			// Brief delay after successful execution
			time.Sleep(1 * time.Second)
		}

		record.Decisions = append(record.Decisions, actionRecord)
	}

	// 9. Save decision record
	if err := at.saveDecision(record); err != nil {
		logger.Infof("⚠ Failed to save decision record: %v", err)
	}

	return nil
}

// buildTradingContext builds trading context
func (at *AutoTrader) buildTradingContext() (*decision.Context, error) {
	// 1. Get account information (account-wide)
	balance, err := at.trader.GetBalance()
	if err != nil {
		return nil, fmt.Errorf("failed to get account balance: %w", err)
	}

	// Get account fields
	availableBalance := 0.0

	if avail, ok := balance["availableBalance"].(float64); ok {
		availableBalance = avail
	}

	// 2. Get all exchange positions
	exchangePositions, err := at.trader.GetPositions()
	if err != nil {
		return nil, fmt.Errorf("failed to get positions: %w", err)
	}

	// Filter positions by trader_id using internal database
	var positionInfos []decision.PositionInfo
	totalUnrealizedPnL := 0.0
	totalMarginUsed := 0.0

	// Current position key set (for cleaning up closed position records)
	currentPositionKeys := make(map[string]bool)

	for _, pos := range exchangePositions {
		symbol := pos["symbol"].(string)
		side := pos["side"].(string)

		// Check if this position belongs to the current trader in our database
		if at.store != nil {
			dbPos, err := at.store.Position().GetOpenPositionBySymbol(at.id, symbol, side)
			if err != nil || dbPos == nil {
				continue // Skip positions that don't belong to this trader
			}
		}

		markPrice := pos["markPrice"].(float64)
		entryPrice := pos["entryPrice"].(float64)
		quantity := pos["positionAmt"].(float64)
		if quantity < 0 {
			quantity = -quantity // Short position quantity is negative, convert to positive
		}

		// Skip closed positions (quantity = 0), prevent "ghost positions" from being passed to AI
		if quantity == 0 {
			continue
		}

		unrealizedPnl := pos["unRealizedProfit"].(float64)
		totalUnrealizedPnL += unrealizedPnl
		liquidationPrice := pos["liquidationPrice"].(float64)

		// Calculate margin used (estimated)
		leverage := 10 // Default value, should actually be fetched from position info
		if lev, ok := pos["leverage"].(float64); ok {
			leverage = int(lev)
		}
		marginUsed := (quantity * markPrice) / float64(leverage)
		totalMarginUsed += marginUsed

		// Calculate P&L percentage (based on margin, considering leverage)
		pnlPct := calculatePnLPercentage(unrealizedPnl, marginUsed)

		// Get position open time from exchange (preferred) or fallback to local tracking
		posKey := symbol + "_" + side
		currentPositionKeys[posKey] = true

		var updateTime int64
		// Priority 1: Get from database (trader_positions table) - most accurate
		if at.store != nil {
			if dbPos, err := at.store.Position().GetOpenPositionBySymbol(at.id, symbol, side); err == nil && dbPos != nil {
				if !dbPos.EntryTime.IsZero() {
					updateTime = dbPos.EntryTime.UnixMilli()
				}
			}
		}
		// Priority 2: Get from exchange API (Bybit: createdTime, OKX: createdTime)
		if updateTime == 0 {
			if createdTime, ok := pos["createdTime"].(int64); ok && createdTime > 0 {
				updateTime = createdTime
			}
		}
		// Priority 3: Fallback to local tracking
		if updateTime == 0 {
			if _, exists := at.positionFirstSeenTime[posKey]; !exists {
				at.positionFirstSeenTime[posKey] = time.Now().UnixMilli()
			}
			updateTime = at.positionFirstSeenTime[posKey]
		}

		// Get peak profit rate for this position
		at.peakPnLCacheMutex.RLock()
		peakPnlPct := at.peakPnLCache[posKey]
		at.peakPnLCacheMutex.RUnlock()

		positionInfos = append(positionInfos, decision.PositionInfo{
			Symbol:           symbol,
			Side:             side,
			EntryPrice:       entryPrice,
			MarkPrice:        markPrice,
			Quantity:         quantity,
			Leverage:         leverage,
			UnrealizedPnL:    unrealizedPnl,
			UnrealizedPnLPct: pnlPct,
			PeakPnLPct:       peakPnlPct,
			LiquidationPrice: liquidationPrice,
			MarginUsed:       marginUsed,
			UpdateTime:       updateTime,
		})
	}

	// Clean up closed position records
	for key := range at.positionFirstSeenTime {
		if !currentPositionKeys[key] {
			delete(at.positionFirstSeenTime, key)
		}
	}

	// 3. Use strategy engine to get candidate coins (must have strategy engine)
	if at.strategyEngine == nil {
		return nil, fmt.Errorf("trader has no strategy engine configured")
	}
	candidateStocks, err := at.strategyEngine.GetCandidateStocks()
	if err != nil {
		return nil, fmt.Errorf("failed to get candidate stocks: %w", err)
	}
	logger.Infof("📋 [%s] Strategy engine fetched candidate stocks: %d", at.name, len(candidateStocks))

	// 4. Get Realized PnL from historical closed positions in DB
	realizedPnL := 0.0
	if at.store != nil {
		if stats, err := at.store.Position().GetFullStats(at.id); err == nil && stats != nil {
			realizedPnL = stats.TotalPnL
		}
	}

	// Calculate Virtual Equity for this trader:
	// Virtual Equity = Initial Balance + Realized PnL + Unrealized PnL
	totalEquity := at.initialBalance + realizedPnL + totalUnrealizedPnL

	totalPnL := totalEquity - at.initialBalance
	totalPnLPct := 0.0
	if at.initialBalance > 0 {
		totalPnLPct = (totalPnL / at.initialBalance) * 100
	}

	marginUsedPct := 0.0
	if totalEquity > 0 {
		marginUsedPct = (totalMarginUsed / totalEquity) * 100
	}

	// 5. Get leverage from strategy config
	strategyConfig := at.strategyEngine.GetConfig()
	btcEthLeverage := strategyConfig.RiskControl.LargeCapMaxMargin
	altcoinLeverage := strategyConfig.RiskControl.SmallCapMaxMargin
	logger.Infof("📋 [%s] Strategy leverage config: BTC/ETH=%dx, Altcoin=%dx", at.name, btcEthLeverage, altcoinLeverage)

	// 6. Build context
	ctx := &decision.Context{
		CurrentTime:      time.Now().UTC().Format("2006-01-02 15:04:05 UTC"),
		RuntimeMinutes:   int(time.Since(at.startTime).Minutes()),
		CallCount:        at.callCount,
		LargeCapLeverage: btcEthLeverage,
		SmallCapLeverage: altcoinLeverage,
		Account: decision.AccountInfo{
			TotalEquity:      totalEquity,
			AvailableBalance: availableBalance,
			UnrealizedPnL:    totalUnrealizedPnL,
			TotalPnL:         totalPnL,
			TotalPnLPct:      totalPnLPct,
			MarginUsed:       totalMarginUsed,
			MarginUsedPct:    marginUsedPct,
			PositionCount:    len(positionInfos),
		},
		Positions:       positionInfos,
		CandidateStocks: candidateStocks,
	}

	// 7. Add recent closed trades (if store is available)
	if at.store != nil {
		// Get recent 10 closed trades for AI context
		recentTrades, err := at.store.Position().GetRecentTrades(at.id, 10)
		if err != nil {
			logger.Infof("⚠️ [%s] Failed to get recent trades: %v", at.name, err)
		} else {
			logger.Infof("📊 [%s] Found %d recent closed trades for AI context", at.name, len(recentTrades))
			for _, trade := range recentTrades {
				ctx.RecentOrders = append(ctx.RecentOrders, decision.RecentOrder{
					Symbol:       trade.Symbol,
					Side:         trade.Side,
					EntryPrice:   trade.EntryPrice,
					ExitPrice:    trade.ExitPrice,
					RealizedPnL:  trade.RealizedPnL,
					PnLPct:       trade.PnLPct,
					EntryTime:    trade.EntryTime,
					ExitTime:     trade.ExitTime,
					HoldDuration: trade.HoldDuration,
				})
			}
		}
	} else {
		logger.Infof("⚠️ [%s] Store is nil, cannot get recent trades", at.name)
	}

	// 8. Get quantitative data (if enabled in strategy config)
	if strategyConfig.Indicators.EnableQuantData && strategyConfig.Indicators.QuantDataAPIURL != "" {
		// Collect symbols to query (candidate coins + position coins)
		symbolsToQuery := make(map[string]bool)
		for _, stock := range candidateStocks {
			symbolsToQuery[stock.Symbol] = true
		}
		for _, pos := range positionInfos {
			symbolsToQuery[pos.Symbol] = true
		}

		symbols := make([]string, 0, len(symbolsToQuery))
		for sym := range symbolsToQuery {
			symbols = append(symbols, sym)
		}

		logger.Infof("📊 [%s] Fetching quantitative data for %d symbols...", at.name, len(symbols))
		ctx.QuantDataMap = at.strategyEngine.FetchQuantDataBatch(symbols)
		logger.Infof("📊 [%s] Successfully fetched quantitative data for %d symbols", at.name, len(ctx.QuantDataMap))
	}

	// 9. Get OI ranking data (market-wide position changes)
	if strategyConfig.Indicators.EnableOIRanking {
		logger.Infof("📊 [%s] Fetching OI ranking data...", at.name)
		ctx.OIRankingData = at.strategyEngine.FetchOIRankingData()
		if ctx.OIRankingData != nil {
			logger.Infof("📊 [%s] OI ranking data ready: %d top, %d low positions",
				at.name, len(ctx.OIRankingData.TopPositions), len(ctx.OIRankingData.LowPositions))
		}
	}

	return ctx, nil
}

// executeDecisionWithRecord executes AI decision and records detailed information
func (at *AutoTrader) executeDecisionWithRecord(decision *decision.Decision, actionRecord *store.DecisionAction) error {
	switch decision.Action {
	case "open_long":
		return at.executeOpenLongWithRecord(decision, actionRecord)
	case "open_short":
		return at.executeOpenShortWithRecord(decision, actionRecord)
	case "close_long":
		return at.executeCloseLongWithRecord(decision, actionRecord)
	case "close_short":
		return at.executeCloseShortWithRecord(decision, actionRecord)
	case "hold", "wait":
		// No execution needed, just record
		return nil
	default:
		return fmt.Errorf("unknown action: %s", decision.Action)
	}
}

// ExecuteDecision executes a trading decision from external sources (e.g., debate consensus)
// This is a public method that can be called by other modules
func (at *AutoTrader) ExecuteDecision(d *decision.Decision) error {
	logger.Infof("[%s] Executing external decision: %s %s", at.name, d.Action, d.Symbol)

	// Create a minimal action record for tracking
	actionRecord := &store.DecisionAction{
		Symbol:     d.Symbol,
		Action:     d.Action,
		Leverage:   d.Leverage,
		StopLoss:   d.StopLoss,
		TakeProfit: d.TakeProfit,
		Confidence: d.Confidence,
		Reasoning:  d.Reasoning,
	}

	// Execute the decision
	err := at.executeDecisionWithRecord(d, actionRecord)
	if err != nil {
		logger.Errorf("[%s] External decision execution failed: %v", at.name, err)
		return err
	}

	logger.Infof("[%s] External decision executed successfully: %s %s", at.name, d.Action, d.Symbol)
	return nil
}

// calculateSmartLimitPrice calculates optimal limit price using VWAP ± ATR (Phase 2: Smart Order Execution)
func (at *AutoTrader) calculateSmartLimitPrice(symbol string, side string, atrMultiplier float64) (float64, error) {
	// Get market data with VWAP and ATR
	marketData, err := market.Get(symbol)
	if err != nil {
		return 0, fmt.Errorf("failed to get market data: %w", err)
	}

	// Get primary timeframe data (default: 15m or first available)
	var vwap, atr float64
	if marketData.TimeframeData != nil {
		// Try to get 15m timeframe first
		if tf15m, ok := marketData.TimeframeData["15m"]; ok && tf15m != nil {
			vwap = tf15m.CurrentVWAP
			atr = tf15m.ATR14
		} else {
			// Fall back to first available timeframe
			for _, tfData := range marketData.TimeframeData {
				if tfData != nil {
					vwap = tfData.CurrentVWAP
					atr = tfData.ATR14
					break
				}
			}
		}
	}

	// Fallback to current price if VWAP not available
	if vwap == 0 {
		vwap = marketData.CurrentPrice
		logger.Infof("⚠️ VWAP not available for %s, using current price: $%.2f", symbol, vwap)
	}

	// Fallback to price-based ATR estimate if ATR not available (2% of price)
	if atr == 0 {
		atr = marketData.CurrentPrice * 0.02
		logger.Infof("⚠️ ATR not available for %s, using 2%% estimate: $%.2f", symbol, atr)
	}

	// Calculate limit price: VWAP ± (ATR × multiplier)
	var limitPrice float64
	if side == "buy" {
		// Buy limit: below market to reduce slippage
		limitPrice = vwap - (atr * atrMultiplier)
		logger.Infof("📊 Smart BUY limit: VWAP $%.2f - (ATR $%.2f × %.2f) = $%.2f",
			vwap, atr, atrMultiplier, limitPrice)
	} else {
		// Sell limit: above market to reduce slippage
		limitPrice = vwap + (atr * atrMultiplier)
		logger.Infof("📊 Smart SELL limit: VWAP $%.2f + (ATR $%.2f × %.2f) = $%.2f",
			vwap, atr, atrMultiplier, limitPrice)
	}

	return limitPrice, nil
}

// executeWithSmartOrders wraps order execution with smart limit order logic (Phase 2)
func (at *AutoTrader) executeWithSmartOrders(symbol, side string, quantity float64, leverage int) (map[string]interface{}, error) {
	// Check if smart limit orders are enabled
	execConfig := at.config.StrategyConfig.Execution

	if !execConfig.EnableLimitOrders {
		// Default: use market orders
		logger.Infof("  💨 Using market order (smart orders disabled)")
		if side == "buy" {
			return at.trader.OpenLong(symbol, quantity, leverage)
		} else {
			return at.trader.OpenShort(symbol, quantity, leverage)
		}
	}

	// Smart limit order execution
	logger.Infof("  🎯 Using smart limit order (VWAP ± ATR)")

	// Calculate optimal limit price
	limitPrice, err := at.calculateSmartLimitPrice(symbol, side, execConfig.LimitOffsetATRMult)
	if err != nil {
		logger.Infof("  ⚠️ Failed to calculate limit price, falling back to market: %v", err)
		if side == "buy" {
			return at.trader.OpenLong(symbol, quantity, leverage)
		} else {
			return at.trader.OpenShort(symbol, quantity, leverage)
		}
	}

	// Place limit order
	alpacaTrader, ok := at.trader.(*AlpacaTrader)
	if !ok {
		logger.Infof("  ⚠️ Smart orders only supported for Alpaca, using market order")
		if side == "buy" {
			return at.trader.OpenLong(symbol, quantity, leverage)
		} else {
			return at.trader.OpenShort(symbol, quantity, leverage)
		}
	}

	order, err := alpacaTrader.PlaceLimitOrder(symbol, side, quantity, limitPrice)
	if err != nil {
		logger.Infof("  ⚠️ Failed to place limit order, falling back to market: %v", err)
		if side == "buy" {
			return at.trader.OpenLong(symbol, quantity, leverage)
		} else {
			return at.trader.OpenShort(symbol, quantity, leverage)
		}
	}

	// Extract order ID
	orderID := ""
	if id, ok := order["id"].(string); ok {
		orderID = id
	}

	if orderID == "" {
		logger.Infof("  ⚠️ No order ID returned, assuming market order")
		return order, nil
	}

	// Wait for fill with timeout
	timeout := execConfig.LimitTimeoutSeconds
	if timeout <= 0 {
		timeout = 5 // Default 5 seconds
	}

	filled, err := alpacaTrader.WaitForFill(orderID, timeout)
	if err != nil {
		logger.Infof("  ⚠️ Error waiting for fill: %v", err)
	}

	if !filled {
		// Timeout: cancel limit order and use market order
		logger.Infof("  ⏱️ Limit order not filled within %ds, canceling and using market order", timeout)
		alpacaTrader.CancelOrder(orderID)

		if side == "buy" {
			return at.trader.OpenLong(symbol, quantity, leverage)
		} else {
			return at.trader.OpenShort(symbol, quantity, leverage)
		}
	}

	// Success: limit order filled
	logger.Infof("  ✅ Limit order filled at $%.2f (saved slippage!)", limitPrice)
	return order, nil
}

// executeOpenLongWithRecord executes open long position and records detailed information
func (at *AutoTrader) executeOpenLongWithRecord(decision *decision.Decision, actionRecord *store.DecisionAction) error {
	logger.Infof("  📈 Open long: %s", decision.Symbol)

	// ⚠️ Get current positions for multiple checks
	positions, err := at.trader.GetPositions()
	if err != nil {
		return fmt.Errorf("failed to get positions: %w", err)
	}

	// [CODE ENFORCED] Check max positions limit
	if err := at.enforceMaxPositions(len(positions)); err != nil {
		return err
	}

	// Check if there's already a position in the same symbol and direction
	for _, pos := range positions {
		if pos["symbol"] == decision.Symbol && pos["side"] == "long" {
			return fmt.Errorf("❌ %s already has long position, close it first", decision.Symbol)
		}
	}

	// Get current price
	marketData, err := market.Get(decision.Symbol)
	if err != nil {
		return err
	}

	// Get balance (needed for multiple checks)
	balance, err := at.trader.GetBalance()
	if err != nil {
		return fmt.Errorf("failed to get account balance: %w", err)
	}
	availableBalance := 0.0
	if avail, ok := balance["availableBalance"].(float64); ok {
		availableBalance = avail
	}

	// Get equity for position value ratio check
	equity := 0.0
	if eq, ok := balance["totalEquity"].(float64); ok && eq > 0 {
		equity = eq
	} else if eq, ok := balance["totalWalletBalance"].(float64); ok && eq > 0 {
		equity = eq
	} else {
		equity = availableBalance // Fallback to available balance
	}

	// [CODE ENFORCED] Position Value Ratio Check: position_value <= equity × ratio
	adjustedPositionSize, wasCapped := at.enforcePositionValueRatio(decision.PositionSizeUSD, equity, decision.Symbol)
	if wasCapped {
		decision.PositionSizeUSD = adjustedPositionSize
	}

	// ⚠️ Auto-adjust position size if insufficient margin
	// Formula: totalRequired = positionSize/leverage + positionSize*0.001 + positionSize/leverage*0.01
	//        = positionSize * (1.01/leverage + 0.001)
	marginFactor := 1.01/float64(decision.Leverage) + 0.001
	maxAffordablePositionSize := availableBalance / marginFactor

	actualPositionSize := decision.PositionSizeUSD
	if actualPositionSize > maxAffordablePositionSize {
		// Use 98% of max to leave buffer for price fluctuation
		adjustedSize := maxAffordablePositionSize * 0.98
		logger.Infof("  ⚠️ Position size %.2f exceeds max affordable %.2f, auto-reducing to %.2f",
			actualPositionSize, maxAffordablePositionSize, adjustedSize)
		actualPositionSize = adjustedSize
		decision.PositionSizeUSD = actualPositionSize
	}

	// [CODE ENFORCED] Minimum position size check
	if err := at.enforceMinPositionSize(decision.PositionSizeUSD); err != nil {
		return err
	}

	// Calculate quantity with adjusted position size
	quantity := actualPositionSize / marketData.CurrentPrice
	actionRecord.Quantity = quantity
	actionRecord.Price = marketData.CurrentPrice

	// Set margin mode
	if err := at.trader.SetMarginMode(decision.Symbol, at.config.IsCrossMargin); err != nil {
		logger.Infof("  ⚠️ Failed to set margin mode: %v", err)
		// Continue execution, doesn't affect trading
	}

	// Open position (Phase 2: Smart Order Execution if enabled)
	order, err := at.executeWithSmartOrders(decision.Symbol, "buy", quantity, decision.Leverage)
	if err != nil {
		return err
	}

	// Record order ID
	if orderID, ok := order["orderId"].(int64); ok {
		actionRecord.OrderID = orderID
	}

	logger.Infof("  ✓ Position opened successfully, order ID: %v, quantity: %.4f", order["orderId"], quantity)

	// Record order to database and poll for confirmation
	at.recordAndConfirmOrder(order, decision.Symbol, "open_long", quantity, marketData.CurrentPrice, decision.Leverage, 0)

	// Record position opening time
	posKey := decision.Symbol + "_long"
	at.positionFirstSeenTime[posKey] = time.Now().UnixMilli()

	// Set stop loss and take profit
	if err := at.trader.SetStopLoss(decision.Symbol, "LONG", quantity, decision.StopLoss); err != nil {
		logger.Infof("  ⚠ Failed to set stop loss: %v", err)
	}
	if err := at.trader.SetTakeProfit(decision.Symbol, "LONG", quantity, decision.TakeProfit); err != nil {
		logger.Infof("  ⚠ Failed to set take profit: %v", err)
	}

	return nil
}

// executeOpenShortWithRecord executes open short position and records detailed information
func (at *AutoTrader) executeOpenShortWithRecord(decision *decision.Decision, actionRecord *store.DecisionAction) error {
	logger.Infof("  📉 Open short: %s", decision.Symbol)

	// ⚠️ Get current positions for multiple checks
	positions, err := at.trader.GetPositions()
	if err != nil {
		return fmt.Errorf("failed to get positions: %w", err)
	}

	// [CODE ENFORCED] Check max positions limit
	if err := at.enforceMaxPositions(len(positions)); err != nil {
		return err
	}

	// Check if there's already a position in the same symbol and direction
	for _, pos := range positions {
		if pos["symbol"] == decision.Symbol && pos["side"] == "short" {
			return fmt.Errorf("❌ %s already has short position, close it first", decision.Symbol)
		}
	}

	// Get current price
	marketData, err := market.Get(decision.Symbol)
	if err != nil {
		return err
	}

	// Get balance (needed for multiple checks)
	balance, err := at.trader.GetBalance()
	if err != nil {
		return fmt.Errorf("failed to get account balance: %w", err)
	}
	availableBalance := 0.0
	if avail, ok := balance["availableBalance"].(float64); ok {
		availableBalance = avail
	}

	// Get equity for position value ratio check
	equity := 0.0
	if eq, ok := balance["totalEquity"].(float64); ok && eq > 0 {
		equity = eq
	} else if eq, ok := balance["totalWalletBalance"].(float64); ok && eq > 0 {
		equity = eq
	} else {
		equity = availableBalance // Fallback to available balance
	}

	// [CODE ENFORCED] Position Value Ratio Check: position_value <= equity × ratio
	adjustedPositionSize, wasCapped := at.enforcePositionValueRatio(decision.PositionSizeUSD, equity, decision.Symbol)
	if wasCapped {
		decision.PositionSizeUSD = adjustedPositionSize
	}

	// ⚠️ Auto-adjust position size if insufficient margin
	// Formula: totalRequired = positionSize/leverage + positionSize*0.001 + positionSize/leverage*0.01
	//        = positionSize * (1.01/leverage + 0.001)
	marginFactor := 1.01/float64(decision.Leverage) + 0.001
	maxAffordablePositionSize := availableBalance / marginFactor

	actualPositionSize := decision.PositionSizeUSD
	if actualPositionSize > maxAffordablePositionSize {
		// Use 98% of max to leave buffer for price fluctuation
		adjustedSize := maxAffordablePositionSize * 0.98
		logger.Infof("  ⚠️ Position size %.2f exceeds max affordable %.2f, auto-reducing to %.2f",
			actualPositionSize, maxAffordablePositionSize, adjustedSize)
		actualPositionSize = adjustedSize
		decision.PositionSizeUSD = actualPositionSize
	}

	// [CODE ENFORCED] Minimum position size check
	if err := at.enforceMinPositionSize(decision.PositionSizeUSD); err != nil {
		return err
	}

	// Calculate quantity with adjusted position size
	quantity := actualPositionSize / marketData.CurrentPrice
	actionRecord.Quantity = quantity
	actionRecord.Price = marketData.CurrentPrice

	// Set margin mode
	if err := at.trader.SetMarginMode(decision.Symbol, at.config.IsCrossMargin); err != nil {
		logger.Infof("  ⚠️ Failed to set margin mode: %v", err)
		// Continue execution, doesn't affect trading
	}

	// Open short position (Phase 2: Smart Order Execution if enabled)
	order, err := at.executeWithSmartOrders(decision.Symbol, "sell", quantity, decision.Leverage)
	if err != nil {
		return err
	}

	// Record order ID
	if orderID, ok := order["orderId"].(int64); ok {
		actionRecord.OrderID = orderID
	}

	logger.Infof("  ✓ Position opened successfully, order ID: %v, quantity: %.4f", order["orderId"], quantity)

	// Record order to database and poll for confirmation
	at.recordAndConfirmOrder(order, decision.Symbol, "open_short", quantity, marketData.CurrentPrice, decision.Leverage, 0)

	// Record position opening time
	posKey := decision.Symbol + "_short"
	at.positionFirstSeenTime[posKey] = time.Now().UnixMilli()

	// Set stop loss and take profit
	if err := at.trader.SetStopLoss(decision.Symbol, "SHORT", quantity, decision.StopLoss); err != nil {
		logger.Infof("  ⚠ Failed to set stop loss: %v", err)
	}
	if err := at.trader.SetTakeProfit(decision.Symbol, "SHORT", quantity, decision.TakeProfit); err != nil {
		logger.Infof("  ⚠ Failed to set take profit: %v", err)
	}

	return nil
}

// executeCloseLongWithRecord executes close long position and records detailed information
func (at *AutoTrader) executeCloseLongWithRecord(decision *decision.Decision, actionRecord *store.DecisionAction) error {
	logger.Infof("  🔄 Close long: %s", decision.Symbol)

	// Get current price
	marketData, err := market.Get(decision.Symbol)
	if err != nil {
		return err
	}
	actionRecord.Price = marketData.CurrentPrice

	// Get entry price and quantity from exchange API (most accurate)
	var entryPrice float64
	var quantity float64
	positions, err := at.trader.GetPositions()
	if err == nil {
		for _, pos := range positions {
			if pos["symbol"] == decision.Symbol && pos["side"] == "long" {
				if ep, ok := pos["entryPrice"].(float64); ok {
					entryPrice = ep
				}
				if amt, ok := pos["positionAmt"].(float64); ok && amt > 0 {
					quantity = amt
				}
				break
			}
		}
	}

	// Close position
	order, err := at.trader.CloseLong(decision.Symbol, 0) // 0 = close all
	if err != nil {
		return err
	}

	// Record order ID
	if orderID, ok := order["orderId"].(int64); ok {
		actionRecord.OrderID = orderID
	}

	// Record order to database and poll for confirmation
	at.recordAndConfirmOrder(order, decision.Symbol, "close_long", quantity, marketData.CurrentPrice, 0, entryPrice)

	logger.Infof("  ✓ Position closed successfully")
	return nil
}

// executeCloseShortWithRecord executes close short position and records detailed information
func (at *AutoTrader) executeCloseShortWithRecord(decision *decision.Decision, actionRecord *store.DecisionAction) error {
	logger.Infof("  🔄 Close short: %s", decision.Symbol)

	// Get current price
	marketData, err := market.Get(decision.Symbol)
	if err != nil {
		return err
	}
	actionRecord.Price = marketData.CurrentPrice

	// Get entry price and quantity from exchange API (most accurate)
	var entryPrice float64
	var quantity float64
	positions, err := at.trader.GetPositions()
	if err == nil {
		for _, pos := range positions {
			if pos["symbol"] == decision.Symbol && pos["side"] == "short" {
				if ep, ok := pos["entryPrice"].(float64); ok {
					entryPrice = ep
				}
				if amt, ok := pos["positionAmt"].(float64); ok {
					quantity = -amt // positionAmt is negative for short
				}
				break
			}
		}
	}

	// Close position
	order, err := at.trader.CloseShort(decision.Symbol, 0) // 0 = close all
	if err != nil {
		return err
	}

	// Record order ID
	if orderID, ok := order["orderId"].(int64); ok {
		actionRecord.OrderID = orderID
	}

	// Record order to database and poll for confirmation
	at.recordAndConfirmOrder(order, decision.Symbol, "close_short", quantity, marketData.CurrentPrice, 0, entryPrice)

	logger.Infof("  ✓ Position closed successfully")
	return nil
}

// GetID gets trader ID
func (at *AutoTrader) GetID() string {
	return at.id
}

// GetName gets trader name
func (at *AutoTrader) GetName() string {
	return at.name
}

// GetAIModel gets AI model
func (at *AutoTrader) GetAIModel() string {
	return at.aiModel
}

// GetExchange gets exchange
func (at *AutoTrader) GetExchange() string {
	return at.exchange
}

// GetShowInCompetition returns whether trader should be shown in competition
func (at *AutoTrader) GetShowInCompetition() bool {
	return at.showInCompetition
}

// SetShowInCompetition sets whether trader should be shown in competition
func (at *AutoTrader) SetShowInCompetition(show bool) {
	at.showInCompetition = show
}

// SetCustomPrompt sets custom trading strategy prompt
func (at *AutoTrader) SetCustomPrompt(prompt string) {
	at.customPrompt = prompt
}

// SetOverrideBasePrompt sets whether to override base prompt
func (at *AutoTrader) SetOverrideBasePrompt(override bool) {
	at.overrideBasePrompt = override
}

// GetSystemPromptTemplate gets current system prompt template name (from strategy config)
func (at *AutoTrader) GetSystemPromptTemplate() string {
	if at.strategyEngine != nil {
		config := at.strategyEngine.GetConfig()
		if config.CustomPrompt != "" {
			return "custom"
		}
	}
	return "strategy"
}

// saveEquitySnapshot saves equity snapshot independently (for drawing profit curve, decoupled from AI decision)
func (at *AutoTrader) saveEquitySnapshot(ctx *decision.Context) {
	if at.store == nil || ctx == nil {
		return
	}

	snapshot := &store.EquitySnapshot{
		TraderID:      at.id,
		Timestamp:     time.Now().UTC(),
		TotalEquity:   ctx.Account.TotalEquity,
		Balance:       ctx.Account.TotalEquity - ctx.Account.UnrealizedPnL,
		UnrealizedPnL: ctx.Account.UnrealizedPnL,
		PositionCount: ctx.Account.PositionCount,
		MarginUsedPct: ctx.Account.MarginUsedPct,
	}

	if err := at.store.Equity().Save(snapshot); err != nil {
		logger.Infof("⚠️ Failed to save equity snapshot: %v", err)
	}
}

// saveDecision saves AI decision log to database (only records AI input/output, for debugging)
func (at *AutoTrader) saveDecision(record *store.DecisionRecord) error {
	if at.store == nil {
		return nil
	}

	at.cycleNumber++
	record.CycleNumber = at.cycleNumber
	record.TraderID = at.id

	if record.Timestamp.IsZero() {
		record.Timestamp = time.Now().UTC()
	}

	if err := at.store.Decision().LogDecision(record); err != nil {
		logger.Infof("⚠️ Failed to save decision record: %v", err)
		return err
	}

	logger.Infof("📝 Decision record saved: trader=%s, cycle=%d", at.id, at.cycleNumber)
	return nil
}

// GetStore gets data store (for external access to decision records, etc.)
func (at *AutoTrader) GetStore() *store.Store {
	return at.store
}

// GetStatus gets system status (for API)
func (at *AutoTrader) GetStatus() map[string]interface{} {
	aiProvider := "DeepSeek"
	if at.config.UseQwen {
		aiProvider = "Qwen"
	}

	return map[string]interface{}{
		"trader_id":       at.id,
		"trader_name":     at.name,
		"ai_model":        at.aiModel,
		"exchange":        at.exchange,
		"is_running":      at.isRunning,
		"start_time":      at.startTime.Format(time.RFC3339),
		"runtime_minutes": int(time.Since(at.startTime).Minutes()),
		"call_count":      at.callCount,
		"initial_balance": at.initialBalance,
		"scan_interval":   at.config.ScanInterval.String(),
		"stop_until":      at.stopUntil.Format(time.RFC3339),
		"last_reset_time": at.lastResetTime.Format(time.RFC3339),
		"ai_provider":     aiProvider,
	}
}

// GetAccountInfo gets account information (for API)
func (at *AutoTrader) GetAccountInfo() (map[string]interface{}, error) {
	balance, err := at.trader.GetBalance()
	if err != nil {
		return nil, fmt.Errorf("failed to get balance: %w", err)
	}

	// Get account fields (account-wide)
	totalWalletBalance := 0.0
	availableBalance := 0.0

	if wallet, ok := balance["totalWalletBalance"].(float64); ok {
		totalWalletBalance = wallet
	}
	if avail, ok := balance["availableBalance"].(float64); ok {
		availableBalance = avail
	}

	// Get all exchange positions
	exchangePositions, err := at.trader.GetPositions()
	if err != nil {
		return nil, fmt.Errorf("failed to get positions: %w", err)
	}

	// Filter positions by trader_id using internal database
	// This ensures that when sharing an account, traders only see their own position P&L
	totalUnrealizedPnL := 0.0
	totalMarginUsed := 0.0
	positionCount := 0

	for _, pos := range exchangePositions {
		symbol := pos["symbol"].(string)
		side := pos["side"].(string)

		// Check if this position belongs to the current trader in our database
		if at.store != nil {
			dbPos, err := at.store.Position().GetOpenPositionBySymbol(at.id, symbol, side)
			if err != nil || dbPos == nil {
				continue // Skip positions that don't belong to this trader
			}
		}

		// Calculate stats for this trader's position
		markPrice := pos["markPrice"].(float64)
		quantity := pos["positionAmt"].(float64)
		if quantity < 0 {
			quantity = -quantity
		}
		unrealizedPnl := pos["unRealizedProfit"].(float64)
		totalUnrealizedPnL += unrealizedPnl
		positionCount++

		leverage := 10
		if lev, ok := pos["leverage"].(float64); ok {
			leverage = int(lev)
		}
		marginUsed := (quantity * markPrice) / float64(leverage)
		totalMarginUsed += marginUsed
	}

	// Get Realized PnL from historical closed positions in DB
	realizedPnL := 0.0
	if at.store != nil {
		if stats, err := at.store.Position().GetFullStats(at.id); err == nil && stats != nil {
			realizedPnL = stats.TotalPnL
		}
	}

	// Calculate Virtual Equity for this trader:
	// Virtual Equity = Initial Balance + Realized PnL + Unrealized PnL
	// This represents the performance of ONLY this trader, decoupled from other traders on the same account
	totalEquity := at.initialBalance + realizedPnL + totalUnrealizedPnL

	totalPnL := realizedPnL + totalUnrealizedPnL
	totalPnLPct := 0.0
	if at.initialBalance > 0 {
		totalPnLPct = (totalPnL / at.initialBalance) * 100
	}

	marginUsedPct := 0.0
	if totalEquity > 0 {
		marginUsedPct = (totalMarginUsed / totalEquity) * 100
	}

	return map[string]interface{}{
		// Core fields (Virtual/Filtered)
		"total_equity":      totalEquity,        // Virtual equity = initial + realized + unrealized
		"wallet_balance":    totalWalletBalance, // Total account wallet balance (shared)
		"unrealized_profit": totalUnrealizedPnL, // Filtered unrealized P&L
		"available_balance": availableBalance,   // Total account available balance (shared)

		// P&L statistics (Trader-specific)
		"total_pnl":       totalPnL,          // Filtered Total P&L
		"total_pnl_pct":   totalPnLPct,       // Filtered P&L percentage
		"initial_balance": at.initialBalance, // Assigned initial balance
		"daily_pnl":       at.dailyPnL,       // Trader-specific daily P&L

		// Position information (Trader-specific)
		"position_count":  positionCount,   // Filtered position count
		"margin_used":     totalMarginUsed, // Filtered margin used
		"margin_used_pct": marginUsedPct,   // Filtered margin usage rate
	}, nil
}

// GetPositions gets position list (for API)
func (at *AutoTrader) GetPositions() ([]map[string]interface{}, error) {
	positions, err := at.trader.GetPositions()
	if err != nil {
		return nil, fmt.Errorf("failed to get positions: %w", err)
	}

	var result []map[string]interface{}
	for _, pos := range positions {
		symbol := pos["symbol"].(string)
		side := pos["side"].(string)
		entryPrice := pos["entryPrice"].(float64)
		markPrice := pos["markPrice"].(float64)
		quantity := pos["positionAmt"].(float64)
		if quantity < 0 {
			quantity = -quantity
		}
		unrealizedPnl := pos["unRealizedProfit"].(float64)
		liquidationPrice := pos["liquidationPrice"].(float64)

		leverage := 10
		if lev, ok := pos["leverage"].(float64); ok {
			leverage = int(lev)
		}

		// Calculate margin used
		marginUsed := (quantity * markPrice) / float64(leverage)

		// Calculate P&L percentage (based on margin)
		pnlPct := calculatePnLPercentage(unrealizedPnl, marginUsed)

		result = append(result, map[string]interface{}{
			"symbol":             symbol,
			"side":               side,
			"entry_price":        entryPrice,
			"mark_price":         markPrice,
			"quantity":           quantity,
			"leverage":           leverage,
			"unrealized_pnl":     unrealizedPnl,
			"unrealized_pnl_pct": pnlPct,
			"liquidation_price":  liquidationPrice,
			"margin_used":        marginUsed,
		})
	}

	return result, nil
}

// calculatePnLPercentage calculates P&L percentage (based on margin, automatically considers leverage)
// Return rate = Unrealized P&L / Margin × 100%
func calculatePnLPercentage(unrealizedPnl, marginUsed float64) float64 {
	if marginUsed > 0 {
		return (unrealizedPnl / marginUsed) * 100
	}
	return 0.0
}

// sortDecisionsByPriority sorts decisions: close positions first, then open positions, finally hold/wait
// This avoids position stacking overflow when changing positions
func sortDecisionsByPriority(decisions []decision.Decision) []decision.Decision {
	if len(decisions) <= 1 {
		return decisions
	}

	// Define priority
	getActionPriority := func(action string) int {
		switch action {
		case "close_long", "close_short":
			return 1 // Highest priority: close positions first
		case "open_long", "open_short":
			return 2 // Second priority: open positions later
		case "hold", "wait":
			return 3 // Lowest priority: wait
		default:
			return 999 // Unknown actions at the end
		}
	}

	// Copy decision list
	sorted := make([]decision.Decision, len(decisions))
	copy(sorted, decisions)

	// Sort by priority
	for i := 0; i < len(sorted)-1; i++ {
		for j := i + 1; j < len(sorted); j++ {
			if getActionPriority(sorted[i].Action) > getActionPriority(sorted[j].Action) {
				sorted[i], sorted[j] = sorted[j], sorted[i]
			}
		}
	}

	return sorted
}

// startDrawdownMonitor starts drawdown monitoring
func (at *AutoTrader) startDrawdownMonitor() {
	at.monitorWg.Add(1)
	go func() {
		defer at.monitorWg.Done()

		ticker := time.NewTicker(1 * time.Minute) // Check every minute
		defer ticker.Stop()

		logger.Info("📊 Started position drawdown monitoring (check every minute)")

		for {
			select {
			case <-ticker.C:
				at.checkPositionDrawdown()
			case <-at.stopMonitorCh:
				logger.Info("⏹ Stopped position drawdown monitoring")
				return
			}
		}
	}()
}

// checkPositionDrawdown checks position drawdown situation
func (at *AutoTrader) checkPositionDrawdown() {
	// Get current positions
	positions, err := at.trader.GetPositions()
	if err != nil {
		logger.Infof("❌ Drawdown monitoring: failed to get positions: %v", err)
		return
	}

	for _, pos := range positions {
		symbol := pos["symbol"].(string)
		side := pos["side"].(string)
		entryPrice := pos["entryPrice"].(float64)
		markPrice := pos["markPrice"].(float64)
		quantity := pos["positionAmt"].(float64)
		if quantity < 0 {
			quantity = -quantity // Short position quantity is negative, convert to positive
		}

		// Calculate current P&L percentage
		leverage := 10 // Default value
		if lev, ok := pos["leverage"].(float64); ok {
			leverage = int(lev)
		}

		var currentPnLPct float64
		if side == "long" {
			currentPnLPct = ((markPrice - entryPrice) / entryPrice) * float64(leverage) * 100
		} else {
			currentPnLPct = ((entryPrice - markPrice) / entryPrice) * float64(leverage) * 100
		}

		// Construct unique position identifier (distinguish long/short)
		posKey := symbol + "_" + side

		// Get historical peak profit for this position
		at.peakPnLCacheMutex.RLock()
		peakPnLPct, exists := at.peakPnLCache[posKey]
		at.peakPnLCacheMutex.RUnlock()

		if !exists {
			// If no historical peak record, use current P&L as initial value
			peakPnLPct = currentPnLPct
			at.UpdatePeakPnL(symbol, side, currentPnLPct)
		} else {
			// Update peak cache
			at.UpdatePeakPnL(symbol, side, currentPnLPct)
		}

		// Calculate drawdown (magnitude of decline from peak)
		var drawdownPct float64
		if peakPnLPct > 0 && currentPnLPct < peakPnLPct {
			drawdownPct = ((peakPnLPct - currentPnLPct) / peakPnLPct) * 100
		}

		// Check close position condition: profit > 5% and drawdown >= 40%
		if currentPnLPct > 5.0 && drawdownPct >= 40.0 {
			logger.Infof("🚨 Drawdown close position condition triggered: %s %s | Current profit: %.2f%% | Peak profit: %.2f%% | Drawdown: %.2f%%",
				symbol, side, currentPnLPct, peakPnLPct, drawdownPct)

			// Execute close position
			if err := at.emergencyClosePosition(symbol, side); err != nil {
				logger.Infof("❌ Drawdown close position failed (%s %s): %v", symbol, side, err)
			} else {
				logger.Infof("✅ Drawdown close position succeeded: %s %s", symbol, side)
				// Clear cache for this position after closing
				at.ClearPeakPnLCache(symbol, side)
			}
		} else if currentPnLPct > 5.0 {
			// Record situations close to close position condition (for debugging)
			logger.Infof("📊 Drawdown monitoring: %s %s | Profit: %.2f%% | Peak: %.2f%% | Drawdown: %.2f%%",
				symbol, side, currentPnLPct, peakPnLPct, drawdownPct)
		}
	}
}

// emergencyClosePosition emergency close position function
func (at *AutoTrader) emergencyClosePosition(symbol, side string) error {
	side = strings.ToLower(side)
	switch side {
	case "long", "buy":
		order, err := at.trader.CloseLong(symbol, 0) // 0 = close all
		if err != nil {
			return err
		}
		logger.Infof("✅ Emergency close long position succeeded, order ID: %v", order["orderId"])
	case "short", "sell":
		order, err := at.trader.CloseShort(symbol, 0) // 0 = close all
		if err != nil {
			return err
		}
		logger.Infof("✅ Emergency close short position succeeded, order ID: %v", order["orderId"])
	default:
		return fmt.Errorf("unknown position direction: %s", side)
	}

	return nil
}

// GetPeakPnLCache gets peak profit cache
func (at *AutoTrader) GetPeakPnLCache() map[string]float64 {
	at.peakPnLCacheMutex.RLock()
	defer at.peakPnLCacheMutex.RUnlock()

	// Return a copy of the cache
	cache := make(map[string]float64)
	for k, v := range at.peakPnLCache {
		cache[k] = v
	}
	return cache
}

// UpdatePeakPnL updates peak profit cache
func (at *AutoTrader) UpdatePeakPnL(symbol, side string, currentPnLPct float64) {
	at.peakPnLCacheMutex.Lock()
	defer at.peakPnLCacheMutex.Unlock()

	posKey := symbol + "_" + side
	if peak, exists := at.peakPnLCache[posKey]; exists {
		// Update peak (if long, take larger value; if short, currentPnLPct is negative, also compare)
		if currentPnLPct > peak {
			at.peakPnLCache[posKey] = currentPnLPct
		}
	} else {
		// First time recording
		at.peakPnLCache[posKey] = currentPnLPct
	}
}

// ClearPeakPnLCache clears peak cache for specified position
func (at *AutoTrader) ClearPeakPnLCache(symbol, side string) {
	at.peakPnLCacheMutex.Lock()
	defer at.peakPnLCacheMutex.Unlock()

	posKey := symbol + "_" + side
	delete(at.peakPnLCache, posKey)
}

// recordAndConfirmOrder polls order status for actual fill data and records position
// action: open_long, open_short, close_long, close_short
// entryPrice: entry price when closing (0 when opening)
func (at *AutoTrader) recordAndConfirmOrder(orderResult map[string]interface{}, symbol, action string, quantity float64, price float64, leverage int, entryPrice float64) {
	if at.store == nil {
		return
	}

	// Get order ID (supports multiple types)
	var orderID string
	switch v := orderResult["orderId"].(type) {
	case int64:
		orderID = fmt.Sprintf("%d", v)
	case float64:
		orderID = fmt.Sprintf("%.0f", v)
	case string:
		orderID = v
	default:
		orderID = fmt.Sprintf("%v", v)
	}

	if orderID == "" || orderID == "0" {
		logger.Infof("  ⚠️ Order ID is empty, skipping record")
		return
	}

	// Determine positionSide
	var positionSide string
	switch action {
	case "open_long", "close_long":
		positionSide = "LONG"
	case "open_short", "close_short":
		positionSide = "SHORT"
	}

	// Poll order status to get actual fill price, quantity and fee
	var actualPrice = price  // fallback to market price
	var actualQty = quantity // fallback to requested quantity
	var fee float64

	// Wait for order to be filled and get actual fill data
	time.Sleep(500 * time.Millisecond)
	for i := 0; i < 5; i++ {
		status, err := at.trader.GetOrderStatus(symbol, orderID)
		if err == nil {
			statusStr, _ := status["status"].(string)
			if statusStr == "FILLED" {
				// Get actual fill price
				if avgPrice, ok := status["avgPrice"].(float64); ok && avgPrice > 0 {
					actualPrice = avgPrice
				}
				// Get actual executed quantity
				if execQty, ok := status["executedQty"].(float64); ok && execQty > 0 {
					actualQty = execQty
				}
				// Get commission/fee
				if commission, ok := status["commission"].(float64); ok {
					fee = commission
				}
				logger.Infof("  ✅ Order filled: avgPrice=%.6f, qty=%.6f, fee=%.6f", actualPrice, actualQty, fee)
				break
			} else if statusStr == "CANCELED" || statusStr == "EXPIRED" || statusStr == "REJECTED" {
				logger.Infof("  ⚠️ Order %s, skipping position record", statusStr)
				return
			}
		}
		time.Sleep(500 * time.Millisecond)
	}

	logger.Infof("  📝 Recording position (ID: %s, action: %s, price: %.6f, qty: %.6f, fee: %.4f)",
		orderID, action, actualPrice, actualQty, fee)

	// Record position change with actual fill data
	at.recordPositionChange(orderID, symbol, positionSide, action, actualQty, actualPrice, leverage, entryPrice, fee)
}

// recordPositionChange records position change (create record on open, update record on close)
func (at *AutoTrader) recordPositionChange(orderID, symbol, side, action string, quantity, price float64, leverage int, entryPrice float64, fee float64) {
	if at.store == nil {
		return
	}

	switch action {
	case "open_long", "open_short":
		// Open position: create new position record
		pos := &store.TraderPosition{
			TraderID:     at.id,
			ExchangeID:   at.exchangeID, // Exchange account UUID
			ExchangeType: at.exchange,   // Exchange type: binance/bybit/okx/etc
			Symbol:       symbol,
			Side:         side, // LONG or SHORT
			Quantity:     quantity,
			EntryPrice:   price,
			EntryOrderID: orderID,
			EntryTime:    time.Now(),
			Leverage:     leverage,
			Status:       "OPEN",
		}
		if err := at.store.Position().Create(pos); err != nil {
			logger.Infof("  ⚠️ Failed to record position: %v", err)
		} else {
			logger.Infof("  📊 Position recorded [%s] %s %s @ %.4f", at.id[:8], symbol, side, price)
		}

	case "close_long", "close_short":
		// Close position: find corresponding open position record and update
		openPos, err := at.store.Position().GetOpenPositionBySymbol(at.id, symbol, side)
		if err != nil || openPos == nil {
			logger.Infof("  ⚠️ Cannot find corresponding open position record (%s %s)", symbol, side)
			return
		}

		// Calculate P&L
		var realizedPnL float64
		if side == "LONG" {
			realizedPnL = (price - openPos.EntryPrice) * openPos.Quantity
		} else {
			realizedPnL = (openPos.EntryPrice - price) * openPos.Quantity
		}

		// Update position record
		err = at.store.Position().ClosePosition(
			openPos.ID,
			price,   // exitPrice
			orderID, // exitOrderID
			realizedPnL,
			fee, // fee from exchange API
			"ai_decision",
		)
		if err != nil {
			logger.Infof("  ⚠️ Failed to update position: %v", err)
		} else {
			logger.Infof("  📊 Position closed [%s] %s %s @ %.4f → %.4f, P&L: %.2f, Fee: %.4f",
				at.id[:8], symbol, side, openPos.EntryPrice, price, realizedPnL, fee)
		}
	}
}

// ============================================================================
// Risk Control Helpers
// ============================================================================

// isBTCETH checks if a symbol is BTC or ETH
func isBTCETH(symbol string) bool {
	symbol = strings.ToUpper(symbol)
	return strings.HasPrefix(symbol, "BTC") || strings.HasPrefix(symbol, "ETH")
}

// enforcePositionValueRatio checks and enforces position value ratio limits (CODE ENFORCED)
// Returns the adjusted position size (capped if necessary) and whether the position was capped
// positionSizeUSD: the original position size in USD
// equity: the account equity
// symbol: the trading symbol
func (at *AutoTrader) enforcePositionValueRatio(positionSizeUSD float64, equity float64, symbol string) (float64, bool) {
	if at.config.StrategyConfig == nil {
		return positionSizeUSD, false
	}

	riskControl := at.config.StrategyConfig.RiskControl
	wasCapped := false

	// FIRST: Check absolute max position size (if set)
	// This is the hard cap that applies regardless of equity ratio
	if riskControl.MaxPositionSizeUSD > 0 && positionSizeUSD > riskControl.MaxPositionSizeUSD {
		logger.Infof("  ⚠️ [RISK CONTROL] Position $%.2f exceeds max_position_size_usd ($%.2f), capping",
			positionSizeUSD, riskControl.MaxPositionSizeUSD)
		positionSizeUSD = riskControl.MaxPositionSizeUSD
		wasCapped = true
	}

	// SECOND: Get the appropriate position value ratio limit
	var maxPositionValueRatio float64
	if isBTCETH(symbol) {
		maxPositionValueRatio = riskControl.LargeCapMaxPositionValueRatio
		if maxPositionValueRatio <= 0 {
			maxPositionValueRatio = 5.0 // Default: 5x for BTC/ETH
		}
	} else {
		maxPositionValueRatio = riskControl.SmallCapMaxPositionValueRatio
		if maxPositionValueRatio <= 0 {
			maxPositionValueRatio = 1.0 // Default: 1x for altcoins
		}
	}

	// Calculate max allowed position value = equity × ratio
	maxPositionValue := equity * maxPositionValueRatio

	// Check if position size exceeds equity ratio limit
	if positionSizeUSD > maxPositionValue {
		logger.Infof("  ⚠️ [RISK CONTROL] Position %.2f USDT exceeds limit (equity %.2f × %.1fx = %.2f USDT max for %s), capping",
			positionSizeUSD, equity, maxPositionValueRatio, maxPositionValue, symbol)
		return maxPositionValue, true
	}

	return positionSizeUSD, wasCapped
}

// enforceMinPositionSize checks minimum position size (CODE ENFORCED)
func (at *AutoTrader) enforceMinPositionSize(positionSizeUSD float64) error {
	if at.config.StrategyConfig == nil {
		return nil
	}

	minSize := at.config.StrategyConfig.RiskControl.MinPositionSize
	if minSize <= 0 {
		minSize = 12 // Default: 12 USDT
	}

	if positionSizeUSD < minSize {
		return fmt.Errorf("❌ [RISK CONTROL] Position %.2f USDT below minimum (%.2f USDT)", positionSizeUSD, minSize)
	}
	return nil
}

// enforceMaxPositions checks maximum positions count (CODE ENFORCED)
func (at *AutoTrader) enforceMaxPositions(currentPositionCount int) error {
	if at.config.StrategyConfig == nil {
		return nil
	}

	maxPositions := at.config.StrategyConfig.RiskControl.MaxPositions
	if maxPositions <= 0 {
		maxPositions = 3 // Default: 3 positions
	}

	if currentPositionCount >= maxPositions {
		return fmt.Errorf("❌ [RISK CONTROL] Already at max positions (%d/%d)", currentPositionCount, maxPositions)
	}
	return nil
}

// IsMarketOpen checks if US stock market is currently open (9:30 AM - 4:00 PM ET, Monday-Friday)
// Exported for use by API endpoints
func IsMarketOpen() bool {
	return isMarketOpen()
}

// isMarketOpen checks if US stock market is currently open (9:30 AM - 4:00 PM ET, Monday-Friday)
// Used to enforce TradeOnlyMarketHours setting for stock trading
func isMarketOpen() bool {
	// Load Eastern Time location
	loc, err := time.LoadLocation("America/New_York")
	if err != nil {
		// Fallback: assume market is open if timezone fails
		logger.Infof("⚠️ Failed to load America/New_York timezone: %v, assuming market is open", err)
		return true
	}

	now := time.Now().In(loc)

	// Check if weekend (Saturday = 6, Sunday = 0)
	weekday := now.Weekday()
	if weekday == time.Saturday || weekday == time.Sunday {
		return false
	}

	// Market hours: 9:30 AM to 4:00 PM ET
	hour := now.Hour()
	minute := now.Minute()
	currentMinutes := hour*60 + minute

	marketOpenMinutes := 9*60 + 30 // 9:30 AM = 570 minutes
	marketCloseMinutes := 16 * 60  // 4:00 PM = 960 minutes

	return currentMinutes >= marketOpenMinutes && currentMinutes < marketCloseMinutes
}

// ============================================================================
// VWAP Pre-Entry Mode Functions
// ============================================================================

// isVWAPPreEntryTime checks if current time is between 9:30 AM and entry time (e.g., 10:00 AM)
func (at *AutoTrader) isVWAPPreEntryTime() bool {
	if at.strategyEngine == nil {
		return false
	}

	config := at.strategyEngine.GetConfig()
	if config == nil || !config.Indicators.EnableVWAPSlopeStretch {
		return false
	}

	loc, err := time.LoadLocation("America/New_York")
	if err != nil {
		return false
	}
	now := time.Now().In(loc)

	// Check if weekend
	weekday := now.Weekday()
	if weekday == time.Saturday || weekday == time.Sunday {
		return false
	}

	currentMinutes := now.Hour()*60 + now.Minute()
	marketOpenMinutes := 9*60 + 30 // 9:30 AM = 570 minutes

	// Parse entry time (e.g., "10:00")
	entryTime := config.Indicators.VWAPEntryTime
	if entryTime == "" {
		entryTime = "10:00"
	}

	var entryHour, entryMin int
	fmt.Sscanf(entryTime, "%d:%d", &entryHour, &entryMin)
	entryMinutes := entryHour*60 + entryMin

	return currentMinutes >= marketOpenMinutes && currentMinutes < entryMinutes
}

// isVWAPEntryTime checks if it's exactly the entry time (e.g., 10:00 AM) - within a 1-minute window
func (at *AutoTrader) isVWAPEntryTime() bool {
	if at.strategyEngine == nil {
		return false
	}

	config := at.strategyEngine.GetConfig()
	if config == nil || !config.Indicators.EnableVWAPSlopeStretch {
		return false
	}

	loc, err := time.LoadLocation("America/New_York")
	if err != nil {
		return false
	}
	now := time.Now().In(loc)

	// Parse entry time
	entryTime := config.Indicators.VWAPEntryTime
	if entryTime == "" {
		entryTime = "10:00"
	}

	var entryHour, entryMin int
	fmt.Sscanf(entryTime, "%d:%d", &entryHour, &entryMin)

	return now.Hour() == entryHour && now.Minute() == entryMin
}

// isVWAPPostEntryTime checks if we're past the entry time (no new buys allowed, only manage positions)
func (at *AutoTrader) isVWAPPostEntryTime() bool {
	if at.strategyEngine == nil {
		return false
	}

	config := at.strategyEngine.GetConfig()
	if config == nil || !config.Indicators.EnableVWAPSlopeStretch {
		return false
	}

	loc, err := time.LoadLocation("America/New_York")
	if err != nil {
		return false
	}
	now := time.Now().In(loc)

	// Parse entry time
	entryTime := config.Indicators.VWAPEntryTime
	if entryTime == "" {
		entryTime = "10:00"
	}

	var entryHour, entryMin int
	fmt.Sscanf(entryTime, "%d:%d", &entryHour, &entryMin)
	entryMinutes := entryHour*60 + entryMin
	currentMinutes := now.Hour()*60 + now.Minute()

	// If current time is after entry time, we're in post-entry mode
	return currentMinutes > entryMinutes
}

// runVWAPPositionManagement manages existing positions during post-entry phase
// Continuously monitors for:
// 1. Sell trigger hit (from AI100 API or default 5%)
// 2. End-of-day exit (5 minutes before market close at 3:55 PM ET)
func (at *AutoTrader) runVWAPPositionManagement() {
	// Get current positions
	positions, err := at.trader.GetPositions()
	if err != nil {
		logger.Infof("📊 [VWAP] Error getting positions: %v", err)
		return
	}

	// Filter to only this trader's positions (if using shared account)
	var traderPositions []map[string]interface{}
	for _, pos := range positions {
		symbol := pos["symbol"].(string)
		side := pos["side"].(string)
		quantity := pos["positionAmt"].(float64)
		if quantity < 0 {
			quantity = -quantity
		}
		// Skip empty positions
		if quantity == 0 {
			continue
		}
		// Check if this position belongs to current trader
		if at.store != nil {
			dbPos, err := at.store.Position().GetOpenPositionBySymbol(at.id, symbol, side)
			if err != nil || dbPos == nil {
				continue // Skip positions that don't belong to this trader
			}
		}
		traderPositions = append(traderPositions, pos)
	}

	if len(traderPositions) == 0 {
		logger.Infof("📊 [VWAP] No positions to manage for this trader")
		return
	}

	loc, _ := time.LoadLocation("America/New_York")
	now := time.Now().In(loc)
	currentMinutes := now.Hour()*60 + now.Minute()
	marketCloseMinutes := 16*60 - 5 // 3:55 PM (5 min before 4 PM close)

	// Check if we're near market close
	isNearMarketClose := currentMinutes >= marketCloseMinutes
	timeToClose := (16*60 - currentMinutes)

	logger.Infof("📊 [VWAP] Position check at %s ET | %d positions | Market closes in %d min",
		now.Format("15:04"), len(traderPositions), timeToClose)

	for _, pos := range traderPositions {
		symbol := pos["symbol"].(string)
		side := pos["side"].(string)

		// Get price data
		entryPrice := pos["entryPrice"].(float64)
		markPrice := pos["markPrice"].(float64)

		// Calculate PnL percentage
		pnlPct := 0.0
		if entryPrice > 0 && markPrice > 0 {
			if side == "long" || side == "buy" {
				pnlPct = ((markPrice - entryPrice) / entryPrice) * 100
			} else {
				pnlPct = ((entryPrice - markPrice) / entryPrice) * 100
			}
		}

		// Get TP from AI100 sell_trigger API (falls back to 5% if not found)
		ai100Client := market.GetAI100Client()
		tpPct := ai100Client.GetSellTrigger(symbol)

		logger.Infof("📊 [VWAP] %s %s: Entry=$%.2f, Current=$%.2f, PnL=%.2f%%, Target=%.2f%%",
			symbol, side, entryPrice, markPrice, pnlPct, tpPct)

		// PRIORITY 1: Check if near market close - MUST sell all positions
		if isNearMarketClose {
			logger.Infof("🔔 [VWAP] END-OF-DAY EXIT: Market closing in %d min - selling %s at %.2f%% PnL",
				timeToClose, symbol, pnlPct)
			if err := at.emergencyClosePosition(symbol, side); err != nil {
				logger.Infof("❌ [VWAP] Failed to close %s: %v", symbol, err)
			} else {
				logger.Infof("✅ [VWAP] Successfully closed %s before market close", symbol)
			}
			continue
		}

		// PRIORITY 2: Check if TP (sell trigger) hit
		if pnlPct >= tpPct {
			logger.Infof("🎯 [VWAP] SELL TRIGGER HIT: %s at %.2f%% (target: %.2f%%) - closing position",
				symbol, pnlPct, tpPct)
			if err := at.emergencyClosePosition(symbol, side); err != nil {
				logger.Infof("❌ [VWAP] Failed to close %s: %v", symbol, err)
			} else {
				logger.Infof("✅ [VWAP] Successfully closed %s on sell trigger", symbol)
			}
			continue
		}

		// Otherwise, hold the position
		logger.Infof("📊 [VWAP] HOLDING %s: PnL %.2f%% | Need %.2f%% more to hit target",
			symbol, pnlPct, tpPct-pnlPct)
	}
}

// getVWAPAwareInterval returns the appropriate scan interval based on VWAP mode
// Returns 1 minute during entire trading day when VWAP mode is enabled
// This ensures sell triggers and market close exits are checked frequently
func (at *AutoTrader) getVWAPAwareInterval() time.Duration {
	if at.strategyEngine == nil {
		return at.config.ScanInterval
	}

	config := at.strategyEngine.GetConfig()
	if config == nil || !config.Indicators.EnableVWAPSlopeStretch {
		return at.config.ScanInterval
	}

	// When VWAP mode is enabled, ALWAYS use 1-minute intervals during market hours
	// This ensures:
	// 1. Continuous sell trigger monitoring throughout the day
	// 2. Timely exit 5 minutes before market close (3:55 PM ET)
	if isMarketOpen() {
		return 1 * time.Minute
	}

	return at.config.ScanInterval
}

// initVWAPCollector initializes or resets VWAP collector for a symbol
func (at *AutoTrader) initVWAPCollector(symbol string) *VWAPCollector {
	at.vwapCollectorsMu.Lock()
	defer at.vwapCollectorsMu.Unlock()

	if at.vwapCollectors == nil {
		at.vwapCollectors = make(map[string]*VWAPCollector)
	}

	entryTime := "10:00"
	if at.strategyEngine != nil {
		config := at.strategyEngine.GetConfig()
		if config != nil && config.Indicators.VWAPEntryTime != "" {
			entryTime = config.Indicators.VWAPEntryTime
		}
	}

	// Check if collector exists and if it needs daily reset
	if collector, exists := at.vwapCollectors[symbol]; exists {
		loc, _ := time.LoadLocation("America/New_York")
		now := time.Now().In(loc)
		// Reset if it's a new trading day (after market open at 9:30)
		if now.Hour() == 9 && now.Minute() == 30 && collector.GetBarCount() > 0 {
			collector.Reset()
			logger.Infof("📊 [VWAP] Reset collector for %s at market open", symbol)
		}
		return collector
	}

	collector := NewVWAPCollector(entryTime)
	at.vwapCollectors[symbol] = collector
	logger.Infof("📊 [VWAP] Initialized collector for %s (entry time: %s AM ET)", symbol, entryTime)
	return collector
}

// getVWAPCollector gets or creates a VWAP collector for a symbol
func (at *AutoTrader) getVWAPCollector(symbol string) *VWAPCollector {
	at.vwapCollectorsMu.RLock()
	if at.vwapCollectors != nil {
		if collector, exists := at.vwapCollectors[symbol]; exists {
			at.vwapCollectorsMu.RUnlock()
			return collector
		}
	}
	at.vwapCollectorsMu.RUnlock()
	return at.initVWAPCollector(symbol)
}

// collectVWAPBars fetches latest 1-min bars for all candidate stocks
func (at *AutoTrader) collectVWAPBars(symbols []string) {
	for _, symbol := range symbols {
		collector := at.getVWAPCollector(symbol)

		// Fetch latest 1-minute bar from Alpaca
		bar, err := market.GetLatest1MinBar(symbol)
		if err != nil {
			logger.Infof("⚠️ [VWAP] Failed to fetch 1-min bar for %s: %v", symbol, err)
			continue
		}

		if bar != nil {
			vwapBar := VWAPBar{
				Time:   bar.Time,
				Open:   bar.Open,
				High:   bar.High,
				Low:    bar.Low,
				Close:  bar.Close,
				Volume: bar.Volume,
			}
			collector.AddBar(vwapBar)
			logger.Infof("📊 [VWAP] Collected bar for %s: Close=%.4f, Vol=%.0f, Bars=%d",
				symbol, bar.Close, bar.Volume, collector.GetBarCount())
		}
	}
}
