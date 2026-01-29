package trader

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"SynapseStrike/logger"
	"strconv"
	"strings"
	"time"
)

// AlpacaTrader implements Trader interface for Alpaca Markets (stocks)
type AlpacaTrader struct {
	apiKey    string
	secretKey string
	baseURL   string // "https://paper-api.alpaca.markets" or "https://api.alpaca.markets"
	dataURL   string // "https://data.alpaca.markets"
	isPaper   bool
}

// NewAlpacaTrader creates a new Alpaca trader
func NewAlpacaTrader(apiKey, secretKey string, isPaper bool) *AlpacaTrader {
	baseURL := "https://api.alpaca.markets"
	if isPaper {
		baseURL = "https://paper-api.alpaca.markets"
	}
	return &AlpacaTrader{
		apiKey:    apiKey,
		secretKey: secretKey,
		baseURL:   baseURL,
		dataURL:   "https://data.alpaca.markets",
		isPaper:   isPaper,
	}
}

// doRequest makes an HTTP request to Alpaca API
func (t *AlpacaTrader) doRequest(method, path string, body interface{}) ([]byte, error) {
	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	url := t.baseURL + path
	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set Alpaca authentication headers
	req.Header.Set("APCA-API-KEY-ID", t.apiKey)
	req.Header.Set("APCA-API-SECRET-KEY", t.secretKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// GetBalance returns account balance information
func (t *AlpacaTrader) GetBalance() (map[string]interface{}, error) {
	resp, err := t.doRequest("GET", "/v2/account", nil)
	if err != nil {
		return nil, err
	}

	var account map[string]interface{}
	if err := json.Unmarshal(resp, &account); err != nil {
		return nil, fmt.Errorf("failed to parse account response: %w", err)
	}

	// Map Alpaca fields to our standard format
	result := make(map[string]interface{})
	
	// Parse equity (total account value)
	if equity, ok := account["equity"].(string); ok {
		if val, err := strconv.ParseFloat(equity, 64); err == nil {
			result["total_equity"] = val
			result["totalWalletBalance"] = val
		}
	}
	
	// Parse buying power (available balance)
	if buyingPower, ok := account["buying_power"].(string); ok {
		if val, err := strconv.ParseFloat(buyingPower, 64); err == nil {
			result["availableBalance"] = val
		}
	}
	
	// Parse cash
	if cash, ok := account["cash"].(string); ok {
		if val, err := strconv.ParseFloat(cash, 64); err == nil {
			result["wallet_balance"] = val
		}
	}

	// Parse unrealized P&L
	result["totalUnrealizedProfit"] = 0.0

	logger.Infof("🏦 [Alpaca] Account balance fetched: equity=%v, buying_power=%v", 
		result["total_equity"], result["availableBalance"])

	return result, nil
}

// GetPositions returns all open positions
func (t *AlpacaTrader) GetPositions() ([]map[string]interface{}, error) {
	resp, err := t.doRequest("GET", "/v2/positions", nil)
	if err != nil {
		return nil, err
	}

	var positions []map[string]interface{}
	if err := json.Unmarshal(resp, &positions); err != nil {
		return nil, fmt.Errorf("failed to parse positions response: %w", err)
	}

	// Convert to our standard format
	result := make([]map[string]interface{}, 0, len(positions))
	for _, pos := range positions {
		symbol := pos["symbol"].(string)
		
		// Parse quantity
		qty := 0.0
		if qtyStr, ok := pos["qty"].(string); ok {
			qty, _ = strconv.ParseFloat(qtyStr, 64)
		}
		
		// Parse entry price
		entryPrice := 0.0
		if avgEntry, ok := pos["avg_entry_price"].(string); ok {
			entryPrice, _ = strconv.ParseFloat(avgEntry, 64)
		}
		
		// Fetch current market price actively
		// Try to get live quote first, fallback to parsed current_price from position data
		currentPrice := 0.0
		marketPrice, err := t.GetMarketPrice(symbol)
		if err != nil {
			// Fallback to current_price from position data if GetMarketPrice fails
			if curPrice, ok := pos["current_price"].(string); ok {
				currentPrice, _ = strconv.ParseFloat(curPrice, 64)
			}
			// If still 0, use entry price as last resort
			if currentPrice == 0.0 {
				logger.Infof("⚠️ [Alpaca] Could not fetch current price for %s, using entry price: %v", symbol, err)
				currentPrice = entryPrice
			}
		} else {
			currentPrice = marketPrice
		}
		
		// Parse unrealized P&L from position data
		unrealizedPnL := 0.0
		if pnl, ok := pos["unrealized_pl"].(string); ok {
			unrealizedPnL, _ = strconv.ParseFloat(pnl, 64)
		}
		
		// If unrealized PnL is 0 but we have current and entry prices, calculate it
		if unrealizedPnL == 0.0 && currentPrice > 0 && entryPrice > 0 {
			// For long positions: (current - entry) * qty
			// For short positions: (entry - current) * qty
			if qty > 0 {
				unrealizedPnL = (currentPrice - entryPrice) * qty
			}
		}
		
		// Determine side
		side := "long"
		if qty < 0 {
			side = "short"
			qty = -qty
		}

		result = append(result, map[string]interface{}{
			"symbol":           symbol,
			"side":             side,
			"positionAmt":      qty,
			"entryPrice":       entryPrice,
			"markPrice":        currentPrice,
			"unRealizedProfit": unrealizedPnL,
			"liquidationPrice": 0.0, // Stocks don't have liquidation
			"leverage":         1.0, // No leverage for stocks (or margin account)
		})
	}

	logger.Infof("🏦 [Alpaca] Found %d open positions with current prices", len(result))
	return result, nil
}

// PlaceLimitOrder places a limit order at specified price (Phase 2: Smart Order Execution)
func (t *AlpacaTrader) PlaceLimitOrder(symbol, side string, quantity float64, limitPrice float64) (map[string]interface{}, error) {
	order := map[string]interface{}{
		"symbol":        symbol,
		"qty":           strconv.FormatFloat(quantity, 'f', -1, 64),
		"side":          side, // "buy" or "sell"
		"type":          "limit",
		"time_in_force": "day",
		"limit_price":   strconv.FormatFloat(limitPrice, 'f', 2, 64),
	}

	resp, err := t.doRequest("POST", "/v2/orders", order)
	if err != nil {
		return nil, fmt.Errorf("failed to place limit order: %w", err)
	}

	var result map[string]interface{}
	json.Unmarshal(resp, &result)

	logger.Infof("📊 [Alpaca] Placed limit order: %s %s at $%.2f, qty=%.2f", side, symbol, limitPrice, quantity)
	return result, nil
}

// WaitForFill waits for order to be filled or timeout (Phase 2: Smart Order Execution)
func (t *AlpacaTrader) WaitForFill(orderID string, timeoutSeconds int) (bool, error) {
	startTime := time.Now()
	timeout := time.Duration(timeoutSeconds) * time.Second
	
	for time.Since(startTime) < timeout {
		resp, err := t.doRequest("GET", "/v2/orders/"+orderID, nil)
		if err != nil {
			return false, fmt.Errorf("failed to check order status: %w", err)
		}

		var order map[string]interface{}
		json.Unmarshal(resp, &order)

		status, _ := order["status"].(string)
		
		if status == "filled" {
			logger.Infof("✓ [Alpaca] Order %s filled", orderID)
			return true, nil
		} else if status == "canceled" || status == "rejected" {
			logger.Infof("❌ [Alpaca] Order %s %s", orderID, status)
			return false, nil
		}

		// Check every 500ms
		time.Sleep(500 * time.Millisecond)
	}

	logger.Infof("⏱️ [Alpaca] Order %s timeout after %ds", orderID, timeoutSeconds)
	return false, nil
}

// CancelOrder cancels an order by ID (Phase 2: Smart Order Execution)
func (t *AlpacaTrader) CancelOrder(orderID string) error {
	_, err := t.doRequest("DELETE", "/v2/orders/"+orderID, nil)
	if err != nil {
		return fmt.Errorf("failed to cancel order: %w", err)
	}

	logger.Infof("🚫 [Alpaca] Canceled order %s", orderID)
	return nil
}

// OpenLong opens a long position (buy)
func (t *AlpacaTrader) OpenLong(symbol string, quantity float64, leverage int) (map[string]interface{}, error) {
	// Get current market price for margin validation
	marketPrice, err := t.GetMarketPrice(symbol)
	if err != nil {
		logger.Infof("⚠️ [Alpaca] Could not get market price for %s, proceeding without margin check: %v", symbol, err)
	} else {
		// Calculate required buying power (100% for long positions)
		positionValue := quantity * marketPrice
		requiredBuyingPower := positionValue * 1.05 // Add 5% buffer for slippage
		
		// Get current account balance to check buying power
		balance, err := t.GetBalance()
		if err != nil {
			logger.Infof("⚠️ [Alpaca] Could not get balance for margin check: %v", err)
		} else {
			availableBuyingPower := 0.0
			if bp, ok := balance["availableBalance"].(float64); ok {
				availableBuyingPower = bp
			}
			
			if requiredBuyingPower > availableBuyingPower {
				return nil, fmt.Errorf("insufficient buying power: need $%.2f but only have $%.2f available (position value: $%.2f for %.2f shares of %s at $%.2f)",
					requiredBuyingPower, availableBuyingPower, positionValue, quantity, symbol, marketPrice)
			}
			
			logger.Infof("✓ [Alpaca] Margin check passed for %s LONG: need $%.2f, have $%.2f", 
				symbol, requiredBuyingPower, availableBuyingPower)
		}
	}

	// For stocks, we just buy shares
	order := map[string]interface{}{
		"symbol":        symbol,
		"qty":           strconv.FormatFloat(quantity, 'f', -1, 64),
		"side":          "buy",
		"type":          "market",
		"time_in_force": "day",
	}

	resp, err := t.doRequest("POST", "/v2/orders", order)
	if err != nil {
		return nil, fmt.Errorf("failed to open long position: %w", err)
	}

	var result map[string]interface{}
	json.Unmarshal(resp, &result)

	logger.Infof("📈 [Alpaca] Opened long position: %s, qty=%v", symbol, quantity)
	return result, nil
}

// OpenShort opens a short position (sell short)
func (t *AlpacaTrader) OpenShort(symbol string, quantity float64, leverage int) (map[string]interface{}, error) {
	// IMPORTANT: Alpaca does NOT allow fractional shares for short selling
	// We must round to whole shares
	wholeQty := math.Floor(quantity)
	if wholeQty < 1 {
		return nil, fmt.Errorf("cannot short less than 1 share (requested: %.4f shares)", quantity)
	}

	// Get current market price for margin validation
	// SHORT SELLING REQUIRES 150% MARGIN (Reg T requirement)
	marketPrice, err := t.GetMarketPrice(symbol)
	if err != nil {
		logger.Infof("⚠️ [Alpaca] Could not get market price for %s, proceeding without margin check: %v", symbol, err)
	} else {
		// Calculate required buying power (150% for short positions per Reg T)
		positionValue := wholeQty * marketPrice
		shortMarginMultiplier := 1.50 // Reg T requires 150% for short selling
		requiredBuyingPower := positionValue * shortMarginMultiplier * 1.05 // Add 5% buffer
		
		// Get current account balance to check buying power
		balance, err := t.GetBalance()
		if err != nil {
			logger.Infof("⚠️ [Alpaca] Could not get balance for margin check: %v", err)
		} else {
			availableBuyingPower := 0.0
			if bp, ok := balance["availableBalance"].(float64); ok {
				availableBuyingPower = bp
			}
			
			if requiredBuyingPower > availableBuyingPower {
				// Calculate maximum shares we can short with available buying power
				maxPositionValue := availableBuyingPower / (shortMarginMultiplier * 1.05)
				maxShares := math.Floor(maxPositionValue / marketPrice)
				
				if maxShares < 1 {
					return nil, fmt.Errorf("insufficient buying power to short %s: need $%.2f but only have $%.2f available (position value: $%.2f for %.0f shares at $%.2f). Cannot afford even 1 share (min required: $%.2f)",
						symbol, requiredBuyingPower, availableBuyingPower, positionValue, wholeQty, marketPrice, marketPrice*shortMarginMultiplier*1.05)
				}
				
				// Auto-adjust to maximum affordable quantity
				logger.Infof("⚠️ [Alpaca] Reducing short position from %.0f to %.0f shares due to margin limit (need $%.2f, have $%.2f)", 
					wholeQty, maxShares, requiredBuyingPower, availableBuyingPower)
				wholeQty = maxShares
				positionValue = wholeQty * marketPrice
				requiredBuyingPower = positionValue * shortMarginMultiplier * 1.05
			}
			
			logger.Infof("✓ [Alpaca] Margin check passed for %s SHORT: position=$%.2f, required=$%.2f (150%%), available=$%.2f", 
				symbol, positionValue, requiredBuyingPower, availableBuyingPower)
		}
	}
	
	// Short selling on Alpaca
	order := map[string]interface{}{
		"symbol":        symbol,
		"qty":           strconv.FormatFloat(wholeQty, 'f', 0, 64),
		"side":          "sell",
		"type":          "market",
		"time_in_force": "day",
	}

	logger.Infof("📉 [Alpaca] Opening short position: %s, qty=%.0f (original: %.4f)", symbol, wholeQty, quantity)

	resp, err := t.doRequest("POST", "/v2/orders", order)
	if err != nil {
		return nil, fmt.Errorf("failed to open short position: %w", err)
	}

	var result map[string]interface{}
	json.Unmarshal(resp, &result)

	logger.Infof("📉 [Alpaca] Opened short position: %s, qty=%.0f", symbol, wholeQty)
	return result, nil
}

// CloseLong closes a long position (sell)
func (t *AlpacaTrader) CloseLong(symbol string, quantity float64) (map[string]interface{}, error) {
	// If quantity is 0, close entire position
	if quantity == 0 {
		resp, err := t.doRequest("DELETE", "/v2/positions/"+symbol, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to close position: %w", err)
		}
		var result map[string]interface{}
		json.Unmarshal(resp, &result)
		logger.Infof("📈 [Alpaca] Closed entire long position: %s", symbol)
		return result, nil
	}

	// Sell specific quantity
	order := map[string]interface{}{
		"symbol":        symbol,
		"qty":           strconv.FormatFloat(quantity, 'f', -1, 64),
		"side":          "sell",
		"type":          "market",
		"time_in_force": "day",
	}

	resp, err := t.doRequest("POST", "/v2/orders", order)
	if err != nil {
		return nil, fmt.Errorf("failed to close long position: %w", err)
	}

	var result map[string]interface{}
	json.Unmarshal(resp, &result)
	logger.Infof("📈 [Alpaca] Closed long position: %s, qty=%v", symbol, quantity)
	return result, nil
}

// CloseShort closes a short position (buy to cover)
func (t *AlpacaTrader) CloseShort(symbol string, quantity float64) (map[string]interface{}, error) {
	// If quantity is 0, close entire position
	if quantity == 0 {
		resp, err := t.doRequest("DELETE", "/v2/positions/"+symbol, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to close position: %w", err)
		}
		var result map[string]interface{}
		json.Unmarshal(resp, &result)
		logger.Infof("📉 [Alpaca] Closed entire short position: %s", symbol)
		return result, nil
	}

	// Buy to cover
	order := map[string]interface{}{
		"symbol":        symbol,
		"qty":           strconv.FormatFloat(quantity, 'f', -1, 64),
		"side":          "buy",
		"type":          "market",
		"time_in_force": "day",
	}

	resp, err := t.doRequest("POST", "/v2/orders", order)
	if err != nil {
		return nil, fmt.Errorf("failed to close short position: %w", err)
	}

	var result map[string]interface{}
	json.Unmarshal(resp, &result)
	logger.Infof("📉 [Alpaca] Closed short position: %s, qty=%v", symbol, quantity)
	return result, nil
}

// SetLeverage - not applicable for stocks (margin is account-level)
func (t *AlpacaTrader) SetLeverage(symbol string, leverage int) error {
	logger.Infof("⚠️ [Alpaca] SetLeverage not applicable for stocks (leverage=%d ignored)", leverage)
	return nil
}

// SetMarginMode - not applicable for stocks
func (t *AlpacaTrader) SetMarginMode(symbol string, isCrossMargin bool) error {
	logger.Infof("⚠️ [Alpaca] SetMarginMode not applicable for stocks")
	return nil
}

// GetMarketPrice returns current market price for a symbol
func (t *AlpacaTrader) GetMarketPrice(symbol string) (float64, error) {
	// Use the latest trade endpoint
	url := fmt.Sprintf("%s/v2/stocks/%s/trades/latest", t.dataURL, symbol)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return 0, err
	}
	
	req.Header.Set("APCA-API-KEY-ID", t.apiKey)
	req.Header.Set("APCA-API-SECRET-KEY", t.secretKey)
	
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	
	body, _ := io.ReadAll(resp.Body)
	
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return 0, err
	}
	
	if trade, ok := result["trade"].(map[string]interface{}); ok {
		if price, ok := trade["p"].(float64); ok {
			return price, nil
		}
	}
	
	return 0, fmt.Errorf("failed to get market price for %s", symbol)
}

