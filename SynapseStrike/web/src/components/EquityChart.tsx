import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import useSWR from 'swr'
import { api } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { t } from '../i18n/translations'
import {
  AlertTriangle,
  BarChart3,
  DollarSign,
  Percent,
  TrendingUp as ArrowUp,
  TrendingDown as ArrowDown,
} from 'lucide-react'

interface EquityPoint {
  timestamp: string
  total_equity: number
  pnl: number
  pnl_pct: number
  cycle_number: number
}

interface EquityChartProps {
  traderId?: string
  embedded?: boolean // embedded mode（notshowouter card）
}

// Time range options with hours values
type TimeRange = '1D' | '5D' | '1M' | '6M' | 'YTD'
const TIME_RANGE_HOURS: Record<TimeRange, number> = {
  '1D': 24,
  '5D': 120,
  '1M': 720,
  '6M': 4320,
  'YTD': 0, // 0 = all data
}

export function EquityChart({ traderId, embedded = false }: EquityChartProps) {
  const { language } = useLanguage()
  const { user, token } = useAuth()
  const [displayMode, setDisplayMode] = useState<'dollar' | 'percent'>('dollar')
  const [timeRange, setTimeRange] = useState<TimeRange>('1D')

  const hours = TIME_RANGE_HOURS[timeRange]

  const { data: history, error, isLoading } = useSWR<EquityPoint[]>(
    user && token && traderId ? `equity-history-${traderId}-${timeRange}` : null,
    () => api.getEquityHistory(traderId, hours),
    {
      refreshInterval: 30000, // 30sec refresh（historydataUpdatelower frequency）
      revalidateOnFocus: false,
      dedupingInterval: 20000,
    }
  )

  const { data: account } = useSWR(
    user && token && traderId ? `account-${traderId}` : null,
    () => api.getAccount(traderId),
    {
      refreshInterval: 15000, // 15sec refresh（Match backendcachestore）
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  )

  // Loading state - show skeleton
  if (isLoading) {
    return (
      <div className={embedded ? 'p-6' : 'glass-card p-6'}>
        {!embedded && (
          <h3 className="text-lg font-semibold mb-6" style={{ color: '#F9FAFB' }}>
            {t('accountEquityCurve', language)}
          </h3>
        )}
        <div className="animate-pulse">
          <div className="skeleton h-64 w-full rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={embedded ? 'p-6' : 'glass-card p-6'}>
        <div
          className="flex items-center gap-3 p-4 rounded"
          style={{
            background: 'rgba(246, 70, 93, 0.1)',
            border: '1px solid rgba(246, 70, 93, 0.2)',
          }}
        >
          <AlertTriangle className="w-6 h-6" style={{ color: '#F6465D' }} />
          <div>
            <div className="font-semibold" style={{ color: '#F6465D' }}>
              {t('loadingError', language)}
            </div>
            <div className="text-sm" style={{ color: '#9CA3AF' }}>
              {error.message}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // filter out invaliddata：total_equityas0orless than1'sdata points（APIfailedcause）
  const validHistory = history?.filter((point) => point.total_equity > 1) || []

  if (!validHistory || validHistory.length === 0) {
    return (
      <div className={embedded ? 'p-6' : 'glass-card p-6'}>
        {!embedded && (
          <h3 className="text-lg font-semibold mb-6" style={{ color: '#F9FAFB' }}>
            {t('accountEquityCurve', language)}
          </h3>
        )}
        <div className="text-center py-16" style={{ color: '#9CA3AF' }}>
          <div className="mb-4 flex justify-center opacity-50">
            <BarChart3 className="w-16 h-16" />
          </div>
          <div className="text-lg font-semibold mb-2">
            {t('noHistoricalData', language)}
          </div>
          <div className="text-sm">{t('dataWillAppear', language)}</div>
        </div>
      </div>
    )
  }

  // limitshowrecent'sdata points（performance optimization）
  // ifdataexceed2000itemsdot，onlyshowrecent2000items
  const MAX_DISPLAY_POINTS = 2000
  const displayHistory =
    validHistory.length > MAX_DISPLAY_POINTS
      ? validHistory.slice(-MAX_DISPLAY_POINTS)
      : validHistory

  // calculateinitial balance（Priorityfrom account getconfig'sinitial balance，alternativefromhistorydatareverse calculate）
  const initialBalance =
    account?.initial_balance || // fromtraderconfigread realrealinitial balance
    (validHistory[0]
      ? validHistory[0].total_equity - validHistory[0].pnl
      : undefined) || // alternative：equity - PnL
    1000 // defaultvalue（andCreate Traderwhen'sdefaultconfigconsistent）

  // convertdataformatmode
  const chartData = displayHistory.map((point) => {
    const pnl = point.total_equity - initialBalance
    const pnlPct = ((pnl / initialBalance) * 100).toFixed(2)
    return {
      time: new Date(point.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      value: displayMode === 'dollar' ? point.total_equity : parseFloat(pnlPct),
      cycle: point.cycle_number,
      raw_equity: point.total_equity,
      raw_pnl: pnl,
      raw_pnl_pct: parseFloat(pnlPct),
    }
  })

  const currentValue = chartData[chartData.length - 1]
  const isProfit = currentValue.raw_pnl >= 0

  // calculateYaxis range
  const calculateYDomain = () => {
    if (displayMode === 'percent') {
      // percentagemodemode：find min max values，keep20%space
      const values = chartData.map((d) => d.value)
      const minVal = Math.min(...values)
      const maxVal = Math.max(...values)
      const range = Math.max(Math.abs(maxVal), Math.abs(minVal))
      const padding = Math.max(range * 0.2, 1) // Keep at least1%space
      return [Math.floor(minVal - padding), Math.ceil(maxVal + padding)]
    } else {
      // USDmodemode：withinitial balanceas baseline，vertical margin10%space
      const values = chartData.map((d) => d.value)
      const minVal = Math.min(...values, initialBalance)
      const maxVal = Math.max(...values, initialBalance)
      const range = maxVal - minVal
      const padding = Math.max(range * 0.15, initialBalance * 0.01) // Keep at least1%space
      return [Math.floor(minVal - padding), Math.ceil(maxVal + padding)]
    }
  }

  // customTooltip - Glass Style
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div
          className="rounded p-3 shadow-xl"
          style={{ background: 'rgba(22, 27, 34, 0.88)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
        >
          <div className="text-xs mb-1" style={{ color: '#9CA3AF' }}>
            Cycle #{data.cycle}
          </div>
          <div className="font-bold mono" style={{ color: '#F9FAFB' }}>
            {data.raw_equity.toFixed(2)}
          </div>
          <div
            className="text-sm mono font-bold"
            style={{ color: data.raw_pnl >= 0 ? 'var(--primary)' : '#F6465D' }}
          >
            {data.raw_pnl >= 0 ? '+' : ''}
            {data.raw_pnl.toFixed(2)}  ({data.raw_pnl_pct >= 0 ? '+' : ''}
            {data.raw_pnl_pct}%)
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className={embedded ? 'p-3 sm:p-5' : 'glass-card p-3 sm:p-5 animate-fade-in'}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex-1">
          {!embedded && (
            <h3
              className="text-base sm:text-lg font-bold mb-2"
              style={{ color: '#F9FAFB' }}
            >
              {t('accountEquityCurve', language)}
            </h3>
          )}
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
            <span
              className="text-2xl sm:text-3xl font-bold mono"
              style={{ color: '#F9FAFB' }}
            >
              {account?.total_equity.toFixed(2) || '0.00'}
              <span
                className="text-base sm:text-lg ml-1"
                style={{ color: '#9CA3AF' }}
              >

              </span>
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-sm sm:text-lg font-bold mono px-2 sm:px-3 py-1 rounded flex items-center gap-1"
                style={{
                  color: isProfit ? 'var(--primary)' : '#F6465D',
                  background: isProfit
                    ? 'rgba(14, 203, 129, 0.1)'
                    : 'rgba(246, 70, 93, 0.1)',
                  border: `1px solid ${isProfit
                    ? 'rgba(14, 203, 129, 0.2)'
                    : 'rgba(246, 70, 93, 0.2)'
                    }`,
                }}
              >
                {isProfit ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
                {isProfit ? '+' : ''}
                {currentValue.raw_pnl_pct}%
              </span>
              <span
                className="text-xs sm:text-sm mono"
                style={{ color: '#9CA3AF' }}
              >
                ({isProfit ? '+' : ''}
                {currentValue.raw_pnl.toFixed(2)} )
              </span>
            </div>
          </div>
        </div>

        {/* Display Mode Toggle */}
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          {/* Time Range Selector */}
          <div
            className="flex gap-0.5 sm:gap-1 rounded p-0.5 sm:p-1"
            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            {(['1D', '5D', '1M', '6M', 'YTD'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className="px-2 sm:px-3 py-1.5 rounded text-xs font-bold transition-all"
                style={
                  timeRange === range
                    ? {
                      background: 'var(--primary)',
                      color: '#000',
                      boxShadow: '0 2px 8px var(--primary-bg, 0.4)',
                    }
                    : { background: 'transparent', color: '#9CA3AF' }
                }
              >
                {range}
              </button>
            ))}
          </div>

          {/* $ / % Toggle */}
          <div
            className="flex gap-0.5 sm:gap-1 rounded p-0.5 sm:p-1"
            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <button
              onClick={() => setDisplayMode('dollar')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-bold transition-all flex items-center gap-1"
              style={
                displayMode === 'dollar'
                  ? {
                    background: 'var(--primary)',
                    color: '#000',
                    boxShadow: '0 2px 8px var(--primary-bg, 0.4)',
                  }
                  : { background: 'transparent', color: '#9CA3AF' }
              }
            >
              <DollarSign className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDisplayMode('percent')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-bold transition-all flex items-center gap-1"
              style={
                displayMode === 'percent'
                  ? {
                    background: 'var(--primary)',
                    color: '#000',
                    boxShadow: '0 2px 8px var(--primary-bg, 0.4)',
                  }
                  : { background: 'transparent', color: '#9CA3AF' }
              }
            >
              <Percent className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div
        className="my-2"
        style={{
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* SynapseStrike Watermark */}
        <div
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'rgba(0, 200, 5, 0.3)',
            zIndex: 10,
            pointerEvents: 'none',
            fontFamily: 'monospace',
          }}
        >
          SynapseStrike
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 5, bottom: 30 }}
          >
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
            <XAxis
              dataKey="time"
              stroke="#6B7280"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
              interval={Math.floor(chartData.length / 10)}
              angle={-15}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="#6B7280"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
              domain={calculateYDomain()}
              tickFormatter={(value) =>
                displayMode === 'dollar' ? `$${value.toFixed(0)}` : `${value}%`
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={displayMode === 'dollar' ? initialBalance : 0}
              stroke="#DADCE0"
              strokeDasharray="3 3"
              label={{
                value:
                  displayMode === 'dollar'
                    ? t('initialBalance', language).split(' ')[0]
                    : '0%',
                fill: '#9CA3AF',
                fontSize: 12,
              }}
            />
            <Line
              type="natural"
              dataKey="value"
              stroke="url(#colorGradient)"
              strokeWidth={3}
              dot={chartData.length > 50 ? false : { fill: 'var(--primary)', r: 3 }}
              activeDot={{
                r: 6,
                fill: 'var(--primary)',
                stroke: 'var(--primary)',
                strokeWidth: 2,
              }}
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Stats */}
      <div
        className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-3"
        style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
      >
        <div
          className="p-2 rounded transition-all hover:bg-opacity-50"
          style={{ background: 'var(--primary-bg, 0.05)' }}
        >
          <div
            className="text-xs mb-1 uppercase tracking-wider"
            style={{ color: '#9CA3AF' }}
          >
            {t('initialBalance', language)}
          </div>
          <div
            className="text-xs sm:text-sm font-bold mono"
            style={{ color: '#F9FAFB' }}
          >
            {initialBalance.toFixed(2)}
          </div>
        </div>
        <div
          className="p-2 rounded transition-all hover:bg-opacity-50"
          style={{ background: 'var(--primary-bg, 0.05)' }}
        >
          <div
            className="text-xs mb-1 uppercase tracking-wider"
            style={{ color: '#9CA3AF' }}
          >
            {t('currentEquity', language)}
          </div>
          <div
            className="text-xs sm:text-sm font-bold mono"
            style={{ color: '#F9FAFB' }}
          >
            {currentValue.raw_equity.toFixed(2)}
          </div>
        </div>
        <div
          className="p-2 rounded transition-all hover:bg-opacity-50"
          style={{ background: 'var(--primary-bg, 0.05)' }}
        >
          <div
            className="text-xs mb-1 uppercase tracking-wider"
            style={{ color: '#9CA3AF' }}
          >
            {t('historicalCycles', language)}
          </div>
          <div
            className="text-xs sm:text-sm font-bold mono"
            style={{ color: '#F9FAFB' }}
          >
            {validHistory.length} {t('cycles', language)}
          </div>
        </div>
        <div
          className="p-2 rounded transition-all hover:bg-opacity-50"
          style={{ background: 'var(--primary-bg, 0.05)' }}
        >
          <div
            className="text-xs mb-1 uppercase tracking-wider"
            style={{ color: '#9CA3AF' }}
          >
            {t('displayRange', language)}
          </div>
          <div
            className="text-xs sm:text-sm font-bold mono"
            style={{ color: '#F9FAFB' }}
          >
            {validHistory.length > MAX_DISPLAY_POINTS
              ? `${t('recent', language)} ${MAX_DISPLAY_POINTS}`
              : t('allData', language)}
          </div>
        </div>
      </div>
    </div>
  )
}
