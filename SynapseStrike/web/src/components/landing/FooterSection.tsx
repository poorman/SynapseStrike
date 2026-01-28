import { ExternalLink } from 'lucide-react'
import { t, Language } from '../../i18n/translations'

interface FooterSectionProps {
  language: Language
}

export default function FooterSection({ language }: FooterSectionProps) {
  const links = {
    social: [],
    resources: [
      {
        name: false ? 'docs' : 'Documentation',
        href: '#',
      },
    ],
    supporters: [
      { name: 'Alpaca Markets', href: 'https://alpaca.markets/' },
      { name: 'Polygon.io', href: 'https://polygon.io/' },
      { name: 'Interactive Brokers', href: 'https://www.interactivebrokers.com/' },
    ],
  }

  return (
    <footer style={{ background: 'var(--bg-secondary)', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center mb-4">
              <img src="/images/logo.png" alt="SynapseStrike Logo" className="h-10 w-auto" />
            </div>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
              {t('futureStandardAI', language)}
            </p>
            {/* Social Icons - Hidden as requested to remove GitHub */}
            <div className="flex items-center gap-3">
              {/* Social icons removed */}
            </div>
          </div>

          {/* Links Section Removed as it only contained social */}
          <div>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold mb-4" style={{ color: '#F9FAFB' }}>
              {t('resources', language)}
            </h4>
            <ul className="space-y-3">
              {links.resources.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm transition-colors hover:text-[var(--primary)] inline-flex items-center gap-1"
                    style={{ color: '#6B7280' }}
                  >
                    {link.name}
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Supporters */}
          <div>
            <h4 className="text-sm font-semibold mb-4" style={{ color: '#F9FAFB' }}>
              {t('supporters', language)}
            </h4>
            <ul className="space-y-3">
              {links.supporters.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm transition-colors hover:text-[var(--primary)]"
                    style={{ color: '#6B7280' }}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div
          className="pt-6 text-center text-xs"
          style={{ color: '#6B7280', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <p className="mb-2">{t('footerTitle', language)}</p>
          <p style={{ color: '#3C4249' }}>{t('footerWarning', language)}</p>
        </div>
      </div>
    </footer>
  )
}
