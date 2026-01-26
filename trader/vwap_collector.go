package trader

import (
	"sync"
	"time"
)

// VWAPBar represents a single 1-minute bar for VWAP calculation
type VWAPBar struct {
	Time     time.Time
	Open     float64
	High     float64
	Low      float64
	Close    float64
	Volume   float64
	TypPrice float64 // Typical Price = (High + Low + Close) / 3
}

// VWAPCollector collects 1-minute bars and calculates VWAP for entry signals
type VWAPCollector struct {
	mu        sync.RWMutex
	bars      []VWAPBar
	entryTime string    // e.g., "10:00" in ET
	triggered bool      // True if entry was already triggered today
	lastReset time.Time // Last time bars were reset (for daily reset)
	openPrice float64   // Day's open price (9:30 AM)
}

// NewVWAPCollector creates a new VWAP collector
func NewVWAPCollector(entryTime string) *VWAPCollector {
	if entryTime == "" {
		entryTime = "10:00"
	}
	return &VWAPCollector{
		entryTime: entryTime,
		bars:      make([]VWAPBar, 0, 60), // Pre-allocate for ~30 minutes of bars
	}
}

// AddBar adds a new 1-minute bar to the collection
func (c *VWAPCollector) AddBar(bar VWAPBar) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Calculate typical price if not set
	if bar.TypPrice == 0 {
		bar.TypPrice = (bar.High + bar.Low + bar.Close) / 3
	}

	// Store first bar's open as day's open
	if len(c.bars) == 0 {
		c.openPrice = bar.Open
	}

	c.bars = append(c.bars, bar)
}

// CalculateVWAP computes the Volume Weighted Average Price
// VWAP = Σ(Typical Price × Volume) / Σ(Volume)
func (c *VWAPCollector) CalculateVWAP() float64 {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if len(c.bars) == 0 {
		return 0
	}

	var sumTPV float64 // Sum of (Typical Price × Volume)
	var sumVol float64 // Sum of Volume

	for _, bar := range c.bars {
		sumTPV += bar.TypPrice * bar.Volume
		sumVol += bar.Volume
	}

	if sumVol == 0 {
		return 0
	}

	return sumTPV / sumVol
}

// CalculateSlope computes VWAP slope: (VWAP_entry - VWAP_9:40) / VWAP_9:40
// Returns slope as a percentage (positive = trending up)
func (c *VWAPCollector) CalculateSlope() float64 {
	c.mu.RLock()
	defer c.mu.RUnlock()

	// Need at least 10 minutes of data (9:30 to 9:40)
	if len(c.bars) < 10 {
		return 0
	}

	// Calculate VWAP at 9:40 (first 10 bars)
	var sumTPV940, sumVol940 float64
	for i := 0; i < 10 && i < len(c.bars); i++ {
		sumTPV940 += c.bars[i].TypPrice * c.bars[i].Volume
		sumVol940 += c.bars[i].Volume
	}

	if sumVol940 == 0 {
		return 0
	}
	vwap940 := sumTPV940 / sumVol940

	// Calculate current VWAP (all bars)
	vwapNow := c.CalculateVWAP()

	if vwap940 == 0 {
		return 0
	}

	// Return slope as percentage
	return (vwapNow - vwap940) / vwap940 * 100
}

// CalculateORVolatility computes Opening Range Volatility
// OR_Vol = max(OR_High - VWAP, VWAP - OR_Low) / VWAP
func (c *VWAPCollector) CalculateORVolatility() float64 {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if len(c.bars) == 0 {
		return 0
	}

	// Find OR high and low from all bars
	orHigh := c.bars[0].High
	orLow := c.bars[0].Low
	for _, bar := range c.bars {
		if bar.High > orHigh {
			orHigh = bar.High
		}
		if bar.Low < orLow {
			orLow = bar.Low
		}
	}

	vwap := c.CalculateVWAP()
	if vwap == 0 {
		return 0
	}

	upDev := orHigh - vwap
	downDev := vwap - orLow

	maxDev := upDev
	if downDev > maxDev {
		maxDev = downDev
	}

	return maxDev / vwap
}

// CalculateStretch computes price stretch from VWAP
// Stretch = (CurrentPrice - VWAP) / VWAP
func (c *VWAPCollector) CalculateStretch(currentPrice float64) float64 {
	vwap := c.CalculateVWAP()
	if vwap == 0 {
		return 0
	}
	return (currentPrice - vwap) / vwap
}

// CalculateMomentum computes momentum from day's open
// Momentum = (CurrentPrice - Open) / Open
func (c *VWAPCollector) CalculateMomentum(currentPrice float64) float64 {
	c.mu.RLock()
	openPrice := c.openPrice
	c.mu.RUnlock()

	if openPrice == 0 {
		return 0
	}
	return (currentPrice - openPrice) / openPrice
}

// CheckEntryConditions checks all 4 entry conditions
// Returns (passed, reason string)
func (c *VWAPCollector) CheckEntryConditions(currentPrice float64) (bool, string) {
	vwap := c.CalculateVWAP()
	slope := c.CalculateSlope()
	orVol := c.CalculateORVolatility()
	stretch := c.CalculateStretch(currentPrice)
	momentum := c.CalculateMomentum(currentPrice)

	// Condition 1: Price > VWAP
	if currentPrice <= vwap {
		return false, "Price not above VWAP"
	}

	// Condition 2: Slope > 0
	if slope <= 0 {
		return false, "VWAP slope not positive"
	}

	// Condition 3: Stretch < 0.5 × OR_Volatility
	if stretch >= 0.5*orVol {
		return false, "Price overextended from VWAP"
	}

	// Condition 4: Momentum > 0.25 × OR_Volatility
	if momentum <= 0.25*orVol {
		return false, "Insufficient momentum"
	}

	return true, "All entry conditions passed"
}

// GetOpenPrice returns the day's open price
func (c *VWAPCollector) GetOpenPrice() float64 {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.openPrice
}

// GetBarCount returns the number of collected bars
func (c *VWAPCollector) GetBarCount() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.bars)
}

// SetTriggered marks that entry was triggered today
func (c *VWAPCollector) SetTriggered(triggered bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.triggered = triggered
}

// IsTriggered returns whether entry was already triggered today
func (c *VWAPCollector) IsTriggered() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.triggered
}

// Reset clears all collected bars (for daily reset)
func (c *VWAPCollector) Reset() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.bars = make([]VWAPBar, 0, 60)
	c.triggered = false
	c.openPrice = 0
	c.lastReset = time.Now()
}

// GetEntryTime returns the configured entry time
func (c *VWAPCollector) GetEntryTime() string {
	return c.entryTime
}

// SetEntryTime updates the entry time
func (c *VWAPCollector) SetEntryTime(entryTime string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entryTime = entryTime
}
