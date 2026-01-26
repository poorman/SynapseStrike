package market

import (
	"SynapseStrike/logger"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// FundingRateCache is the funding rate cache structure
// Binance Funding Rate only updates every 8 hours, using 1-hour cache can significantly reduce API calls
type FundingRateCache struct {
	Rate      float64
	UpdatedAt time.Time
}

var (
	fundingRateMap sync.Map // map[string]*FundingRateCache
	frCacheTTL     = 1 * time.Hour
	httpClient     = &http.Client{Timeout: 30 * time.Second} // HTTP client for external API calls
)

// Get retrieves market data for the specified token
func Get(symbol string) (*Data, error) {
	var klines3m, klines4h []Kline
	var err error
	// Normalize symbol
	symbol = Normalize(symbol)
	// Get 3-minute K-line data (latest 10)
	klines3m, err = WSMonitorCli.GetCurrentKlines(symbol, "3m") // Get more for calculation
	if err != nil {
		return nil, fmt.Errorf("Failed to get 3-minute K-line: %v", err)
	}

	// Data staleness detection: Prevent DOGEUSDT-style price freeze issues
	if isStaleData(klines3m, symbol) {
		logger.Infof("⚠️  WARNING: %s detected stale data (consecutive price freeze), skipping symbol", symbol)
		return nil, fmt.Errorf("%s data is stale, possible cache failure", symbol)
	}

	// Get 4-hour K-line data (latest 10)
	klines4h, err = WSMonitorCli.GetCurrentKlines(symbol, "4h") // Get more for indicator calculation
	if err != nil {
		return nil, fmt.Errorf("Failed to get 4-hour K-line: %v", err)
	}

	// Check if data is empty
	if len(klines3m) == 0 {
		return nil, fmt.Errorf("3-minute K-line data is empty")
	}
	if len(klines4h) == 0 {
		return nil, fmt.Errorf("4-hour K-line data is empty")
	}

	// Calculate current indicators (based on 3-minute latest data)
	currentPrice := klines3m[len(klines3m)-1].Close
	currentEMA20 := calculateEMA(klines3m, 20)
	currentMACD := calculateMACD(klines3m)
	currentRSI7 := calculateRSI(klines3m, 7)

	// Calculate price change percentage
	// 1-hour price change = price from 20 3-minute K-lines ago
	priceChange1h := 0.0
	if len(klines3m) >= 21 { // Need at least 21 K-lines (current + 20 previous)
		price1hAgo := klines3m[len(klines3m)-21].Close
		if price1hAgo > 0 {
			priceChange1h = ((currentPrice - price1hAgo) / price1hAgo) * 100
		}
	}

	// 4-hour price change = price from 1 4-hour K-line ago
	priceChange4h := 0.0
	if len(klines4h) >= 2 {
		price4hAgo := klines4h[len(klines4h)-2].Close
		if price4hAgo > 0 {
			priceChange4h = ((currentPrice - price4hAgo) / price4hAgo) * 100
		}
	}

	// Get OI data
	oiData, err := getOpenInterestData(symbol)
	if err != nil {
		// OI failure doesn't affect overall result, use default values
		oiData = &OIData{Latest: 0, Average: 0}
	}

	// Get Funding Rate
	fundingRate, _ := getFundingRate(symbol)

	// Calculate intraday series data
	intradayData := calculateIntradaySeries(klines3m)

	// Calculate longer-term data
	longerTermData := calculateLongerTermData(klines4h)

	return &Data{
		Symbol:            symbol,
		CurrentPrice:      currentPrice,
		PriceChange1h:     priceChange1h,
		PriceChange4h:     priceChange4h,
		CurrentEMA20:      currentEMA20,
		CurrentMACD:       currentMACD,
		CurrentRSI7:       currentRSI7,
		OpenInterest:      oiData,
		FundingRate:       fundingRate,
		IntradaySeries:    intradayData,
		LongerTermContext: longerTermData,
	}, nil
}

// GetWithTimeframes retrieves market data for specified multiple timeframes
// timeframes: list of timeframes, e.g. ["5m", "15m", "1h", "4h"]
// primaryTimeframe: primary timeframe (used for calculating current indicators), defaults to timeframes[0]
// count: number of K-lines for each timeframe
func GetWithTimeframes(symbol string, timeframes []string, primaryTimeframe string, count int) (*Data, error) {
	symbol = Normalize(symbol)

	if len(timeframes) == 0 {
		return nil, fmt.Errorf("at least one timeframe is required")
	}

	// If primary timeframe is not specified, use the first one
	if primaryTimeframe == "" {
		primaryTimeframe = timeframes[0]
	}

	// Ensure primary timeframe is in the list
	hasPrimary := false
	for _, tf := range timeframes {
		if tf == primaryTimeframe {
			hasPrimary = true
			break
		}
	}
	if !hasPrimary {
		timeframes = append([]string{primaryTimeframe}, timeframes...)
	}

	// Store data for all timeframes
	timeframeData := make(map[string]*TimeframeSeriesData)
	var primaryKlines []Kline

	// Get K-line data for each timeframe
	for _, tf := range timeframes {
		klines, err := WSMonitorCli.GetCurrentKlines(symbol, tf)
		if err != nil {
			logger.Infof("⚠️ Failed to get %s %s K-line: %v", symbol, tf, err)
			continue
		}

		if len(klines) == 0 {
			logger.Infof("⚠️ %s %s K-line data is empty", symbol, tf)
			continue
		}

		// Save primary timeframe K-lines for calculating base indicators
		if tf == primaryTimeframe {
			primaryKlines = klines
		}

		// Calculate series data for this timeframe (use count from config)
		seriesData := calculateTimeframeSeries(klines, tf, count)
		timeframeData[tf] = seriesData
	}

	// If primary timeframe data is empty, return error
	if len(primaryKlines) == 0 {
		return nil, fmt.Errorf("Primary timeframe %s K-line data is empty", primaryTimeframe)
	}

	// Data staleness detection
	if isStaleData(primaryKlines, symbol) {
		logger.Infof("⚠️  WARNING: %s detected stale data (consecutive price freeze), skipping symbol", symbol)
		return nil, fmt.Errorf("%s data is stale, possible cache failure", symbol)
	}

	// Calculate current indicators (based on primary timeframe latest data)
	currentPrice := primaryKlines[len(primaryKlines)-1].Close
	currentEMA20 := calculateEMA(primaryKlines, 20)
	currentMACD := calculateMACD(primaryKlines)
	currentRSI7 := calculateRSI(primaryKlines, 7)

	// Calculate price changes
	priceChange1h := calculatePriceChangeByBars(primaryKlines, primaryTimeframe, 60)  // 1 hour
	priceChange4h := calculatePriceChangeByBars(primaryKlines, primaryTimeframe, 240) // 4 hours

	// Get OI data
	oiData, err := getOpenInterestData(symbol)
	if err != nil {
		oiData = &OIData{Latest: 0, Average: 0}
	}

	// Get Funding Rate
	fundingRate, _ := getFundingRate(symbol)

	return &Data{
		Symbol:        symbol,
		CurrentPrice:  currentPrice,
		PriceChange1h: priceChange1h,
		PriceChange4h: priceChange4h,
		CurrentEMA20:  currentEMA20,
		CurrentMACD:   currentMACD,
		CurrentRSI7:   currentRSI7,
		OpenInterest:  oiData,
		FundingRate:   fundingRate,
		TimeframeData: timeframeData,
	}, nil
}

// GetStockDataWithTimeframes retrieves stock market data using Alpaca API
// This is the stock-specific version of GetWithTimeframes
// timeframes: list of timeframes, e.g. ["5m", "15m", "1h", "4h"]
// primaryTimeframe: primary timeframe (used for calculating current indicators), defaults to timeframes[0]
// count: number of K-lines for each timeframe
func GetStockDataWithTimeframes(symbol string, timeframes []string, primaryTimeframe string, count int) (*Data, error) {
	// Don't use Normalize for stocks - they don't need USDT suffix
	symbol = strings.ToUpper(strings.TrimSpace(symbol))

	if len(timeframes) == 0 {
		return nil, fmt.Errorf("at least one timeframe is required")
	}

	// If primary timeframe is not specified, use the first one
	if primaryTimeframe == "" {
		primaryTimeframe = timeframes[0]
	}

	// Ensure primary timeframe is in the list
	hasPrimary := false
	for _, tf := range timeframes {
		if tf == primaryTimeframe {
			hasPrimary = true
			break
		}
	}
	if !hasPrimary {
		timeframes = append([]string{primaryTimeframe}, timeframes...)
	}

	// Use Alpaca API client
	apiClient := NewAPIClient()
	if apiClient.apiKey == "" {
		return nil, fmt.Errorf("Alpaca API credentials not configured")
	}

	// Store data for all timeframes
	timeframeData := make(map[string]*TimeframeSeriesData)
	var primaryKlines []Kline

	// Get K-line data for each timeframe via Alpaca API
	for _, tf := range timeframes {
		// Request more bars to have enough data for indicators
		requestCount := count + 50
		if requestCount < 100 {
			requestCount = 100
		}

		klines, err := apiClient.GetKlines(symbol, tf, requestCount)
		if err != nil {
			logger.Infof("⚠️ Failed to get %s %s K-line from Alpaca: %v", symbol, tf, err)
			continue
		}

		if len(klines) == 0 {
			logger.Infof("⚠️ %s %s K-line data is empty from Alpaca", symbol, tf)
			continue
		}

		logger.Infof("✓ Got %d %s K-lines for %s from Alpaca", len(klines), tf, symbol)

		// Save primary timeframe K-lines for calculating base indicators
		if tf == primaryTimeframe {
			primaryKlines = klines
		}

		// Calculate series data for this timeframe (use count from config)
		seriesData := calculateTimeframeSeries(klines, tf, count)
		timeframeData[tf] = seriesData
	}

	// If primary timeframe data is empty, return error
	if len(primaryKlines) == 0 {
		return nil, fmt.Errorf("Primary timeframe %s K-line data is empty for stock %s", primaryTimeframe, symbol)
	}

	// Calculate current indicators (based on primary timeframe latest data)
	currentPrice := primaryKlines[len(primaryKlines)-1].Close
	currentEMA20 := calculateEMA(primaryKlines, 20)
	currentMACD := calculateMACD(primaryKlines)
	currentRSI7 := calculateRSI(primaryKlines, 7)

	// Calculate price changes
	priceChange1h := calculatePriceChangeByBars(primaryKlines, primaryTimeframe, 60)  // 1 hour
	priceChange4h := calculatePriceChangeByBars(primaryKlines, primaryTimeframe, 240) // 4 hours

	// Fetch stock-specific extra data (news, corporate actions, volume surge)
	stockExtra := fetchStockExtraData(symbol, apiClient, primaryKlines)

	// Stocks don't have OI or funding rate like crypto
	return &Data{
		Symbol:         symbol,
		CurrentPrice:   currentPrice,
		PriceChange1h:  priceChange1h,
		PriceChange4h:  priceChange4h,
		CurrentEMA20:   currentEMA20,
		CurrentMACD:    currentMACD,
		CurrentRSI7:    currentRSI7,
		OpenInterest:   nil, // No OI for stocks
		FundingRate:    0,   // No funding rate for stocks
		TimeframeData:  timeframeData,
		StockExtraData: stockExtra,
	}, nil
}

// fetchStockExtraData fetches news, corporate actions, and calculates volume surge
func fetchStockExtraData(symbol string, apiClient *APIClient, klines []Kline) *StockExtraData {
	extra := &StockExtraData{}

	// Fetch news (last 5 articles)
	news, err := apiClient.GetNews(symbol, 5)
	if err == nil && len(news) > 0 {
		for _, n := range news {
			extra.RecentNews = append(extra.RecentNews, NewsItem{
				Headline:  n.Headline,
				Source:    n.Source,
				CreatedAt: n.CreatedAt,
				Summary:   n.Summary,
			})
		}
	}

	// Fetch corporate actions
	actions, err := apiClient.GetCorporateActions(symbol)
	if err == nil && len(actions) > 0 {
		for _, a := range actions {
			extra.CorporateActions = append(extra.CorporateActions, CorpAction{
				Type:        a.CorporateType,
				ExDate:      a.ExDate,
				Description: a.Description,
				CashAmount:  a.CashAmount,
			})
		}
	}

	// Calculate volume surge (2x+ average detection)
	if len(klines) >= 20 {
		// Calculate 20-day average volume
		var totalVol float64
		for i := len(klines) - 21; i < len(klines)-1; i++ {
			if i >= 0 {
				totalVol += klines[i].Volume
			}
		}
		avgVol := totalVol / 20
		currentVol := klines[len(klines)-1].Volume

		extra.AverageVolume = avgVol
		extra.CurrentVolume = currentVol
		if avgVol > 0 {
			extra.VolumeRatio = currentVol / avgVol
			extra.VolumeSurge = extra.VolumeRatio >= 2.0
		}
	}

	// Fetch Analyst Ratings (FMP API)
	if ratings, err := getAnalystRatings(symbol); err == nil {
		extra.AnalystRating = ratings.Rating
		extra.AnalystTargetHigh = ratings.TargetHigh
		extra.AnalystTargetLow = ratings.TargetLow
		extra.AnalystTargetAvg = ratings.TargetAvg
	}

	// Fetch Earnings Calendar (FMP API)
	if earnings, err := getEarningsCalendar(symbol); err == nil {
		extra.NextEarningsDate = earnings.Date
		extra.DaysUntilEarnings = earnings.DaysUntil
		extra.EpsEstimate = earnings.EpsEstimate
		extra.EarningsTime = earnings.Time
	}

	// Fetch Short Interest (FINRA API)
	if si, err := getShortInterest(symbol); err == nil {
		extra.ShortInterest = si.ShortPercent
		extra.DaysToCover = si.DaysToCover
		extra.SqueezeRisk = si.SqueezeRisk
	}

	// Fetch Zero DTE Options (Alpaca Options API)
	if zdte, err := getZeroDTEOptions(symbol); err == nil {
		extra.ZeroDTEPutCallRatio = zdte.PutCallRatio
		extra.ZeroDTESentiment = zdte.Sentiment
		extra.MaxPainStrike = zdte.MaxPainStrike
	}

	// Fetch Trade Flow (Alpaca Trades API)
	if tf, err := getTradeFlow(symbol, 30); err == nil {
		extra.TradeFlowDirection = tf.FlowDirection
		extra.BuySellRatio = tf.BuySellRatio
		extra.InstitutionalVWAP = tf.VWAP
	}

	// Calculate Anchored VWAP (from session start)
	extra.AnchoredVWAP = calculateAnchoredVWAP(klines)
	if len(klines) > 0 && extra.AnchoredVWAP > 0 {
		currentPrice := klines[len(klines)-1].Close
		extra.AnchoredVWAPDev = (currentPrice - extra.AnchoredVWAP) / extra.AnchoredVWAP * 100
	}

	return extra
}

// AnalystRatingData holds analyst rating info
type AnalystRatingData struct {
	Rating     string
	TargetHigh float64
	TargetLow  float64
	TargetAvg  float64
}

// getAnalystRatings fetches analyst ratings from FMP API
func getAnalystRatings(symbol string) (*AnalystRatingData, error) {
	url := fmt.Sprintf("https://financialmodelingprep.com/api/v3/grade/%s?limit=1&apikey=JgGALumW4MUTAuCLQZRS9BgldKqLdpM6", symbol)
	resp, err := httpClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var grades []struct {
		GradingCompany string `json:"gradingCompany"`
		NewGrade       string `json:"newGrade"`
	}
	if err := json.Unmarshal(body, &grades); err != nil {
		return nil, err
	}

	// Get price target
	ptURL := fmt.Sprintf("https://financialmodelingprep.com/api/v3/price-target/%s?apikey=JgGALumW4MUTAuCLQZRS9BgldKqLdpM6", symbol)
	ptResp, err := httpClient.Get(ptURL)
	if err != nil {
		return nil, err
	}
	defer ptResp.Body.Close()

	ptBody, err := io.ReadAll(ptResp.Body)
	if err != nil {
		return nil, err
	}

	var targets []struct {
		PriceTarget float64 `json:"priceTarget"`
	}
	json.Unmarshal(ptBody, &targets)

	rating := &AnalystRatingData{}
	if len(grades) > 0 {
		rating.Rating = grades[0].NewGrade
	}
	if len(targets) > 0 {
		// Use first target as average, calculate min/max from recent
		var sum, min, max float64
		min = targets[0].PriceTarget
		max = targets[0].PriceTarget
		for i, t := range targets {
			if i >= 10 {
				break
			}
			sum += t.PriceTarget
			if t.PriceTarget < min {
				min = t.PriceTarget
			}
			if t.PriceTarget > max {
				max = t.PriceTarget
			}
		}
		count := float64(len(targets))
		if count > 10 {
			count = 10
		}
		rating.TargetAvg = sum / count
		rating.TargetLow = min
		rating.TargetHigh = max
	}

	return rating, nil
}

// EarningsData holds earnings calendar info
type EarningsDataSimple struct {
	Date        string
	DaysUntil   int
	EpsEstimate float64
	Time        string
}

// getEarningsCalendar fetches upcoming earnings from FMP API
func getEarningsCalendar(symbol string) (*EarningsDataSimple, error) {
	now := time.Now()
	from := now.Format("2006-01-02")
	to := now.AddDate(0, 1, 0).Format("2006-01-02") // 1 month ahead

	url := fmt.Sprintf("https://financialmodelingprep.com/api/v3/earning_calendar?from=%s&to=%s&apikey=JgGALumW4MUTAuCLQZRS9BgldKqLdpM6", from, to)
	resp, err := httpClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var earnings []struct {
		Symbol       string  `json:"symbol"`
		Date         string  `json:"date"`
		EpsEstimated float64 `json:"epsEstimated"`
		Time         string  `json:"time"`
	}
	if err := json.Unmarshal(body, &earnings); err != nil {
		return nil, err
	}

	// Find this symbol's earnings
	for _, e := range earnings {
		if strings.EqualFold(e.Symbol, symbol) {
			earnDate, err := time.Parse("2006-01-02", e.Date)
			if err != nil {
				continue
			}
			daysUntil := int(earnDate.Sub(now).Hours() / 24)
			return &EarningsDataSimple{
				Date:        e.Date,
				DaysUntil:   daysUntil,
				EpsEstimate: e.EpsEstimated,
				Time:        e.Time,
			}, nil
		}
	}

	return nil, fmt.Errorf("no earnings found for %s", symbol)
}

// ShortInterestSimple holds short interest info
type ShortInterestSimple struct {
	ShortPercent float64
	DaysToCover  float64
	SqueezeRisk  string
}

// getShortInterest fetches short interest data
func getShortInterest(symbol string) (*ShortInterestSimple, error) {
	// Using FMP as fallback since FINRA requires special auth
	url := fmt.Sprintf("https://financialmodelingprep.com/api/v4/short-interest?symbol=%s&apikey=JgGALumW4MUTAuCLQZRS9BgldKqLdpM6", symbol)
	resp, err := httpClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var data []struct {
		ShortInterestPercent float64 `json:"shortInterestPercentOfFloat"`
		DaysToCover          float64 `json:"daysToCover"`
	}
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, err
	}

	if len(data) == 0 {
		return nil, fmt.Errorf("no short interest data for %s", symbol)
	}

	si := &ShortInterestSimple{
		ShortPercent: data[0].ShortInterestPercent,
		DaysToCover:  data[0].DaysToCover,
	}

	// Calculate squeeze risk
	if si.ShortPercent >= 20 && si.DaysToCover >= 5 {
		si.SqueezeRisk = "High"
	} else if si.ShortPercent >= 10 || si.DaysToCover >= 3 {
		si.SqueezeRisk = "Medium"
	} else {
		si.SqueezeRisk = "Low"
	}

	return si, nil
}

