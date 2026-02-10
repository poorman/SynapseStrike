import { useState, useEffect } from 'react'
import type { AIModel, Brokerage, CreateTraderRequest, Strategy } from '../types'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { toast } from 'sonner'
import { Pencil, Plus, X as IconX, Sparkles } from 'lucide-react'
import { httpClient } from '../lib/httpClient'

// Extract name after underscore
function getShortName(fullName: string): string {
  const parts = fullName.split('_')
  return parts.length > 1 ? parts[parts.length - 1] : fullName
}

// Brokerageregisterlinkconfig


import type { TraderConfigData } from '../types'

// forminternalstatustype
interface FormState {
  trader_id?: string
  trader_name: string
  ai_model: string
  brokerage_id: string
  strategy_id: string
  is_cross_margin: boolean
  show_in_competition: boolean
  scan_interval_minutes: number
  initial_balance?: number
  trade_only_market_hours?: boolean
}

interface TraderConfigModalProps {
  isOpen: boolean
  onClose: () => void
  traderData?: TraderConfigData | null
  isEditMode?: boolean
  availableModels?: AIModel[]
  availableBrokerages?: Brokerage[]
  onSave?: (data: CreateTraderRequest) => Promise<void>
}

export function TraderConfigModal({
  isOpen,
  onClose,
  traderData,
  isEditMode = false,
  availableModels = [],
  availableBrokerages = [],
  onSave,
}: TraderConfigModalProps) {
  const { language } = useLanguage()
  const [formData, setFormData] = useState<FormState>({
    trader_name: '',
    ai_model: '',
    brokerage_id: '',
    strategy_id: '',
    is_cross_margin: true,
    show_in_competition: true,
    scan_interval_minutes: 3,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [isFetchingBalance, setIsFetchingBalance] = useState(false)
  const [balanceFetchError, setBalanceFetchError] = useState<string>('')

  // getuser'sStrategylist + Tactics list (Opus, Sonnet, Cursor)
  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        // Fetch from BOTH strategies and tactics endpoints
        const [strategiesResult, tacticsResult] = await Promise.all([
          httpClient.get<{ strategies: Strategy[] }>('/api/strategies'),
          httpClient.get<{ tactics: Strategy[] }>('/api/tactics')
        ])

        // Merge both lists
        const strategiesList = strategiesResult.success && strategiesResult.data?.strategies
          ? strategiesResult.data.strategies
          : []
        const tacticsList = tacticsResult.success && tacticsResult.data?.tactics
          ? tacticsResult.data.tactics
          : []

        // Combine and dedupe by ID
        const allStrategies = [...strategiesList]
        const existingIds = new Set(strategiesList.map(s => s.id))
        for (const tactic of tacticsList) {
          if (!existingIds.has(tactic.id)) {
            allStrategies.push(tactic)
          }
        }

        setStrategies(allStrategies)

        // ifnohasSelectStrategy，defaultselectinactivate'sStrategy
        if (!formData.strategy_id && !isEditMode) {
          const activeStrategy = allStrategies.find(s => s.is_active)
          if (activeStrategy) {
            setFormData(prev => ({ ...prev, strategy_id: activeStrategy.id }))
          } else if (allStrategies.length > 0) {
            setFormData(prev => ({ ...prev, strategy_id: allStrategies[0].id }))
          }
        }
      } catch (error) {
        console.error('Failed to fetch strategies:', error)
      }
    }
    if (isOpen) {
      fetchStrategies()
    }
  }, [isOpen])

  useEffect(() => {
    if (traderData) {
      console.log('🔥 TraderConfigModal - traderData received:', traderData)
      // Use the trader's brokerage ID if available, otherwise fallback to the first available one
      const effectiveBrokerageId = traderData.brokerage_id || (availableBrokerages[0]?.id || '')

      // Explicitly map fields to ensure correct field names
      setFormData({
        trader_id: traderData.trader_id,
        trader_name: traderData.trader_name || '',
        ai_model: traderData.ai_model || '',
        brokerage_id: effectiveBrokerageId,
        strategy_id: traderData.strategy_id || '',
        is_cross_margin: traderData.is_cross_margin ?? true,
        show_in_competition: traderData.show_in_competition ?? true,
        scan_interval_minutes: traderData.scan_interval_minutes || 3,
        initial_balance: traderData.initial_balance,
        trade_only_market_hours: traderData.trade_only_market_hours ?? true,
      })
    } else if (!isEditMode) {
      setFormData({
        trader_name: '',
        ai_model: availableModels[0]?.id || '',
        brokerage_id: availableBrokerages[0]?.id || '',
        strategy_id: '',
        is_cross_margin: true,
        show_in_competition: true,
        scan_interval_minutes: 3,
        trade_only_market_hours: true,
      })
    }
  }, [traderData, isEditMode, availableModels, availableBrokerages])

  if (!isOpen) return null

  const handleInputChange = (field: keyof FormState, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFetchCurrentBalance = async () => {
    if (!isEditMode || !traderData?.trader_id) {
      setBalanceFetchError('Can only get current balance in edit mode')
      return
    }

    setIsFetchingBalance(true)
    setBalanceFetchError('')

    try {
      const result = await httpClient.get<{
        total_equity?: number
        balance?: number
      }>(`/api/account?trader_id=${traderData.trader_id}`)

      if (result.success && result.data) {
        const currentBalance =
          result.data.total_equity || result.data.balance || 0
        setFormData((prev) => ({ ...prev, initial_balance: currentBalance }))
        toast.success('alreadyGet Current Balance')
      } else {
        throw new Error(result.message || 'Failed to fetch balance')
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error)
      setBalanceFetchError('Failed to fetch balance, please check connection')
    } finally {
      setIsFetchingBalance(false)
    }
  }

  const handleSave = async () => {
    if (!onSave) return

    setIsSaving(true)
    try {
      const saveData: CreateTraderRequest = {
        name: formData.trader_name,
        ai_model_id: formData.ai_model,
        brokerage_id: formData.brokerage_id,
        strategy_id: formData.strategy_id,
        is_cross_margin: formData.is_cross_margin,
        show_in_competition: formData.show_in_competition,
        scan_interval_minutes: formData.scan_interval_minutes,
        trade_only_market_hours: formData.trade_only_market_hours ?? true,
      }

      // onlyateditmodemodewhenpackagecontaininitial_balance
      if (isEditMode && formData.initial_balance !== undefined) {
        saveData.initial_balance = formData.initial_balance
      }

      await toast.promise(onSave(saveData), {
        loading: 'Saving...',
        success: 'Saved successfully',
        error: 'Failed to save',
      })
      onClose()
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const selectedStrategy = strategies.find(s => s.id === formData.strategy_id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="bg-[#161b22] rounded-lg shadow-2xl max-w-lg w-full my-4"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)] bg-gradient-to-r from-[#161b22] to-[#1e2530] sticky top-0 z-10 rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, rgb(195, 245, 60), rgb(195, 245, 60))' }}>
              {isEditMode ? (
                <Pencil className="w-3.5 h-3.5" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F9FAFB]">
                {isEditMode ? 'Edit Trader' : 'Create Trader'}
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                {isEditMode ? 'Edit Trader Configuration' : 'Select strategy and configure parameters'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[rgba(255, 255, 255, 0.08)] transition-colors flex items-center justify-center"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div
          className="px-4 py-3 space-y-3 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 10rem)' }}
        >
          {/* Basic Info */}
          <div className="bg-[var(--glass-bg)] border border-[rgba(255,255,255,0.04)] rounded-lg p-3">
            <h3 className="text-xs font-semibold text-[#F9FAFB] mb-3 flex items-center gap-2">
              <span className="text-[rgb(195, 245, 60)]">1</span> Basic Configuration
            </h3>
            <div className="space-y-2.5">
              <div>
                <label className="text-xs text-[#F9FAFB] block mb-1">
                  Trader Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.trader_name}
                  onChange={(e) =>
                    handleInputChange('trader_name', e.target.value)
                  }
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] rounded-lg text-[#F9FAFB] placeholder-[#6B7280] focus:border-[rgb(195, 245, 60)] focus:ring-1 focus:ring-[rgb(195, 245, 60)]/20 focus:outline-none"
                  placeholder="Enter Trader Name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#F9FAFB] block mb-1">
                    AI Model <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.ai_model}
                    onChange={(e) =>
                      handleInputChange('ai_model', e.target.value)
                    }
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] rounded-lg text-[#F9FAFB] placeholder-[#6B7280] focus:border-[rgb(195, 245, 60)] focus:ring-1 focus:ring-[rgb(195, 245, 60)]/20 focus:outline-none"
                  >
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {getShortName(model.name || model.id).toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#F9FAFB] block mb-1">
                    Brokerage <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.brokerage_id}
                    onChange={(e) =>
                      handleInputChange('brokerage_id', e.target.value)
                    }
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] rounded-lg text-[#F9FAFB] placeholder-[#6B7280] focus:border-[rgb(195, 245, 60)] focus:ring-1 focus:ring-[rgb(195, 245, 60)]/20 focus:outline-none"
                  >
                    {availableBrokerages.map((brokerage) => (
                      <option key={brokerage.id} value={brokerage.id}>
                        {getShortName(brokerage.name || brokerage.brokerage_type || brokerage.id).toUpperCase()}
                        {brokerage.account_name ? ` - ${brokerage.account_name}` : ''}
                      </option>
                    ))}
                  </select>
                  {/* Brokerage Registration Link removed */}
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Selection */}
          <div className="bg-[var(--glass-bg)] border border-[rgba(255,255,255,0.04)] rounded-lg p-3">
            <h3 className="text-xs font-semibold text-[#F9FAFB] mb-3 flex items-center gap-2">
              <span className="text-[rgb(195, 245, 60)]">2</span> Select Trading Strategy
              <Sparkles className="w-4 h-4 text-[rgb(195, 245, 60)]" />
            </h3>
            <div className="space-y-2.5">
              <div>
                <label className="text-xs text-[#F9FAFB] block mb-1">
                  Use Strategy
                </label>
                <select
                  value={formData.strategy_id}
                  onChange={(e) =>
                    handleInputChange('strategy_id', e.target.value)
                  }
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] rounded-lg text-[#F9FAFB] placeholder-[#6B7280] focus:border-[rgb(195, 245, 60)] focus:ring-1 focus:ring-[rgb(195, 245, 60)]/20 focus:outline-none"
                >
                  <option value="">-- No Strategy (Manual Config)--</option>
                  {strategies.map((strategy) => (
                    <option key={strategy.id} value={strategy.id}>
                      {strategy.name}
                      {strategy.is_active ? ' (Current Active)' : ''}
                      {strategy.is_default ? ' [default]' : ''}
                    </option>
                  ))}
                </select>
                {strategies.length === 0 && (
                  <p className="text-xs text-[#9CA3AF] mt-2">
                    No strategies available. Create one in Strategy Studio first.
                  </p>
                )}
              </div>

              {/* Strategy Preview */}
              {selectedStrategy && (
                <div className="mt-3 p-4 bg-[rgba(22, 27, 34, 0.88)] border border-[rgba(255, 255, 255, 0.08)] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[rgb(195, 245, 60)] text-sm font-medium">
                      Strategy Details
                    </span>
                    {selectedStrategy.is_active && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#9CA3AF] mb-2">
                    {selectedStrategy.description || 'No description'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#9CA3AF]">
                    <div>
                      Stock Source: {selectedStrategy.config?.stock_source?.source_type === 'static' ? 'Static' :
                        selectedStrategy.config?.stock_source?.source_type === 'ai100' ? 'AI 100 Stocks' :
                          selectedStrategy.config?.stock_source?.source_type === 'oi_top' ? 'OI Top' : 'Mixed'}
                    </div>
                    <div>
                      Max Margin: {((selectedStrategy.config?.risk_control?.max_margin_usage || 0.9) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trading Timeline */}
          <div className="bg-[var(--glass-bg)] border border-[rgba(255,255,255,0.04)] rounded-lg p-3">
            <h3 className="text-xs font-semibold text-[#F9FAFB] mb-3 flex items-center gap-2">
              <span className="text-[rgb(195, 245, 60)]">3</span> Trading Timeline
            </h3>
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#F9FAFB] block mb-1">
                    Margin Mode
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleInputChange('is_cross_margin', true)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${formData.is_cross_margin
                        ? 'text-black shadow-lg'
                        : 'bg-[rgba(255,255,255,0.05)] text-[#9CA3AF] border border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.08)]'
                        }`}
                      style={formData.is_cross_margin ? { background: 'rgb(204, 255, 0)', color: '#000', boxShadow: '0 10px 15px -3px rgba(204, 255, 0, 0.2)' } : {}}
                    >
                      Cross
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleInputChange('is_cross_margin', false)
                      }
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${!formData.is_cross_margin
                        ? 'text-black shadow-lg'
                        : 'bg-[rgba(255,255,255,0.05)] text-[#9CA3AF] border border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.08)]'
                        }`}
                      style={!formData.is_cross_margin ? { background: 'rgb(204, 255, 0)', color: '#000', boxShadow: '0 10px 15px -3px rgba(204, 255, 0, 0.2)' } : {}}
                    >
                      Isolated
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#F9FAFB] block mb-1">
                    {t('aiScanInterval', language)}
                  </label>
                  <input
                    type="number"
                    value={formData.scan_interval_minutes}
                    onChange={(e) => {
                      const parsedValue = Number(e.target.value)
                      const safeValue = Number.isFinite(parsedValue)
                        ? Math.max(3, parsedValue)
                        : 3
                      handleInputChange('scan_interval_minutes', safeValue)
                    }}
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] rounded-lg text-[#F9FAFB] placeholder-[#6B7280] focus:border-[rgb(195, 245, 60)] focus:ring-1 focus:ring-[rgb(195, 245, 60)]/20 focus:outline-none"
                    min="3"
                    max="60"
                    step="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('scanIntervalRecommend', language)}
                  </p>
                </div>
              </div>

              {/* Competition visibility */}
              <div>
                <label className="text-xs text-[#F9FAFB] block mb-1">
                  Arena Visibility
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleInputChange('show_in_competition', true)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${formData.show_in_competition
                      ? 'text-black shadow-lg'
                      : 'bg-[rgba(255,255,255,0.05)] text-[#9CA3AF] border border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.08)]'
                      }`}
                    style={formData.show_in_competition ? { background: 'rgb(204, 255, 0)', color: '#000', boxShadow: '0 10px 15px -3px rgba(204, 255, 0, 0.2)' } : {}}
                  >
                    Show
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('show_in_competition', false)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${!formData.show_in_competition
                      ? 'text-black shadow-lg'
                      : 'bg-[rgba(255,255,255,0.05)] text-[#9CA3AF] border border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.08)]'
                      }`}
                    style={!formData.show_in_competition ? { background: 'rgb(204, 255, 0)', color: '#000', boxShadow: '0 10px 15px -3px rgba(204, 255, 0, 0.2)' } : {}}
                  >
                    Hide
                  </button>
                </div>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  When hidden, this trader will not appear in the Arena
                </p>
              </div>

              {/* Market Hours Only */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.trade_only_market_hours ?? true}
                    onChange={(e) => handleInputChange('trade_only_market_hours', e.target.checked)}
                    className="w-5 h-5 rounded accent-[#0ecb81]"
                  />
                  <span className="text-sm text-[#F9FAFB]">Trade only when market is open</span>
                </label>
                <p className="text-xs text-[#9CA3AF] mt-1 ml-8">
                  When enabled, the trader will only execute trades during stock market hours (9:30 AM - 4:00 PM ET)
                </p>
              </div>

              {/* Initial Balance (Edit mode only) */}
              {isEditMode && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-[#F9FAFB]">
                      Initial Balance ($)
                    </label>
                    <button
                      type="button"
                      onClick={handleFetchCurrentBalance}
                      disabled={isFetchingBalance}
                      className="px-3 py-1 text-xs text-black rounded transition-colors disabled:bg-[#9CA3AF] disabled:cursor-not-allowed"
                      style={{ background: isFetchingBalance ? '#9CA3AF' : 'rgb(204, 255, 0)', color: '#000' }}
                    >
                      {isFetchingBalance ? 'Loading...' : 'Get Current Balance'}
                    </button>
                  </div>
                  <input
                    type="number"
                    value={formData.initial_balance || 0}
                    onChange={(e) =>
                      handleInputChange(
                        'initial_balance',
                        Number(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] rounded-lg text-[#F9FAFB] placeholder-[#6B7280] focus:border-[rgb(195, 245, 60)] focus:ring-1 focus:ring-[rgb(195, 245, 60)]/20 focus:outline-none"
                    min="100"
                    step="0.01"
                  />
                  <p className="text-xs text-[#9CA3AF] mt-1">
                    Used to manually update initial balance (e.g. after deposit/withdrawal)
                  </p>
                  {balanceFetchError && (
                    <p className="text-xs text-red-500 mt-1">
                      {balanceFetchError}
                    </p>
                  )}
                </div>
              )}

              {/* Create mode info */}
              {!isEditMode && (
                <div className="p-3 bg-[rgba(22, 27, 34, 0.88)] border border-[rgba(255, 255, 255, 0.08)] rounded flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-[rgb(195, 245, 60)]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" x2="12" y1="8" y2="12" />
                    <line x1="12" x2="12.01" y1="16" y2="16" />
                  </svg>
                  <span className="text-sm text-[#9CA3AF]">
                    System will automatically use your account equity as initial balance
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-2.5 border-t border-[rgba(255, 255, 255, 0.08)] bg-gradient-to-r from-[rgba(22, 27, 34, 0.88)] to-[#252B35] sticky bottom-0 z-10 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-[rgba(255, 255, 255, 0.08)] text-[#F9FAFB] rounded hover:bg-[#404750] transition-all duration-200 border border-[#404750]"
          >
            Cancel
          </button>
          {onSave && (
            <button
              onClick={handleSave}
              disabled={
                isSaving ||
                !Boolean(formData.trader_name) ||
                !Boolean(formData.ai_model) ||
                !Boolean(formData.brokerage_id)
              }
              className="px-5 py-1.5 text-xs rounded transition-all duration-200 font-medium shadow-lg cursor-pointer"
              style={{
                background: (isSaving || !formData.trader_name || !formData.ai_model || !formData.brokerage_id)
                  ? '#6B7280'  // Gray when disabled
                  : 'linear-gradient(to right, rgb(195, 245, 60), rgb(195, 245, 60))',  // Bright yellow when active
                color: (isSaving || !formData.trader_name || !formData.ai_model || !formData.brokerage_id) ? '#FFFFFF' : '#000',  // Black text on yellow, white on gray
                opacity: (isSaving || !formData.trader_name || !formData.ai_model || !formData.brokerage_id) ? 0.6 : 1,
              }}
            >
              {isSaving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Trader'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
