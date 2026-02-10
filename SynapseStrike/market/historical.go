package market

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const (
	// Alpaca Data API for historical stock bars
	alpacaDataURL     = "https://data.alpaca.markets/v2/stocks"
	alpacaMaxBarLimit = 10000
)

// Global Alpaca credentials (set by SetAlpacaCredentials or from environment)
var (
	globalAlpacaAPIKey    string
	globalAlpacaAPISecret string
)

// SetAlpacaCredentials sets the Alpaca API credentials for market data fetching
func SetAlpacaCredentials(apiKey, apiSecret string) {
	globalAlpacaAPIKey = apiKey
	globalAlpacaAPISecret = apiSecret
}

// AlpacaBar represents a single bar from Alpaca API
type AlpacaBar struct {
	Timestamp  string  `json:"t"`
	Open       float64 `json:"o"`
	High       float64 `json:"h"`
	Low        float64 `json:"l"`
	Close      float64 `json:"c"`
	Volume     float64 `json:"v"`
	TradeCount int     `json:"n"`
	VWAP       float64 `json:"vw"`
}

// AlpacaBarsResponse is the response from Alpaca bars API
type AlpacaBarsResponse struct {
	Bars          []AlpacaBar `json:"bars"`
	NextPageToken string      `json:"next_page_token"`
	Symbol        string      `json:"symbol"`
}

// mapTimeframeToAlpaca converts our timeframe format to Alpaca format
func mapTimeframeToAlpaca(tf string) string {
	// Normalize to lowercase
	tf = strings.ToLower(tf)
	switch tf {
	case "1m", "1min":
		return "1Min"
	case "5m", "5min":
		return "5Min"
	case "15m", "15min":
		return "15Min"
	case "30m", "30min":
		return "30Min"
	case "1h", "60m", "60":
		return "1Hour"
	case "4h", "240m", "240":
		return "4Hour"
	case "1d", "d", "1day":
		return "1Day"
	case "1w", "w", "1week":
		return "1Week"
	default:
		// Try to match common patterns
		if strings.HasSuffix(tf, "m") || strings.HasSuffix(tf, "min") {
			return tf[:len(tf)-1] + "Min"
		}
		if strings.HasSuffix(tf, "h") || strings.HasSuffix(tf, "hour") {
			return tf[:len(tf)-1] + "Hour"
		}
		return "1Hour" // Default to 1 hour
	}
}

// GetKlinesRange fetches K-line (bar) series within specified time range using Alpaca API.
// Returns data sorted by time in ascending order.
func GetKlinesRange(symbol string, timeframe string, start, end time.Time) ([]Kline, error) {
	// Normalize symbol - for stocks, just uppercase and remove any suffixes
	symbol = strings.ToUpper(strings.TrimSuffix(symbol, "USDT"))
	symbol = strings.TrimSuffix(symbol, "USD")

	alpacaTF := mapTimeframeToAlpaca(timeframe)

	if !end.After(start) {
		return nil, fmt.Errorf("end time must be after start time")
	}

	// Get Alpaca API credentials - first check global, then environment
	apiKey := globalAlpacaAPIKey
	apiSecret := globalAlpacaAPISecret

	// Fallback to environment variables if global not set
	if apiKey == "" {
		apiKey = os.Getenv("ALPACA_API_KEY")
	}
	if apiSecret == "" {
		apiSecret = os.Getenv("ALPACA_API_SECRET")
	}
	// Fallback to alternative env var names
	if apiKey == "" {
		apiKey = os.Getenv("APCA_API_KEY_ID")
	}
	if apiSecret == "" {
		apiSecret = os.Getenv("APCA_API_SECRET_KEY")
	}

	if apiKey == "" || apiSecret == "" {
		return nil, fmt.Errorf("Alpaca API credentials not configured. Please set up your Alpaca brokerage in Config or set ALPACA_API_KEY and ALPACA_API_SECRET environment variables")
	}

	// Debug log to trace credential usage
	fmt.Printf("📊 [Alpaca] GetKlinesRange for %s %s using API key: %s...%s\n", symbol, timeframe, apiKey[:min(4, len(apiKey))], apiKey[max(0, len(apiKey)-4):])

	var all []Kline
	nextPageToken := ""
	client := &http.Client{Timeout: 30 * time.Second}

	for {
		// Build URL
		url := fmt.Sprintf("%s/%s/bars", alpacaDataURL, symbol)

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, err
		}

		// Set Alpaca authentication headers
		req.Header.Set("APCA-API-KEY-ID", apiKey)
		req.Header.Set("APCA-API-SECRET-KEY", apiSecret)

		// Set query parameters
		q := req.URL.Query()
		q.Set("timeframe", alpacaTF)
		q.Set("start", start.Format(time.RFC3339))
		q.Set("end", end.Format(time.RFC3339))
		q.Set("limit", fmt.Sprintf("%d", alpacaMaxBarLimit))
		q.Set("adjustment", "split") // Adjust for stock splits
		if nextPageToken != "" {
			q.Set("page_token", nextPageToken)
		}
		req.URL.RawQuery = q.Encode()

		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("Alpaca API request failed: %w", err)
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return nil, err
		}

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("Alpaca API returned status %d: %s", resp.StatusCode, string(body))
		}

		var barsResp AlpacaBarsResponse
		if err := json.Unmarshal(body, &barsResp); err != nil {
			return nil, fmt.Errorf("failed to parse Alpaca response: %w", err)
		}

		// Convert Alpaca bars to our Kline format
		for _, bar := range barsResp.Bars {
			// Parse timestamp
			t, err := time.Parse(time.RFC3339, bar.Timestamp)
			if err != nil {
				continue
			}

			openTimeMs := t.UnixMilli()
			// Estimate close time based on timeframe
			closeTimeMs := openTimeMs + getTimeframeDurationMs(alpacaTF) - 1

			kline := Kline{
				OpenTime:  openTimeMs,
				Open:      bar.Open,
				High:      bar.High,
				Low:       bar.Low,
				Close:     bar.Close,
				Volume:    bar.Volume,
				CloseTime: closeTimeMs,
			}
			all = append(all, kline)
		}

		// Check for more pages
		if barsResp.NextPageToken == "" || len(barsResp.Bars) == 0 {
			break
		}
		nextPageToken = barsResp.NextPageToken
	}

	return all, nil
}

