# Glassmorphism 2.0 Trading Platform Blueprint

## Design Philosophy
**Institutional • Modern • Fast • Trustworthy • Professional**

This blueprint defines a Bloomberg/TradingView-grade trading UI using refined Glassmorphism 2.0 principles optimized for real-time market data and professional traders.

---

## 🎨 Color System

### Background Gradient
```css
/* Primary Background - Midnight Charcoal */
--bg-primary: linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%);
--bg-secondary: #161b22;
--bg-tertiary: #21262d;
```

### Glass Panel Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--glass-bg` | `rgba(22, 27, 34, 0.88)` | Primary panels |
| `--glass-bg-elevated` | `rgba(33, 38, 45, 0.92)` | Modals, dropdowns |
| `--glass-bg-subtle` | `rgba(22, 27, 34, 0.75)` | Secondary panels |

### Trading Colors (WCAG AA Compliant)
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--long` | `#22C55E` | `34, 197, 94` | Buy, Profit, Bullish |
| `--long-muted` | `#166534` | `22, 101, 52` | Long backgrounds |
| `--short` | `#EF4444` | `239, 68, 68` | Sell, Loss, Bearish |
| `--short-muted` | `#991B1B` | `153, 27, 27` | Short backgrounds |
| `--alert` | `#F59E0B` | `245, 158, 11` | Warnings, Alerts |
| `--neutral` | `#6B7280` | `107, 114, 128` | Unchanged, Neutral |

### Text Colors
| Token | Value | Contrast | Usage |
|-------|-------|----------|-------|
| `--text-primary` | `#F9FAFB` | 15.8:1 | Prices, headings |
| `--text-secondary` | `#9CA3AF` | 7.2:1 | Labels, metadata |
| `--text-muted` | `#6B7280` | 4.8:1 | Timestamps |

### Border & Accent
```css
--border-glass: rgba(255, 255, 255, 0.08);
--border-glass-hover: rgba(255, 255, 255, 0.15);
--border-accent: rgba(59, 130, 246, 0.5);
--glow-accent: rgba(59, 130, 246, 0.15);
```

---

## 📐 Glass Panel Specifications

### Base Glass Panel
```css
.glass-panel {
  background: rgba(22, 27, 34, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.3),
    0 2px 4px -2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
```

### Tailwind Config Extension
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        glass: {
          bg: 'rgba(22, 27, 34, 0.88)',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        trading: {
          long: '#22C55E',
          short: '#EF4444',
          alert: '#F59E0B',
        }
      },
      backdropBlur: {
        glass: '12px',
      },
      borderRadius: {
        glass: '12px',
      }
    }
  }
}
```

### Tailwind Glass Utility
```html
<!-- Glass Panel Component -->
<div class="bg-[rgba(22,27,34,0.88)] backdrop-blur-[12px] 
            border border-white/[0.08] rounded-xl
            shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]">
</div>
```

---

## 🖼️ Layout Blueprint

### Main Dashboard Grid (1920×1080)
```
┌─────────────────────────────────────────────────────────────────┐
│  TOP NAV BAR (h: 56px, blur, sticky)                           │
│  [Logo] [Markets ▾] [Watchlist ▾] [⚙️] [🔔 3]    [AAPL ▾] [👤] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────┐  ┌────────────────────────┐  │
│  │                              │  │     ORDER BOOK         │  │
│  │      MAIN CHART PANEL        │  │  ┌──────┬──────────┐   │  │
│  │      (60% width)             │  │  │ Bid  │   Ask    │   │  │
│  │                              │  │  │$245.20│ $245.21 │   │  │
│  │  OHLC + Volume + VWAP        │  │  │ 1,200 │   800   │   │  │
│  │                              │  │  └──────┴──────────┘   │  │
│  │  [1m][5m][15m][1H][4H][1D]   │  ├────────────────────────┤  │
│  └──────────────────────────────┘  │   TIME & SALES         │  │
│                                    │  $245.21  +500  14:32  │  │
│  ┌──────────────────────────────┐  │  $245.20  -200  14:32  │  │
│  │   POSITIONS & P/L            │  └────────────────────────┘  │
│  │  Symbol  Qty   P/L   %                                      │
│  │  AAPL   +100  +$420  +1.2%   ┌────────────────────────┐     │
│  │  TSLA   -50   -$180  -0.8%   │   ORDER ENTRY FORM     │     │
│  └──────────────────────────────┘  │  [BUY] [SELL]         │     │
│                                    │  Qty: [100] @ [$245] │     │
│  ┌──────────────────────────────┐  │  [Limit ▾] [Submit]  │     │
│  │   INDICATORS PANEL           │  └────────────────────────┘  │
│  │  VWAP: $244.85  RSI: 62                                     │
│  │  ATR: 2.45   Vol: 1.2M                                       │
│  └──────────────────────────────┘                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints
| Breakpoint | Width | Layout |
|------------|-------|--------|
| Desktop XL | ≥1920px | 4-column, full features |
| Desktop | ≥1440px | 3-column |
| Laptop | ≥1280px | 2-column, collapsible sidebar |
| Tablet | ≥768px | Stacked panels |

