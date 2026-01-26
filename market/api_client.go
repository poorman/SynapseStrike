package market

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"SynapseStrike/hook"
	"os"
	"strconv"
	"time"
)

const (
	// Alpaca API endpoints for stock market data
	alpacaDataBaseURL = "https://data.alpaca.markets"
)

type APIClient struct {
	client    *http.Client
	apiKey    string
	apiSecret string
}

func NewAPIClient() *APIClient {
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	hookRes := hook.HookExec[hook.SetHttpClientResult](hook.SET_HTTP_CLIENT, client)
	if hookRes != nil && hookRes.Error() == nil {
		log.Printf("Using HTTP client set by Hook")
		client = hookRes.GetResult()
	}

	// Get Alpaca credentials - first check global (set by SetAlpacaCredentials), then environment
	apiKey := globalAlpacaAPIKey
	apiSecret := globalAlpacaAPISecret
	
	// Fallback to environment variables if global not set
	if apiKey == "" {
		apiKey = os.Getenv("ALPACA_API_KEY")
	}
	if apiSecret == "" {
		apiSecret = os.Getenv("ALPACA_API_SECRET")
	}

	return &APIClient{
		client:    client,
		apiKey:    apiKey,
		apiSecret: apiSecret,
	}
}

func (c *APIClient) GetExchangeInfo() (*ExchangeInfo, error) {
	// For stocks, we don't need exchange info like Binance
	// Return empty exchange info
	return &ExchangeInfo{}, nil
}

// mapIntervalToAlpaca converts our interval format to Alpaca format
func mapIntervalToAlpaca(interval string) string {
	switch interval {
	case "1m":
		return "1Min"
	case "3m":
		return "3Min"
	case "5m":
		return "5Min"
	case "15m":
		return "15Min"
	case "30m":
		return "30Min"
	case "1h":
		return "1Hour"
	case "4h":
		return "4Hour"
	case "1d", "1D":
		return "1Day"
	default:
		return "5Min" // default to 5 min for stocks
	}
}

func (c *APIClient) GetKlines(symbol, interval string, limit int) ([]Kline, error) {
	// Use Alpaca stocks API
	alpacaInterval := mapIntervalToAlpaca(interval)
	
	// Calculate start time based on limit and interval
	now := time.Now()
	var duration time.Duration
	switch interval {
	case "1m":
		duration = time.Duration(limit) * time.Minute
	case "3m":
		duration = time.Duration(limit*3) * time.Minute
	case "5m":
		duration = time.Duration(limit*5) * time.Minute
	case "15m":
		duration = time.Duration(limit*15) * time.Minute
	case "30m":
		duration = time.Duration(limit*30) * time.Minute
	case "1h":
		duration = time.Duration(limit) * time.Hour
	case "4h":
		duration = time.Duration(limit*4) * time.Hour
	case "1d", "1D":
		duration = time.Duration(limit*24) * time.Hour
	default:
		duration = time.Duration(limit*5) * time.Minute
	}
	startTime := now.Add(-duration)

	url := fmt.Sprintf("%s/v2/stocks/%s/bars?timeframe=%s&start=%s&limit=%d",
		alpacaDataBaseURL,
		symbol,
		alpacaInterval,
		startTime.Format(time.RFC3339),
		limit,
	)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	// Add Alpaca auth headers
	req.Header.Set("APCA-API-KEY-ID", c.apiKey)
	req.Header.Set("APCA-API-SECRET-KEY", c.apiSecret)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != 200 {
		log.Printf("Alpaca API error (%d): %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("Alpaca API returned status %d", resp.StatusCode)
	}

	// Parse Alpaca response format
	var alpacaResp struct {
		Bars      []AlpacaBar `json:"bars"`
		Symbol    string      `json:"symbol"`
		NextToken string      `json:"next_page_token"`
	}
	
	err = json.Unmarshal(body, &alpacaResp)
	if err != nil {
		log.Printf("Failed to parse Alpaca response: %s", string(body))
		return nil, err
	}

	// Convert to our Kline format
	var klines []Kline
	for _, bar := range alpacaResp.Bars {
		ts, _ := time.Parse(time.RFC3339, bar.Timestamp)
		kline := Kline{
			OpenTime:   ts.UnixMilli(),
			CloseTime:  ts.Add(getDurationFromInterval(interval)).UnixMilli(),
			Open:       bar.Open,
			High:       bar.High,
			Low:        bar.Low,
			Close:      bar.Close,
			Volume:     float64(bar.Volume),
			QuoteVolume: bar.VWAP * float64(bar.Volume),
			Trades:     bar.TradeCount,
		}
		klines = append(klines, kline)
	}

	return klines, nil
}

func getDurationFromInterval(interval string) time.Duration {
	switch interval {
	case "1m":
		return time.Minute
	case "3m":
		return 3 * time.Minute
	case "5m":
		return 5 * time.Minute
	case "15m":
		return 15 * time.Minute
	case "30m":
		return 30 * time.Minute
	case "1h":
		return time.Hour
	case "4h":
		return 4 * time.Hour
	case "1d", "1D":
		return 24 * time.Hour
	default:
		return 5 * time.Minute
	}
}

func parseKline(kr KlineResponse) (Kline, error) {
	var kline Kline

	if len(kr) < 11 {
		return kline, fmt.Errorf("invalid kline data")
	}

	// Parse each field
	kline.OpenTime = int64(kr[0].(float64))
	kline.Open, _ = strconv.ParseFloat(kr[1].(string), 64)
	kline.High, _ = strconv.ParseFloat(kr[2].(string), 64)
	kline.Low, _ = strconv.ParseFloat(kr[3].(string), 64)
	kline.Close, _ = strconv.ParseFloat(kr[4].(string), 64)
	kline.Volume, _ = strconv.ParseFloat(kr[5].(string), 64)
	kline.CloseTime = int64(kr[6].(float64))
	kline.QuoteVolume, _ = strconv.ParseFloat(kr[7].(string), 64)
	kline.Trades = int(kr[8].(float64))
	kline.TakerBuyBaseVolume, _ = strconv.ParseFloat(kr[9].(string), 64)
	kline.TakerBuyQuoteVolume, _ = strconv.ParseFloat(kr[10].(string), 64)

	return kline, nil
}

func (c *APIClient) GetCurrentPrice(symbol string) (float64, error) {
	// Use Alpaca latest trade endpoint
	url := fmt.Sprintf("%s/v2/stocks/%s/trades/latest", alpacaDataBaseURL, symbol)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return 0, err
	}

	// Add Alpaca auth headers
	req.Header.Set("APCA-API-KEY-ID", c.apiKey)
	req.Header.Set("APCA-API-SECRET-KEY", c.apiSecret)

	resp, err := c.client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, err
	}

	var tradeResp struct {
		Trade struct {
			Price float64 `json:"p"`
		} `json:"trade"`
	}
	err = json.Unmarshal(body, &tradeResp)
	if err != nil {
		return 0, err
	}

	return tradeResp.Trade.Price, nil
}

