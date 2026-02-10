package decision

import (
	"SynapseStrike/logger"
	"SynapseStrike/market"
	"SynapseStrike/store"
	"fmt"
	"math"
	"strings"
	"time"
)

// ============================================================================
// Local Function Decision Engine
// Pure algorithmic trading decisions — no LLM API calls.
// Structured as a switch on (algo type, model name) for extensibility.
// ============================================================================

// GetLocalFunctionDecision dispatches to the correct algorithmic model
// based on the trader's strategy config and the selected model name.
func GetLocalFunctionDecision(ctx *Context, engine *StrategyEngine, modelName string) (*FullDecision, error) {
	if ctx == nil || engine == nil {
		return nil, fmt.Errorf("context or engine is nil")
	}

	config := engine.GetConfig()
	startTime := time.Now()

	// Detect algo type from strategy config
	algoType := detectAlgoType(config)

	logger.Infof("🔧 [Local Function] Algo: %s, Model: %s, Candidates: %d", algoType, modelName, len(ctx.CandidateStocks))

	var decisions []Decision
	var cotBuilder strings.Builder

	cotBuilder.WriteString("## Local Function Decision Engine\n\n")
	cotBuilder.WriteString(fmt.Sprintf("**Algo:** %s | **Model:** %s | **Time:** %s\n\n", algoType, modelName, time.Now().Format("2006-01-02 15:04:05 MST")))
	cotBuilder.WriteString(fmt.Sprintf("### Account Status\n- Equity: $%.2f\n- Available: $%.2f\n- Open Positions: %d\n\n",
		ctx.Account.TotalEquity, ctx.Account.AvailableBalance, ctx.Account.PositionCount))

	switch algoType {
	case "genetic":
		decisions, cotBuilder = localFuncGenetic(ctx, engine, modelName, cotBuilder)
	case "vwaper":
		decisions, cotBuilder = localFuncVWAPer(ctx, engine, modelName, cotBuilder)
	case "scalper":
		cotBuilder.WriteString("### Scalper Algorithm\n\n")
		cotBuilder.WriteString(fmt.Sprintf("**%s** — Not yet implemented for Scalper.\n\n", modelName))
		decisions = append(decisions, Decision{
			Symbol:    "ALL",
			Action:    "wait",
			Reasoning: fmt.Sprintf("Local Function: Scalper %s not yet implemented", modelName),
		})
	default:
		cotBuilder.WriteString(fmt.Sprintf("### Unknown Algo Type: %s\n", algoType))
		cotBuilder.WriteString("Defaulting to wait mode.\n\n")
		decisions = append(decisions, Decision{
			Symbol:    "ALL",
			Action:    "wait",
			Reasoning: fmt.Sprintf("Local Function: Unknown algo type '%s'", algoType),
		})
	}

	// Handle position safekeeping (TP/SL for open positions)
	safekeepingDecisions := HandlePositionSafekeeping(ctx, engine)
	if len(safekeepingDecisions) > 0 {
		cotBuilder.WriteString("### Position Management\n\n")
		for _, d := range safekeepingDecisions {
			cotBuilder.WriteString(fmt.Sprintf("- **%s**: %s — %s\n", d.Symbol, d.Action, d.Reasoning))
		}
		cotBuilder.WriteString("\n")
		decisions = append(decisions, safekeepingDecisions...)
	}

	// If no decisions at all, default to wait
	if len(decisions) == 0 {
		decisions = append(decisions, Decision{
			Symbol:    "ALL",
			Action:    "wait",
			Reasoning: "Local Function: No signals found across all candidates",
		})
		cotBuilder.WriteString("### Final Decision\nNo signals found. Entering **WAIT** mode.\n")
	}

	duration := time.Since(startTime)
	logger.Infof("🔧 [Local Function] Complete in %dms: %d decisions", duration.Milliseconds(), len(decisions))

	return &FullDecision{
		CoTTrace:            cotBuilder.String(),
		Decisions:           decisions,
		Timestamp:           time.Now(),
		AIRequestDurationMs: duration.Milliseconds(),
	}, nil
}

// ============================================================================
// VWAPer Models
// ============================================================================

