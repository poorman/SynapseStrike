import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { Container } from './Container'

interface HeaderProps {
  simple?: boolean // For login/register pages
}

export function Header({ simple = false }: HeaderProps) {
  const { language, setLanguage } = useLanguage()

  return (
    <header className="glass sticky top-0 z-50 backdrop-blur-xl">
      <Container className="py-4">
        <div className="flex items-center justify-between">
          {/* Left - Logo and Title */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
                {t('appTitle', language)}
              </h1>
              {!simple && (
                <p className="text-xs mono" style={{ color: '#9CA3AF' }}>
                  {t('subtitle', language)}
                </p>
              )}
            </div>
          </div>

          {/* Right - Language Toggle (always show) */}
          <div
            className="flex gap-1 rounded p-1"
            style={{ background: 'rgba(22, 27, 34, 0.88)' }}
          >
            <button
              onClick={() => setLanguage('en')}
              className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
              style={
                false
                  ? { background: 'var(--primary)', color: '#000' }
                  : { background: 'transparent', color: '#9CA3AF' }
              }
            >
              Chinese
            </button>
            <button
              onClick={() => setLanguage('en')}
              className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
              style={
                language === 'en'
                  ? { background: 'var(--primary)', color: '#000' }
                  : { background: 'transparent', color: '#9CA3AF' }
              }
            >
              EN
            </button>
          </div>
        </div>
      </Container>
    </header >
  )
}
