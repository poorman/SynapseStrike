package metrics

import (
	"sync"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// Registry is the custom prometheus registry for SynapseStrike metrics
	Registry = prometheus.NewRegistry()

	// Mutex for thread-safe metric updates
	mu sync.RWMutex

	// ============================================
	// Trading Performance Metrics
	// ============================================

	// TraderPnLTotal tracks total P&L in USDT per trader
	TraderPnLTotal = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "trader",
			Name:      "pnl_total",
			Help:      "Total P&L in USDT",
		},
		[]string{"trader_id", "exchange", "ai_model"},
	)

	// TraderPnLPercent tracks P&L percentage per trader
	TraderPnLPercent = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "trader",
			Name:      "pnl_percent",
			Help:      "P&L percentage",
		},
		[]string{"trader_id", "exchange", "ai_model"},
	)

	// TraderEquityTotal tracks current equity per trader
	TraderEquityTotal = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "trader",
			Name:      "equity_total",
			Help:      "Current total equity in USDT",
		},
		[]string{"trader_id"},
	)

	// TraderInitialBalance tracks initial balance per trader
	TraderInitialBalance = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "trader",
			Name:      "initial_balance",
			Help:      "Initial balance in USDT",
		},
		[]string{"trader_id"},
	)

	// TraderUnrealizedPnL tracks unrealized P&L per trader
	TraderUnrealizedPnL = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "trader",
			Name:      "unrealized_pnl",
			Help:      "Unrealized P&L in USDT",
		},
		[]string{"trader_id"},
	)

	// TraderMarginUsed tracks margin used per trader
	TraderMarginUsed = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "trader",
			Name:      "margin_used",
			Help:      "Margin used in USDT",
		},
		[]string{"trader_id"},
	)

	// TraderMarginUsedPercent tracks margin used percentage per trader
	TraderMarginUsedPercent = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "trader",
			Name:      "margin_used_percent",
			Help:      "Margin used as percentage of equity",
		},
		[]string{"trader_id"},
	)

	// ============================================
	// Win/Loss Statistics
	// ============================================

	// TraderTradesTotal tracks total trades per trader and result
	TraderTradesTotal = promauto.With(Registry).NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "synapsestrike",
			Subsystem: "trader",
			Name:      "trades_total",
			Help:      "Total number of trades",
		},
		[]string{"trader_id", "result"}, // result: "win", "loss"
	)

	// TraderWinRate tracks win rate percentage per trader
	TraderWinRate = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "trader",
			Name:      "win_rate",
			Help:      "Win rate percentage",
		},
		[]string{"trader_id"},
	)

	// TraderAvgWin tracks average winning trade amount
	TraderAvgWin = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "trader",
			Name:      "avg_win",
			Help:      "Average winning trade in USDT",
		},
		[]string{"trader_id"},
	)

	// TraderAvgLoss tracks average losing trade amount
	TraderAvgLoss = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "trader",
			Name:      "avg_loss",
			Help:      "Average losing trade in USDT (negative)",
		},
		[]string{"trader_id"},
	)

	// TraderProfitFactor tracks profit factor
	TraderProfitFactor = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "trader",
			Name:      "profit_factor",
			Help:      "Profit factor (gross profit / gross loss)",
		},
		[]string{"trader_id"},
	)

	// ============================================
	// Risk Metrics
	// ============================================

	// TraderDrawdownCurrent tracks current drawdown percentage
	TraderDrawdownCurrent = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "trader",
			Name:      "drawdown_current",
			Help:      "Current drawdown percentage",
		},
		[]string{"trader_id"},
	)

	// TraderDrawdownMax tracks maximum drawdown percentage
	TraderDrawdownMax = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "trader",
			Name:      "drawdown_max",
			Help:      "Maximum drawdown percentage",
		},
		[]string{"trader_id"},
	)

	// TraderSharpeRatio tracks Sharpe ratio
	TraderSharpeRatio = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "trader",
			Name:      "sharpe_ratio",
			Help:      "Sharpe ratio",
		},
		[]string{"trader_id"},
	)

	// ============================================
	// Position Metrics
	// ============================================

	// TraderPositionsCount tracks open position count
	TraderPositionsCount = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "trader",
			Name:      "positions_count",
			Help:      "Number of open positions",
		},
		[]string{"trader_id"},
	)

	// PositionUnrealizedPnL tracks per-position unrealized P&L
	PositionUnrealizedPnL = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "position",
			Name:      "unrealized_pnl",
			Help:      "Unrealized P&L per position in USDT",
		},
		[]string{"trader_id", "symbol", "side"},
	)

	// PositionPnLPercent tracks per-position P&L percentage
	PositionPnLPercent = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "position",
			Name:      "pnl_percent",
			Help:      "Unrealized P&L percentage per position",
		},
		[]string{"trader_id", "symbol", "side"},
	)

	// PositionLeverage tracks per-position leverage
	PositionLeverage = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "position",
			Name:      "leverage",
			Help:      "Leverage used for position",
		},
		[]string{"trader_id", "symbol", "side"},
	)

	// PositionHoldDuration tracks how long a position has been held
	PositionHoldDuration = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "position",
			Name:      "hold_duration_seconds",
			Help:      "Duration position has been held in seconds",
		},
		[]string{"trader_id", "symbol", "side"},
	)

	// ============================================
	// AI Decision Metrics
	// ============================================

	// AIRequestDuration tracks AI request latency as histogram
	AIRequestDuration = promauto.With(Registry).NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: "synapsestrike",
			Subsystem: "ai",
			Name:      "request_duration_seconds",
			Help:      "AI request duration in seconds",
			Buckets:   []float64{1, 2, 5, 10, 20, 30, 45, 60, 90, 120},
		},
		[]string{"trader_id", "ai_model"},
	)

	// AICallsTotal tracks total AI calls
	AICallsTotal = promauto.With(Registry).NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "synapsestrike",
			Subsystem: "ai",
			Name:      "calls_total",
			Help:      "Total number of AI calls",
		},
		[]string{"trader_id", "ai_model"},
	)

	// AIErrorsTotal tracks AI call errors
	AIErrorsTotal = promauto.With(Registry).NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "synapsestrike",
			Subsystem: "ai",
			Name:      "errors_total",
			Help:      "Total number of AI call errors",
		},
		[]string{"trader_id", "ai_model"},
	)

	// ============================================
	// System Metrics
	// ============================================

	// TraderCycleDuration tracks trading cycle duration
	TraderCycleDuration = promauto.With(Registry).NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: "synapsestrike",
			Subsystem: "trader",
			Name:      "cycle_duration_seconds",
			Help:      "Trading cycle duration in seconds",
			Buckets:   []float64{1, 5, 10, 30, 60, 120, 180, 300},
		},
		[]string{"trader_id"},
	)

	// TraderRunning tracks if a trader is running (1) or stopped (0)
	TraderRunning = promauto.With(Registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "trader",
			Name:      "running",
			Help:      "Whether the trader is running (1) or stopped (0)",
		},
		[]string{"trader_id"},
	)

	// SystemUptime tracks system uptime in seconds
	SystemUptime = promauto.With(Registry).NewGauge(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "system",
			Name:      "uptime_seconds",
			Help:      "System uptime in seconds",
		},
	)

	// ActiveTradersCount tracks number of active traders
	ActiveTradersCount = promauto.With(Registry).NewGauge(
		prometheus.GaugeOpts{
			Namespace: "synapsestrike",
			Subsystem: "system",
			Name:      "active_traders_count",
			Help:      "Number of active traders",
		},
	)
)

