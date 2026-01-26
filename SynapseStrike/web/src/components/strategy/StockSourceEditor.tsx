import { useState } from 'react'
import { Plus, X, Database, TrendingUp, List, Link, AlertCircle } from 'lucide-react'
import type { StockSourceConfig } from '../../types'

// Default API URLs for data sources
const DEFAULT_AI100_API_URL = 'http://24.12.59.214:8082/api/ai100/list?auth=pluq8P0XTgucCN6kyxey5EPTof36R54lQc3rfgQsoNQ&sort=fin&limit=100'
const DEFAULT_OI_TOP_API_URL = 'http://172.22.189.252:30006/api/oi/top-ranking?limit=20&duration=1h&auth=cm_568c67eae410d912c54c'
const DEFAULT_TOP_WINNERS_API_URL = 'https://invest-soft.com/api/winners/list?sort=des&limit=100&auth=pluq8P0XTgucCN6kyxey5EPTof36R54lQc3rfgQsoNQ'
const DEFAULT_TOP_LOSERS_API_URL = 'https://invest-soft.com/api/losers/list?sort=des&limit=100&auth=pluq8P0XTgucCN6kyxey5EPTof36R54lQc3rfgQsoNQ'

interface StockSourceEditorProps {
  config: StockSourceConfig
  onChange: (config: StockSourceConfig) => void
  disabled?: boolean
  showTopMovers?: boolean  // Only show Top Winners/Losers when true (for Current strategy only)
}

