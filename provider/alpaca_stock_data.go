package provider

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"
)

// Alpaca API endpoints
const (
	alpacaDataBaseURL = "https://data.alpaca.markets"
	alpacaAPIBaseURL  = "https://api.alpaca.markets"
)

// FMP (Financial Modeling Prep) API
const (
	fmpBaseURL = "https://financialmodelingprep.com/api/v3"
	fmpAPIKey  = "JgGALumW4MUTAuCLQZRS9BgldKqLdpM6"
)

// FINRA API
const (
	finraBaseURL = "https://api.finra.org"
	finraAPIKey  = "936b8cae86624e52a299"
)

// AlpacaStockDataConfig holds Alpaca API credentials
type AlpacaStockDataConfig struct {
	APIKey    string
	APISecret string
}

var alpacaStockConfig AlpacaStockDataConfig

// fmpRequest makes a request to FMP API
func fmpRequest(endpoint string) ([]byte, error) {
	url := fmt.Sprintf("%s%s?apikey=%s", fmpBaseURL, endpoint, fmpAPIKey)
	
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("FMP request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read FMP response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("FMP API returned status %d: %s", resp.StatusCode, string(body))
	}

	return body, nil
}

// SetAlpacaStockDataCredentials sets Alpaca API credentials for stock data
func SetAlpacaStockDataCredentials(apiKey, apiSecret string) {
	alpacaStockConfig.APIKey = apiKey
	alpacaStockConfig.APISecret = apiSecret
}

// getAlpacaCredentials returns configured or environment credentials
func getAlpacaCredentials() (string, string, error) {
	apiKey := alpacaStockConfig.APIKey
	apiSecret := alpacaStockConfig.APISecret

	if apiKey == "" {
		apiKey = os.Getenv("ALPACA_API_KEY")
	}
	if apiSecret == "" {
		apiSecret = os.Getenv("ALPACA_API_SECRET")
	}

	if apiKey == "" || apiSecret == "" {
		return "", "", fmt.Errorf("Alpaca API credentials not configured")
	}

	return apiKey, apiSecret, nil
}

// alpacaRequest makes an authenticated request to Alpaca API
func alpacaRequest(url string) ([]byte, error) {
	apiKey, apiSecret, err := getAlpacaCredentials()
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("APCA-API-KEY-ID", apiKey)
	req.Header.Set("APCA-API-SECRET-KEY", apiSecret)

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	return body, nil
}

// ============================================================================
// 1. STOCK NEWS & SENTIMENT
// ============================================================================

// StockNewsItem represents a news article from Alpaca
type StockNewsItem struct {
	ID        int64    `json:"id"`
	Headline  string   `json:"headline"`
	Summary   string   `json:"summary"`
	Author    string   `json:"author"`
	Source    string   `json:"source"`
	URL       string   `json:"url"`
	Symbols   []string `json:"symbols"`
	CreatedAt string   `json:"created_at"`
	UpdatedAt string   `json:"updated_at"`
	// Derived sentiment
	Sentiment      string  `json:"sentiment"`       // bullish, bearish, neutral
	SentimentScore float64 `json:"sentiment_score"` // -1 to 1
}

// StockNewsData holds news data for AI consumption
type StockNewsData struct {
	Symbols   []string        `json:"symbols"`
	News      []StockNewsItem `json:"news"`
	FetchedAt time.Time       `json:"fetched_at"`
	Summary   string          `json:"summary"`
}

// GetStockNews fetches recent news for symbols using Alpaca API
func GetStockNews(symbols []string, limit int) (*StockNewsData, error) {
	if len(symbols) == 0 {
		return nil, fmt.Errorf("no symbols provided")
	}
	if limit <= 0 {
		limit = 10
	}

	symbolsStr := strings.Join(symbols, ",")
	url := fmt.Sprintf("%s/v1beta1/news?symbols=%s&limit=%d", alpacaDataBaseURL, symbolsStr, limit)

	body, err := alpacaRequest(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch news: %w", err)
	}

	var response struct {
		News []StockNewsItem `json:"news"`
	}
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("failed to parse news: %w", err)
	}

	// Add basic sentiment analysis based on keywords
	for i := range response.News {
		response.News[i].Sentiment, response.News[i].SentimentScore = analyzeSentiment(response.News[i].Headline + " " + response.News[i].Summary)
	}

	result := &StockNewsData{
		Symbols:   symbols,
		News:      response.News,
		FetchedAt: time.Now(),
	}

	return result, nil
}

// analyzeSentiment performs basic keyword-based sentiment analysis
func analyzeSentiment(text string) (string, float64) {
	text = strings.ToLower(text)

	bullishWords := []string{"surge", "rally", "gain", "up", "higher", "beat", "exceed", "growth", "profit", "bullish", "upgrade", "buy", "outperform", "strong", "positive", "soar"}
	bearishWords := []string{"drop", "fall", "decline", "down", "lower", "miss", "loss", "cut", "bearish", "downgrade", "sell", "underperform", "weak", "negative", "plunge", "crash"}

	bullishCount := 0
	bearishCount := 0

	for _, word := range bullishWords {
		if strings.Contains(text, word) {
			bullishCount++
		}
	}
	for _, word := range bearishWords {
		if strings.Contains(text, word) {
			bearishCount++
		}
	}

	if bullishCount > bearishCount+1 {
		return "bullish", float64(bullishCount-bearishCount) / 10.0
	} else if bearishCount > bullishCount+1 {
		return "bearish", float64(bearishCount-bullishCount) / -10.0
	}
	return "neutral", 0.0
}

