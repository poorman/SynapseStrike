import { useState } from 'react'
import { ChevronDown, ChevronRight, RotateCcw, FileText } from 'lucide-react'
import type { PromptSectionsConfig } from '../../types'

interface PromptSectionsEditorProps {
  config: PromptSectionsConfig | undefined
  onChange: (config: PromptSectionsConfig) => void
  disabled?: boolean
  language: string
}

// Default prompt sections (same as backend defaults)
const defaultSections: PromptSectionsConfig = {
  role_definition: `# You are a professional stock trading AI

You focus on technical analysis and risk management, making rational trading decisions based on market data.
Your goal is to capture high-probability trading opportunities while controlling risk.`,

  trading_frequency: `# ⏱️ Trading Frequency Awareness

- Excellent traders: 2-4 trades per day ≈ 0.1-0.2 trades per hour
- >2 trades per hour = overtrading
- Minimum position holding time: 30-60 minutes
If you trade every cycle → standards too low; if closing positions <30 min → too impatient.`,

  entry_standards: `# 🎯 Entry Standards (Strict)

Only open positions when multiple signals align:
- Clear trend direction (EMA alignment, price position)
- Momentum confirmation (MACD, RSI agreement)
- Moderate volatility (ATR in reasonable range)
- Volume-price agreement (volume supports direction)

Avoid: single indicator, conflicting signals, sideways consolidation, re-entry immediately after closing.`,

  decision_process: `# 📋 Decision Process

1. Check positions → should we take profit/stop loss
2. Scan candidate stocks + multiple timeframes → is there a strong signal
3. Evaluate risk/reward ratio → does it meet minimum requirements
4. Write chain of thought first, then output structured JSON`,
}

export function PromptSectionsEditor({
  config,
  onChange,
  disabled,
}: PromptSectionsEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    role_definition: false,
    trading_frequency: false,
    entry_standards: false,
    decision_process: false,
  })

  const t = (key: string) => {
    const translations: Record<string, string> = {
      promptSections: 'System Prompt Customization',
      promptSectionsDesc: 'Customize AI behavior and decision logic (output format and risk rules are fixed)',
      roleDefinition: 'Role Definition',
      roleDefinitionDesc: 'Define AI identity and core objectives',
      tradingFrequency: 'Trading Frequency',
      tradingFrequencyDesc: 'Set trading frequency expectations and overtrading warnings',
      entryStandards: 'Entry Standards',
      entryStandardsDesc: 'Define entry signal conditions and avoidances',
      decisionProcess: 'Decision Process',
      decisionProcessDesc: 'Set decision steps and thinking process',
      resetToDefault: 'Reset to Default',
      chars: 'chars',
    }
    return translations[key] || key
  }

  const sections = [
    { key: 'role_definition', label: t('roleDefinition'), desc: t('roleDefinitionDesc') },
    { key: 'trading_frequency', label: t('tradingFrequency'), desc: t('tradingFrequencyDesc') },
    { key: 'entry_standards', label: t('entryStandards'), desc: t('entryStandardsDesc') },
    { key: 'decision_process', label: t('decisionProcess'), desc: t('decisionProcessDesc') },
  ]

  const currentConfig = config || {}

  const updateSection = (key: keyof PromptSectionsConfig, value: string) => {
    if (!disabled) {
      onChange({ ...currentConfig, [key]: value })
    }
  }

  const resetSection = (key: keyof PromptSectionsConfig) => {
    if (!disabled) {
      onChange({ ...currentConfig, [key]: defaultSections[key] })
    }
  }

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const getValue = (key: keyof PromptSectionsConfig): string => {
    return currentConfig[key] || defaultSections[key] || ''
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 mb-4">
        <FileText className="w-5 h-5 mt-0.5" style={{ color: '#a855f7' }} />
        <div>
          <h3 className="font-medium" style={{ color: '#F9FAFB' }}>
            {t('promptSections')}
          </h3>
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
            {t('promptSectionsDesc')}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {sections.map(({ key, label, desc }) => {
          const sectionKey = key as keyof PromptSectionsConfig
          const isExpanded = expandedSections[key]
          const value = getValue(sectionKey)
          const isModified = currentConfig[sectionKey] !== undefined && currentConfig[sectionKey] !== defaultSections[sectionKey]

          return (
            <div
              key={key}
              className="rounded-lg overflow-hidden"
              style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
            >
              <button
                onClick={() => toggleSection(key)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--bg-secondary)]/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                  ) : (
                    <ChevronRight className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                  )}
                  <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>
                    {label}
                  </span>
                  {isModified && (
                    <span
                      className="px-1.5 py-0.5 text-[10px] rounded"
                      style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}
                    >
                      Modified
                    </span>
                  )}
                </div>
                <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
                  {value.length} {t('chars')}
                </span>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3">
                  <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
                    {desc}
                  </p>
                  <textarea
                    value={value}
                    onChange={(e) => updateSection(sectionKey, e.target.value)}
                    disabled={disabled}
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg resize-y font-mono text-xs"
                    style={{
                      background: 'rgba(22, 27, 34, 0.88)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#F9FAFB',
                      minHeight: '120px',
                    }}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => resetSection(sectionKey)}
                      disabled={disabled || !isModified}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:bg-[var(--bg-secondary)]/5 disabled:opacity-30"
                      style={{ color: '#9CA3AF' }}
                    >
                      <RotateCcw className="w-3 h-3" />
                      {t('resetToDefault')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
