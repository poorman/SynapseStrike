package provider

import (
	"SynapseStrike/security"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strings"
	"time"
)

// AI500Config AI500 data provider configuration
type AI500Config struct {
	APIURL  string
	Timeout time.Duration
}

var ai500Config = AI500Config{
	APIURL:  "",
	Timeout: 30 * time.Second,
}

// CoinData coin information
type CoinData struct {
	Pair            string  `json:"pair"`             // Trading pair symbol (e.g.: BTCUSDT)
	Score           float64 `json:"score"`            // Current score
	StartTime       int64   `json:"start_time"`       // Start time (Unix timestamp)
	StartPrice      float64 `json:"start_price"`      // Start price
	LastScore       float64 `json:"last_score"`       // Latest score
	MaxScore        float64 `json:"max_score"`        // Highest score
	MaxPrice        float64 `json:"max_price"`        // Highest price
	IncreasePercent float64 `json:"increase_percent"` // Increase percentage
	IsAvailable     bool    `json:"-"`                // Whether tradable (internal use)
}

// AI500APIResponse raw data structure returned by AI500 API
type AI500APIResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Coins []CoinData `json:"coins"`
		Count int        `json:"count"`
	} `json:"data"`
}

// SetAI500API sets AI500 data provider API
func SetAI500API(apiURL string) {
	ai500Config.APIURL = apiURL
}

// SetOITopAPI sets OI Top API
func SetOITopAPI(apiURL string) {
	oiTopConfig.APIURL = apiURL
}

// AI100Config AI100 Stocks data provider configuration
// API must return JSON: { "success": true, "data": { "stocks": [{ "pair": "SYMBOL", "score": 0.0 }] } }
var ai100Config = struct {
	APIURL  string
	Timeout time.Duration
}{
	APIURL:  "http://24.12.59.214:8082/api/ai100/list?auth=pluq8P0XTgucCN6kyxey5EPTof36R54lQc3rfgQsoNQ&sort=fin&limit=100",
	Timeout: 30 * time.Second,
}

// AI100APIResponse raw data structure returned by AI100 API (uses "stocks" instead of "coins")
type AI100APIResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Stocks []CoinData `json:"stocks"`
		Count  int        `json:"count"`
	} `json:"data"`
}

// SetAI100API sets AI100 Stocks data provider API
func SetAI100API(apiURL string) {
	ai100Config.APIURL = apiURL
}

// TopWinnersConfig Top Winners Stocks data provider configuration
// API returns JSON: { "success": true, "data": { "stocks": [{ "pair": "SYMBOL", "change": 0.0 }] } }
var topWinnersConfig = struct {
	APIURL  string
	Timeout time.Duration
}{
	APIURL:  "https://invest-soft.com/api/winners/list?sort=des&limit=100&auth=pluq8P0XTgucCN6kyxey5EPTof36R54lQc3rfgQsoNQ",
	Timeout: 30 * time.Second,
}

// TopLosersConfig Top Losers Stocks data provider configuration
var topLosersConfig = struct {
	APIURL  string
	Timeout time.Duration
}{
	APIURL:  "https://invest-soft.com/api/losers/list?sort=des&limit=100&auth=pluq8P0XTgucCN6kyxey5EPTof36R54lQc3rfgQsoNQ",
	Timeout: 30 * time.Second,
}

// MoversTopStock stock data for Top Winners/Top Losers
type MoversTopStock struct {
	Pair   string  `json:"pair"`
	Change float64 `json:"change"`
	Score  float64 `json:"score"`
}

// MoversTopAPIResponse raw data structure returned by Movers Top API
type MoversTopAPIResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Stocks []MoversTopStock `json:"stocks"`
		Count  int              `json:"count"`
	} `json:"data"`
}

// SetTopWinnersAPI sets Top Winners Stocks data provider API
func SetTopWinnersAPI(apiURL string) {
	topWinnersConfig.APIURL = apiURL
}