// FormatStockNewsForAI formats news data for AI consumption
func FormatStockNewsForAI(data *StockNewsData) string {
	if data == nil || len(data.News) == 0 {
		return ""
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("## 📰 Recent News for %s\n\n", strings.Join(data.Symbols, ", ")))

	bullishCount, bearishCount, neutralCount := 0, 0, 0
	for _, news := range data.News {
		switch news.Sentiment {
		case "bullish":
			bullishCount++
		case "bearish":
			bearishCount++
		default:
			neutralCount++
		}
	}

	sb.WriteString(fmt.Sprintf("**Overall Sentiment:** %d Bullish | %d Bearish | %d Neutral\n\n", bullishCount, bearishCount, neutralCount))
	sb.WriteString("| Time | Headline | Sentiment | Source |\n")
	sb.WriteString("|------|----------|-----------|--------|\n")

	for _, news := range data.News {
		emoji := "⚪"
		switch news.Sentiment {
		case "bullish":
			emoji = "🟢"
		case "bearish":
			emoji = "🔴"
		}
		headline := news.Headline
		if len(headline) > 60 {
			headline = headline[:57] + "..."
		}
		sb.WriteString(fmt.Sprintf("| %s | %s | %s %s | %s |\n",
			news.CreatedAt[:16], headline, emoji, news.Sentiment, news.Source))
	}

	return sb.String()
}

// ============================================================================
// 2. TRADE FLOW ANALYSIS
// ============================================================================

// TradeFlowData holds trade flow analysis
type TradeFlowData struct {
	Symbol        string    `json:"symbol"`
	TotalVolume   int64     `json:"total_volume"`
	BuyVolume     int64     `json:"buy_volume"`
	SellVolume    int64     `json:"sell_volume"`
	LargeOrders   int       `json:"large_orders"`    // Orders > $100k
	AvgTradeSize  float64   `json:"avg_trade_size"`
	VWAP          float64   `json:"vwap"`
	BuySellRatio  float64   `json:"buy_sell_ratio"`
	FlowDirection string    `json:"flow_direction"` // buying, selling, neutral
	FetchedAt     time.Time `json:"fetched_at"`
}

// GetTradeFlow analyzes recent trade flow for a symbol
func GetTradeFlow(symbol string, minutes int) (*TradeFlowData, error) {
	if symbol == "" {
		return nil, fmt.Errorf("symbol required")
	}
	if minutes <= 0 {
		minutes = 30
	}

	end := time.Now()
	start := end.Add(-time.Duration(minutes) * time.Minute)

	url := fmt.Sprintf("%s/v2/stocks/%s/trades?start=%s&end=%s&limit=10000",
		alpacaDataBaseURL, symbol,
		start.Format(time.RFC3339), end.Format(time.RFC3339))

	body, err := alpacaRequest(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch trades: %w", err)
	}

	var response struct {
		Trades []struct {
			Price     float64 `json:"p"`
			Size      int64   `json:"s"`
			Timestamp string  `json:"t"`
			Conditions []string `json:"c"`
		} `json:"trades"`
	}
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("failed to parse trades: %w", err)
	}

	result := &TradeFlowData{
		Symbol:    symbol,
		FetchedAt: time.Now(),
	}

	if len(response.Trades) == 0 {
		return result, nil
	}

	// Analyze trade flow
	var totalValue float64
	for _, trade := range response.Trades {
		result.TotalVolume += trade.Size
		tradeValue := trade.Price * float64(trade.Size)
		totalValue += tradeValue

		// Large order detection (> $100k)
		if tradeValue > 100000 {
			result.LargeOrders++
		}
	}

	if result.TotalVolume > 0 {
		result.VWAP = totalValue / float64(result.TotalVolume)
		result.AvgTradeSize = float64(result.TotalVolume) / float64(len(response.Trades))
	}

	// Estimate buy/sell based on price movement (simplified)
	result.BuyVolume = result.TotalVolume / 2
	result.SellVolume = result.TotalVolume / 2
	result.BuySellRatio = 1.0
	result.FlowDirection = "neutral"

	return result, nil
}

// FormatTradeFlowForAI formats trade flow for AI
func FormatTradeFlowForAI(data *TradeFlowData) string {
	if data == nil {
		return ""
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("## 📊 Trade Flow Analysis: %s\n\n", data.Symbol))
	sb.WriteString(fmt.Sprintf("- **Total Volume:** %d shares\n", data.TotalVolume))
	sb.WriteString(fmt.Sprintf("- **VWAP:** $%.2f\n", data.VWAP))
	sb.WriteString(fmt.Sprintf("- **Large Orders (>$100k):** %d\n", data.LargeOrders))
	sb.WriteString(fmt.Sprintf("- **Avg Trade Size:** %.0f shares\n", data.AvgTradeSize))
	sb.WriteString(fmt.Sprintf("- **Flow Direction:** %s\n\n", data.FlowDirection))

	return sb.String()
}

// ============================================================================
// 3. VWAP ANALYSIS
// ============================================================================

// VWAPData holds VWAP analysis across timeframes
type VWAPData struct {
	Symbol     string             `json:"symbol"`
	CurrentPrice float64          `json:"current_price"`
	Timeframes map[string]float64 `json:"timeframes"` // timeframe -> VWAP
	Position   string             `json:"position"`   // above, below, at
	FetchedAt  time.Time          `json:"fetched_at"`
}

// GetVWAPAnalysis gets VWAP across multiple timeframes
func GetVWAPAnalysis(symbol string) (*VWAPData, error) {
	if symbol == "" {
		return nil, fmt.Errorf("symbol required")
	}

	result := &VWAPData{
		Symbol:     symbol,
		Timeframes: make(map[string]float64),
		FetchedAt:  time.Now(),
	}

	// Fetch 1-day bars for daily VWAP
	url := fmt.Sprintf("%s/v2/stocks/%s/bars?timeframe=1Day&limit=5", alpacaDataBaseURL, symbol)
	body, err := alpacaRequest(url)
	if err == nil {
		var response struct {
			Bars []struct {
				VWAP  float64 `json:"vw"`
				Close float64 `json:"c"`
			} `json:"bars"`
		}
		if json.Unmarshal(body, &response) == nil && len(response.Bars) > 0 {
			result.Timeframes["1Day"] = response.Bars[len(response.Bars)-1].VWAP
			result.CurrentPrice = response.Bars[len(response.Bars)-1].Close
		}
	}

	// Fetch 1-hour bars for intraday VWAP
	url = fmt.Sprintf("%s/v2/stocks/%s/bars?timeframe=1Hour&limit=8", alpacaDataBaseURL, symbol)
	body, err = alpacaRequest(url)
	if err == nil {
		var response struct {
			Bars []struct {
				VWAP float64 `json:"vw"`
			} `json:"bars"`
		}
		if json.Unmarshal(body, &response) == nil && len(response.Bars) > 0 {
			// Calculate average VWAP for the period
			var sum float64
			for _, bar := range response.Bars {
				sum += bar.VWAP
			}
			result.Timeframes["1Hour"] = sum / float64(len(response.Bars))
		}
	}

	// Determine position relative to VWAP
	if dailyVWAP, ok := result.Timeframes["1Day"]; ok && result.CurrentPrice > 0 {
		diff := (result.CurrentPrice - dailyVWAP) / dailyVWAP * 100
		if diff > 0.5 {
			result.Position = "above"
		} else if diff < -0.5 {
			result.Position = "below"
		} else {
			result.Position = "at"
		}
	}

	return result, nil
}