---

## 🧩 Component Specifications

### 1. Top Navigation Bar
```css
.nav-bar {
  height: 56px;
  background: rgba(13, 17, 23, 0.95);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  position: sticky;
  top: 0;
  z-index: 50;
}
```

**Structure:**
```html
<nav class="h-14 bg-[rgba(13,17,23,0.95)] backdrop-blur-[16px] 
            border-b border-white/[0.06] sticky top-0 z-50
            flex items-center justify-between px-4">
  <!-- Left: Logo + Navigation -->
  <div class="flex items-center gap-6">
    <img src="logo.svg" class="h-8" />
    <div class="flex gap-4">
      <button class="text-gray-300 hover:text-white text-sm font-medium">Markets</button>
      <button class="text-gray-300 hover:text-white text-sm font-medium">Watchlist</button>
    </div>
  </div>
  
  <!-- Center: Symbol Search -->
  <div class="flex items-center gap-2 bg-white/[0.05] rounded-lg px-3 py-2">
    <SearchIcon class="w-4 h-4 text-gray-500" />
    <input type="text" placeholder="Search symbol..." 
           class="bg-transparent text-white text-sm outline-none w-48" />
  </div>
  
  <!-- Right: Actions -->
  <div class="flex items-center gap-4">
    <button class="relative">
      <BellIcon class="w-5 h-5 text-gray-400" />
      <span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px]">3</span>
    </button>
    <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
      <span class="text-xs font-bold">JD</span>
    </div>
  </div>
</nav>
```

---

### 2. Glass Trading Panel
**Purpose:** Displays current price, key indicators, VWAP

```css
.trading-panel {
  background: rgba(22, 27, 34, 0.88);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
}

.trading-panel:hover {
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1);
}
```

**Structure:**
```html
<div class="glass-panel p-4 space-y-4">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <span class="text-white font-bold text-lg">AAPL</span>
      <span class="text-gray-400 text-sm">Apple Inc.</span>
    </div>
    <span class="text-green-400 text-2xl font-mono font-bold">$245.21</span>
  </div>
  
  <!-- Change -->
  <div class="flex items-center gap-4">
    <span class="text-green-400 text-sm font-medium">+$2.45 (+1.01%)</span>
    <span class="text-gray-500 text-xs">Vol: 42.3M</span>
  </div>
  
  <!-- Indicators Grid -->
  <div class="grid grid-cols-4 gap-3 pt-2 border-t border-white/[0.06]">
    <div class="text-center">
      <div class="text-gray-400 text-[10px] uppercase tracking-wide">VWAP</div>
      <div class="text-white font-mono text-sm">$244.85</div>
    </div>
    <div class="text-center">
      <div class="text-gray-400 text-[10px] uppercase tracking-wide">RSI</div>
      <div class="text-yellow-400 font-mono text-sm">62.4</div>
    </div>
    <div class="text-center">
      <div class="text-gray-400 text-[10px] uppercase tracking-wide">ATR</div>
      <div class="text-white font-mono text-sm">2.45</div>
    </div>
    <div class="text-center">
      <div class="text-gray-400 text-[10px] uppercase tracking-wide">Vol</div>
      <div class="text-white font-mono text-sm">1.2x</div>
    </div>
  </div>
</div>
```