// UpdateTraderMetrics updates all trader-related metrics
func UpdateTraderMetrics(traderID, exchange, aiModel string, pnlTotal, pnlPercent, equity, initialBalance, unrealizedPnL, marginUsed, marginUsedPercent float64) {
	mu.Lock()
	defer mu.Unlock()

	TraderPnLTotal.WithLabelValues(traderID, exchange, aiModel).Set(pnlTotal)
	TraderPnLPercent.WithLabelValues(traderID, exchange, aiModel).Set(pnlPercent)
	TraderEquityTotal.WithLabelValues(traderID).Set(equity)
	TraderInitialBalance.WithLabelValues(traderID).Set(initialBalance)
	TraderUnrealizedPnL.WithLabelValues(traderID).Set(unrealizedPnL)
	TraderMarginUsed.WithLabelValues(traderID).Set(marginUsed)
	TraderMarginUsedPercent.WithLabelValues(traderID).Set(marginUsedPercent)
}

// UpdateRiskMetrics updates risk-related metrics
func UpdateRiskMetrics(traderID string, drawdownCurrent, drawdownMax, sharpeRatio float64) {
	mu.Lock()
	defer mu.Unlock()

	TraderDrawdownCurrent.WithLabelValues(traderID).Set(drawdownCurrent)
	TraderDrawdownMax.WithLabelValues(traderID).Set(drawdownMax)
	TraderSharpeRatio.WithLabelValues(traderID).Set(sharpeRatio)
}