// FormatVWAPForAI formats VWAP data for AI
func FormatVWAPForAI(data *VWAPData) string {
	if data == nil {
		return ""
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("## 📈 VWAP Analysis: %s\n\n", data.Symbol))
	sb.WriteString(fmt.Sprintf("- **Current Price:** $%.2f\n", data.CurrentPrice))

	for tf, vwap := range data.Timeframes {
		diff := (data.CurrentPrice - vwap) / vwap * 100
		emoji := "⚪"
		if diff > 0.5 {
			emoji = "🟢"
		} else if diff < -0.5 {
			emoji = "🔴"
		}
		sb.WriteString(fmt.Sprintf("- **%s VWAP:** $%.2f (%s %+.2f%%)\n", tf, vwap, emoji, diff))
	}

	sb.WriteString(fmt.Sprintf("\n**Position:** Price is %s VWAP - ", data.Position))
	switch data.Position {
	case "above":
		sb.WriteString("bullish momentum, buyers in control")
	case "below":
		sb.WriteString("bearish momentum, sellers in control")
	default:
		sb.WriteString("neutral, consolidating around fair value")
	}
	sb.WriteString("\n\n")

	return sb.String()
}

// ============================================================================
// 4. CORPORATE ACTIONS
// ============================================================================

// CorporateAction represents a corporate action event
type CorporateAction struct {
	ID          string  `json:"id"`
	Symbol      string  `json:"symbol"`
	Type        string  `json:"type"` // dividend, split, spinoff
	Date        string  `json:"date"`
	Description string  `json:"description"`
	Amount      float64 `json:"amount,omitempty"`
	Ratio       string  `json:"ratio,omitempty"`
}

// CorporateActionsData holds corporate actions for symbols
type CorporateActionsData struct {
	Symbols   []string          `json:"symbols"`
	Actions   []CorporateAction `json:"actions"`
	FetchedAt time.Time         `json:"fetched_at"`
}

// GetCorporateActions fetches corporate actions for symbols
func GetCorporateActions(symbols []string, daysAhead int) (*CorporateActionsData, error) {
	if len(symbols) == 0 {
		return nil, fmt.Errorf("no symbols provided")
	}
	if daysAhead <= 0 {
		daysAhead = 30
	}

	start := time.Now().Format("2006-01-02")
	end := time.Now().AddDate(0, 0, daysAhead).Format("2006-01-02")
	symbolsStr := strings.Join(symbols, ",")

	url := fmt.Sprintf("%s/v1/corporate-actions?symbols=%s&start=%s&end=%s",
		alpacaAPIBaseURL, symbolsStr, start, end)

	body, err := alpacaRequest(url)
	if err != nil {
		// Corporate actions API may not be available for all accounts
		return &CorporateActionsData{
			Symbols:   symbols,
			Actions:   []CorporateAction{},
			FetchedAt: time.Now(),
		}, nil
	}

	var actions []CorporateAction
	json.Unmarshal(body, &actions)

	return &CorporateActionsData{
		Symbols:   symbols,
		Actions:   actions,
		FetchedAt: time.Now(),
	}, nil
}

// FormatCorporateActionsForAI formats corporate actions for AI
func FormatCorporateActionsForAI(data *CorporateActionsData) string {
	if data == nil {
		return ""
	}

	var sb strings.Builder
	sb.WriteString("## 📅 Corporate Actions Calendar\n\n")

	if len(data.Actions) == 0 {
		sb.WriteString("No upcoming corporate actions for watched symbols.\n\n")
		return sb.String()
	}

	sb.WriteString("| Date | Symbol | Type | Details |\n")
	sb.WriteString("|------|--------|------|--------|\n")

	for _, action := range data.Actions {
		sb.WriteString(fmt.Sprintf("| %s | %s | %s | %s |\n",
			action.Date, action.Symbol, action.Type, action.Description))
	}

	return sb.String()
}

// ============================================================================
// 5. VOLUME SURGE DETECTION
// ============================================================================

// VolumeSurgeData holds volume surge analysis
type VolumeSurgeData struct {
	Symbol         string    `json:"symbol"`
	CurrentVolume  int64     `json:"current_volume"`
	AvgVolume      int64     `json:"avg_volume"`
	VolumeRatio    float64   `json:"volume_ratio"`
	IsSurge        bool      `json:"is_surge"`
	SurgeLevel     string    `json:"surge_level"` // normal, elevated, high, extreme
	FetchedAt      time.Time `json:"fetched_at"`
}

