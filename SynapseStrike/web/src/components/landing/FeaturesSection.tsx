import { motion } from 'framer-motion'
import { Brain, Swords, BarChart3, Shield, Blocks, LineChart } from 'lucide-react'
import { t, Language } from '../../i18n/translations'

interface FeaturesSectionProps {
  language: Language
}

export default function FeaturesSection({ language }: FeaturesSectionProps) {
  const features = [
    {
      icon: Brain,
      title: false ? 'AI Strategyorchestration engine' : 'AI Strategy Orchestration',
      desc: false
        ? 'Supports DeepSeek, GPT, Claude, Qwen and other AI models with custom prompt strategies, AI auto analyzes market and makes trading decisions'
        : 'Support DeepSeek, GPT, Claude, Qwen and more. Custom prompts, AI autonomously analyzes markets and makes trading decisions',
      highlight: true,
      badge: false ? 'corecapability' : 'Core',
    },
    {
      icon: Swords,
      title: false ? 'multi AI arena' : 'Multi-AI Arena',
      desc: false
        ? 'multiple AI tradercompete together，realwhen PnL sortlineranking，auto evolution，letstrongestStrategystand outbutout'
        : 'Multiple AI traders compete in real-time, live PnL leaderboard, automatic survival of the fittest',
      highlight: true,
      badge: false ? 'innovative' : 'Unique',
    },
    {
      icon: LineChart,
      title: false ? 'Professional quant data' : 'Pro Quant Data',
      desc: false
        ? 'integrate Kline、technical indicators、market depth、funding rate、positionvolumeetcProfessional quant data，as AI decisionprovide comprehensiveinfo'
        : 'Integrated candlesticks, indicators, order book, funding rates, open interest - comprehensive data for AI decisions',
      highlight: true,
      badge: false ? 'professional' : 'Pro',
    },
    {
      icon: Blocks,
      title: false ? 'multibrokeragesupport' : 'Multi-Brokerage Support',
      desc: false
        ? 'Binance、OKX、Bybit、Hyperliquid、Aster DEX，onesetsystemmanagemultiplebrokerage'
        : 'Binance, OKX, Bybit, Hyperliquid, Aster DEX - one system, multiple brokerages',
    },
    {
      icon: BarChart3,
      title: false ? 'realwhenvisualizationdashboard' : 'Real-time Dashboard',
      desc: false
        ? 'Trade monitor, equity curve, position analysis, AI decision logs - everything in one dashboard'
        : 'Trade monitoring, PnL curves, position analysis, AI decision logs at a glance',
    },
    {
      icon: Shield,
      title: false ? 'Open Source Self-Hosted' : 'Open Source & Self-Hosted',
      desc: false
        ? 'Code fully open source and auditable, data stored locally, API keys never go through third parties'
        : 'Fully open source, data stored locally, API keys never leave your server',
    },
  ]

  return (
    <section className="py-24 relative" style={{ background: 'var(--bg-secondary)' }}>
      {/* Background */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4" style={{ color: '#F9FAFB' }}>
            {t('whyChooseSynapseStrike', language)}
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: '#9CA3AF' }}>
            Not just a trading bot, but a complete AI trading operating system
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`
                relative group rounded-2xl p-6 transition-all duration-300
                ${feature.highlight ? 'md:col-span-1 lg:col-span-1' : ''}
              `}
              style={{
                background: feature.highlight
                  ? 'linear-gradient(135deg, var(--primary-bg, 0.08) 0%, var(--primary-bg, 0.02) 100%)'
                  : '#12161C',
                border: feature.highlight
                  ? '1px solid var(--primary-bg, 0.2)'
                  : '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              {/* Badge */}
              {feature.badge && (
                <div
                  className="absolute top-4 right-4 px-2 py-1 rounded text-xs font-medium"
                  style={{
                    background: 'var(--primary-bg, 0.15)',
                    color: 'var(--primary)',
                  }}
                >
                  {feature.badge}
                </div>
              )}

              {/* Icon */}
              <motion.div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: feature.highlight
                    ? 'var(--primary-bg, 0.15)'
                    : 'var(--primary-bg, 0.1)',
                  border: '1px solid var(--primary-bg, 0.2)',
                }}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <feature.icon
                  className="w-6 h-6"
                  style={{ color: 'var(--primary)' }}
                />
              </motion.div>

              {/* Text */}
              <h3
                className="text-xl font-bold mb-3"
                style={{ color: '#F9FAFB' }}
              >
                {feature.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: '#9CA3AF' }}
              >
                {feature.desc}
              </p>

              {/* Hover Glow */}
              <div
                className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                style={{ background: 'var(--primary)' }}
              />
            </motion.div>
          ))}
        </div>

        {/* Bottom Stats */}
        <motion.div
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {[
            { value: '10+', label: false ? 'AI modelsupport' : 'AI Models' },
            { value: '5+', label: false ? 'brokerageintegrate' : 'Brokerages' },
            { value: '24/7', label: false ? 'autotrade' : 'Auto Trading' },
            { value: '100%', label: false ? 'open source free' : 'Open Source' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center p-4 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div
                className="text-2xl font-bold mb-1"
                style={{
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {stat.value}
              </div>
              <div className="text-xs" style={{ color: '#6B7280' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