// SetTopLosersAPI sets Top Losers Stocks data provider API
func SetTopLosersAPI(apiURL string) {
	topLosersConfig.APIURL = apiURL
}

// GetTopWinnersData retrieves Top Winners list (with retry mechanism)
func GetTopWinnersData() ([]MoversTopStock, error) {
	if strings.TrimSpace(topWinnersConfig.APIURL) == "" {
		return nil, fmt.Errorf("Top Winners API URL not configured")
	}

	maxRetries := 3
	var lastErr error

	for attempt := 1; attempt <= maxRetries; attempt++ {
		if attempt > 1 {
			log.Printf("⚠️  Retry attempt %d of %d to fetch Top Winners data...", attempt, maxRetries)
			time.Sleep(2 * time.Second)
		}

		stocks, err := fetchMoversData(topWinnersConfig.APIURL, topWinnersConfig.Timeout)
		if err == nil {
			return stocks, nil
		}

		lastErr = err
		log.Printf("❌ Top Winners request attempt %d failed: %v", attempt, err)
	}

	return nil, fmt.Errorf("all Top Winners API requests failed: %w", lastErr)
}

// GetTopLosersData retrieves Top Losers list (with retry mechanism)
func GetTopLosersData() ([]MoversTopStock, error) {
	if strings.TrimSpace(topLosersConfig.APIURL) == "" {
		return nil, fmt.Errorf("Top Losers API URL not configured")
	}

	maxRetries := 3
	var lastErr error

	for attempt := 1; attempt <= maxRetries; attempt++ {
		if attempt > 1 {
			log.Printf("⚠️  Retry attempt %d of %d to fetch Top Losers data...", attempt, maxRetries)
			time.Sleep(2 * time.Second)
		}

		stocks, err := fetchMoversData(topLosersConfig.APIURL, topLosersConfig.Timeout)
		if err == nil {
			return stocks, nil
		}

		lastErr = err
		log.Printf("❌ Top Losers request attempt %d failed: %v", attempt, err)
	}

	return nil, fmt.Errorf("all Top Losers API requests failed: %w", lastErr)
}

// fetchMoversData fetches data from winners/losers API
func fetchMoversData(apiURL string, timeout time.Duration) ([]MoversTopStock, error) {
	log.Printf("🔄 Requesting movers data from %s...", apiURL)

	resp, err := security.SafeGet(apiURL, timeout)
	if err != nil {
		return nil, fmt.Errorf("failed to request API: %w", err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned error (status %d): %s", resp.StatusCode, string(body))
	}

	var response MoversTopAPIResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("JSON parsing failed: %w", err)
	}

	if !response.Success {
		return nil, fmt.Errorf("API returned failure status")
	}

	return response.Data.Stocks, nil
}

// GetTopWinnersStocks retrieves top N stocks from Top Winners by change
func GetTopWinnersStocks(limit int) ([]string, error) {
	stocks, err := GetTopWinnersData()
	if err != nil {
		return nil, err
	}
	return sortAndLimitStocks(stocks, limit)
}

// GetTopLosersStocks retrieves top N stocks from Top Losers by change
func GetTopLosersStocks(limit int) ([]string, error) {
	stocks, err := GetTopLosersData()
	if err != nil {
		return nil, err
	}
	return sortAndLimitStocks(stocks, limit)
}

// sortAndLimitStocks sorts by change descending and returns top N symbols
func sortAndLimitStocks(stocks []MoversTopStock, limit int) ([]string, error) {
	if len(stocks) == 0 {
		return nil, fmt.Errorf("stock list is empty")
	}

	// Sort by Change descending (bubble sort)
	for i := 0; i < len(stocks); i++ {
		for j := i + 1; j < len(stocks); j++ {
			if stocks[i].Change < stocks[j].Change {
				stocks[i], stocks[j] = stocks[j], stocks[i]
			}
		}
	}

	// Take top N
	maxCount := limit
	if len(stocks) < maxCount {
		maxCount = len(stocks)
	}

	var symbols []string
	for i := 0; i < maxCount; i++ {
		symbol := normalizeSymbol(stocks[i].Pair)
		symbols = append(symbols, symbol)
	}

	return symbols, nil
}

