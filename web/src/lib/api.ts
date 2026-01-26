import type {
  SystemStatus,
  AccountInfo,
  Position,
  DecisionRecord,
  Statistics,
  TraderInfo,
  TraderConfigData,
  AIModel,
  Brokerage,
  CreateTraderRequest,
  CreateBrokerageRequest,
  UpdateModelConfigRequest,
  UpdateBrokerageConfigRequest,
  CompetitionData,
  BacktestRunsResponse,
  BacktestStartConfig,
  BacktestStatusPayload,
  BacktestEquityPoint,
  BacktestTradeEvent,
  BacktestMetrics,
  BacktestRunMetadata,
  Strategy,
  StrategyConfig,
  DebateSession,
  DebateSessionWithDetails,
  CreateDebateRequest,
  DebateMessage,
  DebateVote,
  DebatePersonalityInfo,
} from '../types'
import { CryptoService } from './crypto'
import { httpClient } from './httpClient'

const API_BASE = '/api'

// Helper function to get auth headers
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

async function handleJSONResponse<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!res.ok) {
    let message = text || res.statusText
    try {
      const data = text ? JSON.parse(text) : null
      if (data && typeof data === 'object') {
        message = data.error || data.message || message
      }
    } catch {
      /* ignore JSON parse errors */
    }
    throw new Error(message || 'Request failed')
  }
  if (!text) {
    return {} as T
  }
  return JSON.parse(text) as T
}