---

### 3. Order Entry Form
**Critical component for trade execution**

```css
.order-form {
  background: rgba(22, 27, 34, 0.92);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.btn-buy {
  background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
}

.btn-sell {
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.input-field {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #F9FAFB;
  font-family: 'SF Mono', 'Roboto Mono', monospace;
}

.input-field:focus {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}
```

**Structure:**
```html
<div class="glass-panel p-4 w-80">
  <!-- Buy/Sell Toggle -->
  <div class="flex rounded-lg overflow-hidden mb-4">
    <button class="flex-1 py-2.5 text-sm font-bold text-white bg-green-600 
                   transition-all duration-150">BUY</button>
    <button class="flex-1 py-2.5 text-sm font-bold text-gray-400 
                   bg-white/[0.05] hover:bg-white/[0.08]">SELL</button>
  </div>
  
  <!-- Order Type -->
  <div class="mb-3">
    <label class="text-gray-400 text-xs uppercase tracking-wide mb-1 block">Order Type</label>
    <select class="w-full input-field px-3 py-2 text-sm">
      <option>Limit</option>
      <option>Market</option>
      <option>Stop Limit</option>
      <option>Trailing Stop</option>
    </select>
  </div>
  
  <!-- Quantity -->
  <div class="mb-3">
    <label class="text-gray-400 text-xs uppercase tracking-wide mb-1 block">Quantity</label>
    <div class="flex gap-2">
      <input type="number" value="100" class="flex-1 input-field px-3 py-2 text-sm text-right" />
      <button class="px-3 py-2 bg-white/[0.05] rounded-lg text-xs text-gray-400">MAX</button>
    </div>
  </div>
  
  <!-- Price -->
  <div class="mb-4">
    <label class="text-gray-400 text-xs uppercase tracking-wide mb-1 block">Limit Price</label>
    <input type="number" value="245.00" step="0.01" 
           class="w-full input-field px-3 py-2 text-sm text-right" />
  </div>
  
  <!-- Risk Controls -->
  <div class="grid grid-cols-2 gap-3 mb-4 p-3 bg-white/[0.03] rounded-lg">
    <div>
      <label class="text-gray-500 text-[10px] uppercase">Stop Loss</label>
      <input type="number" placeholder="$240.00" class="w-full input-field px-2 py-1.5 text-xs mt-1" />
    </div>
    <div>
      <label class="text-gray-500 text-[10px] uppercase">Take Profit</label>
      <input type="number" placeholder="$255.00" class="w-full input-field px-2 py-1.5 text-xs mt-1" />
    </div>
  </div>
  
  <!-- Order Summary -->
  <div class="flex justify-between text-xs mb-4 px-1">
    <span class="text-gray-400">Est. Total</span>
    <span class="text-white font-mono font-medium">$24,500.00</span>
  </div>
  
  <!-- Submit -->
  <button class="w-full py-3 rounded-lg font-bold text-white btn-buy
                 hover:brightness-110 active:scale-[0.98] transition-all duration-150">
    BUY 100 AAPL @ $245.00
  </button>
</div>
```

---

### 4. Market Scanner Table
**Real-time sortable data table**

```css
.scanner-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.scanner-table th {
  background: rgba(255, 255, 255, 0.03);
  padding: 10px 12px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6B7280;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.scanner-table td {
  padding: 12px;
  font-family: 'SF Mono', monospace;
  font-size: 13px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 120ms ease;
}

.scanner-table tr:hover td {
  background: rgba(255, 255, 255, 0.03);
}

/* Flash animation for price updates */
@keyframes flash-green {
  0% { background: rgba(34, 197, 94, 0.3); }
  100% { background: transparent; }
}

@keyframes flash-red {
  0% { background: rgba(239, 68, 68, 0.3); }
  100% { background: transparent; }
}

.price-up { animation: flash-green 400ms ease-out; }
.price-down { animation: flash-red 400ms ease-out; }
```

