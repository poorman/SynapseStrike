/**
 * AlgorithmsEditor - Algorithms section for Strategy (Current)
 * 
 * Displays trading algorithms that can be enabled/disabled via checkboxes.
 * When an algorithm is enabled, it will be used for trading decisions.
 */
import { Info, Zap, TrendingUp } from 'lucide-react'
import type { IndicatorConfig } from '../../types'

interface AlgorithmsEditorProps {
    config: IndicatorConfig
    onChange: (config: IndicatorConfig) => void
    disabled?: boolean
}

export function AlgorithmsEditor({ config, onChange, disabled }: AlgorithmsEditorProps) {
    const algorithms = [
        {
            key: 'enable_vwap_slope_stretch',
            name: 'VWAP + Slope & Stretch',
            description: 'Adaptive VWAP entry at configurable time with dynamic TP from AI100 optimization',
            icon: TrendingUp,
            color: '#0ECB81',
            tier: 'Tier 1',
            details: [
                'Entry: Buy when Price > VWAP with positive slope',
                'Take Profit: Stock-specific % from AI100 optimization API',
                'Stop Loss: Day\'s Open Price (protection)',
                'Time Exit: 3:55 PM ET if neither TP nor SL hit'
            ],
            metrics: [
                { label: 'VWAP', desc: 'Volume Weighted Avg Price (9:30 to Entry Time)' },
                { label: 'VWAP Slope', desc: '(VWAP@Entry - VWAP@9:40) / VWAP@9:40' },
                { label: 'Stretch', desc: '(Price - VWAP) / VWAP < 0.5×OR_Vol' },
                { label: 'Momentum', desc: '(Price@Entry - Open) / Open > 0.25×OR_Vol' }
            ],
            parameters: [
                { key: 'vwap_entry_time', label: 'Entry Time (ET)', type: 'time', defaultValue: '10:00' }
            ]
        },
        {
            key: 'enable_top_movers_scalping',
            name: 'Top Movers Scalping',
            description: 'Intraday VWAP reclaim scalping on Top Movers list delivered at 9:30 AM. Trades VWAP reclaims with volume expansion and news-driven urgency.',
            icon: Zap,
            color: '#F59E0B',
            tier: 'Tier 2',
            details: [
                'Entry: VWAP reclaim + volume spike + news bias confirmation',
                'Hold Time: 10-180 seconds (micro-scalp)',
                'Take Profit: 0.5% quick exit or 3-bar higher close',
                'Stop Loss: Below VWAP or below entry bar low',
                'Time Window: 9:30 AM - 10:15 AM ET only'
            ],
            metrics: [
                { label: 'VWAP Reclaim', desc: 'Price crosses above VWAP after dip' },
                { label: 'Volume Spike', desc: 'Current bar volume > 2× 5-bar avg' },
                { label: 'News Bias', desc: 'Positive catalyst = Long, Negative = Short' },
                { label: 'Spread Filter', desc: 'Bid-ask spread < 0.5% of price' }
            ],
            parameters: [
                { key: 'tms_min_price', label: 'Min Price ($)', type: 'number', defaultValue: '0.50' },
                { key: 'tms_max_spread_pct', label: 'Max Spread (%)', type: 'number', defaultValue: '0.5' },
                { key: 'tms_min_rvol', label: 'Min RVOL', type: 'number', defaultValue: '2.0' },
                { key: 'tms_max_trades_per_ticker', label: 'Max Trades/Ticker', type: 'number', defaultValue: '3' },
                { key: 'tms_consecutive_loss_limit', label: 'Loss Limit', type: 'number', defaultValue: '2' },
                { key: 'tms_trading_end_time', label: 'Stop Trading At (ET)', type: 'time', defaultValue: '10:15' }
            ],
            thesis: `**Why This Works at 9:30-10:15 AM:**
• Maximum volatility and volume occur in first 45 minutes
• Top Movers list captures stocks with strongest directional conviction
• VWAP reclaims indicate institutional accumulation after initial volatility
• News-driven moves have highest continuation probability early in session`,
            riskRules: [
                'Max 3 trades per ticker per day',
                'Stop trading ticker after 2 consecutive losses',
                'Hard shutdown at 10:15 AM ET',
                'Skip if spread > 0.5% or RVOL < 2.0'
            ]
        }
    ]

    return (
        <div className="space-y-3">
            {/* Info banner */}
            <div className="flex items-start gap-2 p-2 rounded" style={{ background: 'rgba(14, 203, 129, 0.08)' }}>
                <Zap className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
                <p className="text-[10px]" style={{ color: '#9CA3AF' }}>
                    Enable algorithms to use them for automated trading decisions. Each algorithm applies specific entry/exit rules.
                </p>
            </div>

            {/* Algorithm list */}
            {algorithms.map((algo) => {
                const isEnabled = config[algo.key as keyof IndicatorConfig] as boolean || false
                const Icon = algo.icon

                return (
                    <div
                        key={algo.key}
                        className="rounded-lg overflow-hidden transition-all"
                        style={{
                            background: isEnabled ? 'rgba(14, 203, 129, 0.05)' : 'var(--bg-secondary)',
                            border: `1px solid ${isEnabled ? 'rgba(14, 203, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`
                        }}
                    >
                        {/* Algorithm header with checkbox */}
                        <div
                            className="px-3 py-2 flex items-center gap-2 cursor-pointer"
                            style={{ background: 'rgba(22, 27, 34, 0.88)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
                            onClick={() => {
                                if (disabled) return
                                const newEnabled = !isEnabled
                                // Set default values when enabling the algorithm
                                if (newEnabled) {
                                    const defaults: Record<string, unknown> = { [algo.key]: true }
                                    algo.parameters.forEach(param => {
                                        if (config[param.key as keyof IndicatorConfig] === undefined) {
                                            // Convert to proper type based on parameter type
                                            if (param.type === 'number') {
                                                defaults[param.key] = parseFloat(param.defaultValue) || 0
                                            } else {
                                                defaults[param.key] = param.defaultValue
                                            }
                                        }
                                    })
                                    onChange({ ...config, ...defaults })
                                } else {
                                    onChange({ ...config, [algo.key]: false })
                                }
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={(e) => {
                                    if (disabled) return
                                    const newEnabled = e.target.checked
                                    if (newEnabled) {
                                        const defaults: Record<string, unknown> = { [algo.key]: true }
                                        algo.parameters.forEach(param => {
                                            if (config[param.key as keyof IndicatorConfig] === undefined) {
                                                if (param.type === 'number') {
                                                    defaults[param.key] = parseFloat(param.defaultValue) || 0
                                                } else {
                                                    defaults[param.key] = param.defaultValue
                                                }
                                            }
                                        })
                                        onChange({ ...config, ...defaults })
                                    } else {
                                        onChange({ ...config, [algo.key]: false })
                                    }
                                }}
                                disabled={disabled}
                                className="w-4 h-4 rounded"
                                style={{ accentColor: algo.color }}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <Icon className="w-4 h-4" style={{ color: algo.color }} />
                            <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>{algo.name}</span>
                            <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: `${algo.color}20`, color: algo.color }}>
                                {algo.tier}
                            </span>
                        </div>

                        {/* Algorithm content (always visible) */}
                        <div className="p-3 space-y-3">
                            <p className="text-xs" style={{ color: '#9CA3AF' }}>{algo.description}</p>

                            {/* Entry conditions */}
                            <div>
                                <span className="text-[10px] font-medium block mb-1" style={{ color: '#F9FAFB' }}>Entry Conditions:</span>
                                <ul className="space-y-1">
                                    {algo.details.map((detail, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-[10px]" style={{ color: 'var(--primary)' }}>•</span>
                                            <span className="text-[10px]" style={{ color: '#6B7280' }}>{detail}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Metrics calculated */}
                            <div>
                                <span className="text-[10px] font-medium block mb-1" style={{ color: '#F9FAFB' }}>Key Metrics:</span>
                                <div className="grid grid-cols-2 gap-1">
                                    {algo.metrics.map((metric, i) => (
                                        <div key={i} className="text-[10px] p-1.5 rounded" style={{ background: 'rgba(14, 203, 129, 0.05)' }}>
                                            <span style={{ color: 'var(--primary)' }}>{metric.label}</span>
                                            <span style={{ color: '#6B7280' }}> = {metric.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Parameters (only show if enabled) */}
                            {isEnabled && (
                                <div className="p-3 rounded-lg" style={{ background: `${algo.color}08`, border: `1px solid ${algo.color}30` }}>
                                    <span className="text-[10px] font-medium block mb-2" style={{ color: '#F9FAFB' }}>Parameters:</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {algo.parameters.map((param) => (
                                            <div key={param.key} className="flex items-center justify-between">
                                                <label className="text-[10px]" style={{ color: '#9CA3AF' }}>{param.label}</label>
                                                <input
                                                    type={param.type === 'time' ? 'time' : param.type === 'number' ? 'number' : 'text'}
                                                    value={(config[param.key as keyof IndicatorConfig] as string | number) ?? param.defaultValue}
                                                    onChange={(e) => {
                                                        if (disabled) return
                                                        let value: string | number = e.target.value
                                                        // Convert to number if this is a numeric field
                                                        if (param.type === 'number') {
                                                            value = parseFloat(e.target.value) || parseFloat(param.defaultValue) || 0
                                                        }
                                                        onChange({ ...config, [param.key]: value || param.defaultValue })
                                                    }}
                                                    disabled={disabled}
                                                    step={param.type === 'number' ? '0.01' : undefined}
                                                    className="w-20 px-2 py-1 rounded text-xs text-center"
                                                    style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Risk Rules (if available) */}
                                    {(algo as any).riskRules && (
                                        <div className="mt-3">
                                            <span className="text-[10px] font-medium block mb-1" style={{ color: '#F9FAFB' }}>Risk & Kill Switch Rules:</span>
                                            <ul className="space-y-0.5">
                                                {((algo as any).riskRules as string[]).map((rule: string, i: number) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <span className="text-[10px]" style={{ color: '#ef4444' }}>⚠</span>
                                                        <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{rule}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Thesis (if available) */}
                                    {(algo as any).thesis && (
                                        <div className="mt-3 p-2 rounded" style={{ background: `${algo.color}10` }}>
                                            <span className="text-[10px] font-medium block mb-1" style={{ color: algo.color }}>Strategy Thesis:</span>
                                            <p className="text-[10px] whitespace-pre-line" style={{ color: '#9CA3AF' }}>
                                                {(algo as any).thesis}
                                            </p>
                                        </div>
                                    )}

                                    {/* Expected impact */}
                                    <div className="flex items-start gap-2 p-2 mt-3 rounded" style={{ background: `${algo.color}15` }}>
                                        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: algo.color }} />
                                        <div>
                                            <p className="text-[10px] font-medium" style={{ color: algo.color }}>Algorithm Active</p>
                                            <p className="text-[10px] mt-0.5" style={{ color: '#6B7280' }}>
                                                This algorithm will be used for entry decisions when all conditions are met.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