// SetStopLoss sets a stop-loss order
func (t *AlpacaTrader) SetStopLoss(symbol string, positionSide string, quantity, stopPrice float64) error {
	order := map[string]interface{}{
		"symbol":        symbol,
		"qty":           strconv.FormatFloat(quantity, 'f', -1, 64),
		"side":          "sell", // Sell to close long
		"type":          "stop",
		"stop_price":    strconv.FormatFloat(stopPrice, 'f', 2, 64),
		"time_in_force": "gtc",
	}
	
	if positionSide == "short" {
		order["side"] = "buy" // Buy to cover short
	}

	_, err := t.doRequest("POST", "/v2/orders", order)
	if err != nil {
		return fmt.Errorf("failed to set stop loss: %w", err)
	}
	
	logger.Infof("🛑 [Alpaca] Stop loss set for %s at $%.2f", symbol, stopPrice)
	return nil
}

// SetTakeProfit sets a take-profit order
func (t *AlpacaTrader) SetTakeProfit(symbol string, positionSide string, quantity, takeProfitPrice float64) error {
	order := map[string]interface{}{
		"symbol":        symbol,
		"qty":           strconv.FormatFloat(quantity, 'f', -1, 64),
		"side":          "sell", // Sell to close long
		"type":          "limit",
		"limit_price":   strconv.FormatFloat(takeProfitPrice, 'f', 2, 64),
		"time_in_force": "gtc",
	}
	
	if positionSide == "short" {
		order["side"] = "buy" // Buy to cover short
	}

	_, err := t.doRequest("POST", "/v2/orders", order)
	if err != nil {
		return fmt.Errorf("failed to set take profit: %w", err)
	}
	
	logger.Infof("🎯 [Alpaca] Take profit set for %s at $%.2f", symbol, takeProfitPrice)
	return nil
}

