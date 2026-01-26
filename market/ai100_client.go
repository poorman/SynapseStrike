package market

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// AI100StockData represents a single stock from the AI100 API
type AI100StockData struct {
	Pair        string  `json:"pair"`
	Score       float64 `json:"score"`
	SellTrigger float64 `json:"sell_trigger"`
}

// AI100Response represents the API response structure
type AI100Response struct {
	Success bool `json:"success"`
	Data    struct {
		Stocks []AI100StockData `json:"stocks"`
		Count  int              `json:"count"`
	} `json:"data"`
}

// AI100Client fetches optimized sell_trigger values from AI100 API
type AI100Client struct {
	apiURL      string
	authKey     string
	cache       map[string]float64
	cacheMu     sync.RWMutex
	cacheExpiry time.Time
	cacheTTL    time.Duration
}

// Global AI100 client instance
var (
	globalAI100Client *AI100Client
	ai100ClientOnce   sync.Once
)

// GetAI100Client returns the global AI100 client instance
func GetAI100Client() *AI100Client {
	ai100ClientOnce.Do(func() {
		globalAI100Client = &AI100Client{
			apiURL:   "http://24.12.59.214:8082/api/ai100/list",
			authKey:  "pluq8P0XTgucCN6kyxey5EPTof36R54lQc3rfgQsoNQ",
			cache:    make(map[string]float64),
			cacheTTL: 5 * time.Minute, // Cache for 5 minutes
		}
	})
	return globalAI100Client
}

// FetchSellTriggers fetches sell_trigger values for all stocks
// Returns a map of symbol -> sell_trigger percentage
func (c *AI100Client) FetchSellTriggers() (map[string]float64, error) {
	c.cacheMu.RLock()
	if time.Now().Before(c.cacheExpiry) && len(c.cache) > 0 {
		result := make(map[string]float64, len(c.cache))
		for k, v := range c.cache {
			result[k] = v
		}
		c.cacheMu.RUnlock()
		return result, nil
	}
	c.cacheMu.RUnlock()

	// Fetch from API
	url := fmt.Sprintf("%s?auth=%s&sort=fin&limit=100", c.apiURL, c.authKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch AI100 data: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("AI100 API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read AI100 response: %w", err)
	}

	var apiResp AI100Response
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to parse AI100 response: %w", err)
	}

	if !apiResp.Success {
		return nil, fmt.Errorf("AI100 API returned success=false")
	}

	// Build result map
	result := make(map[string]float64, len(apiResp.Data.Stocks))
	for _, stock := range apiResp.Data.Stocks {
		result[stock.Pair] = stock.SellTrigger
	}

	// Update cache
	c.cacheMu.Lock()
	c.cache = result
	c.cacheExpiry = time.Now().Add(c.cacheTTL)
	c.cacheMu.Unlock()

	return result, nil
}

// GetSellTrigger returns the sell_trigger for a specific symbol
// Returns default value (5.0%) if symbol not found
func (c *AI100Client) GetSellTrigger(symbol string) float64 {
	triggers, err := c.FetchSellTriggers()
	if err != nil {
		return 5.0 // Default fallback
	}

	if trigger, ok := triggers[symbol]; ok {
		return trigger
	}
	return 5.0 // Default fallback
}