**Structure:**
```html
<div class="glass-panel overflow-hidden">
  <!-- Table Header -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
    <h3 class="text-white font-medium text-sm">Market Scanner</h3>
    <div class="flex gap-2">
      <button class="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded">Top Gainers</button>
      <button class="px-2 py-1 text-xs bg-white/[0.05] text-gray-400 rounded">Top Losers</button>
      <button class="px-2 py-1 text-xs bg-white/[0.05] text-gray-400 rounded">Volume</button>
    </div>
  </div>
  
  <table class="scanner-table">
    <thead>
      <tr>
        <th>Symbol</th>
        <th class="text-right">Price</th>
        <th class="text-right">Change</th>
        <th class="text-right">Volume</th>
        <th class="text-right">VWAP</th>
        <th class="text-right">RSI</th>
      </tr>
    </thead>
    <tbody>
      <tr class="cursor-pointer">
        <td>
          <div class="flex items-center gap-2">
            <span class="text-white font-medium">AAPL</span>
            <span class="text-gray-500 text-xs">Apple</span>
          </div>
        </td>
        <td class="text-right text-white">$245.21</td>
        <td class="text-right text-green-400">+1.01%</td>
        <td class="text-right text-gray-300">42.3M</td>
        <td class="text-right text-gray-300">$244.85</td>
        <td class="text-right text-yellow-400">62</td>
      </tr>
      <!-- More rows... -->
    </tbody>
  </table>
</div>
```

---

### 5. Floating Modal / Settings Panel
```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.modal-panel {
  background: rgba(22, 27, 34, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  max-width: 480px;
  width: 100%;
}
```

**Structure:**
```html
<!-- Modal Overlay -->
<div class="fixed inset-0 bg-black/60 backdrop-blur-[4px] z-50 
            flex items-center justify-center p-4">
  <!-- Modal Panel -->
  <div class="modal-panel p-6 animate-in fade-in zoom-in-95 duration-200">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-white text-lg font-semibold">Trading Settings</h2>
      <button class="text-gray-400 hover:text-white transition-colors">
        <XIcon class="w-5 h-5" />
      </button>
    </div>
    
    <!-- Content -->
    <div class="space-y-4">
      <!-- Setting Item -->
      <div class="flex items-center justify-between py-3 border-b border-white/[0.06]">
        <div>
          <div class="text-white text-sm">Default Order Type</div>
          <div class="text-gray-500 text-xs">Auto-selected when opening order form</div>
        </div>
        <select class="input-field px-3 py-1.5 text-sm">
          <option>Limit</option>
          <option>Market</option>
        </select>
      </div>
      
      <!-- Toggle -->
      <div class="flex items-center justify-between py-3">
        <div>
          <div class="text-white text-sm">Confirm Orders</div>
          <div class="text-gray-500 text-xs">Show confirmation before submitting</div>
        </div>
        <button class="w-11 h-6 bg-blue-600 rounded-full relative">
          <div class="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow"></div>
        </button>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-white/[0.06]">
      <button class="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
      <button class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500">
        Save Changes
      </button>
    </div>
  </div>
</div>
```

---

### 6. Notification / Alert Panel
```css
.notification-panel {
  position: fixed;
  top: 64px;
  right: 16px;
  width: 360px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
}

.notification-item {
  background: rgba(22, 27, 34, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  margin-bottom: 8px;
}

.notification-item.alert {
  border-left: 3px solid #F59E0B;
}

.notification-item.success {
  border-left: 3px solid #22C55E;
}

.notification-item.error {
  border-left: 3px solid #EF4444;
}
```

**Structure:**
```html
<div class="notification-panel space-y-2">
  <!-- Alert Notification -->
  <div class="notification-item alert p-4 animate-in slide-in-from-right duration-200">
    <div class="flex items-start gap-3">
      <div class="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
        <AlertIcon class="w-4 h-4 text-amber-400" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <span class="text-white text-sm font-medium">Price Alert</span>
          <span class="text-gray-500 text-xs">2m ago</span>
        </div>
        <p class="text-gray-400 text-xs mt-1">AAPL crossed above $245.00</p>
      </div>
      <button class="text-gray-500 hover:text-white">
        <XIcon class="w-4 h-4" />
      </button>
    </div>
  </div>
  
  <!-- Success Notification -->
  <div class="notification-item success p-4">
    <div class="flex items-start gap-3">
      <div class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
        <CheckIcon class="w-4 h-4 text-green-400" />
      </div>
      <div class="flex-1">
        <span class="text-white text-sm font-medium">Order Filled</span>
        <p class="text-gray-400 text-xs mt-1">Bought 100 AAPL @ $245.21</p>
      </div>
    </div>
  </div>
</div>
```