// CancelStopLossOrders cancels stop loss orders
func (t *AlpacaTrader) CancelStopLossOrders(symbol string) error {
	return t.cancelOrdersByType(symbol, "stop")
}

// CancelTakeProfitOrders cancels take profit orders
func (t *AlpacaTrader) CancelTakeProfitOrders(symbol string) error {
	return t.cancelOrdersByType(symbol, "limit")
}

// CancelAllOrders cancels all orders for a symbol
func (t *AlpacaTrader) CancelAllOrders(symbol string) error {
	_, err := t.doRequest("DELETE", "/v2/orders?symbols="+symbol, nil)
	return err
}

// CancelStopOrders cancels stop orders
func (t *AlpacaTrader) CancelStopOrders(symbol string) error {
	return t.CancelAllOrders(symbol)
}

// cancelOrdersByType cancels orders of a specific type
func (t *AlpacaTrader) cancelOrdersByType(symbol string, orderType string) error {
	// Get all open orders
	resp, err := t.doRequest("GET", "/v2/orders?status=open&symbols="+symbol, nil)
	if err != nil {
		return err
	}
	
	var orders []map[string]interface{}
	json.Unmarshal(resp, &orders)
	
	for _, order := range orders {
		if order["type"] == orderType {
			orderId := order["id"].(string)
			_, err := t.doRequest("DELETE", "/v2/orders/"+orderId, nil)
			if err != nil {
				logger.Infof("⚠️ [Alpaca] Failed to cancel order %s: %v", orderId, err)
			}
		}
	}
	
	return nil
}

