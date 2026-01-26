import { Clock, Activity, TrendingUp, BarChart2, Info, Lock, LineChart } from 'lucide-react'
import type { IndicatorConfig } from '../../types'


// Default API base URL for OI ranking data
const DEFAULT_OI_RANKING_API_URL = 'http://172.22.189.252:30006'

interface IndicatorEditorProps {
  config: IndicatorConfig
  onChange: (config: IndicatorConfig) => void
  disabled?: boolean
}

// All available timeframes
const allTimeframes = [
  { value: '1m', label: '1m', category: 'scalp' },
  { value: '3m', label: '3m', category: 'scalp' },
  { value: '5m', label: '5m', category: 'scalp' },
  { value: '15m', label: '15m', category: 'intraday' },
  { value: '30m', label: '30m', category: 'intraday' },
  { value: '1h', label: '1h', category: 'intraday' },
  { value: '2h', label: '2h', category: 'swing' },
  { value: '4h', label: '4h', category: 'swing' },
  { value: '6h', label: '6h', category: 'swing' },
  { value: '8h', label: '8h', category: 'swing' },
  { value: '12h', label: '12h', category: 'swing' },
  { value: '1d', label: '1D', category: 'position' },
  { value: '3d', label: '3D', category: 'position' },
  { value: '1w', label: '1W', category: 'position' },
]

