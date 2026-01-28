import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { api } from '../lib/api'
import { httpClient } from '../lib/httpClient'
import { notify } from '../lib/notify'
import { PunkAvatar } from '../components/PunkAvatar'
import type {
  DebateSession,
  DebateSessionWithDetails,
  DebateMessage,
  CreateDebateRequest,
  AIModel,
  Strategy,
  DebatePersonality,
  TraderInfo,
} from '../types'
import {
  Plus,
  X,
  Trophy,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// Translations - English only
const T: Record<string, string> = {
  newDebate: 'New Debate',
  debateSessions: 'Sessions',
  onlineTraders: 'Online Traders',
  offline: 'Offline',
  noTraders: 'No traders',
  start: 'Start',
  delete: 'Delete',
  discussionRecords: 'Discussion',
  finalVotes: 'Final Votes',
  consensus: 'Consensus',
  confidence: 'Confidence',
  margin: 'Margin',
  position: 'Position',
  execute: 'Execute',
  executed: 'Executed',
  selectOrCreate: 'Select or create a debate',
  clickToStart: 'Click "Start" to begin',
  waitingAI: 'Waiting for AI...',
  createDebate: 'Create Debate',
  debateName: 'Debate Name',
  tradingPair: 'Trading Pair',
  strategy: 'Strategy',
  rounds: 'Rounds',
  participants: 'Participants',
  addAI: 'Add AI',
  cancel: 'Cancel',
  create: 'Create',
  creating: 'Creating...',
  executeTitle: 'Execute Trade',
  selectTrader: 'Select Trader',
  executing: 'Executing...',
  fillNameAdd2AI: 'Please fill name and add at least 2 AI',
}
const t = (key: string) => T[key] || key

// Personality config
const PERS: Record<DebatePersonality, { emoji: string; color: string; name: string }> = {
  bull: { emoji: '🐂', color: 'var(--primary)', name: 'Bull' },
  bear: { emoji: '🐻', color: '#EF4444', name: 'Bear' },
  analyst: { emoji: '📊', color: 'rgb(195, 245, 60)', name: 'Analyst' },
  contrarian: { emoji: '🔄', color: '#F59E0B', name: 'Contrarian' },
  risk_manager: { emoji: '🛡️', color: 'rgb(195, 245, 60)', name: 'Risk Mgr' },
}

// Action config
const ACT: Record<string, { color: string; bg: string; icon: JSX.Element; label: string }> = {
  open_long: { color: 'text-green-400', bg: 'bg-green-500/20', icon: <TrendingUp size={14} />, label: 'LONG' },
  open_short: { color: 'text-red-400', bg: 'bg-red-500/20', icon: <TrendingDown size={14} />, label: 'SHORT' },
  hold: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: <Minus size={14} />, label: 'HOLD' },
  wait: { color: 'text-gray-400', bg: 'bg-gray-500/20', icon: <Clock size={14} />, label: 'WAIT' },
  close_long: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: <X size={14} />, label: 'CLOSE' },
  close_short: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: <X size={14} />, label: 'CLOSE' },
}

// Status colors
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-gray-500',
  running: 'bg-blue-500 animate-pulse',
  voting: 'bg-yellow-500 animate-pulse',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
}

// AI Provider Avatar
function AIAvatar({ name, size = 24 }: { name: string; size?: number }) {
  const providers: Record<string, { bg: string; text: string; letter: string }> = {
    claude: { bg: 'bg-orange-500', text: 'text-white', letter: 'C' },
    deepseek: { bg: 'bg-blue-600', text: 'text-white', letter: 'D' },
    gemini: { bg: 'bg-blue-400', text: 'text-white', letter: 'G' },
    grok: { bg: 'bg-gray-700', text: 'text-white', letter: 'X' },
    kimi: { bg: 'bg-green-500', text: 'text-white', letter: 'K' },
    qwen: { bg: 'bg-indigo-500', text: 'text-white', letter: 'Q' },
    openai: { bg: 'bg-emerald-600', text: 'text-white', letter: 'O' },
    gpt: { bg: 'bg-emerald-600', text: 'text-white', letter: 'O' },
  }
  const lower = name.toLowerCase()
  const p = Object.entries(providers).find(([k]) => lower.includes(k))?.[1]
    || { bg: 'bg-gray-600', text: 'text-white', letter: name[0]?.toUpperCase() || '?' }
  return (
    <div className={`${p.bg} ${p.text} rounded-md flex items-center justify-center font-bold`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}>
      {p.letter}
    </div>
  )
}

