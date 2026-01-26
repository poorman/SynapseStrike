import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import {
  Plus,
  Trash2,
  Check,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Target,
  Shield,
  Save,
  Sparkles,
  Eye,
  Play,
  FileText,
  Loader2,
  Bot,
  Edit2,
  X,
} from 'lucide-react'
import type { Strategy, StrategyConfig, AIModel } from '../types'
import { confirmToast, notify } from '../lib/notify'
import { StockSourceEditor } from '../components/strategy/StockSourceEditor'
import { IndicatorEditor } from '../components/strategy/IndicatorEditor'
import { RiskControlEditor } from '../components/strategy/RiskControlEditor'
import { PromptSectionsEditor } from '../components/strategy/PromptSectionsEditor'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export function CursorStrategyPage() {
  const { token } = useAuth()
  const { language } = useLanguage()

  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null)
  const [editingConfig, setEditingConfig] = useState<StrategyConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // AI Models for test run
  const [aiModels, setAiModels] = useState<AIModel[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>('')

  // Accordion states for left panel
  const [expandedSections, setExpandedSections] = useState({
    stockSource: true,
    indicators: true, // Expanded by default for cursor strategies
    riskControl: false,
    promptSections: false,
    customPrompt: false,
  })

  // Right panel states
  const [activeRightTab, setActiveRightTab] = useState<'prompt' | 'test'>('prompt')
  const [promptPreview, setPromptPreview] = useState<{
    system_prompt: string
    user_prompt?: string
    prompt_variant: string
    config_summary: Record<string, unknown>
  } | null>(null)
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState('balanced')

  // AI Test Run states
  const [aiTestResult, setAiTestResult] = useState<{
    system_prompt?: string
    user_prompt?: string
    ai_response?: string
    reasoning?: string
    decisions?: unknown[]
    error?: string
    duration_ms?: number
  } | null>(null)
  const [isRunningAiTest, setIsRunningAiTest] = useState(false)

  // Create strategy modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newStrategyName, setNewStrategyName] = useState('')
  const [newStrategyDescription, setNewStrategyDescription] = useState('')

  // Editable strategy name state
  const [editingStrategyName, setEditingStrategyName] = useState(false)
  const [tempStrategyName, setTempStrategyName] = useState('')
  const [tempStrategyDescription, setTempStrategyDescription] = useState('')

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Fetch AI Models
  const fetchAiModels = useCallback(async () => {
    if (!token) return
    try {
      const response = await fetch(`${API_BASE}/api/models`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        const allModels = Array.isArray(data) ? data : (data.models || [])
        const enabledModels = allModels.filter((m: AIModel) => m.enabled)
        setAiModels(enabledModels)
        if (enabledModels.length > 0 && !selectedModelId) {
          setSelectedModelId(enabledModels[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI models:', err)
    }
  }, [token, selectedModelId])

  // Fetch cursor strategies (filtered by name containing "cursor" or "Cursor")
  const fetchStrategies = useCallback(async () => {
    if (!token) return
    try {
      const response = await fetch(`${API_BASE}/api/strategies`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Failed to fetch strategies')
      const data = await response.json()

      // Filter strategies to only show cursor-related ones
      const allStrategies = data.strategies || []
      const cursorStrategies = allStrategies.filter((s: Strategy) => {
        const strategyType = (s as any).strategy_type || ''

        // If strategy has a type, only include 'cursor' type
        if (strategyType) {
          return strategyType === 'cursor'
        }

        // Fallback to name matching for legacy strategies
        const name = s.name.toLowerCase()
        const desc = (s.description || '').toLowerCase()
        return name.includes('cursor') || desc.includes('cursor')
      })

      setStrategies(cursorStrategies)

      // Select active or first cursor strategy
      const active = cursorStrategies.find((s: Strategy) => s.is_active)
      if (active) {
        setSelectedStrategy(active)
        setEditingConfig(active.config)
      } else if (cursorStrategies.length > 0) {
        setSelectedStrategy(cursorStrategies[0])
        setEditingConfig(cursorStrategies[0].config)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchStrategies()
    fetchAiModels()
  }, [fetchStrategies, fetchAiModels])

  // Open create strategy modal
  const handleOpenCreateModal = () => {
    setNewStrategyName('')
    setNewStrategyDescription('Cursor strategy with Phase 1 profit features')
    setShowCreateModal(true)
  }

  // Create new cursor strategy
  const handleCreateStrategy = async () => {
    if (!token || !newStrategyName.trim()) {
      notify.error('Please enter a strategy name')
      return
    }

    try {
      const configResponse = await fetch(
        `${API_BASE}/api/strategies/default-config?lang=${language}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const defaultConfig = await configResponse.json()

      const response = await fetch(`${API_BASE}/api/strategies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newStrategyName.trim(),
          description: newStrategyDescription.trim() || 'Cursor strategy with Phase 1 profit features',
          config: defaultConfig,
          strategy_type: 'cursor',  // Set type so it only appears on Cursor page
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create strategy')
      }

      const newStrategy = await response.json()
      notify.success('Cursor strategy created successfully')
      setShowCreateModal(false)
      await fetchStrategies()

      // Select the newly created strategy
      if (newStrategy.id) {
        const updated = await fetch(`${API_BASE}/api/strategies/${newStrategy.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (updated.ok) {
          const strategyData = await updated.json()
          setSelectedStrategy(strategyData)
          setEditingConfig(strategyData.config)
        }
      }
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to create cursor strategy')
    }
  }

  // Start editing strategy name
  const handleStartEditName = () => {
    if (!selectedStrategy) return
    setTempStrategyName(selectedStrategy.name)
    setTempStrategyDescription(selectedStrategy.description || '')
    setEditingStrategyName(true)
  }

  // Save strategy name
  const handleSaveName = async () => {
    if (!selectedStrategy || !token || !tempStrategyName.trim()) {
      notify.error('Please enter a strategy name')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/strategies/${selectedStrategy.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: tempStrategyName.trim(),
          description: tempStrategyDescription.trim(),
          config: editingConfig || selectedStrategy.config,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save strategy name')
      }

      notify.success('Strategy name updated')
      setEditingStrategyName(false)
      await fetchStrategies()

      // Update selected strategy
      const updated = await fetch(`${API_BASE}/api/strategies/${selectedStrategy.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (updated.ok) {
        const strategyData = await updated.json()
        setSelectedStrategy(strategyData)
      }
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to save strategy name')
    }
  }

  // Cancel editing name
  const handleCancelEditName = () => {
    setEditingStrategyName(false)
    setTempStrategyName('')
    setTempStrategyDescription('')
  }

  // Update config helper
  const updateConfig = (key: keyof StrategyConfig, value: unknown) => {
    if (!editingConfig) return
    setEditingConfig({ ...editingConfig, [key]: value })
    setHasChanges(true)
  }

  // Save strategy
  const handleSave = async () => {
    if (!selectedStrategy || !editingConfig || !token) return

    setIsSaving(true)
    try {
      const response = await fetch(`${API_BASE}/api/strategies/${selectedStrategy.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: selectedStrategy.name,
          description: selectedStrategy.description || '',
          config: editingConfig,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save strategy')
      }

      notify.success('Cursor strategy saved successfully')
      setHasChanges(false)
      await fetchStrategies()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to save cursor strategy')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete strategy
  const handleDelete = async (strategyId: string) => {
    const confirmed = await confirmToast('Are you sure you want to delete this cursor strategy?')
    if (!confirmed || !token) return

    try {
      const response = await fetch(`${API_BASE}/api/strategies/${strategyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to delete strategy')

      notify.success('Cursor strategy deleted successfully')
      if (selectedStrategy?.id === strategyId) {
        setSelectedStrategy(null)
        setEditingConfig(null)
      }
      await fetchStrategies()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to delete cursor strategy')
    }
  }

  // Activate strategy
  const handleActivate = async (strategyId: string) => {
    if (!token) return
    try {
      const response = await fetch(`${API_BASE}/api/strategies/${strategyId}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to activate strategy')

      notify.success('Cursor strategy activated')
      await fetchStrategies()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to activate cursor strategy')
    }
  }

  // Generate prompt preview
  const handleGeneratePrompt = async () => {
    if (!selectedStrategy || !editingConfig || !token) return

    setIsLoadingPrompt(true)
    try {
      const response = await fetch(`${API_BASE}/api/strategies/${selectedStrategy.id}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          variant: selectedVariant,
          account_equity: 10000, // Default for preview
        }),
      })

      if (!response.ok) throw new Error('Failed to generate prompt')

      const data = await response.json()
      setPromptPreview(data)
      setActiveRightTab('prompt')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to generate prompt')
    } finally {
      setIsLoadingPrompt(false)
    }
  }

  // Run AI test
  const handleRunAiTest = async () => {
    if (!selectedStrategy || !editingConfig || !selectedModelId || !token) return

    setIsRunningAiTest(true)
    setAiTestResult(null)
    try {
      const response = await fetch(`${API_BASE}/api/strategies/${selectedStrategy.id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model_id: selectedModelId,
          variant: selectedVariant,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to run AI test')
      }

      const data = await response.json()
      setAiTestResult(data)
      setActiveRightTab('test')
    } catch (err) {
      setAiTestResult({
        error: err instanceof Error ? err.message : 'Unknown error',
      })
      setActiveRightTab('test')
    } finally {
      setIsRunningAiTest(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    )
  }

  const configSections = [
    {
      key: 'stockSource' as const,
      icon: Target,
      color: 'var(--primary)',
      title: 'Stock Source',
      content: editingConfig && (
        <StockSourceEditor
          config={editingConfig.stock_source}
          onChange={(stockSource) => updateConfig('stock_source', stockSource)}
          disabled={selectedStrategy?.is_default}
        />
      ),
    },
    {
      key: 'indicators' as const,
      icon: BarChart3,
      color: 'var(--primary)',
      title: 'Indicators',
      content: editingConfig && (
        <IndicatorEditor
          config={editingConfig.indicators}
          onChange={(indicators) => updateConfig('indicators', indicators)}
          disabled={selectedStrategy?.is_default}
        />
      ),
    },
    {
      key: 'riskControl' as const,
      icon: Shield,
      color: '#F6465D',
      title: 'Risk Control',
      content: editingConfig && (
        <RiskControlEditor
          config={editingConfig.risk_control}
          onChange={(riskControl) => updateConfig('risk_control', riskControl)}
          disabled={selectedStrategy?.is_default}
        />
      ),
    },
    {
      key: 'promptSections' as const,
      icon: FileText,
      color: '#58a6ff',
      title: 'Prompt Editor',
      content: editingConfig && (
        <PromptSectionsEditor
          config={editingConfig.prompt_sections}
          onChange={(promptSections) => updateConfig('prompt_sections', promptSections)}
          disabled={selectedStrategy?.is_default}
          language={language}
        />
      ),
    },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-[1920px] mx-auto px-6 py-6 pt-24">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <h1 className="text-3xl font-bold" style={{ color: '#F9FAFB' }}>
                Cursor Strategy Studio
              </h1>
              <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
                Configure and test cursor trading strategies with Phase 1 profit features
              </p>
              {selectedStrategy && (
                <div className="mt-3 flex items-center gap-2">
                  {editingStrategyName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tempStrategyName}
                        onChange={(e) => setTempStrategyName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveName()
                          } else if (e.key === 'Escape') {
                            handleCancelEditName()
                          }
                        }}
                        className="px-3 py-1.5 rounded text-sm font-medium"
                        style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#F9FAFB', minWidth: '200px' }}
                        autoFocus
                      />
                      <button
                        onClick={handleSaveName}
                        className="p-1.5 rounded hover:bg-[var(--bg-secondary)]/10 transition-colors"
                        style={{ color: '#0ecb81' }}
                        title="Save name"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEditName}
                        className="p-1.5 rounded hover:bg-[var(--bg-secondary)]/10 transition-colors"
                        style={{ color: '#ef4444' }}
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold" style={{ color: '#F9FAFB' }}>
                        {selectedStrategy.name}
                      </span>
                      {!selectedStrategy.is_default && (
                        <button
                          onClick={handleStartEditName}
                          className="p-1 rounded hover:bg-[var(--bg-secondary)]/10 transition-colors"
                          style={{ color: '#9CA3AF' }}
                          title="Edit strategy name"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            {selectedStrategy && (
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: hasChanges ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
                  color: hasChanges ? '#000' : '#9CA3AF',
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <p style={{ color: '#ef4444' }}>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel - Strategy List */}
          <div className="col-span-3">
            <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(22, 27, 34, 0.88)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>Cursor Strategies</span>
                <button
                  onClick={handleOpenCreateModal}
                  className="p-1 rounded hover:bg-[var(--bg-secondary)]/10 transition-colors"
                  style={{ color: 'var(--primary)' }}
                  title="Create New Cursor Strategy"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2 space-y-1">
                {strategies.length === 0 ? (
                  <div className="p-4 text-center text-sm" style={{ color: '#6B7280' }}>
                    No cursor strategies yet. Click + to create one.
                  </div>
                ) : (
                  strategies.map((strategy) => (
                    <div
                      key={strategy.id}
                      className={`group px-2 py-2 rounded-lg cursor-pointer transition-all ${selectedStrategy?.id === strategy.id ? 'ring-1 ring-yellow-500/50' : 'hover:bg-[var(--bg-secondary)]/5'
                        }`}
                      style={{
                        background: selectedStrategy?.id === strategy.id ? 'rgba(255, 184, 0, 0.1)' : 'transparent',
                      }}
                      onClick={() => {
                        if (hasChanges) {
                          confirmToast('You have unsaved changes. Discard?').then((confirmed) => {
                            if (confirmed) {
                              setSelectedStrategy(strategy)
                              setEditingConfig(strategy.config)
                              setHasChanges(false)
                            }
                          })
                        } else {
                          setSelectedStrategy(strategy)
                          setEditingConfig(strategy.config)
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium truncate" style={{ color: '#F9FAFB' }}>
                              {strategy.name}
                            </span>
                            {strategy.is_active && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: 'rgba(14, 203, 129, 0.2)', color: '#0ecb81' }}>
                                Active
                              </span>
                            )}
                          </div>
                          {strategy.description && (
                            <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                              {strategy.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!strategy.is_active && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleActivate(strategy.id)
                              }}
                              className="p-1 rounded hover:bg-[var(--bg-secondary)]/10"
                              title="Activate"
                            >
                              <Check className="w-3 h-3" style={{ color: '#0ecb81' }} />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(strategy.id)
                            }}
                            className="p-1 rounded hover:bg-[var(--bg-secondary)]/10"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" style={{ color: '#ef4444' }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Center Panel - Configuration */}
          <div className="col-span-6">
            {selectedStrategy && editingConfig ? (
              <div className="space-y-4">
                {configSections.map((section) => (
                  <div
                    key={section.key}
                    className="rounded-lg overflow-hidden"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  >
                    <button
                      onClick={() => toggleSection(section.key)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--bg-secondary)]/50 transition-colors"
                      style={{ background: 'rgba(22, 27, 34, 0.88)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
                    >
                      <div className="flex items-center gap-3">
                        <section.icon className="w-5 h-5" style={{ color: section.color }} />
                        <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>
                          {section.title}
                        </span>
                      </div>
                      {expandedSections[section.key] ? (
                        <ChevronDown className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                      ) : (
                        <ChevronRight className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                      )}
                    </button>

                    {expandedSections[section.key] && (
                      <div className="p-4">{section.content}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg p-12 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: '#9CA3AF' }} />
                <p className="text-lg font-medium mb-2" style={{ color: '#F9FAFB' }}>
                  No Cursor Strategy Selected
                </p>
                <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
                  Select a cursor strategy from the list or create a new one
                </p>
                <button
                  onClick={handleCreateStrategy}
                  className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 mx-auto"
                  style={{ background: 'var(--primary)', color: '#000' }}
                >
                  <Plus className="w-4 h-4" />
                  Create Cursor Strategy
                </button>
              </div>
            )}
          </div>

          {/* Right Panel - Prompt Preview & Testing */}
          <div className="col-span-3">
            <div className="rounded-lg overflow-hidden sticky top-24" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(22, 27, 34, 0.88)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  onClick={() => setActiveRightTab('prompt')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeRightTab === 'prompt' ? '' : 'opacity-50'
                    }`}
                  style={{
                    background: activeRightTab === 'prompt' ? 'var(--primary)' : 'transparent',
                    color: activeRightTab === 'prompt' ? '#000' : '#9CA3AF',
                  }}
                >
                  Prompt Preview
                </button>
                <button
                  onClick={() => setActiveRightTab('test')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeRightTab === 'test' ? '' : 'opacity-50'
                    }`}
                  style={{
                    background: activeRightTab === 'test' ? 'var(--primary)' : 'transparent',
                    color: activeRightTab === 'test' ? '#000' : '#9CA3AF',
                  }}
                >
                  AI Test
                </button>
              </div>

              <div className="p-4 space-y-4">
                {activeRightTab === 'prompt' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedVariant}
                        onChange={(e) => setSelectedVariant(e.target.value)}
                        className="flex-1 px-3 py-2 rounded text-xs"
                        style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                      >
                        <option value="balanced">Balanced</option>
                        <option value="aggressive">Aggressive</option>
                        <option value="conservative">Conservative</option>
                        <option value="scalping">Scalping</option>
                      </select>
                      <button
                        onClick={handleGeneratePrompt}
                        disabled={!selectedStrategy || isLoadingPrompt}
                        className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                        style={{ background: 'var(--primary)', color: '#000' }}
                      >
                        {isLoadingPrompt ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Generate
                          </>
                        )}
                      </button>
                    </div>

                    {promptPreview ? (
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-xs font-medium mb-2" style={{ color: '#F9FAFB' }}>System Prompt</h4>
                          <pre className="p-3 rounded text-xs overflow-auto max-h-96" style={{ background: 'rgba(22, 27, 34, 0.88)', color: '#9CA3AF', fontSize: '10px' }}>
                            {promptPreview.system_prompt}
                          </pre>
                        </div>
                        {promptPreview.user_prompt && (
                          <div>
                            <h4 className="text-xs font-medium mb-2" style={{ color: '#F9FAFB' }}>User Prompt</h4>
                            <pre className="p-3 rounded text-xs overflow-auto" style={{ background: 'rgba(22, 27, 34, 0.88)', color: '#9CA3AF', fontSize: '10px' }}>
                              {promptPreview.user_prompt}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" style={{ color: '#9CA3AF' }} />
                        <p className="text-xs" style={{ color: '#6B7280' }}>
                          Click to generate prompt preview
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-xs mb-2 block" style={{ color: '#9CA3AF' }}>AI Model</label>
                      <select
                        value={selectedModelId}
                        onChange={(e) => setSelectedModelId(e.target.value)}
                        className="w-full px-3 py-2 rounded text-xs"
                        style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                      >
                        {aiModels.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleRunAiTest}
                      disabled={!selectedStrategy || !selectedModelId || isRunningAiTest}
                      className="w-full px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: 'var(--primary)', color: '#000' }}
                    >
                      {isRunningAiTest ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Run AI Test
                        </>
                      )}
                    </button>

                    {aiTestResult && (
                      <div className="space-y-3">
                        {aiTestResult.error ? (
                          <div className="p-3 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            <p className="text-xs" style={{ color: '#ef4444' }}>{aiTestResult.error}</p>
                          </div>
                        ) : (
                          <>
                            {aiTestResult.ai_response && (
                              <div>
                                <h4 className="text-xs font-medium mb-2" style={{ color: '#F9FAFB' }}>AI Response</h4>
                                <pre className="p-3 rounded text-xs overflow-auto max-h-64" style={{ background: 'rgba(22, 27, 34, 0.88)', color: '#9CA3AF', fontSize: '10px' }}>
                                  {aiTestResult.ai_response}
                                </pre>
                              </div>
                            )}
                            {aiTestResult.duration_ms && (
                              <p className="text-xs text-right" style={{ color: '#6B7280' }}>
                                Duration: {aiTestResult.duration_ms}ms
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Strategy Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div
            className="rounded-lg p-6 max-w-md w-full mx-4"
            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#F9FAFB' }}>Create Cursor Strategy</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded hover:bg-[var(--bg-secondary)]/10 transition-colors"
                style={{ color: '#9CA3AF' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: '#F9FAFB' }}>
                  Strategy Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newStrategyName}
                  onChange={(e) => setNewStrategyName(e.target.value)}
                  placeholder="e.g., My Cursor Strategy"
                  className="w-full px-3 py-2 rounded text-sm"
                  style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newStrategyName.trim()) {
                      handleCreateStrategy()
                    }
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: '#F9FAFB' }}>
                  Description (Optional)
                </label>
                <textarea
                  value={newStrategyDescription}
                  onChange={(e) => setNewStrategyDescription(e.target.value)}
                  placeholder="Cursor strategy with Phase 1 profit features"
                  rows={3}
                  className="w-full px-3 py-2 rounded text-sm resize-none"
                  style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleCreateStrategy}
                  disabled={!newStrategyName.trim()}
                  className="flex-1 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'var(--primary)', color: '#000' }}
                >
                  <Plus className="w-4 h-4" />
                  Create Strategy
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg font-medium"
                  style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#9CA3AF' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}