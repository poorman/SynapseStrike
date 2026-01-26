import { useState } from 'react'
import type { DecisionRecord, DecisionAction } from '../types'
import { t, type Language } from '../i18n/translations'

interface DecisionCardProps {
  decision: DecisionRecord
  language: Language
}

// Action type configuration
const ACTION_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  open_long: { color: 'var(--primary)', bg: 'rgba(14, 203, 129, 0.15)', icon: '📈', label: 'LONG' },
  open_short: { color: '#F6465D', bg: 'rgba(246, 70, 93, 0.15)', icon: '📉', label: 'SHORT' },
  close_long: { color: 'var(--primary)', bg: 'var(--primary-bg, 0.15)', icon: '💰', label: 'CLOSE' },
  close_short: { color: 'var(--primary)', bg: 'var(--primary-bg, 0.15)', icon: '💰', label: 'CLOSE' },
  hold: { color: '#9CA3AF', bg: 'rgba(132, 142, 156, 0.15)', icon: '⏸️', label: 'HOLD' },
  wait: { color: '#9CA3AF', bg: 'rgba(132, 142, 156, 0.15)', icon: '⏳', label: 'WAIT' },
}

// Single Action Card Component - Compact chip style
function ActionCard({ action }: { action: DecisionAction; language: Language }) {
  const config = ACTION_CONFIG[action.action] || ACTION_CONFIG.wait

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{
        background: 'linear-gradient(135deg, rgba(22, 27, 34, 0.95) 0%, rgba(33, 38, 45, 0.92) 100%)',
        border: `1px solid ${config.color}33`,
      }}
    >
      {/* Symbol */}
      <span className="text-sm">⏳</span>
      <span className="font-semibold text-sm" style={{ color: '#F9FAFB' }}>
        {action.symbol.replace('USDT', '')}
      </span>
      <span
        className="px-2 py-0.5 rounded text-xs font-bold uppercase"
        style={{ background: config.bg, color: config.color, border: `1px solid ${config.color}55` }}
      >
        {config.label}
      </span>
      {/* Success indicator dot */}
      <div
        className="w-2 h-2 rounded-full"
        style={{ background: action.success ? 'var(--primary)' : '#F6465D' }}
      />
    </div>
  )
}

