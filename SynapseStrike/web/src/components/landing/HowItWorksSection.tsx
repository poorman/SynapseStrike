import { motion } from 'framer-motion'
import { Download, Rocket, TrendingUp, AlertTriangle } from 'lucide-react'
import { t, Language } from '../../i18n/translations'

interface HowItWorksSectionProps {
  language: Language
}

export default function HowItWorksSection({ language }: HowItWorksSectionProps) {
  const steps = [
    {
      icon: Download,
      number: '01',
      title: 'One-Click Deploy',
      desc: 'Run a single command on your server to deploy',
      code: 'curl -fsSL https://raw.githubusercontent.com/poorman/SynapseStrike/main/install.sh | bash',
    },
    {
      icon: Rocket,
      number: '02',
      title: 'Access Dashboard',
      desc: 'Access your server via browser',
      code: 'http://YOUR_SERVER_IP:3000',
    },
    {
      icon: TrendingUp,
      number: '03',
      title: 'Start Trading',
      desc: 'Create trader, let AI do the work',
      code: 'Configure Model → Brokerage → Create Trader',
    },
  ]

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: '#0D1117' }}>
      {/* Background Decoration */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, var(--primary-bg, 0.15) 0%, transparent 70%)' }}
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
            {t('howToStart', language)}
          </h2>
          <p className="text-lg" style={{ color: '#9CA3AF' }}>
            {t('fourSimpleSteps', language)}
          </p>
        </motion.div>

        {/* Steps Timeline */}
        <div className="relative">
          {/* Connecting Line */}
          <div
            className="absolute left-[39px] top-0 bottom-0 w-px hidden lg:block"
            style={{ background: 'linear-gradient(to bottom, transparent, var(--primary-bg, 0.3), transparent)' }}
          />

          <div className="space-y-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative"
              >
                <div
                  className="flex flex-col lg:flex-row items-start gap-6 p-6 rounded-2xl transition-all duration-300 hover:translate-x-2"
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  {/* Number Circle */}
                  <div className="flex-shrink-0 relative z-10">
                    <motion.div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, var(--primary-bg, 0.2) 0%, var(--primary-bg, 0.05) 100%)',
                        border: '1px solid var(--primary-bg, 0.3)',
                      }}
                      whileHover={{ scale: 1.1 }}
                    >
                      <step.icon className="w-8 h-8" style={{ color: 'var(--primary)' }} />
                    </motion.div>
                  </div>

                  {/* Content */}
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="text-sm font-mono font-bold"
                        style={{ color: 'var(--primary)' }}
                      >
                        {step.number}
                      </span>
                      <h3 className="text-xl font-bold" style={{ color: '#F9FAFB' }}>
                        {step.title}
                      </h3>
                    </div>
                    <p className="mb-4" style={{ color: '#9CA3AF' }}>
                      {step.desc}
                    </p>

                    {/* Code Block */}
                    <div
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm"
                      style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      <span style={{ color: '#6B7280' }}>$</span>
                      <span style={{ color: '#F9FAFB' }}>{step.code}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Risk Warning */}
        <motion.div
          className="mt-12 p-6 rounded-2xl flex items-start gap-4"
          style={{
            background: 'var(--primary-bg, 0.05)',
            border: '1px solid var(--primary-bg, 0.15)',
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--primary-bg, 0.1)' }}
          >
            <AlertTriangle className="w-6 h-6" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <div className="font-semibold mb-2" style={{ color: 'var(--primary)' }}>
              {t('importantRiskWarning', language)}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>
              {t('riskWarningText', language)}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