export const api = {
  // AI Trader Management APIs
  async getTraders(): Promise<TraderInfo[]> {
    const result = await httpClient.get<TraderInfo[]>(`${API_BASE}/my-traders`)
    if (!result.success) throw new Error('Failed to get trader list')
    return Array.isArray(result.data) ? result.data : []
  },

  // Get public trader list (no auth required)
  async getPublicTraders(): Promise<any[]> {
    const result = await httpClient.get<any[]>(`${API_BASE}/traders`)
    if (!result.success) throw new Error('Failed to get public trader list')
    return result.data!
  },

  async createTrader(request: CreateTraderRequest): Promise<TraderInfo> {
    const result = await httpClient.post<TraderInfo>(
      `${API_BASE}/traders`,
      request
    )
    if (!result.success) throw new Error('Failed to create trader')
    return result.data!
  },

  async deleteTrader(traderId: string): Promise<void> {
    const result = await httpClient.delete(`${API_BASE}/traders/${traderId}`)
    if (!result.success) throw new Error('Failed to delete trader')
  },

  async startTrader(traderId: string): Promise<void> {
    const result = await httpClient.post(
      `${API_BASE}/traders/${traderId}/start`
    )
    if (!result.success) throw new Error('Failed to start trader')
  },

  async stopTrader(traderId: string): Promise<void> {
    const result = await httpClient.post(`${API_BASE}/traders/${traderId}/stop`)
    if (!result.success) throw new Error('Failed to stop trader')
  },

  async toggleCompetition(traderId: string, showInCompetition: boolean): Promise<void> {
    const result = await httpClient.put(
      `${API_BASE}/traders/${traderId}/competition`,
      { show_in_competition: showInCompetition }
    )
    if (!result.success) throw new Error('Failed to update competition display setting')
  },

  async closePosition(traderId: string, symbol: string, side: string): Promise<{ message: string }> {
    const result = await httpClient.post<{ message: string }>(
      `${API_BASE}/traders/${traderId}/close-position`,
      { symbol, side }
    )
    if (!result.success) throw new Error('Failed to close position')
    return result.data!
  },

  async updateTraderPrompt(
    traderId: string,
    customPrompt: string
  ): Promise<void> {
    const result = await httpClient.put(
      `${API_BASE}/traders/${traderId}/prompt`,
      { custom_prompt: customPrompt }
    )
    if (!result.success) throw new Error('Failed to update custom prompt')
  },

  async getTraderConfig(traderId: string): Promise<TraderConfigData> {
    const result = await httpClient.get<TraderConfigData>(
      `${API_BASE}/traders/${traderId}/config`
    )
    if (!result.success) throw new Error('Failed to get trader config')
    return result.data!
  },

  async updateTrader(
    traderId: string,
    request: CreateTraderRequest
  ): Promise<TraderInfo> {
    const result = await httpClient.put<TraderInfo>(
      `${API_BASE}/traders/${traderId}`,
      request
    )
    if (!result.success) throw new Error('Failed to update trader')
    return result.data!
  },

  // AI Model Config APIs
  async getModelConfigs(): Promise<AIModel[]> {
    const result = await httpClient.get<AIModel[]>(`${API_BASE}/models`)
    if (!result.success) throw new Error('Failed to get model config')
    return Array.isArray(result.data) ? result.data : []
  },

  // Get supported AI models (no auth required)
  async getSupportedModels(): Promise<AIModel[]> {
    const result = await httpClient.get<AIModel[]>(
      `${API_BASE}/supported-models`
    )
    if (!result.success) throw new Error('Failed to get supported models')
    return result.data!
  },

  async getPromptTemplates(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/prompt-templates`)
    if (!res.ok) throw new Error('Failed to get prompt templates')
    const data = await res.json()
    if (Array.isArray(data.templates)) {
      return data.templates.map((item: { name: string }) => item.name)
    }
    return []
  },

  async updateModelConfigs(request: UpdateModelConfigRequest): Promise<void> {
    // Check if transport encryption is enabled
    const config = await CryptoService.fetchCryptoConfig()

    if (!config.transport_encryption) {
      // If encryption disabled, send plaintext
      const result = await httpClient.put(`${API_BASE}/models`, request)
      if (!result.success) throw new Error('Failed to update model config')
      return
    }

    // Get RSA public key
    const publicKey = await CryptoService.fetchPublicKey()

    // Initialize crypto service
    await CryptoService.initialize(publicKey)

    // Get user info from localStorage
    const userId = localStorage.getItem('user_id') || ''
    const sessionId = sessionStorage.getItem('session_id') || ''

    // Encrypt sensitive data
    const encryptedPayload = await CryptoService.encryptSensitiveData(
      JSON.stringify(request),
      userId,
      sessionId
    )

    // Send encrypted data
    const result = await httpClient.put(`${API_BASE}/models`, encryptedPayload)
    if (!result.success) throw new Error('Failed to update model config')
  },

  // Brokerage Config APIs
  async getBrokerageConfigs(): Promise<Brokerage[]> {
    const result = await httpClient.get<Brokerage[]>(`${API_BASE}/exchanges`)
    if (!result.success) throw new Error('Failed to get brokerage config')
    return result.data!
  },

  // Get supported brokerages (no auth required)
  async getSupportedBrokerages(): Promise<Brokerage[]> {
    const result = await httpClient.get<Brokerage[]>(
      `${API_BASE}/supported-exchanges`
    )
    if (!result.success) throw new Error('Failed to get supported brokerages')
    return result.data!
  },

  async updateBrokerageConfigs(
    request: UpdateBrokerageConfigRequest
  ): Promise<void> {
    const result = await httpClient.put(`${API_BASE}/exchanges`, request)
    if (!result.success) throw new Error('Failed to update brokerage config')
  },

  // Create new brokerage account
  async createBrokerage(request: CreateBrokerageRequest): Promise<{ id: string }> {
    const result = await httpClient.post<{ id: string }>(`${API_BASE}/exchanges`, request)
    if (!result.success) throw new Error('Failed to create brokerage account')
    return result.data!
  },

  // Create new brokerage account（encrypttransport）
  async createBrokerageEncrypted(request: CreateBrokerageRequest): Promise<{ id: string }> {
    // Check if transport encryption is enabled
    const config = await CryptoService.fetchCryptoConfig()

    if (!config.transport_encryption) {
      // If encryption disabled, send plaintext
      const result = await httpClient.post<{ id: string }>(`${API_BASE}/exchanges`, request)
      if (!result.success) throw new Error('Failed to create brokerage account')
      return result.data!
    }

    // Get RSA public key
    const publicKey = await CryptoService.fetchPublicKey()

    // Initialize crypto service
    await CryptoService.initialize(publicKey)

    // Get user info
    const userId = localStorage.getItem('user_id') || ''
    const sessionId = sessionStorage.getItem('session_id') || ''

    // Encrypt sensitive data
    const encryptedPayload = await CryptoService.encryptSensitiveData(
      JSON.stringify(request),
      userId,
      sessionId
    )

    // Send encrypted data
    const result = await httpClient.post<{ id: string }>(
      `${API_BASE}/exchanges`,
      encryptedPayload
    )
    if (!result.success) throw new Error('Failed to create brokerage account')
    return result.data!
  },

  // Delete brokerage account
  async deleteBrokerage(brokerageId: string): Promise<void> {
    const result = await httpClient.delete(`${API_BASE}/exchanges/${brokerageId}`)
    if (!result.success) throw new Error('Failed to delete brokerage account')
  },

  // Update brokerage config with encryption (auto-detect)
  async updateBrokerageConfigsEncrypted(
    request: UpdateBrokerageConfigRequest
  ): Promise<void> {
    // Check if transport encryption is enabled
    const config = await CryptoService.fetchCryptoConfig()

    if (!config.transport_encryption) {
      // If encryption disabled, send plaintext
      const result = await httpClient.put(`${API_BASE}/exchanges`, request)
      if (!result.success) throw new Error('Failed to update brokerage config')
      return
    }

    // Get RSA public key
    const publicKey = await CryptoService.fetchPublicKey()

    // Initialize crypto service
    await CryptoService.initialize(publicKey)

    // Get user info from localStorage
    const userId = localStorage.getItem('user_id') || ''
    const sessionId = sessionStorage.getItem('session_id') || ''

    // Encrypt sensitive data
    const encryptedPayload = await CryptoService.encryptSensitiveData(
      JSON.stringify(request),
      userId,
      sessionId
    )

    // Send encrypted data
    const result = await httpClient.put(
      `${API_BASE}/exchanges`,
      encryptedPayload
    )
    if (!result.success) throw new Error('Failed to update brokerage config')
  },

  // Get system status (supports trader_id)
  async getStatus(traderId?: string): Promise<SystemStatus> {
    const url = traderId
      ? `${API_BASE}/status?trader_id=${traderId}`
      : `${API_BASE}/status`
    const result = await httpClient.get<SystemStatus>(url)
    if (!result.success) throw new Error('Failed to get system status')
    return result.data!
  },

  // Get account info (supports trader_id)
  async getAccount(traderId?: string): Promise<AccountInfo> {
    const url = traderId
      ? `${API_BASE}/account?trader_id=${traderId}`
      : `${API_BASE}/account`
    const result = await httpClient.get<AccountInfo>(url)
    if (!result.success) throw new Error('Failed to get account info')
    console.log('Account data fetched:', result.data)
    return result.data!
  },

  // Get positions (supports trader_id)
  async getPositions(traderId?: string): Promise<Position[]> {
    const url = traderId
      ? `${API_BASE}/positions?trader_id=${traderId}`
      : `${API_BASE}/positions`
    const result = await httpClient.get<Position[]>(url)
    if (!result.success) throw new Error('Failed to get positions')
    return result.data!
  },

  // Get decision logs (supports trader_id)
  async getDecisions(traderId?: string): Promise<DecisionRecord[]> {
    const url = traderId
      ? `${API_BASE}/decisions?trader_id=${traderId}`
      : `${API_BASE}/decisions`
    const result = await httpClient.get<DecisionRecord[]>(url)
    if (!result.success) throw new Error('Failed to get decision logs')
    return result.data!
  },

  // Get latest decisions (supports trader_id and limit)
  async getLatestDecisions(
    traderId?: string,
    limit: number = 5
  ): Promise<DecisionRecord[]> {
    const params = new URLSearchParams()
    if (traderId) {
      params.append('trader_id', traderId)
    }
    params.append('limit', limit.toString())

    const result = await httpClient.get<DecisionRecord[]>(
      `${API_BASE}/decisions/latest?${params}`
    )
    if (!result.success) throw new Error('Failed to get latest decisions')
    return result.data!
  },

  // Get statistics (supports trader_id)
  async getStatistics(traderId?: string): Promise<Statistics> {
    const url = traderId
      ? `${API_BASE}/statistics?trader_id=${traderId}`
      : `${API_BASE}/statistics`
    const result = await httpClient.get<Statistics>(url)
    if (!result.success) throw new Error('Failed to get statistics')
    return result.data!
  },

  // Get equity history (supports trader_id)
  async getEquityHistory(traderId?: string): Promise<any[]> {
    const url = traderId
      ? `${API_BASE}/equity-history?trader_id=${traderId}`
      : `${API_BASE}/equity-history`
    const result = await httpClient.get<any[]>(url)
    if (!result.success) throw new Error('Failed to get history data')
    return result.data!
  },

  // Batch get equity history for multiple traders (no auth)
  // hours: optional param, get last N hours of data (0=all)
  // Common values: 24=1day, 72=3days, 168=7days, 720=30days, 0=all
  async getEquityHistoryBatch(traderIds: string[], hours?: number): Promise<any> {
    const result = await httpClient.post<any>(
      `${API_BASE}/equity-history-batch`,
      { trader_ids: traderIds, hours: hours || 0 }
    )
    if (!result.success) throw new Error('Failed to get batch history data')
    return result.data!
  },

  // Get top 5 traders (no auth required)
  async getTopTraders(): Promise<any[]> {
    const result = await httpClient.get<any[]>(`${API_BASE}/top-traders`)
    if (!result.success) throw new Error('Failed to get top traders')
    return result.data!
  },

  // Get public trader config (no auth required)
  async getPublicTraderConfig(traderId: string): Promise<any> {
    const result = await httpClient.get<any>(
      `${API_BASE}/traders/${traderId}/public-config`
    )
    if (!result.success) throw new Error('Failed to get public trader config')
    return result.data!
  },

  // Get competition data (no auth required)
  async getCompetition(): Promise<CompetitionData> {
    const result = await httpClient.get<CompetitionData>(
      `${API_BASE}/competition`
    )
    if (!result.success) throw new Error('Failed to get competition data')
    return result.data!
  },

  // Get server IP (auth required, for whitelist)
  async getServerIP(): Promise<{
    public_ip: string
    message: string
  }> {
    const result = await httpClient.get<{
      public_ip: string
      message: string
    }>(`${API_BASE}/server-ip`)
    if (!result.success) throw new Error('Failed to get server IP')
    return result.data!
  },

  // Get market status (no auth required)
  async getMarketStatus(): Promise<{
    is_open: boolean
    current_time: string
    market_hours: string
  }> {
    const result = await httpClient.get<{
      is_open: boolean
      current_time: string
      market_hours: string
    }>(`${API_BASE}/market-status`)
    if (!result.success) throw new Error('Failed to get market status')
    return result.data!
  },

  // Tactics API for backtest strategy selection
  async getTactics(): Promise<{ tactics: any[] }> {
    const result = await httpClient.get<{ tactics: any[] }>(`${API_BASE}/tactics`)
    if (!result.success) throw new Error('Failed to get tactics')
    return result.data!
  },

  // Backtest APIs
  async getBacktestRuns(params?: {
    state?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<BacktestRunsResponse> {
    const query = new URLSearchParams()
    if (params?.state) query.set('state', params.state)
    if (params?.search) query.set('search', params.search)
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.offset) query.set('offset', String(params.offset))
    const res = await fetch(
      `${API_BASE}/backtest/runs${query.toString() ? `?${query}` : ''}`,
      {
        headers: getAuthHeaders(),
      }
    )
    return handleJSONResponse<BacktestRunsResponse>(res)
  },

  async startBacktest(config: BacktestStartConfig): Promise<BacktestRunMetadata> {
    const res = await fetch(`${API_BASE}/backtest/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ config }),
    })
    return handleJSONResponse<BacktestRunMetadata>(res)
  },

  async pauseBacktest(runId: string): Promise<BacktestRunMetadata> {
    const res = await fetch(`${API_BASE}/backtest/pause`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ run_id: runId }),
    })
    return handleJSONResponse<BacktestRunMetadata>(res)
  },

  async resumeBacktest(runId: string): Promise<BacktestRunMetadata> {
    const res = await fetch(`${API_BASE}/backtest/resume`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ run_id: runId }),
    })
    return handleJSONResponse<BacktestRunMetadata>(res)
  },

  async stopBacktest(runId: string): Promise<BacktestRunMetadata> {
    const res = await fetch(`${API_BASE}/backtest/stop`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ run_id: runId }),
    })
    return handleJSONResponse<BacktestRunMetadata>(res)
  },

  async updateBacktestLabel(
    runId: string,
    label: string
  ): Promise<BacktestRunMetadata> {
    const res = await fetch(`${API_BASE}/backtest/label`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ run_id: runId, label }),
    })
    return handleJSONResponse<BacktestRunMetadata>(res)
  },

  async deleteBacktestRun(runId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/backtest/delete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ run_id: runId }),
    })
    if (!res.ok) {
      throw new Error(await res.text())
    }
  },

  async getBacktestStatus(runId: string): Promise<BacktestStatusPayload> {
    const res = await fetch(`${API_BASE}/backtest/status?run_id=${runId}`, {
      headers: getAuthHeaders(),
    })
    return handleJSONResponse<BacktestStatusPayload>(res)
  },

  async getBacktestEquity(
    runId: string,
    timeframe?: string,
    limit?: number
  ): Promise<BacktestEquityPoint[]> {
    const query = new URLSearchParams({ run_id: runId })
    if (timeframe) query.set('tf', timeframe)
    if (limit) query.set('limit', String(limit))
    const res = await fetch(`${API_BASE}/backtest/equity?${query}`, {
      headers: getAuthHeaders(),
    })
    return handleJSONResponse<BacktestEquityPoint[]>(res)
  },

  async getBacktestTrades(
    runId: string,
    limit = 200
  ): Promise<BacktestTradeEvent[]> {
    const query = new URLSearchParams({
      run_id: runId,
      limit: String(limit),
    })
    const res = await fetch(`${API_BASE}/backtest/trades?${query}`, {
      headers: getAuthHeaders(),
    })
    return handleJSONResponse<BacktestTradeEvent[]>(res)
  },

  async getBacktestMetrics(runId: string): Promise<BacktestMetrics> {
    const res = await fetch(`${API_BASE}/backtest/metrics?run_id=${runId}`, {
      headers: getAuthHeaders(),
    })
    return handleJSONResponse<BacktestMetrics>(res)
  },

  async getBacktestTrace(
    runId: string,
    cycle?: number
  ): Promise<DecisionRecord> {
    const query = new URLSearchParams({ run_id: runId })
    if (cycle) query.set('cycle', String(cycle))
    const res = await fetch(`${API_BASE}/backtest/trace?${query}`, {
      headers: getAuthHeaders(),
    })
    return handleJSONResponse<DecisionRecord>(res)
  },

  async getBacktestDecisions(
    runId: string,
    limit = 20,
    offset = 0
  ): Promise<DecisionRecord[]> {
    const query = new URLSearchParams({
      run_id: runId,
      limit: String(limit),
      offset: String(offset),
    })
    const res = await fetch(`${API_BASE}/backtest/decisions?${query}`, {
      headers: getAuthHeaders(),
    })
    return handleJSONResponse<DecisionRecord[]>(res)
  },

  async exportBacktest(runId: string): Promise<Blob> {
    const res = await fetch(`${API_BASE}/backtest/export?run_id=${runId}`, {
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      const text = await res.text()
      try {
        const data = text ? JSON.parse(text) : null
        throw new Error(
          data?.error || data?.message || text || 'Export failed, please try again'
        )
      } catch (err) {
        if (err instanceof Error && err.message) {
          throw err
        }
        throw new Error(text || 'Export failed, please try again')
      }
    }
    return res.blob()
  },

  // Strategy APIs
  async getStrategies(): Promise<Strategy[]> {
    const result = await httpClient.get<{ strategies: Strategy[] }>(`${API_BASE}/strategies`)
    if (!result.success) throw new Error('Failed to get strategies')
    const strategies = result.data?.strategies
    return Array.isArray(strategies) ? strategies : []
  },

  async getStrategy(strategyId: string): Promise<Strategy> {
    const result = await httpClient.get<Strategy>(`${API_BASE}/strategies/${strategyId}`)
    if (!result.success) throw new Error('Failed to get strategy')
    return result.data!
  },

  async getActiveStrategy(): Promise<Strategy> {
    const result = await httpClient.get<Strategy>(`${API_BASE}/strategies/active`)
    if (!result.success) throw new Error('Failed to get active strategy')
    return result.data!
  },

  async getDefaultStrategyConfig(): Promise<StrategyConfig> {
    const result = await httpClient.get<StrategyConfig>(`${API_BASE}/strategies/default-config`)
    if (!result.success) throw new Error('Failed to get default strategy config')
    return result.data!
  },

  async createStrategy(data: {
    name: string
    description: string
    config: StrategyConfig
  }): Promise<Strategy> {
    const result = await httpClient.post<Strategy>(`${API_BASE}/strategies`, data)
    if (!result.success) throw new Error('Failed to create strategy')
    return result.data!
  },

  async updateStrategy(
    strategyId: string,
    data: {
      name?: string
      description?: string
      config?: StrategyConfig
    }
  ): Promise<Strategy> {
    const result = await httpClient.put<Strategy>(`${API_BASE}/strategies/${strategyId}`, data)
    if (!result.success) throw new Error('Failed to update strategy')
    return result.data!
  },

  async deleteStrategy(strategyId: string): Promise<void> {
    const result = await httpClient.delete(`${API_BASE}/strategies/${strategyId}`)
    if (!result.success) throw new Error('Failed to delete strategy')
  },

  async activateStrategy(strategyId: string): Promise<Strategy> {
    const result = await httpClient.post<Strategy>(`${API_BASE}/strategies/${strategyId}/activate`)
    if (!result.success) throw new Error('Failed to activate strategy')
    return result.data!
  },

  async duplicateStrategy(strategyId: string): Promise<Strategy> {
    const result = await httpClient.post<Strategy>(`${API_BASE}/strategies/${strategyId}/duplicate`)
    if (!result.success) throw new Error('Failed to duplicate strategy')
    return result.data!
  },

  // Debate Arena APIs
  async getDebates(): Promise<DebateSession[]> {
    const result = await httpClient.get<DebateSession[]>(`${API_BASE}/debates`)
    if (!result.success) throw new Error('Failed to get debates')
    return Array.isArray(result.data) ? result.data : []
  },

  async getDebate(debateId: string): Promise<DebateSessionWithDetails> {
    const result = await httpClient.get<DebateSessionWithDetails>(`${API_BASE}/debates/${debateId}`)
    if (!result.success) throw new Error('Failed to get debate details')
    return result.data!
  },

  async createDebate(request: CreateDebateRequest): Promise<DebateSessionWithDetails> {
    const result = await httpClient.post<DebateSessionWithDetails>(`${API_BASE}/debates`, request)
    if (!result.success) throw new Error('Failed to create debate')
    return result.data!
  },

  async startDebate(debateId: string): Promise<void> {
    const result = await httpClient.post(`${API_BASE}/debates/${debateId}/start`)
    if (!result.success) throw new Error('Failed to start debate')
  },

  async cancelDebate(debateId: string): Promise<void> {
    const result = await httpClient.post(`${API_BASE}/debates/${debateId}/cancel`)
    if (!result.success) throw new Error('Failed to cancel debate')
  },

  async executeDebate(debateId: string, traderId: string): Promise<DebateSessionWithDetails> {
    const result = await httpClient.post<{ message: string; session: DebateSessionWithDetails }>(
      `${API_BASE}/debates/${debateId}/execute`,
      { trader_id: traderId }
    )
    if (!result.success) throw new Error('Failed to execute trade')
    return result.data!.session
  },

  async deleteDebate(debateId: string): Promise<void> {
    const result = await httpClient.delete(`${API_BASE}/debates/${debateId}`)
    if (!result.success) throw new Error('Failed to delete debate')
  },

  async getDebateMessages(debateId: string): Promise<DebateMessage[]> {
    const result = await httpClient.get<DebateMessage[]>(`${API_BASE}/debates/${debateId}/messages`)
    if (!result.success) throw new Error('Failed to get debate messages')
    return result.data!
  },

  async getDebateVotes(debateId: string): Promise<DebateVote[]> {
    const result = await httpClient.get<DebateVote[]>(`${API_BASE}/debates/${debateId}/votes`)
    if (!result.success) throw new Error('Failed to get debate votes')
    return result.data!
  },

  async getDebatePersonalities(): Promise<DebatePersonalityInfo[]> {
    const result = await httpClient.get<DebatePersonalityInfo[]>(`${API_BASE}/debates/personalities`)
    if (!result.success) throw new Error('Failed to get AI personalities')
    return result.data!
  },

  // SSE stream for live debate updates
  createDebateStream(debateId: string): EventSource {
    const token = localStorage.getItem('auth_token')
    return new EventSource(`${API_BASE}/debates/${debateId}/stream?token=${token}`)
  },
}
