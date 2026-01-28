import { useEffect, useRef, useState, memo } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { ChevronDown, TrendingUp, X } from 'lucide-react'

// Supported exchanges for stock trading
const BROKERAGES = [
  { id: 'NASDAQ', name: 'NASDAQ', prefix: 'NASDAQ:', suffix: '' },
  { id: 'NYSE', name: 'NYSE', prefix: 'NYSE:', suffix: '' },
  { id: 'AMEX', name: 'AMEX', prefix: 'AMEX:', suffix: '' },
  { id: 'ALPACA', name: 'Alpaca', prefix: '', suffix: '' },
] as const

// Popular stock symbols
const POPULAR_SYMBOLS = [
  'AAPL',
  'MSFT',
  'GOOGL',
  'AMZN',
  'TSLA',
  'META',
  'NVDA',
  'AMD',
  'NFLX',
  'DIS',
  'BA',
  'JPM',
]

// whenintervalselectitem
const INTERVALS = [
  { id: '1', label: '1m' },
  { id: '5', label: '5m' },
  { id: '15', label: '15m' },
  { id: '30', label: '30m' },
  { id: '60', label: '1H' },
  { id: '240', label: '4H' },
  { id: 'D', label: '1D' },
  { id: 'W', label: '1W' },
]

interface TradingViewChartProps {
  defaultSymbol?: string
  defaultBrokerage?: string
  height?: number
  showToolbar?: boolean
  embedded?: boolean // embedded mode（notshowouter card）
}