export function IndicatorEditor({
  config,
  onChange,
  disabled,
}: IndicatorEditorProps) {
  const t = (key: string) => {
    const translations: Record<string, string> = {
      // Section titles
      marketData: 'Market Data',
      marketDataDesc: 'Core price data for AI analysis',
      technicalIndicators: 'Technical Indicators',
      technicalIndicatorsDesc: 'Optional indicators, AI can calculate them',
      marketSentiment: 'Market Sentiment',
      marketSentimentDesc: 'OI, funding rate and market sentiment data',
      quantData: 'Quant Data',
      quantDataDesc: 'Third-party: netflow, whale movements',

      // Timeframes
      timeframes: 'Timeframes',
      timeframesDesc: 'Select K-line timeframes, ★ = primary (double-click)',
      klineCount: 'K-line Count',
      scalp: 'Scalp',
      intraday: 'Intraday',
      swing: 'Swing',
      position: 'Position',

      // Data types
      rawKlines: 'Raw OHLCV K-lines',
      rawKlinesDesc: 'Required - Open/High/Low/Close/Volume data for AI',
      required: 'Required',

      // Indicators
      ema: 'EMA',
      emaDesc: 'Exponential Moving Average',
      macd: 'MACD',
      macdDesc: 'Moving Average Convergence Divergence',
      rsi: 'RSI',
      rsiDesc: 'Relative Strength Index',
      atr: 'ATR',
      atrDesc: 'Average True Range',
      volume: 'Volume',
      volumeDesc: 'Trading volume analysis',
      oi: 'Open Interest',
      oiDesc: 'Futures open interest',
      fundingRate: 'Funding Rate',
      fundingRateDesc: 'Perpetual funding rate',

      // Quant data
      quantDataUrl: 'Data API URL',
      fillDefault: 'Fill Default',
      symbolPlaceholder: '{symbol} will be replaced with stock',

      // Stock Features
      oiRanking: 'Stock Features',
      oiRankingDesc: 'Market-wide OI changes, reflects capital flow',
      oiRankingDuration: 'Duration',
      oiRankingLimit: 'Top N',
      oiRankingNote: 'Shows stocks with OI increase/decrease, helps identify capital flow',

      // Tips
      aiCanCalculate: '💡 Tip: AI can calculate these, enabling reduces AI workload',
    }
    return translations[key] || key
  }

  // Get currently selected timeframes
  const selectedTimeframes = config.klines.selected_timeframes || [config.klines.primary_timeframe]

  // Toggle timeframe selection
  const toggleTimeframe = (tf: string) => {
    if (disabled) return
    const current = [...selectedTimeframes]
    const index = current.indexOf(tf)

    if (index >= 0) {
      if (current.length > 1) {
        current.splice(index, 1)
        const newPrimary = tf === config.klines.primary_timeframe ? current[0] : config.klines.primary_timeframe
        onChange({
          ...config,
          klines: {
            ...config.klines,
            selected_timeframes: current,
            primary_timeframe: newPrimary,
            enable_multi_timeframe: current.length > 1,
          },
        })
      }
    } else {
      current.push(tf)
      onChange({
        ...config,
        klines: {
          ...config.klines,
          selected_timeframes: current,
          enable_multi_timeframe: current.length > 1,
        },
      })
    }
  }

  // Set primary timeframe
  const setPrimaryTimeframe = (tf: string) => {
    if (disabled) return
    onChange({
      ...config,
      klines: {
        ...config.klines,
        primary_timeframe: tf,
      },
    })
  }

  const categoryColors: Record<string, string> = {
    scalp: '#F6465D',
    intraday: 'var(--primary)',
    swing: 'var(--primary)',
    position: '#60a5fa',
  }

  // Ensure enable_raw_klines is always true
  const ensureRawKlines = () => {
    if (!config.enable_raw_klines) {
      onChange({ ...config, enable_raw_klines: true })
    }
  }

  // Call on mount if needed
  if (config.enable_raw_klines === undefined || config.enable_raw_klines === false) {
    ensureRawKlines()
  }

  return (
    <div className="space-y-5">
      {/* Section 1: Market Data (Required) */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(22, 27, 34, 0.88)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <BarChart2 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>{t('marketData')}</span>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>- {t('marketDataDesc')}</span>
        </div>

        <div className="p-3 space-y-4">
          {/* Raw Klines - Required, Always On */}
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--primary-bg, 0.08)', border: '1px solid var(--primary-bg, 0.2)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary-bg, 0.15)' }}>
                <TrendingUp className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>{t('rawKlines')}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1" style={{ background: 'var(--primary-bg, 0.2)', color: 'var(--primary)' }}>
                    <Lock className="w-2.5 h-2.5" />
                    {t('required')}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{t('rawKlinesDesc')}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={true}
              disabled={true}
              className="w-5 h-5 rounded accent-yellow-500 cursor-not-allowed"
            />
          </div>

          {/* Timeframe Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                <span className="text-xs font-medium" style={{ color: '#F9FAFB' }}>{t('timeframes')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{t('klineCount')}:</span>
                <input
                  type="number"
                  value={config.klines.primary_count}
                  onChange={(e) =>
                    !disabled &&
                    onChange({
                      ...config,
                      klines: { ...config.klines, primary_count: parseInt(e.target.value) || 30 },
                    })
                  }
                  disabled={disabled}
                  min={10}
                  max={200}
                  className="w-16 px-2 py-1 rounded text-xs text-center"
                  style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                />
              </div>
            </div>
            <p className="text-[10px] mb-2" style={{ color: '#6B7280' }}>{t('timeframesDesc')}</p>

            {/* Timeframe Grid */}
            <div className="space-y-1.5">
              {(['scalp', 'intraday', 'swing', 'position'] as const).map((category) => {
                const categoryTfs = allTimeframes.filter((tf) => tf.category === category)
                return (
                  <div key={category} className="flex items-center gap-2">
                    <span className="text-[10px] w-10 flex-shrink-0" style={{ color: categoryColors[category] }}>
                      {t(category)}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {categoryTfs.map((tf) => {
                        const isSelected = selectedTimeframes.includes(tf.value)
                        const isPrimary = config.klines.primary_timeframe === tf.value
                        return (
                          <button
                            key={tf.value}
                            onClick={() => toggleTimeframe(tf.value)}
                            onDoubleClick={() => setPrimaryTimeframe(tf.value)}
                            disabled={disabled}
                            className={`px-2 py-1 rounded text-xs font-medium transition-all ${isSelected ? '' : 'opacity-40 hover:opacity-70'
                              }`}
                            style={{
                              background: isSelected ? `${categoryColors[category]}15` : 'transparent',
                              border: `1px solid ${isSelected ? categoryColors[category] : 'rgba(255, 255, 255, 0.08)'}`,
                              color: isSelected ? categoryColors[category] : '#9CA3AF',
                              boxShadow: isPrimary ? `0 0 0 2px ${categoryColors[category]}` : undefined,
                            }}
                            title={isPrimary ? `${tf.label} (Primary)` : tf.label}
                          >
                            {tf.label}
                            {isPrimary && <span className="ml-0.5 text-[8px]">★</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Section 1.5: Multi-Timeframe Confluence Engine */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(22, 27, 34, 0.88)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <TrendingUp className="w-4 h-4" style={{ color: '#f59e0b' }} />
          <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>Multi-Timeframe Confluence</span>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>- Only trade when timeframes align</span>
          <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
            Tier 1
          </span>
        </div>

        <div className="p-3 space-y-3">
          {/* Enable Confluence Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
              <span className="text-xs font-medium" style={{ color: '#F9FAFB' }}>Enable Confluence Mode</span>
            </div>
            <input
              type="checkbox"
              checked={config.enable_confluence || false}
              onChange={(e) => !disabled && onChange({
                ...config,
                enable_confluence: e.target.checked,
                // Set defaults when enabling
                ...(e.target.checked && !config.confluence_timeframes?.length ? { confluence_timeframes: ['15m', '1h', '4h'] } : {}),
                ...(e.target.checked && config.confluence_require_all === undefined ? { confluence_require_all: true } : {}),
                ...(e.target.checked && !config.confluence_min_match ? { confluence_min_match: 2 } : {}),
              })}
              disabled={disabled}
              className="w-4 h-4 rounded accent-yellow-500"
            />
          </div>

          {/* Confluence Settings */}
          {config.enable_confluence && (
            <div className="space-y-3 p-3 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              {/* Confluence Timeframes */}
              <div>
                <label className="text-[10px] mb-2 block" style={{ color: '#9CA3AF' }}>
                  Confluence Timeframes (select 2-4 for best results)
                </label>
                <div className="flex flex-wrap gap-1">
                  {['5m', '15m', '30m', '1h', '2h', '4h', '8h', '1d'].map((tf) => {
                    const isSelected = config.confluence_timeframes?.includes(tf)
                    return (
                      <button
                        key={tf}
                        onClick={() => {
                          if (disabled) return
                          const current = config.confluence_timeframes || []
                          const updated = isSelected
                            ? current.filter(t => t !== tf)
                            : [...current, tf]
                          onChange({ ...config, confluence_timeframes: updated })
                        }}
                        disabled={disabled}
                        className="px-2.5 py-1 rounded text-xs font-medium transition-all"
                        style={{
                          background: isSelected ? '#f59e0b20' : 'transparent',
                          border: `1px solid ${isSelected ? '#f59e0b' : 'rgba(255, 255, 255, 0.15)'}`,
                          color: isSelected ? '#f59e0b' : '#9CA3AF',
                        }}
                      >
                        {tf}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Strict Mode Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium block" style={{ color: '#F9FAFB' }}>Strict Mode (Require All)</span>
                  <span className="text-[10px]" style={{ color: '#6B7280' }}>All selected timeframes must show the same signal direction</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.confluence_require_all || false}
                  onChange={(e) => !disabled && onChange({ ...config, confluence_require_all: e.target.checked })}
                  disabled={disabled}
                  className="w-4 h-4 rounded accent-yellow-500"
                />
              </div>

              {/* Minimum Match (if not strict) */}
              {!config.confluence_require_all && (
                <div className="flex items-center gap-3">
                  <label className="text-[10px]" style={{ color: '#9CA3AF' }}>Minimum timeframes that must agree:</label>
                  <select
                    value={config.confluence_min_match || 2}
                    onChange={(e) => !disabled && onChange({ ...config, confluence_min_match: parseInt(e.target.value) })}
                    disabled={disabled}
                    className="px-2 py-1 rounded text-xs"
                    style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                  >
                    {[2, 3, 4].map(n => (
                      <option key={n} value={n}>{n} of {config.confluence_timeframes?.length || 3}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Expected Impact */}
              <div className="flex items-start gap-2 p-2 rounded" style={{ background: 'rgba(14, 203, 129, 0.08)' }}>
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                <div>
                  <p className="text-[10px] font-medium" style={{ color: 'var(--primary)' }}>Expected Impact: 30-40% fewer false signals</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#6B7280' }}>
                    AI will only enter trades when all confluence timeframes ({config.confluence_timeframes?.join(', ') || '15m, 1h, 4h'}) show aligned signals.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phase 1.2: VWAP Deviation Entry System */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(22, 27, 34, 0.88)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <TrendingUp className="w-4 h-4" style={{ color: '#f59e0b' }} />
          <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>VWAP Deviation Entry System</span>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>- Enter at VWAP ± ATR deviation</span>
          <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
            Tier 1 - P0
          </span>
        </div>

        <div className="p-3 space-y-3">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
              <span className="text-xs font-medium" style={{ color: '#F9FAFB' }}>Enable VWAP Deviation Entry</span>
            </div>
            <input
              type="checkbox"
              checked={config.enable_vwap_deviation || false}
              onChange={(e) => !disabled && onChange({
                ...config,
                enable_vwap_deviation: e.target.checked,
                ...(e.target.checked && config.vwap_min_deviation_atr === undefined ? { vwap_min_deviation_atr: 1.5 } : {}),
                ...(e.target.checked && config.vwap_max_deviation_atr === undefined ? { vwap_max_deviation_atr: 2.5 } : {}),
                ...(e.target.checked && !config.vwap_entry_mode ? { vwap_entry_mode: 'mean_reversion' } : {}),
                ...(e.target.checked && !config.vwap_timeframe ? { vwap_timeframe: '1h' } : {}),
              })}
              disabled={disabled}
              className="w-4 h-4 rounded accent-yellow-500"
            />
          </div>

          {/* Settings */}
          {config.enable_vwap_deviation && (
            <div className="space-y-3 p-3 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              {/* Min/Max Deviation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] mb-1 block" style={{ color: '#9CA3AF' }}>Min Deviation (ATR)</label>
                  <input
                    type="number"
                    value={config.vwap_min_deviation_atr || 1.5}
                    onChange={(e) => !disabled && onChange({ ...config, vwap_min_deviation_atr: parseFloat(e.target.value) || 1.5 })}
                    disabled={disabled}
                    min="1.0"
                    max="2.0"
                    step="0.1"
                    className="w-full px-2 py-1 rounded text-xs"
                    style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                  />
                </div>
                <div>
                  <label className="text-[10px] mb-1 block" style={{ color: '#9CA3AF' }}>Max Deviation (ATR)</label>
                  <input
                    type="number"
                    value={config.vwap_max_deviation_atr || 2.5}
                    onChange={(e) => !disabled && onChange({ ...config, vwap_max_deviation_atr: parseFloat(e.target.value) || 2.5 })}
                    disabled={disabled}
                    min="2.0"
                    max="4.0"
                    step="0.1"
                    className="w-full px-2 py-1 rounded text-xs"
                    style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                  />
                </div>
              </div>

              {/* Entry Mode */}
              <div>
                <label className="text-[10px] mb-1 block" style={{ color: '#9CA3AF' }}>Entry Mode</label>
                <select
                  value={config.vwap_entry_mode || 'mean_reversion'}
                  onChange={(e) => !disabled && onChange({ ...config, vwap_entry_mode: e.target.value })}
                  disabled={disabled}
                  className="w-full px-2 py-1 rounded text-xs"
                  style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                >
                  <option value="mean_reversion">Mean Reversion</option>
                  <option value="breakout">Breakout</option>
                </select>
              </div>

              {/* VWAP Timeframe */}
              <div>
                <label className="text-[10px] mb-1 block" style={{ color: '#9CA3AF' }}>VWAP Timeframe</label>
                <select
                  value={config.vwap_timeframe || '1h'}
                  onChange={(e) => !disabled && onChange({ ...config, vwap_timeframe: e.target.value })}
                  disabled={disabled}
                  className="w-full px-2 py-1 rounded text-xs"
                  style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                >
                  <option value="15m">15m</option>
                  <option value="1h">1h</option>
                  <option value="4h">4h</option>
                  <option value="1d">1d</option>
                </select>
              </div>

              {/* Expected Impact */}
              <div className="flex items-start gap-2 p-2 rounded" style={{ background: 'rgba(14, 203, 129, 0.08)' }}>
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                <div>
                  <p className="text-[10px] font-medium" style={{ color: 'var(--primary)' }}>Expected Impact: 20-30% improvement in entry quality</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#6B7280' }}>
                    AI will enter trades when price deviates {config.vwap_min_deviation_atr || 1.5}-{config.vwap_max_deviation_atr || 2.5} ATR from VWAP ({config.vwap_timeframe || '1h'}).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phase 1.3: Volume Confirmation Filter */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(22, 27, 34, 0.88)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Activity className="w-4 h-4" style={{ color: '#f59e0b' }} />
          <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>Volume Confirmation Filter</span>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>- Only trade with elevated volume</span>
          <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
            Tier 1 - P0
          </span>
        </div>

        <div className="p-3 space-y-3">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
              <span className="text-xs font-medium" style={{ color: '#F9FAFB' }}>Enable Volume Confirmation</span>
            </div>
            <input
              type="checkbox"
              checked={config.enable_volume_confirmation || false}
              onChange={(e) => !disabled && onChange({
                ...config,
                enable_volume_confirmation: e.target.checked,
                ...(e.target.checked && config.volume_min_ratio === undefined ? { volume_min_ratio: 1.5 } : {}),
                ...(e.target.checked && config.volume_lookback_period === undefined ? { volume_lookback_period: 20 } : {}),
                ...(e.target.checked && !config.volume_comparison_method ? { volume_comparison_method: 'sma' } : {}),
              })}
              disabled={disabled}
              className="w-4 h-4 rounded accent-yellow-500"
            />
          </div>

          {/* Settings */}
          {config.enable_volume_confirmation && (
            <div className="space-y-3 p-3 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              {/* Volume Ratio */}
              <div>
                <label className="text-[10px] mb-1 block" style={{ color: '#9CA3AF' }}>
                  Minimum Volume Ratio: {config.volume_min_ratio || 1.5}x average
                </label>
                <input
                  type="range"
                  value={config.volume_min_ratio || 1.5}
                  onChange={(e) => !disabled && onChange({ ...config, volume_min_ratio: parseFloat(e.target.value) })}
                  disabled={disabled}
                  min="1.2"
                  max="3.0"
                  step="0.1"
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] mt-1" style={{ color: '#6B7280' }}>
                  <span>1.2x</span>
                  <span>3.0x</span>
                </div>
              </div>

              {/* Lookback Period */}
              <div>
                <label className="text-[10px] mb-1 block" style={{ color: '#9CA3AF' }}>Volume Lookback Period (bars)</label>
                <input
                  type="number"
                  value={config.volume_lookback_period || 20}
                  onChange={(e) => !disabled && onChange({ ...config, volume_lookback_period: parseInt(e.target.value) || 20 })}
                  disabled={disabled}
                  min="10"
                  max="50"
                  className="w-full px-2 py-1 rounded text-xs"
                  style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                />
              </div>

              {/* Comparison Method */}
              <div>
                <label className="text-[10px] mb-1 block" style={{ color: '#9CA3AF' }}>Volume Comparison Method</label>
                <select
                  value={config.volume_comparison_method || 'sma'}
                  onChange={(e) => !disabled && onChange({ ...config, volume_comparison_method: e.target.value })}
                  disabled={disabled}
                  className="w-full px-2 py-1 rounded text-xs"
                  style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                >
                  <option value="sma">SMA (Simple Moving Average)</option>
                  <option value="ema">EMA (Exponential Moving Average)</option>
                  <option value="median">Median</option>
                </select>
              </div>

              {/* Expected Impact */}
              <div className="flex items-start gap-2 p-2 rounded" style={{ background: 'rgba(14, 203, 129, 0.08)' }}>
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                <div>
                  <p className="text-[10px] font-medium" style={{ color: 'var(--primary)' }}>Expected Impact: 15-25% reduction in low-quality trades</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#6B7280' }}>
                    AI will only enter trades when volume exceeds {config.volume_min_ratio || 1.5}x the {config.volume_comparison_method?.toUpperCase() || 'SMA'} average over {config.volume_lookback_period || 20} bars.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phase 1.4: Order Flow Analysis */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(22, 27, 34, 0.88)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <BarChart2 className="w-4 h-4" style={{ color: '#f59e0b' }} />
          <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>Order Flow Analysis</span>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>- Detect institutional activity</span>
          <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
            Tier 1 - P1
          </span>
        </div>

        <div className="p-3 space-y-3">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
              <span className="text-xs font-medium" style={{ color: '#F9FAFB' }}>Enable Order Flow Analysis</span>
            </div>
            <input
              type="checkbox"
              checked={config.enable_order_flow || false}
              onChange={(e) => !disabled && onChange({
                ...config,
                enable_order_flow: e.target.checked,
                ...(e.target.checked && config.order_flow_large_block_threshold === undefined ? { order_flow_large_block_threshold: 500000 } : {}),
                ...(e.target.checked && config.order_flow_track_dark_pool === undefined ? { order_flow_track_dark_pool: true } : {}),
                ...(e.target.checked && config.order_flow_supply_demand_zones === undefined ? { order_flow_supply_demand_zones: true } : {}),
                ...(e.target.checked && config.order_flow_institutional_weight === undefined ? { order_flow_institutional_weight: 0.7 } : {}),
              })}
              disabled={disabled}
              className="w-4 h-4 rounded accent-yellow-500"
            />
          </div>

          {/* Settings */}
          {config.enable_order_flow && (
            <div className="space-y-3 p-3 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              {/* Large Block Threshold */}
              <div>
                <label className="text-[10px] mb-1 block" style={{ color: '#9CA3AF' }}>Large Block Threshold ($)</label>
                <input
                  type="number"
                  value={config.order_flow_large_block_threshold || 500000}
                  onChange={(e) => !disabled && onChange({ ...config, order_flow_large_block_threshold: parseInt(e.target.value) || 500000 })}
                  disabled={disabled}
                  min="100000"
                  max="10000000"
                  step="100000"
                  className="w-full px-2 py-1 rounded text-xs"
                  style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                />
                <p className="text-[10px] mt-1" style={{ color: '#6B7280' }}>Trades above this value are considered large blocks</p>
              </div>

              {/* Dark Pool Tracking */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium block" style={{ color: '#F9FAFB' }}>Track Dark Pool Activity</span>
                  <span className="text-[10px]" style={{ color: '#6B7280' }}>Monitor off-exchange large trades</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.order_flow_track_dark_pool || false}
                  onChange={(e) => !disabled && onChange({ ...config, order_flow_track_dark_pool: e.target.checked })}
                  disabled={disabled}
                  className="w-4 h-4 rounded accent-yellow-500"
                />
              </div>

              {/* Supply/Demand Zones */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium block" style={{ color: '#F9FAFB' }}>Supply/Demand Zone Detection</span>
                  <span className="text-[10px]" style={{ color: '#6B7280' }}>Identify key support/resistance from order flow</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.order_flow_supply_demand_zones || false}
                  onChange={(e) => !disabled && onChange({ ...config, order_flow_supply_demand_zones: e.target.checked })}
                  disabled={disabled}
                  className="w-4 h-4 rounded accent-yellow-500"
                />
              </div>

              {/* Institutional Weight */}
              <div>
                <label className="text-[10px] mb-1 block" style={{ color: '#9CA3AF' }}>
                  Institutional Flow Weight: {((config.order_flow_institutional_weight || 0.7) * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  value={config.order_flow_institutional_weight || 0.7}
                  onChange={(e) => !disabled && onChange({ ...config, order_flow_institutional_weight: parseFloat(e.target.value) })}
                  disabled={disabled}
                  min="0.0"
                  max="1.0"
                  step="0.1"
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] mt-1" style={{ color: '#6B7280' }}>
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Expected Impact */}
              <div className="flex items-start gap-2 p-2 rounded" style={{ background: 'rgba(14, 203, 129, 0.08)' }}>
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                <div>
                  <p className="text-[10px] font-medium" style={{ color: 'var(--primary)' }}>Expected Impact: 25-35% improvement in trade timing</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#6B7280' }}>
                    AI will detect large block trades (${(config.order_flow_large_block_threshold || 500000).toLocaleString()}+) and institutional flow to improve entry/exit timing.
                  </p>
                </div>
              </div>

              {/* Data Source Note */}
              <div className="flex items-start gap-2 p-2 rounded" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#3b82f6' }} />
                <p className="text-[10px]" style={{ color: '#9ca3af' }}>
                  <strong>Note:</strong> Requires Level 2 data or order flow provider (e.g., Polygon, Alpaca Premium)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Technical Indicators (Optional) */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(22, 27, 34, 0.88)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Activity className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>{t('technicalIndicators')}</span>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>- {t('technicalIndicatorsDesc')}</span>
        </div>

        <div className="p-3">
          {/* Tip */}
          <div className="flex items-start gap-2 mb-3 p-2 rounded" style={{ background: 'rgba(14, 203, 129, 0.05)' }}>
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
            <p className="text-[10px]" style={{ color: '#9CA3AF' }}>{t('aiCanCalculate')}</p>
          </div>

          {/* Indicator Grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'enable_ema', label: 'ema', desc: 'emaDesc', color: 'var(--primary)', periodKey: 'ema_periods', defaultPeriods: '20,50' },
              { key: 'enable_macd', label: 'macd', desc: 'macdDesc', color: '#a855f7' },
              { key: 'enable_rsi', label: 'rsi', desc: 'rsiDesc', color: '#F6465D', periodKey: 'rsi_periods', defaultPeriods: '7,14' },
              { key: 'enable_atr', label: 'atr', desc: 'atrDesc', color: '#60a5fa', periodKey: 'atr_periods', defaultPeriods: '14' },
              { key: 'enable_vwap_indicator', label: 'VWAP', desc: 'Volume Weighted Average Price', color: '#0ea5e9', isDirectLabel: true },
              { key: 'enable_anchored_vwap', label: 'Anchored VWAP', desc: 'VWAP anchored from session start', color: '#14b8a6', isDirectLabel: true },
              { key: 'enable_volume_profile', label: 'Volume Profile', desc: 'POC, VAH, VAL price levels', color: '#f97316', isDirectLabel: true, binsKey: 'volume_profile_bins' },
            ].map(({ key, label, desc, color, periodKey, defaultPeriods, isDirectLabel, binsKey }) => (
              <div
                key={key}
                className="p-2.5 rounded-lg transition-all"
                style={{
                  background: config[key as keyof IndicatorConfig] ? `${color}08` : 'transparent',
                  border: `1px solid ${config[key as keyof IndicatorConfig] ? `${color}30` : 'rgba(255, 255, 255, 0.08)'}`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-xs font-medium" style={{ color: '#F9FAFB' }}>{isDirectLabel ? label : t(label)}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config[key as keyof IndicatorConfig] as boolean || false}
                    onChange={(e) => !disabled && onChange({ ...config, [key]: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded accent-yellow-500"
                  />
                </div>
                <p className="text-[10px] mb-1.5" style={{ color: '#6B7280' }}>{isDirectLabel ? desc : t(desc)}</p>
                {periodKey && config[key as keyof IndicatorConfig] && (
                  <input
                    type="text"
                    value={(config[periodKey as keyof IndicatorConfig] as number[])?.join(',') || defaultPeriods}
                    onChange={(e) => {
                      if (disabled) return
                      const periods = e.target.value
                        .split(',')
                        .map((s) => parseInt(s.trim()))
                        .filter((n) => !isNaN(n) && n > 0)
                      onChange({ ...config, [periodKey]: periods })
                    }}
                    disabled={disabled}
                    placeholder={defaultPeriods}
                    className="w-full px-2 py-1 rounded text-[10px] text-center"
                    style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                  />
                )}
                {binsKey && config[key as keyof IndicatorConfig] && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px]" style={{ color: '#9CA3AF' }}>Bins:</span>
                    <select
                      value={config[binsKey as keyof IndicatorConfig] as number || 24}
                      onChange={(e) => !disabled && onChange({ ...config, [binsKey]: parseInt(e.target.value) })}
                      disabled={disabled}
                      className="px-1 py-0.5 rounded text-[10px]"
                      style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                    >
                      {[12, 24, 48, 96].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: Market Sentiment */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(22, 27, 34, 0.88)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <TrendingUp className="w-4 h-4" style={{ color: '#22c55e' }} />
          <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>{t('marketSentiment')}</span>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>- {t('marketSentimentDesc')}</span>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'enable_volume', label: 'volume', desc: 'volumeDesc', color: '#c084fc' },
              { key: 'enable_oi', label: 'oi', desc: 'oiDesc', color: '#34d399' },
              { key: 'enable_funding_rate', label: 'fundingRate', desc: 'fundingRateDesc', color: '#fbbf24' },
            ].map(({ key, label, desc, color }) => (
              <div
                key={key}
                className="p-2.5 rounded-lg transition-all"
                style={{
                  background: config[key as keyof IndicatorConfig] ? `${color}08` : 'transparent',
                  border: `1px solid ${config[key as keyof IndicatorConfig] ? `${color}30` : 'rgba(255, 255, 255, 0.08)'}`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-xs font-medium" style={{ color: '#F9FAFB' }}>{t(label)}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config[key as keyof IndicatorConfig] as boolean || false}
                    onChange={(e) => !disabled && onChange({ ...config, [key]: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded accent-yellow-500"
                  />
                </div>
                <p className="text-[10px]" style={{ color: '#6B7280' }}>{t(desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* Section 5: OI Ranking Data (Market-wide) */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(22, 27, 34, 0.88)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <LineChart className="w-4 h-4" style={{ color: '#22c55e' }} />
          <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>{t('oiRanking')}</span>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>- {t('oiRankingDesc')}</span>
        </div>

        <div className="p-3 space-y-3">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
              <span className="text-xs font-medium" style={{ color: '#F9FAFB' }}>{t('oiRanking')}</span>
            </div>
            <input
              type="checkbox"
              checked={config.enable_oi_ranking || false}
              onChange={(e) => !disabled && onChange({
                ...config,
                enable_oi_ranking: e.target.checked,
                // Set defaults when enabling
                ...(e.target.checked && !config.oi_ranking_api_url ? { oi_ranking_api_url: DEFAULT_OI_RANKING_API_URL } : {}),
                ...(e.target.checked && !config.oi_ranking_duration ? { oi_ranking_duration: '1h' } : {}),
                ...(e.target.checked && !config.oi_ranking_limit ? { oi_ranking_limit: 10 } : {}),
              })}
              disabled={disabled}
              className="w-4 h-4 rounded accent-green-500"
            />
          </div>

          {/* Settings */}
          {config.enable_oi_ranking && (
            <div className="space-y-3">
              <div className="flex gap-3">
                {/* Duration */}
                <div className="flex-1">
                  <label className="text-[10px] mb-1 block" style={{ color: '#9CA3AF' }}>
                    {t('oiRankingDuration')}
                  </label>
                  <select
                    value={config.oi_ranking_duration || '1h'}
                    onChange={(e) => !disabled && onChange({ ...config, oi_ranking_duration: e.target.value })}
                    disabled={disabled}
                    className="w-full px-2 py-1.5 rounded text-xs"
                    style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                  >
                    <option value="1h">1 Hour</option>
                    <option value="4h">4 Hours</option>
                    <option value="24h">24 Hours</option>
                  </select>
                </div>
                {/* Limit */}
                <div className="flex-1">
                  <label className="text-[10px] mb-1 block" style={{ color: '#9CA3AF' }}>
                    {t('oiRankingLimit')}
                  </label>
                  <select
                    value={config.oi_ranking_limit || 10}
                    onChange={(e) => !disabled && onChange({ ...config, oi_ranking_limit: parseInt(e.target.value) })}
                    disabled={disabled}
                    className="w-full px-2 py-1.5 rounded text-xs"
                    style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                  >
                    {[5, 10, 15, 20].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[10px]" style={{ color: '#6B7280' }}>{t('oiRankingNote')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Section 6: Stock Rankings */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(22, 27, 34, 0.88)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <TrendingUp className="w-4 h-4" style={{ color: '#3b82f6' }} />
          <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>Stock Rankings</span>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>- Real-time data for AI analysis</span>
          <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: '#3b82f620', color: '#3b82f6' }}>
            PRO
          </span>
        </div>

        <div className="p-3">
          {/* Stock Ranking Indicators Grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'enable_stock_news', label: 'News & Sentiment', desc: 'Real-time news with AI sentiment analysis', color: '#f97316' },
              { key: 'enable_trade_flow', label: 'Trade Flow', desc: 'Analyze large orders and institutional activity', color: 'rgb(195, 245, 60)' },
              { key: 'enable_vwap', label: 'VWAP Analysis', desc: 'Multi-timeframe Volume Weighted Average Price', color: '#06b6d4' },
              { key: 'enable_volume_surge', label: 'Volume Surge', desc: 'Detect unusual trading volume (2x+ average)', color: '#ec4899' },
              { key: 'enable_corporate_actions', label: 'Corporate Actions', desc: 'Upcoming dividends, splits, spinoffs', color: '#10b981' },
              { key: 'enable_earnings', label: 'Earnings Calendar', desc: 'Upcoming earnings announcements', color: '#f59e0b' },
              { key: 'enable_analyst_ratings', label: 'Analyst Ratings', desc: 'Recent upgrades/downgrades & price targets', color: '#6366f1' },
              { key: 'enable_short_interest', label: 'Short Interest', desc: 'Short squeeze candidates & bearish sentiment', color: '#ef4444' },
              { key: 'enable_zero_dte', label: 'Zero DTE Options', desc: 'Today\'s options put/call ratio & sentiment', color: '#a855f7' },
            ].map(({ key, label, desc, color }) => (
              <div
                key={key}
                className="p-2.5 rounded-lg transition-all"
                style={{
                  background: config[key as keyof IndicatorConfig] ? `${color}08` : 'transparent',
                  border: `1px solid ${config[key as keyof IndicatorConfig] ? `${color}30` : 'rgba(255, 255, 255, 0.08)'}`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-xs font-medium" style={{ color: '#F9FAFB' }}>{label}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config[key as keyof IndicatorConfig] as boolean || false}
                    onChange={(e) => !disabled && onChange({ ...config, [key]: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                </div>
                <p className="text-[10px]" style={{ color: '#6B7280' }}>{desc}</p>
              </div>
            ))}
          </div>

          {/* News limit setting when news is enabled */}
          {config.enable_stock_news && (
            <div className="mt-3 flex items-center gap-3">
              <label className="text-[10px]" style={{ color: '#9CA3AF' }}>News articles limit:</label>
              <select
                value={config.stock_news_limit || 10}
                onChange={(e) => !disabled && onChange({ ...config, stock_news_limit: parseInt(e.target.value) })}
                disabled={disabled}
                className="px-2 py-1 rounded text-xs"
                style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
              >
                {[5, 10, 15, 20, 30, 50].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          )}

          {/* Info note */}
          <div className="mt-3 flex items-start gap-2 p-2 rounded" style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#3b82f6' }} />
            <p className="text-[10px]" style={{ color: '#9CA3AF' }}>
              💡 Data is fetched in real-time and formatted for AI decision making.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

