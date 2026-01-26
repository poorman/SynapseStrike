import { useEffect, useState, useRef } from 'react'
import useSWR, { mutate } from 'swr'
import { api } from './lib/api'
import { ChartTabs } from './components/ChartTabs'
import { AITradersPage } from './components/AITradersPage'
import { LoginPage } from './components/LoginPage'
import { RegisterPage } from './components/RegisterPage'
import { ResetPasswordPage } from './components/ResetPasswordPage'
import { CompetitionPage } from './components/CompetitionPage'
import { LandingPage } from './pages/LandingPage'
import { FAQPage } from './pages/FAQPage'
import { StrategyStudioPage } from './pages/StrategyStudioPage'
import { CursorStrategyPage } from './pages/CursorStrategyPage'
import { TacticsStudioPage } from './pages/TacticsStudioPage'
import { StrategyOpusPage } from './pages/StrategyOpusPage'
import { StrategyCurrentPage } from './pages/StrategyCurrentPage'
import { DebateArenaPage } from './pages/DebateArenaPage'
import HeaderBar from './components/HeaderBar'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ConfirmDialogProvider } from './components/ConfirmDialog'
import { t, type Language } from './i18n/translations'
import { confirmToast, notify } from './lib/notify'
import { useSystemConfig } from './hooks/useSystemConfig'
import { DecisionCard } from './components/DecisionCard'
import { PunkAvatar, getTraderAvatar } from './components/PunkAvatar'

import { BacktestPage } from './components/BacktestPage'
import { LogOut, Loader2 } from 'lucide-react'
import type {
  SystemStatus,
  AccountInfo,
  Position,
  DecisionRecord,
  Statistics,
  TraderInfo,
  Brokerage,
} from './types'

type Page =
  | 'competition'
  | 'traders'
  | 'trader'
  | 'backtest'
  | 'strategy'
  | 'cursor-strategy'
  | 'tactics'
  | 'debate'
  | 'faq'
  | 'login'
  | 'register'

// getfriendly'sAImodelname
function getModelDisplayName(modelId: string): string {
  switch (modelId.toLowerCase()) {
    case 'deepseek':
      return 'DeepSeek'
    case 'qwen':
      return 'Qwen'
    case 'claude':
      return 'Claude'
    default:
      return modelId.toUpperCase()
  }
}

// Helper function to get brokerage display name from brokerage ID (UUID)
function getBrokerageDisplayNameFromList(
  brokerageId: string | undefined,
  brokerages: Brokerage[] | undefined
): string {
  if (!brokerageId) return 'Unknown'
  const brokerage = brokerages?.find((e) => e.id === brokerageId)
  if (!brokerage) return brokerageId.substring(0, 8).toUpperCase() + '...'
  const typeName = brokerage.brokerage_type?.toUpperCase() || brokerage.name
  return brokerage.account_name
    ? `${typeName} - ${brokerage.account_name}`
    : typeName
}

// Helper function to get brokerage type from brokerage ID (UUID) - for TradingView charts
function getBrokerageTypeFromList(
  brokerageId: string | undefined,
  brokerages: Brokerage[] | undefined
): string {
  if (!brokerageId) return 'NASDAQ'
  const brokerage = brokerages?.find((e) => e.id === brokerageId)
  if (!brokerage) return 'NASDAQ' // Default to NASDAQ for charts
  return brokerage.brokerage_type?.toUpperCase() || 'NASDAQ'
}

