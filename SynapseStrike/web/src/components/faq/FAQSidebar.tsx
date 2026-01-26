import { t, type Language } from '../../i18n/translations'
import type { FAQCategory } from '../../data/faqData'

interface FAQSidebarProps {
  categories: FAQCategory[]
  activeItemId: string | null
  language: Language
  onItemClick: (categoryId: string, itemId: string) => void
}

export function FAQSidebar({
  categories,
  activeItemId,
  language,
  onItemClick,
}: FAQSidebarProps) {
  return (
    <nav
      className="sticky top-24 h-[calc(100vh-120px)] overflow-y-auto pr-4"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255, 255, 255, 0.08) rgba(22, 27, 34, 0.88)',
      }}
    >
      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category.id}>
            {/* Category Title */}
            <div className="flex items-center gap-2 mb-3 px-3">
              <category.icon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              <h3
                className="text-sm font-bold uppercase tracking-wide"
                style={{ color: 'var(--primary)' }}
              >
                {t(category.titleKey, language)}
              </h3>
            </div>

            {/* Category Items */}
            <ul className="space-y-1">
              {category.items.map((item) => {
                const isActive = activeItemId === item.id
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onItemClick(category.id, item.id)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
                      style={{
                        background: isActive
                          ? 'var(--primary-bg, 0.1)'
                          : 'transparent',
                        color: isActive ? 'var(--primary)' : '#9CA3AF',
                        borderLeft: isActive
                          ? '3px solid var(--primary)'
                          : '3px solid transparent',
                        paddingLeft: isActive ? '9px' : '12px',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background =
                            'var(--primary-bg, 0.05)'
                          e.currentTarget.style.color = '#F9FAFB'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = '#9CA3AF'
                        }
                      }}
                    >
                      {t(item.questionKey, language)}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}
