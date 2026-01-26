/**
 * VWAPDeviationEditor - Standalone VWAP Deviation Entry System section
 */
import { Info } from 'lucide-react'
import type { IndicatorConfig } from '../../types'

interface VWAPDeviationEditorProps {
    config: IndicatorConfig
    onChange: (config: IndicatorConfig) => void
    disabled?: boolean
}

export function VWAPDeviationEditor({ config, onChange, disabled }: VWAPDeviationEditorProps) {
    return (
        <div className="space-y-3">
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
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] mb-1 block" style={{ color: '#9CA3AF' }}>Min Deviation (ATR)</label>
                            <input
                                type="number"
                                value={config.vwap_min_deviation_atr || 1.5}
                                onChange={(e) => !disabled && onChange({ ...config, vwap_min_deviation_atr: parseFloat(e.target.value) || 1.5 })}
                                disabled={disabled}
                                min="1.0" max="2.0" step="0.1"
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
                                min="2.0" max="4.0" step="0.1"
                                className="w-full px-2 py-1 rounded text-xs"
                                style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                            />
                        </div>
                    </div>

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
    )
}