// Deprecated: Use GetTopWinnersStocks instead
func GetMoversTopStocks(limit int) ([]string, error) {
	return GetTopWinnersStocks(limit)
}

// Deprecated: Use SetTopWinnersAPI instead
func SetMoversTopAPI(apiURL string) {
	SetTopWinnersAPI(apiURL)
}

// GetAI100Data retrieves AI100 Stocks stock list (with retry mechanism)
// The API should return JSON with structure: { "success": true, "data": { "stocks": [{ "pair": "SYMBOL", "score": 0.0 }], "count": N } }
func GetAI100Data() ([]CoinData, error) {
	// Check if API URL is configured
	if strings.TrimSpace(ai100Config.APIURL) == "" {
		return nil, fmt.Errorf("AI100 API URL not configured")
	}

	maxRetries := 3
	var lastErr error

	// Try to fetch from API
	for attempt := 1; attempt <= maxRetries; attempt++ {
		if attempt > 1 {
			log.Printf("⚠️  Retry attempt %d of %d to fetch AI100 data...", attempt, maxRetries)
			time.Sleep(2 * time.Second)
		}

		stocks, err := fetchAI100()
		if err == nil {
			if attempt > 1 {
				log.Printf("✓ Retry attempt %d succeeded", attempt)
			}
			return stocks, nil
		}

		lastErr = err
		log.Printf("❌ AI100 request attempt %d failed: %v", attempt, err)
	}

	return nil, fmt.Errorf("all AI100 API requests failed: %w", lastErr)
}