// Message Card - Full content display like AI Testing
function MessageCard({ msg }: { msg: DebateMessage }) {
  const [open, setOpen] = useState(false)
  const p = PERS[msg.personality] || PERS.analyst
  const a = ACT[msg.decision?.action || 'wait'] || ACT.wait

  // Parse content into sections
  const parseContent = (c: string) => {
    const reasoning = c.match(/<reasoning>([\s\S]*?)<\/reasoning>/i)?.[1]?.trim()
    const analysis = c.match(/<analysis>([\s\S]*?)<\/analysis>/i)?.[1]?.trim()
    const argument = c.match(/<argument>([\s\S]*?)<\/argument>/i)?.[1]?.trim()
    const decision = c.match(/<decision>([\s\S]*?)<\/decision>/i)?.[1]?.trim()

    // Clean content - remove XML tags
    const cleanContent = c.replace(/<\/?[^>]+(>|$)/g, '').trim()

    return {
      reasoning: reasoning || analysis || argument,
      decision,
      fullContent: cleanContent
    }
  }

  const parsed = parseContent(msg.content)
  const previewText = parsed.reasoning?.slice(0, 150) || parsed.fullContent.slice(0, 150)

  return (
    <div
      className="p-3 rounded-lg hover:bg-[var(--bg-secondary)]/5 transition-all border border-[var(--glass-border)]"
      style={{ borderLeft: `3px solid ${p.color}` }}
    >
      {/* Header - Always visible */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <AIAvatar name={msg.ai_model_name} size={24} />
        <span className="text-sm text-white font-medium">{msg.ai_model_name}</span>
        <span className="text-xs text-gray-500">{p.name}</span>
        <div className="flex-1" />
        {msg.decision && (
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${a.bg} ${a.color}`}>
            {a.icon} {msg.decision.symbol || ''} {a.label}
          </span>
        )}
        <span className="text-xs text-yellow-400 font-medium">{msg.decision?.confidence || msg.confidence}%</span>
        {open ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
      </div>

      {/* Preview when collapsed */}
      {!open && (
        <div className="mt-2 text-xs text-gray-400 line-clamp-2">
          {previewText}...
        </div>
      )}

      {/* Expanded Content - Full display */}
      {open && (
        <div className="mt-3 space-y-3">
          {/* Reasoning/Analysis Section */}
          {parsed.reasoning && (
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-xs text-blue-400 font-medium mb-2">💭 Reasoning</div>
              <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto select-text">
                {parsed.reasoning}
              </div>
            </div>
          )}

          {/* Decision Section */}
          {msg.decision && (
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-xs text-green-400 font-medium mb-2">📊 Decision</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {msg.decision.symbol && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Symbol</span>
                    <span className="text-white font-medium">{msg.decision.symbol}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Direction</span>
                  <span className={a.color}>{a.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Confidence</span>
                  <span className="text-yellow-400">{msg.decision.confidence}%</span>
                </div>
                {(msg.decision.margin ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Margin</span>
                    <span className="text-white">{msg.decision.margin}x</span>
                  </div>
                )}
                {(msg.decision.position_pct ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Position</span>
                    <span className="text-white">{((msg.decision.position_pct ?? 0) * 100).toFixed(0)}%</span>
                  </div>
                )}
                {(msg.decision.stop_loss ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stop Loss</span>
                    <span className="text-red-400">{((msg.decision.stop_loss ?? 0) * 100).toFixed(1)}%</span>
                  </div>
                )}
                {(msg.decision.take_profit ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Take Profit</span>
                    <span className="text-green-400">{((msg.decision.take_profit ?? 0) * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              {msg.decision.reasoning && (
                <div className="mt-2 pt-2 border-t border-[var(--glass-border)] text-xs text-gray-400">
                  {msg.decision.reasoning}
                </div>
              )}
            </div>
          )}

          {/* Full Raw Content (collapsible) */}
          {!parsed.reasoning && (
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-xs text-gray-400 font-medium mb-2">📝 Full Output</div>
              <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto select-text">
                {parsed.fullContent}
              </div>
            </div>
          )}

          {/* Multi-stock decisions if available */}
          {msg.decisions && msg.decisions.length > 1 && (
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-xs text-green-400 font-medium mb-2">🎯 Multi-Stock Decisions ({msg.decisions.length})</div>
              <div className="space-y-2">
                {msg.decisions.map((d, i) => {
                  const da = ACT[d.action] || ACT.wait
                  return (
                    <div key={i} className="flex items-center justify-between text-xs p-2 bg-[var(--bg-secondary)]/5 rounded">
                      <span className="text-white font-medium">{d.symbol}</span>
                      <span className={da.color}>{da.icon} {da.label}</span>
                      <span className="text-yellow-400">{d.confidence}%</span>
                      <span className="text-gray-400">{d.margin || 0}x / {((d.position_pct || 0) * 100).toFixed(0)}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Vote Card - Beautiful detailed version
function VoteCard({ vote }: { vote: { ai_model_name: string; action: string; symbol?: string; confidence: number; margin?: number; position_pct?: number; stop_loss_pct?: number; take_profit_pct?: number; reasoning: string } }) {
  const a = ACT[vote.action] || ACT.wait
  const confColor = vote.confidence >= 70 ? 'bg-green-500' : vote.confidence >= 50 ? 'bg-yellow-500' : 'bg-gray-500'
  return (
    <div className="bg-[rgba(22, 27, 34, 0.88)] rounded-xl p-4 border border-[var(--glass-border)] hover:border-gray-300 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AIAvatar name={vote.ai_model_name} size={28} />
          <div>
            <span className="text-white font-semibold block">{vote.ai_model_name}</span>
            {vote.symbol && <span className="text-xs text-gray-400">{vote.symbol}</span>}
          </div>
        </div>
        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${a.bg} ${a.color}`}>
          {a.icon} {vote.action.replace('_', ' ').toUpperCase()}
        </span>
      </div>
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Confidence</span>
          <span className="text-white font-bold">{vote.confidence}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full ${confColor} rounded-full transition-all`} style={{ width: `${vote.confidence}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Margin</span><span className="text-white font-semibold">{vote.margin || '-'}x</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Position</span><span className="text-white font-semibold">{vote.position_pct ? `${(vote.position_pct * 100).toFixed(0)}%` : '-'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">SL</span><span className="text-red-400 font-semibold">{vote.stop_loss_pct ? `${(vote.stop_loss_pct * 100).toFixed(1)}%` : '-'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">TP</span><span className="text-green-400 font-semibold">{vote.take_profit_pct ? `${(vote.take_profit_pct * 100).toFixed(1)}%` : '-'}</span></div>
      </div>
      {vote.reasoning && (
        <p className="mt-3 text-xs text-gray-400 leading-relaxed line-clamp-2 border-t border-[var(--glass-border)] pt-2">{vote.reasoning}</p>
      )}
    </div>
  )
}

// Create Modal (simplified)
function CreateModal({
  isOpen, onClose, onCreate, aiModels, strategies
}: {
  isOpen: boolean; onClose: () => void; onCreate: (r: CreateDebateRequest) => Promise<void>
  aiModels: AIModel[]; strategies: Strategy[];
}) {
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [strategyId, setStrategyId] = useState('')
  const [maxRounds, setMaxRounds] = useState(3)
  const [participants, setParticipants] = useState<{ ai_model_id: string; personality: DebatePersonality }[]>([])
  const [creating, setCreating] = useState(false)

  // Get the selected strategy's stock source config
  const selectedStrategy = strategies.find(s => s.id === strategyId)
  const stockSource = selectedStrategy?.config?.stock_source
  const sourceType = stockSource?.source_type || 'static'
  const staticStocks = stockSource?.static_stocks || []
  // Only show stock selector for static type with stocks defined
  const isStaticWithStocks = sourceType === 'static' && staticStocks.length > 0

  useEffect(() => {
    if (isOpen) {
      const firstStrategy = strategies[0]
      const firstStrategyId = firstStrategy?.id || ''
      const firstStockSource = firstStrategy?.config?.stock_source
      const firstSourceType = firstStockSource?.source_type || 'static'
      const firstStaticStocks = firstStockSource?.static_stocks || []
      setName('')
      setStrategyId(firstStrategyId)
      // Only set symbol for static type, otherwise leave empty (backend will choose)
      setSymbol(firstSourceType === 'static' && firstStaticStocks.length > 0 ? firstStaticStocks[0] : '')
      setMaxRounds(3)
      setParticipants([])
    }
  }, [isOpen, strategies])

  // Update symbol when strategy changes
  useEffect(() => {
    if (isStaticWithStocks) {
      if (!staticStocks.includes(symbol)) {
        setSymbol(staticStocks[0])
      }
    } else {
      // Non-static strategy: clear symbol, backend will auto-select
      setSymbol('')
    }
  }, [strategyId, isStaticWithStocks, staticStocks, symbol])

  const addP = () => {
    if (participants.length >= 10 || aiModels.length === 0) return
    // Allow same AI model to be used multiple times with different personalities
    const order: DebatePersonality[] = ['bull', 'bear', 'analyst', 'contrarian', 'risk_manager']
    // Cycle through personalities
    const nextPersonality = order[participants.length % order.length]
    setParticipants([...participants, { ai_model_id: aiModels[0].id, personality: nextPersonality }])
  }

  const submit = async () => {
    if (!name || !strategyId || participants.length < 2) {
      notify.error(t('fillNameAdd2AI'))
      return
    }
    setCreating(true)
    try {
      await onCreate({ name, symbol, strategy_id: strategyId, max_rounds: maxRounds, participants })
      onClose()
    } catch (err: any) {
      notify.error(err.message || 'Failed to create debate')
      console.error('Create debate error:', err)
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={() => !creating && onClose()}
    >
      <div
        className="bg-[rgba(22, 27, 34, 0.88)] rounded-xl w-full max-w-md p-4 border border-[var(--glass-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">{t('createDebate')}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="space-y-3">
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder={t('debateName')} className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)]/5 border border-[var(--glass-border)] text-white text-sm"
          />

          {/* Strategy selector - moved up */}
          <select value={strategyId} onChange={e => setStrategyId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)]/5 border border-[var(--glass-border)] text-white text-sm">
            {strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <div className="flex gap-2">
            {/* Show dropdown only for static type with stocks defined */}
            {isStaticWithStocks ? (
              <select value={symbol} onChange={e => setSymbol(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-secondary)]/5 border border-[var(--glass-border)] text-white text-sm">
                {staticStocks.map(stock => <option key={stock} value={stock}>{stock}</option>)}
              </select>
            ) : (
              <div className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-secondary)]/5 border border-[var(--glass-border)] text-gray-400 text-sm">
                {'Auto-selected by strategy'}
              </div>
            )}
            <select value={maxRounds} onChange={e => setMaxRounds(+e.target.value)}
              className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)]/5 border border-[var(--glass-border)] text-white text-sm">
              {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n} {'rounds'}</option>)}
            </select>
          </div>

          {/* Participants */}
          <div className="flex items-center gap-2 flex-wrap">
            {participants.map((p, i) => (
              <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                style={{ backgroundColor: `${PERS[p.personality].color}20`, border: `1px solid ${PERS[p.personality].color}40` }}>
                {/* Personality selector */}
                <select value={p.personality} onChange={e => {
                  const up = [...participants]; up[i].personality = e.target.value as DebatePersonality; setParticipants(up)
                }} className="bg-transparent text-white text-xs border-0 outline-none cursor-pointer">
                  {Object.entries(PERS).map(([k, v]) => (
                    <option key={k} value={k}>{v.emoji} {false ? v.name : v.name}</option>
                  ))}
                </select>
                {/* AI model selector */}
                <select value={p.ai_model_id} onChange={e => {
                  const up = [...participants]; up[i].ai_model_id = e.target.value; setParticipants(up)
                }} className="bg-transparent text-white text-xs border-0 outline-none">
                  {aiModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <button onClick={() => setParticipants(participants.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-300"><X size={12} /></button>
              </div>
            ))}
            <button onClick={addP} className="px-2 py-1 text-xs text-yellow-400 hover:bg-yellow-500/10 rounded">
              + {t('addAI')}
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} disabled={creating} className="flex-1 py-2 rounded-lg bg-[var(--bg-secondary)]/5 text-white text-sm disabled:opacity-50">{t('cancel')}</button>
          <button
            onClick={submit}
            disabled={creating || !name || !strategyId || participants.length < 2}
            className="flex-1 py-2 rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{ background: 'var(--primary)', color: '#000' }}
          >
            {creating ? <Loader2 size={16} className="animate-spin mx-auto" /> : t('create')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Page
export function DebateArenaPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [execId, setExecId] = useState<string | null>(null)
  const [traderId, setTraderId] = useState('')
  const [executing, setExecuting] = useState(false)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: debates, mutate: mutateList } = useSWR<DebateSession[]>('debates', api.getDebates, { refreshInterval: 5000 })
  const { data: aiModels } = useSWR<AIModel[]>('ai-models', api.getModelConfigs)
  // Fetch both strategies and tactics (Sonnet/Opus/Cursor strategies are in tactics)
  const { data: strategies } = useSWR<Strategy[]>('all-strategies-and-tactics', async () => {
    // Use httpClient for proper auth handling (same pattern as TraderConfigModal)
    const [strategiesResult, tacticsResult] = await Promise.all([
      httpClient.get<{ strategies: Strategy[] }>('/api/strategies'),
      httpClient.get<{ tactics: Strategy[] }>('/api/tactics')
    ])

    const strategiesList = strategiesResult.success && strategiesResult.data?.strategies
      ? strategiesResult.data.strategies
      : []
    const tacticsList = tacticsResult.success && tacticsResult.data?.tactics
      ? tacticsResult.data.tactics
      : []

    // Combine and deduplicate by id
    const allStrategies = [...strategiesList]
    const existingIds = new Set(strategiesList.map(s => s.id))
    for (const tactic of tacticsList) {
      if (!existingIds.has(tactic.id)) {
        allStrategies.push(tactic)
      }
    }

    return allStrategies
  })
  const { data: traders } = useSWR<TraderInfo[]>('traders', api.getTraders)
  const { data: detail, mutate: mutateDetail } = useSWR<DebateSessionWithDetails>(
    selectedId ? `debate-${selectedId}` : null,
    () => api.getDebate(selectedId!),
    { refreshInterval: selectedId ? 3000 : 0 }
  )

  useEffect(() => {
    if (debates?.length && !selectedId) setSelectedId(debates[0].id)
  }, [debates, selectedId])

  const onCreate = async (r: CreateDebateRequest) => {
    const d = await api.createDebate(r)
    notify.success('Creation successful')
    mutateList()
    setSelectedId(d.id)
  }

  const onStart = async (id: string) => {
    setStartingId(id)
    try {
      await api.startDebate(id)
      notify.success('Started')
      mutateList(); mutateDetail()
    } catch (err: any) {
      notify.error(err.message || 'Failed to start debate')
      console.error('Start debate error:', err)
    } finally {
      setStartingId(null)
    }
  }

  const onDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await api.deleteDebate(id)
      notify.success('Deleted')
      if (selectedId === id) setSelectedId(null)
      mutateList()
    } catch (err: any) {
      notify.error(err.message || 'Failed to delete debate')
      console.error('Delete debate error:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const onExecute = async () => {
    if (!execId || !traderId) return
    setExecuting(true)
    try {
      await api.executeDebate(execId, traderId)
      notify.success('Executed')
      mutateDetail(); mutateList()
      setExecId(null); setTraderId('')
    } catch (e: any) { notify.error(e.message) }
    finally { setExecuting(false) }
  }

  // Process data
  const messages = detail?.messages || []
  const participants = detail?.participants || []
  const votes = detail?.votes || []
  const decision = detail?.final_decision

  // Get strategy name
  const strategyName = strategies?.find(s => s.id === detail?.strategy_id)?.name || ''

  // Group by round
  const rounds: Record<number, DebateMessage[]> = {}
  messages.forEach(m => { if (!rounds[m.round]) rounds[m.round] = []; rounds[m.round].push(m) })

  // Vote summary
  const voteSum = votes.reduce((a, v) => { a[v.action] = (a[v.action] || 0) + 1; return a }, {} as Record<string, number>)

  return (
    <div className="h-full bg-[var(--bg-secondary)] flex overflow-hidden">
      {/* Left - Debate List + Online Traders */}
      <div className="w-56 flex-shrink-0 bg-[rgba(22, 27, 34, 0.88)] border-r border-[var(--glass-border)] flex flex-col">
        {/* New Debate Button */}
        <button onClick={() => setShowCreate(true)}
          className="m-2 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-1" style={{ background: 'var(--primary)', color: '#000' }}>
          <Plus size={16} /> {t('newDebate')}
        </button>

        {/* Debate List */}
        <div className="px-2 py-1 text-xs text-gray-500 font-semibold">{t('debateSessions')}</div>
        <div className="overflow-y-auto" style={{ maxHeight: '30%' }}>
          {debates?.map(d => (
            <div key={d.id} onClick={() => setSelectedId(d.id)}
              className={`p-2 cursor-pointer border-l-2 ${selectedId === d.id ? 'bg-yellow-500/10 border-yellow-500' : 'border-transparent hover:bg-[var(--bg-secondary)]/5'}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${STATUS_COLOR[d.status]}`} />
                <span className="text-sm text-white truncate flex-1">{d.name}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{d.symbol || 'Multiple'} · R{d.current_round}/{d.max_rounds}</div>
              {/* Always show action buttons when selected */}
              {selectedId === d.id && (
                <div className="flex gap-1 mt-1">
                  {/* Start button - only for pending */}
                  {d.status === 'pending' && (
                    <button
                      onClick={e => { e.stopPropagation(); onStart(d.id) }}
                      disabled={startingId === d.id}
                      className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {startingId === d.id ? <Loader2 size={10} className="animate-spin" /> : null}
                      {t('start')}
                    </button>
                  )}
                  {/* Stop button - for running or voting */}
                  {(d.status === 'running' || d.status === 'voting') && (
                    <button onClick={e => { e.stopPropagation(); api.cancelDebate(d.id).then(() => { notify.success('Stopped'); mutateList(); }).catch(e => notify.error(e.message)) }}
                      className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors">Stop</button>
                  )}
                  {/* Delete button - for all non-running statuses */}
                  {(d.status !== 'running' && d.status !== 'voting') && (
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(d.id) }}
                      disabled={deletingId === d.id}
                      className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {deletingId === d.id ? <Loader2 size={10} className="animate-spin" /> : null}
                      {t('delete')}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Online Traders Section */}
        <div className="flex-1 border-t border-[var(--glass-border)] mt-2 overflow-hidden flex flex-col">
          <div className="px-2 py-2 text-xs text-gray-500 font-semibold flex items-center gap-1">
            <Zap size={12} className="text-green-400" />
            {t('onlineTraders')}
          </div>
          <div className="flex-1 overflow-y-auto px-2 space-y-2">
            {traders?.filter(tr => tr.is_running).map(tr => (
              <div key={tr.trader_id}
                onClick={() => { setTraderId(tr.trader_id); if (decision && !decision.executed) setExecId(detail?.id || null) }}
                className={`p-2 rounded-lg cursor-pointer transition-all ${traderId === tr.trader_id ? 'bg-green-500/20 ring-1 ring-green-500' : 'bg-[var(--bg-secondary)]/5 hover:bg-[var(--bg-secondary)]/10'}`}>
                <div className="flex items-center gap-2">
                  <PunkAvatar seed={tr.trader_id} size={32} className="rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">{tr.trader_name}</div>
                    <div className="text-xs text-gray-500 truncate">{tr.ai_model}</div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
              </div>
            ))}
            {traders?.filter(tr => !tr.is_running).slice(0, 3).map(tr => (
              <div key={tr.trader_id} className="p-2 rounded-lg bg-[var(--bg-secondary)]/5 opacity-50">
                <div className="flex items-center gap-2">
                  <div className="grayscale">
                    <PunkAvatar seed={tr.trader_id} size={32} className="rounded-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">{tr.trader_name}</div>
                    <div className="text-xs text-gray-500">{t('offline')}</div>
                  </div>
                </div>
              </div>
            ))}
            {(!traders || traders.length === 0) && (
              <div className="text-xs text-gray-500 text-center py-4">{t('noTraders')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {detail ? (
          <>
            {/* Header Bar - Compact */}
            <div className="px-3 py-2 border-b border-[var(--glass-border)] bg-[rgba(22, 27, 34, 0.88)]/50 flex items-center gap-3 flex-shrink-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLOR[detail.status]}`} />
              <span className="font-bold text-white truncate">{detail.name}</span>
              <span className="text-yellow-400 font-semibold">{detail.symbol || 'Multiple Stocks'}</span>
              {strategyName && <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">{strategyName}</span>}
              <span className="text-xs text-gray-500">R{detail.current_round}/{detail.max_rounds}</span>

              {/* Participants */}
              <div className="flex gap-1 ml-2">
                {participants.map(p => {
                  const vote = votes.find(v => v.ai_model_id === p.ai_model_id)
                  const act = vote ? (ACT[vote.action] || ACT.wait) : null
                  return (
                    <div key={p.id} className="flex items-center gap-1 px-1 py-0.5 rounded bg-[var(--bg-secondary)]/5 text-xs">
                      <AIAvatar name={p.ai_model_name} size={14} />
                      {act && <span className={`${act.color}`}>{act.icon}</span>}
                    </div>
                  )
                })}
              </div>

              <div className="flex-1" />

              {/* Vote Summary */}
              {votes.length > 0 && (
                <div className="flex gap-1">
                  {Object.entries(voteSum).map(([action, count]) => {
                    const cfg = ACT[action] || ACT.wait
                    return (
                      <div key={action} className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} text-xs font-semibold`}>
                        {cfg.icon} {cfg.label}×{count}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Main Content Area - Two Column Layout */}
            <div className="flex-1 flex overflow-hidden">
              {Object.keys(rounds).length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                  <div className="text-6xl mb-4">{detail.status === 'pending' ? '🎯' : '⏳'}</div>
                  <div className="text-lg">{detail.status === 'pending' ? t('clickToStart') : t('waitingAI')}</div>
                </div>
              ) : (
                <>
                  {/* Left - Rounds */}
                  <div className="flex-1 overflow-y-auto p-4 border-r border-[var(--glass-border)]">
                    <div className="text-sm text-gray-400 font-semibold mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      {t('discussionRecords')}
                    </div>
                    <div className="space-y-3">
                      {Object.entries(rounds).map(([round, msgs]) => (
                        <div key={round} className="bg-[var(--bg-secondary)]/5 rounded-xl p-3">
                          <div className="text-xs text-blue-400 font-bold mb-2">Round {round}</div>
                          <div className="space-y-2">
                            {msgs.map(m => <MessageCard key={m.id} msg={m} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right - Votes */}
                  {votes.length > 0 && (
                    <div className="w-[420px] flex-shrink-0 overflow-y-auto p-4 bg-[rgba(22, 27, 34, 0.88)]/50">
                      <div className="text-sm text-gray-400 font-semibold mb-3 flex items-center gap-2">
                        <Trophy size={16} className="text-yellow-400" />
                        {t('finalVotes')}
                      </div>
                      <div className="space-y-3">
                        {votes.map(v => (
                          <VoteCard key={v.id} vote={{
                            ai_model_name: v.ai_model_name,
                            action: v.action,
                            symbol: v.symbol,
                            confidence: v.confidence,
                            margin: v.margin,
                            position_pct: v.position_pct,
                            stop_loss_pct: v.stop_loss_pct,
                            take_profit_pct: v.take_profit_pct,
                            reasoning: v.reasoning
                          }} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Consensus Bar - Show when votes exist */}
            {(decision || votes.length > 0) && (
              <div className="p-3 border-t border-[var(--glass-border)] bg-gradient-to-r from-yellow-500/10 to-orange-500/10 flex items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Trophy size={20} className="text-yellow-400" />
                  <span className="text-sm text-gray-400">{t('consensus')}:</span>
                  {decision ? (
                    <>
                      {decision.symbol && <span className="text-yellow-400 font-bold mr-1">{decision.symbol}</span>}
                      <span className={`flex items-center gap-1 px-2 py-1 rounded font-bold ${(ACT[decision.action] || ACT.wait).bg} ${(ACT[decision.action] || ACT.wait).color}`}>
                        {(ACT[decision.action] || ACT.wait).icon}
                        {decision.action.replace('_', ' ').toUpperCase()}
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 rounded font-bold bg-gray-500/20 text-gray-400">
                      <Clock size={14} /> VOTING...
                    </span>
                  )}
                </div>
                {decision && (
                  <div className="flex items-center gap-4 text-sm">
                    <span><span className="text-gray-500">{t('confidence')}</span> <span className="text-yellow-400 font-bold">{decision.confidence || 0}%</span></span>
                    {(decision.margin ?? 0) > 0 && <span><span className="text-gray-500">{t('margin')}</span> <span className="text-white font-bold">{decision.margin}x</span></span>}
                    {(decision.position_pct ?? 0) > 0 && <span><span className="text-gray-500">{t('position')}</span> <span className="text-white font-bold">{((decision.position_pct ?? 0) * 100).toFixed(0)}%</span></span>}
                    {(decision.stop_loss ?? 0) > 0 && <span><span className="text-gray-500">SL</span> <span className="text-red-400 font-bold">{((decision.stop_loss ?? 0) * 100).toFixed(1)}%</span></span>}
                    {(decision.take_profit ?? 0) > 0 && <span><span className="text-gray-500">TP</span> <span className="text-green-400 font-bold">{((decision.take_profit ?? 0) * 100).toFixed(1)}%</span></span>}
                  </div>
                )}
                <div className="flex-1" />
                {decision && !decision.executed && (decision.action === 'open_long' || decision.action === 'open_short') && (
                  <button onClick={() => setExecId(detail.id)}
                    className="px-4 py-1.5 rounded-lg font-semibold text-sm flex items-center gap-1" style={{ background: 'var(--primary)', color: '#000' }}>
                    <Zap size={14} /> {t('execute')}
                  </button>
                )}
                {decision?.executed && <span className="text-green-400 text-sm font-semibold">✓ {t('executed')}</span>}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">🗳️</div>
              <div>{t('selectOrCreate')}</div>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreate={onCreate}
        aiModels={aiModels || []} strategies={strategies || []} />

      {/* Execute Modal */}
      {execId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => !executing && setExecId(null)}
        >
          <div
            className="bg-[rgba(22, 27, 34, 0.88)] rounded-xl w-full max-w-sm p-4 border border-[var(--glass-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="text-yellow-400" /> {t('executeTitle')}
            </h3>
            <select value={traderId} onChange={e => setTraderId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)]/5 border border-[var(--glass-border)] text-white text-sm mb-3">
              <option value="">{t('selectTrader')}...</option>
              {traders?.filter(tr => tr.is_running).map(tr => (
                <option key={tr.trader_id} value={tr.trader_id}>✅ {tr.trader_name}</option>
              ))}
              {traders?.filter(tr => !tr.is_running).map(tr => (
                <option key={tr.trader_id} value={tr.trader_id} disabled>⏹ {tr.trader_name} ({t('offline')})</option>
              ))}
            </select>
            <div className="text-xs text-yellow-300 bg-yellow-500/10 p-2 rounded mb-3">
              ⚠️ {'Will execute real trade with account balance'}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setExecId(null); setTraderId('') }}
                className="flex-1 py-2 rounded-lg bg-[var(--bg-secondary)]/5 text-white text-sm">{t('cancel')}</button>
              <button onClick={onExecute} disabled={!traderId || executing || !traders?.find(tr => tr.trader_id === traderId)?.is_running}
                className="flex-1 py-2 rounded-lg font-semibold text-sm disabled:opacity-50" style={{ background: 'var(--primary)', color: '#000' }}>
                {executing ? <Loader2 size={16} className="animate-spin mx-auto" /> : t('execute')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