// ZeroDTESimple holds zero DTE options info
type ZeroDTESimple struct {
	PutCallRatio  float64
	Sentiment     string
	MaxPainStrike float64
}

// Massive.com API key
const massiveAPIKey = "vQtz66lpyexhpplKWhLL7rOXdfnClQsh"

// getZeroDTEOptions fetches zero DTE options data from Massive.com
func getZeroDTEOptions(symbol string) (*ZeroDTESimple, error) {
	// Get today's date for filtering zero DTE contracts
	today := time.Now().Format("2006-01-02")

	// Use Massive.com Options Chain Snapshot endpoint
	url := fmt.Sprintf("https://api.massive.com/v3/snapshot/options/%s?expiration_date=%s&apiKey=%s",
		symbol, today, massiveAPIKey)

	resp, err := httpClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("massive.com API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Parse options chain response
	var response struct {
		Results []struct {
			Details struct {
				ContractType   string  `json:"contract_type"`
				StrikePrice    float64 `json:"strike_price"`
				ExpirationDate string  `json:"expiration_date"`
			} `json:"details"`
			OpenInterest int     `json:"open_interest"`
			ImpliedVol   float64 `json:"implied_volatility"`
			Day          struct {
				Close float64 `json:"close"`
			} `json:"day"`
		} `json:"results"`
	}

	if err := json.Unmarshal(body, &response); err != nil {
		return nil, err
	}

	if len(response.Results) == 0 {
		return nil, fmt.Errorf("no zero DTE options found for %s", symbol)
	}

	// Calculate put/call ratio and max pain
	var totalCallOI, totalPutOI int64
	strikeOI := make(map[float64]int64) // For max pain calculation

	for _, opt := range response.Results {
		if opt.Details.ContractType == "call" {
			totalCallOI += int64(opt.OpenInterest)
		} else if opt.Details.ContractType == "put" {
			totalPutOI += int64(opt.OpenInterest)
		}
		strikeOI[opt.Details.StrikePrice] += int64(opt.OpenInterest)
	}

	result := &ZeroDTESimple{}

	// Calculate put/call ratio
	if totalCallOI > 0 {
		result.PutCallRatio = float64(totalPutOI) / float64(totalCallOI)
	}

	// Determine sentiment
	if result.PutCallRatio > 1.2 {
		result.Sentiment = "Bearish"
	} else if result.PutCallRatio < 0.8 {
		result.Sentiment = "Bullish"
	} else {
		result.Sentiment = "Neutral"
	}

	// Find max pain (strike with highest total OI)
	var maxOI int64
	for strike, oi := range strikeOI {
		if oi > maxOI {
			maxOI = oi
			result.MaxPainStrike = strike
		}
	}

	return result, nil
}

// TradeFlowSimple holds trade flow info
type TradeFlowSimple struct {
	FlowDirection string
	BuySellRatio  float64
	VWAP          float64
}

// getTradeFlow fetches trade flow data from Massive.com
func getTradeFlow(symbol string, minutes int) (*TradeFlowSimple, error) {
	// Calculate time range for trade data
	now := time.Now()
	start := now.Add(-time.Duration(minutes) * time.Minute)

	// Format timestamps for Massive.com API (nanoseconds)
	startNs := start.UnixNano()
	endNs := now.UnixNano()

	// Use Massive.com Trades endpoint
	url := fmt.Sprintf("https://api.massive.com/v3/trades/%s?timestamp.gte=%d&timestamp.lte=%d&limit=1000&apiKey=%s",
		symbol, startNs, endNs, massiveAPIKey)

	resp, err := httpClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("massive.com API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Parse trades response
	var response struct {
		Results []struct {
			Price      float64 `json:"price"`
			Size       int     `json:"size"`
			Conditions []int   `json:"conditions"`
			Timestamp  int64   `json:"sip_timestamp"`
		} `json:"results"`
	}

	if err := json.Unmarshal(body, &response); err != nil {
		return nil, err
	}

	if len(response.Results) == 0 {
		return nil, fmt.Errorf("no trades found for %s in last %d minutes", symbol, minutes)
	}

	// Analyze trade flow
	// We use trade conditions to classify as buy/sell
	// Condition 0 = regular, we use price vs previous to infer direction
	var buyVolume, sellVolume float64
	var totalPV, totalVol float64
	var prevPrice float64

	for i, trade := range response.Results {
		volume := float64(trade.Size)
		totalPV += trade.Price * volume
		totalVol += volume

		if i > 0 {
			// If price went up, likely a buy; if down, likely a sell
			if trade.Price > prevPrice {
				buyVolume += volume
			} else if trade.Price < prevPrice {
				sellVolume += volume
			} else {
				// Split evenly if price unchanged
				buyVolume += volume / 2
				sellVolume += volume / 2
			}
		}
		prevPrice = trade.Price
	}

	result := &TradeFlowSimple{}

	// Calculate VWAP
	if totalVol > 0 {
		result.VWAP = totalPV / totalVol
	}

	// Calculate buy/sell ratio
	if sellVolume > 0 {
		result.BuySellRatio = buyVolume / sellVolume
	} else if buyVolume > 0 {
		result.BuySellRatio = 2.0 // All buys
	} else {
		result.BuySellRatio = 1.0 // Neutral
	}

	// Determine flow direction
	if result.BuySellRatio > 1.3 {
		result.FlowDirection = "Strong Buying"
	} else if result.BuySellRatio > 1.1 {
		result.FlowDirection = "Buying"
	} else if result.BuySellRatio < 0.7 {
		result.FlowDirection = "Strong Selling"
	} else if result.BuySellRatio < 0.9 {
		result.FlowDirection = "Selling"
	} else {
		result.FlowDirection = "Neutral"
	}

	return result, nil
}

// calculateAnchoredVWAP calculates session-anchored VWAP from 9:30 AM ET
func calculateAnchoredVWAP(klines []Kline) float64 {
	if len(klines) < 2 {
		return 0
	}

	// Find session start (9:30 AM ET = 14:30 UTC during EST, 13:30 UTC during EDT)
	var sessionStartIdx int = -1
	loc, _ := time.LoadLocation("America/New_York")

	for i := len(klines) - 1; i >= 0; i-- {
		t := time.UnixMilli(klines[i].OpenTime)
		etTime := t.In(loc)
		hour, min := etTime.Hour(), etTime.Minute()

		// Check if this is at or just after market open (9:30 AM ET)
		if hour == 9 && min >= 30 && min < 35 {
			sessionStartIdx = i
			break
		}
		// If we've gone back to previous day's close, stop looking
		if hour < 9 || (hour == 9 && min < 30) {
			// This might be previous day data
			if i > 0 {
				prevT := time.UnixMilli(klines[i-1].OpenTime).In(loc)
				if prevT.Day() != etTime.Day() {
					break
				}
			}
		}
	}

	if sessionStartIdx < 0 {
		return 0 // Couldn't find session start
	}

	// Calculate VWAP from session start
	var cumPV, cumVol float64
	for i := sessionStartIdx; i < len(klines); i++ {
		typicalPrice := (klines[i].High + klines[i].Low + klines[i].Close) / 3
		cumPV += typicalPrice * klines[i].Volume
		cumVol += klines[i].Volume
	}

	if cumVol > 0 {
		return cumPV / cumVol
	}
	return 0
}

func calculateTimeframeSeries(klines []Kline, timeframe string, count int) *TimeframeSeriesData {
	if count <= 0 {
		count = 10 // default
	}

	data := &TimeframeSeriesData{
		Timeframe:     timeframe,
		Klines:        make([]KlineBar, 0, count),
		MidPrices:     make([]float64, 0, count),
		EMA20Values:   make([]float64, 0, count),
		EMA50Values:   make([]float64, 0, count),
		MACDValues:    make([]float64, 0, count),
		RSI7Values:    make([]float64, 0, count),
		RSI14Values:   make([]float64, 0, count),
		Volume:        make([]float64, 0, count),
		VWAPValues:    make([]float64, 0, count),
		VolumeProfile: make([]float64, 0),
	}

	// Get latest N data points based on count from config
	start := len(klines) - count
	if start < 0 {
		start = 0
	}

	// Find session start for VWAP (resetting at 9:30 AM ET for stocks)
	var sessionStartIdx int = -1
	loc, _ := time.LoadLocation("America/New_York")
	for i := len(klines) - 1; i >= 0; i-- {
		t := time.UnixMilli(klines[i].OpenTime).In(loc)
		if t.Hour() == 9 && t.Minute() == 30 {
			sessionStartIdx = i
			break
		}
		// Fallback: if we crossed days, the earliest bar of the day is the start
		if i > 0 {
			prevT := time.UnixMilli(klines[i-1].OpenTime).In(loc)
			if prevT.Day() != t.Day() && t.Hour() >= 9 {
				sessionStartIdx = i
				break
			}
		}
	}

	// Calculate cumulative VWAP from session start
	var cumulativePV float64
	var cumulativeVol float64
	vwapMap := make(map[int]float64) // index -> vwap value

	if sessionStartIdx >= 0 {
		for i := sessionStartIdx; i < len(klines); i++ {
			typicalPrice := (klines[i].High + klines[i].Low + klines[i].Close) / 3
			cumulativePV += typicalPrice * klines[i].Volume
			cumulativeVol += klines[i].Volume
			if cumulativeVol > 0 {
				vwapMap[i] = cumulativePV / cumulativeVol
			}
		}
	}

	for i := start; i < len(klines); i++ {
		// Store full OHLCV kline data
		data.Klines = append(data.Klines, KlineBar{
			Time:   klines[i].OpenTime,
			Open:   klines[i].Open,
			High:   klines[i].High,
			Low:    klines[i].Low,
			Close:  klines[i].Close,
			Volume: klines[i].Volume,
		})

		// Keep MidPrices and Volume for backward compatibility
		data.MidPrices = append(data.MidPrices, klines[i].Close)
		data.Volume = append(data.Volume, klines[i].Volume)

		// Calculate VWAP - using session-anchored value if available
		if vwap, ok := vwapMap[i]; ok {
			data.VWAPValues = append(data.VWAPValues, vwap)
		} else {
			// Fallback to simple typical price if session start not found or before current index
			typicalPrice := (klines[i].High + klines[i].Low + klines[i].Close) / 3
			data.VWAPValues = append(data.VWAPValues, typicalPrice)
		}

		// Calculate EMA20 for each point
		if i >= 19 {
			ema20 := calculateEMA(klines[:i+1], 20)
			data.EMA20Values = append(data.EMA20Values, ema20)
		}

		// Calculate EMA50 for each point
		if i >= 49 {
			ema50 := calculateEMA(klines[:i+1], 50)
			data.EMA50Values = append(data.EMA50Values, ema50)
		}

		// Calculate MACD for each point
		if i >= 25 {
			macd := calculateMACD(klines[:i+1])
			data.MACDValues = append(data.MACDValues, macd)
		}

		// Calculate RSI for each point
		if i >= 7 {
			rsi7 := calculateRSI(klines[:i+1], 7)
			data.RSI7Values = append(data.RSI7Values, rsi7)
		}
		if i >= 14 {
			rsi14 := calculateRSI(klines[:i+1], 14)
			data.RSI14Values = append(data.RSI14Values, rsi14)
		}
	}

	// Set current VWAP (last value)
	if len(data.VWAPValues) > 0 {
		data.CurrentVWAP = data.VWAPValues[len(data.VWAPValues)-1]
	}

	// Calculate ATR14
	data.ATR14 = calculateATR(klines, 14)

	// Calculate Volume Profile (simplified - volume at 10 price levels)
	if len(klines) > 0 {
		data.VolumeProfile = calculateVolumeProfile(klines[start:], 10)
	}

	return data
}

// calculateVolumeProfile calculates volume distribution across price levels
func calculateVolumeProfile(klines []Kline, numLevels int) []float64 {
	if len(klines) == 0 || numLevels <= 0 {
		return nil
	}

	// Find price range
	minPrice := klines[0].Low
	maxPrice := klines[0].High
	for _, k := range klines {
		if k.Low < minPrice {
			minPrice = k.Low
		}
		if k.High > maxPrice {
			maxPrice = k.High
		}
	}

	priceRange := maxPrice - minPrice
	if priceRange <= 0 {
		return nil
	}

	// Initialize volume profile buckets
	profile := make([]float64, numLevels)
	levelSize := priceRange / float64(numLevels)

	// Distribute volume across price levels
	for _, k := range klines {
		// Use typical price to determine which level
		typicalPrice := (k.High + k.Low + k.Close) / 3
		level := int((typicalPrice - minPrice) / levelSize)
		if level >= numLevels {
			level = numLevels - 1
		}
		if level < 0 {
			level = 0
		}
		profile[level] += k.Volume
	}

	return profile
}

// calculatePriceChangeByBars calculates how many K-lines to look back for price change based on timeframe
func calculatePriceChangeByBars(klines []Kline, timeframe string, targetMinutes int) float64 {
	if len(klines) < 2 {
		return 0
	}

	// Parse timeframe to minutes
	tfMinutes := parseTimeframeToMinutes(timeframe)
	if tfMinutes <= 0 {
		return 0
	}

	// Calculate how many K-lines to look back
	barsBack := targetMinutes / tfMinutes
	if barsBack < 1 {
		barsBack = 1
	}

	currentPrice := klines[len(klines)-1].Close
	idx := len(klines) - 1 - barsBack
	if idx < 0 {
		idx = 0
	}

	oldPrice := klines[idx].Close
	if oldPrice > 0 {
		return ((currentPrice - oldPrice) / oldPrice) * 100
	}
	return 0
}

// parseTimeframeToMinutes parses timeframe string to minutes
func parseTimeframeToMinutes(tf string) int {
	switch tf {
	case "1m":
		return 1
	case "3m":
		return 3
	case "5m":
		return 5
	case "15m":
		return 15
	case "30m":
		return 30
	case "1h":
		return 60
	case "2h":
		return 120
	case "4h":
		return 240
	case "6h":
		return 360
	case "8h":
		return 480
	case "12h":
		return 720
	case "1d":
		return 1440
	case "3d":
		return 4320
	case "1w":
		return 10080
	default:
		return 0
	}
}

// calculateEMA calculates EMA
func calculateEMA(klines []Kline, period int) float64 {
	if len(klines) < period {
		return 0
	}

	// Calculate SMA as initial EMA
	sum := 0.0
	for i := 0; i < period; i++ {
		sum += klines[i].Close
	}
	ema := sum / float64(period)

	// Calculate EMA
	multiplier := 2.0 / float64(period+1)
	for i := period; i < len(klines); i++ {
		ema = (klines[i].Close-ema)*multiplier + ema
	}

	return ema
}

// calculateMACD calculates MACD
func calculateMACD(klines []Kline) float64 {
	if len(klines) < 26 {
		return 0
	}

	// Calculate 12-period and 26-period EMA
	ema12 := calculateEMA(klines, 12)
	ema26 := calculateEMA(klines, 26)

	// MACD = EMA12 - EMA26
	return ema12 - ema26
}

// calculateRSI calculates RSI
func calculateRSI(klines []Kline, period int) float64 {
	if len(klines) <= period {
		return 0
	}

	gains := 0.0
	losses := 0.0

	// Calculate initial average gain/loss
	for i := 1; i <= period; i++ {
		change := klines[i].Close - klines[i-1].Close
		if change > 0 {
			gains += change
		} else {
			losses += -change
		}
	}

	avgGain := gains / float64(period)
	avgLoss := losses / float64(period)

	// Use Wilder smoothing method to calculate subsequent RSI
	for i := period + 1; i < len(klines); i++ {
		change := klines[i].Close - klines[i-1].Close
		if change > 0 {
			avgGain = (avgGain*float64(period-1) + change) / float64(period)
			avgLoss = (avgLoss * float64(period-1)) / float64(period)
		} else {
			avgGain = (avgGain * float64(period-1)) / float64(period)
			avgLoss = (avgLoss*float64(period-1) + (-change)) / float64(period)
		}
	}

	if avgLoss == 0 {
		return 100
	}

	rs := avgGain / avgLoss
	rsi := 100 - (100 / (1 + rs))

	return rsi
}

// calculateATR calculates ATR
func calculateATR(klines []Kline, period int) float64 {
	if len(klines) <= period {
		return 0
	}

	trs := make([]float64, len(klines))
	for i := 1; i < len(klines); i++ {
		high := klines[i].High
		low := klines[i].Low
		prevClose := klines[i-1].Close

		tr1 := high - low
		tr2 := math.Abs(high - prevClose)
		tr3 := math.Abs(low - prevClose)

		trs[i] = math.Max(tr1, math.Max(tr2, tr3))
	}

	// Calculate initial ATR
	sum := 0.0
	for i := 1; i <= period; i++ {
		sum += trs[i]
	}
	atr := sum / float64(period)

	// Wilder smoothing
	for i := period + 1; i < len(klines); i++ {
		atr = (atr*float64(period-1) + trs[i]) / float64(period)
	}

	return atr
}

// calculateIntradaySeries calculates intraday series data
func calculateIntradaySeries(klines []Kline) *IntradayData {
	data := &IntradayData{
		MidPrices:   make([]float64, 0, 10),
		EMA20Values: make([]float64, 0, 10),
		MACDValues:  make([]float64, 0, 10),
		RSI7Values:  make([]float64, 0, 10),
		RSI14Values: make([]float64, 0, 10),
		Volume:      make([]float64, 0, 10),
	}

	// Get latest 10 data points
	start := len(klines) - 10
	if start < 0 {
		start = 0
	}

	for i := start; i < len(klines); i++ {
		data.MidPrices = append(data.MidPrices, klines[i].Close)
		data.Volume = append(data.Volume, klines[i].Volume)

		// Calculate EMA20 for each point
		if i >= 19 {
			ema20 := calculateEMA(klines[:i+1], 20)
			data.EMA20Values = append(data.EMA20Values, ema20)
		}

		// Calculate MACD for each point
		if i >= 25 {
			macd := calculateMACD(klines[:i+1])
			data.MACDValues = append(data.MACDValues, macd)
		}

		// Calculate RSI for each point
		if i >= 7 {
			rsi7 := calculateRSI(klines[:i+1], 7)
			data.RSI7Values = append(data.RSI7Values, rsi7)
		}
		if i >= 14 {
			rsi14 := calculateRSI(klines[:i+1], 14)
			data.RSI14Values = append(data.RSI14Values, rsi14)
		}
	}

	// Calculate 3m ATR14
	data.ATR14 = calculateATR(klines, 14)

	return data
}

// calculateLongerTermData calculates longer-term data
func calculateLongerTermData(klines []Kline) *LongerTermData {
	data := &LongerTermData{
		MACDValues:  make([]float64, 0, 10),
		RSI14Values: make([]float64, 0, 10),
	}

	// Calculate EMA
	data.EMA20 = calculateEMA(klines, 20)
	data.EMA50 = calculateEMA(klines, 50)

	// Calculate ATR
	data.ATR3 = calculateATR(klines, 3)
	data.ATR14 = calculateATR(klines, 14)

	// Calculate volume
	if len(klines) > 0 {
		data.CurrentVolume = klines[len(klines)-1].Volume
		// Calculate average volume
		sum := 0.0
		for _, k := range klines {
			sum += k.Volume
		}
		data.AverageVolume = sum / float64(len(klines))
	}

	// Calculate MACD and RSI series
	start := len(klines) - 10
	if start < 0 {
		start = 0
	}

	for i := start; i < len(klines); i++ {
		if i >= 25 {
			macd := calculateMACD(klines[:i+1])
			data.MACDValues = append(data.MACDValues, macd)
		}
		if i >= 14 {
			rsi14 := calculateRSI(klines[:i+1], 14)
			data.RSI14Values = append(data.RSI14Values, rsi14)
		}
	}

	return data
}

// getOpenInterestData retrieves OI data
func getOpenInterestData(symbol string) (*OIData, error) {
	url := fmt.Sprintf("https://fapi.binance.com/fapi/v1/openInterest?symbol=%s", symbol)

	apiClient := NewAPIClient()
	resp, err := apiClient.client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result struct {
		OpenInterest string `json:"openInterest"`
		Symbol       string `json:"symbol"`
		Time         int64  `json:"time"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	oi, _ := strconv.ParseFloat(result.OpenInterest, 64)

	return &OIData{
		Latest:  oi,
		Average: oi * 0.999, // Approximate average
	}, nil
}

// getFundingRate retrieves funding rate (optimized: uses 1-hour cache)
func getFundingRate(symbol string) (float64, error) {
	// Check cache (1-hour validity)
	// Funding Rate only updates every 8 hours, 1-hour cache is very reasonable
	if cached, ok := fundingRateMap.Load(symbol); ok {
		cache := cached.(*FundingRateCache)
		if time.Since(cache.UpdatedAt) < frCacheTTL {
			// Cache hit, return directly
			return cache.Rate, nil
		}
	}

	// Cache expired or doesn't exist, call API
	url := fmt.Sprintf("https://fapi.binance.com/fapi/v1/premiumIndex?symbol=%s", symbol)

	apiClient := NewAPIClient()
	resp, err := apiClient.client.Get(url)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, err
	}

	var result struct {
		Symbol          string `json:"symbol"`
		MarkPrice       string `json:"markPrice"`
		IndexPrice      string `json:"indexPrice"`
		LastFundingRate string `json:"lastFundingRate"`
		NextFundingTime int64  `json:"nextFundingTime"`
		InterestRate    string `json:"interestRate"`
		Time            int64  `json:"time"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return 0, err
	}

	rate, _ := strconv.ParseFloat(result.LastFundingRate, 64)

	// Update cache
	fundingRateMap.Store(symbol, &FundingRateCache{
		Rate:      rate,
		UpdatedAt: time.Now(),
	})

	return rate, nil
}

// Format formats and outputs market data
func Format(data *Data) string {
	var sb strings.Builder

	// Format price with dynamic precision
	priceStr := formatPriceWithDynamicPrecision(data.CurrentPrice)
	sb.WriteString(fmt.Sprintf("current_price = %s, current_ema20 = %.3f, current_macd = %.3f, current_rsi (7 period) = %.3f\n\n",
		priceStr, data.CurrentEMA20, data.CurrentMACD, data.CurrentRSI7))

	sb.WriteString(fmt.Sprintf("In addition, here is the latest %s open interest and funding rate for perps:\n\n",
		data.Symbol))

	if data.OpenInterest != nil {
		// Format OI data with dynamic precision
		oiLatestStr := formatPriceWithDynamicPrecision(data.OpenInterest.Latest)
		oiAverageStr := formatPriceWithDynamicPrecision(data.OpenInterest.Average)
		sb.WriteString(fmt.Sprintf("Open Interest: Latest: %s Average: %s\n\n",
			oiLatestStr, oiAverageStr))
	}

	sb.WriteString(fmt.Sprintf("Funding Rate: %.2e\n\n", data.FundingRate))

	if data.IntradaySeries != nil {
		sb.WriteString("Intraday series (3‑minute intervals, oldest → latest):\n\n")

		if len(data.IntradaySeries.MidPrices) > 0 {
			sb.WriteString(fmt.Sprintf("Mid prices: %s\n\n", formatFloatSlice(data.IntradaySeries.MidPrices)))
		}

		if len(data.IntradaySeries.EMA20Values) > 0 {
			sb.WriteString(fmt.Sprintf("EMA indicators (20‑period): %s\n\n", formatFloatSlice(data.IntradaySeries.EMA20Values)))
		}

		if len(data.IntradaySeries.MACDValues) > 0 {
			sb.WriteString(fmt.Sprintf("MACD indicators: %s\n\n", formatFloatSlice(data.IntradaySeries.MACDValues)))
		}

		if len(data.IntradaySeries.RSI7Values) > 0 {
			sb.WriteString(fmt.Sprintf("RSI indicators (7‑Period): %s\n\n", formatFloatSlice(data.IntradaySeries.RSI7Values)))
		}

		if len(data.IntradaySeries.RSI14Values) > 0 {
			sb.WriteString(fmt.Sprintf("RSI indicators (14‑Period): %s\n\n", formatFloatSlice(data.IntradaySeries.RSI14Values)))
		}

		if len(data.IntradaySeries.Volume) > 0 {
			sb.WriteString(fmt.Sprintf("Volume: %s\n\n", formatFloatSlice(data.IntradaySeries.Volume)))
		}

		sb.WriteString(fmt.Sprintf("3m ATR (14‑period): %.3f\n\n", data.IntradaySeries.ATR14))
	}

	if data.LongerTermContext != nil {
		sb.WriteString("Longer‑term context (4‑hour timeframe):\n\n")

		sb.WriteString(fmt.Sprintf("20‑Period EMA: %.3f vs. 50‑Period EMA: %.3f\n\n",
			data.LongerTermContext.EMA20, data.LongerTermContext.EMA50))

		sb.WriteString(fmt.Sprintf("3‑Period ATR: %.3f vs. 14‑Period ATR: %.3f\n\n",
			data.LongerTermContext.ATR3, data.LongerTermContext.ATR14))

		sb.WriteString(fmt.Sprintf("Current Volume: %.3f vs. Average Volume: %.3f\n\n",
			data.LongerTermContext.CurrentVolume, data.LongerTermContext.AverageVolume))

		if len(data.LongerTermContext.MACDValues) > 0 {
			sb.WriteString(fmt.Sprintf("MACD indicators: %s\n\n", formatFloatSlice(data.LongerTermContext.MACDValues)))
		}

		if len(data.LongerTermContext.RSI14Values) > 0 {
			sb.WriteString(fmt.Sprintf("RSI indicators (14‑Period): %s\n\n", formatFloatSlice(data.LongerTermContext.RSI14Values)))
		}
	}

	// Multi-timeframe data (new)
	if len(data.TimeframeData) > 0 {
		// Output sorted by timeframe
		timeframeOrder := []string{"1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w"}
		for _, tf := range timeframeOrder {
			if tfData, ok := data.TimeframeData[tf]; ok {
				sb.WriteString(fmt.Sprintf("=== %s Timeframe ===\n\n", strings.ToUpper(tf)))
				formatTimeframeData(&sb, tfData)
			}
		}
	}

	// Stock-specific extra data (news, corporate actions, volume surge)
	if data.StockExtraData != nil {
		formatStockExtraData(&sb, data.StockExtraData)
	}

	return sb.String()
}

// formatStockExtraData formats stock-specific indicators
func formatStockExtraData(sb *strings.Builder, extra *StockExtraData) {
	sb.WriteString("=== Stock Market Indicators ===\n\n")

	// Volume Surge Detection
	if extra.CurrentVolume > 0 {
		surgeStatus := "Normal"
		if extra.VolumeSurge {
			surgeStatus = "🔥 SURGE DETECTED"
		}
		sb.WriteString(fmt.Sprintf("**Volume Analysis**: Current: %.0f, 20-day Avg: %.0f, Ratio: %.2fx (%s)\n\n",
			extra.CurrentVolume, extra.AverageVolume, extra.VolumeRatio, surgeStatus))
	}

	// Corporate Actions
	if len(extra.CorporateActions) > 0 {
		sb.WriteString("**Corporate Actions**:\n")
		for _, action := range extra.CorporateActions {
			if action.CashAmount > 0 {
				sb.WriteString(fmt.Sprintf("- %s: Ex-Date %s, Amount: $%.4f\n", action.Type, action.ExDate, action.CashAmount))
			} else {
				sb.WriteString(fmt.Sprintf("- %s: Ex-Date %s - %s\n", action.Type, action.ExDate, action.Description))
			}
		}
		sb.WriteString("\n")
	}

	// Recent News
	if len(extra.RecentNews) > 0 {
		sb.WriteString("**Recent News & Sentiment**:\n")
		for i, news := range extra.RecentNews {
			if i >= 5 {
				break // Limit to 5 headlines
			}
			// Truncate long headlines
			headline := news.Headline
			if len(headline) > 100 {
				headline = headline[:97] + "..."
			}
			sb.WriteString(fmt.Sprintf("- [%s] %s\n", news.Source, headline))
		}
		sb.WriteString("\n")
	}
}

// formatTimeframeData formats data for a single timeframe
func formatTimeframeData(sb *strings.Builder, data *TimeframeSeriesData) {
	// Use OHLCV table format if kline data is available
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
		// Fallback to old format for backward compatibility
		sb.WriteString(fmt.Sprintf("Mid prices: %s\n\n", formatFloatSlice(data.MidPrices)))
		if len(data.Volume) > 0 {
			sb.WriteString(fmt.Sprintf("Volume: %s\n\n", formatFloatSlice(data.Volume)))
		}
	}

	// Technical indicators
	if len(data.EMA20Values) > 0 {
		sb.WriteString(fmt.Sprintf("EMA20: %s\n", formatFloatSlice(data.EMA20Values)))
	}

	if len(data.EMA50Values) > 0 {
		sb.WriteString(fmt.Sprintf("EMA50: %s\n", formatFloatSlice(data.EMA50Values)))
	}

	if len(data.MACDValues) > 0 {
		sb.WriteString(fmt.Sprintf("MACD: %s\n", formatFloatSlice(data.MACDValues)))
	}

	if len(data.RSI7Values) > 0 {
		sb.WriteString(fmt.Sprintf("RSI7: %s\n", formatFloatSlice(data.RSI7Values)))
	}

	if len(data.RSI14Values) > 0 {
		sb.WriteString(fmt.Sprintf("RSI14: %s\n", formatFloatSlice(data.RSI14Values)))
	}

	if data.ATR14 > 0 {
		sb.WriteString(fmt.Sprintf("ATR14: %.4f\n", data.ATR14))
	}

	// VWAP indicator
	if data.CurrentVWAP > 0 {
		sb.WriteString(fmt.Sprintf("Current VWAP: %.4f\n", data.CurrentVWAP))
	}
	if len(data.VWAPValues) > 0 {
		sb.WriteString(fmt.Sprintf("VWAP Series: %s\n", formatFloatSlice(data.VWAPValues)))
	}

	// Volume Profile (simplified)
	if len(data.VolumeProfile) > 0 {
		sb.WriteString(fmt.Sprintf("Volume Profile (price levels low→high): %s\n", formatFloatSlice(data.VolumeProfile)))
	}

	sb.WriteString("\n")
}

// formatPriceWithDynamicPrecision dynamically selects precision based on price range
// This perfectly supports all coins from ultra-low price meme coins (< 0.0001) to BTC/ETH
func formatPriceWithDynamicPrecision(price float64) string {
	switch {
	case price < 0.0001:
		// Ultra-low price meme coins: 1000SATS, 1000WHY, DOGS
		// 0.00002070 → "0.00002070" (8 decimal places)
		return fmt.Sprintf("%.8f", price)
	case price < 0.001:
		// Low price meme coins: NEIRO, HMSTR, HOT, NOT
		// 0.00015060 → "0.000151" (6 decimal places)
		return fmt.Sprintf("%.6f", price)
	case price < 0.01:
		// Mid-low price coins: PEPE, SHIB, MEME
		// 0.00556800 → "0.005568" (6 decimal places)
		return fmt.Sprintf("%.6f", price)
	case price < 1.0:
		// Low price coins: ASTER, DOGE, ADA, TRX
		// 0.9954 → "0.9954" (4 decimal places)
		return fmt.Sprintf("%.4f", price)
	case price < 100:
		// Mid price coins: SOL, AVAX, LINK, MATIC
		// 23.4567 → "23.4567" (4 decimal places)
		return fmt.Sprintf("%.4f", price)
	default:
		// High price coins: BTC, ETH (save tokens)
		// 45678.9123 → "45678.91" (2 decimal places)
		return fmt.Sprintf("%.2f", price)
	}
}

// formatFloatSlice formats float64 slice to string (using dynamic precision)
func formatFloatSlice(values []float64) string {
	strValues := make([]string, len(values))
	for i, v := range values {
		strValues[i] = formatPriceWithDynamicPrecision(v)
	}
	return "[" + strings.Join(strValues, ", ") + "]"
}

// Normalize normalizes symbol to uppercase (stock symbols don't need USDT suffix)
func Normalize(symbol string) string {
	return strings.ToUpper(strings.TrimSpace(symbol))
}

// parseFloat parses float value
func parseFloat(v interface{}) (float64, error) {
	switch val := v.(type) {
	case string:
		return strconv.ParseFloat(val, 64)
	case float64:
		return val, nil
	case int:
		return float64(val), nil
	case int64:
		return float64(val), nil
	default:
		return 0, fmt.Errorf("unsupported type: %T", v)
	}
}

// BuildDataFromKlines constructs market data snapshot from preloaded K-line series (for backtesting/simulation).
func BuildDataFromKlines(symbol string, primary []Kline, longer []Kline) (*Data, error) {
	if len(primary) == 0 {
		return nil, fmt.Errorf("primary series is empty")
	}

	symbol = Normalize(symbol)
	current := primary[len(primary)-1]
	currentPrice := current.Close

	data := &Data{
		Symbol:            symbol,
		CurrentPrice:      currentPrice,
		CurrentEMA20:      calculateEMA(primary, 20),
		CurrentMACD:       calculateMACD(primary),
		CurrentRSI7:       calculateRSI(primary, 7),
		PriceChange1h:     priceChangeFromSeries(primary, time.Hour),
		PriceChange4h:     priceChangeFromSeries(primary, 4*time.Hour),
		OpenInterest:      &OIData{Latest: 0, Average: 0},
		FundingRate:       0,
		IntradaySeries:    calculateIntradaySeries(primary),
		LongerTermContext: nil,
	}

	if len(longer) > 0 {
		data.LongerTermContext = calculateLongerTermData(longer)
	}

	return data, nil
}

func priceChangeFromSeries(series []Kline, duration time.Duration) float64 {
	if len(series) == 0 || duration <= 0 {
		return 0
	}
	last := series[len(series)-1]
	target := last.CloseTime - duration.Milliseconds()
	for i := len(series) - 1; i >= 0; i-- {
		if series[i].CloseTime <= target {
			price := series[i].Close
			if price > 0 {
				return ((last.Close - price) / price) * 100
			}
			break
		}
	}
	return 0
}

// isStaleData detects stale data (consecutive price freeze)
// Fix DOGEUSDT-style issue: consecutive N periods with completely unchanged prices indicate data source anomaly
func isStaleData(klines []Kline, symbol string) bool {
	if len(klines) < 5 {
		return false // Insufficient data to determine
	}

	// Detection threshold: 5 consecutive 3-minute periods with unchanged price (15 minutes without fluctuation)
	const stalePriceThreshold = 5
	const priceTolerancePct = 0.0001 // 0.01% fluctuation tolerance (avoid false positives)

	// Take the last stalePriceThreshold K-lines
	recentKlines := klines[len(klines)-stalePriceThreshold:]
	firstPrice := recentKlines[0].Close

	// Check if all prices are within tolerance
	for i := 1; i < len(recentKlines); i++ {
		priceDiff := math.Abs(recentKlines[i].Close-firstPrice) / firstPrice
		if priceDiff > priceTolerancePct {
			return false // Price fluctuation exists, data is normal
		}
	}

	// Additional check: MACD and volume
	// If price is unchanged but MACD/volume shows normal fluctuation, it might be a real market situation (extremely low volatility)
	// Check if volume is also 0 (data completely frozen)
	allVolumeZero := true
	for _, k := range recentKlines {
		if k.Volume > 0 {
			allVolumeZero = false
			break
		}
	}

	if allVolumeZero {
		logger.Infof("⚠️  %s stale data confirmed: price freeze + zero volume", symbol)
		return true
	}

	// Price frozen but has volume: might be extremely low volatility market, allow but log warning
	logger.Infof("⚠️  %s detected extreme price stability (no fluctuation for %d consecutive periods), but volume is normal", symbol, stalePriceThreshold)
	return false
}

// ============================================================================
// VWAP 1-Minute Bar Collection
// ============================================================================

// Bar1Min represents a single 1-minute bar for VWAP calculation
type Bar1Min struct {
	Time   time.Time
	Open   float64
	High   float64
	Low    float64
	Close  float64
	Volume float64
}

// GetLatest1MinBar fetches the latest 1-minute bar for a stock symbol from Alpaca
// Used for VWAP real-time data collection during pre-entry phase
func GetLatest1MinBar(symbol string) (*Bar1Min, error) {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))

	// Use Alpaca API client
	apiClient := NewAPIClient()
	if apiClient.apiKey == "" {
		return nil, fmt.Errorf("Alpaca API credentials not configured")
	}

	// Fetch last 2 1-minute bars (in case the most recent one is incomplete)
	klines, err := apiClient.GetKlines(symbol, "1m", 2)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch 1-min bars for %s: %w", symbol, err)
	}

	if len(klines) == 0 {
		return nil, fmt.Errorf("no 1-min bar data available for %s", symbol)
	}

	// Return the most recent complete bar
	latest := klines[len(klines)-1]
	return &Bar1Min{
		Time:   time.UnixMilli(latest.OpenTime),
		Open:   latest.Open,
		High:   latest.High,
		Low:    latest.Low,
		Close:  latest.Close,
		Volume: latest.Volume,
	}, nil
}