// AlpacaNews represents a news article from Alpaca API
type AlpacaNews struct {
	ID        int64    `json:"id"`
	Headline  string   `json:"headline"`
	Summary   string   `json:"summary"`
	Author    string   `json:"author"`
	CreatedAt string   `json:"created_at"`
	UpdatedAt string   `json:"updated_at"`
	URL       string   `json:"url"`
	Source    string   `json:"source"`
	Symbols   []string `json:"symbols"`
}

// GetNews retrieves recent news for a symbol from Alpaca News API
func (c *APIClient) GetNews(symbol string, limit int) ([]AlpacaNews, error) {
	if limit <= 0 {
		limit = 10
	}
	
	url := fmt.Sprintf("https://data.alpaca.markets/v1beta1/news?symbols=%s&limit=%d&sort=desc",
		symbol, limit)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("APCA-API-KEY-ID", c.apiKey)
	req.Header.Set("APCA-API-SECRET-KEY", c.apiSecret)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != 200 {
		log.Printf("Alpaca News API error (%d): %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("Alpaca News API returned status %d", resp.StatusCode)
	}

	var newsResp struct {
		News []AlpacaNews `json:"news"`
	}
	err = json.Unmarshal(body, &newsResp)
	if err != nil {
		return nil, err
	}

	return newsResp.News, nil
}

// CorporateAction represents a corporate action from Alpaca API
type CorporateAction struct {
	ID             string  `json:"id"`
	CorporateType  string  `json:"corporate_actions_type"`
	Symbol         string  `json:"symbol"`
	ExDate         string  `json:"ex_date"`
	RecordDate     string  `json:"record_date"`
	PayableDate    string  `json:"payable_date"`
	CashAmount     float64 `json:"cash_amount,omitempty"`
	NewRate        float64 `json:"new_rate,omitempty"`
	OldRate        float64 `json:"old_rate,omitempty"`
	Description    string  `json:"description"`
}

// GetCorporateActions retrieves corporate actions for a symbol from Alpaca API
func (c *APIClient) GetCorporateActions(symbol string) ([]CorporateAction, error) {
	// Get announcements for the past 30 days and upcoming 7 days
	since := time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	until := time.Now().AddDate(0, 0, 7).Format("2006-01-02")
	
	url := fmt.Sprintf("https://paper-api.alpaca.markets/v2/corporate_actions/announcements?symbol=%s&since=%s&until=%s",
		symbol, since, until)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("APCA-API-KEY-ID", c.apiKey)
	req.Header.Set("APCA-API-SECRET-KEY", c.apiSecret)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != 200 {
		// Corporate actions might not be available for all symbols
		log.Printf("Alpaca Corporate Actions API (%d): %s", resp.StatusCode, string(body))
		return nil, nil
	}

	var actions []CorporateAction
	err = json.Unmarshal(body, &actions)
	if err != nil {
		return nil, err
	}

	return actions, nil
}