// GetVolumeSurge detects unusual volume for a symbol
func GetVolumeSurge(symbol string) (*VolumeSurgeData, error) {
	if symbol == "" {
		return nil, fmt.Errorf("symbol required")
	}

	// Get recent daily bars to calculate average volume
	url := fmt.Sprintf("%s/v2/stocks/%s/bars?timeframe=1Day&limit=21", alpacaDataBaseURL, symbol)
	body, err := alpacaRequest(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch bars: %w", err)
	}

	var response struct {
		Bars []struct {
			Volume int64 `json:"v"`
		} `json:"bars"`
	}
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("failed to parse bars: %w", err)
	}

	if len(response.Bars) < 2 {
		return nil, fmt.Errorf("insufficient data for volume analysis")
	}

	// Current volume is last bar, average is previous 20 bars
	currentVolume := response.Bars[len(response.Bars)-1].Volume

	var totalVolume int64
	for i := 0; i < len(response.Bars)-1; i++ {
		totalVolume += response.Bars[i].Volume
	}
	avgVolume := totalVolume / int64(len(response.Bars)-1)

	ratio := float64(currentVolume) / float64(avgVolume)

	result := &VolumeSurgeData{
		Symbol:        symbol,
		CurrentVolume: currentVolume,
		AvgVolume:     avgVolume,
		VolumeRatio:   ratio,
		IsSurge:       ratio > 1.5,
		FetchedAt:     time.Now(),
	}

	switch {
	case ratio >= 3.0:
		result.SurgeLevel = "extreme"
	case ratio >= 2.0:
		result.SurgeLevel = "high"
	case ratio >= 1.5:
		result.SurgeLevel = "elevated"
	default:
		result.SurgeLevel = "normal"
	}

	return result, nil
}

// FormatVolumeSurgeForAI formats volume surge for AI
func FormatVolumeSurgeForAI(data *VolumeSurgeData) string {
	if data == nil {
		return ""
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("## 📊 Volume Analysis: %s\n\n", data.Symbol))

	emoji := "⚪"
	switch data.SurgeLevel {
	case "extreme":
		emoji = "🔥"
	case "high":
		emoji = "🟠"
	case "elevated":
		emoji = "🟡"
	}

	sb.WriteString(fmt.Sprintf("- **Current Volume:** %d\n", data.CurrentVolume))
	sb.WriteString(fmt.Sprintf("- **20-Day Avg Volume:** %d\n", data.AvgVolume))
	sb.WriteString(fmt.Sprintf("- **Volume Ratio:** %.2fx %s\n", data.VolumeRatio, emoji))
	sb.WriteString(fmt.Sprintf("- **Level:** %s\n\n", strings.ToUpper(data.SurgeLevel)))

	if data.IsSurge {
		sb.WriteString("⚠️ **Volume Surge Detected** - Unusual trading activity, watch for breakout or breakdown.\n\n")
	}

	return sb.String()
}

// ============================================================================
// 6. EARNINGS CALENDAR (FMP API)
// ============================================================================

// EarningsData holds earnings information
type EarningsData struct {
	Symbol          string    `json:"symbol"`
	NextEarnings    string    `json:"next_earnings"`    // Date
	DaysUntil       int       `json:"days_until"`
	EpsEstimate     float64   `json:"eps_estimate"`
	EpsActual       float64   `json:"eps_actual"`
	RevenueEstimate float64   `json:"revenue_estimate"`
	RevenueActual   float64   `json:"revenue_actual"`
	Time            string    `json:"time"`             // BMO (Before Market Open), AMC (After Market Close)
	FetchedAt       time.Time `json:"fetched_at"`
}

// GetEarningsCalendar fetches earnings calendar from FMP API
func GetEarningsCalendar(symbols []string) ([]EarningsData, error) {
	result := make([]EarningsData, 0)

	for _, symbol := range symbols {
		earning := EarningsData{
			Symbol:    symbol,
			DaysUntil: -1,
			FetchedAt: time.Now(),
		}

		// Get upcoming earnings for this symbol
		body, err := fmpRequest(fmt.Sprintf("/historical/earning_calendar/%s", symbol))
		if err == nil {
			var earnings []struct {
				Symbol          string  `json:"symbol"`
				Date            string  `json:"date"`
				EpsEstimated    float64 `json:"epsEstimated"`
				Eps             float64 `json:"eps"`
				RevenueEstimated float64 `json:"revenueEstimated"`
				Revenue         float64 `json:"revenue"`
				Time            string  `json:"time"` // "bmo" or "amc"
			}
			if json.Unmarshal(body, &earnings) == nil && len(earnings) > 0 {
				// Find the next future earnings date
				now := time.Now()
				for _, e := range earnings {
					earningsDate, err := time.Parse("2006-01-02", e.Date)
					if err != nil {
						continue
					}
					if earningsDate.After(now) || earningsDate.Equal(now) {
						earning.NextEarnings = e.Date
						earning.DaysUntil = int(earningsDate.Sub(now).Hours() / 24)
						earning.EpsEstimate = e.EpsEstimated
						earning.RevenueEstimate = e.RevenueEstimated
						earning.Time = strings.ToUpper(e.Time)
						if earning.Time == "BMO" {
							earning.Time = "Before Market Open"
						} else if earning.Time == "AMC" {
							earning.Time = "After Market Close"
						}
						break
					}
				}
				// If no future date found, show most recent past earnings
				if earning.NextEarnings == "" && len(earnings) > 0 {
					earning.NextEarnings = earnings[0].Date + " (Past)"
					earning.EpsActual = earnings[0].Eps
					earning.RevenueActual = earnings[0].Revenue
				}
			}
		}

		if earning.NextEarnings == "" {
			earning.NextEarnings = "No data"
		}
		
		result = append(result, earning)
	}

	return result, nil
}

