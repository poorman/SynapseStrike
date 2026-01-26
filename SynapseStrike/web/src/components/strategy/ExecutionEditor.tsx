import { Zap, Clock } from 'lucide-react'
import type { ExecutionConfig } from '../../types'

interface ExecutionEditorProps {
    config: ExecutionConfig
    onChange: (config: ExecutionConfig) => void
    disabled?: boolean
}

export function ExecutionEditor({
    config,
    onChange,
    disabled,
}: ExecutionEditorProps) {
    const updateField = <K extends keyof ExecutionConfig>(
        key: K,
        value: ExecutionConfig[K]
    ) => {
        if (!disabled) {
            onChange({ ...config, [key]: value })
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                <h3 className="font-medium" style={{ color: '#F9FAFB' }}>
                    ⚡ Execution & Timing (Phase 2)
                </h3>
            </div>

            <div className="mb-4 p-4 rounded-lg" style={{ background: 'rgba(88, 166, 255, 0.1)', border: '1px solid rgba(88, 166, 255, 0.2)' }}>
                <p className="text-sm" style={{ color: '#58a6ff' }}>
                    <strong>Expected Impact:</strong> Save 0.1-0.3% per trade in slippage (10-30% of typical edge)
                </p>
            </div>

            {/* Smart Limit Orders */}
            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div className="flex items-start gap-3 mb-3">
                    <input
                        type="checkbox"
                        checked={config.enable_limit_orders ?? false}
                        onChange={(e) => updateField('enable_limit_orders', e.target.checked)}
                        disabled={disabled}
                        className="mt-1"
                        style={{ accentColor: 'var(--primary)' }}
                    />
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1" style={{ color: '#F9FAFB' }}>
                            Smart Limit Orders
                        </label>
                        <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>
                            Place limit orders at VWAP ± ATR deviation to reduce slippage. Falls back to market order if not filled within timeout.
                        </p>
                    </div>
                </div>

                {config.enable_limit_orders && (
                    <div className="mt-4 pl-8 space-y-4">
                        {/* ATR Offset Multiplier */}
                        <div>
                            <label className="block text-xs mb-2" style={{ color: '#F9FAFB' }}>
                                ATR Offset Multiplier
                            </label>
                            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
                                Distance from VWAP in ATR units (0.5 = half ATR, 1.0 = one ATR)
                            </p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    value={config.limit_offset_atr_multiplier ?? 0.5}
                                    onChange={(e) => updateField('limit_offset_atr_multiplier', parseFloat(e.target.value))}
                                    disabled={disabled}
                                    min={0.1}
                                    max={2.0}
                                    step={0.1}
                                    className="flex-1 accent-yellow-500"
                                />
                                <span className="w-16 text-center font-mono" style={{ color: 'var(--primary)' }}>
                                    {(config.limit_offset_atr_multiplier ?? 0.5).toFixed(1)}x
                                </span>
                            </div>
                        </div>

                        {/* Timeout */}
                        <div>
                            <label className="block text-xs mb-2" style={{ color: '#F9FAFB' }}>
                                <Clock className="w-3 h-3 inline mr-1" />
                                Timeout (seconds)
                            </label>
                            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
                                How long to wait before switching to market order
                            </p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    value={config.limit_timeout_seconds ?? 5}
                                    onChange={(e) => updateField('limit_timeout_seconds', parseInt(e.target.value))}
                                    disabled={disabled}
                                    min={2}
                                    max={30}
                                    step={1}
                                    className="flex-1 accent-blue-500"
                                />
                                <span className="w-16 text-center font-mono" style={{ color: 'var(--primary)' }}>
                                    {config.limit_timeout_seconds ?? 5}s
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* TWAP for Large Orders */}
            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div className="flex items-start gap-3 mb-3">
                    <input
                        type="checkbox"
                        checked={config.enable_twap ?? false}
                        onChange={(e) => updateField('enable_twap', e.target.checked)}
                        disabled={disabled}
                        className="mt-1"
                        style={{ accentColor: 'var(--primary)' }}
                    />
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1" style={{ color: '#F9FAFB' }}>
                            TWAP for Large Orders
                        </label>
                        <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>
                            Time-Weighted Average Price: Split large orders into smaller slices to minimize market impact
                        </p>
                    </div>
                </div>

                {config.enable_twap && (
                    <div className="mt-4 pl-8 space-y-4">
                        {/* Minimum Size */}
                        <div>
                            <label className="block text-xs mb-2" style={{ color: '#F9FAFB' }}>
                                Minimum Order Size
                            </label>
                            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
                                Only use TWAP for orders larger than this USD value
                            </p>
                            <input
                                type="number"
                                value={config.twap_min_size ?? 50000}
                                onChange={(e) => updateField('twap_min_size', parseFloat(e.target.value) || 50000)}
                                disabled={disabled}
                                min={10000}
                                max={500000}
                                step={10000}
                                className="w-40 px-3 py-2 rounded"
                                style={{
                                    background: 'rgba(22, 27, 34, 0.88)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: '#F9FAFB',
                                }}
                            />
                            <span className="ml-2" style={{ color: '#9CA3AF' }}>USD</span>
                        </div>

                        {/* Duration */}
                        <div>
                            <label className="block text-xs mb-2" style={{ color: '#F9FAFB' }}>
                                Duration (seconds)
                            </label>
                            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
                                Total time to execute the order over
                            </p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    value={config.twap_duration_seconds ?? 60}
                                    onChange={(e) => updateField('twap_duration_seconds', parseInt(e.target.value))}
                                    disabled={disabled}
                                    min={30}
                                    max={300}
                                    step={10}
                                    className="flex-1 accent-purple-500"
                                />
                                <span className="w-16 text-center font-mono" style={{ color: 'var(--primary)' }}>
                                    {config.twap_duration_seconds ?? 60}s
                                </span>
                            </div>
                        </div>

                        {/*Slice Count */}
                        <div>
                            <label className="block text-xs mb-2" style={{ color: '#F9FAFB' }}>
                                Number of Slices
                            </label>
                            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
                                Split the order into this many slices
                            </p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    value={config.twap_slice_count ?? 6}
                                    onChange={(e) => updateField('twap_slice_count', parseInt(e.target.value))}
                                    disabled={disabled}
                                    min={2}
                                    max={20}
                                    step={1}
                                    className="flex-1 accent-green-500"
                                />
                                <span className="w-16 text-center font-mono" style={{ color: 'var(--primary)' }}>
                                    {config.twap_slice_count ?? 6}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Order Type Preference */}
            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <label className="block text-sm font-medium mb-1" style={{ color: '#F9FAFB' }}>
                    Default Order Type
                </label>
                <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>
                    Preferred order type when both limit and market are available
                </p>
                <select
                    value={config.preferred_order_type ?? 'market'}
                    onChange={(e) => updateField('preferred_order_type', e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 rounded"
                    style={{
                        background: 'rgba(22, 27, 34, 0.88)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#F9FAFB',
                    }}
                >
                    <option value="market">Market Order (Immediate execution)</option>
                    <option value="limit">Limit Order (Better price)</option>
                    <option value="smart">Smart (Auto-choose based on conditions)</option>
                </select>
            </div>
        </div>
    )
}
