import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import {
  Plus,
  Copy,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Settings,
  BarChart3,
  Target,
  Shield,
  Zap,
  Activity,
  Save,
  Sparkles,
  Eye,
  Play,
  FileText,
  Loader2,
  RefreshCw,
  Clock,
  Bot,
  Terminal,
  Code,
  Send,
  Download,
  Upload,
} from 'lucide-react'
import type { Strategy, StrategyConfig, AIModel } from '../types'
import { confirmToast, notify } from '../lib/notify'
import { StockSourceEditor } from '../components/strategy/StockSourceEditor'
import { IndicatorEditor } from '../components/strategy/IndicatorEditor'
import { RiskControlEditor } from '../components/strategy/RiskControlEditor'
import { PromptSectionsEditor } from '../components/strategy/PromptSectionsEditor'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export function StrategyStudioPage() {
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
    indicators: false,
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
        // backendreturn'sis array，is not { models: [] }
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

  // Fetch strategies
  const fetchStrategies = useCallback(async () => {
    if (!token) return
    try {
      const response = await fetch(`${API_BASE}/api/strategies`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Failed to fetch strategies')
      const data = await response.json()
      // Filter strategies to only show "default" type strategies (General Strategy Studio)
      // Exclude strategies that belong to other pages (sonnet, opus, current, cursor)
      const defaultStrategies = (data.strategies || []).filter((s: Strategy) => {
        const strategyType = (s as any).strategy_type || ''
        const name = s.name.toLowerCase()
        const desc = (s.description || '').toLowerCase()

        // If strategy has a type, only include 'default' type
        if (strategyType) {
          return strategyType === 'default'
        }

        // For legacy strategies without strategy_type, exclude those that match other pages
        if (name.includes('sonnet') || desc.includes('sonnet')) return false
        if (name.includes('opus') || desc.includes('opus')) return false
        if (name.includes('current') || desc.includes('current')) return false
        if (name.includes('cursor') || desc.includes('cursor')) return false

        return true
      })
      setStrategies(defaultStrategies)

      // Select active or first strategy from filtered list
      const active = defaultStrategies.find((s: Strategy) => s.is_active)
      if (active) {
        setSelectedStrategy(active)
        setEditingConfig(active.config)
      } else if (defaultStrategies.length > 0) {
        setSelectedStrategy(defaultStrategies[0])
        setEditingConfig(defaultStrategies[0].config)
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

  // Create new strategy
  const handleCreateStrategy = async () => {
    if (!token) return
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
          name: 'New Strategy',
          description: '',
          config: defaultConfig,
          strategy_type: 'default',  // Set type so it only appears on Default page
        }),
      })
      if (!response.ok) throw new Error('Failed to create strategy')
      const result = await response.json()
      await fetchStrategies()
      // Auto-select the newly created strategy
      if (result.id) {
        const now = new Date().toISOString()
        const newStrategy = {
          id: result.id,
          name: 'New Strategy',
          description: '',
          is_active: false,
          is_default: false,
          config: defaultConfig,
          created_at: now,
          updated_at: now,
        }
        setSelectedStrategy(newStrategy)
        setEditingConfig(defaultConfig)
        setHasChanges(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Delete strategy
  const handleDeleteStrategy = async (id: string) => {
    if (!token) return

    const confirmed = await confirmToast(
      'Delete this strategy?',
      {
        title: 'Confirm Delete',
        okText: 'Delete',
        cancelText: 'Cancel',
      }
    )
    if (!confirmed) return

    try {
      const response = await fetch(`${API_BASE}/api/strategies/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Failed to delete strategy')
      notify.success('Strategy deleted')
      // Clear selection if deleted strategy was selected
      if (selectedStrategy?.id === id) {
        setSelectedStrategy(null)
        setEditingConfig(null)
        setHasChanges(false)
      }
      await fetchStrategies()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      notify.error(errorMsg)
    }
  }

  // Duplicate strategy
  const handleDuplicateStrategy = async (id: string) => {
    if (!token) return
    try {
      const response = await fetch(`${API_BASE}/api/strategies/${id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'Strategy Copy',
        }),
      })
      if (!response.ok) throw new Error('Failed to duplicate strategy')
      await fetchStrategies()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Activate strategy
  const handleActivateStrategy = async (id: string) => {
    if (!token) return
    try {
      const response = await fetch(`${API_BASE}/api/strategies/${id}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Failed to activate strategy')
      await fetchStrategies()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Deactivate strategy
  const handleDeactivateStrategy = async (id: string) => {
    if (!token) return
    try {
      const response = await fetch(`${API_BASE}/api/strategies/${id}/deactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Failed to deactivate strategy')
      await fetchStrategies()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Export strategy as JSON file
  const handleExportStrategy = (strategy: Strategy) => {
    const exportData = {
      name: strategy.name,
      description: strategy.description,
      config: strategy.config,
      exported_at: new Date().toISOString(),
      version: '1.0',
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `strategy_${strategy.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    notify.success('Strategy exported')
  }

  // Import strategy from JSON file
  const handleImportStrategy = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !token) return

    try {
      const text = await file.text()
      const importData = JSON.parse(text)

      // Validate imported data
      if (!importData.config || !importData.name) {
        throw new Error('Invalid strategy file')
      }

      // Create new strategy with imported config
      const response = await fetch(`${API_BASE}/api/strategies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: `${importData.name} (${'Imported'})`,
          description: importData.description || '',
          config: importData.config,
        }),
      })
      if (!response.ok) throw new Error('Failed to import strategy')

      notify.success('Strategy imported')
      await fetchStrategies()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      notify.error(errorMsg)
    } finally {
      // Reset file input
      event.target.value = ''
    }
  }

  // Save strategy
  const handleSaveStrategy = async () => {
    if (!token || !selectedStrategy || !editingConfig) return
    setIsSaving(true)
    try {
      const response = await fetch(
        `${API_BASE}/api/strategies/${selectedStrategy.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: selectedStrategy.name,
            description: selectedStrategy.description,
            config: editingConfig,
          }),
        }
      )
      if (!response.ok) throw new Error('Failed to save strategy')
      setHasChanges(false)
      await fetchStrategies()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsSaving(false)
    }
  }

  // Update config section
  const updateConfig = <K extends keyof StrategyConfig>(
    section: K,
    value: StrategyConfig[K]
  ) => {
    if (!editingConfig) return
    setEditingConfig({
      ...editingConfig,
      [section]: value,
    })
    setHasChanges(true)
  }

  // Fetch prompt preview
  const fetchPromptPreview = async () => {
    if (!token || !editingConfig) return
    setIsLoadingPrompt(true)
    try {
      const response = await fetch(`${API_BASE}/api/strategies/preview-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          config: editingConfig,
          account_equity: 1000,
          prompt_variant: selectedVariant,
        }),
      })
      if (!response.ok) throw new Error('Failed to fetch prompt preview')
      const data = await response.json()
      setPromptPreview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoadingPrompt(false)
    }
  }

  // Run AI test with real AI model
  const runAiTest = async () => {
    if (!token || !editingConfig || !selectedModelId) return
    setIsRunningAiTest(true)
    setAiTestResult(null)
    try {
      const response = await fetch(`${API_BASE}/api/strategies/test-run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          config: editingConfig,
          prompt_variant: selectedVariant,
          ai_model_id: selectedModelId,
          run_real_ai: true,
        }),
      })
      if (!response.ok) throw new Error('Failed to run AI test')
      const data = await response.json()
      setAiTestResult(data)
    } catch (err) {
      setAiTestResult({
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setIsRunningAiTest(false)
    }
  }

  const t = (key: string) => {
    const translations: Record<string, string> = {
      strategyStudio: 'Strategy Studio',
      subtitle: 'Configure and test trading strategies',
      strategies: 'Strategies',
      newStrategy: 'New',
      stockSource: 'Stock Source',
      indicators: 'Indicators',
      riskControl: 'Risk Control',
      promptSections: 'Prompt Editor',
      customPrompt: 'Extra Prompt',
      save: 'Save',
      saving: 'Saving...',
      activate: 'Activate',
      deactivate: 'Deactivate',
      active: 'Active',
      default: 'Default',
      promptPreview: 'Prompt Preview',
      aiTestRun: 'AI Test',
      systemPrompt: 'System Prompt',
      userPrompt: 'User Prompt',
      loadPrompt: 'Generate Prompt',
      refreshPrompt: 'Refresh',
      promptVariant: 'Style',
      balanced: 'Balanced',
      aggressive: 'Aggressive',
      conservative: 'Conservative',
      selectModel: 'Select AI Model',
      runTest: 'Run AI Test',
      running: 'Running...',
      aiOutput: 'AI Output',
      reasoning: 'Reasoning',
      decisions: 'Decisions',
      duration: 'Duration',
      noModel: 'Please configure AI model first',
      testNote: 'Test with real AI, no trading',
    }
    return translations[key] || key
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-yellow-500/20 border-t-yellow-500 animate-spin" />
            <Zap className="w-6 h-6 text-yellow-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>
    )
  }

  const configSections = [
    {
      key: 'stockSource' as const,
      icon: Target,
      color: 'var(--primary)',
      title: t('stockSource'),
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
      title: t('indicators'),
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
      title: t('riskControl'),
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
      color: 'var(--primary)',
      title: t('promptSections'),
      content: editingConfig && (
        <PromptSectionsEditor
          config={editingConfig.prompt_sections}
          onChange={(promptSections) => updateConfig('prompt_sections', promptSections)}
          disabled={selectedStrategy?.is_default}
          language={language}
        />
      ),
    },
    {
      key: 'customPrompt' as const,
      icon: Settings,
      color: '#60a5fa',
      title: t('customPrompt'),
      content: editingConfig && (
        <div>
          <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
            {'Extra prompt appended to System Prompt for personalized trading style'}
          </p>
          <textarea
            value={editingConfig.custom_prompt || ''}
            onChange={(e) => updateConfig('custom_prompt', e.target.value)}
            disabled={selectedStrategy?.is_default}
            placeholder={'Enter custom prompt...'}
            className="w-full h-32 px-3 py-2 rounded-lg resize-none font-mono text-xs"
            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)' }}>
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: '#F9FAFB' }}>{t('strategyStudio')}</h1>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>{t('subtitle')}</p>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(246, 70, 93, 0.1)', color: '#F6465D' }}>
              {error}
              <button onClick={() => setError(null)} className="hover:underline">×</button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Three Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Strategy List */}
        <div className="w-48 flex-shrink-0 border-r overflow-y-auto" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
          <div className="p-2">
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>{t('strategies')}</span>
              <div className="flex items-center gap-1">
                {/* Import button with hidden file input */}
                <label className="p-1 rounded hover:bg-[var(--bg-secondary)]/10 transition-colors cursor-pointer" style={{ color: '#9CA3AF' }} title={'Import Strategy'}>
                  <Upload className="w-4 h-4" />
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportStrategy}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={handleCreateStrategy}
                  className="p-1 rounded hover:bg-[var(--bg-secondary)]/10 transition-colors"
                  style={{ color: 'var(--primary)' }}
                  title={'New Strategy'}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              {strategies.map((strategy) => (
                <div
                  key={strategy.id}
                  onClick={() => {
                    setSelectedStrategy(strategy)
                    setEditingConfig(strategy.config)
                    setHasChanges(false)
                    setPromptPreview(null)
                    setAiTestResult(null)
                  }}
                  className={`group px-2 py-2 rounded-lg cursor-pointer transition-all ${selectedStrategy?.id === strategy.id ? 'ring-1 ring-yellow-500/50' : 'hover:bg-[var(--bg-secondary)]/5'
                    }`}
                  style={{
                    background: selectedStrategy?.id === strategy.id ? 'var(--primary-bg, 0.1)' : 'transparent',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm truncate" style={{ color: '#F9FAFB' }}>{strategy.name}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExportStrategy(strategy) }}
                        className="p-1 rounded hover:bg-[var(--bg-secondary)]/10"
                        title={'Export'}
                      >
                        <Download className="w-3 h-3" style={{ color: '#9CA3AF' }} />
                      </button>
                      {!strategy.is_default && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDuplicateStrategy(strategy.id) }}
                            className="p-1 rounded hover:bg-[var(--bg-secondary)]/10"
                            title={'Duplicate'}
                          >
                            <Copy className="w-3 h-3" style={{ color: '#9CA3AF' }} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteStrategy(strategy.id) }}
                            className="p-1 rounded hover:bg-red-500/20"
                            title={'Delete'}
                          >
                            <Trash2 className="w-3 h-3" style={{ color: '#F6465D' }} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {strategy.is_active && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded" style={{ background: 'rgba(14, 203, 129, 0.15)', color: 'var(--primary)' }}>
                        {t('active')}
                      </span>
                    )}
                    {strategy.is_default && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded" style={{ background: 'var(--primary-bg, 0.15)', color: 'var(--primary)' }}>
                        {t('default')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Column - Config Editor */}
        <div className="flex-1 min-w-0 overflow-y-auto border-r" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
          {selectedStrategy && editingConfig ? (
            <div className="p-4">
              {/* Strategy Name & Actions */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={selectedStrategy.name}
                    onChange={(e) => {
                      setSelectedStrategy({ ...selectedStrategy, name: e.target.value })
                      setHasChanges(true)
                    }}
                    disabled={selectedStrategy.is_default}
                    className="text-lg font-bold bg-transparent border-none outline-none w-full"
                    style={{ color: '#F9FAFB' }}
                  />
                  {hasChanges && (
                    <span className="text-xs" style={{ color: 'var(--primary)' }}>● Unsaved</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {selectedStrategy.is_active ? (
                    <button
                      onClick={() => handleDeactivateStrategy(selectedStrategy.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors"
                      style={{ background: 'rgba(246, 70, 93, 0.1)', border: '1px solid rgba(246, 70, 93, 0.3)', color: '#F6465D' }}
                    >
                      <X className="w-3 h-3" />
                      {t('deactivate')}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleActivateStrategy(selectedStrategy.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors"
                      style={{ background: 'rgba(14, 203, 129, 0.1)', border: '1px solid rgba(14, 203, 129, 0.3)', color: 'var(--primary)' }}
                    >
                      <Check className="w-3 h-3" />
                      {t('activate')}
                    </button>
                  )}
                  {!selectedStrategy.is_default && (
                    <button
                      onClick={handleSaveStrategy}
                      disabled={isSaving || !hasChanges}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      style={{
                        background: hasChanges ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)',
                        color: hasChanges ? '#000000' : '#9CA3AF',
                      }}
                    >
                      <Save className="w-3 h-3" />
                      {isSaving ? t('saving') : t('save')}
                    </button>
                  )}
                </div>
              </div>

              {/* Config Sections */}
              <div className="space-y-2">
                {configSections.map(({ key, icon: Icon, color, title, content }) => (
                  <div
                    key={key}
                    className="rounded-lg overflow-hidden"
                    style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  >
                    <button
                      onClick={() => toggleSection(key)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--bg-secondary)]/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" style={{ color }} />
                        <span className="text-sm font-medium" style={{ color: '#F9FAFB' }}>{title}</span>
                      </div>
                      {expandedSections[key] ? (
                        <ChevronDown className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                      ) : (
                        <ChevronRight className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                      )}
                    </button>
                    {expandedSections[key] && (
                      <div className="px-3 pb-3">
                        {content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-30" style={{ color: '#9CA3AF' }} />
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  {'Select or create a strategy'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Prompt Preview & AI Test */}
        <div className="w-[420px] flex-shrink-0 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex-shrink-0 flex border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
            <button
              onClick={() => setActiveRightTab('prompt')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${activeRightTab === 'prompt' ? 'border-b-2' : 'opacity-60 hover:opacity-100'
                }`}
              style={{
                borderColor: activeRightTab === 'prompt' ? 'var(--primary)' : 'transparent',
                color: activeRightTab === 'prompt' ? 'var(--primary)' : '#9CA3AF',
              }}
            >
              <Eye className="w-4 h-4" />
              {t('promptPreview')}
            </button>
            <button
              onClick={() => setActiveRightTab('test')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${activeRightTab === 'test' ? 'border-b-2' : 'opacity-60 hover:opacity-100'
                }`}
              style={{
                borderColor: activeRightTab === 'test' ? '#22c55e' : 'transparent',
                color: activeRightTab === 'test' ? '#22c55e' : '#9CA3AF',
              }}
            >
              <Play className="w-4 h-4" />
              {t('aiTestRun')}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeRightTab === 'prompt' ? (
              /* Prompt Preview Tab */
              <div className="p-3 space-y-3">
                {/* Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedVariant}
                    onChange={(e) => setSelectedVariant(e.target.value)}
                    className="px-2 py-1.5 rounded text-xs"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                  >
                    <option value="balanced">{t('balanced')}</option>
                    <option value="aggressive">{t('aggressive')}</option>
                    <option value="conservative">{t('conservative')}</option>
                  </select>
                  <button
                    onClick={fetchPromptPreview}
                    disabled={isLoadingPrompt || !editingConfig}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                    style={{ background: 'var(--primary)', color: '#000' }}
                  >
                    {isLoadingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    {promptPreview ? t('refreshPrompt') : t('loadPrompt')}
                  </button>
                </div>

                {promptPreview ? (
                  <>
                    {/* Config Summary */}
                    <div className="p-2 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Code className="w-3 h-3" style={{ color: 'var(--primary)' }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--primary)' }}>Config</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {Object.entries(promptPreview.config_summary || {}).map(([key, value]) => (
                          <div key={key}>
                            <div style={{ color: '#9CA3AF' }}>{key.replace(/_/g, ' ')}</div>
                            <div style={{ color: '#F9FAFB' }}>{String(value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* System Prompt */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3 h-3" style={{ color: 'var(--primary)' }} />
                          <span className="text-xs font-medium" style={{ color: '#F9FAFB' }}>{t('systemPrompt')}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#9CA3AF' }}>
                          {promptPreview.system_prompt.length.toLocaleString()} chars
                        </span>
                      </div>
                      <pre
                        className="p-2 rounded-lg text-[11px] font-mono overflow-auto"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB', maxHeight: '400px' }}
                      >
                        {promptPreview.system_prompt}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12" style={{ color: '#9CA3AF' }}>
                    <Eye className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">{'Click to generate prompt preview'}</p>
                  </div>
                )}
              </div>
            ) : (
              /* AI Test Tab */
              <div className="p-3 space-y-3">
                {/* Controls */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4" style={{ color: '#22c55e' }} />
                    <span className="text-xs font-medium" style={{ color: '#F9FAFB' }}>{t('selectModel')}</span>
                  </div>
                  {aiModels.length > 0 ? (
                    <select
                      value={selectedModelId}
                      onChange={(e) => setSelectedModelId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                    >
                      {aiModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.provider})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(246, 70, 93, 0.1)', color: '#F6465D' }}>
                      {t('noModel')}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedVariant}
                      onChange={(e) => setSelectedVariant(e.target.value)}
                      className="px-2 py-1.5 rounded text-xs"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                    >
                      <option value="balanced">{t('balanced')}</option>
                      <option value="aggressive">{t('aggressive')}</option>
                      <option value="conservative">{t('conservative')}</option>
                    </select>
                    <button
                      onClick={runAiTest}
                      disabled={isRunningAiTest || !editingConfig || !selectedModelId}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                      }}
                    >
                      {isRunningAiTest ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t('running')}
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          {t('runTest')}
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px]" style={{ color: '#9CA3AF' }}>{t('testNote')}</p>
                </div>

                {/* Test Results */}
                {aiTestResult ? (
                  <div className="space-y-3">
                    {aiTestResult.error ? (
                      <div className="p-3 rounded-lg" style={{ background: 'rgba(246, 70, 93, 0.1)', border: '1px solid rgba(246, 70, 93, 0.3)' }}>
                        <p className="text-sm" style={{ color: '#F6465D' }}>{aiTestResult.error}</p>
                      </div>
                    ) : (
                      <>
                        {aiTestResult.duration_ms && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" style={{ color: '#9CA3AF' }} />
                            <span className="text-xs" style={{ color: '#9CA3AF' }}>
                              {t('duration')}: {(aiTestResult.duration_ms / 1000).toFixed(2)}s
                            </span>
                          </div>
                        )}

                        {/* User Prompt Input */}
                        {aiTestResult.user_prompt && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Terminal className="w-3 h-3" style={{ color: '#60a5fa' }} />
                              <span className="text-xs font-medium" style={{ color: '#F9FAFB' }}>{t('userPrompt')} (Input)</span>
                            </div>
                            <pre
                              className="p-2 rounded-lg text-[10px] font-mono overflow-auto"
                              style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB', maxHeight: '200px' }}
                            >
                              {aiTestResult.user_prompt}
                            </pre>
                          </div>
                        )}

                        {/* AI Reasoning */}
                        {aiTestResult.reasoning && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Sparkles className="w-3 h-3" style={{ color: 'var(--primary)' }} />
                              <span className="text-xs font-medium" style={{ color: '#F9FAFB' }}>{t('reasoning')}</span>
                            </div>
                            <pre
                              className="p-2 rounded-lg text-[10px] font-mono overflow-auto whitespace-pre-wrap"
                              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--primary-bg, 0.3)', color: '#F9FAFB', maxHeight: '200px' }}
                            >
                              {aiTestResult.reasoning}
                            </pre>
                          </div>
                        )}

                        {/* AI Decisions */}
                        {aiTestResult.decisions && aiTestResult.decisions.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Activity className="w-3 h-3" style={{ color: '#22c55e' }} />
                              <span className="text-xs font-medium" style={{ color: '#F9FAFB' }}>{t('decisions')}</span>
                            </div>
                            <pre
                              className="p-2 rounded-lg text-[10px] font-mono overflow-auto"
                              style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#F9FAFB', maxHeight: '200px' }}
                            >
                              {JSON.stringify(aiTestResult.decisions, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Raw AI Response */}
                        {aiTestResult.ai_response && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <FileText className="w-3 h-3" style={{ color: '#9CA3AF' }} />
                              <span className="text-xs font-medium" style={{ color: '#F9FAFB' }}>{t('aiOutput')} (Raw)</span>
                            </div>
                            <pre
                              className="p-2 rounded-lg text-[10px] font-mono overflow-auto whitespace-pre-wrap"
                              style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB', maxHeight: '300px' }}
                            >
                              {aiTestResult.ai_response}
                            </pre>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12" style={{ color: '#9CA3AF' }}>
                    <Play className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">{'Click to run AI test'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StrategyStudioPage
