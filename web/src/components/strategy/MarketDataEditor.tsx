/**
 * MarketDataEditor - Standalone Market Data section for Strategy (Current)
 */
import { Clock, TrendingUp, Lock } from 'lucide-react'
import type { IndicatorConfig } from '../../types'

interface MarketDataEditorProps {
    config: IndicatorConfig
    onChange: (config: IndicatorConfig) => void
    disabled?: boolean
}

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

const categoryColors: Record<string, string> = {
    scalp: '#F6465D',
    intraday: 'var(--primary)',
    swing: 'var(--primary)',
    position: '#60a5fa',
}

export function MarketDataEditor({ config, onChange, disabled }: MarketDataEditorProps) {
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

    // Ensure enable_raw_klines is always true
    if (config.enable_raw_klines === undefined || config.enable_raw_klines === false) {
        onChange({ ...config, enable_raw_klines: true })
    }

    return (
        <div className="space-y-4">
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
                        <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Open/High/Low/Close/Volume data for AI</p>
                    </div>
                </div>
                <input type="checkbox" checked={true} disabled={true} className="w-5 h-5 rounded accent-yellow-500 cursor-not-allowed" />
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
                            onChange={(e) => !disabled && onChange({ ...config, klines: { ...config.klines, primary_count: parseInt(e.target.value) || 30 } })}
                            disabled={disabled}
                            min={10}
                            max={200}
                            className="w-16 px-2 py-1 rounded text-xs text-center"
                            style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                        />
                    </div>
                </div>
                <p className="text-[10px] mb-2" style={{ color: '#6B7280' }}>Select K-line timeframes, ★ = primary (double-click)</p>

                <div className="space-y-1.5">
                    {(['scalp', 'intraday', 'swing', 'position'] as const).map((category) => {
                        const categoryTfs = allTimeframes.filter((tf) => tf.category === category)
                        const labels: Record<string, string> = { scalp: 'Scalp', intraday: 'Intraday', swing: 'Swing', position: 'Position' }
                        return (
                            <div key={category} className="flex items-center gap-2">
                                <span className="text-[10px] w-10 flex-shrink-0" style={{ color: categoryColors[category] }}>{labels[category]}</span>
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
                                                className={`px-2 py-1 rounded text-xs font-medium transition-all ${isSelected ? '' : 'opacity-40 hover:opacity-70'}`}
                                                style={{
                                                    background: isSelected ? `${categoryColors[category]}15` : 'transparent',
                                                    border: `1px solid ${isSelected ? categoryColors[category] : 'rgba(255, 255, 255, 0.08)'}`,
                                                    color: isSelected ? categoryColors[category] : '#9CA3AF',
                                                    boxShadow: isPrimary ? `0 0 0 2px ${categoryColors[category]}` : undefined,
                                                }}
                                            >
                                                {tf.label}{isPrimary && <span className="ml-0.5 text-[8px]">★</span>}
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
    )
}
