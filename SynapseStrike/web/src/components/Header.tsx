import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { Container } from './Container'

interface HeaderProps {
  simple?: boolean // For login/register pages
}

export function Header({ simple = false }: HeaderProps) {
  const { language } = useLanguage()

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
        </div>
      </Container>
    </header>
  )
}
