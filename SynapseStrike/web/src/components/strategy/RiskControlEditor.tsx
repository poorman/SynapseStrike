import { Shield, AlertTriangle } from 'lucide-react'
import type { RiskControlConfig } from '../../types'

interface RiskControlEditorProps {
  config: RiskControlConfig
  onChange: (config: RiskControlConfig) => void
  disabled?: boolean
}

export function RiskControlEditor({
  config,
  onChange,
  disabled,
}: RiskControlEditorProps) {
  const t = (key: string) => {
    const translations: Record<string, string> = {
      positionLimits: 'Position Limits',
      maxPositions: 'Max Positions',
      maxPositionsDesc: 'Maximum stocks held simultaneously',
      maxAmountPerTrade: 'Max Amount per Trade',
      maxAmountPerTradeDesc: 'Maximum $ spent per trade (0 = no limit)',
      tradingMargin: 'Trading Margin (Brokerage)',
      largeCapMargin: 'Large Cap Trading Margin',
      largeCapMarginDesc: 'Brokerage margin for opening positions',
      smallCapMargin: 'Small Cap Trading Margin',
      smallCapMarginDesc: 'Brokerage margin for opening positions',
      positionValueRatio: 'Position Value Ratio (CODE ENFORCED)',
      positionValueRatioDesc: 'Position notional value / equity, enforced by code',
      largeCapPositionValueRatio: 'Large Cap Position Value Ratio',
      largeCapPositionValueRatioDesc: 'Max position value = equity × this ratio (CODE ENFORCED)',
      smallCapPositionValueRatio: 'Small Cap Position Value Ratio',
      smallCapPositionValueRatioDesc: 'Max position value = equity × this ratio (CODE ENFORCED)',
      riskParameters: 'Risk Parameters',
      minRiskReward: 'Min Risk/Reward Ratio',
      minRiskRewardDesc: 'Minimum profit ratio for opening',
      maxMarginUsage: 'Max Margin Usage (CODE ENFORCED)',
      maxMarginUsageDesc: 'Maximum margin utilization, enforced by code',
      entryRequirements: 'Entry Requirements',
      minPositionSize: 'Min Position Size',
      minPositionSizeDesc: 'Minimum notional value in USD',
      minConfidence: 'Min Confidence',
      minConfidenceDesc: 'AI confidence threshold for entry',
    }
    return translations[key] || key
  }

  const updateField = <K extends keyof RiskControlConfig>(
    key: K,
    value: RiskControlConfig[K]
  ) => {
    if (!disabled) {
      onChange({ ...config, [key]: value })
    }
  }

  return (
    <div className="space-y-6">
      {/* End-of-Day Auto-Close */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5" style={{ color: '#F59E0B' }} />
          <h3 className="font-medium" style={{ color: '#F9FAFB' }}>
            End-of-Day Position Close
          </h3>
        </div>

        <div
          className="p-4 rounded-lg"
          style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm" style={{ color: '#F9FAFB' }}>
                Close all positions before market close
              </label>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Auto-sell all open positions at the specified time (ET)
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateField('close_at_eod', !config.close_at_eod)}
              disabled={disabled}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{
                background: config.close_at_eod ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                style={{
                  transform: config.close_at_eod ? 'translateX(1.375rem)' : 'translateX(0.25rem)',
                }}
              />
            </button>
          </div>

          {config.close_at_eod && (
            <div className="flex items-center gap-3 mt-2">
              <label className="text-xs" style={{ color: '#9CA3AF' }}>
                Close at (ET):
              </label>
              <input
                type="time"
                value={config.close_at_eod_time || '15:55'}
                onChange={(e) => updateField('close_at_eod_time', e.target.value)}
                disabled={disabled}
                className="px-2 py-1 rounded text-sm"
                style={{
                  background: 'rgba(22, 27, 34, 0.88)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#F9FAFB',
                }}
              />
              <span className="text-xs" style={{ color: '#6B7280' }}>
                Default: 3:55 PM (5 min before close)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Position Limits */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h3 className="font-medium" style={{ color: '#F9FAFB' }}>
            {t('positionLimits')}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <label className="block text-sm mb-1" style={{ color: '#F9FAFB' }}>
              {t('maxPositions')}
            </label>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
              {t('maxPositionsDesc')}
            </p>
            <input
              type="number"
              value={config.max_positions ?? 3}
              onChange={(e) =>
                updateField('max_positions', parseInt(e.target.value) || 3)
              }
              disabled={disabled}
              min={1}
              max={100}
              className="w-32 px-3 py-2 rounded"
              style={{
                background: 'rgba(22, 27, 34, 0.88)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#F9FAFB',
              }}
            />
          </div>

          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <label className="block text-sm mb-1" style={{ color: '#F9FAFB' }}>
              {t('maxAmountPerTrade')}
            </label>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
              {t('maxAmountPerTradeDesc')}
            </p>
            <div className="flex items-center">
              <span className="mr-2" style={{ color: '#9CA3AF' }}>$</span>
              <input
                type="number"
                value={config.max_position_size_usd ?? 0}
                onChange={(e) =>
                  updateField('max_position_size_usd', parseFloat(e.target.value) || 0)
                }
                disabled={disabled}
                min={0}
                max={1000000}
                step={100}
                placeholder="0"
                className="w-32 px-3 py-2 rounded"
                style={{
                  background: 'rgba(22, 27, 34, 0.88)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#F9FAFB',
                }}
              />
            </div>
          </div>
        </div>

        {/* Trading Margin (Brokerage) */}
        <div className="mb-2">
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--primary)' }}>
            {t('tradingMargin')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <label className="block text-sm mb-1" style={{ color: '#F9FAFB' }}>
              {t('largeCapMargin')}
            </label>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
              {t('largeCapMarginDesc')}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="range"
                value={config.large_cap_max_margin ?? 5}
                onChange={(e) =>
                  updateField('large_cap_max_margin', parseInt(e.target.value))
                }
                disabled={disabled}
                min={1}
                max={20}
                className="flex-1 accent-yellow-500"
              />
              <span
                className="w-12 text-center font-mono"
                style={{ color: 'var(--primary)' }}
              >
                {config.large_cap_max_margin ?? 5}x
              </span>
            </div>
          </div>

          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <label className="block text-sm mb-1" style={{ color: '#F9FAFB' }}>
              {t('smallCapMargin')}
            </label>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
              {t('smallCapMarginDesc')}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="range"
                value={config.small_cap_max_margin ?? 5}
                onChange={(e) =>
                  updateField('small_cap_max_margin', parseInt(e.target.value))
                }
                disabled={disabled}
                min={1}
                max={20}
                className="flex-1 accent-yellow-500"
              />
              <span
                className="w-12 text-center font-mono"
                style={{ color: 'var(--primary)' }}
              >
                {config.small_cap_max_margin ?? 5}x
              </span>
            </div>
          </div>
        </div>

        {/* Position Value Ratio (Risk Control - CODE ENFORCED) */}
        <div className="mb-2">
          <p className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
            {t('positionValueRatio')}
          </p>
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
            {t('positionValueRatioDesc')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--primary)' }}
          >
            <label className="block text-sm mb-1" style={{ color: '#F9FAFB' }}>
              {t('largeCapPositionValueRatio')}
            </label>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
              {t('largeCapPositionValueRatioDesc')}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="range"
                value={config.large_cap_max_position_value_ratio ?? 5}
                onChange={(e) =>
                  updateField('large_cap_max_position_value_ratio', parseFloat(e.target.value))
                }
                disabled={disabled}
                min={0.5}
                max={10}
                step={0.5}
                className="flex-1 accent-green-500"
              />
              <span
                className="w-12 text-center font-mono"
                style={{ color: 'var(--primary)' }}
              >
                {config.large_cap_max_position_value_ratio ?? 5}x
              </span>
            </div>
          </div>

          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--primary)' }}
          >
            <label className="block text-sm mb-1" style={{ color: '#F9FAFB' }}>
              {t('smallCapPositionValueRatio')}
            </label>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
              {t('smallCapPositionValueRatioDesc')}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="range"
                value={config.small_cap_max_position_value_ratio ?? 1}
                onChange={(e) =>
                  updateField('small_cap_max_position_value_ratio', parseFloat(e.target.value))
                }
                disabled={disabled}
                min={0.5}
                max={10}
                step={0.5}
                className="flex-1 accent-green-500"
              />
              <span
                className="w-12 text-center font-mono"
                style={{ color: 'var(--primary)' }}
              >
                {config.small_cap_max_position_value_ratio ?? 1}x
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Parameters */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5" style={{ color: '#F6465D' }} />
          <h3 className="font-medium" style={{ color: '#F9FAFB' }}>
            {t('riskParameters')}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <label className="block text-sm mb-1" style={{ color: '#F9FAFB' }}>
              {t('minRiskReward')}
            </label>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
              {t('minRiskRewardDesc')}
            </p>
            <div className="flex items-center">
              <span style={{ color: '#9CA3AF' }}>1:</span>
              <input
                type="number"
                value={config.min_risk_reward_ratio ?? 3}
                onChange={(e) =>
                  updateField('min_risk_reward_ratio', parseFloat(e.target.value) || 3)
                }
                disabled={disabled}
                min={1}
                max={10}
                step={0.5}
                className="w-20 px-3 py-2 rounded ml-2"
                style={{
                  background: 'rgba(22, 27, 34, 0.88)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#F9FAFB',
                }}
              />
            </div>
          </div>

          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--primary)' }}
          >
            <label className="block text-sm mb-1" style={{ color: '#F9FAFB' }}>
              {t('maxMarginUsage')}
            </label>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
              {t('maxMarginUsageDesc')}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="range"
                value={(config.max_margin_usage ?? 0.9) * 100}
                onChange={(e) =>
                  updateField('max_margin_usage', parseInt(e.target.value) / 100)
                }
                disabled={disabled}
                min={10}
                max={100}
                className="flex-1 accent-green-500"
              />
              <span className="w-12 text-center font-mono" style={{ color: 'var(--primary)' }}>
                {Math.round((config.max_margin_usage ?? 0.9) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Entry Requirements */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h3 className="font-medium" style={{ color: '#F9FAFB' }}>
            {t('entryRequirements')}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <label className="block text-sm mb-1" style={{ color: '#F9FAFB' }}>
              {t('minPositionSize')}
            </label>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
              {t('minPositionSizeDesc')}
            </p>
            <div className="flex items-center">
              <input
                type="number"
                value={config.min_position_size ?? 12}
                onChange={(e) =>
                  updateField('min_position_size', parseFloat(e.target.value) || 12)
                }
                disabled={disabled}
                min={10}
                max={1000}
                className="w-24 px-3 py-2 rounded"
                style={{
                  background: 'rgba(22, 27, 34, 0.88)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#F9FAFB',
                }}
              />
              <span className="ml-2" style={{ color: '#9CA3AF' }}>

              </span>
            </div>
          </div>

          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <label className="block text-sm mb-1" style={{ color: '#F9FAFB' }}>
              {t('minConfidence')}
            </label>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
              {t('minConfidenceDesc')}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="range"
                value={config.min_confidence ?? 75}
                onChange={(e) =>
                  updateField('min_confidence', parseInt(e.target.value))
                }
                disabled={disabled}
                min={50}
                max={100}
                className="flex-1 accent-green-500"
              />
              <span className="w-12 text-center font-mono" style={{ color: 'var(--primary)' }}>
                {config.min_confidence ?? 75}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 1: Advanced Risk Management */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5" style={{ color: '#22c55e' }} />
          <h3 className="font-medium" style={{ color: '#F9FAFB' }}>
            Phase 1: Advanced Risk Management
          </h3>
          <span className="px-2 py-0.5 text-[10px] rounded" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>NEW</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* ATR Stop Loss */}
          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: `1px solid ${config.use_atr_stop_loss ? '#22c55e' : 'rgba(255, 255, 255, 0.08)'}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm" style={{ color: '#F9FAFB' }}>ATR Stop Loss</label>
              <button
                onClick={() => updateField('use_atr_stop_loss', !config.use_atr_stop_loss)}
                disabled={disabled}
                className={`w-10 h-5 rounded-full transition-colors ${config.use_atr_stop_loss ? 'bg-green-500' : 'bg-gray-600'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${config.use_atr_stop_loss ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>Volatility-aware stops</p>
            {config.use_atr_stop_loss && (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#9CA3AF' }}>Multiplier:</span>
                <input
                  type="number"
                  value={config.atr_stop_multiplier ?? 1.5}
                  onChange={(e) => updateField('atr_stop_multiplier', parseFloat(e.target.value) || 1.5)}
                  disabled={disabled}
                  min={0.5}
                  max={5}
                  step={0.1}
                  className="w-16 px-2 py-1 rounded text-xs"
                  style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                />
                <span className="text-xs" style={{ color: '#22c55e' }}>× ATR</span>
              </div>
            )}
          </div>

          {/* Daily Loss Limit */}
          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: `1px solid ${config.use_daily_loss_limit ? '#ef4444' : 'rgba(255, 255, 255, 0.08)'}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm" style={{ color: '#F9FAFB' }}>Daily Loss Limit</label>
              <button
                onClick={() => updateField('use_daily_loss_limit', !config.use_daily_loss_limit)}
                disabled={disabled}
                className={`w-10 h-5 rounded-full transition-colors ${config.use_daily_loss_limit ? 'bg-red-500' : 'bg-gray-600'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${config.use_daily_loss_limit ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>Stop trading after daily limit hit</p>
            {config.use_daily_loss_limit && (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#9CA3AF' }}>Limit:</span>
                <input
                  type="number"
                  value={((config.daily_loss_limit_pct ?? 0.02) * 100).toFixed(1)}
                  onChange={(e) => updateField('daily_loss_limit_pct', parseFloat(e.target.value) / 100 || 0.02)}
                  disabled={disabled}
                  min={0.5}
                  max={10}
                  step={0.5}
                  className="w-16 px-2 py-1 rounded text-xs"
                  style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                />
                <span className="text-xs" style={{ color: '#ef4444' }}>% of equity</span>
              </div>
            )}
          </div>

          {/* Position Sizing */}
          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: `1px solid ${config.use_risk_based_sizing ? '#00d4ff' : 'rgba(255, 255, 255, 0.08)'}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm" style={{ color: '#F9FAFB' }}>Risk-Based Sizing</label>
              <button
                onClick={() => updateField('use_risk_based_sizing', !config.use_risk_based_sizing)}
                disabled={disabled}
                className={`w-10 h-5 rounded-full transition-colors ${config.use_risk_based_sizing ? 'bg-cyan-500' : 'bg-gray-600'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${config.use_risk_based_sizing ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>Size positions by risk %</p>
            {config.use_risk_based_sizing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs w-20" style={{ color: '#9CA3AF' }}>Risk/trade:</span>
                  <input
                    type="number"
                    value={((config.risk_per_trade_pct ?? 0.01) * 100).toFixed(1)}
                    onChange={(e) => updateField('risk_per_trade_pct', parseFloat(e.target.value) / 100 || 0.01)}
                    disabled={disabled}
                    min={0.1}
                    max={5}
                    step={0.1}
                    className="w-14 px-2 py-1 rounded text-xs"
                    style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                  />
                  <span className="text-xs" style={{ color: '#00d4ff' }}>%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs w-20" style={{ color: '#9CA3AF' }}>Max pos:</span>
                  <input
                    type="number"
                    value={((config.max_position_pct ?? 0.10) * 100).toFixed(0)}
                    onChange={(e) => updateField('max_position_pct', parseFloat(e.target.value) / 100 || 0.10)}
                    disabled={disabled}
                    min={1}
                    max={50}
                    step={1}
                    className="w-14 px-2 py-1 rounded text-xs"
                    style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                  />
                  <span className="text-xs" style={{ color: '#00d4ff' }}>% equity</span>
                </div>
              </div>
            )}
          </div>

          {/* Market Hours */}
          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: `1px solid ${config.use_market_hours_filter ? '#fbbf24' : 'rgba(255, 255, 255, 0.08)'}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm" style={{ color: '#F9FAFB' }}>Market Hours Only</label>
              <button
                onClick={() => updateField('use_market_hours_filter', !config.use_market_hours_filter)}
                disabled={disabled}
                className={`w-10 h-5 rounded-full transition-colors ${config.use_market_hours_filter ? 'bg-yellow-500' : 'bg-gray-600'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${config.use_market_hours_filter ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>Trade regular hours only</p>
            {config.use_market_hours_filter && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={config.market_open_time ?? '09:30'}
                  onChange={(e) => updateField('market_open_time', e.target.value)}
                  disabled={disabled}
                  className="w-16 px-2 py-1 rounded text-xs text-center"
                  style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                />
                <span className="text-xs" style={{ color: '#9CA3AF' }}>-</span>
                <input
                  type="text"
                  value={config.market_close_time ?? '16:00'}
                  onChange={(e) => updateField('market_close_time', e.target.value)}
                  disabled={disabled}
                  className="w-16 px-2 py-1 rounded text-xs text-center"
                  style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                />
                <span className="text-xs" style={{ color: '#fbbf24' }}>ET</span>
              </div>
            )}
          </div>

          {/* Trailing Stop */}
          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: `1px solid ${config.use_trailing_stop ? '#a855f7' : 'rgba(255, 255, 255, 0.08)'}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm" style={{ color: '#F9FAFB' }}>Trailing Stop</label>
              <button
                onClick={() => updateField('use_trailing_stop', !config.use_trailing_stop)}
                disabled={disabled}
                className={`w-10 h-5 rounded-full transition-colors ${config.use_trailing_stop ? 'bg-purple-500' : 'bg-gray-600'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${config.use_trailing_stop ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>Lock in profits</p>
            {config.use_trailing_stop && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs w-16" style={{ color: '#9CA3AF' }}>Trail by:</span>
                  <input
                    type="number"
                    value={config.trailing_stop_atr ?? 1.5}
                    onChange={(e) => updateField('trailing_stop_atr', parseFloat(e.target.value) || 1.5)}
                    disabled={disabled}
                    min={0.5}
                    max={5}
                    step={0.1}
                    className="w-14 px-2 py-1 rounded text-xs"
                    style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                  />
                  <span className="text-xs" style={{ color: '#a855f7' }}>ATR</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs w-16" style={{ color: '#9CA3AF' }}>Activate:</span>
                  <input
                    type="number"
                    value={config.trailing_activation_r ?? 1.0}
                    onChange={(e) => updateField('trailing_activation_r', parseFloat(e.target.value) || 1.0)}
                    disabled={disabled}
                    min={0.5}
                    max={5}
                    step={0.5}
                    className="w-14 px-2 py-1 rounded text-xs"
                    style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                  />
                  <span className="text-xs" style={{ color: '#a855f7' }}>R profit</span>
                </div>
              </div>
            )}
          </div>

          {/* Partial Profits */}
          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: `1px solid ${config.use_partial_profits ? '#f97316' : 'rgba(255, 255, 255, 0.08)'}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm" style={{ color: '#F9FAFB' }}>Partial Profits</label>
              <button
                onClick={() => updateField('use_partial_profits', !config.use_partial_profits)}
                disabled={disabled}
                className={`w-10 h-5 rounded-full transition-colors ${config.use_partial_profits ? 'bg-orange-500' : 'bg-gray-600'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${config.use_partial_profits ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>Secure gains + ride trends</p>
            {config.use_partial_profits && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs w-12" style={{ color: '#9CA3AF' }}>Close:</span>
                  <input
                    type="number"
                    value={((config.partial_profit_pct ?? 0.50) * 100).toFixed(0)}
                    onChange={(e) => updateField('partial_profit_pct', parseFloat(e.target.value) / 100 || 0.50)}
                    disabled={disabled}
                    min={10}
                    max={90}
                    step={10}
                    className="w-14 px-2 py-1 rounded text-xs"
                    style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                  />
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>% at</span>
                  <input
                    type="number"
                    value={config.partial_profit_r ?? 2.0}
                    onChange={(e) => updateField('partial_profit_r', parseFloat(e.target.value) || 2.0)}
                    disabled={disabled}
                    min={1}
                    max={5}
                    step={0.5}
                    className="w-10 px-2 py-1 rounded text-xs"
                    style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                  />
                  <span className="text-xs" style={{ color: '#f97316' }}>R</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