// fetchAI100 actually executes AI100 request
func fetchAI100() ([]CoinData, error) {
	log.Printf("🔄 Requesting AI100 Stocks data...")

	// SSRF Protection: Validate URL before making request
	resp, err := security.SafeGet(ai100Config.APIURL, ai100Config.Timeout)
	if err != nil {
		return nil, fmt.Errorf("failed to request AI100 API: %w", err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read AI100 response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("AI100 API returned error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse API response (uses "stocks" field)
	var response AI100APIResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("AI100 JSON parsing failed: %w", err)
	}

	if !response.Success {
		return nil, fmt.Errorf("AI100 API returned failure status")
	}

	if len(response.Data.Stocks) == 0 {
		return nil, fmt.Errorf("AI100 stock list is empty")
	}

	// Set IsAvailable flag
	stocks := response.Data.Stocks
	for i := range stocks {
		stocks[i].IsAvailable = true
	}

	log.Printf("✓ Successfully fetched %d AI100 stocks", len(stocks))
	return stocks, nil
}

// GetAI100TopStocks retrieves top N stocks from AI100 by score
func GetAI100TopStocks(limit int) ([]string, error) {
	stocks, err := GetAI100Data()
	if err != nil {
		return nil, err
	}

	// Filter available stocks
	var availableStocks []CoinData
	for _, stock := range stocks {
		if stock.IsAvailable {
			availableStocks = append(availableStocks, stock)
		}
	}

	if len(availableStocks) == 0 {
		return nil, fmt.Errorf("no available AI100 stocks")
	}

	// Sort by Score descending (bubble sort)
	for i := 0; i < len(availableStocks); i++ {
		for j := i + 1; j < len(availableStocks); j++ {
			if availableStocks[i].Score < availableStocks[j].Score {
				availableStocks[i], availableStocks[j] = availableStocks[j], availableStocks[i]
			}
		}
	}

	// Take top N
	maxCount := limit
	if len(availableStocks) < maxCount {
		maxCount = len(availableStocks)
	}

	var symbols []string
	for i := 0; i < maxCount; i++ {
		symbol := normalizeSymbol(availableStocks[i].Pair)
		symbols = append(symbols, symbol)
	}

	return symbols, nil
}

// GetAI500Data retrieves AI500 coin list (with retry mechanism)
func GetAI500Data() ([]CoinData, error) {
	// Check if API URL is configured
	if strings.TrimSpace(ai500Config.APIURL) == "" {
		return nil, fmt.Errorf("AI500 API URL not configured")
	}

	maxRetries := 3
	var lastErr error

	// Try to fetch from API
	for attempt := 1; attempt <= maxRetries; attempt++ {
		if attempt > 1 {
			log.Printf("⚠️  Retry attempt %d of %d to fetch AI500 data...", attempt, maxRetries)
			time.Sleep(2 * time.Second)
		}

		coins, err := fetchAI500()
		if err == nil {
			if attempt > 1 {
				log.Printf("✓ Retry attempt %d succeeded", attempt)
			}
			return coins, nil
		}

		lastErr = err
		log.Printf("❌ Request attempt %d failed: %v", attempt, err)
	}

	return nil, fmt.Errorf("all API requests failed: %w", lastErr)
}

// fetchAI500 actually executes AI500 request
func fetchAI500() ([]CoinData, error) {
	log.Printf("🔄 Requesting AI500 data...")

	// SSRF Protection: Validate URL before making request
	resp, err := security.SafeGet(ai500Config.APIURL, ai500Config.Timeout)
	if err != nil {
		return nil, fmt.Errorf("failed to request AI500 API: %w", err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse API response
	var response AI500APIResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("JSON parsing failed: %w", err)
	}

	if !response.Success {
		return nil, fmt.Errorf("API returned failure status")
	}

	if len(response.Data.Coins) == 0 {
		return nil, fmt.Errorf("coin list is empty")
	}

	// Set IsAvailable flag
	coins := response.Data.Coins
	for i := range coins {
		coins[i].IsAvailable = true
	}

	log.Printf("✓ Successfully fetched %d coins", len(coins))
	return coins, nil
}

// GetAvailableCoins retrieves available coin list (filters out unavailable ones)
func GetAvailableCoins() ([]string, error) {
	coins, err := GetAI500Data()
	if err != nil {
		return nil, err
	}

	var symbols []string
	for _, coin := range coins {
		if coin.IsAvailable {
			symbol := normalizeSymbol(coin.Pair)
			symbols = append(symbols, symbol)
		}
	}

	if len(symbols) == 0 {
		return nil, fmt.Errorf("no available coins")
	}

	return symbols, nil
}

// GetTopRatedCoins retrieves top N coins by score (sorted by score descending)
func GetTopRatedCoins(limit int) ([]string, error) {
	coins, err := GetAI500Data()
	if err != nil {
		return nil, err
	}

	// Filter available coins
	var availableCoins []CoinData
	for _, coin := range coins {
		if coin.IsAvailable {
			availableCoins = append(availableCoins, coin)
		}
	}

	if len(availableCoins) == 0 {
		return nil, fmt.Errorf("no available coins")
	}

	// Sort by Score descending (bubble sort)
	for i := 0; i < len(availableCoins); i++ {
		for j := i + 1; j < len(availableCoins); j++ {
			if availableCoins[i].Score < availableCoins[j].Score {
				availableCoins[i], availableCoins[j] = availableCoins[j], availableCoins[i]
			}
		}
	}

	// Take top N
	maxCount := limit
	if len(availableCoins) < maxCount {
		maxCount = len(availableCoins)
	}

	var symbols []string
	for i := 0; i < maxCount; i++ {
		symbol := normalizeSymbol(availableCoins[i].Pair)
		symbols = append(symbols, symbol)
	}

	return symbols, nil
}

// normalizeSymbol normalizes stock symbol to uppercase
func normalizeSymbol(symbol string) string {
	symbol = trimSpaces(symbol)
	symbol = toUpper(symbol)
	return symbol
}

// Helper functions
func trimSpaces(s string) string {
	result := ""
	for i := 0; i < len(s); i++ {
		if s[i] != ' ' {
			result += string(s[i])
		}
	}
	return result
}

func toUpper(s string) string {
	result := ""
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'a' && c <= 'z' {
			c = c - 'a' + 'A'
		}
		result += string(c)
	}
	return result
}

func endsWith(s, suffix string) bool {
	if len(s) < len(suffix) {
		return false
	}
	return s[len(s)-len(suffix):] == suffix
}

// ========== OI Top (Open Interest Growth Top 20) Data ==========

// OIPosition open interest data
type OIPosition struct {
	Symbol            string  `json:"symbol"`
	Rank              int     `json:"rank"`
	CurrentOI         float64 `json:"current_oi"`
	OIDelta           float64 `json:"oi_delta"`
	OIDeltaPercent    float64 `json:"oi_delta_percent"`
	OIDeltaValue      float64 `json:"oi_delta_value"`
	PriceDeltaPercent float64 `json:"price_delta_percent"`
	NetLong           float64 `json:"net_long"`
	NetShort          float64 `json:"net_short"`
}

// OITopAPIResponse data structure returned by OI Top API
type OITopAPIResponse struct {
	Code int `json:"code"`
	Data struct {
		Positions      []OIPosition `json:"positions"`
		Count          int          `json:"count"`
		Exchange       string       `json:"exchange"`
		TimeRange      string       `json:"time_range"`
		TimeRangeParam string       `json:"time_range_param"`
		RankType       string       `json:"rank_type"`
		Limit          int          `json:"limit"`
	} `json:"data"`
}

var oiTopConfig = struct {
	APIURL  string
	Timeout time.Duration
}{
	APIURL:  "",
	Timeout: 30 * time.Second,
}

// GetOITopPositions retrieves OI Top 20 data (with retry)
func GetOITopPositions() ([]OIPosition, error) {
	if strings.TrimSpace(oiTopConfig.APIURL) == "" {
		log.Printf("⚠️  OI Top API URL not configured, skipping OI Top data fetch")
		return []OIPosition{}, nil
	}

	maxRetries := 3
	var lastErr error

	for attempt := 1; attempt <= maxRetries; attempt++ {
		if attempt > 1 {
			log.Printf("⚠️  Retry attempt %d of %d to fetch OI Top data...", attempt, maxRetries)
			time.Sleep(2 * time.Second)
		}

		positions, err := fetchOITop()
		if err == nil {
			if attempt > 1 {
				log.Printf("✓ Retry attempt %d succeeded", attempt)
			}
			return positions, nil
		}

		lastErr = err
		log.Printf("❌ OI Top request attempt %d failed: %v", attempt, err)
	}

	log.Printf("⚠️  All OI Top API requests failed (last error: %v), skipping OI Top data", lastErr)
	return []OIPosition{}, nil
}

// fetchOITop actually executes OI Top request
func fetchOITop() ([]OIPosition, error) {
	log.Printf("🔄 Requesting OI Top data...")

	// SSRF Protection: Validate URL before making request
	resp, err := security.SafeGet(oiTopConfig.APIURL, oiTopConfig.Timeout)
	if err != nil {
		return nil, fmt.Errorf("failed to request OI Top API: %w", err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read OI Top response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("OI Top API returned error (status %d): %s", resp.StatusCode, string(body))
	}

	var response OITopAPIResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("OI Top JSON parsing failed: %w", err)
	}

	if response.Code != 0 {
		return nil, fmt.Errorf("OI Top API returned error code: %d", response.Code)
	}

	if len(response.Data.Positions) == 0 {
		return nil, fmt.Errorf("OI Top position list is empty")
	}

	log.Printf("✓ Successfully fetched %d OI Top coins (time range: %s, type: %s)",
		len(response.Data.Positions), response.Data.TimeRange, response.Data.RankType)
	return response.Data.Positions, nil
}

// GetOITopSymbols retrieves OI Top coin symbol list
func GetOITopSymbols() ([]string, error) {
	positions, err := GetOITopPositions()
	if err != nil {
		return nil, err
	}

	var symbols []string
	for _, pos := range positions {
		symbol := normalizeSymbol(pos.Symbol)
		symbols = append(symbols, symbol)
	}

	return symbols, nil
}

// MergedData merged data (AI500 + OI Top)
type MergedData struct {
	AI500Coins    []CoinData
	OITopCoins    []OIPosition
	AllSymbols    []string
	SymbolSources map[string][]string
}

// OIRankingData OI ranking data for debate (includes both top and low)
type OIRankingData struct {
	TimeRange    string       `json:"time_range"`
	Duration     string       `json:"duration"`
	TopPositions []OIPosition `json:"top_positions"`
	LowPositions []OIPosition `json:"low_positions"`
	FetchedAt    time.Time    `json:"fetched_at"`
}

// GetOIRankingData retrieves OI ranking data (both top increase and low decrease)
func GetOIRankingData(baseURL, authKey string, duration string, limit int) (*OIRankingData, error) {
	if baseURL == "" || authKey == "" {
		return nil, fmt.Errorf("OI API URL or auth key not configured")
	}

	if duration == "" {
		duration = "1h"
	}
	if limit <= 0 {
		limit = 20
	}

	result := &OIRankingData{
		Duration:  duration,
		FetchedAt: time.Now(),
	}

	// Fetch top ranking
	topURL := fmt.Sprintf("%s/api/oi/top-ranking?limit=%d&duration=%s&auth=%s", baseURL, limit, duration, authKey)
	topPositions, timeRange, err := fetchOIRanking(topURL)
	if err != nil {
		log.Printf("⚠️  Failed to fetch OI top ranking: %v", err)
	} else {
		result.TopPositions = topPositions
		result.TimeRange = timeRange
	}

	// Fetch low ranking
	lowURL := fmt.Sprintf("%s/api/oi/low-ranking?limit=%d&duration=%s&auth=%s", baseURL, limit, duration, authKey)
	lowPositions, _, err := fetchOIRanking(lowURL)
	if err != nil {
		log.Printf("⚠️  Failed to fetch OI low ranking: %v", err)
	} else {
		result.LowPositions = lowPositions
	}

	log.Printf("✓ Fetched OI ranking data: %d top, %d low (duration: %s)",
		len(result.TopPositions), len(result.LowPositions), duration)

	return result, nil
}

// fetchOIRanking fetches OI ranking from a single endpoint
func fetchOIRanking(url string) ([]OIPosition, string, error) {
	// SSRF Protection: Validate URL before making request
	resp, err := security.SafeGet(url, 30*time.Second)
	if err != nil {
		return nil, "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("API returned error (status %d): %s", resp.StatusCode, string(body))
	}

	var response OITopAPIResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, "", fmt.Errorf("JSON parsing failed: %w", err)
	}

	if response.Code != 0 {
		return nil, "", fmt.Errorf("API returned error code: %d", response.Code)
	}

	return response.Data.Positions, response.Data.TimeRange, nil
}

// FormatOIRankingForAI formats OI ranking data for AI consumption
func FormatOIRankingForAI(data *OIRankingData) string {
	if data == nil {
		return ""
	}

	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("## 📊 Market Position Changes (Open Interest Changes in %s / %s)\n\n", data.TimeRange, data.Duration))

	if len(data.TopPositions) > 0 {
		sb.WriteString("### 🔺 OI Increase Ranking\n")
		sb.WriteString("Capital is flowing into the following stocks, indicating trend continuation or new position building:\n\n")
		sb.WriteString("| Rank | Symbol | Position Change (USD) | Change % | Price Change |\n")
		sb.WriteString("|------|--------|----------------------|----------|-------------|\n")
		for _, pos := range data.TopPositions {
			sb.WriteString(fmt.Sprintf("| #%d | %s | %s | %+.2f%% | %+.2f%% |\n",
				pos.Rank,
				pos.Symbol,
				formatOIValue(pos.OIDeltaValue),
				pos.OIDeltaPercent,
				pos.PriceDeltaPercent,
			))
		}
		sb.WriteString("\n")
		sb.WriteString("**Analysis**: OI increase + price up = bullish; OI increase + price down = bearish\n\n")
	}

	if len(data.LowPositions) > 0 {
		sb.WriteString("### 🔻 OI Decrease Ranking\n")
		sb.WriteString("Capital is flowing out of the following stocks, indicating trend reversal or position closing:\n\n")
		sb.WriteString("| Rank | Symbol | Position Change (USD) | Change % | Price Change |\n")
		sb.WriteString("|------|--------|----------------------|----------|-------------|\n")
		for _, pos := range data.LowPositions {
			sb.WriteString(fmt.Sprintf("| #%d | %s | %s | %+.2f%% | %+.2f%% |\n",
				pos.Rank,
				pos.Symbol,
				formatOIValue(pos.OIDeltaValue),
				pos.OIDeltaPercent,
				pos.PriceDeltaPercent,
			))
		}
		sb.WriteString("\n")
		sb.WriteString("**Analysis**: OI decrease + price up = short covering (bounce); OI decrease + price down = long liquidation (pullback)\n\n")
	}

	return sb.String()
}