---

## 📊 Chart Specifications

### Chart Container
```css
.chart-panel {
  background: rgba(22, 27, 34, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: hidden;
}

.chart-canvas {
  background: transparent;
}

/* Grid lines */
.chart-grid {
  stroke: rgba(255, 255, 255, 0.04);
  stroke-width: 1;
}

/* VWAP Line */
.vwap-line {
  stroke: #3B82F6;
  stroke-width: 1.5;
  stroke-dasharray: 4 2;
}

/* Volume bars */
.volume-up { fill: rgba(34, 197, 94, 0.4); }
.volume-down { fill: rgba(239, 68, 68, 0.4); }

/* Candlesticks */
.candle-up { fill: #22C55E; stroke: #22C55E; }
.candle-down { fill: #EF4444; stroke: #EF4444; }
```

### Chart Header Toolbar
```html
<div class="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
  <!-- Timeframe Selector -->
  <div class="flex gap-1">
    <button class="px-2 py-1 text-xs rounded bg-blue-600/20 text-blue-400">5m</button>
    <button class="px-2 py-1 text-xs rounded text-gray-400 hover:bg-white/[0.05]">15m</button>
    <button class="px-2 py-1 text-xs rounded text-gray-400 hover:bg-white/[0.05]">1H</button>
    <button class="px-2 py-1 text-xs rounded text-gray-400 hover:bg-white/[0.05]">4H</button>
    <button class="px-2 py-1 text-xs rounded text-gray-400 hover:bg-white/[0.05]">1D</button>
  </div>
  
  <!-- Indicator Toggles -->
  <div class="flex gap-2">
    <button class="flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-600/10 text-blue-400">
      <span class="w-2 h-2 rounded-full bg-blue-500"></span> VWAP
    </button>
    <button class="flex items-center gap-1 px-2 py-1 text-xs rounded text-gray-400">
      <span class="w-2 h-2 rounded-full bg-purple-500"></span> EMA
    </button>
  </div>
  
  <!-- Chart Tools -->
  <div class="flex gap-2 text-gray-400">
    <button class="p-1.5 hover:bg-white/[0.05] rounded"><CrosshairIcon class="w-4 h-4" /></button>
    <button class="p-1.5 hover:bg-white/[0.05] rounded"><RulerIcon class="w-4 h-4" /></button>
    <button class="p-1.5 hover:bg-white/[0.05] rounded"><ExpandIcon class="w-4 h-4" /></button>
  </div>
</div>
```

---

## 🔤 Typography System

### Font Stack
```css
:root {
  --font-sans: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'SF Mono', 'Roboto Mono', 'IBM Plex Mono', monospace;
}
```

### Type Scale
| Role | Size | Weight | Font | Usage |
|------|------|--------|------|-------|
| Price Large | 28px | 700 | Mono | Main ticker price |
| Price | 18px | 600 | Mono | Panel prices |
| Heading | 16px | 600 | Sans | Section titles |
| Body | 14px | 400 | Sans | General text |
| Table Data | 13px | 400 | Mono | Table values |
| Label | 11px | 500 | Sans | Form labels |
| Caption | 10px | 500 | Sans | Metadata, timestamps |

### CSS
```css
.text-price-lg { font-size: 28px; font-weight: 700; font-family: var(--font-mono); }
.text-price { font-size: 18px; font-weight: 600; font-family: var(--font-mono); }
.text-heading { font-size: 16px; font-weight: 600; font-family: var(--font-sans); }
.text-body { font-size: 14px; font-weight: 400; font-family: var(--font-sans); }
.text-table { font-size: 13px; font-weight: 400; font-family: var(--font-mono); }
.text-label { font-size: 11px; font-weight: 500; font-family: var(--font-sans); text-transform: uppercase; letter-spacing: 0.05em; }
.text-caption { font-size: 10px; font-weight: 500; font-family: var(--font-sans); }

/* Tabular numerals for aligned columns */
.tabular-nums { font-variant-numeric: tabular-nums; }
```

