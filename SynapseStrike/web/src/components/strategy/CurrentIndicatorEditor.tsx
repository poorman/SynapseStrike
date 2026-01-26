/**
 * CurrentIndicatorEditor - Simplified indicator editor for Strategy (Current)
 * Only shows: Market Data, VWAP Deviation Entry, and Technical Indicators
 */
import { Clock, Activity, TrendingUp, BarChart2, Info, Lock } from 'lucide-react'
import type { IndicatorConfig } from '../../types'

interface CurrentIndicatorEditorProps {
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

export function CurrentIndicatorEditor({
    config,
    onChange,
    disabled,
}: CurrentIndicatorEditorProps) {
    const selectedTimeframes = config.klines.selected_timeframes || [config.klines.primary_timeframe]

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
    if (config.enable_raw_klines === undefined || config.enable_raw_klines === false) {
        onChange({ ...config, enable_raw_klines: true })
    }

    return (
        <div className="space-y-5">
            {/* Section 1: Market Data (Required) */}
            <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(22, 27, 34, 0.88)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <BarChart2 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>Market Data</span>
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>- Core price data for AI analysis</span>
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
                                    <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>Raw OHLCV K-lines</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1" style={{ background: 'var(--primary-bg, 0.2)', color: 'var(--primary)' }}>
                                        <Lock className="w-2.5 h-2.5" />
                                        Required
                                    </span>
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Required - Open/High/Low/Close/Volume data for AI</p>
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
                                <span className="text-xs font-medium" style={{ color: '#F9FAFB' }}>Timeframes</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px]" style={{ color: '#9CA3AF' }}>K-line Count:</span>
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
                        <p className="text-[10px] mb-2" style={{ color: '#6B7280' }}>Select K-line timeframes, ★ = primary (double-click)</p>

                        {/* Timeframe Grid */}
                        <div className="space-y-1.5">
                            {(['scalp', 'intraday', 'swing', 'position'] as const).map((category) => {
                                const categoryTfs = allTimeframes.filter((tf) => tf.category === category)
                                const categoryLabels: Record<string, string> = { scalp: 'Scalp', intraday: 'Intraday', swing: 'Swing', position: 'Position' }
                                return (
                                    <div key={category} className="flex items-center gap-2">
                                        <span className="text-[10px] w-10 flex-shrink-0" style={{ color: categoryColors[category] }}>
                                            {categoryLabels[category]}
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

            {/* Section 2: VWAP Deviation Entry System */}
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

            {/* Section 3: Technical Indicators (Optional) */}
            <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(22, 27, 34, 0.88)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <Activity className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>Technical Indicators</span>
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>- Optional indicators, AI can calculate them</span>
                </div>

                <div className="p-3">
                    {/* Tip */}
                    <div className="flex items-start gap-2 mb-3 p-2 rounded" style={{ background: 'rgba(14, 203, 129, 0.05)' }}>
                        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                        <p className="text-[10px]" style={{ color: '#9CA3AF' }}>💡 Tip: AI can calculate these, enabling reduces AI workload</p>
                    </div>

                    {/* Indicator Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { key: 'enable_ema', label: 'EMA', desc: 'Exponential Moving Average', color: 'var(--primary)', periodKey: 'ema_periods', defaultPeriods: '20,50' },
                            { key: 'enable_macd', label: 'MACD', desc: 'Moving Average Convergence Divergence', color: '#a855f7' },
                            { key: 'enable_rsi', label: 'RSI', desc: 'Relative Strength Index', color: '#F6465D', periodKey: 'rsi_periods', defaultPeriods: '7,14' },
                            { key: 'enable_atr', label: 'ATR', desc: 'Average True Range', color: '#60a5fa', periodKey: 'atr_periods', defaultPeriods: '14' },
                            { key: 'enable_vwap_indicator', label: 'VWAP', desc: 'Volume Weighted Average Price', color: '#0ea5e9' },
                            { key: 'enable_anchored_vwap', label: 'Anchored VWAP', desc: 'VWAP anchored from session start', color: '#14b8a6' },
                            { key: 'enable_volume_profile', label: 'Volume Profile', desc: 'POC, VAH, VAL price levels', color: '#f97316', binsKey: 'volume_profile_bins' },
                        ].map(({ key, label, desc, color, periodKey, defaultPeriods, binsKey }) => (
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
                                        className="w-4 h-4 rounded accent-yellow-500"
                                    />
                                </div>
                                <p className="text-[10px] mb-1.5" style={{ color: '#6B7280' }}>{desc}</p>
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
        </div>
    )
}