func localFuncVWAPer(ctx *Context, engine *StrategyEngine, modelName string, cotBuilder strings.Builder) ([]Decision, strings.Builder) {
	cotBuilder.WriteString("### VWAPer Algorithm\n\n")

	switch modelName {
	case "model_1":
		cotBuilder.WriteString("**Model 1** — Adaptive VWAP Entry\n\n")
		return localFuncVWAPModel1(ctx, engine, cotBuilder)
	case "model_2":
		cotBuilder.WriteString("**Model 2** — Not yet implemented for VWAPer.\n\n")
		return []Decision{{Symbol: "ALL", Action: "wait", Reasoning: "Local Function: VWAPer model_2 not yet implemented"}}, cotBuilder
	case "model_3":
		cotBuilder.WriteString("**Model 3** — Not yet implemented for VWAPer.\n\n")
		return []Decision{{Symbol: "ALL", Action: "wait", Reasoning: "Local Function: VWAPer model_3 not yet implemented"}}, cotBuilder
	default:
		cotBuilder.WriteString(fmt.Sprintf("Unknown model '%s', defaulting to model_1.\n\n", modelName))
		return localFuncVWAPModel1(ctx, engine, cotBuilder)
	}
}

func localFuncVWAPModel1(ctx *Context, engine *StrategyEngine, cotBuilder strings.Builder) ([]Decision, strings.Builder) {
	config := engine.GetConfig()
	var decisions []Decision

	cotBuilder.WriteString("Rule: Buy if price > VWAP AND slope > 0 AND stretch < 0.5*vol AND momentum > 0.25*vol\n\n")

	for _, stock := range ctx.CandidateStocks {
		decision, analysis, passed := calculateVWAPSlopeStretchWithAnalysis(ctx, stock.Symbol, config)
		cotBuilder.WriteString(analysis)
		if passed && decision != nil {
			decisions = append(decisions, *decision)
		}
	}

	if len(decisions) == 0 {
		cotBuilder.WriteString("---\n\n**Result:** No stocks passed all VWAP entry conditions.\n\n")
	} else {
		cotBuilder.WriteString("---\n\n**Result:** Stocks passing all conditions:\n")
		for _, d := range decisions {
			cotBuilder.WriteString(fmt.Sprintf("- **%s** -> %s (TP: $%.2f, SL: $%.2f, Size: $%.2f)\n",
				d.Symbol, strings.ToUpper(d.Action), d.TakeProfit, d.StopLoss, d.PositionSizeUSD))
		}
		cotBuilder.WriteString("\n")
	}

	return decisions, cotBuilder
}

// ============================================================================
// Genetic Algorithm Models
//
// Based on Brownlee's "Genetic Algorithm Afternoon" (2024):
//   - Each "model" is a pre-evolved chromosome (set of weights/thresholds)
//   - 5 technical factors (genes) are scored 0-100 per stock
//   - Weighted composite score determines buy/skip
//   - TP/SL derived from ATR multiplied by chromosome parameters
// ============================================================================

// geneticChromosome represents a pre-evolved set of trading parameters.
// In a full GA, these would be evolved via selection, crossover, and mutation
// using historical trade fitness. Here they are pre-tuned profiles.
type geneticChromosome struct {
	Name        string  // Human-readable name
	RSIWeight   float64 // Gene 0: weight for RSI factor
	MACDWeight  float64 // Gene 1: weight for MACD factor
	VolWeight   float64 // Gene 2: weight for Volume factor
	MomWeight   float64 // Gene 3: weight for Momentum factor
	VWAPWeight  float64 // Gene 4: weight for VWAP distance factor
	EntryThresh float64 // Gene 5: min composite score to buy (0-100)
	TPMult      float64 // Gene 6: take profit = ATR * this
	SLMult      float64 // Gene 7: stop loss = ATR * this
}

// Pre-evolved chromosome profiles (the "population's fittest individuals")
var geneticChromosomes = map[string]geneticChromosome{
	"model_1": {
		Name: "Aggressive Momentum",
		// Heavily weights volume surge and momentum — catches breakouts
		RSIWeight: 15, MACDWeight: 20, VolWeight: 30, MomWeight: 25, VWAPWeight: 10,
		EntryThresh: 55, TPMult: 3.0, SLMult: 1.0,
	},
	"model_2": {
		Name: "Balanced Value",
		// Even weights across all factors — well-rounded
		RSIWeight: 25, MACDWeight: 20, VolWeight: 20, MomWeight: 15, VWAPWeight: 20,
		EntryThresh: 65, TPMult: 2.5, SLMult: 1.5,
	},
	"model_3": {
		Name: "Conservative Safe",
		// Heavily weights VWAP proximity and RSI — waits for confirmed support
		RSIWeight: 20, MACDWeight: 15, VolWeight: 15, MomWeight: 10, VWAPWeight: 40,
		EntryThresh: 75, TPMult: 2.0, SLMult: 2.0,
	},
}