// FormatQuantity formats quantity (stocks use whole shares typically)
func (t *AlpacaTrader) FormatQuantity(symbol string, quantity float64) (string, error) {
	// Alpaca supports fractional shares
	return strconv.FormatFloat(quantity, 'f', 6, 64), nil
}

// GetOrderStatus gets the status of an order
func (t *AlpacaTrader) GetOrderStatus(symbol string, orderID string) (map[string]interface{}, error) {
	resp, err := t.doRequest("GET", "/v2/orders/"+orderID, nil)
	if err != nil {
		return nil, err
	}
	
	var order map[string]interface{}
	json.Unmarshal(resp, &order)
	
	result := map[string]interface{}{
		"status":      strings.ToUpper(order["status"].(string)),
		"avgPrice":    0.0,
		"executedQty": 0.0,
		"commission":  0.0,
	}
	
	if filled, ok := order["filled_avg_price"].(string); ok && filled != "" {
		result["avgPrice"], _ = strconv.ParseFloat(filled, 64)
	}
	if qty, ok := order["filled_qty"].(string); ok && qty != "" {
		result["executedQty"], _ = strconv.ParseFloat(qty, 64)
	}
	
	return result, nil
}

// GetClosedPnL returns closed position records
func (t *AlpacaTrader) GetClosedPnL(startTime time.Time, limit int) ([]ClosedPnLRecord, error) {
	// Alpaca uses activities endpoint for closed trades
	path := fmt.Sprintf("/v2/account/activities/FILL?after=%s&direction=desc&page_size=%d",
		startTime.Format(time.RFC3339), limit)
	
	resp, err := t.doRequest("GET", path, nil)
	if err != nil {
		return nil, err
	}
	
	var activities []map[string]interface{}
	json.Unmarshal(resp, &activities)
	
	records := make([]ClosedPnLRecord, 0)
	// Note: Full PnL calculation would require matching buys with sells
	// This is a simplified version
	
	return records, nil
}

// Helper function - not used but kept for compatibility  
func generateHMAC(secret, message string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(message))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}