export function DecisionCard({ decision, language }: DecisionCardProps) {
  const [showInputPrompt, setShowInputPrompt] = useState(false)
  const [showCoT, setShowCoT] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Check if there are any actual trades (not wait/hold)
  const hasActualTrades = decision.decisions?.some(
    (d) => d.action !== 'wait' && d.action !== 'hold'
  ) ?? false

  // If no actual trades, show collapsed view by default
  if (!hasActualTrades && !isExpanded) {
    return (
      <div
        className="rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-all"
        style={{
          border: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'rgba(22, 27, 34, 0.6)',
        }}
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm">🤖</span>
          <span className="text-sm" style={{ color: '#9CA3AF' }}>
            {t('cycle', language)} #{decision.cycle_number}
          </span>
          <span className="text-xs" style={{ color: '#6B7280' }}>
            {new Date(decision.timestamp).toLocaleString()}
          </span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(156, 163, 175, 0.15)', color: '#9CA3AF' }}>
            {decision.decisions?.length || 0} WAIT
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={
              decision.success
                ? { background: 'rgba(14, 203, 129, 0.15)', color: 'var(--primary)' }
                : { background: 'rgba(246, 70, 93, 0.15)', color: '#F6465D' }
            }
          >
            {t(decision.success ? 'success' : 'failed', language)}
          </span>
          <span className="text-xs" style={{ color: '#6B7280' }}>▼</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-5 transition-all duration-300 hover:translate-y-[-2px]"
      style={{
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'linear-gradient(180deg, rgba(22, 27, 34, 0.95) 0%, rgba(33, 38, 45, 0.92) 100%)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Collapse button for expanded wait-only cycles */}
      {!hasActualTrades && isExpanded && (
        <button
          onClick={() => setIsExpanded(false)}
          className="text-xs mb-2 px-2 py-1 rounded hover:bg-[rgba(255,255,255,0.05)]"
          style={{ color: '#6B7280' }}
        >
          ▲ Collapse
        </button>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--primary-bg, 0.15)' }}
          >
            <span className="text-xl">🤖</span>
          </div>
          <div>
            <div className="font-bold" style={{ color: '#F9FAFB' }}>
              {t('cycle', language)} #{decision.cycle_number}
            </div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>
              {new Date(decision.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
        <div
          className="px-4 py-1.5 rounded-full text-xs font-bold tracking-wider"
          style={
            decision.success
              ? { background: 'rgba(14, 203, 129, 0.15)', color: 'var(--primary)', border: '1px solid rgba(14, 203, 129, 0.3)' }
              : { background: 'rgba(246, 70, 93, 0.15)', color: '#F6465D', border: '1px solid rgba(246, 70, 93, 0.3)' }
          }
        >
          {t(decision.success ? 'success' : 'failed', language)}
        </div>
      </div>

      {/* Decision Actions - Compact horizontal chips */}
      {decision.decisions && decision.decisions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {decision.decisions.map((action, index) => (
            <ActionCard key={`${action.symbol}-${index}`} action={action} language={language} />
          ))}
        </div>
      )}

      {/* Collapsible Sections */}
      <div className="space-y-2">
        {/* Input Prompt */}
        {decision.input_prompt && (
          <div>
            <button
              onClick={() => setShowInputPrompt(!showInputPrompt)}
              className="flex items-center gap-2 text-sm transition-colors w-full justify-between p-2 rounded hover:bg-[var(--bg-secondary)]/5"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">📥</span>
                <span className="font-semibold" style={{ color: '#60a5fa' }}>
                  {t('inputPrompt', language)}
                </span>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa' }}
              >
                {showInputPrompt ? t('collapse', language) : t('expand', language)}
              </span>
            </button>
            {showInputPrompt && (
              <div
                className="mt-2 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#F9FAFB',
                  fontFamily: 'Capsule Sans Text, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif',
                }}
              >
                {decision.input_prompt}
              </div>
            )}
          </div>
        )}

        {/* AI Thinking */}
        {decision.cot_trace && (
          <div>
            <button
              onClick={() => setShowCoT(!showCoT)}
              className="flex items-center gap-2 text-sm transition-colors w-full justify-between p-2 rounded hover:bg-[var(--bg-secondary)]/5"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🧠</span>
                <span className="font-semibold" style={{ color: 'var(--primary)' }}>
                  {t('aiThinking', language)}
                </span>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: 'var(--primary-bg, 0.15)', color: 'var(--primary)' }}
              >
                {showCoT ? t('collapse', language) : t('expand', language)}
              </span>
            </button>
            {showCoT && (
              <div
                className="mt-2 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#F9FAFB',
                  fontFamily: 'Capsule Sans Text, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif',
                  lineHeight: '1.8',
                }}
              >
                {decision.cot_trace}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Execution Log */}
      {decision.execution_log && decision.execution_log.length > 0 && (
        <div
          className="rounded-lg p-3 mt-4 text-xs space-y-1"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontFamily: 'Capsule Sans Text, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif',
          }}
        >
          {decision.execution_log.map((log, index) => (
            <div key={`${log}-${index}`} style={{ color: '#F9FAFB' }}>
              {log}
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {decision.error_message && (
        <div
          className="rounded-lg p-3 mt-4 text-sm"
          style={{
            background: 'rgba(246, 70, 93, 0.1)',
            border: '1px solid rgba(246, 70, 93, 0.4)',
            color: '#F6465D',
          }}
        >
          ❌ {decision.error_message}
        </div>
      )}
    </div>
  )
}