// UpdateWinLossMetrics updates win/loss statistics
func UpdateWinLossMetrics(traderID string, winRate, avgWin, avgLoss, profitFactor float64) {
	mu.Lock()
	defer mu.Unlock()

	TraderWinRate.WithLabelValues(traderID).Set(winRate)
	TraderAvgWin.WithLabelValues(traderID).Set(avgWin)
	TraderAvgLoss.WithLabelValues(traderID).Set(avgLoss)
	TraderProfitFactor.WithLabelValues(traderID).Set(profitFactor)
}

// RecordTrade increments the trade counter
func RecordTrade(traderID string, isWin bool) {
	result := "loss"
	if isWin {
		result = "win"
	}
	TraderTradesTotal.WithLabelValues(traderID, result).Inc()
}

// UpdatePositionMetrics updates position-related metrics
func UpdatePositionMetrics(traderID, symbol, side string, unrealizedPnL, pnlPercent float64, leverage int, holdDurationSeconds float64) {
	mu.Lock()
	defer mu.Unlock()

	PositionUnrealizedPnL.WithLabelValues(traderID, symbol, side).Set(unrealizedPnL)
	PositionPnLPercent.WithLabelValues(traderID, symbol, side).Set(pnlPercent)
	PositionLeverage.WithLabelValues(traderID, symbol, side).Set(float64(leverage))
	PositionHoldDuration.WithLabelValues(traderID, symbol, side).Set(holdDurationSeconds)
}

// ClearPositionMetrics removes metrics for a closed position
func ClearPositionMetrics(traderID, symbol, side string) {
	mu.Lock()
	defer mu.Unlock()

	PositionUnrealizedPnL.DeleteLabelValues(traderID, symbol, side)
	PositionPnLPercent.DeleteLabelValues(traderID, symbol, side)
	PositionLeverage.DeleteLabelValues(traderID, symbol, side)
	PositionHoldDuration.DeleteLabelValues(traderID, symbol, side)
}

// RecordAICall records an AI call with its duration
func RecordAICall(traderID, aiModel string, durationMs int64, hasError bool) {
	durationSeconds := float64(durationMs) / 1000.0
	AIRequestDuration.WithLabelValues(traderID, aiModel).Observe(durationSeconds)
	AICallsTotal.WithLabelValues(traderID, aiModel).Inc()
	if hasError {
		AIErrorsTotal.WithLabelValues(traderID, aiModel).Inc()
	}
}

// RecordCycleDuration records a trading cycle duration
func RecordCycleDuration(traderID string, durationSeconds float64) {
	TraderCycleDuration.WithLabelValues(traderID).Observe(durationSeconds)
}

// SetTraderRunning sets whether a trader is running
func SetTraderRunning(traderID string, running bool) {
	val := 0.0
	if running {
		val = 1.0
	}
	TraderRunning.WithLabelValues(traderID).Set(val)
}

// SetPositionsCount sets the position count for a trader
func SetPositionsCount(traderID string, count int) {
	TraderPositionsCount.WithLabelValues(traderID).Set(float64(count))
}

// Init registers the default prometheus collectors
func Init() {
	// Register standard go collectors
	Registry.MustRegister(prometheus.NewGoCollector())
	Registry.MustRegister(prometheus.NewProcessCollector(prometheus.ProcessCollectorOpts{}))
}
