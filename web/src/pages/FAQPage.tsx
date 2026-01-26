import { FAQLayout } from '../components/faq/FAQLayout'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * FAQ Page
 *
 * HeaderBar and Footer are provided by MainLayout
 *
 * All FAQ related logic is in child components:
 * - FAQLayout: Overall layout and search logic
 * - FAQSearchBar: Search bar
 * - FAQSidebar: Left sidebar/categories
 * - FAQContent: Right content area
 *
 * FAQ data is configured in data/faqData.ts
 */
export function FAQPage() {
  const { language } = useLanguage()

  return <FAQLayout language={language} />
}
