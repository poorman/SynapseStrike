import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { getSystemConfig } from '../lib/config'
import { toast } from 'sonner'
import { copyWithToast } from '../lib/clipboard'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from './ui/input'
import PasswordChecklist from 'react-password-checklist'
import { RegistrationDisabled } from './RegistrationDisabled'

export function RegisterPage() {
  const { language } = useLanguage()
  const { register, completeRegistration } = useAuth()
  const [step, setStep] = useState<'register' | 'setup-otp' | 'verify-otp'>(
    'register'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [betaCode, setBetaCode] = useState('')
  const [betaMode, setBetaMode] = useState(false)
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const [otpCode, setOtpCode] = useState('')
  const [userID, setUserID] = useState('')
  const [otpSecret, setOtpSecret] = useState('')
  const [qrCodeURL, setQrCodeURL] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordValid, setPasswordValid] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    // getsystemconfig，checkwhetherstart betamodemodeandregistration
    getSystemConfig()
      .then((config) => {
        setBetaMode(config.beta_mode || false)
        setRegistrationEnabled(config.registration_enabled !== false)
      })
      .catch((err) => {
        console.error('Failed to fetch system config:', err)
      })
  }, [])

  // ifregistrationisdisabled，showregisteralreadyclosePage
  if (!registrationEnabled) {
    return <RegistrationDisabled />
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Use PasswordChecklist 'svalidationresult
    if (!passwordValid) {
      setError(t('passwordNotMeetRequirements', language))
      return
    }

    if (betaMode && !betaCode.trim()) {
      setError('During beta, registration requires a beta code')
      return
    }

    setLoading(true)

    const result = await register(email, password, betaCode.trim() || undefined)

    if (result.success && result.userID) {
      setUserID(result.userID)
      setOtpSecret(result.otpSecret || '')
      setQrCodeURL(result.qrCodeURL || '')
      setStep('setup-otp')
    } else {
      // Only business errors reach here (system/network errors shown via toast)
      const msg = result.message || t('registrationFailed', language)
      setError(msg)
    }

    setLoading(false)
  }

  const handleSetupComplete = () => {
    setStep('verify-otp')
  }

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await completeRegistration(userID, otpCode)

    if (!result.success) {
      const msg = result.message || t('registrationFailed', language)
      setError(msg)
      toast.error(msg)
    }
    // success'sthenAuthContextwill autohandleLoginstatus

    setLoading(false)
  }

  const copyToClipboard = (text: string) => {
    copyWithToast(text)
  }

  return (
    <div
      className="flex items-center justify-center py-12"
      style={{ minHeight: 'calc(100vh - 64px)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-4">
          <div className="w-40 mx-auto mb-2 flex items-center justify-center">
            <img
              src="/images/logo.png"
              alt="SynapseStrike Logo"
              className="w-40 h-auto object-contain"
            />
          </div>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            {step === 'register' && t('registerTitle', language)}
            {step === 'setup-otp' && t('setupTwoFactor', language)}
            {step === 'verify-otp' && t('verifyOTP', language)}
          </p>
        </div>

        {/* Registration Form */}
        <div
          className="rounded-lg p-6"
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
          }}
        >
          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: 'var(--brand-light-gray)' }}
                >
                  {t('email', language)}
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder', language)}
                  required
                />
              </div>

              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: 'var(--brand-light-gray)' }}
                >
                  {t('password', language)}
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    placeholder={t('passwordPlaceholder', language)}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-2 w-8 h-10 flex items-center justify-center rounded bg-transparent p-0 m-0 border-0 outline-none focus:outline-none focus:ring-0 appearance-none cursor-pointer btn-icon"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: 'var(--brand-light-gray)' }}
                >
                  {t('confirmPassword', language)}
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                    placeholder={t('confirmPasswordPlaceholder', language)}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute inset-y-0 right-2 w-8 h-10 flex items-center justify-center rounded bg-transparent p-0 m-0 border-0 outline-none focus:outline-none focus:ring-0 appearance-none cursor-pointer btn-icon"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* passwordruleschecklist（viaonlyallowsubmit） */}
              <div
                className="mt-1 text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                <div
                  className="mb-1"
                  style={{ color: 'var(--brand-light-gray)' }}
                >
                  {t('passwordRequirements', language)}
                </div>
                <PasswordChecklist
                  rules={[
                    'minLength',
                    'capital',
                    'lowercase',
                    'number',
                    'specialChar',
                    'match',
                  ]}
                  minLength={8}
                  value={password}
                  valueAgain={confirmPassword}
                  messages={{
                    minLength: t('passwordRuleMinLength', language),
                    capital: t('passwordRuleUppercase', language),
                    lowercase: t('passwordRuleLowercase', language),
                    number: t('passwordRuleNumber', language),
                    specialChar: t('passwordRuleSpecial', language),
                    match: t('passwordRuleMatch', language),
                  }}
                  className="space-y-1"
                  onChange={(isValid) => setPasswordValid(isValid)}
                />
              </div>

              {betaMode && (
                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: '#F9FAFB' }}
                  >
                    Beta Code *
                  </label>
                  <input
                    type="text"
                    value={betaCode}
                    onChange={(e) =>
                      setBetaCode(
                        e.target.value.replace(/[^a-z0-9]/gi, '').toLowerCase()
                      )
                    }
                    className="w-full px-3 py-2 rounded font-mono"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#F9FAFB',
                    }}
                    placeholder="Enter 6-digit beta code"
                    maxLength={6}
                    required={betaMode}
                  />
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                    Beta code is 6 alphanumeric characters, case-sensitive
                  </p>
                </div>
              )}

              {error && (
                <div
                  className="text-sm px-3 py-2 rounded"
                  style={{
                    background: 'var(--binance-red-bg)',
                    color: 'var(--binance-red)',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loading || (betaMode && !betaCode.trim()) || !passwordValid
                }
                className="w-full px-4 py-2 rounded text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50"
                style={{
                  background: 'var(--primary)',
                  color: '#000000',
                }}
              >
                {loading
                  ? t('loading', language)
                  : t('registerButton', language)}
              </button>
            </form>
          )}

          {step === 'setup-otp' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-2">📱</div>
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: '#F9FAFB' }}
                >
                  {t('setupTwoFactor', language)}
                </h3>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  {t('setupTwoFactorDesc', language)}
                </p>
              </div>

              <div className="space-y-3">
                <div
                  className="p-3 rounded"
                  style={{
                    background: 'var(--brand-black)',
                    border: '1px solid var(--panel-border)',
                  }}
                >
                  <p
                    className="text-sm font-semibold mb-2"
                    style={{ color: 'var(--brand-light-gray)' }}
                  >
                    {t('authStep1Title', language)}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {t('authStep1Desc', language)}
                  </p>
                </div>

                <div
                  className="p-3 rounded"
                  style={{
                    background: 'var(--brand-black)',
                    border: '1px solid var(--panel-border)',
                  }}
                >
                  <p
                    className="text-sm font-semibold mb-2"
                    style={{ color: 'var(--brand-light-gray)' }}
                  >
                    {t('authStep2Title', language)}
                  </p>
                  <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
                    {t('authStep2Desc', language)}
                  </p>

                  {qrCodeURL && (
                    <div className="mt-2">
                      <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
                        {t('qrCodeHint', language)}
                      </p>
                      <div className="bg-[var(--bg-secondary)] p-2 rounded text-center">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCodeURL)}`}
                          alt="QR Code"
                          className="mx-auto"
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-2">
                    <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>
                      {t('otpSecret', language)}
                    </p>
                    <div className="flex items-center gap-2">
                      <code
                        className="flex-1 px-2 py-1 text-xs rounded font-mono"
                        style={{
                          background: 'var(--panel-bg-hover)',
                          color: 'var(--brand-light-gray)',
                        }}
                      >
                        {otpSecret}
                      </code>
                      <button
                        onClick={() => copyToClipboard(otpSecret)}
                        className="px-2 py-1 text-xs rounded"
                        style={{
                          background: 'var(--brand-yellow)',
                          color: 'var(--brand-black)',
                        }}
                      >
                        {t('copy', language)}
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  className="p-3 rounded"
                  style={{
                    background: 'var(--brand-black)',
                    border: '1px solid var(--panel-border)',
                  }}
                >
                  <p
                    className="text-sm font-semibold mb-2"
                    style={{ color: 'var(--brand-light-gray)' }}
                  >
                    {t('authStep3Title', language)}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {t('authStep3Desc', language)}
                  </p>
                </div>
              </div>

              <button
                onClick={handleSetupComplete}
                className="w-full px-4 py-2 rounded text-sm font-semibold transition-all hover:scale-105"
                style={{ background: 'var(--primary)', color: '#000' }}
              >
                {t('setupCompleteContinue', language)}
              </button>
            </div>
          )}

          {step === 'verify-otp' && (
            <form onSubmit={handleOTPVerify} className="space-y-4">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">🔐</div>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  {t('enterOTPCode', language)}
                  <br />
                  {t('completeRegistrationSubtitle', language)}
                </p>
              </div>

              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: 'var(--brand-light-gray)' }}
                >
                  {t('otpCode', language)}
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  className="w-full px-3 py-2 rounded text-center text-2xl font-mono"
                  style={{
                    background: 'var(--brand-black)',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--brand-light-gray)',
                  }}
                  placeholder={t('otpPlaceholder', language)}
                  maxLength={6}
                  required
                />
              </div>

              {error && (
                <div
                  className="text-sm px-3 py-2 rounded"
                  style={{
                    background: 'var(--binance-red-bg)',
                    color: 'var(--binance-red)',
                  }}
                >
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('setup-otp')}
                  className="flex-1 px-4 py-2 rounded text-sm font-semibold"
                  style={{
                    background: 'var(--panel-bg-hover)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {t('back', language)}
                </button>
                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="flex-1 px-4 py-2 rounded text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50"
                  style={{ background: 'var(--primary)', color: '#000' }}
                >
                  {loading
                    ? t('loading', language)
                    : t('completeRegistration', language)}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Login Link */}
        {step === 'register' && (
          <div className="text-center mt-6">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Already have an account?{' '}
              <button
                onClick={() => {
                  window.location.href = '/login'
                }}
                className="font-semibold hover:underline transition-colors"
                style={{ color: 'var(--primary)' }}
              >
                Login
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
