import { useState } from 'react'
import { Trophy } from 'lucide-react'
import useSWR from 'swr'
import { api } from '../lib/api'
import type { CompetitionData } from '../types'
import { ComparisonChart } from './ComparisonChart'
import { TraderConfigViewModal } from './TraderConfigViewModal'
import { getTraderColor } from '../utils/traderColors'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { PunkAvatar, getTraderAvatar } from './PunkAvatar'

export function CompetitionPage() {
  const { language } = useLanguage()
  const [selectedTrader, setSelectedTrader] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: competition } = useSWR<CompetitionData>(
    'competition',
    api.getCompetition,
    {
      refreshInterval: 15000, // 15sec refresh（competitiondatanotneed too frequentUpdate）
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  )

  const handleTraderClick = async (traderId: string) => {
    try {
      // Use public config endpoint for competition page (no auth required)
      const traderConfig = await api.getPublicTraderConfig(traderId)
      setSelectedTrader(traderConfig)
      setIsModalOpen(true)
    } catch (error) {
      console.error('Failed to fetch trader config:', error)
      // For competition page, still show something if public config fails
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedTrader(null)
  }

  if (!competition) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-8 animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-3 flex-1">
              <div className="skeleton h-8 w-64"></div>
              <div className="skeleton h-4 w-48"></div>
            </div>
            <div className="skeleton h-12 w-32"></div>
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="skeleton h-6 w-40 mb-4"></div>
          <div className="space-y-3">
            <div className="skeleton h-20 w-full rounded"></div>
            <div className="skeleton h-20 w-full rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  // ifhasdatareturnbut notrader，showemptystatus
  if (!competition.traders || competition.traders.length === 0) {
    return (
      <div className="space-y-5 animate-fade-in">
        {/* Competition Header - compact version */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
          <div className="flex items-center gap-3 md:gap-4">
            <div
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'var(--primary)',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <Trophy
                className="w-6 h-6 md:w-7 md:h-7"
                style={{ color: '#000' }}
              />
            </div>
            <div>
              <h1
                className="text-xl md:text-2xl font-bold flex items-center gap-2"
                style={{ color: '#FAFAFA' }}
              >
                {t('aiCompetition', language)}
                <span
                  className="text-xs font-normal px-2 py-1 rounded"
                  style={{
                    background: 'rgba(124, 58, 237, 0.15)',
                    color: 'var(--primary)',
                  }}
                >
                  0 {t('traders', language)}
                </span>
              </h1>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                {t('liveBattle', language)}
              </p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="glass-card p-8 text-center">
          <Trophy
            className="w-16 h-16 mx-auto mb-4 opacity-40"
            style={{ color: '#9CA3AF' }}
          />
          <h3 className="text-lg font-bold mb-2" style={{ color: '#F9FAFB' }}>
            {t('noTraders', language)}
          </h3>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            {t('createFirstTrader', language)}
          </p>
        </div>
      </div>
    )
  }

  // sort by returns
  const sortedTraders = [...competition.traders].sort(
    (a, b) => b.total_pnl_pct - a.total_pnl_pct
  )

  // find leader
  const leader = sortedTraders[0]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Competition Header - compact version */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
        <div className="flex items-center gap-3 md:gap-4">
          <div
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center"
            style={{
              background: 'var(--primary)',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Trophy
              className="w-6 h-6 md:w-7 md:h-7"
              style={{ color: '#000' }}
            />
          </div>
          <div>
            <h1
              className="text-xl md:text-2xl font-bold flex items-center gap-2"
              style={{ color: '#FAFAFA' }}
            >
              {t('aiCompetition', language)}
              <span
                className="text-xs font-normal px-2 py-1 rounded"
                style={{
                  background: 'rgba(124, 58, 237, 0.15)',
                  color: 'var(--primary)',
                }}
              >
                {competition.count} {t('traders', language)}
              </span>
            </h1>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              {t('liveBattle', language)}
            </p>
          </div>
        </div>
        <div className="text-left md:text-right w-full md:w-auto">
          <div className="text-xs mb-1" style={{ color: '#9CA3AF' }}>
            {t('leader', language)}
          </div>
          <div
            className="text-base md:text-lg font-bold"
            style={{ color: 'var(--primary)' }}
          >
            {leader?.trader_name}
          </div>
          <div
            className="text-sm font-semibold"
            style={{
              color: (leader?.total_pnl ?? 0) >= 0 ? 'var(--primary)' : '#F6465D',
            }}
          >
            {(leader?.total_pnl ?? 0) >= 0 ? '+' : ''}
            {leader?.total_pnl_pct?.toFixed(2) || '0.00'}%
          </div>
        </div>
      </div>

      {/* Left/Right Split: Performance Chart + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Performance Comparison Chart */}
        <div
          className="glass-card p-5 animate-slide-in"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-bold flex items-center gap-2"
              style={{ color: '#F9FAFB' }}
            >
              {t('performanceComparison', language)}
            </h2>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>
              {t('realTimePnL', language)}
            </div>
          </div>
          <ComparisonChart traders={sortedTraders.slice(0, 10)} />
        </div>

        {/* Right: Leaderboard */}
        <div
          className="glass-card p-5 animate-slide-in"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-bold flex items-center gap-2"
              style={{ color: '#F9FAFB' }}
            >
              {t('leaderboard', language)}
            </h2>
            <div
              className="text-xs px-2 py-1 rounded"
              style={{
                background: 'rgba(124, 58, 237, 0.1)',
                color: 'var(--primary)',
                border: '1px solid rgba(124, 58, 237, 0.2)',
              }}
            >
              {t('live', language)}
            </div>
          </div>
          <div className="space-y-2">
            {sortedTraders.map((trader, index) => {
              const isLeader = index === 0
              const traderColor = getTraderColor(
                sortedTraders,
                trader.trader_id
              )

              return (
                <div
                  key={trader.trader_id}
                  onClick={() => handleTraderClick(trader.trader_id)}
                  className="rounded p-3 transition-all duration-300 hover:translate-y-[-1px] cursor-pointer hover:shadow-lg"
                  style={{
                    background: isLeader
                      ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(15, 15, 18, 0.95) 100%)'
                      : 'var(--glass-bg)',
                    border: `1px solid ${isLeader ? 'rgba(124, 58, 237, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
                    boxShadow: isLeader
                      ? '0 3px 15px rgba(124, 58, 237, 0.15), 0 0 0 1px rgba(124, 58, 237, 0.1)'
                      : '0 1px 2px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    {/* Rank & Avatar & Name */}
                    <div className="flex items-center gap-3">
                      {/* Rank Badge */}
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: index === 0
                            ? 'var(--primary)'
                            : index === 1
                              ? 'linear-gradient(135deg, #A1A1AA 0%, #D4D4D8 100%)'
                              : index === 2
                                ? 'linear-gradient(135deg, #CD7F32 0%, #E8A64C 100%)'
                                : 'rgba(255, 255, 255, 0.06)',
                          color: index < 3 ? '#fff' : '#A1A1AA',
                        }}
                      >
                        {index + 1}
                      </div>
                      {/* Punk Avatar */}
                      <PunkAvatar
                        seed={getTraderAvatar(trader.trader_id, trader.trader_name)}
                        size={36}
                        className="rounded-lg"
                      />
                      <div>
                        <div
                          className="font-bold text-sm"
                          style={{ color: '#F9FAFB' }}
                        >
                          {trader.trader_name}
                        </div>
                        <div
                          className="text-xs font-semibold tracking-wide"
                          style={{ color: traderColor }}
                        >
                          {(trader.ai_model || 'AI').toUpperCase()}
                          {trader.brokerage ? ` • ${trader.brokerage.toUpperCase()}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-2 md:gap-3 flex-wrap md:flex-nowrap">
                      {/* Total Equity */}
                      <div className="text-right">
                        <div className="text-xs" style={{ color: '#9CA3AF' }}>
                          {t('equity', language)}
                        </div>
                        <div
                          className="text-xs md:text-sm font-bold mono"
                          style={{ color: '#F9FAFB' }}
                        >
                          {trader.total_equity?.toFixed(2) || '0.00'}
                        </div>
                      </div>

                      {/* P&L */}
                      <div className="text-right min-w-[70px] md:min-w-[90px]">
                        <div className="text-xs" style={{ color: '#9CA3AF' }}>
                          {t('pnl', language)}
                        </div>
                        <div
                          className="text-base md:text-lg font-bold mono"
                          style={{
                            color:
                              (trader.total_pnl ?? 0) >= 0
                                ? 'var(--primary)'
                                : '#F6465D',
                          }}
                        >
                          {(trader.total_pnl ?? 0) >= 0 ? '+' : ''}
                          {trader.total_pnl_pct?.toFixed(2) || '0.00'}%
                        </div>
                        <div
                          className="text-xs mono"
                          style={{ color: '#9CA3AF' }}
                        >
                          {(trader.total_pnl ?? 0) >= 0 ? '+' : ''}
                          {trader.total_pnl?.toFixed(2) || '0.00'}
                        </div>
                      </div>

                      {/* Positions */}
                      <div className="text-right">
                        <div className="text-xs" style={{ color: '#9CA3AF' }}>
                          Pos
                        </div>
                        <div
                          className="text-xs md:text-sm font-bold mono"
                          style={{ color: '#F9FAFB' }}
                        >
                          {trader.position_count}
                        </div>
                        <div className="text-xs" style={{ color: '#9CA3AF' }}>
                          {trader.margin_used_pct > 0 ? `${trader.margin_used_pct.toFixed(1)}%` : 'Open'}
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <div
                          className="px-2 py-1 rounded text-xs font-bold"
                          style={
                            trader.is_running
                              ? {
                                background: 'rgba(14, 203, 129, 0.1)',
                                color: 'var(--primary)',
                              }
                              : {
                                background: 'rgba(246, 70, 93, 0.1)',
                                color: '#F6465D',
                              }
                          }
                        >
                          {trader.is_running ? '●' : '○'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Head-to-Head Stats */}
      {competition.traders.length === 2 && (
        <div
          className="glass-card p-5 animate-slide-in"
          style={{ animationDelay: '0.3s' }}
        >
          <h2
            className="text-lg font-bold mb-4 flex items-center gap-2"
            style={{ color: '#F9FAFB' }}
          >
            {t('headToHead', language)}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {sortedTraders.map((trader, index) => {
              const isWinning = index === 0
              const opponent = sortedTraders[1 - index]

              // Check if both values are valid numbers
              const hasValidData =
                trader.total_pnl_pct != null &&
                opponent.total_pnl_pct != null &&
                !isNaN(trader.total_pnl_pct) &&
                !isNaN(opponent.total_pnl_pct)

              const gap = hasValidData
                ? trader.total_pnl_pct - opponent.total_pnl_pct
                : NaN

              return (
                <div
                  key={trader.trader_id}
                  className="p-4 rounded transition-all duration-300 hover:scale-[1.02]"
                  style={
                    isWinning
                      ? {
                        background:
                          'linear-gradient(135deg, rgba(14, 203, 129, 0.08) 0%, rgba(14, 203, 129, 0.02) 100%)',
                        border: '2px solid rgba(14, 203, 129, 0.3)',
                        boxShadow: '0 3px 15px rgba(14, 203, 129, 0.12)',
                      }
                      : {
                        background: 'var(--bg-secondary)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
                      }
                  }
                >
                  <div className="text-center">
                    {/* Avatar */}
                    <div className="flex justify-center mb-3">
                      <PunkAvatar
                        seed={getTraderAvatar(trader.trader_id, trader.trader_name)}
                        size={56}
                        className="rounded-xl"
                      />
                    </div>
                    <div
                      className="text-sm md:text-base font-bold mb-2"
                      style={{
                        color: getTraderColor(sortedTraders, trader.trader_id),
                      }}
                    >
                      {trader.trader_name}
                    </div>
                    <div
                      className="text-lg md:text-2xl font-bold mono mb-1"
                      style={{
                        color:
                          (trader.total_pnl ?? 0) >= 0 ? 'var(--primary)' : '#F6465D',
                      }}
                    >
                      {trader.total_pnl_pct != null &&
                        !isNaN(trader.total_pnl_pct)
                        ? `${trader.total_pnl_pct >= 0 ? '+' : ''}${trader.total_pnl_pct.toFixed(2)}%`
                        : '—'}
                    </div>
                    {hasValidData && isWinning && gap > 0 && (
                      <div
                        className="text-xs font-semibold"
                        style={{ color: 'var(--primary)' }}
                      >
                        {t('leadingBy', language, { gap: gap.toFixed(2) })}
                      </div>
                    )}
                    {hasValidData && !isWinning && gap < 0 && (
                      <div
                        className="text-xs font-semibold"
                        style={{ color: '#F6465D' }}
                      >
                        {t('behindBy', language, {
                          gap: Math.abs(gap).toFixed(2),
                        })}
                      </div>
                    )}
                    {!hasValidData && (
                      <div
                        className="text-xs font-semibold"
                        style={{ color: '#9CA3AF' }}
                      >
                        —
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Trader Config View Modal */}
      <TraderConfigViewModal
        isOpen={isModalOpen}
        onClose={closeModal}
        traderData={selectedTrader}
      />
    </div>
  )
}
