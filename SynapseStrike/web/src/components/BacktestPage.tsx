import { useEffect, useMemo, useState, useCallback, type FormEvent } from 'react'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  Square,
  Download,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Brain,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Layers,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from 'recharts'
import { api } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { confirmToast } from '../lib/notify'
import { DecisionCard } from './DecisionCard'
import type {
  BacktestStatusPayload,
  BacktestEquityPoint,
  BacktestTradeEvent,
  BacktestMetrics,
  DecisionRecord,
  AIModel,
} from '../types'

// ============ Types ============
type WizardStep = 1 | 2 | 3
type ViewTab = 'overview' | 'chart' | 'trades' | 'decisions' | 'compare'

const TIMEFRAME_OPTIONS = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d']
const POPULAR_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META']

// ============ Helper Functions ============
const toLocalInput = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}


// ============ Sub Components ============

// Stats Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  trend,
  color = '#F9FAFB',
}: {
  icon: typeof TrendingUp
  label: string
  value: string | number
  suffix?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: string
}) {
  const trendColors = {
    up: 'var(--primary)',
    down: '#EF4444',
    neutral: '#6B7280',
  }

  return (
    <div
      className="p-4 rounded-xl glass-panel"
      style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: 'rgb(195, 245, 60)' }} />
        <span className="text-xs" style={{ color: '#9CA3AF' }}>
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold" style={{ color: color === '#F9FAFB' ? '#F9FAFB' : color }}>
          {value}
        </span>
        {suffix && (
          <span className="text-xs" style={{ color: '#6B7280' }}>
            {suffix}
          </span>
        )}
        {trend && trend !== 'neutral' && (
          <span style={{ color: trendColors[trend] }}>
            {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          </span>
        )}
      </div>
    </div>
  )
}

// Progress Ring Component
function ProgressRing({ progress, size = 120 }: { progress: number; size?: number }) {
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--primary)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
          {progress.toFixed(0)}%
        </span>
        <span className="text-xs" style={{ color: '#9CA3AF' }}>
          Complete
        </span>
      </div>
    </div>
  )
}