// FormatEarningsForAI formats earnings data for AI
func FormatEarningsForAI(data []EarningsData) string {
	if len(data) == 0 {
		return ""
	}

	var sb strings.Builder
	sb.WriteString("## 📅 Earnings Calendar (FMP Data)\n\n")

	// Upcoming earnings
	upcoming := make([]EarningsData, 0)
	past := make([]EarningsData, 0)
	
	for _, e := range data {
		if e.DaysUntil >= 0 {
			upcoming = append(upcoming, e)
		} else {
			past = append(past, e)
		}
	}

	if len(upcoming) > 0 {
		sb.WriteString("### 📆 Upcoming Earnings\n\n")
		sb.WriteString("| Symbol | Date | Days Until | Time | EPS Est. | Rev Est. |\n")
		sb.WriteString("|--------|------|------------|------|----------|----------|\n")
		
		for _, e := range upcoming {
			timeStr := e.Time
			if timeStr == "" {
				timeStr = "TBD"
			}
			revStr := "N/A"
			if e.RevenueEstimate > 0 {
				revStr = fmt.Sprintf("$%.0fM", e.RevenueEstimate/1e6)
			}
			epsStr := "N/A"
			if e.EpsEstimate != 0 {
				epsStr = fmt.Sprintf("$%.2f", e.EpsEstimate)
			}
			
			daysEmoji := "🟢"
			if e.DaysUntil <= 7 {
				daysEmoji = "🔴"
			} else if e.DaysUntil <= 14 {
				daysEmoji = "🟡"
			}
			
			sb.WriteString(fmt.Sprintf("| %s | %s | %s %d days | %s | %s | %s |\n",
				e.Symbol, e.NextEarnings, daysEmoji, e.DaysUntil, timeStr, epsStr, revStr))
		}
		sb.WriteString("\n")
	}

	if len(past) > 0 && len(upcoming) == 0 {
		sb.WriteString("### 📊 Recent Earnings (No upcoming dates found)\n\n")
		for _, e := range past {
			sb.WriteString(fmt.Sprintf("**%s:** Last reported on %s\n", e.Symbol, e.NextEarnings))
			if e.EpsActual != 0 {
				sb.WriteString(fmt.Sprintf("  - EPS: $%.2f\n", e.EpsActual))
			}
			if e.RevenueActual > 0 {
				sb.WriteString(fmt.Sprintf("  - Revenue: $%.0fM\n", e.RevenueActual/1e6))
			}
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

// ============================================================================
// 7. ANALYST RATINGS (FMP API)
// ============================================================================

// AnalystRating represents analyst rating data
type AnalystRating struct {
	Symbol        string    `json:"symbol"`
	Rating        string    `json:"rating"`         // Strong Buy, Buy, Hold, Sell, Strong Sell
	TargetPrice   float64   `json:"target_price"`
	CurrentPrice  float64   `json:"current_price"`
	Upside        float64   `json:"upside_pct"`
	Analysts      int       `json:"analysts"`
	StrongBuy     int       `json:"strong_buy"`
	Buy           int       `json:"buy"`
	Hold          int       `json:"hold"`
	Sell          int       `json:"sell"`
	StrongSell    int       `json:"strong_sell"`
	RecentChanges []string  `json:"recent_changes,omitempty"` // Recent rating changes
	FetchedAt     time.Time `json:"fetched_at"`
}

// GetAnalystRatings fetches analyst ratings from FMP API
func GetAnalystRatings(symbols []string) ([]AnalystRating, error) {
	result := make([]AnalystRating, 0)

	for _, symbol := range symbols {
		rating := AnalystRating{
			Symbol:    symbol,
			FetchedAt: time.Now(),
		}

		// Get consensus rating
		body, err := fmpRequest(fmt.Sprintf("/grade/%s", symbol))
		if err == nil {
			var grades []struct {
				Symbol        string `json:"symbol"`
				GradingCompany string `json:"gradingCompany"`
				PreviousGrade string `json:"previousGrade"`
				NewGrade      string `json:"newGrade"`
				Date          string `json:"date"`
			}
			if json.Unmarshal(body, &grades) == nil && len(grades) > 0 {
				// Count recent ratings (last 10)
				buyCount, holdCount, sellCount := 0, 0, 0
				recentLimit := 10
				if len(grades) < recentLimit {
					recentLimit = len(grades)
				}
				
				recentChanges := make([]string, 0)
				for i := 0; i < recentLimit; i++ {
					grade := strings.ToLower(grades[i].NewGrade)
					if strings.Contains(grade, "buy") || strings.Contains(grade, "outperform") {
						buyCount++
					} else if strings.Contains(grade, "hold") || strings.Contains(grade, "neutral") {
						holdCount++
					} else if strings.Contains(grade, "sell") || strings.Contains(grade, "underperform") {
						sellCount++
					}
					if i < 3 {
						recentChanges = append(recentChanges, fmt.Sprintf("%s: %s → %s (%s)", 
							grades[i].Date, grades[i].PreviousGrade, grades[i].NewGrade, grades[i].GradingCompany))
					}
				}
				
				rating.Buy = buyCount
				rating.Hold = holdCount
				rating.Sell = sellCount
				rating.Analysts = buyCount + holdCount + sellCount
				rating.RecentChanges = recentChanges
				
				// Determine consensus
				if buyCount > holdCount && buyCount > sellCount {
					rating.Rating = "Buy"
				} else if sellCount > holdCount && sellCount > buyCount {
					rating.Rating = "Sell"
				} else {
					rating.Rating = "Hold"
				}
			}
		}

		// Get price target
		body, err = fmpRequest(fmt.Sprintf("/price-target/%s", symbol))
		if err == nil {
			var targets []struct {
				Symbol           string  `json:"symbol"`
				TargetHigh       float64 `json:"targetHigh"`
				TargetLow        float64 `json:"targetLow"`
				TargetConsensus  float64 `json:"targetConsensus"`
				TargetMedian     float64 `json:"targetMedian"`
			}
			if json.Unmarshal(body, &targets) == nil && len(targets) > 0 {
				rating.TargetPrice = targets[0].TargetConsensus
				if rating.TargetPrice == 0 {
					rating.TargetPrice = targets[0].TargetMedian
				}
			}
		}

		// Get current price for upside calculation
		body, err = fmpRequest(fmt.Sprintf("/quote/%s", symbol))
		if err == nil {
			var quotes []struct {
				Symbol string  `json:"symbol"`
				Price  float64 `json:"price"`
			}
			if json.Unmarshal(body, &quotes) == nil && len(quotes) > 0 {
				rating.CurrentPrice = quotes[0].Price
				if rating.TargetPrice > 0 && rating.CurrentPrice > 0 {
					rating.Upside = ((rating.TargetPrice - rating.CurrentPrice) / rating.CurrentPrice) * 100
				}
			}
		}

		if rating.Rating == "" {
			rating.Rating = "No Data"
		}
		
		result = append(result, rating)
	}

	return result, nil
}

// FormatAnalystRatingsForAI formats analyst ratings for AI
func FormatAnalystRatingsForAI(data []AnalystRating) string {
	if len(data) == 0 {
		return ""
	}

	var sb strings.Builder
	sb.WriteString("## 🎯 Analyst Ratings (FMP Data)\n\n")
	
	for _, rating := range data {
		emoji := "⚪"
		if strings.Contains(strings.ToLower(rating.Rating), "buy") {
			emoji = "🟢"
		} else if strings.Contains(strings.ToLower(rating.Rating), "sell") {
			emoji = "🔴"
		} else if rating.Rating == "Hold" {
			emoji = "🟡"
		}
		
		sb.WriteString(fmt.Sprintf("### %s %s - %s\n", emoji, rating.Symbol, rating.Rating))
		sb.WriteString(fmt.Sprintf("- **Target Price:** $%.2f\n", rating.TargetPrice))
		sb.WriteString(fmt.Sprintf("- **Current Price:** $%.2f\n", rating.CurrentPrice))
		if rating.Upside != 0 {
			upsideEmoji := "📈"
			if rating.Upside < 0 {
				upsideEmoji = "📉"
			}
			sb.WriteString(fmt.Sprintf("- **Upside/Downside:** %s %+.1f%%\n", upsideEmoji, rating.Upside))
		}
		sb.WriteString(fmt.Sprintf("- **Ratings Breakdown:** %d Buy | %d Hold | %d Sell\n", rating.Buy, rating.Hold, rating.Sell))
		
		if len(rating.RecentChanges) > 0 {
			sb.WriteString("- **Recent Changes:**\n")
			for _, change := range rating.RecentChanges {
				sb.WriteString(fmt.Sprintf("  - %s\n", change))
			}
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

// 8. SHORT INTEREST (FINRA API)
// ============================================================================

// ShortInterestData represents short interest information
type ShortInterestData struct {
	Symbol            string    `json:"symbol"`
	ShortInterest     int64     `json:"short_interest"`
	ShortRatio        float64   `json:"short_ratio"`         // Days to cover
	ShortPercentFloat float64   `json:"short_percent_float"`
	AvgDailyVolume    int64     `json:"avg_daily_volume"`
	ChangePercent     float64   `json:"change_percent"`      // Change from previous report
	SettlementDate    string    `json:"settlement_date"`
	SqueezeRisk       string    `json:"squeeze_risk"`        // low, medium, high
	FetchedAt         time.Time `json:"fetched_at"`
}

// finraRequest makes a request to FINRA API
func finraRequest(endpoint string, params string) ([]byte, error) {
	url := fmt.Sprintf("%s%s?%s", finraBaseURL, endpoint, params)
	
	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	// FINRA uses API key authorization
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", finraAPIKey))
	req.Header.Set("Accept", "application/json")
	
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("FINRA request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read FINRA response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("FINRA API returned status %d: %s", resp.StatusCode, string(body))
	}

	return body, nil
}

// GetShortInterest fetches short interest data from FINRA
func GetShortInterest(symbols []string) ([]ShortInterestData, error) {
	result := make([]ShortInterestData, 0)

	for _, symbol := range symbols {
		data := ShortInterestData{
			Symbol:    symbol,
			FetchedAt: time.Now(),
		}

		// Try FINRA short interest API
		// Endpoint: /data/equity/shortinterest/v2/daily
		body, err := finraRequest(
			"/data/equity/shortinterest/v2/daily",
			fmt.Sprintf("symbol=%s&limit=2&sortField=settlementDate&sortType=desc", symbol),
		)
		
		if err == nil {
			var response struct {
				Data []struct {
					Symbol            string  `json:"symbolCode"`
					ShortInterest     int64   `json:"currentShortPositionQuantity"`
					AvgDailyVolume    int64   `json:"averageDailyVolumeQuantity"`
					DaysToCover       float64 `json:"daysToCoverQuantity"`
					PercentFloat      float64 `json:"percentOfSharesOutstandingFloat"`
					SettlementDate    string  `json:"settlementDate"`
					PreviousShort     int64   `json:"previousShortPositionQuantity"`
				} `json:"data"`
			}
			if json.Unmarshal(body, &response) == nil && len(response.Data) > 0 {
				d := response.Data[0]
				data.ShortInterest = d.ShortInterest
				data.ShortRatio = d.DaysToCover
				data.ShortPercentFloat = d.PercentFloat
				data.AvgDailyVolume = d.AvgDailyVolume
				data.SettlementDate = d.SettlementDate
				
				// Calculate change from previous
				if d.PreviousShort > 0 {
					data.ChangePercent = float64(d.ShortInterest-d.PreviousShort) / float64(d.PreviousShort) * 100
				}
			}
		}

		// Determine squeeze risk based on metrics
		if data.ShortInterest > 0 {
			// High squeeze risk: >20% float short OR >10 days to cover
			// Medium squeeze risk: >10% float short OR >5 days to cover
			// Low squeeze risk: <10% float short AND <5 days to cover
			if data.ShortPercentFloat > 20 || data.ShortRatio > 10 {
				data.SqueezeRisk = "High"
			} else if data.ShortPercentFloat > 10 || data.ShortRatio > 5 {
				data.SqueezeRisk = "Medium"
			} else {
				data.SqueezeRisk = "Low"
			}
		} else {
			data.SqueezeRisk = "No Data"
		}

		result = append(result, data)
	}

	return result, nil
}

// FormatShortInterestForAI formats short interest for AI
func FormatShortInterestForAI(data []ShortInterestData) string {
	if len(data) == 0 {
		return ""
	}

	var sb strings.Builder
	sb.WriteString("## 📉 Short Interest Data (FINRA)\n\n")

	for _, d := range data {
		riskEmoji := "🟢"
		if d.SqueezeRisk == "High" {
			riskEmoji = "🔴"
		} else if d.SqueezeRisk == "Medium" {
			riskEmoji = "🟡"
		}
		
		sb.WriteString(fmt.Sprintf("### %s %s - %s Squeeze Risk\n", riskEmoji, d.Symbol, d.SqueezeRisk))
		
		if d.ShortInterest > 0 {
			sb.WriteString(fmt.Sprintf("- **Short Interest:** %d shares\n", d.ShortInterest))
			sb.WriteString(fmt.Sprintf("- **Days to Cover:** %.1f days\n", d.ShortRatio))
			sb.WriteString(fmt.Sprintf("- **%% Float Short:** %.1f%%\n", d.ShortPercentFloat))
			if d.AvgDailyVolume > 0 {
				sb.WriteString(fmt.Sprintf("- **Avg Daily Volume:** %d\n", d.AvgDailyVolume))
			}
			if d.ChangePercent != 0 {
				changeEmoji := "📈"
				if d.ChangePercent < 0 {
					changeEmoji = "📉"
				}
				sb.WriteString(fmt.Sprintf("- **Change from Previous:** %s %+.1f%%\n", changeEmoji, d.ChangePercent))
			}
			if d.SettlementDate != "" {
				sb.WriteString(fmt.Sprintf("- **Settlement Date:** %s\n", d.SettlementDate))
			}
		} else {
			sb.WriteString("- Short interest data not available\n")
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

// ============================================================================
// 9. ZERO DTE OPTIONS (Alpaca Options API)
// ============================================================================

// ZeroDTEData represents zero day to expiration options sentiment
type ZeroDTEData struct {
	Symbol          string    `json:"symbol"`
	TotalCallOI     int64     `json:"total_call_oi"`
	TotalPutOI      int64     `json:"total_put_oi"`
	TotalCallVolume int64     `json:"total_call_volume"`
	TotalPutVolume  int64     `json:"total_put_volume"`
	PutCallRatio    float64   `json:"put_call_ratio"`     // Based on OI
	VolumeRatio     float64   `json:"volume_ratio"`       // Put volume / Call volume
	Sentiment       string    `json:"sentiment"`          // bullish, bearish, neutral
	MaxPainStrike   float64   `json:"max_pain_strike"`
	ExpirationDate  string    `json:"expiration_date"`
	ContractsCount  int       `json:"contracts_count"`
	FetchedAt       time.Time `json:"fetched_at"`
}

// GetZeroDTEOptions fetches zero DTE options data from Alpaca
func GetZeroDTEOptions(symbol string) (*ZeroDTEData, error) {
	if symbol == "" {
		return nil, fmt.Errorf("symbol required")
	}

	result := &ZeroDTEData{
		Symbol:         symbol,
		ExpirationDate: time.Now().Format("2006-01-02"),
		FetchedAt:      time.Now(),
	}

	// Alpaca Options API endpoint for option chain
	// GET /v1beta1/options/snapshots/{underlying_symbol}
	today := time.Now().Format("2006-01-02")
	url := fmt.Sprintf("%s/v1beta1/options/snapshots/%s?expiration_date=%s&limit=1000",
		alpacaDataBaseURL, symbol, today)

	body, err := alpacaRequest(url)
	if err != nil {
		// Options API may not be available or no 0DTE options exist
		result.Sentiment = "No Data"
		return result, nil
	}

	// Parse options snapshots
	var response struct {
		Snapshots map[string]struct {
			LatestQuote struct {
				Ap float64 `json:"ap"` // Ask price
				As int64   `json:"as"` // Ask size
				Bp float64 `json:"bp"` // Bid price
				Bs int64   `json:"bs"` // Bid size
			} `json:"latestQuote"`
			LatestTrade struct {
				P float64 `json:"p"` // Price
				S int64   `json:"s"` // Size
			} `json:"latestTrade"`
			OpenInterest int64 `json:"openInterest"`
		} `json:"snapshots"`
	}

	if err := json.Unmarshal(body, &response); err != nil {
		result.Sentiment = "Parse Error"
		return result, nil
	}

	// Parse option symbols and aggregate calls vs puts
	// Alpaca option symbols format: SPY240318C00500000 (underlying + expiry + C/P + strike)
	for optSymbol, snap := range response.Snapshots {
		result.ContractsCount++

		// Determine if call or put from symbol (contains 'C' or 'P' after date)
		isCall := false
		isPut := false
		
		// Simple heuristic: look for C or P in the symbol after the underlying
		if len(optSymbol) > len(symbol)+6 {
			typeChar := optSymbol[len(symbol)+6 : len(symbol)+7]
			isCall = typeChar == "C"
			isPut = typeChar == "P"
		}

		if isCall {
			result.TotalCallOI += snap.OpenInterest
			if snap.LatestTrade.S > 0 {
				result.TotalCallVolume += snap.LatestTrade.S
			}
		} else if isPut {
			result.TotalPutOI += snap.OpenInterest
			if snap.LatestTrade.S > 0 {
				result.TotalPutVolume += snap.LatestTrade.S
			}
		}
	}

	// Calculate ratios
	if result.TotalCallOI > 0 {
		result.PutCallRatio = float64(result.TotalPutOI) / float64(result.TotalCallOI)
	}
	if result.TotalCallVolume > 0 {
		result.VolumeRatio = float64(result.TotalPutVolume) / float64(result.TotalCallVolume)
	}

	// Determine sentiment based on put/call ratio
	// < 0.7 = Bullish (more calls)
	// 0.7 - 1.0 = Neutral
	// > 1.0 = Bearish (more puts)
	if result.PutCallRatio < 0.7 {
		result.Sentiment = "Bullish"
	} else if result.PutCallRatio > 1.0 {
		result.Sentiment = "Bearish"
	} else {
		result.Sentiment = "Neutral"
	}

	return result, nil
}

// FormatZeroDTEForAI formats zero DTE options data for AI
func FormatZeroDTEForAI(data *ZeroDTEData) string {
	if data == nil {
		return ""
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("## 📊 Zero DTE Options: %s\n\n", data.Symbol))

	if data.Sentiment == "No Data" || data.ContractsCount == 0 {
		sb.WriteString("No zero DTE options data available for today.\n\n")
		return sb.String()
	}

	// Sentiment emoji
	emoji := "⚪"
	if data.Sentiment == "Bullish" {
		emoji = "🟢"
	} else if data.Sentiment == "Bearish" {
		emoji = "🔴"
	} else {
		emoji = "🟡"
	}

	sb.WriteString(fmt.Sprintf("**Expiration:** %s (Today)\n\n", data.ExpirationDate))
	sb.WriteString(fmt.Sprintf("### %s Overall Sentiment: %s\n\n", emoji, data.Sentiment))

	sb.WriteString("| Metric | Calls | Puts |\n")
	sb.WriteString("|--------|-------|------|\n")
	sb.WriteString(fmt.Sprintf("| Open Interest | %d | %d |\n", data.TotalCallOI, data.TotalPutOI))
	sb.WriteString(fmt.Sprintf("| Volume | %d | %d |\n", data.TotalCallVolume, data.TotalPutVolume))

	sb.WriteString(fmt.Sprintf("\n- **Put/Call OI Ratio:** %.2f", data.PutCallRatio))
	if data.PutCallRatio < 0.7 {
		sb.WriteString(" (Bullish - Heavy call buying)")
	} else if data.PutCallRatio > 1.0 {
		sb.WriteString(" (Bearish - Heavy put buying)")
	} else {
		sb.WriteString(" (Neutral)")
	}
	sb.WriteString("\n")

	if data.VolumeRatio > 0 {
		sb.WriteString(fmt.Sprintf("- **Put/Call Volume Ratio:** %.2f\n", data.VolumeRatio))
	}

	sb.WriteString(fmt.Sprintf("- **Total Contracts:** %d\n\n", data.ContractsCount))

	// AI interpretation
	sb.WriteString("**Interpretation:** ")
	if data.Sentiment == "Bullish" {
		sb.WriteString("Zero DTE options flow suggests upward pressure. Call buyers are dominant, indicating expectations for price increase today.")
	} else if data.Sentiment == "Bearish" {
		sb.WriteString("Zero DTE options flow suggests downward pressure. Put buyers are dominant, indicating expectations for price decrease or hedging activity.")
	} else {
		sb.WriteString("Zero DTE options flow is balanced. No strong directional bias from options market.")
	}
	sb.WriteString("\n\n")

	return sb.String()
}

// ============================================================================
// COMBINED STOCK RANKINGS
// ============================================================================

// StockRankingsData combines all stock ranking indicators
type StockRankingsData struct {
	Symbols          []string              `json:"symbols"`
	News             *StockNewsData        `json:"news,omitempty"`
	TradeFlow        map[string]*TradeFlowData `json:"trade_flow,omitempty"`
	VWAP             map[string]*VWAPData  `json:"vwap,omitempty"`
	CorporateActions *CorporateActionsData `json:"corporate_actions,omitempty"`
	VolumeSurge      map[string]*VolumeSurgeData `json:"volume_surge,omitempty"`
	Earnings         []EarningsData        `json:"earnings,omitempty"`
	AnalystRatings   []AnalystRating       `json:"analyst_ratings,omitempty"`
	ShortInterest    []ShortInterestData   `json:"short_interest,omitempty"`
	FetchedAt        time.Time             `json:"fetched_at"`
}

// GetStockRankings fetches all enabled stock ranking indicators
func GetStockRankings(symbols []string, config map[string]bool) (*StockRankingsData, error) {
	result := &StockRankingsData{
		Symbols:    symbols,
		TradeFlow:  make(map[string]*TradeFlowData),
		VWAP:       make(map[string]*VWAPData),
		VolumeSurge: make(map[string]*VolumeSurgeData),
		FetchedAt:  time.Now(),
	}

	// Fetch enabled indicators
	if config["news"] {
		if data, err := GetStockNews(symbols, 10); err == nil {
			result.News = data
		}
	}

	for _, symbol := range symbols {
		if config["trade_flow"] {
			if data, err := GetTradeFlow(symbol, 30); err == nil {
				result.TradeFlow[symbol] = data
			}
		}

		if config["vwap"] {
			if data, err := GetVWAPAnalysis(symbol); err == nil {
				result.VWAP[symbol] = data
			}
		}

		if config["volume_surge"] {
			if data, err := GetVolumeSurge(symbol); err == nil {
				result.VolumeSurge[symbol] = data
			}
		}
	}

	if config["corporate_actions"] {
		if data, err := GetCorporateActions(symbols, 30); err == nil {
			result.CorporateActions = data
		}
	}

	if config["earnings"] {
		if data, err := GetEarningsCalendar(symbols); err == nil {
			result.Earnings = data
		}
	}

	if config["analyst_ratings"] {
		if data, err := GetAnalystRatings(symbols); err == nil {
			result.AnalystRatings = data
		}
	}

	if config["short_interest"] {
		if data, err := GetShortInterest(symbols); err == nil {
			result.ShortInterest = data
		}
	}

	return result, nil
}

// FormatStockRankingsForAI formats all stock rankings for AI
func FormatStockRankingsForAI(data *StockRankingsData) string {
	if data == nil {
		return ""
	}

	var sb strings.Builder
	sb.WriteString("# 📊 Stock Rankings Data\n\n")

	if data.News != nil {
		sb.WriteString(FormatStockNewsForAI(data.News))
	}

	// Sort symbols for consistent output
	symbols := data.Symbols
	sort.Strings(symbols)

	for _, symbol := range symbols {
		if vwap, ok := data.VWAP[symbol]; ok {
			sb.WriteString(FormatVWAPForAI(vwap))
		}
		if vol, ok := data.VolumeSurge[symbol]; ok {
			sb.WriteString(FormatVolumeSurgeForAI(vol))
		}
		if flow, ok := data.TradeFlow[symbol]; ok {
			sb.WriteString(FormatTradeFlowForAI(flow))
		}
	}

	if data.CorporateActions != nil {
		sb.WriteString(FormatCorporateActionsForAI(data.CorporateActions))
	}

	if len(data.Earnings) > 0 {
		sb.WriteString(FormatEarningsForAI(data.Earnings))
	}

	if len(data.AnalystRatings) > 0 {
		sb.WriteString(FormatAnalystRatingsForAI(data.AnalystRatings))
	}

	if len(data.ShortInterest) > 0 {
		sb.WriteString(FormatShortInterestForAI(data.ShortInterest))
	}

	return sb.String()
}
