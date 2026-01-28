import { useState, useEffect } from 'react'
import { EquityChart } from './EquityChart'
import { TradingViewChart } from './TradingViewChart'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { BarChart3, CandlestickChart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ChartTabsProps {
  traderId: string
  selectedSymbol?: string // fromexternalSelect'ssymbol
  updateKey?: number // forceUpdate's key
  brokerageId?: string // brokerageID
}

type ChartTab = 'equity' | 'kline'

export function ChartTabs({ traderId, selectedSymbol, updateKey, brokerageId }: ChartTabsProps) {
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useState<ChartTab>('equity')
  const [chartSymbol, setChartSymbol] = useState<string>('AAPL')

  // whenfromexternalSelectsymbolwhen，auto switch toKline chart
  useEffect(() => {
    if (selectedSymbol) {
      console.log('[ChartTabs] receivedsymbolSelect:', selectedSymbol, 'updateKey:', updateKey)
      setChartSymbol(selectedSymbol)
      setActiveTab('kline')
    }
  }, [selectedSymbol, updateKey])

  console.log('[ChartTabs] rendering, activeTab:', activeTab)

  return (
    <div className="glass-card">
      {/* Tab Headers - this isTabtoggle button area */}
      <div
        className="flex items-center gap-2 p-3"
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'var(--bg-secondary)',
        }}
      >
        <button
          onClick={() => {
            console.log('[ChartTabs] switching to equity')
            setActiveTab('equity')
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'equity'
            ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 shadow-[0_0_10px_rgba(252,213,53,0.15)]'
            : 'text-gray-400 hover:text-white hover:bg-[var(--bg-secondary)]/5 border border-transparent'
            }`}
        >
          <BarChart3 className="w-4 h-4" />
          {t('accountEquityCurve', language)}
        </button>

        <button
          onClick={() => {
            console.log('[ChartTabs] switching to kline')
            setActiveTab('kline')
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'kline'
            ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 shadow-[0_0_10px_rgba(252,213,53,0.15)]'
            : 'text-gray-400 hover:text-white hover:bg-[var(--bg-secondary)]/5 border border-transparent'
            }`}
        >
          <CandlestickChart className="w-4 h-4" />
          {t('marketChart', language)}
        </button>
      </div>

      {/* Tab Content */}
      <div className="relative overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'equity' ? (
            <motion.div
              key="equity"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <EquityChart traderId={traderId} embedded />
            </motion.div>
          ) : (
            <motion.div
              key={`kline-${chartSymbol}-${brokerageId}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <TradingViewChart
                height={400}
                embedded
                defaultSymbol={chartSymbol}
                defaultBrokerage={brokerageId}
                key={`${chartSymbol}-${brokerageId}-${updateKey || ''}`}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