---

## ⚡ Micro-Interactions

### Hover States
```css
/* Panel hover - subtle brightening */
.glass-panel {
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.glass-panel:hover {
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(59, 130, 246, 0.08);
}

/* Button hover */
.btn-primary {
  transition: filter 120ms ease, transform 80ms ease;
}

.btn-primary:hover {
  filter: brightness(1.1);
}

.btn-primary:active {
  transform: scale(0.98);
}

/* Table row hover */
.table-row {
  transition: background 120ms ease;
}

.table-row:hover {
  background: rgba(255, 255, 255, 0.03);
}
```

### Active Panel Elevation
```css
.panel-active {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 16px -4px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(59, 130, 246, 0.15);
}
```

### Loading States
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.03) 25%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.03) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
```

### Toast Animation
```css
@keyframes toast-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-enter {
  animation: toast-in 200ms ease-out;
}
```

---

## 🌙 Light Mode Variant (Optional)

```css
:root[data-theme="light"] {
  --bg-primary: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  --glass-bg: rgba(255, 255, 255, 0.85);
  --glass-border: rgba(0, 0, 0, 0.08);
  --text-primary: #111827;
  --text-secondary: #4B5563;
}

/* Light mode glass panel */
.glass-panel[data-theme="light"] {
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.08),
    0 2px 4px -2px rgba(0, 0, 0, 0.05);
}
```

---

## ⚡ Performance Guidelines

### Blur Optimization
```css
/* Apply blur only to specific panels, not entire page */
.glass-panel {
  backdrop-filter: blur(12px);
  will-change: transform; /* GPU acceleration */
}

/* Reduce blur on lower-end devices */
@media (prefers-reduced-motion: reduce) {
  .glass-panel {
    backdrop-filter: blur(4px);
  }
}
```

### Animation Performance
- Use `transform` and `opacity` for animations (GPU-accelerated)
- Limit simultaneous animations to 3-4 elements
- Use `will-change` sparingly for frequently animated elements
- Debounce price update animations (batch < 100ms)

### Real-Time Data
```javascript
// Batch DOM updates for streaming data
const updateQueue = [];
let rafId = null;

function queueUpdate(symbol, price) {
  updateQueue.push({ symbol, price });
  if (!rafId) {
    rafId = requestAnimationFrame(flushUpdates);
  }
}

function flushUpdates() {
  // Batch all pending updates in single DOM write
  updateQueue.forEach(({ symbol, price }) => {
    document.querySelector(`[data-symbol="${symbol}"]`).textContent = price;
  });
  updateQueue.length = 0;
  rafId = null;
}
```

---

## 📁 File Structure Recommendation

```
src/
├── styles/
│   ├── globals.css          # Base styles, CSS variables
│   ├── glass.css             # Glassmorphism utilities
│   ├── trading.css           # Trading-specific styles
│   └── animations.css        # Micro-interactions
├── components/
│   ├── ui/
│   │   ├── GlassPanel.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Modal.tsx
│   ├── trading/
│   │   ├── OrderForm.tsx
│   │   ├── PriceCard.tsx
│   │   ├── PositionsTable.tsx
│   │   └── MarketScanner.tsx
│   ├── chart/
│   │   ├── TradingChart.tsx
│   │   └── ChartToolbar.tsx
│   └── layout/
│       ├── TopNav.tsx
│       ├── Sidebar.tsx
│       └── NotificationPanel.tsx
└── hooks/
    ├── useGlassAnimation.ts
    └── usePriceFlash.ts
```

---

## ✅ Implementation Checklist

- [ ] Set up CSS variables and Tailwind config
- [ ] Build base `GlassPanel` component
- [ ] Implement navigation bar with blur
- [ ] Create order entry form with validation
- [ ] Build market scanner table with sorting
- [ ] Add notification/alert system
- [ ] Integrate chart with glass overlay
- [ ] Add hover/active micro-interactions
- [ ] Test WCAG AA contrast compliance
- [ ] Optimize blur performance
- [ ] Add light mode toggle
- [ ] Test on 4K, 1440p, and laptop displays

---

*Blueprint Version: 1.0 | Last Updated: December 2024*