// formatOIValue formats OI value for display
func formatOIValue(v float64) string {
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

// GetMergedData retrieves merged data (AI500 + OI Top, deduplicated)
func GetMergedData(ai500Limit int) (*MergedData, error) {
	ai500TopSymbols, err := GetTopRatedCoins(ai500Limit)
	if err != nil {
		log.Printf("⚠️  Failed to get AI500 data: %v", err)
		ai500TopSymbols = []string{}
	}

	oiTopSymbols, err := GetOITopSymbols()
	if err != nil {
		log.Printf("⚠️  Failed to get OI Top data: %v", err)
		oiTopSymbols = []string{}
	}

	symbolSet := make(map[string]bool)
	symbolSources := make(map[string][]string)

	for _, symbol := range ai500TopSymbols {
		symbolSet[symbol] = true
		symbolSources[symbol] = append(symbolSources[symbol], "ai500")
	}

	for _, symbol := range oiTopSymbols {
		if !symbolSet[symbol] {
			symbolSet[symbol] = true
		}
		symbolSources[symbol] = append(symbolSources[symbol], "oi_top")
	}

	var allSymbols []string
	for symbol := range symbolSet {
		allSymbols = append(allSymbols, symbol)
	}

	ai500Coins, _ := GetAI500Data()
	oiTopPositions, _ := GetOITopPositions()

	merged := &MergedData{
		AI500Coins:    ai500Coins,
		OITopCoins:    oiTopPositions,
		AllSymbols:    allSymbols,
		SymbolSources: symbolSources,
	}

	log.Printf("📊 Data merge complete: AI500=%d, OI_Top=%d, Total(deduplicated)=%d",
		len(ai500TopSymbols), len(oiTopSymbols), len(allSymbols))

	return merged, nil
}

// ========== Backward Compatibility Aliases ==========

// Deprecated: Use SetAI500API instead
func SetCoinPoolAPI(apiURL string) {
	SetAI500API(apiURL)
}

// Deprecated: Use GetAI500Data instead
func GetCoinPool() ([]CoinData, error) {
	return GetAI500Data()
}

// Deprecated: Use MergedData instead
type MergedCoinPool = MergedData

// Deprecated: Use GetMergedData instead
func GetMergedCoinPool(ai500Limit int) (*MergedData, error) {
	return GetMergedData(ai500Limit)
}

// Deprecated: Use CoinData instead
type CoinInfo = CoinData
