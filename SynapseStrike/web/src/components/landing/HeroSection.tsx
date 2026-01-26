import { motion } from 'framer-motion'
import { ArrowRight, Play, Github, Zap } from 'lucide-react'
import { t, Language } from '../../i18n/translations'
import { useGitHubStats } from '../../hooks/useGitHubStats'
import { useCounterAnimation } from '../../hooks/useCounterAnimation'
import { OFFICIAL_LINKS } from '../../constants/branding'

interface HeroSectionProps {
  language: Language
}

export default function HeroSection({ language }: HeroSectionProps) {
  const { stars, daysOld, isLoading } = useGitHubStats('poorman', 'synapsestrike')
  const animatedStars = useCounterAnimation({
    start: 0,
    end: stars,
    duration: 2000,
  })

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Radial Gradient */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, var(--primary-bg, 0.08) 0%, transparent 70%)',
          }}
        />
        {/* Floating Orbs */}
        <motion.div
          className="absolute top-20 right-20 w-32 h-32 rounded-full blur-3xl"
          style={{ background: 'var(--primary-bg, 0.15)' }}
          animate={{
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-40 left-20 w-48 h-48 rounded-full blur-3xl"
          style={{ background: 'var(--primary-bg, 0.1)' }}
          animate={{
            y: [0, -40, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
          style={{
            background: 'var(--primary-bg, 0.1)',
            border: '1px solid var(--primary-bg, 0.3)',
          }}
        >
          <Zap className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
            {isLoading ? (
              t('githubStarsInDays', language)
            ) : false ? (
              <>
                {daysOld} daysget in{' '}
                <span className="font-bold tabular-nums">
                  {(animatedStars / 1000).toFixed(1)}K+
                </span>{' '}
                GitHub Stars
              </>
            ) : (
              <>
                <span className="font-bold tabular-nums">
                  {(animatedStars / 1000).toFixed(1)}K+
                </span>{' '}
                GitHub Stars in {daysOld} days
              </>
            )}
          </span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
        >
          <span style={{ color: '#F9FAFB' }}>{t('heroTitle1', language)}</span>
          <br />
          <span
            className="relative inline-block"
            style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t('heroTitle2', language)}
            <motion.span
              className="absolute -bottom-2 left-0 h-1 rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--primary), var(--primary))' }}
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.8, delay: 0.8 }}
            />
          </span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg sm:text-xl max-w-3xl mx-auto mb-10 leading-relaxed"
          style={{ color: '#9CA3AF' }}
        >
          {t('heroDescription', language)}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <motion.a
            href="/competition"
            className="group flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all"
            style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)',
              color: '#000000',
              boxShadow: '0 4px 24px var(--primary-bg, 0.3)',
            }}
            whileHover={{
              scale: 1.02,
              boxShadow: '0 8px 32px var(--primary-bg, 0.4)',
            }}
            whileTap={{ scale: 0.98 }}
          >
            <Play className="w-5 h-5" />
            {t('liveCompetition', language) || 'Live Competition'}
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </motion.a>

          <motion.a
            href={OFFICIAL_LINKS.github}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#F9FAFB',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
            whileHover={{
              scale: 1.02,
              background: 'rgba(255, 255, 255, 0.08)',
              borderColor: 'var(--primary-bg, 0.3)',
            }}
            whileTap={{ scale: 0.98 }}
          >
            <Github className="w-5 h-5" />
            {t('viewSourceCode', language)}
          </motion.a>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-8 sm:gap-12"
        >
          {[
            { label: 'GitHub Stars', value: `${(stars / 1000).toFixed(1)}K+` },
            { label: false ? 'supportbrokerage' : 'Brokerages', value: '5+' },
            { label: false ? 'AI model' : 'AI Models', value: '10+' },
            { label: false ? 'open source free' : 'Open Source', value: '100%' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <div
                className="text-3xl sm:text-4xl font-bold mb-1"
                style={{
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {stat.value}
              </div>
              <div className="text-sm" style={{ color: '#6B7280' }}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Powered By */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-xs"
          style={{ color: '#6B7280' }}
        >
          {t('poweredBy', language)}
        </motion.p>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <motion.div
          className="w-6 h-10 rounded-full flex justify-center pt-2"
          style={{ border: '2px solid var(--primary-bg, 0.3)' }}
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            className="w-1.5 h-3 rounded-full"
            style={{ background: 'var(--primary)' }}
          />
        </motion.div>
      </motion.div>
    </section>
  )
}
