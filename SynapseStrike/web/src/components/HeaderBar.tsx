import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Menu, X, ChevronDown } from 'lucide-react'
import { t, type Language } from '../i18n/translations'
import { useSystemConfig } from '../hooks/useSystemConfig'


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

interface HeaderBarProps {
  onLoginClick?: () => void
  isLoggedIn?: boolean
  isHomePage?: boolean
  currentPage?: Page
  language?: Language
  user?: { email: string } | null
  onLogout?: () => void
  onPageChange?: (page: Page) => void
}

export default function HeaderBar({
  isLoggedIn = false,
  isHomePage = false,
  currentPage,
  language = 'en' as Language,
  user,
  onLogout,
  onPageChange,
}: HeaderBarProps) {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [strategyDropdownOpen, setStrategyDropdownOpen] = useState(false)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const strategyDropdownRef = useRef<HTMLDivElement>(null)
  const { config: systemConfig } = useSystemConfig()
  const registrationEnabled = systemConfig?.registration_enabled !== false

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false)
      }
      if (
        strategyDropdownRef.current &&
        !strategyDropdownRef.current.contains(event.target as Node)
      ) {
        setStrategyDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <nav className="fixed top-0 w-full z-50 header-bar">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 max-w-[1920px] mx-auto">
        {/* Logo - Always go to home page */}
        <div
          onClick={() => {
            window.location.href = '/'
          }}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <img
            src="/images/logo.png"
            alt="SynapseStrike"
            className="h-[51px]"
          />
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center justify-between flex-1 ml-8">
          {/* Left Side - Navigation Tabs */}
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              // Main app navigation when logged in
              <>
                <button
                  onClick={() => {
                    if (onPageChange) {
                      onPageChange('competition')
                    }
                    navigate('/competition')
                  }}
                  className="text-sm font-bold transition-all duration-300 relative focus:outline-2 focus:outline-yellow-500"
                  style={{
                    color:
                      currentPage === 'competition'
                        ? 'var(--brand-yellow)'
                        : 'var(--brand-light-gray)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== 'competition') {
                      e.currentTarget.style.color = 'var(--brand-yellow)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== 'competition') {
                      e.currentTarget.style.color = 'var(--brand-light-gray)'
                    }
                  }}
                >
                  {/* Background for selected state */}
                  {currentPage === 'competition' && (
                    <span
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: 'var(--primary-bg, 0.15)',
                        zIndex: -1,
                      }}
                    />
                  )}

                  {t('realtimeNav', language)}
                </button>

                <button
                  onClick={() => {
                    if (onPageChange) {
                      onPageChange('traders')
                    }
                    navigate('/traders')
                  }}
                  className="text-sm font-bold transition-all duration-300 relative focus:outline-2 focus:outline-yellow-500"
                  style={{
                    color:
                      currentPage === 'traders'
                        ? 'var(--brand-yellow)'
                        : 'var(--brand-light-gray)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== 'traders') {
                      e.currentTarget.style.color = 'var(--brand-yellow)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== 'traders') {
                      e.currentTarget.style.color = 'var(--brand-light-gray)'
                    }
                  }}
                >
                  {/* Background for selected state */}
                  {currentPage === 'traders' && (
                    <span
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: 'var(--primary-bg, 0.15)',
                        zIndex: -1,
                      }}
                    />
                  )}

                  {t('configNav', language)}
                </button>

                <button
                  onClick={() => {
                    if (onPageChange) {
                      onPageChange('trader')
                    }
                    navigate('/dashboard')
                  }}
                  className="text-sm font-bold transition-all duration-300 relative focus:outline-2 focus:outline-yellow-500"
                  style={{
                    color:
                      currentPage === 'trader'
                        ? 'var(--brand-yellow)'
                        : 'var(--brand-light-gray)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== 'trader') {
                      e.currentTarget.style.color = 'var(--brand-yellow)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== 'trader') {
                      e.currentTarget.style.color = 'var(--brand-light-gray)'
                    }
                  }}
                >
                  {/* Background for selected state */}
                  {currentPage === 'trader' && (
                    <span
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: 'var(--primary-bg, 0.15)',
                        zIndex: -1,
                      }}
                    />
                  )}

                  {t('dashboardNav', language)}
                </button>

                {/* Strategy Dropdown */}
                <div className="relative" ref={strategyDropdownRef}>
                  <button
                    onClick={() => setStrategyDropdownOpen(!strategyDropdownOpen)}
                    className="text-sm font-bold transition-all duration-300 relative focus:outline-2 focus:outline-yellow-500 flex items-center gap-1"
                    style={{
                      color:
                        currentPage === 'strategy' || currentPage === 'cursor-strategy' || currentPage === 'tactics'
                          ? 'var(--brand-yellow)'
                          : 'var(--brand-light-gray)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      if (currentPage !== 'strategy' && currentPage !== 'cursor-strategy' && currentPage !== 'tactics') {
                        e.currentTarget.style.color = 'var(--brand-yellow)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== 'strategy' && currentPage !== 'cursor-strategy' && currentPage !== 'tactics') {
                        e.currentTarget.style.color = 'var(--brand-light-gray)'
                      }
                    }}
                  >
                    {(currentPage === 'strategy' || currentPage === 'cursor-strategy' || currentPage === 'tactics') && (
                      <span
                        className="absolute inset-0 rounded-lg"
                        style={{
                          background: 'var(--primary-bg, 0.15)',
                          zIndex: -1,
                        }}
                      />
                    )}

                    Strategy
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* Strategy Dropdown Menu */}
                  {strategyDropdownOpen && (
                    <div
                      className="absolute top-full left-0 mt-2 w-56 rounded-lg shadow-xl border z-50"
                      style={{
                        background: 'var(--bg-secondary)',
                        borderColor: 'var(--border-color)',
                      }}
                    >
                      <div className="py-2">
                        <button
                          onClick={() => {
                            setStrategyDropdownOpen(false)
                            window.location.href = '/strategy'
                          }}
                          className="w-full text-left px-4 py-2 text-sm transition-colors"
                          style={{
                            color: currentPage === 'strategy' ? 'var(--brand-yellow)' : 'var(--text-primary)',
                            background: currentPage === 'strategy' ? 'rgba(255, 184, 0, 0.1)' : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 184, 0, 0.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = currentPage === 'strategy' ? 'rgba(255, 184, 0, 0.1)' : 'transparent'
                          }}
                        >
                          Default
                        </button>

                        <button
                          onClick={() => {
                            setStrategyDropdownOpen(false)
                            window.location.href = '/strategy/sonnet'
                          }}
                          className="w-full text-left px-4 py-2 text-sm transition-colors"
                          style={{
                            color: currentPage === 'tactics' ? 'var(--brand-yellow)' : 'var(--text-primary)',
                            background: currentPage === 'tactics' ? 'rgba(255, 184, 0, 0.1)' : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 184, 0, 0.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = currentPage === 'tactics' ? 'rgba(255, 184, 0, 0.1)' : 'transparent'
                          }}
                        >
                          Sonnet
                        </button>

                        <button
                          onClick={() => {
                            setStrategyDropdownOpen(false)
                            window.location.href = '/strategy/opus'
                          }}
                          className="w-full text-left px-4 py-2 text-sm transition-colors"
                          style={{
                            color: 'var(--text-primary)',
                            background: 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 184, 0, 0.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          Opus
                        </button>

                        <button
                          onClick={() => {
                            setStrategyDropdownOpen(false)
                            window.location.href = '/strategy/current'
                          }}
                          className="w-full text-left px-4 py-2 text-sm transition-colors"
                          style={{
                            color: 'var(--text-primary)',
                            background: 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 184, 0, 0.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          Current
                        </button>

                        <button
                          onClick={() => {
                            setStrategyDropdownOpen(false)
                            window.location.href = '/strategy/cursor'
                          }}
                          className="w-full text-left px-4 py-2 text-sm transition-colors"
                          style={{
                            color: 'var(--text-primary)',
                            background: 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 184, 0, 0.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          Cursor
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (onPageChange) {
                      onPageChange('debate')
                    }
                    navigate('/debate')
                  }}
                  className="text-sm font-bold transition-all duration-300 relative focus:outline-2 focus:outline-yellow-500"
                  style={{
                    color:
                      currentPage === 'debate'
                        ? 'var(--brand-yellow)'
                        : 'var(--brand-light-gray)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== 'debate') {
                      e.currentTarget.style.color = 'var(--brand-yellow)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== 'debate') {
                      e.currentTarget.style.color = 'var(--brand-light-gray)'
                    }
                  }}
                >
                  {currentPage === 'debate' && (
                    <span
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: 'var(--primary-bg, 0.15)',
                        zIndex: -1,
                      }}
                    />
                  )}

                  {t('debateNav', language)}
                </button>

                <button
                  onClick={() => {
                    if (onPageChange) {
                      onPageChange('backtest')
                    }
                    navigate('/backtest')
                  }}
                  className="text-sm font-bold transition-all duration-300 relative focus:outline-2 focus:outline-yellow-500"
                  style={{
                    color:
                      currentPage === 'backtest'
                        ? 'var(--brand-yellow)'
                        : 'var(--brand-light-gray)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== 'backtest') {
                      e.currentTarget.style.color = 'var(--brand-yellow)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== 'backtest') {
                      e.currentTarget.style.color = 'var(--brand-light-gray)'
                    }
                  }}
                >
                  {currentPage === 'backtest' && (
                    <span
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: 'var(--primary-bg, 0.15)',
                        zIndex: -1,
                      }}
                    />
                  )}

                  Backtest
                </button>

                <button
                  onClick={() => {
                    if (onPageChange) {
                      onPageChange('faq')
                    }
                    navigate('/faq')
                  }}
                  className="text-sm font-bold transition-all duration-300 relative focus:outline-2 focus:outline-yellow-500"
                  style={{
                    color:
                      currentPage === 'faq'
                        ? 'var(--brand-yellow)'
                        : 'var(--brand-light-gray)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== 'faq') {
                      e.currentTarget.style.color = 'var(--brand-yellow)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== 'faq') {
                      e.currentTarget.style.color = 'var(--brand-light-gray)'
                    }
                  }}
                >
                  {/* Background for selected state */}
                  {currentPage === 'faq' && (
                    <span
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: 'var(--primary-bg, 0.15)',
                        zIndex: -1,
                      }}
                    />
                  )}

                  {t('faqNav', language)}
                </button>
              </>
            ) : (
              // Landing page navigation when not logged in
              <>
                <a
                  href="/competition"
                  className="text-sm font-bold transition-all duration-300 relative focus:outline-2 focus:outline-yellow-500"
                  style={{
                    color:
                      currentPage === 'competition'
                        ? 'var(--brand-yellow)'
                        : 'var(--brand-light-gray)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== 'competition') {
                      e.currentTarget.style.color = 'var(--brand-yellow)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== 'competition') {
                      e.currentTarget.style.color = 'var(--brand-light-gray)'
                    }
                  }}
                >
                  {/* Background for selected state */}
                  {currentPage === 'competition' && (
                    <span
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: 'var(--primary-bg, 0.15)',
                        zIndex: -1,
                      }}
                    />
                  )}

                  {t('realtimeNav', language)}
                </a>

                <a
                  href="/faq"
                  className="text-sm font-bold transition-all duration-300 relative focus:outline-2 focus:outline-yellow-500"
                  style={{
                    color:
                      currentPage === 'faq'
                        ? 'var(--brand-yellow)'
                        : 'var(--brand-light-gray)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== 'faq') {
                      e.currentTarget.style.color = 'var(--brand-yellow)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== 'faq') {
                      e.currentTarget.style.color = 'var(--brand-light-gray)'
                    }
                  }}
                >
                  {/* Background for selected state */}
                  {currentPage === 'faq' && (
                    <span
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: 'var(--primary-bg, 0.15)',
                        zIndex: -1,
                      }}
                    />
                  )}

                  {t('faqNav', language)}
                </a>
              </>
            )}
          </div>

          {/* Right Side - User Actions */}
          <div className="flex items-center gap-4">

            {/* User Info and Actions */}
            {isLoggedIn && user ? (
              <div className="flex items-center gap-3">
                {/* User Info with Dropdown */}
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded transition-colors"
                    style={{
                      background: 'var(--panel-bg)',
                      border: '1px solid var(--panel-border)',
                    }}
                    onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      'rgba(255, 255, 255, 0.05)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'var(--panel-bg)')
                    }
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: 'var(--brand-yellow)',
                        color: 'var(--brand-black)',
                      }}
                    >
                      {user.email[0].toUpperCase()}
                    </div>
                    <span
                      className="text-sm"
                      style={{ color: 'var(--brand-light-gray)' }}
                    >
                      {user.email}
                    </span>
                    <ChevronDown
                      className="w-4 h-4"
                      style={{ color: 'var(--brand-light-gray)' }}
                    />
                  </button>

                  {userDropdownOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-48 rounded-lg shadow-lg overflow-hidden z-50"
                      style={{
                        background: '#1a1d23',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div
                        className="px-3 py-2 border-b"
                        style={{ borderColor: 'var(--panel-border)' }}
                      >
                        <div
                          className="text-xs"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {t('loggedInAs', language)}
                        </div>
                        <div
                          className="text-sm font-medium"
                          style={{ color: 'var(--brand-light-gray)' }}
                        >
                          {user.email}
                        </div>
                      </div>
                      {onLogout && (
                        <button
                          onClick={() => {
                            onLogout()
                            setUserDropdownOpen(false)
                          }}
                          className="w-full px-3 py-2 text-sm font-semibold transition-colors hover:opacity-80 text-center"
                          style={{
                            background: 'var(--binance-red-bg)',
                            color: 'var(--binance-red)',
                          }}
                        >
                          {t('exitLogin', language)}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Show login/register buttons when not logged in and not on login/register pages */
              currentPage !== 'login' &&
              currentPage !== 'register' && (
                <div className="flex items-center gap-3">
                  <a
                    href="/login"
                    className="px-3 py-2 text-sm font-medium transition-colors rounded"
                    style={{ color: 'var(--brand-light-gray)' }}
                  >
                    {t('signIn', language)}
                  </a>
                  {registrationEnabled && (
                    <a
                      href="/register"
                      className="px-4 py-2 rounded font-semibold text-sm transition-colors hover:opacity-90"
                      style={{
                        background: 'var(--brand-yellow)',
                        color: 'var(--brand-black)',
                      }}
                    >
                      {t('signUp', language)}
                    </a>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <motion.button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden"
          style={{ color: 'var(--brand-light-gray)' }}
          whileTap={{ scale: 0.9 }}
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </motion.button>
      </div>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={
          mobileMenuOpen
            ? { height: 'auto', opacity: 1 }
            : { height: 0, opacity: 0 }
        }
        transition={{ duration: 0.3 }}
        className="md:hidden overflow-hidden"
        style={{
          background: 'var(--brand-dark-gray)',
          borderTop: '1px solid var(--primary-bg, 0.1)',
        }}
      >
        <div className="px-4 py-4 space-y-3">
          {/* New Navigation Tabs */}
          {isLoggedIn ? (
            <button
              onClick={() => {
                console.log(
                  'mobile realwhen button clicked, onPageChange:',
                  onPageChange
                )
                onPageChange?.('competition')
                setMobileMenuOpen(false)
              }}
              className="block text-sm font-bold transition-all duration-300 relative focus:outline-2 focus:outline-yellow-500"
              style={{
                color:
                  currentPage === 'competition'
                    ? 'var(--brand-yellow)'
                    : 'var(--brand-light-gray)',
                padding: '12px 16px',
                borderRadius: '8px',
                position: 'relative',
                width: '100%',
                textAlign: 'left',
              }}
            >
              {/* Background for selected state */}
              {currentPage === 'competition' && (
                <span
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: 'var(--primary-bg, 0.15)',
                    zIndex: -1,
                  }}
                />
              )}

              {t('realtimeNav', language)}
            </button>
          ) : (
            <a
              href="/competition"
              className="block text-sm font-bold transition-all duration-300 relative focus:outline-2 focus:outline-yellow-500"
              style={{
                color:
                  currentPage === 'competition'
                    ? 'var(--brand-yellow)'
                    : 'var(--brand-light-gray)',
                padding: '12px 16px',
                borderRadius: '8px',
                position: 'relative',
              }}
            >
              {/* Background for selected state */}
              {currentPage === 'competition' && (
                <span
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: 'var(--primary-bg, 0.15)',
                    zIndex: -1,
                  }}
                />
              )}

              {t('realtimeNav', language)}
            </a>
          )}
          {/* Only show config and dashboard when logged in */}
          {isLoggedIn && (
            <>
              <button
                onClick={() => {
                  if (onPageChange) {
                    onPageChange('traders')
                  }
                  navigate('/traders')
                  setMobileMenuOpen(false)
                }}
                className="block text-sm font-bold transition-all duration-300 relative focus:outline-2 focus:outline-yellow-500 hover:text-yellow-500"
                style={{
                  color:
                    currentPage === 'traders'
                      ? 'var(--brand-yellow)'
                      : 'var(--brand-light-gray)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  position: 'relative',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                {/* Background for selected state */}
                {currentPage === 'traders' && (
                  <span
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: 'var(--primary-bg, 0.15)',
                      zIndex: -1,
                    }}
                  />
                )}

                {t('configNav', language)}
              </button>
              <button
                onClick={() => {
                  if (onPageChange) {
                    onPageChange('trader')
                  }
                  navigate('/dashboard')
                  setMobileMenuOpen(false)
                }}
                className="block text-sm font-bold transition-all duration-300 relative focus:outline-2 focus:outline-yellow-500 hover:text-yellow-500"
                style={{
                  color:
                    currentPage === 'trader'
                      ? 'var(--brand-yellow)'
                      : 'var(--brand-light-gray)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  position: 'relative',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                {/* Background for selected state */}
                {currentPage === 'trader' && (
                  <span
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: 'var(--primary-bg, 0.15)',
                      zIndex: -1,
                    }}
                  />
                )}

                {t('dashboardNav', language)}
              </button>
              <button
                onClick={() => {
                  if (onPageChange) {
                    onPageChange('strategy')
                  }
                  navigate('/strategy')
                  setMobileMenuOpen(false)
                }}
                className="block text-sm font-bold transition-all duration-300 relative focus:outline-2 focus:outline-yellow-500 hover:text-yellow-500"
                style={{
                  color:
                    currentPage === 'strategy'
                      ? 'var(--brand-yellow)'
                      : 'var(--brand-light-gray)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  position: 'relative',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                {/* Background for selected state */}
                {currentPage === 'strategy' && (
                  <span
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: 'var(--primary-bg, 0.15)',
                      zIndex: -1,
                    }}
                  />
                )}

                {t('strategyNav', language)}
              </button>
              <button
                onClick={() => {
                  if (onPageChange) {
                    onPageChange('debate')
                  }
                  navigate('/debate')
                  setMobileMenuOpen(false)
                }}
                className="block text-sm font-bold transition-all duration-300 relative focus:outline-2 focus:outline-yellow-500 hover:text-yellow-500"
                style={{
                  color:
                    currentPage === 'debate'
                      ? 'var(--brand-yellow)'
                      : 'var(--brand-light-gray)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  position: 'relative',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                {/* Background for selected state */}
                {currentPage === 'debate' && (
                  <span
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: 'var(--primary-bg, 0.15)',
                      zIndex: -1,
                    }}
                  />
                )}

                {t('debateNav', language)}
              </button>
              <button
                onClick={() => {
                  if (onPageChange) {
                    onPageChange('backtest')
                  }
                  navigate('/backtest')
                  setMobileMenuOpen(false)
                }}
                className="block text-sm font-bold transition-all duration-300 relative focus:outline-2 focus:outline-yellow-500 hover:text-yellow-500"
                style={{
                  color:
                    currentPage === 'backtest'
                      ? 'var(--brand-yellow)'
                      : 'var(--brand-light-gray)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  position: 'relative',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                {/* Background for selected state */}
                {currentPage === 'backtest' && (
                  <span
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: 'var(--primary-bg, 0.15)',
                      zIndex: -1,
                    }}
                  />
                )}

                Backtest
              </button>
              <button
                onClick={() => {
                  if (onPageChange) {
                    onPageChange('faq')
                  }
                  navigate('/faq')
                  setMobileMenuOpen(false)
                }}
                className="block text-sm font-bold transition-all duration-300 relative focus:outline-2 focus:outline-yellow-500 hover:text-yellow-500"
                style={{
                  color:
                    currentPage === 'faq'
                      ? 'var(--brand-yellow)'
                      : 'var(--brand-light-gray)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  position: 'relative',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                {/* Background for selected state */}
                {currentPage === 'faq' && (
                  <span
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: 'var(--primary-bg, 0.15)',
                      zIndex: -1,
                    }}
                  />
                )}

                {t('faqNav', language)}
              </button>
            </>
          )}

          {/* Original Navigation Items - Only on home page */}
          {isHomePage &&
            [
              { key: 'features', label: t('features', language) },
              { key: 'howItWorks', label: t('howItWorks', language) },
            ].map((item) => (
              <a
                key={item.key}
                href={`#${item.key === 'features' ? 'features' : 'how-it-works'}`}
                className="block text-sm py-2"
                style={{ color: 'var(--brand-light-gray)' }}
              >
                {item.label}
              </a>
            ))}



          {/* User info and logout for mobile when logged in */}
          {isLoggedIn && user && (
            <div
              className="mt-4 pt-4"
              style={{ borderTop: '1px solid var(--panel-border)' }}
            >
              <div
                className="flex items-center gap-2 px-3 py-2 mb-2 rounded"
                style={{ background: 'var(--panel-bg)' }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: 'var(--brand-yellow)',
                    color: 'var(--brand-black)',
                  }}
                >
                  {user.email[0].toUpperCase()}
                </div>
                <div>
                  <div
                    className="text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {t('loggedInAs', language)}
                  </div>
                  <div
                    className="text-sm"
                    style={{ color: 'var(--brand-light-gray)' }}
                  >
                    {user.email}
                  </div>
                </div>
              </div>
              {onLogout && (
                <button
                  onClick={() => {
                    onLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="w-full px-4 py-2 rounded text-sm font-semibold transition-colors text-center"
                  style={{
                    background: 'var(--binance-red-bg)',
                    color: 'var(--binance-red)',
                  }}
                >
                  {t('exitLogin', language)}
                </button>
              )}
            </div>
          )}

          {/* Show login/register buttons when not logged in and not on login/register pages */}
          {!isLoggedIn &&
            currentPage !== 'login' &&
            currentPage !== 'register' && (
              <div className="space-y-2 mt-2">
                <a
                  href="/login"
                  className="block w-full px-4 py-2 rounded text-sm font-medium text-center transition-colors"
                  style={{
                    color: 'var(--brand-light-gray)',
                    border: '1px solid var(--brand-light-gray)',
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('signIn', language)}
                </a>
                {registrationEnabled && (
                  <a
                    href="/register"
                    className="block w-full px-4 py-2 rounded font-semibold text-sm text-center transition-colors"
                    style={{
                      background: 'var(--brand-yellow)',
                      color: 'var(--brand-black)',
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('signUp', language)}
                  </a>
                )}
              </div>
            )}
        </div>
      </motion.div>
    </nav>
  )
}