// Equity Chart Component using Recharts
function BacktestChart({
  equity,
  trades,
}: {
  equity: BacktestEquityPoint[]
  trades: BacktestTradeEvent[]
}) {
  const chartData = useMemo(() => {
    return equity.map((point) => ({
      time: new Date(point.ts).toLocaleString(),
      ts: point.ts,
      equity: point.equity,
      pnl_pct: point.pnl_pct,
    }))
  }, [equity])

  // Find trade points to mark on chart
  const tradeMarkers = useMemo(() => {
    if (!trades.length || !equity.length) return []
    return trades
      .filter((t) => t.action.includes('open') || t.action.includes('close'))
      .map((trade) => {
        // Find closest equity point
        const closest = equity.reduce((prev, curr) =>
          Math.abs(curr.ts - trade.ts) < Math.abs(prev.ts - trade.ts) ? curr : prev
        )
        return {
          ts: closest.ts,
          equity: closest.equity,
          action: trade.action,
          symbol: trade.symbol,
          isOpen: trade.action.includes('open'),
        }
      })
      .slice(-30) // Limit markers
  }, [trades, equity])

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(43, 49, 57, 0.5)" strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
            tickLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
            hide
          />
          <YAxis
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
            tickLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
            width={60}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(22, 27, 34, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              color: '#F9FAFB',
            }}
            labelStyle={{ color: '#9CA3AF' }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Equity']}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#equityGradient)"
            dot={false}
            activeDot={{ r: 4, fill: 'var(--primary)' }}
          />
          {/* Trade markers */}
          {tradeMarkers.map((marker, idx) => (
            <ReferenceDot
              key={`${marker.ts}-${idx}`}
              x={chartData.findIndex((d) => d.ts === marker.ts)}
              y={marker.equity}
              r={4}
              fill={marker.isOpen ? 'var(--primary)' : '#F6465D'}
              stroke={marker.isOpen ? 'var(--primary)' : '#F6465D'}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Trade Timeline Component
function TradeTimeline({ trades }: { trades: BacktestTradeEvent[] }) {
  const recentTrades = useMemo(() => [...trades].slice(-20).reverse(), [trades])

  if (recentTrades.length === 0) {
    return (
      <div className="py-12 text-center" style={{ color: '#6B7280' }}>
        No trades yet
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
      {recentTrades.map((trade, idx) => {
        const isOpen = trade.action.includes('open')
        const isLong = trade.action.includes('long')
        const bgColor = isOpen ? 'rgba(14, 203, 129, 0.1)' : 'rgba(246, 70, 93, 0.1)'
        const borderColor = isOpen ? 'rgba(14, 203, 129, 0.3)' : 'rgba(246, 70, 93, 0.3)'
        const iconColor = isOpen ? 'var(--primary)' : '#F6465D'

        return (
          <motion.div
            key={`${trade.ts}-${trade.symbol}-${idx}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-3 rounded-lg flex items-center gap-3"
            style={{ background: bgColor, border: `1px solid ${borderColor}` }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: `${iconColor}20` }}
            >
              {isLong ? (
                <TrendingUp className="w-4 h-4" style={{ color: iconColor }} />
              ) : (
                <TrendingDown className="w-4 h-4" style={{ color: iconColor }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm" style={{ color: '#F9FAFB' }}>
                  {trade.symbol.replace('', '')}
                </span>
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{ background: `${iconColor}20`, color: iconColor }}
                >
                  {trade.action.replace('_', ' ').toUpperCase()}
                </span>
                {trade.margin && (
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>
                    {trade.margin}x
                  </span>
                )}
              </div>
              <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                {new Date(trade.ts).toLocaleString()} · Qty: {trade.qty.toFixed(4)} · ${trade.price.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div
                className="font-mono font-bold"
                style={{ color: trade.realized_pnl >= 0 ? 'var(--primary)' : '#F6465D' }}
              >
                {trade.realized_pnl >= 0 ? '+' : ''}
                {trade.realized_pnl.toFixed(2)}
              </div>
              <div className="text-xs" style={{ color: '#9CA3AF' }}>

              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ============ Main Component ============
export function BacktestPage() {
  const { language } = useLanguage()
  const tr = useCallback(
    (key: string, params?: Record<string, string | number>) => t(`backtestPage.${key}`, language, params),
    [language]
  )

  // State
  const now = new Date()
  const [wizardStep, setWizardStep] = useState<WizardStep>(1)
  const [viewTab, setViewTab] = useState<ViewTab>('overview')
  const [selectedRunId, setSelectedRunId] = useState<string>()
  const [compareRunIds, setCompareRunIds] = useState<string[]>([])
  const [isStarting, setIsStarting] = useState(false)
  const [toast, setToast] = useState<{ text: string; tone: 'info' | 'error' | 'success' } | null>(null)

  // Form state
  const [formState, setFormState] = useState({
    runId: '',
    symbols: 'AAPL,MSFT,GOOGL',
    timeframes: ['3m', '15m', '4h'],
    decisionTf: '3m',
    cadence: 20,
    start: toLocalInput(new Date(now.getTime() - 3 * 24 * 3600 * 1000)),
    end: toLocalInput(now),
    balance: 1000,
    fee: 5,
    slippage: 2,
    largeCapMargin: 5,
    smallCapMargin: 5,
    fill: 'next_open',
    prompt: 'baseline',
    promptTemplate: 'default',
    customPrompt: '',
    overridePrompt: false,
    cacheAI: true,
    replayOnly: false,
    aiModelId: '',
    ai100ApiUrl: 'http://24.12.59.214:8082/api/ai100/list?auth=pluq8P0XTgucCN6kyxey5EPTof36R54lQc3rfgQsoNQ&sort=fin&limit=100',
    ai100Limit: 100,
    showDataSourceConfig: false,
    useAi100: false,
    // Strategy selection for backtest
    strategyType: '' as '' | 'strategies' | 'sonnet' | 'opus' | 'current' | 'cursor',
    strategyId: '',
    enableVwapAlgorithm: false,
    vwapEntryTime: '10:00',
  })

  // Data fetching
  const { data: runsResp, mutate: refreshRuns } = useSWR(['backtest-runs'], () =>
    api.getBacktestRuns({ limit: 100, offset: 0 })
    , { refreshInterval: 5000 })
  const runs = runsResp?.items ?? []

  const { data: aiModels } = useSWR<AIModel[]>('ai-models', api.getModelConfigs, { refreshInterval: 30000 })

  // Fetch strategies and tactics for selection
  const { data: strategiesData } = useSWR('strategies-list', () => api.getStrategies(), { refreshInterval: 60000 })
  const { data: tacticsData } = useSWR('tactics-list', () => api.getTactics(), { refreshInterval: 60000 })
  const strategies = strategiesData ?? []
  const tactics = tacticsData?.tactics ?? []

  const { data: status } = useSWR<BacktestStatusPayload>(
    selectedRunId ? ['bt-status', selectedRunId] : null,
    () => api.getBacktestStatus(selectedRunId!),
    { refreshInterval: 2000 }
  )

  const { data: equity } = useSWR<BacktestEquityPoint[]>(
    selectedRunId ? ['bt-equity', selectedRunId] : null,
    () => api.getBacktestEquity(selectedRunId!, '1m', 2000),
    { refreshInterval: 5000 }
  )

  const { data: trades } = useSWR<BacktestTradeEvent[]>(
    selectedRunId ? ['bt-trades', selectedRunId] : null,
    () => api.getBacktestTrades(selectedRunId!, 500),
    { refreshInterval: 5000 }
  )

  const { data: metrics } = useSWR<BacktestMetrics>(
    selectedRunId ? ['bt-metrics', selectedRunId] : null,
    () => api.getBacktestMetrics(selectedRunId!),
    { refreshInterval: 10000 }
  )

  const { data: decisions } = useSWR<DecisionRecord[]>(
    selectedRunId ? ['bt-decisions', selectedRunId] : null,
    () => api.getBacktestDecisions(selectedRunId!, 30),
    { refreshInterval: 5000 }
  )

  const selectedRun = runs.find((r) => r.run_id === selectedRunId)
  const selectedModel = aiModels?.find((m) => m.id === formState.aiModelId)

  // Auto-select first model
  useEffect(() => {
    if (!formState.aiModelId && aiModels?.length) {
      const enabled = aiModels.find((m) => m.enabled)
      if (enabled) setFormState((s) => ({ ...s, aiModelId: enabled.id }))
    }
  }, [aiModels, formState.aiModelId])

  // Auto-select first run
  useEffect(() => {
    if (!selectedRunId && runs.length > 0) {
      setSelectedRunId(runs[0].run_id)
    }
  }, [runs, selectedRunId])

  // Handlers
  const handleFormChange = (key: string, value: string | number | boolean | string[]) => {
    setFormState((prev) => ({ ...prev, [key]: value }))
  }

  const handleStart = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedModel?.enabled) {
      setToast({ text: tr('toasts.selectModel'), tone: 'error' })
      return
    }

    try {
      setIsStarting(true)
      const start = new Date(formState.start).getTime()
      const end = new Date(formState.end).getTime()
      if (end <= start) throw new Error(tr('toasts.invalidRange'))

      const payload = await api.startBacktest({
        run_id: formState.runId.trim() || undefined,
        symbols: formState.symbols.split(',').map((s) => s.trim()).filter(Boolean),
        timeframes: formState.timeframes,
        decision_timeframe: formState.decisionTf,
        decision_cadence_nbars: formState.cadence,
        start_ts: Math.floor(start / 1000),
        end_ts: Math.floor(end / 1000),
        initial_balance: formState.balance,
        fee_bps: formState.fee,
        slippage_bps: formState.slippage,
        fill_policy: formState.fill,
        prompt_variant: formState.prompt,
        prompt_template: formState.promptTemplate,
        custom_prompt: formState.customPrompt.trim() || undefined,
        override_prompt: formState.overridePrompt,
        cache_ai: formState.cacheAI,
        replay_only: formState.replayOnly,
        ai_model_id: formState.aiModelId,
        margin: {
          large_cap_margin: formState.largeCapMargin,
          small_cap_margin: formState.smallCapMargin,
        },
      })

      setToast({ text: tr('toasts.startSuccess', { id: payload.run_id }), tone: 'success' })
      setSelectedRunId(payload.run_id)
      setWizardStep(1)
      await refreshRuns()
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : tr('toasts.startFailed')
      setToast({ text: errMsg, tone: 'error' })
    } finally {
      setIsStarting(false)
    }
  }

  const handleControl = async (action: 'pause' | 'resume' | 'stop') => {
    if (!selectedRunId) return
    try {
      if (action === 'pause') await api.pauseBacktest(selectedRunId)
      if (action === 'resume') await api.resumeBacktest(selectedRunId)
      if (action === 'stop') await api.stopBacktest(selectedRunId)
      setToast({ text: tr('toasts.actionSuccess', { action, id: selectedRunId }), tone: 'success' })
      await refreshRuns()
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : tr('toasts.actionFailed')
      setToast({ text: errMsg, tone: 'error' })
    }
  }

  const handleDelete = async () => {
    if (!selectedRunId) return
    const confirmed = await confirmToast(tr('toasts.confirmDelete', { id: selectedRunId }), {
      title: false ? 'Confirm Delete' : 'Confirm Delete',
      okText: false ? 'delete' : 'Delete',
      cancelText: false ? 'cancel' : 'Cancel',
    })
    if (!confirmed) return
    try {
      await api.deleteBacktestRun(selectedRunId)
      setToast({ text: tr('toasts.deleteSuccess'), tone: 'success' })
      setSelectedRunId(undefined)
      await refreshRuns()
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : tr('toasts.deleteFailed')
      setToast({ text: errMsg, tone: 'error' })
    }
  }

  const handleExport = async () => {
    if (!selectedRunId) return
    try {
      const blob = await api.exportBacktest(selectedRunId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${selectedRunId}_export.zip`
      link.click()
      URL.revokeObjectURL(url)
      setToast({ text: tr('toasts.exportSuccess', { id: selectedRunId }), tone: 'success' })
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : tr('toasts.exportFailed')
      setToast({ text: errMsg, tone: 'error' })
    }
  }

  const toggleCompare = (runId: string) => {
    setCompareRunIds((prev) =>
      prev.includes(runId) ? prev.filter((id) => id !== runId) : [...prev, runId].slice(-3)
    )
  }

  const quickRanges = [
    { label: false ? '24smallwhen' : '24h', hours: 24 },
    { label: false ? '3days' : '3d', hours: 72 },
    { label: false ? '7days' : '7d', hours: 168 },
    { label: false ? '30days' : '30d', hours: 720 },
  ]

  const applyQuickRange = (hours: number) => {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - hours * 3600 * 1000)
    handleFormChange('start', toLocalInput(startDate))
    handleFormChange('end', toLocalInput(endDate))
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'running':
        return 'var(--primary)'
      case 'completed':
        return 'var(--primary)'
      case 'failed':
      case 'liquidated':
        return '#F6465D'
      case 'paused':
        return '#9CA3AF'
      default:
        return '#9CA3AF'
    }
  }

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'running':
        return <Activity className="w-4 h-4" />
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />
      case 'failed':
      case 'liquidated':
        return <XCircle className="w-4 h-4" />
      case 'paused':
        return <Pause className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  // Render
  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-lg text-sm"
            style={{
              background:
                toast.tone === 'error'
                  ? 'rgba(246,70,93,0.15)'
                  : toast.tone === 'success'
                    ? 'rgba(14,203,129,0.15)'
                    : 'rgba(240,185,11,0.15)',
              color: toast.tone === 'error' ? '#F6465D' : toast.tone === 'success' ? 'var(--primary)' : 'var(--primary)',
              border: `1px solid ${toast.tone === 'error' ? 'rgba(246,70,93,0.3)' : toast.tone === 'success' ? 'rgba(14,203,129,0.3)' : 'rgba(240,185,11,0.3)'}`,
            }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: '#F9FAFB' }}>
            <Brain className="w-7 h-7" style={{ color: 'var(--primary)' }} />
            {tr('title')}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            {tr('subtitle')}
          </p>
        </div>
        <button
          onClick={() => setWizardStep(1)}
          className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all hover:opacity-90"
          style={{ background: 'var(--primary)', color: '#000000' }}
        >
          <Play className="w-4 h-4" />
          {false ? 'new backtest' : 'New Backtest'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Panel - Config / History */}
        <div className="space-y-4">
          {/* Wizard */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <button
                    onClick={() => setWizardStep(step as WizardStep)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                    style={{
                      background: wizardStep >= step ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)',
                      color: wizardStep >= step ? '#000000' : '#9CA3AF',
                    }}
                  >
                    {step}
                  </button>
                  {step < 3 && (
                    <div
                      className="w-8 h-0.5 mx-1"
                      style={{ background: wizardStep > step ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)' }}
                    />
                  )}
                </div>
              ))}
              <span className="ml-2 text-xs" style={{ color: '#9CA3AF' }}>
                {wizardStep === 1
                  ? false
                    ? 'Selectmodel'
                    : 'Select Model'
                  : wizardStep === 2
                    ? false
                      ? 'configparamcount'
                      : 'Configure'
                    : false
                      ? 'Confirm Start'
                      : 'Confirm'}
              </span>
            </div>

            <form onSubmit={handleStart}>
              <AnimatePresence mode="wait">
                {/* Step 1: Model & Symbols */}
                {wizardStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs mb-2" style={{ color: '#9CA3AF' }}>
                        {tr('form.aiModelLabel')}
                      </label>
                      <select
                        className="w-full p-3 rounded-lg text-sm"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                        value={formState.aiModelId}
                        onChange={(e) => handleFormChange('aiModelId', e.target.value)}
                      >
                        <option value="">{tr('form.selectAiModel')}</option>
                        {aiModels?.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.provider}) {!m.enabled && '⚠️'}
                          </option>
                        ))}
                      </select>
                      {selectedModel && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span
                            className="px-2 py-0.5 rounded"
                            style={{
                              background: selectedModel.enabled ? 'rgba(14,203,129,0.1)' : 'rgba(246,70,93,0.1)',
                              color: selectedModel.enabled ? 'var(--primary)' : '#F6465D',
                            }}
                          >
                            {selectedModel.enabled ? tr('form.enabled') : tr('form.disabled')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Strategy Selection Section */}
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Layers className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                        <span className="text-xs font-medium" style={{ color: '#8B5CF6' }}>Strategy Configuration</span>
                      </div>

                      {/* Strategy Type Dropdown */}
                      <div className="mb-3">
                        <label className="block text-xs mb-1" style={{ color: '#9CA3AF' }}>
                          Strategy Source
                        </label>
                        <select
                          className="w-full p-2 rounded-lg text-sm"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                          value={formState.strategyType}
                          onChange={(e) => {
                            handleFormChange('strategyType', e.target.value)
                            handleFormChange('strategyId', '') // Reset strategy selection
                          }}
                        >
                          <option value="">None (Default)</option>
                          <option value="strategies">Default</option>
                          <option value="sonnet">Sonnet</option>
                          <option value="opus">Opus</option>
                          <option value="current">Current</option>
                          <option value="cursor">Cursor</option>
                        </select>
                      </div>

                      {/* Strategy Name Dropdown - only show when type is selected */}
                      {formState.strategyType && (
                        <div className="mb-3">
                          <label className="block text-xs mb-1" style={{ color: '#9CA3AF' }}>
                            Select Strategy
                          </label>
                          <select
                            className="w-full p-2 rounded-lg text-sm"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                            value={formState.strategyId}
                            onChange={(e) => handleFormChange('strategyId', e.target.value)}
                          >
                            <option value="">Select a strategy...</option>
                            {formState.strategyType === 'strategies' && strategies.map((s: any) => (
                              <option key={s.id} value={s.id}>
                                {s.name} {s.is_active && '✓'}
                              </option>
                            ))}
                            {/* Filter tactics by strategy_type for Sonnet/Opus/Current/Cursor */}
                            {['sonnet', 'opus', 'current', 'cursor'].includes(formState.strategyType) &&
                              tactics
                                .filter((t: any) => t.strategy_type === formState.strategyType ||
                                  // Fallback for legacy data without strategy_type
                                  (!t.strategy_type && formState.strategyType === 'sonnet'))
                                .map((t: any) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} {t.is_active && '✓'}
                                  </option>
                                ))
                            }
                          </select>
                        </div>
                      )}

                      {/* VWAP Algorithm Toggle */}
                      <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <input
                          type="checkbox"
                          id="enableVwapAlgorithm"
                          checked={formState.enableVwapAlgorithm}
                          onChange={(e) => handleFormChange('enableVwapAlgorithm', e.target.checked)}
                          className="w-4 h-4 rounded accent-violet-500"
                        />
                        <label htmlFor="enableVwapAlgorithm" className="text-xs cursor-pointer" style={{ color: '#F9FAFB' }}>
                          📊 VWAP + Slope & Stretch Algorithm (1-min bars 9:30-Entry)
                        </label>
                      </div>

                      {/* VWAP Entry Time - only show when VWAP is enabled */}
                      {formState.enableVwapAlgorithm && (
                        <div className="mt-3 flex items-center gap-3">
                          <label className="text-xs" style={{ color: '#9CA3AF' }}>Entry Time (ET):</label>
                          <input
                            type="time"
                            value={formState.vwapEntryTime}
                            onChange={(e) => handleFormChange('vwapEntryTime', e.target.value)}
                            className="px-2 py-1 rounded text-xs"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                          />
                          <span className="text-[10px]" style={{ color: '#6B7280' }}>
                            (Collects 1-min VWAP from 9:30 AM)
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs" style={{ color: '#9CA3AF' }}>
                          {tr('form.symbolsLabel')}
                        </label>
                        <button
                          type="button"
                          onClick={() => handleFormChange('showDataSourceConfig', !formState.showDataSourceConfig)}
                          className="text-[10px] px-2 py-0.5 rounded border border-dashed border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all flex items-center gap-1"
                        >
                          <span>🤖</span>
                          {formState.showDataSourceConfig ? 'Hide AI100' : 'AI100'}
                        </button>
                      </div>

                      {/* AI100 Data Source Configuration Panel */}
                      <AnimatePresence>
                        {formState.showDataSourceConfig && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-4 p-3 rounded-lg space-y-3"
                            style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium" style={{ color: '#10b981' }}>📡 Data Source Configuration - AI 100 Stocks</span>
                            </div>

                            {/* Enable AI100 Checkbox */}
                            <label className="flex items-center gap-3 cursor-pointer mb-3">
                              <input
                                type="checkbox"
                                checked={formState.useAi100}
                                onChange={async (e) => {
                                  const enabled = e.target.checked
                                  handleFormChange('useAi100', enabled)
                                  if (enabled) {
                                    // Auto-load AI100 stocks when enabled
                                    try {
                                      const url = formState.ai100ApiUrl || 'http://24.12.59.214:8082/api/ai100/list?auth=pluq8P0XTgucCN6kyxey5EPTof36R54lQc3rfgQsoNQ&sort=fin&limit=100'
                                      const res = await fetch(url)
                                      const data = await res.json()
                                      if (data && Array.isArray(data.items)) {
                                        const symbols = data.items.slice(0, formState.ai100Limit || 100).map((it: any) => it.symbol).join(',')
                                        handleFormChange('symbols', symbols)
                                        setToast({ text: `Loaded ${Math.min(data.items.length, formState.ai100Limit || 100)} AI stocks`, tone: 'success' })
                                      }
                                    } catch (err) {
                                      setToast({ text: 'Failed to load AI100', tone: 'error' })
                                    }
                                  }
                                }}
                                className="w-5 h-5 rounded accent-emerald-500"
                              />
                              <span style={{ color: '#F9FAFB' }}>Enable AI 100 Stocks</span>
                            </label>

                            <div className="flex items-center gap-3">
                              <span className="text-xs" style={{ color: '#9CA3AF' }}>AI100 Limit:</span>
                              <input
                                type="number"
                                value={formState.ai100Limit}
                                onChange={(e) => handleFormChange('ai100Limit', parseInt(e.target.value) || 100)}
                                min={1}
                                max={100}
                                className="w-20 px-2 py-1 rounded text-xs"
                                style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                              />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs" style={{ color: '#9CA3AF' }}>AI 100 API URL</label>
                                {!formState.ai100ApiUrl && (
                                  <button
                                    type="button"
                                    onClick={() => handleFormChange('ai100ApiUrl', 'http://24.12.59.214:8082/api/ai100/list?auth=pluq8P0XTgucCN6kyxey5EPTof36R54lQc3rfgQsoNQ&sort=fin&limit=100')}
                                    className="text-[10px] px-2 py-0.5 rounded"
                                    style={{ background: '#10b98120', color: '#10b981' }}
                                  >
                                    Fill Default
                                  </button>
                                )}
                              </div>
                              <input
                                type="url"
                                value={formState.ai100ApiUrl}
                                onChange={(e) => handleFormChange('ai100ApiUrl', e.target.value)}
                                placeholder="Enter AI 100 Stocks API URL..."
                                className="w-full px-3 py-2 rounded-lg font-mono text-xs"
                                style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                              />
                              <div className="mt-2 text-[10px]" style={{ color: '#10b981' }}>
                                📋 <strong>API Structure:</strong> API must return JSON: {'{"success": true, "data": {"stocks": [{"pair": "SYMBOL", "score": 0.0}]}}'}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {POPULAR_SYMBOLS.map((sym) => {
                          const isSelected = formState.symbols.includes(sym)
                          return (
                            <button
                              key={sym}
                              type="button"
                              onClick={() => {
                                const current = formState.symbols.split(',').map((s) => s.trim()).filter(Boolean)
                                const updated = isSelected
                                  ? current.filter((s) => s !== sym)
                                  : [...current, sym]
                                handleFormChange('symbols', updated.join(','))
                              }}
                              className="px-2 py-1 rounded text-xs transition-all"
                              style={{
                                background: isSelected ? 'rgba(240,185,11,0.15)' : 'rgba(22, 27, 34, 0.88)',
                                border: `1px solid ${isSelected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)'}`,
                                color: isSelected ? 'var(--primary)' : '#9CA3AF',
                              }}
                            >
                              {sym.replace('', '')}
                            </button>
                          )
                        })}
                      </div>
                      <textarea
                        className="w-full p-2 rounded-lg text-xs font-mono"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                        value={formState.symbols}
                        onChange={(e) => handleFormChange('symbols', e.target.value)}
                        rows={2}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      disabled={!selectedModel?.enabled}
                      className="w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      style={{ background: 'var(--primary)', color: '#000000' }}
                    >
                      {false ? 'Next' : 'Next'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                {/* Step 2: Parameters */}
                {wizardStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs mb-2" style={{ color: '#9CA3AF' }}>
                        {tr('form.timeRangeLabel')}
                      </label>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {quickRanges.map((r) => (
                          <button
                            key={r.hours}
                            type="button"
                            onClick={() => applyQuickRange(r.hours)}
                            className="px-3 py-1 rounded text-xs"
                            style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="datetime-local"
                          className="p-2 rounded-lg text-xs"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                          value={formState.start}
                          onChange={(e) => handleFormChange('start', e.target.value)}
                        />
                        <input
                          type="datetime-local"
                          className="p-2 rounded-lg text-xs"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                          value={formState.end}
                          onChange={(e) => handleFormChange('end', e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs mb-2" style={{ color: '#9CA3AF' }}>
                        {false ? 'wheninterval' : 'Timeframes'}
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {TIMEFRAME_OPTIONS.map((tf) => {
                          const isSelected = formState.timeframes.includes(tf)
                          return (
                            <button
                              key={tf}
                              type="button"
                              onClick={() => {
                                const updated = isSelected
                                  ? formState.timeframes.filter((t) => t !== tf)
                                  : [...formState.timeframes, tf]
                                if (updated.length > 0) handleFormChange('timeframes', updated)
                              }}
                              className="px-2 py-1 rounded text-xs transition-all"
                              style={{
                                background: isSelected ? 'rgba(240,185,11,0.15)' : 'rgba(22, 27, 34, 0.88)',
                                border: `1px solid ${isSelected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)'}`,
                                color: isSelected ? 'var(--primary)' : '#9CA3AF',
                              }}
                            >
                              {tf}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#9CA3AF' }}>
                          {tr('form.initialBalanceLabel')}
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 rounded-lg text-xs"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                          value={formState.balance}
                          onChange={(e) => handleFormChange('balance', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#9CA3AF' }}>
                          {tr('form.decisionTfLabel')}
                        </label>
                        <select
                          className="w-full p-2 rounded-lg text-xs"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                          value={formState.decisionTf}
                          onChange={(e) => handleFormChange('decisionTf', e.target.value)}
                        >
                          {formState.timeframes.map((tf) => (
                            <option key={tf} value={tf}>
                              {tf}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                        style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        {false ? 'Previous' : 'Back'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardStep(3)}
                        className="flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                        style={{ background: 'var(--primary)', color: '#000000' }}
                      >
                        {false ? 'Next' : 'Next'}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Advanced & Confirm */}
                {wizardStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#9CA3AF' }}>
                          {tr('form.largeCapMarginLabel')}
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 rounded-lg text-xs"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                          value={formState.largeCapMargin}
                          onChange={(e) => handleFormChange('largeCapMargin', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#9CA3AF' }}>
                          {tr('form.smallCapMarginLabel')}
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 rounded-lg text-xs"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                          value={formState.smallCapMargin}
                          onChange={(e) => handleFormChange('smallCapMargin', Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#9CA3AF' }}>
                          {tr('form.feeLabel')}
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 rounded-lg text-xs"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                          value={formState.fee}
                          onChange={(e) => handleFormChange('fee', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#9CA3AF' }}>
                          {tr('form.slippageLabel')}
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 rounded-lg text-xs"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                          value={formState.slippage}
                          onChange={(e) => handleFormChange('slippage', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#9CA3AF' }}>
                          {tr('form.cadenceLabel')}
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 rounded-lg text-xs"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                          value={formState.cadence}
                          onChange={(e) => handleFormChange('cadence', Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs mb-1" style={{ color: '#9CA3AF' }}>
                        {false ? 'Strategystyle' : 'Strategy Style'}
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {['baseline', 'aggressive', 'conservative', 'scalping'].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleFormChange('prompt', p)}
                            className="px-3 py-1.5 rounded text-xs transition-all"
                            style={{
                              background: formState.prompt === p ? 'rgba(240,185,11,0.15)' : 'rgba(22, 27, 34, 0.88)',
                              border: `1px solid ${formState.prompt === p ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)'}`,
                              color: formState.prompt === p ? 'var(--primary)' : '#9CA3AF',
                            }}
                          >
                            {tr(`form.promptPresets.${p}`)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs" style={{ color: '#9CA3AF' }}>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formState.cacheAI}
                          onChange={(e) => handleFormChange('cacheAI', e.target.checked)}
                          className="accent-[var(--primary)]"
                        />
                        {tr('form.cacheAiLabel')}
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formState.replayOnly}
                          onChange={(e) => handleFormChange('replayOnly', e.target.checked)}
                          className="accent-[var(--primary)]"
                        />
                        {tr('form.replayOnlyLabel')}
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                        style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F9FAFB' }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        {false ? 'Previous' : 'Back'}
                      </button>
                      <button
                        type="submit"
                        disabled={isStarting}
                        className="flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ background: 'var(--primary)', color: '#000000' }}
                      >
                        {isStarting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                        {isStarting ? tr('starting') : tr('start')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          {/* Run History */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: '#F9FAFB' }}>
                <Layers className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                {tr('runList.title')}
              </h3>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>
                {runs.length} {false ? 'entries' : 'runs'}
              </span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {runs.length === 0 ? (
                <div className="py-8 text-center text-sm" style={{ color: '#6B7280' }}>
                  {tr('emptyStates.noRuns')}
                </div>
              ) : (
                runs.map((run) => (
                  <button
                    key={run.run_id}
                    onClick={() => setSelectedRunId(run.run_id)}
                    className="w-full p-3 rounded-lg text-left transition-all"
                    style={{
                      background: run.run_id === selectedRunId ? 'rgba(240,185,11,0.1)' : 'rgba(22, 27, 34, 0.88)',
                      border: `1px solid ${run.run_id === selectedRunId ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)'}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs" style={{ color: '#F9FAFB' }}>
                        {run.run_id.slice(0, 20)}...
                      </span>
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: getStateColor(run.state) }}
                      >
                        {getStateIcon(run.state)}
                        {tr(`states.${run.state}`)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>
                        {run.summary.progress_pct.toFixed(0)}% · ${run.summary.equity_last.toFixed(0)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCompare(run.run_id)
                        }}
                        className="p-1 rounded"
                        style={{
                          background: compareRunIds.includes(run.run_id)
                            ? 'rgba(240,185,11,0.2)'
                            : 'transparent',
                        }}
                        title={false ? 'addto compare' : 'Add to compare'}
                      >
                        <Eye
                          className="w-3 h-3"
                          style={{
                            color: compareRunIds.includes(run.run_id) ? 'var(--primary)' : '#6B7280',
                          }}
                        />
                      </button>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="xl:col-span-2 space-y-4">
          {!selectedRunId ? (
            <div
              className="glass-card p-12 text-center"
              style={{ color: '#6B7280' }}
            >
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>{tr('emptyStates.selectRun')}</p>
            </div>
          ) : (
            <>
              {/* Status Bar */}
              <div className="glass-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <ProgressRing progress={status?.progress_pct ?? selectedRun?.summary.progress_pct ?? 0} size={80} />
                    <div>
                      <h2 className="font-mono font-bold" style={{ color: '#F9FAFB' }}>
                        {selectedRunId}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            background: `${getStateColor(status?.state ?? selectedRun?.state ?? '')}20`,
                            color: getStateColor(status?.state ?? selectedRun?.state ?? ''),
                          }}
                        >
                          {getStateIcon(status?.state ?? selectedRun?.state ?? '')}
                          {tr(`states.${status?.state ?? selectedRun?.state}`)}
                        </span>
                        {selectedRun?.summary.decision_tf && (
                          <span className="text-xs" style={{ color: '#9CA3AF' }}>
                            {selectedRun.summary.decision_tf} · {selectedRun.summary.symbol_count} symbols
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {(status?.state === 'running' || selectedRun?.state === 'running') && (
                      <>
                        <button
                          onClick={() => handleControl('pause')}
                          className="p-2 rounded-lg transition-all hover:bg-[rgba(255, 255, 255, 0.08)]"
                          style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
                          title={tr('actions.pause')}
                        >
                          <Pause className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                        </button>
                        <button
                          onClick={() => handleControl('stop')}
                          className="p-2 rounded-lg transition-all hover:bg-[rgba(255, 255, 255, 0.08)]"
                          style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
                          title={tr('actions.stop')}
                        >
                          <Square className="w-4 h-4" style={{ color: '#F6465D' }} />
                        </button>
                      </>
                    )}
                    {status?.state === 'paused' && (
                      <button
                        onClick={() => handleControl('resume')}
                        className="p-2 rounded-lg transition-all hover:bg-[rgba(255, 255, 255, 0.08)]"
                        style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
                        title={tr('actions.resume')}
                      >
                        <Play className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                      </button>
                    )}
                    <button
                      onClick={handleExport}
                      className="p-2 rounded-lg transition-all hover:bg-[rgba(255, 255, 255, 0.08)]"
                      style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
                      title={tr('detail.exportLabel')}
                    >
                      <Download className="w-4 h-4" style={{ color: '#F9FAFB' }} />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-2 rounded-lg transition-all hover:bg-[rgba(255, 255, 255, 0.08)]"
                      style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
                      title={tr('detail.deleteLabel')}
                    >
                      <Trash2 className="w-4 h-4" style={{ color: '#F6465D' }} />
                    </button>
                  </div>
                </div>

                {(status?.note || status?.last_error) && (
                  <div
                    className="mt-3 p-2 rounded-lg text-xs flex items-center gap-2"
                    style={{
                      background: 'rgba(246,70,93,0.1)',
                      border: '1px solid rgba(246,70,93,0.3)',
                      color: '#F6465D',
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {status?.note || status?.last_error}
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  icon={Target}
                  label={false ? 'currentequity' : 'Equity'}
                  value={(status?.equity ?? 0).toFixed(2)}
                  suffix=""
                />
                <StatCard
                  icon={TrendingUp}
                  label={false ? 'total return' : 'Return'}
                  value={`${(metrics?.total_return_pct ?? 0).toFixed(2)}%`}
                  trend={(metrics?.total_return_pct ?? 0) >= 0 ? 'up' : 'down'}
                  color={(metrics?.total_return_pct ?? 0) >= 0 ? 'var(--primary)' : '#F6465D'}
                />
                <StatCard
                  icon={AlertTriangle}
                  label={false ? 'max drawdown' : 'Max DD'}
                  value={`${(metrics?.max_drawdown_pct ?? 0).toFixed(2)}%`}
                  color="#F6465D"
                />
                <StatCard
                  icon={BarChart3}
                  label={false ? 'sharpe ratio' : 'Sharpe'}
                  value={(metrics?.sharpe_ratio ?? 0).toFixed(2)}
                />
              </div>

              {/* Tabs */}
              <div className="glass-card">
                <div className="flex border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                  {(['overview', 'chart', 'trades', 'decisions'] as ViewTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setViewTab(tab)}
                      className="px-4 py-3 text-sm font-medium transition-all relative"
                      style={{ color: viewTab === tab ? 'var(--primary)' : '#9CA3AF' }}
                    >
                      {tab === 'overview'
                        ? false
                          ? 'overview'
                          : 'Overview'
                        : tab === 'chart'
                          ? false
                            ? 'chart'
                            : 'Chart'
                          : tab === 'trades'
                            ? false
                              ? 'trade'
                              : 'Trades'
                            : false
                              ? 'AIdecision'
                              : 'Decisions'}
                      {viewTab === tab && (
                        <motion.div
                          layoutId="tab-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5"
                          style={{ background: 'var(--primary)', color: '#000000' }}
                        />
                      )}
                    </button>
                  ))}
                </div>

                <div className="p-4">
                  <AnimatePresence mode="wait">
                    {viewTab === 'overview' && (
                      <motion.div
                        key="overview"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {equity && equity.length > 0 ? (
                          <BacktestChart equity={equity} trades={trades ?? []} />
                        ) : (
                          <div className="py-12 text-center" style={{ color: '#6B7280' }}>
                            {tr('charts.equityEmpty')}
                          </div>
                        )}

                        {metrics && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                            <div className="p-3 rounded-lg" style={{ background: 'rgba(22, 27, 34, 0.88)' }}>
                              <div className="text-xs" style={{ color: '#9CA3AF' }}>
                                {false ? 'win rate' : 'Win Rate'}
                              </div>
                              <div className="text-lg font-bold" style={{ color: '#F9FAFB' }}>
                                {(metrics.win_rate ?? 0).toFixed(1)}%
                              </div>
                            </div>
                            <div className="p-3 rounded-lg" style={{ background: 'rgba(22, 27, 34, 0.88)' }}>
                              <div className="text-xs" style={{ color: '#9CA3AF' }}>
                                {false ? 'profit factor' : 'Profit Factor'}
                              </div>
                              <div className="text-lg font-bold" style={{ color: '#F9FAFB' }}>
                                {(metrics.profit_factor ?? 0).toFixed(2)}
                              </div>
                            </div>
                            <div className="p-3 rounded-lg" style={{ background: 'rgba(22, 27, 34, 0.88)' }}>
                              <div className="text-xs" style={{ color: '#9CA3AF' }}>
                                {false ? 'totaltradecount' : 'Total Trades'}
                              </div>
                              <div className="text-lg font-bold" style={{ color: '#F9FAFB' }}>
                                {metrics.trades ?? 0}
                              </div>
                            </div>
                            <div className="p-3 rounded-lg" style={{ background: 'rgba(22, 27, 34, 0.88)' }}>
                              <div className="text-xs" style={{ color: '#9CA3AF' }}>
                                {false ? 'bestsymbol' : 'Best Symbol'}
                              </div>
                              <div className="text-lg font-bold" style={{ color: 'var(--primary)' }}>
                                {metrics.best_symbol?.replace('', '') || '-'}
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {viewTab === 'chart' && (
                      <motion.div
                        key="chart"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {equity && equity.length > 0 ? (
                          <BacktestChart equity={equity} trades={trades ?? []} />
                        ) : (
                          <div className="py-12 text-center" style={{ color: '#6B7280' }}>
                            {tr('charts.equityEmpty')}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {viewTab === 'trades' && (
                      <motion.div
                        key="trades"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <TradeTimeline trades={trades ?? []} />
                      </motion.div>
                    )}

                    {viewTab === 'decisions' && (
                      <motion.div
                        key="decisions"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3 max-h-[500px] overflow-y-auto"
                      >
                        {decisions && decisions.length > 0 ? (
                          decisions.map((d) => (
                            <DecisionCard
                              key={`${d.cycle_number}-${d.timestamp}`}
                              decision={d}
                              language={language}
                            />
                          ))
                        ) : (
                          <div className="py-12 text-center" style={{ color: '#6B7280' }}>
                            {tr('decisionTrail.emptyHint')}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