function App() {
  const { language, setLanguage } = useLanguage()
  const { user, token, logout, isLoading } = useAuth()
  const { loading: configLoading } = useSystemConfig()
  const [route, setRoute] = useState(window.location.pathname)

  // fromURLread initial from pathPagestatus（supportrefresh keepPage）
  const getInitialPage = (): Page => {
    const path = window.location.pathname
    const hash = window.location.hash.slice(1) // remove #

    if (path === '/traders' || hash === 'traders') return 'traders'
    if (path === '/backtest' || hash === 'backtest') return 'backtest'
    if (path === '/strategy/sonnet' || path === '/tactics' || hash === 'tactics') return 'tactics'
    if (path === '/strategy/cursor') return 'cursor-strategy'
    if (path === '/strategy/opus') return 'strategy' // Route check handles opus page
    if (path === '/strategy/current') return 'strategy' // Route check handles current page
    if (path === '/strategy' || path.startsWith('/strategy/') || hash === 'strategy') return 'strategy'
    if (path === '/debate' || hash === 'debate') return 'debate'
    if (path === '/dashboard' || hash === 'trader' || hash === 'details')
      return 'trader'
    return 'competition' // defaultasCompetition Page
  }

  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage())
  // Persist selectedTraderId to localStorage
  const [selectedTraderId, setSelectedTraderId] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedTraderId') || undefined
    }
    return undefined
  })
  const [lastUpdate, setLastUpdate] = useState<string>('--:--:--')
  const [decisionsLimit, setDecisionsLimit] = useState<number>(5)

  // Save selectedTraderId to localStorage when it changes
  useEffect(() => {
    if (selectedTraderId) {
      localStorage.setItem('selectedTraderId', selectedTraderId)
    }
  }, [selectedTraderId])

  // listenURLchange，SyncPagestatus
  useEffect(() => {
    const handleRouteChange = () => {
      const path = window.location.pathname
      const hash = window.location.hash.slice(1)

      if (path === '/traders' || hash === 'traders') {
        setCurrentPage('traders')
      } else if (path === '/backtest' || hash === 'backtest') {
        setCurrentPage('backtest')
      } else if (path === '/strategy/sonnet' || path === '/tactics' || hash === 'tactics') {
        setCurrentPage('tactics')
      } else if (path === '/strategy/opus') {
        setCurrentPage('strategy') // Uses route check for opus in render
      } else if (path === '/strategy/current') {
        setCurrentPage('strategy') // Uses route check for current in render
      } else if (path === '/strategy' || path.startsWith('/strategy/') || hash === 'strategy') {
        setCurrentPage('strategy')
      } else if (path === '/debate' || hash === 'debate') {
        setCurrentPage('debate')
      } else if (
        path === '/dashboard' ||
        hash === 'trader' ||
        hash === 'details'
      ) {
        setCurrentPage('trader')
      } else if (
        path === '/competition' ||
        hash === 'competition' ||
        hash === ''
      ) {
        setCurrentPage('competition')
      }
      setRoute(path)
    }

    window.addEventListener('hashchange', handleRouteChange)
    window.addEventListener('popstate', handleRouteChange)
    return () => {
      window.removeEventListener('hashchange', handleRouteChange)
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  // togglePagewhenUpdateURL hash (currentcall directly via buttonsetCurrentPage，thisitemsfunctiontempwhenkeepused fornotto extend)
  // const navigateToPage = (page: Page) => {
  //   setCurrentPage(page);
  //   window.location.hash = page === 'competition' ? '' : 'trader';
  // };

  // gettraderlist（onlyatuserLoginwhen）
  const { data: traders, error: tradersError } = useSWR<TraderInfo[]>(
    user && token ? 'traders' : null,
    api.getTraders,
    {
      refreshInterval: 10000,
      shouldRetryOnError: false, // avoidatbackendnotrunlinewheninfinite retry
    }
  )

  // getbrokerageslist（used forshowbrokeragename）
  const { data: brokerages } = useSWR<Brokerage[]>(
    user && token ? 'brokerages' : null,
    api.getBrokerageConfigs,
    {
      refreshInterval: 60000, // 1minutesrefreshonetimes
      shouldRetryOnError: false,
    }
  )

  // When traders load, validate selectedTraderId or set to first trader
  useEffect(() => {
    if (traders && traders.length > 0) {
      // Check if stored selectedTraderId is valid
      if (selectedTraderId) {
        const traderExists = traders.some(t => t.trader_id === selectedTraderId)
        if (!traderExists) {
          // Stored trader no longer exists, use first trader
          setSelectedTraderId(traders[0].trader_id)
        }
      } else {
        // No trader selected, use first one
        setSelectedTraderId(traders[0].trader_id)
      }
    }
  }, [traders, selectedTraderId])

  // ifattraderPage，getthistrader'sdata
  const { data: status } = useSWR<SystemStatus>(
    currentPage === 'trader' && selectedTraderId
      ? `status-${selectedTraderId}`
      : null,
    () => api.getStatus(selectedTraderId),
    {
      refreshInterval: 15000, // 15sec refresh（Match backend15sec cache）
      revalidateOnFocus: false, // Disable revalidate on focus，Reduce requests
      dedupingInterval: 10000, // 10sec dedup，Prevent duplicate requests
    }
  )

  const { data: account } = useSWR<AccountInfo>(
    currentPage === 'trader' && selectedTraderId
      ? `account-${selectedTraderId}`
      : null,
    () => api.getAccount(selectedTraderId),
    {
      refreshInterval: 15000, // 15sec refresh（Match backend15sec cache）
      revalidateOnFocus: false, // Disable revalidate on focus，Reduce requests
      dedupingInterval: 10000, // 10sec dedup，Prevent duplicate requests
    }
  )

  const { data: positions } = useSWR<Position[]>(
    currentPage === 'trader' && selectedTraderId
      ? `positions-${selectedTraderId}`
      : null,
    () => api.getPositions(selectedTraderId),
    {
      refreshInterval: 15000, // 15sec refresh（Match backend15sec cache）
      revalidateOnFocus: false, // Disable revalidate on focus，Reduce requests
      dedupingInterval: 10000, // 10sec dedup，Prevent duplicate requests
    }
  )

  const { data: decisions } = useSWR<DecisionRecord[]>(
    currentPage === 'trader' && selectedTraderId
      ? `decisions/latest-${selectedTraderId}-${decisionsLimit}`
      : null,
    () => api.getLatestDecisions(selectedTraderId, decisionsLimit),
    {
      refreshInterval: 30000, // 30sec refresh（decisionUpdatelower frequency）
      revalidateOnFocus: false,
      dedupingInterval: 20000,
    }
  )

  const { data: stats } = useSWR<Statistics>(
    currentPage === 'trader' && selectedTraderId
      ? `statistics-${selectedTraderId}`
      : null,
    () => api.getStatistics(selectedTraderId),
    {
      refreshInterval: 30000, // 30sec refresh（statisticsdataUpdatelower frequency）
      revalidateOnFocus: false,
      dedupingInterval: 20000,
    }
  )

  useEffect(() => {
    if (account) {
      const now = new Date().toLocaleTimeString()
      setLastUpdate(now)
    }
  }, [account])

  const selectedTrader = traders?.find((t) => t.trader_id === selectedTraderId)

  // Handle routing
  useEffect(() => {
    const handlePopState = () => {
      setRoute(window.location.pathname)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Set current page based on route for consistent navigation state
  useEffect(() => {
    if (route === '/competition') {
      setCurrentPage('competition')
    } else if (route === '/traders') {
      setCurrentPage('traders')
    } else if (route === '/dashboard') {
      setCurrentPage('trader')
    }
  }, [route])

  // Show loading spinner while checking auth or config
  if (isLoading || configLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <div className="text-center">
          <img
            src="/images/logo.png"
            alt="SynapseStrike Logo"
            className="w-16 h-16 mx-auto mb-4 animate-pulse"
          />
          <p style={{ color: '#F9FAFB' }}>{t('loading', language)}</p>
        </div>
      </div>
    )
  }

  // Handle specific routes regardless of authentication
  if (route === '/login') {
    return <LoginPage />
  }
  if (route === '/register') {
    return <RegisterPage />
  }
  if (route === '/faq') {
    return (
      <div
        className="min-h-screen"
        style={{ background: 'var(--bg-secondary)', color: '#F9FAFB' }}
      >
        <HeaderBar
          isLoggedIn={!!user}
          currentPage="faq"
          language={language}
          onLanguageChange={setLanguage}
          user={user}
          onLogout={logout}
          onPageChange={(page: Page) => {
            if (page === 'competition') {
              window.history.pushState({}, '', '/competition')
              setRoute('/competition')
              setCurrentPage('competition')
            } else if (page === 'traders') {
              window.history.pushState({}, '', '/traders')
              setRoute('/traders')
              setCurrentPage('traders')
            } else if (page === 'trader') {
              window.history.pushState({}, '', '/dashboard')
              setRoute('/dashboard')
              setCurrentPage('trader')
            } else if (page === 'faq') {
              window.history.pushState({}, '', '/faq')
              setRoute('/faq')
            } else if (page === 'backtest') {
              window.history.pushState({}, '', '/backtest')
              setRoute('/backtest')
              setCurrentPage('backtest')
            } else if (page === 'strategy') {
              window.history.pushState({}, '', '/strategy')
              setRoute('/strategy')
              setCurrentPage('strategy')
            } else if (page === 'tactics') {
              window.history.pushState({}, '', '/tactics')
              setRoute('/tactics')
              setCurrentPage('tactics')
            } else if (page === 'debate') {
              window.history.pushState({}, '', '/debate')
              setRoute('/debate')
              setCurrentPage('debate')
            }
          }}
        />
        <FAQPage />
      </div>
    )
  }
  if (route === '/reset-password') {
    return <ResetPasswordPage />
  }
  if (route === '/competition') {
    return (
      <div
        className="min-h-screen"
        style={{ background: 'var(--bg-secondary)', color: '#F9FAFB' }}
      >
        <HeaderBar
          isLoggedIn={!!user}
          currentPage="competition"
          language={language}
          onLanguageChange={setLanguage}
          user={user}
          onLogout={logout}
          onPageChange={(page: Page) => {
            console.log('Competition page onPageChange called with:', page)
            console.log('Current route:', route, 'Current page:', currentPage)

            if (page === 'competition') {
              console.log('Navigating to competition')
              window.history.pushState({}, '', '/competition')
              setRoute('/competition')
              setCurrentPage('competition')
            } else if (page === 'traders') {
              console.log('Navigating to traders')
              window.history.pushState({}, '', '/traders')
              setRoute('/traders')
              setCurrentPage('traders')
            } else if (page === 'trader') {
              console.log('Navigating to trader/dashboard')
              window.history.pushState({}, '', '/dashboard')
              setRoute('/dashboard')
              setCurrentPage('trader')
            } else if (page === 'faq') {
              console.log('Navigating to faq')
              window.history.pushState({}, '', '/faq')
              setRoute('/faq')
            } else if (page === 'backtest') {
              console.log('Navigating to backtest')
              window.history.pushState({}, '', '/backtest')
              setRoute('/backtest')
              setCurrentPage('backtest')
            } else if (page === 'strategy') {
              console.log('Navigating to strategy')
              window.history.pushState({}, '', '/strategy')
              setRoute('/strategy')
              setCurrentPage('strategy')
            } else if (page === 'cursor-strategy') {
              console.log('Navigating to cursor strategy')
              window.history.pushState({}, '', '/strategy/cursor')
              setRoute('/strategy/cursor')
              setCurrentPage('cursor-strategy')
            } else if (page === 'tactics') {
              console.log('Navigating to tactics')
              window.history.pushState({}, '', '/tactics')
              setRoute('/tactics')
              setCurrentPage('tactics')
            } else if (page === 'debate') {
              console.log('Navigating to debate')
              window.history.pushState({}, '', '/debate')
              setRoute('/debate')
              setCurrentPage('debate')
            }

            console.log(
              'After navigation - route:',
              route,
              'currentPage:',
              currentPage
            )
          }}
        />
        <main className="max-w-[1920px] mx-auto px-6 py-6 pt-24">
          <CompetitionPage />
        </main>
      </div>
    )
  }

  // Show landing page for root route
  if (route === '/' || route === '') {
    return <LandingPage />
  }

  // Allow unauthenticated users to open backtest page directly (othersstill show Landing)
  if (!user || !token) {
    if (route === '/backtest' || currentPage === 'backtest') {
      return (
        <div
          className="min-h-screen"
          style={{ background: 'var(--bg-secondary)', color: '#F9FAFB' }}
        >
          <HeaderBar
            isLoggedIn={false}
            currentPage="backtest"
            language={language}
            onLanguageChange={setLanguage}
            onPageChange={(page: Page) => {
              if (page === 'competition') {
                window.history.pushState({}, '', '/competition')
                setRoute('/competition')
                setCurrentPage('competition')
              } else if (page === 'traders') {
                window.history.pushState({}, '', '/traders')
                setRoute('/traders')
                setCurrentPage('traders')
              }
            }}
          />
          <main className="max-w-[1920px] mx-auto px-6 py-6 pt-24">
            <BacktestPage />
          </main>
        </div>
      )
    }
    return <LandingPage />
  }

  // Show main app for authenticated users on other routes
  if (!user || !token) {
    // Default to landing page when not authenticated and no specific route
    return <LandingPage />
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg-secondary)', color: '#F9FAFB' }}
    >
      <HeaderBar
        isLoggedIn={!!user}
        currentPage={currentPage}
        language={language}
        onLanguageChange={setLanguage}
        user={user}
        onLogout={logout}
        onPageChange={(page: Page) => {
          console.log('Main app onPageChange called with:', page)

          if (page === 'competition') {
            window.history.pushState({}, '', '/competition')
            setRoute('/competition')
            setCurrentPage('competition')
          } else if (page === 'traders') {
            window.history.pushState({}, '', '/traders')
            setRoute('/traders')
            setCurrentPage('traders')
          } else if (page === 'trader') {
            window.history.pushState({}, '', '/dashboard')
            setRoute('/dashboard')
            setCurrentPage('trader')
          } else if (page === 'backtest') {
            window.history.pushState({}, '', '/backtest')
            setRoute('/backtest')
            setCurrentPage('backtest')
          } else if (page === 'strategy') {
            window.history.pushState({}, '', '/strategy')
            setRoute('/strategy')
            setCurrentPage('strategy')
          } else if (page === 'tactics') {
            window.history.pushState({}, '', '/tactics')
            setRoute('/tactics')
            setCurrentPage('tactics')
          } else if (page === 'faq') {
            window.history.pushState({}, '', '/faq')
            setRoute('/faq')
          } else if (page === 'debate') {
            window.history.pushState({}, '', '/debate')
            setRoute('/debate')
            setCurrentPage('debate')
          }
        }}
      />

      {/* Main Content */}
      <main
        className={
          currentPage === 'debate'
            ? 'h-[calc(100vh-64px)] mt-16'
            : 'max-w-[1920px] mx-auto px-6 py-6 pt-24'
        }
      >
        {currentPage === 'competition' ? (
          <CompetitionPage />
        ) : currentPage === 'traders' ? (
          <AITradersPage
            onTraderSelect={(traderId) => {
              setSelectedTraderId(traderId)
              window.history.pushState({}, '', '/dashboard')
              setRoute('/dashboard')
              setCurrentPage('trader')
            }}
          />
        ) : currentPage === 'backtest' ? (
          <BacktestPage />
        ) : route === '/strategy/opus' ? (
          <StrategyOpusPage />
        ) : route === '/strategy/current' ? (
          <StrategyCurrentPage />
        ) : currentPage === 'strategy' ? (
          <StrategyStudioPage />
        ) : currentPage === 'cursor-strategy' ? (
          <CursorStrategyPage />
        ) : currentPage === 'tactics' ? (
          <TacticsStudioPage />
        ) : currentPage === 'debate' ? (
          <DebateArenaPage />
        ) : (
          <TraderDetailsPage
            selectedTrader={selectedTrader}
            status={status}
            account={account}
            positions={positions}
            decisions={decisions}
            decisionsLimit={decisionsLimit}
            onDecisionsLimitChange={setDecisionsLimit}
            stats={stats}
            lastUpdate={lastUpdate}
            language={language}
            traders={traders}
            tradersError={tradersError}
            selectedTraderId={selectedTraderId}
            onTraderSelect={setSelectedTraderId}
            onNavigateToTraders={() => {
              window.history.pushState({}, '', '/traders')
              setRoute('/traders')
              setCurrentPage('traders')
            }}
            brokerages={brokerages}
          />
        )}
      </main>

      {/* Footer - Hidden on debate page */}
      {currentPage !== 'debate' && (
        <footer
          className="mt-16"
          style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(22, 27, 34, 0.88)' }}
        >
          <div
            className="max-w-[1920px] mx-auto px-6 py-6 text-center text-sm"
            style={{ color: '#6B7280' }}
          >
          </div>
        </footer>
      )}
    </div>
  )
}

// Trader Details Page Component
function TraderDetailsPage({
  selectedTrader,
  status,
  account,
  positions,
  decisions,
  decisionsLimit,
  onDecisionsLimitChange,
  lastUpdate,
  language,
  traders,
  tradersError,
  selectedTraderId,
  onTraderSelect,
  onNavigateToTraders,
  brokerages,
}: {
  selectedTrader?: TraderInfo
  traders?: TraderInfo[]
  tradersError?: Error
  selectedTraderId?: string
  onTraderSelect: (traderId: string) => void
  onNavigateToTraders: () => void
  status?: SystemStatus
  account?: AccountInfo
  positions?: Position[]
  decisions?: DecisionRecord[]
  decisionsLimit: number
  onDecisionsLimitChange: (limit: number) => void
  stats?: Statistics
  lastUpdate: string
  language: Language
  brokerages?: Brokerage[]
}) {
  const [closingPosition, setClosingPosition] = useState<string | null>(null)
  const [selectedChartSymbol, setSelectedChartSymbol] = useState<
    string | undefined
  >(undefined)
  const [chartUpdateKey, setChartUpdateKey] = useState<number>(0)
  const chartSectionRef = useRef<HTMLDivElement>(null)

  // close positionaction
  const handleClosePosition = async (symbol: string, side: string) => {
    if (!selectedTraderId) return

    const confirmMsg =
      false
        ? `confirm toclose position ${symbol} ${side === 'LONG' ? 'multiposition' : 'emptyposition'} ?？`
        : `Are you sure you want to close ${symbol} ${side === 'LONG' ? 'LONG' : 'SHORT'} position?`

    const confirmed = await confirmToast(confirmMsg, {
      title: false ? 'confirmclose position' : 'Confirm Close',
      okText: false ? 'confirm' : 'Confirm',
      cancelText: false ? 'cancel' : 'Cancel',
    })

    if (!confirmed) return

    setClosingPosition(symbol)
    try {
      await api.closePosition(selectedTraderId, symbol, side)
      notify.success(
        false ? 'close positionsuccess' : 'Position closed successfully'
      )
      // Use SWR mutate refreshdatainstead ofre-LoadPage
      await Promise.all([
        mutate(`positions-${selectedTraderId}`),
        mutate(`account-${selectedTraderId}`),
      ])
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : false
            ? 'close positionfailed'
            : 'Failed to close position'
      notify.error(errorMsg)
    } finally {
      setClosingPosition(null)
    }
  }
  // If API failed with error, show empty state (likely backend not running)
  if (tradersError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto px-6">
          {/* Icon */}
          <div
            className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{
              background: 'var(--primary-bg, 0.1)',
              border: '2px solid var(--primary-bg, 0.3)',
            }}
          >
            <svg
              className="w-12 h-12"
              style={{ color: 'var(--primary)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#F9FAFB' }}>
            {t('dashboardEmptyTitle', language)}
          </h2>

          {/* Description */}
          <p className="text-base mb-6" style={{ color: '#9CA3AF' }}>
            {t('dashboardEmptyDescription', language)}
          </p>

          {/* CTA Button */}
          <button
            onClick={onNavigateToTraders}
            className="px-6 py-3 rounded-lg font-bold transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)',
              color: '#000000',
              boxShadow: '0 4px 12px rgba(204, 255, 0, 0.4)',
            }}
          >
            {t('goToTradersPage', language)}
          </button>
        </div>
      </div>
    )
  }

  // If traders is loaded and empty, show empty state
  if (traders && traders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto px-6">
          {/* Icon */}
          <div
            className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{
              background: 'var(--primary-bg, 0.1)',
              border: '2px solid var(--primary-bg, 0.3)',
            }}
          >
            <svg
              className="w-12 h-12"
              style={{ color: 'var(--primary)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#F9FAFB' }}>
            {t('dashboardEmptyTitle', language)}
          </h2>

          {/* Description */}
          <p className="text-base mb-6" style={{ color: '#9CA3AF' }}>
            {t('dashboardEmptyDescription', language)}
          </p>

          {/* CTA Button */}
          <button
            onClick={onNavigateToTraders}
            className="px-6 py-3 rounded-lg font-bold transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)',
              color: '#000000',
              boxShadow: '0 4px 12px rgba(204, 255, 0, 0.4)',
            }}
          >
            {t('goToTradersPage', language)}
          </button>
        </div>
      </div>
    )
  }

  // If traders is still loading or selectedTrader is not ready, show skeleton
  if (!selectedTrader) {
    return (
      <div className="space-y-6">
        {/* Loading Skeleton - Binance Style */}
        <div className="binance-card p-6 animate-pulse">
          <div className="skeleton h-8 w-48 mb-3"></div>
          <div className="flex gap-4">
            <div className="skeleton h-4 w-32"></div>
            <div className="skeleton h-4 w-24"></div>
            <div className="skeleton h-4 w-28"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="binance-card p-5 animate-pulse">
              <div className="skeleton h-4 w-24 mb-3"></div>
              <div className="skeleton h-8 w-32"></div>
            </div>
          ))}
        </div>
        <div className="binance-card p-6 animate-pulse">
          <div className="skeleton h-6 w-40 mb-4"></div>
          <div className="skeleton h-64 w-full"></div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Trader Header */}
      <div
        className="mb-6 rounded p-6 animate-scale-in"
        style={{
          background:
            'linear-gradient(135deg, var(--primary-bg, 0.15) 0%, rgba(252, 213, 53, 0.05) 100%)',
          border: '1px solid var(--primary-bg, 0.2)',
          boxShadow: '0 0 30px var(--primary-bg, 0.15)',
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <h2
            className="text-2xl font-bold flex items-center gap-3"
            style={{ color: '#F9FAFB' }}
          >
            <PunkAvatar
              seed={getTraderAvatar(
                selectedTrader.trader_id,
                selectedTrader.trader_name
              )}
              size={48}
              className="rounded-lg"
            />
            {selectedTrader.trader_name}
          </h2>

          {/* Trader Selector */}
          {traders && traders.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: '#9CA3AF' }}>
                {t('switchTrader', language)}:
              </span>
              <select
                value={selectedTraderId}
                onChange={(e) => onTraderSelect(e.target.value)}
                className="rounded px-3 py-2 text-sm font-medium cursor-pointer transition-colors"
                style={{
                  background: 'rgba(22, 27, 34, 0.88)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#F9FAFB',
                }}
              >
                {traders.map((trader) => (
                  <option key={trader.trader_id} value={trader.trader_id}>
                    {trader.trader_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div
          className="flex items-center gap-4 text-sm flex-wrap"
          style={{ color: '#9CA3AF' }}
        >
          <span>
            AI Model:{' '}
            <span
              className="font-semibold"
              style={{
                color: (selectedTrader.ai_model || '').includes('qwen')
                  ? '#c084fc'
                  : '#60a5fa',
              }}
            >
              {getModelDisplayName(
                (selectedTrader.ai_model || '').split('_').pop() ||
                selectedTrader.ai_model || 'Unknown'
              )}
            </span>
          </span>
          <span>•</span>
          <span>
            Brokerage:{' '}
            <span className="font-semibold" style={{ color: '#F9FAFB' }}>
              {getBrokerageDisplayNameFromList(
                selectedTrader.brokerage_id,
                brokerages
              )}
            </span>
          </span>
          <span>•</span>
          <span>
            Strategy:{' '}
            <span className="font-semibold" style={{ color: 'var(--primary)' }}>
              {selectedTrader.strategy_name || 'No Strategy'}
            </span>
          </span>
          {status && (
            <>
              <span>•</span>
              <span>Cycles: {status.call_count}</span>
              <span>•</span>
              <span>Runtime: {status.runtime_minutes} min</span>
            </>
          )}
        </div>
      </div>

      {/* Debug Info */}
      {account && (
        <div
          className="mb-4 p-3 rounded text-xs"
          style={{
            background: 'rgba(22, 27, 34, 0.88)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontFamily: 'Capsule Sans Text, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif',
          }}
        >
          <div style={{ color: '#9CA3AF' }}>
            🔄 Last Update: {lastUpdate} | Total Equity:{' '}
            {account?.total_equity?.toFixed(2) || '0.00'} | Available:{' '}
            {account?.available_balance?.toFixed(2) || '0.00'} | P&L:{' '}
            {account?.total_pnl?.toFixed(2) || '0.00'} (
            {account?.total_pnl_pct?.toFixed(2) || '0.00'}%)
          </div>
        </div>
      )}

      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title={t('totalEquity', language)}
          value={`${account?.total_equity?.toFixed(2) || '0.00'} `}
          change={account?.total_pnl_pct || 0}
          positive={(account?.total_pnl ?? 0) > 0}
        />
        <StatCard
          title={t('availableBalance', language)}
          value={`${account?.available_balance?.toFixed(2) || '0.00'} `}
          subtitle={`${account?.available_balance && account?.total_equity ? ((account.available_balance / account.total_equity) * 100).toFixed(1) : '0.0'}% ${t('free', language)}`}
        />
        <StatCard
          title={t('totalPnL', language)}
          value={`${account?.total_pnl !== undefined && account.total_pnl >= 0 ? '+' : ''}${account?.total_pnl?.toFixed(2) || '0.00'} `}
          change={account?.total_pnl_pct || 0}
          positive={(account?.total_pnl ?? 0) >= 0}
        />
        <StatCard
          title={t('positions', language)}
          value={`${account?.position_count || 0}`}
          subtitle={`${t('margin', language)}: ${account?.margin_used_pct?.toFixed(1) || '0.0'}%`}
        />
      </div>

      {/* main content area：left right split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* left：chart + position */}
        <div className="space-y-6">
          {/* Chart Tabs (Equity / K-line) */}
          <div
            ref={chartSectionRef}
            className="chart-container animate-slide-in scroll-mt-32"
            style={{ animationDelay: '0.1s' }}
          >
            <ChartTabs
              traderId={selectedTrader.trader_id}
              selectedSymbol={selectedChartSymbol}
              updateKey={chartUpdateKey}
              brokerageId={getBrokerageTypeFromList(
                selectedTrader.brokerage_id,
                brokerages
              )}
            />
          </div>

          {/* Current Positions */}
          <div
            className="binance-card p-6 animate-slide-in"
            style={{ animationDelay: '0.15s' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-xl font-bold flex items-center gap-2"
                style={{ color: '#F9FAFB' }}
              >
                📈 {t('currentPositions', language)}
              </h2>
              {positions && positions.length > 0 && (
                <div
                  className="text-xs px-3 py-1 rounded"
                  style={{
                    background: 'var(--primary-bg, 0.1)',
                    color: 'var(--primary)',
                    border: '1px solid var(--primary-bg, 0.2)',
                  }}
                >
                  {positions.length} {t('active', language)}
                </div>
              )}
            </div>
            {positions && positions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left border-b border-gray-800">
                    <tr>
                      <th className="px-1 pb-3 font-semibold text-gray-400 whitespace-nowrap text-left">
                        {t('symbol', language)}
                      </th>
                      <th className="px-1 pb-3 font-semibold text-gray-400 whitespace-nowrap text-center">
                        {t('side', language)}
                      </th>
                      <th className="px-1 pb-3 font-semibold text-gray-400 whitespace-nowrap text-center">
                        {false ? 'action' : 'Action'}
                      </th>
                      <th
                        className="px-1 pb-3 font-semibold text-gray-400 whitespace-nowrap text-right"
                        title={t('entryPrice', language)}
                      >
                        {false ? 'entry price' : 'Entry'}
                      </th>
                      <th
                        className="px-1 pb-3 font-semibold text-gray-400 whitespace-nowrap text-right"
                        title={t('markPrice', language)}
                      >
                        {false ? 'mark price' : 'Mark'}
                      </th>
                      <th
                        className="px-1 pb-3 font-semibold text-gray-400 whitespace-nowrap text-right"
                        title={t('quantity', language)}
                      >
                        {false ? 'count' : 'Qty'}
                      </th>
                      <th
                        className="px-1 pb-3 font-semibold text-gray-400 whitespace-nowrap text-right"
                        title={t('positionValue', language)}
                      >
                        {false ? 'value' : 'Value'}
                      </th>
                      <th
                        className="px-1 pb-3 font-semibold text-gray-400 whitespace-nowrap text-center"
                        title={t('margin', language)}
                      >
                        {false ? 'leverage' : 'Lev.'}
                      </th>
                      <th
                        className="px-1 pb-3 font-semibold text-gray-400 whitespace-nowrap text-right"
                        title={t('unrealizedPnL', language)}
                      >
                        {false ? 'unrealized PnL' : 'uPnL'}
                      </th>
                      <th
                        className="px-1 pb-3 font-semibold text-gray-400 whitespace-nowrap text-right"
                        title={t('liqPrice', language)}
                      >
                        {false ? 'liquidation price' : 'Liq.'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-800 last:border-0 transition-colors hover:bg-opacity-10 hover:bg-yellow-500 cursor-pointer"
                        onClick={() => {
                          setSelectedChartSymbol(pos.symbol)
                          setChartUpdateKey(Date.now())
                          // Smooth scroll to chart with ref
                          if (chartSectionRef.current) {
                            chartSectionRef.current.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start',
                            })
                          }
                        }}
                      >
                        <td className="px-1 py-3 font-mono font-semibold whitespace-nowrap text-left">
                          {pos.symbol}
                        </td>
                        <td className="px-1 py-3 whitespace-nowrap text-center">
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                            style={
                              pos.side === 'long'
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
                            {t(
                              pos.side === 'long' ? 'long' : 'short',
                              language
                            )}
                          </span>
                        </td>
                        <td className="px-1 py-3 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation() // Prevent row click
                              handleClosePosition(
                                pos.symbol,
                                pos.side.toUpperCase()
                              )
                            }}
                            disabled={closingPosition === pos.symbol}
                            className="btn-danger inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                            title={
                              false ? 'close position' : 'Close Position'
                            }
                          >
                            {closingPosition === pos.symbol ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <LogOut className="w-3 h-3" />
                            )}
                            {false ? 'close position' : 'Close'}
                          </button>
                        </td>
                        <td
                          className="px-1 py-3 font-mono whitespace-nowrap text-right"
                          style={{ color: '#F9FAFB' }}
                        >
                          {pos.entry_price.toFixed(4)}
                        </td>
                        <td
                          className="px-1 py-3 font-mono whitespace-nowrap text-right"
                          style={{ color: '#F9FAFB' }}
                        >
                          {pos.mark_price.toFixed(4)}
                        </td>
                        <td
                          className="px-1 py-3 font-mono whitespace-nowrap text-right"
                          style={{ color: '#F9FAFB' }}
                        >
                          {pos.quantity.toFixed(4)}
                        </td>
                        <td
                          className="px-1 py-3 font-mono font-bold whitespace-nowrap text-right"
                          style={{ color: '#F9FAFB' }}
                        >
                          {(pos.quantity * pos.mark_price).toFixed(2)}
                        </td>
                        <td
                          className="px-1 py-3 font-mono whitespace-nowrap text-center"
                          style={{ color: 'var(--primary)' }}
                        >
                          {pos.margin}x
                        </td>
                        <td className="px-1 py-3 font-mono whitespace-nowrap text-right">
                          <span
                            style={{
                              color:
                                pos.unrealized_pnl >= 0 ? 'var(--primary)' : '#F6465D',
                              fontWeight: 'bold',
                            }}
                          >
                            {pos.unrealized_pnl >= 0 ? '+' : ''}
                            {pos.unrealized_pnl.toFixed(2)}
                          </span>
                        </td>
                        <td
                          className="px-1 py-3 font-mono whitespace-nowrap text-right"
                          style={{ color: '#9CA3AF' }}
                        >
                          {pos.liquidation_price.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16" style={{ color: '#9CA3AF' }}>
                <div className="text-6xl mb-4 opacity-50">📊</div>
                <div className="text-lg font-semibold mb-2">
                  {t('noPositions', language)}
                </div>
                <div className="text-sm">
                  {t('noActivePositions', language)}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* leftend */}

        {/* right：Recent Decisions - cardcontentmanager */}
        <div
          className="binance-card p-6 animate-slide-in h-fit lg:sticky lg:top-24 lg:max-h-[calc(100vh-120px)]"
          style={{ animationDelay: '0.2s' }}
        >
          {/* title */}
          <div
            className="flex items-center gap-3 mb-5 pb-4 border-b"
            style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{
                background: 'linear-gradient(135deg, rgb(195, 245, 60) 0%, rgb(195, 245, 60) 100%)',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              }}
            >
              🧠
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold" style={{ color: '#F9FAFB' }}>
                {t('recentDecisions', language)}
              </h2>
              {decisions && decisions.length > 0 && (
                <div className="text-xs" style={{ color: '#9CA3AF' }}>
                  {t('lastCycles', language, { count: decisions.length })}
                </div>
              )}
            </div>
            {/* countSelectmanager */}
            <select
              value={decisionsLimit}
              onChange={(e) => onDecisionsLimitChange(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#F9FAFB',
                border: '1px solid #3C4043',
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* decisionlist - scrollable */}
          <div
            className="space-y-4 overflow-y-auto pr-2"
            style={{ maxHeight: 'calc(100vh - 280px)' }}
          >
            {decisions && decisions.length > 0 ? (
              decisions.map((decision, i) => (
                <DecisionCard key={i} decision={decision} language={language} />
              ))
            ) : (
              <div className="py-16 text-center">
                <div className="text-6xl mb-4 opacity-30">🧠</div>
                <div
                  className="text-lg font-semibold mb-2"
                  style={{ color: '#F9FAFB' }}
                >
                  {t('noDecisionsYet', language)}
                </div>
                <div className="text-sm" style={{ color: '#9CA3AF' }}>
                  {t('aiDecisionsWillAppear', language)}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* rightend */}
      </div>
    </div>
  )
}

// Stat Card Component - Binance Style Enhanced
function StatCard({
  title,
  value,
  change,
  positive,
  subtitle,
}: {
  title: string
  value: string
  change?: number
  positive?: boolean
  subtitle?: string
}) {
  return (
    <div className="stat-card animate-fade-in">
      <div
        className="text-xs mb-2 mono uppercase tracking-wider"
        style={{ color: '#9CA3AF' }}
      >
        {title}
      </div>
      <div
        className="text-2xl font-bold mb-1 mono"
        style={{ color: '#F9FAFB' }}
      >
        {value}
      </div>
      {change !== undefined && (
        <div className="flex items-center gap-1">
          <div
            className="text-sm mono font-bold"
            style={{ color: positive ? 'var(--primary)' : '#F6465D' }}
          >
            {positive ? '▲' : '▼'} {positive ? '+' : ''}
            {change.toFixed(2)}%
          </div>
        </div>
      )}
      {subtitle && (
        <div className="text-xs mt-2 mono" style={{ color: '#9CA3AF' }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

// Wrap App with providers
export default function AppWithProviders() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ConfirmDialogProvider>
          <App />
        </ConfirmDialogProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}
