import type { TraderConfigData } from '../types'
import { PunkAvatar, getTraderAvatar } from './PunkAvatar'

// Extract name after underscore
function getShortName(fullName: string): string {
  const parts = fullName.split('_')
  return parts.length > 1 ? parts[parts.length - 1] : fullName
}

interface TraderConfigViewModalProps {
  isOpen: boolean
  onClose: () => void
  traderData?: TraderConfigData | null
}

export function TraderConfigViewModal({
  isOpen,
  onClose,
  traderData,
}: TraderConfigViewModalProps) {
  if (!isOpen || !traderData) return null

  const InfoRow = ({
    label,
    value,
  }: {
    label: string
    value: string | number | boolean
  }) => (
    <div className="flex justify-between items-start py-2 border-b border-[rgba(255, 255, 255, 0.08)] last:border-b-0">
      <span className="text-sm text-[#9CA3AF] font-medium">{label}</span>
      <span className="text-sm text-[#F9FAFB] font-mono text-right">
        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
      </span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div
        className="bg-[rgba(22, 27, 34, 0.88)] border border-[rgba(255, 255, 255, 0.08)] rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[rgba(255, 255, 255, 0.08)] bg-gradient-to-r from-[rgba(22, 27, 34, 0.88)] to-[#252B35]">
          <div className="flex items-center gap-3">
            <PunkAvatar
              seed={getTraderAvatar(traderData.trader_id || '', traderData.trader_name)}
              size={48}
              className="rounded-lg"
            />
            <div>
              <h2 className="text-xl font-bold text-[#F9FAFB]">Trader Configuration</h2>
              <p className="text-sm text-[#9CA3AF] mt-1">
                {traderData.trader_name} Configuration details
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Running Status */}
            <div
              className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
              style={
                traderData.is_running
                  ? { background: 'rgba(14, 203, 129, 0.1)', color: 'var(--primary)' }
                  : { background: 'rgba(246, 70, 93, 0.1)', color: '#F6465D' }
              }
            >
              <span>{traderData.is_running ? '●' : '○'}</span>
              {traderData.is_running ? 'Running' : 'Stopped'}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[rgba(255, 255, 255, 0.08)] transition-colors flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="bg-[var(--glass-bg)] border border-[rgba(255, 255, 255, 0.08)] rounded-lg p-5">
            <h3 className="text-lg font-semibold text-[#F9FAFB] mb-4 flex items-center gap-2">
              🤖 Basic Info
            </h3>
            <div className="space-y-3">
              <InfoRow
                label="Trader Name"
                value={traderData.trader_name}
              />
              <InfoRow
                label="AI Model"
                value={getShortName(traderData.ai_model).toUpperCase()}
              />
              <InfoRow
                label="Brokerage"
                value={getShortName(traderData.brokerage_id).toUpperCase()}
              />
              <InfoRow
                label="Initial Balance"
                value={`$${traderData.initial_balance.toLocaleString()}`}
              />
              <InfoRow
                label="Margin Mode"
                value={traderData.is_cross_margin ? 'Cross' : 'Isolated'}
              />
              <InfoRow
                label="Scan Interval"
                value={`${traderData.scan_interval_minutes || 3} min`}
              />
            </div>
          </div>

          {/* Strategy Info - only show if strategy is bound */}
          {traderData.strategy_id && (
            <div className="bg-[var(--glass-bg)] border border-[rgba(255, 255, 255, 0.08)] rounded-lg p-5">
              <h3 className="text-lg font-semibold text-[#F9FAFB] mb-4 flex items-center gap-2">
                📋 Strategy
              </h3>
              <div className="space-y-3">
                <InfoRow
                  label="Strategy Name"
                  value={traderData.strategy_name || traderData.strategy_id}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-[rgba(255, 255, 255, 0.08)] bg-gradient-to-r from-[rgba(22, 27, 34, 0.88)] to-[#252B35]">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[rgba(255, 255, 255, 0.08)] text-[#F9FAFB] rounded-lg hover:bg-[#404750] transition-all duration-200 border border-[#404750]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