function TradingViewChartComponent({
  defaultSymbol = 'AAPL',
  defaultBrokerage = 'NASDAQ',
  height = 400,
  showToolbar = true,
  embedded = false,
}: TradingViewChartProps) {
  const { language } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)
  const [brokerage, setBrokerage] = useState(defaultBrokerage)
  const [symbol, setSymbol] = useState(defaultSymbol)
  const [timeInterval, setTimeInterval] = useState('60')
  const [customSymbol, setCustomSymbol] = useState('')
  const [showBrokerageDropdown, setShowBrokerageDropdown] = useState(false)
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // when external input's defaultSymbol changes，Updateinternal symbol
  useEffect(() => {
    if (defaultSymbol && defaultSymbol !== symbol) {
      // console.log('[TradingViewChart] Updatesymbol:', defaultSymbol)
      setSymbol(defaultSymbol)
    }
  }, [defaultSymbol])

  // when external input's defaultBrokerage changes，Updateinternal brokerage
  useEffect(() => {
    if (defaultBrokerage && defaultBrokerage !== brokerage) {
      const normalizedBrokerage = defaultBrokerage.toUpperCase()
      // console.log('[TradingViewChart] Updatebrokerage:', normalizedBrokerage)
      if (BROKERAGES.some(e => e.id === normalizedBrokerage)) {
        setBrokerage(normalizedBrokerage)
      }
    }
  }, [defaultBrokerage])

  // get complete's trade for symbol (contract format mode: BINANCE:AAPL.P)
  const getFullSymbol = () => {
    const brokerageInfo = BROKERAGES.find((e) => e.id === brokerage)
    const prefix = brokerageInfo?.prefix || 'NASDAQ:'
    const suffix = brokerageInfo?.suffix || ''
    return `${prefix}${symbol}${suffix}`
  }

  // Load TradingView Widget
  useEffect(() => {
    if (!containerRef.current) return

    // clearemptycontentmanager
    containerRef.current.innerHTML = ''

    // create widget contentmanager
    const widgetContainer = document.createElement('div')
    widgetContainer.className = 'tradingview-widget-container'
    widgetContainer.style.height = '100%'
    widgetContainer.style.width = '100%'

    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    widgetDiv.style.height = '100%'
    widgetDiv.style.width = '100%'

    widgetContainer.appendChild(widgetDiv)
    containerRef.current.appendChild(widgetContainer)

    // Load TradingView script
    const script = document.createElement('script')
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      width: '100%',
      height: '100%',
      symbol: getFullSymbol(),
      interval: timeInterval,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: false ? 'zh_CN' : 'en',
      enable_publishing: false,
      backgroundColor: 'rgba(11, 14, 17, 1)',
      gridColor: 'rgba(43, 49, 57, 0.5)',
      hide_top_toolbar: !showToolbar,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
    })

    widgetContainer.appendChild(script)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [brokerage, symbol, timeInterval, language, showToolbar])

  // handlecustomtradefor input
  const handleCustomSymbolSubmit = () => {
    if (customSymbol.trim()) {
      let sym = customSymbol.trim().toUpperCase()
      // ifnohas  aftersuffix，auto add
      if (!sym.endsWith('')) {
        sym = sym + ''
      }
      setSymbol(sym)
      setCustomSymbol('')
      setShowSymbolDropdown(false)
    }
  }

  return (
    <div
      className={`${embedded ? '' : 'glass-card'} overflow-hidden ${embedded ? '' : 'animate-fade-in'} ${isFullscreen
        ? 'fixed inset-0 z-50 rounded-none flex flex-col'
        : ''
        }`}
      style={isFullscreen ? { background: 'var(--bg-secondary)' } : undefined}
    >
      {/* Header */}
      <div
        className="flex flex-wrap items-center gap-2 p-3 sm:p-4"
        style={{ borderBottom: embedded ? 'none' : '1px solid rgba(255, 255, 255, 0.08)' }}
      >
        {!embedded && (
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <h3
              className="text-base sm:text-lg font-bold"
              style={{ color: '#F9FAFB' }}
            >
              {t('marketChart', language)}
            </h3>
          </div>
        )}

        {/* Controls */}
        <div className={`flex flex-wrap items-center gap-2 ${embedded ? '' : 'ml-auto'}`}>
          {/* Brokerage Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowBrokerageDropdown(!showBrokerageDropdown)
                setShowSymbolDropdown(false)
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-all"
              style={{
                background: 'rgba(22, 27, 34, 0.88)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#F9FAFB',
              }}
            >
              {BROKERAGES.find((e) => e.id === brokerage)?.name || brokerage}
              <ChevronDown className="w-4 h-4" style={{ color: '#9CA3AF' }} />
            </button>

            {showBrokerageDropdown && (
              <div
                className="absolute top-full left-0 mt-1 py-1 rounded-lg shadow-xl z-20 min-w-[120px]"
                style={{
                  background: 'rgba(22, 27, 34, 0.88)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {BROKERAGES.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => {
                      setBrokerage(ex.id)
                      setShowBrokerageDropdown(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm transition-all hover:bg-opacity-50"
                    style={{
                      color: brokerage === ex.id ? 'var(--primary)' : '#F9FAFB',
                      background:
                        brokerage === ex.id
                          ? 'var(--primary-bg, 0.1)'
                          : 'transparent',
                    }}
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Symbol Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowSymbolDropdown(!showSymbolDropdown)
                setShowBrokerageDropdown(false)
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-bold transition-all"
              style={{
                background: 'var(--primary-bg, 0.1)',
                border: '1px solid var(--primary-bg, 0.3)',
                color: 'var(--primary)',
              }}
            >
              {symbol}
              <ChevronDown className="w-4 h-4" />
            </button>

            {showSymbolDropdown && (
              <div
                className="absolute top-full left-0 mt-1 py-2 rounded-lg shadow-xl z-20 w-[280px]"
                style={{
                  background: 'rgba(22, 27, 34, 0.88)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {/* Custom Input */}
                <div className="px-3 pb-2" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customSymbol}
                      onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleCustomSymbolSubmit()}
                      placeholder={t('enterSymbol', language)}
                      className="flex-1 px-3 py-1.5 rounded text-sm"
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#F9FAFB',
                      }}
                    />
                    <button
                      onClick={handleCustomSymbolSubmit}
                      className="px-3 py-1.5 rounded text-sm font-medium"
                      style={{
                        background: 'var(--primary)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      OK
                    </button>
                  </div>
                </div>

                {/* Popular Symbols */}
                <div className="px-2 pt-2">
                  <div
                    className="text-xs px-2 py-1 mb-1"
                    style={{ color: '#9CA3AF' }}
                  >
                    {t('popularSymbols', language)}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {POPULAR_SYMBOLS.map((sym) => (
                      <button
                        key={sym}
                        onClick={() => {
                          setSymbol(sym)
                          setShowSymbolDropdown(false)
                        }}
                        className="px-2 py-1.5 rounded text-xs font-medium transition-all"
                        style={{
                          color: symbol === sym ? 'var(--primary)' : '#F9FAFB',
                          background:
                            symbol === sym
                              ? 'var(--primary-bg, 0.1)'
                              : 'rgba(43, 49, 57, 0.3)',
                        }}
                      >
                        {sym.replace('', '')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interval Selector */}
          <div
            className="flex gap-0.5 p-0.5 rounded"
            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            {INTERVALS.map((int) => (
              <button
                key={int.id}
                onClick={() => setTimeInterval(int.id)}
                className="px-2 py-1 rounded text-xs font-medium transition-all"
                style={{
                  background: timeInterval === int.id ? 'var(--primary)' : 'transparent',
                  color: timeInterval === int.id ? '#FFFFFF' : '#9CA3AF',
                }}
              >
                {int.label}
              </button>
            ))}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded transition-all"
            style={{
              background: isFullscreen ? 'var(--primary)' : 'transparent',
              color: isFullscreen ? '#FFFFFF' : '#9CA3AF',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
            title={isFullscreen ? t('exitFullscreen', language) : t('fullscreen', language)}
          >
            {isFullscreen ? (
              <X className="w-4 h-4" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div
        ref={containerRef}
        style={{
          height: isFullscreen ? 'calc(100vh - 65px)' : height,
          background: 'var(--bg-secondary)',
          overflow: 'hidden',
        }}
      />

      {/* Click outside to close dropdowns */}
      {(showBrokerageDropdown || showSymbolDropdown) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setShowBrokerageDropdown(false)
            setShowSymbolDropdown(false)
          }}
        />
      )}
    </div>
  )
}

// Use memo avoidnotnecessary'sre-render
export const TradingViewChart = memo(TradingViewChartComponent)