func localFuncGenetic(ctx *Context, engine *StrategyEngine, modelName string, cotBuilder strings.Builder) ([]Decision, strings.Builder) {
	cotBuilder.WriteString("### Genetic Algorithm\n\n")

	// Load chromosome for selected model
	chromo, ok := geneticChromosomes[modelName]
	if !ok {
		chromo = geneticChromosomes["model_1"]
		cotBuilder.WriteString(fmt.Sprintf("Unknown model '%s', defaulting to model_1.\n\n", modelName))
	}

	cotBuilder.WriteString(fmt.Sprintf("**Chromosome:** %s\n", chromo.Name))
	cotBuilder.WriteString(fmt.Sprintf("**Weights:** RSI=%.0f MACD=%.0f Vol=%.0f Mom=%.0f VWAP=%.0f\n",
		chromo.RSIWeight, chromo.MACDWeight, chromo.VolWeight, chromo.MomWeight, chromo.VWAPWeight))
	cotBuilder.WriteString(fmt.Sprintf("**Entry Threshold:** %.0f/100 | **TP:** %.1fx ATR | **SL:** %.1fx ATR\n\n",
		chromo.EntryThresh, chromo.TPMult, chromo.SLMult))

	config := engine.GetConfig()
	var decisions []Decision
	var scoredStocks []struct {
		symbol string
		score  float64
	}

	for _, stock := range ctx.CandidateStocks {
		symbol := stock.Symbol
		marketData, hasData := ctx.MarketDataMap[symbol]
		if !hasData || marketData.TimeframeData == nil {
			cotBuilder.WriteString(fmt.Sprintf("#### %s — SKIP (no market data)\n\n", symbol))
			continue
		}

		// Use 5m timeframe as primary
		tfData, hasTF := marketData.TimeframeData["5m"]
		if !hasTF || len(tfData.Klines) < 10 {
			cotBuilder.WriteString(fmt.Sprintf("#### %s — SKIP (insufficient 5m data)\n\n", symbol))
			continue
		}

		cotBuilder.WriteString(fmt.Sprintf("#### %s (Price: $%.2f)\n\n", symbol, marketData.CurrentPrice))

		// =====================================================================
		// Calculate 5 factors (each normalized to 0-100)
		// =====================================================================

		// Factor 1: RSI (best at 40-60 neutral zone = opportunity)
		rsiScore := 0.0
		if len(tfData.RSI14Values) > 0 {
			rsi := tfData.RSI14Values[len(tfData.RSI14Values)-1]
			if rsi >= 40 && rsi <= 60 {
				rsiScore = 100 - math.Abs(rsi-50)*5 // Peak at 50
			} else if rsi > 60 && rsi <= 70 {
				rsiScore = 60 - (rsi-60)*4 // Declining
			} else if rsi > 70 {
				rsiScore = math.Max(0, 20-(rsi-70)*2) // Overbought penalty
			} else if rsi >= 30 && rsi < 40 {
				rsiScore = 60 - (40-rsi)*4
			} else {
				rsiScore = math.Max(0, 20-(30-rsi)*2) // Oversold penalty
			}
			cotBuilder.WriteString(fmt.Sprintf("- **RSI**: %.1f -> Score: %.0f/100\n", rsi, rsiScore))
		} else {
			rsiScore = 50 // Neutral if no data
			cotBuilder.WriteString("- **RSI**: N/A -> Score: 50/100 (default)\n")
		}

		// Factor 2: MACD (positive + rising = bullish)
		macdScore := 0.0
		if len(tfData.MACDValues) >= 2 {
			macd := tfData.MACDValues[len(tfData.MACDValues)-1]
			macdPrev := tfData.MACDValues[len(tfData.MACDValues)-2]
			rising := macd > macdPrev

			if macd > 0 && rising {
				macdScore = 100 // Bullish crossover and rising
			} else if macd > 0 && !rising {
				macdScore = 70 // Positive but fading
			} else if macd < 0 && rising {
				macdScore = 50 // Negative but recovering
			} else if macd < 0 && !rising {
				macdScore = 10 // Bearish and falling
			} else {
				macdScore = 50
			}
			cotBuilder.WriteString(fmt.Sprintf("- **MACD**: %.4f (prev: %.4f, %s) -> Score: %.0f/100\n",
				macd, macdPrev, map[bool]string{true: "rising", false: "falling"}[rising], macdScore))
		} else {
			macdScore = 50
			cotBuilder.WriteString("- **MACD**: N/A -> Score: 50/100 (default)\n")
		}

		// Factor 3: Volume (surge = institutional interest)
		volScore := 0.0
		volRatio := 0.0
		if marketData.StockExtraData != nil {
			volRatio = marketData.StockExtraData.VolumeRatio
		}
		if volRatio <= 0 && len(tfData.Klines) >= 2 {
			// Fallback: compute from klines
			currentVol := tfData.Klines[len(tfData.Klines)-1].Volume
			var avgVol float64
			for i := 0; i < len(tfData.Klines)-1 && i < 20; i++ {
				avgVol += tfData.Klines[i].Volume
			}
			if len(tfData.Klines) > 1 {
				avgVol /= float64(min(len(tfData.Klines)-1, 20))
			}
			if avgVol > 0 {
				volRatio = currentVol / avgVol
			}
		}
		if volRatio >= 3.0 {
			volScore = 100 // Massive surge
		} else if volRatio >= 2.0 {
			volScore = 85 // Strong surge
		} else if volRatio >= 1.5 {
			volScore = 70
		} else if volRatio >= 1.0 {
			volScore = 50 // Average
		} else if volRatio >= 0.5 {
			volScore = 25 // Below average
		} else {
			volScore = 5 // Dead volume
		}
		cotBuilder.WriteString(fmt.Sprintf("- **Volume**: ratio %.2f -> Score: %.0f/100\n", volRatio, volScore))

		// Factor 4: Momentum (price change from day open, sweet spot 1-5%)
		momScore := 0.0
		dayOpen := tfData.Klines[0].Open
		if dayOpen > 0 {
			momPct := ((marketData.CurrentPrice - dayOpen) / dayOpen) * 100
			if momPct >= 1.0 && momPct <= 5.0 {
				momScore = 100 - math.Abs(momPct-3.0)*15 // Peak at 3%
			} else if momPct > 5.0 && momPct <= 8.0 {
				momScore = 50 - (momPct-5.0)*10 // Overextended
			} else if momPct > 0 && momPct < 1.0 {
				momScore = 40 + momPct*20 // Weak but positive
			} else if momPct > 8.0 {
				momScore = 5 // Way overextended
			} else {
				momScore = math.Max(0, 30+momPct*5) // Negative momentum
			}
			cotBuilder.WriteString(fmt.Sprintf("- **Momentum**: %+.2f%% from open -> Score: %.0f/100\n", momPct, momScore))
		} else {
			momScore = 50
			cotBuilder.WriteString("- **Momentum**: N/A -> Score: 50/100 (default)\n")
		}

		// Factor 5: VWAP distance (best when price is 0-1% above VWAP)
		vwapScore := 0.0
		if tfData.CurrentVWAP > 0 {
			vwapDist := ((marketData.CurrentPrice - tfData.CurrentVWAP) / tfData.CurrentVWAP) * 100
			if vwapDist >= 0 && vwapDist <= 1.0 {
				vwapScore = 100 - vwapDist*20 // Best: right at VWAP
			} else if vwapDist > 1.0 && vwapDist <= 2.0 {
				vwapScore = 60 - (vwapDist-1.0)*30
			} else if vwapDist > 2.0 {
				vwapScore = math.Max(0, 30-(vwapDist-2.0)*15) // Overextended above
			} else if vwapDist >= -1.0 && vwapDist < 0 {
				vwapScore = 70 + vwapDist*20 // Slightly below = decent
			} else {
				vwapScore = math.Max(0, 50+vwapDist*10) // Way below VWAP
			}
			cotBuilder.WriteString(fmt.Sprintf("- **VWAP**: $%.2f (dist: %+.2f%%) -> Score: %.0f/100\n",
				tfData.CurrentVWAP, vwapDist, vwapScore))
		} else {
			vwapScore = 50
			cotBuilder.WriteString("- **VWAP**: N/A -> Score: 50/100 (default)\n")
		}

		// =====================================================================
		// Composite Score = weighted sum / total weight
		// =====================================================================
		totalWeight := chromo.RSIWeight + chromo.MACDWeight + chromo.VolWeight + chromo.MomWeight + chromo.VWAPWeight
		composite := 0.0
		if totalWeight > 0 {
			composite = (rsiScore*chromo.RSIWeight +
				macdScore*chromo.MACDWeight +
				volScore*chromo.VolWeight +
				momScore*chromo.MomWeight +
				vwapScore*chromo.VWAPWeight) / totalWeight
		}

		passed := composite >= chromo.EntryThresh
		passStr := "SKIP"
		if passed {
			passStr = "BUY SIGNAL"
		}
		cotBuilder.WriteString(fmt.Sprintf("\n**Composite Score: %.1f/100** (threshold: %.0f) -> **%s**\n\n", composite, chromo.EntryThresh, passStr))

		if passed {
			scoredStocks = append(scoredStocks, struct {
				symbol string
				score  float64
			}{symbol, composite})

			// Calculate TP/SL using ATR
			atr := tfData.ATR14
			if atr <= 0 {
				atr = marketData.CurrentPrice * 0.02 // Fallback: 2% of price
			}

			takeProfit := marketData.CurrentPrice + atr*chromo.TPMult
			stopLoss := marketData.CurrentPrice - atr*chromo.SLMult

			// Also check AI100 sell trigger for TP override
			ai100Client := market.GetAI100Client()
			tpPct := ai100Client.GetSellTrigger(symbol)
			if tpPct > 0 {
				ai100TP := marketData.CurrentPrice * (1 + tpPct/100)
				if ai100TP < takeProfit {
					takeProfit = ai100TP // Use tighter AI100 target
				}
				cotBuilder.WriteString(fmt.Sprintf("**AI100 TP**: $%.2f (%+.1f%%) | **ATR TP**: $%.2f (%.1fx ATR)\n",
					ai100TP, tpPct, marketData.CurrentPrice+atr*chromo.TPMult, chromo.TPMult))
			}

			// Position sizing from strategy config
			posRatio := config.RiskControl.SmallCapMaxPositionValueRatio
			if posRatio <= 0 {
				posRatio = 1.0
			}
			positionSize := ctx.Account.TotalEquity * posRatio * 0.8

			// Scale position by confidence (composite score)
			confidencePct := composite / 100.0
			positionSize *= confidencePct

			cotBuilder.WriteString(fmt.Sprintf("**Exit Plan**: TP $%.2f | SL $%.2f | Size $%.2f\n\n", takeProfit, stopLoss, positionSize))

			decisions = append(decisions, Decision{
				Symbol:          symbol,
				Action:          "open_long",
				Leverage:        config.RiskControl.SmallCapMaxMargin,
				PositionSizeUSD: positionSize,
				StopLoss:        stopLoss,
				TakeProfit:      takeProfit,
				Confidence:      int(composite),
				Reasoning: fmt.Sprintf("Genetic Algo (%s): Composite %.1f/100 (RSI:%.0f MACD:%.0f Vol:%.0f Mom:%.0f VWAP:%.0f) > threshold %.0f",
					chromo.Name, composite, rsiScore, macdScore, volScore, momScore, vwapScore, chromo.EntryThresh),
			})
		}
	}

	// Summary
	if len(decisions) == 0 {
		cotBuilder.WriteString("---\n\n**Result:** No stocks passed the genetic scoring threshold.\n\n")
	} else {
		cotBuilder.WriteString("---\n\n**Result:** Stocks selected by Genetic Algorithm:\n")
		for _, d := range decisions {
			cotBuilder.WriteString(fmt.Sprintf("- **%s** -> %s (Confidence: %d%%, TP: $%.2f, SL: $%.2f)\n",
				d.Symbol, strings.ToUpper(d.Action), d.Confidence, d.TakeProfit, d.StopLoss))
		}
		cotBuilder.WriteString("\n")
	}

	return decisions, cotBuilder
}

// ============================================================================
// Helpers
// ============================================================================

// detectAlgoType determines the algo type from the strategy configuration.
// Priority order: genetic > vwaper > scalper (default)
func detectAlgoType(config *store.StrategyConfig) string {
	if config == nil {
		return "unknown"
	}

	// Genetic Algorithm takes priority (most specific)
	if config.Indicators.EnableGeneticAlgo {
		return "genetic"
	}

	// VWAP Slope & Stretch enabled = VWAPer algo
	if config.Indicators.EnableVWAPSlopeStretch {
		return "vwaper"
	}

	// Default: treat as scalper (generic AI-driven)
	return "scalper"
}