export function StockSourceEditor({
  config: rawConfig,
  onChange,
  disabled,
  showTopMovers = false,
}: StockSourceEditorProps) {
  // Ensure config has source_type with default value
  const config = {
    ...rawConfig,
    source_type: rawConfig?.source_type || 'static',
  }
  const [newStock, setNewStock] = useState('')

  const t = (key: string) => {
    const translations: Record<string, string> = {
      sourceType: 'Source Type',
      static: 'Static List',
      ai100: 'AI 100 Stocks',
      oi_top: 'OI Top',
      mixed: 'Mixed Mode',
      staticStocks: 'Custom Stocks',
      addStock: 'Add Stock',
      useAI100: 'Enable AI 100 Stocks',
      ai100Limit: 'AI100 Limit',
      ai100ApiUrl: 'AI 100 API URL',
      ai100ApiUrlPlaceholder: 'Enter AI 100 Stocks API URL...',
      ai100ApiNote: 'API must return JSON: { "success": true, "data": { "stocks": [{ "pair": "SYMBOL", "score": 0.0 }] } }',
      useOITop: 'Enable OI Top',
      oiTopLimit: 'OI Top Limit',
      oiTopApiUrl: 'OI Top API URL',
      oiTopApiUrlPlaceholder: 'Enter OI Top API URL...',
      staticDesc: 'Manually specify stocks',
      ai100Desc: 'AI-100 stock picks',
      oiTopDesc: 'Fastest OI growth',
      top_winners: 'Top Winners',
      useTopWinners: 'Enable Top Winners',
      topWinnersLimit: 'Top Winners Limit',
      topWinnersApiUrl: 'Top Winners API URL',
      topWinnersApiUrlPlaceholder: 'Enter Top Winners API URL...',
      topWinnersApiNote: 'API: { "success": true, "data": { "stocks": [{ "pair": "SYMBOL", "change": 0.0 }] } }',
      topWinnersDesc: 'Top gainers',
      top_losers: 'Top Losers',
      useTopLosers: 'Enable Top Losers',
      topLosersLimit: 'Top Losers Limit',
      topLosersApiUrl: 'Top Losers API URL',
      topLosersApiUrlPlaceholder: 'Enter Top Losers API URL...',
      topLosersApiNote: 'API: { "success": true, "data": { "stocks": [{ "pair": "SYMBOL", "change": 0.0 }] } }',
      topLosersDesc: 'Top decliners',
      mixedDesc: 'Combine sources',
      apiUrlRequired: 'API URL required',
      dataSourceConfig: 'Data Source Configuration',
      fillDefault: 'Fill Default',
    }
    return translations[key] || key
  }

  const allSourceTypes = [
    { value: 'static', icon: List, color: '#9CA3AF' },
    { value: 'ai100', icon: Database, color: '#10b981' },
    { value: 'oi_top', icon: TrendingUp, color: 'var(--primary)' },
    { value: 'top_winners', icon: TrendingUp, color: '#22c55e' },
    { value: 'top_losers', icon: TrendingUp, color: '#ef4444' },
    { value: 'mixed', icon: Database, color: '#60a5fa' },
  ] as const

  // Filter out top_winners and top_losers if showTopMovers is false
  const sourceTypes = showTopMovers
    ? allSourceTypes
    : allSourceTypes.filter(s => s.value !== 'top_winners' && s.value !== 'top_losers')

  const handleAddStock = () => {
    if (!newStock.trim()) return
    // Split by comma, space, or both - handle multiple stocks at once
    const symbols = newStock
      .split(/[,\s]+/)
      .map(s => s.toUpperCase().trim())
      .filter(s => s.length > 0)

    const currentStocks = config.static_stocks || []
    const newStocks = symbols.filter(sym => !currentStocks.includes(sym))

    if (newStocks.length > 0) {
      onChange({
        ...config,
        static_stocks: [...currentStocks, ...newStocks],
      })
    }
    setNewStock('')
  }

  const handleRemoveStock = (stock: string) => {
    onChange({
      ...config,
      static_stocks: (config.static_stocks || []).filter((c) => c !== stock),
    })
  }

  return (
    <div className="space-y-6">
      {/* Source Type Selector */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: '#F9FAFB' }}>
          {t('sourceType')}
        </label>
        <div className="grid grid-cols-6 gap-2">
          {sourceTypes.map(({ value, icon: Icon, color }) => (
            <button
              key={value}
              onClick={() =>
                !disabled &&
                onChange({ ...config, source_type: value as StockSourceConfig['source_type'] })
              }
              disabled={disabled}
              className={`p-2 rounded-lg border transition-all ${config.source_type === value
                ? 'ring-2 ring-yellow-500'
                : 'hover:bg-[var(--bg-secondary)]/5'
                }`}
              style={{
                background:
                  config.source_type === value
                    ? 'var(--primary-bg, 0.1)'
                    : 'var(--glass-bg)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
              }}
            >
              <Icon className="w-6 h-6 mx-auto mb-2" style={{ color }} />
              <div className="text-sm font-medium" style={{ color: '#F9FAFB' }}>
                {t(value)}
              </div>
              <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                {t(`${value}Desc`)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Static Stocks */}
      {(config.source_type === 'static' || config.source_type === 'mixed') && (
        <div>
          <label className="block text-sm font-medium mb-3" style={{ color: '#F9FAFB' }}>
            {t('staticStocks')}
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {(config.static_stocks || []).map((stock) => (
              <span
                key={stock}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm"
                style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
              >
                {stock}
                {!disabled && (
                  <button
                    onClick={() => handleRemoveStock(stock)}
                    className="ml-1 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
          {!disabled && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStock()}
                placeholder="AAPL, MSFT, GOOGL..."
                className="flex-1 px-4 py-2 rounded-lg"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#F9FAFB',
                }}
              />
              <button
                onClick={handleAddStock}
                className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                style={{ background: 'var(--primary)', color: 'var(--text-primary)' }}
              >
                <Plus className="w-4 h-4" />
                {t('addStock')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI 100 Stocks Options */}
      {(config.source_type === 'ai100' || config.source_type === 'mixed') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Link className="w-4 h-4" style={{ color: '#10b981' }} />
            <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>
              {t('dataSourceConfig')} - AI 100 Stocks
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-3 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.use_ai100}
                  onChange={(e) =>
                    !disabled && onChange({ ...config, use_ai100: e.target.checked })
                  }
                  disabled={disabled}
                  className="w-5 h-5 rounded accent-emerald-500"
                />
                <span style={{ color: '#F9FAFB' }}>{t('useAI100')}</span>
              </label>
              {config.use_ai100 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>
                    {t('ai100Limit')}:
                  </span>
                  <input
                    type="number"
                    value={config.ai100_limit || 10}
                    onChange={(e) =>
                      !disabled &&
                      onChange({ ...config, ai100_limit: parseInt(e.target.value) || 10 })
                    }
                    disabled={disabled}
                    min={1}
                    max={100}
                    className="w-20 px-3 py-1.5 rounded"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#F9FAFB',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {config.use_ai100 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm" style={{ color: '#9CA3AF' }}>
                  {t('ai100ApiUrl')}
                </label>
                {!disabled && !config.ai100_api_url && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...config, ai100_api_url: DEFAULT_AI100_API_URL })}
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: '#10b98120', color: '#10b981' }}
                  >
                    {t('fillDefault')}
                  </button>
                )}
              </div>
              <input
                type="url"
                value={config.ai100_api_url || ''}
                onChange={(e) =>
                  !disabled && onChange({ ...config, ai100_api_url: e.target.value })
                }
                disabled={disabled}
                placeholder={t('ai100ApiUrlPlaceholder')}
                className="w-full px-4 py-2.5 rounded-lg font-mono text-sm"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#F9FAFB',
                }}
              />
              {!config.ai100_api_url && (
                <div className="flex items-center gap-2 mt-2">
                  <AlertCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                  <span className="text-xs" style={{ color: '#10b981' }}>
                    {t('apiUrlRequired')}
                  </span>
                </div>
              )}
              <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span className="text-xs" style={{ color: '#10b981' }}>
                  📋 <strong>API Structure:</strong> {t('ai100ApiNote')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* OI Top Options */}
      {(config.source_type === 'oi_top' || config.source_type === 'mixed') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Link className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>
              {t('dataSourceConfig')} - OI Top
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-3 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.use_oi_top}
                  onChange={(e) =>
                    !disabled && onChange({ ...config, use_oi_top: e.target.checked })
                  }
                  disabled={disabled}
                  className="w-5 h-5 rounded accent-yellow-500"
                />
                <span style={{ color: '#F9FAFB' }}>{t('useOITop')}</span>
              </label>
              {config.use_oi_top && (
                <div className="flex items-center gap-3">
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>
                    {t('oiTopLimit')}:
                  </span>
                  <input
                    type="number"
                    value={config.oi_top_limit || 20}
                    onChange={(e) =>
                      !disabled &&
                      onChange({ ...config, oi_top_limit: parseInt(e.target.value) || 20 })
                    }
                    disabled={disabled}
                    min={1}
                    max={50}
                    className="w-20 px-3 py-1.5 rounded"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#F9FAFB',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {config.use_oi_top && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm" style={{ color: '#9CA3AF' }}>
                  {t('oiTopApiUrl')}
                </label>
                {!disabled && !config.oi_top_api_url && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...config, oi_top_api_url: DEFAULT_OI_TOP_API_URL })}
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: 'var(--primary)20', color: 'var(--primary)' }}
                  >
                    {t('fillDefault')}
                  </button>
                )}
              </div>
              <input
                type="url"
                value={config.oi_top_api_url || ''}
                onChange={(e) =>
                  !disabled && onChange({ ...config, oi_top_api_url: e.target.value })
                }
                disabled={disabled}
                placeholder={t('oiTopApiUrlPlaceholder')}
                className="w-full px-4 py-2.5 rounded-lg font-mono text-sm"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#F9FAFB',
                }}
              />
              {!config.oi_top_api_url && (
                <div className="flex items-center gap-2 mt-2">
                  <AlertCircle className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                  <span className="text-xs" style={{ color: 'var(--primary)' }}>
                    {t('apiUrlRequired')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Top Winners Options */}
      {(config.source_type === 'top_winners' || config.source_type === 'mixed') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Link className="w-4 h-4" style={{ color: '#22c55e' }} />
            <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>
              {t('dataSourceConfig')} - Top Winners
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-3 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.use_movers_top}
                  onChange={(e) =>
                    !disabled && onChange({ ...config, use_movers_top: e.target.checked })
                  }
                  disabled={disabled}
                  className="w-5 h-5 rounded accent-green-500"
                />
                <span style={{ color: '#F9FAFB' }}>{t('useTopWinners')}</span>
              </label>
              {config.use_movers_top && (
                <div className="flex items-center gap-3">
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>
                    {t('topWinnersLimit')}:
                  </span>
                  <input
                    type="number"
                    value={config.movers_top_limit || 100}
                    onChange={(e) =>
                      !disabled &&
                      onChange({ ...config, movers_top_limit: parseInt(e.target.value) || 100 })
                    }
                    disabled={disabled}
                    min={1}
                    max={100}
                    className="w-20 px-3 py-1.5 rounded"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#F9FAFB',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {config.use_movers_top && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm" style={{ color: '#9CA3AF' }}>
                  {t('topWinnersApiUrl')}
                </label>
                {!disabled && !config.movers_top_api_url && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...config, movers_top_api_url: DEFAULT_TOP_WINNERS_API_URL })}
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: '#22c55e20', color: '#22c55e' }}
                  >
                    {t('fillDefault')}
                  </button>
                )}
              </div>
              <input
                type="url"
                value={config.movers_top_api_url || ''}
                onChange={(e) =>
                  !disabled && onChange({ ...config, movers_top_api_url: e.target.value })
                }
                disabled={disabled}
                placeholder={t('topWinnersApiUrlPlaceholder')}
                className="w-full px-4 py-2.5 rounded-lg font-mono text-sm"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#F9FAFB',
                }}
              />
              {!config.movers_top_api_url && (
                <div className="flex items-center gap-2 mt-2">
                  <AlertCircle className="w-4 h-4" style={{ color: '#22c55e' }} />
                  <span className="text-xs" style={{ color: '#22c55e' }}>
                    {t('apiUrlRequired')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Top Losers Options */}
      {(config.source_type === 'top_losers' || config.source_type === 'mixed') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Link className="w-4 h-4" style={{ color: '#ef4444' }} />
            <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>
              {t('dataSourceConfig')} - Top Losers
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-3 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.use_top_losers}
                  onChange={(e) =>
                    !disabled && onChange({ ...config, use_top_losers: e.target.checked })
                  }
                  disabled={disabled}
                  className="w-5 h-5 rounded accent-red-500"
                />
                <span style={{ color: '#F9FAFB' }}>{t('useTopLosers')}</span>
              </label>
              {config.use_top_losers && (
                <div className="flex items-center gap-3">
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>
                    {t('topLosersLimit')}:
                  </span>
                  <input
                    type="number"
                    value={config.top_losers_limit || 100}
                    onChange={(e) =>
                      !disabled &&
                      onChange({ ...config, top_losers_limit: parseInt(e.target.value) || 100 })
                    }
                    disabled={disabled}
                    min={1}
                    max={100}
                    className="w-20 px-3 py-1.5 rounded"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#F9FAFB',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {config.use_top_losers && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm" style={{ color: '#9CA3AF' }}>
                  {t('topLosersApiUrl')}
                </label>
                {!disabled && !config.top_losers_api_url && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...config, top_losers_api_url: DEFAULT_TOP_LOSERS_API_URL })}
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: '#ef444420', color: '#ef4444' }}
                  >
                    {t('fillDefault')}
                  </button>
                )}
              </div>
              <input
                type="url"
                value={config.top_losers_api_url || ''}
                onChange={(e) =>
                  !disabled && onChange({ ...config, top_losers_api_url: e.target.value })
                }
                disabled={disabled}
                placeholder={t('topLosersApiUrlPlaceholder')}
                className="w-full px-4 py-2.5 rounded-lg font-mono text-sm"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#F9FAFB',
                }}
              />
              {!config.top_losers_api_url && (
                <div className="flex items-center gap-2 mt-2">
                  <AlertCircle className="w-4 h-4" style={{ color: '#ef4444' }} />
                  <span className="text-xs" style={{ color: '#ef4444' }}>
                    {t('apiUrlRequired')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
