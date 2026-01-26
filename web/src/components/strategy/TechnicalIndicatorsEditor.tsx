/**
 * TechnicalIndicatorsEditor - Standalone Technical Indicators section
 */
import { Info } from 'lucide-react'
import type { IndicatorConfig } from '../../types'

interface TechnicalIndicatorsEditorProps {
    config: IndicatorConfig
    onChange: (config: IndicatorConfig) => void
    disabled?: boolean
}

export function TechnicalIndicatorsEditor({ config, onChange, disabled }: TechnicalIndicatorsEditorProps) {
    const indicators = [
        { key: 'enable_ema', label: 'EMA', desc: 'Exponential Moving Average', color: 'var(--primary)', periodKey: 'ema_periods', defaultPeriods: '20,50' },
        { key: 'enable_macd', label: 'MACD', desc: 'Moving Average Convergence Divergence', color: '#a855f7' },
        { key: 'enable_rsi', label: 'RSI', desc: 'Relative Strength Index', color: '#F6465D', periodKey: 'rsi_periods', defaultPeriods: '7,14' },
        { key: 'enable_atr', label: 'ATR', desc: 'Average True Range', color: '#60a5fa', periodKey: 'atr_periods', defaultPeriods: '14' },
        { key: 'enable_vwap_indicator', label: 'VWAP', desc: 'Volume Weighted Average Price', color: '#0ea5e9' },
        { key: 'enable_anchored_vwap', label: 'Anchored VWAP', desc: 'VWAP anchored from session start', color: '#14b8a6' },
        { key: 'enable_volume_profile', label: 'Volume Profile', desc: 'POC, VAH, VAL price levels', color: '#f97316', binsKey: 'volume_profile_bins' },
    ]

    return (
        <div>
            <div className="flex items-start gap-2 mb-3 p-2 rounded" style={{ background: 'rgba(14, 203, 129, 0.05)' }}>
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                <p className="text-[10px]" style={{ color: '#9CA3AF' }}>💡 Tip: AI can calculate these, enabling reduces AI workload</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {indicators.map(({ key, label, desc, color, periodKey, defaultPeriods, binsKey }) => (
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
                                    const periods = e.target.value.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n) && n > 0)
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
    )
}