// getTimeframeDurationMs returns the duration of a timeframe in milliseconds
func getTimeframeDurationMs(tf string) int64 {
	switch tf {
	case "1Min":
		return 60 * 1000
	case "5Min":
		return 5 * 60 * 1000
	case "15Min":
		return 15 * 60 * 1000
	case "30Min":
		return 30 * 60 * 1000
	case "1Hour":
		return 60 * 60 * 1000
	case "4Hour":
		return 4 * 60 * 60 * 1000
	case "1Day":
		return 24 * 60 * 60 * 1000
	case "1Week":
		return 7 * 24 * 60 * 60 * 1000
	default:
		return 60 * 60 * 1000 // Default 1 hour
	}
}

// ============================================================================
// Widesurf / Polygon-compatible Data Fetcher
// ============================================================================

const defaultWidesurfBaseURL = "http://10.0.0.94:8020"

// PolygonAggResult represents a single aggregate bar from Polygon API
type PolygonAggResult struct {
	Timestamp    int64   `json:"t"`  // Unix ms timestamp
	Open         float64 `json:"o"`
	High         float64 `json:"h"`
	Low          float64 `json:"l"`
	Close        float64 `json:"c"`
	Volume       float64 `json:"v"`
	VWAP         float64 `json:"vw"`
	Transactions int     `json:"n"`
}

// PolygonAggsResponse is the response from Polygon aggregates API
type PolygonAggsResponse struct {
	Results    []PolygonAggResult `json:"results"`
	Status     string             `json:"status"`
	ResultsCount int              `json:"resultsCount"`
	NextURL    string             `json:"next_url"`
}

// mapTimeframeToPolygon converts our timeframe to Polygon multiplier + timespan
func mapTimeframeToPolygon(tf string) (int, string) {
	tf = strings.ToLower(tf)
	switch tf {
	case "1m", "1min":
		return 1, "minute"
	case "3m", "3min":
		return 3, "minute"
	case "5m", "5min":
		return 5, "minute"
	case "15m", "15min":
		return 15, "minute"
	case "30m", "30min":
		return 30, "minute"
	case "1h", "60m":
		return 1, "hour"
	case "4h", "240m":
		return 4, "hour"
	case "1d", "d":
		return 1, "day"
	case "1w", "w":
		return 1, "week"
	default:
		return 1, "hour"
	}
}

// GetKlinesRangePolygon fetches K-line data from Widesurf (Polygon-compatible API).
// API format: GET /v1/aggs/ticker/{symbol}/range/{multiplier}/{timespan}/{from}/{to}
func GetKlinesRangePolygon(symbol string, timeframe string, start, end time.Time, apiKey string, baseURL string) ([]Kline, error) {
	symbol = strings.ToUpper(strings.TrimSuffix(symbol, "USDT"))
	symbol = strings.TrimSuffix(symbol, "USD")

	if apiKey == "" {
		return nil, fmt.Errorf("Widesurf API key not configured")
	}

	if !end.After(start) {
		return nil, fmt.Errorf("end time must be after start time")
	}

	multiplier, timespan := mapTimeframeToPolygon(timeframe)
	fromDate := start.Format("2006-01-02")
	toDate := end.Format("2006-01-02")

	if baseURL == "" {
		baseURL = defaultWidesurfBaseURL
	}
	baseURL = strings.TrimRight(baseURL, "/")

	var all []Kline
	client := &http.Client{Timeout: 30 * time.Second}

	url := fmt.Sprintf("%s/v1/aggs/ticker/%s/range/%d/%s/%s/%s?apiKey=%s&adjusted=true&sort=asc&limit=50000",
		baseURL, symbol, multiplier, timespan, fromDate, toDate, apiKey)

	fmt.Printf("📊 [Widesurf] GET %s\n", url)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Widesurf request failed: %w", err)
	}

	body, err := io.ReadAll(resp.Body)
	resp.Body.Close()
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Widesurf API returned status %d: %s (URL: %s)", resp.StatusCode, string(body), url)
	}

	var aggsResp PolygonAggsResponse
	if err := json.Unmarshal(body, &aggsResp); err != nil {
		return nil, fmt.Errorf("failed to parse Widesurf response: %w (body: %s)", err, string(body[:min(len(body), 200)]))
	}

	for _, result := range aggsResp.Results {
		openTimeMs := result.Timestamp
		tfDurMs := getTimeframeDurationMs(mapTimeframeToAlpaca(timeframe)) // reuse existing duration calculator
		closeTimeMs := openTimeMs + tfDurMs - 1

		kline := Kline{
			OpenTime:  openTimeMs,
			Open:      result.Open,
			High:      result.High,
			Low:       result.Low,
			Close:     result.Close,
			Volume:    result.Volume,
			CloseTime: closeTimeMs,
		}
		all = append(all, kline)
	}

	fmt.Printf("📊 [Widesurf] Got %d bars for %s %s\n", len(all), symbol, timeframe)
	return all, nil
}
