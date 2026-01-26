import React, { createContext, useContext, useState, useEffect } from 'react'
import { getSystemConfig } from '../lib/config'
import { reset401Flag, httpClient } from '../lib/httpClient'

interface User {
  id: string
  email: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (
    email: string,
    password: string
  ) => Promise<{
    success: boolean
    message?: string
    userID?: string
    requiresOTP?: boolean
  }>
  loginAdmin: (password: string) => Promise<{
    success: boolean
    message?: string
  }>
  register: (
    email: string,
    password: string,
    betaCode?: string
  ) => Promise<{
    success: boolean
    message?: string
    userID?: string
    otpSecret?: string
    qrCodeURL?: string
  }>
  verifyOTP: (
    userID: string,
    otpCode: string
  ) => Promise<{ success: boolean; message?: string }>
  completeRegistration: (
    userID: string,
    otpCode: string
  ) => Promise<{ success: boolean; message?: string }>
  resetPassword: (
    email: string,
    newPassword: string,
    otpCode: string
  ) => Promise<{ success: boolean; message?: string }>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Reset 401 flag on page load to allow fresh 401 handling
    reset401Flag()

    // Check if admin mode（Use cached system config）
    getSystemConfig()
      .then(() => {
        // No longer simulate login in admin mode；unifiedchecklocalstorestorage
        const savedToken = localStorage.getItem('auth_token')
        const savedUser = localStorage.getItem('auth_user')
        if (savedToken && savedUser) {
          setToken(savedToken)
          setUser(JSON.parse(savedUser))
        }

        setIsLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch system config:', err)
        // On error, continue checking localStorage
        const savedToken = localStorage.getItem('auth_token')
        const savedUser = localStorage.getItem('auth_user')

        if (savedToken && savedUser) {
          setToken(savedToken)
          setUser(JSON.parse(savedUser))
        }
        setIsLoading(false)
      })
  }, [])

  // Listen for unauthorized events from httpClient (401 responses)
  useEffect(() => {
    const handleUnauthorized = () => {
      console.log('Unauthorized event received - clearing auth state')
      // Clear auth state when 401 is detected
      setUser(null)
      setToken(null)
      // Note: localStorage cleanup is already done in httpClient
    }

    window.addEventListener('unauthorized', handleUnauthorized)

    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized)
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.requires_otp) {
          return {
            success: true,
            userID: data.user_id,
            requiresOTP: true,
            message: data.message,
          }
        }
      } else {
        return { success: false, message: data.error }
      }
    } catch (error) {
      return { success: false, message: 'Login failed, please try again' }
    }

    return { success: false, message: 'Unknown error' }
  }

  const loginAdmin = async (password: string) => {
    try {
      const response = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await response.json()
      if (response.ok) {
        // Reset 401 flag on successful login
        reset401Flag()

        const userInfo = {
          id: data.user_id || 'admin',
          email: data.email || 'admin@localhost',
        }
        setToken(data.token)
        setUser(userInfo)
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('auth_user', JSON.stringify(userInfo))

        // Check and redirect to returnUrl if exists
        const returnUrl = sessionStorage.getItem('returnUrl')
        if (returnUrl) {
          sessionStorage.removeItem('returnUrl')
          window.history.pushState({}, '', returnUrl)
          window.dispatchEvent(new PopStateEvent('popstate'))
        } else {
          // Navigate to dashboard
          window.history.pushState({}, '', '/dashboard')
          window.dispatchEvent(new PopStateEvent('popstate'))
        }
        return { success: true }
      } else {
        return { success: false, message: data.error || 'Login failed' }
      }
    } catch (e) {
      return { success: false, message: 'Login failed, please try again' }
    }
  }

  const register = async (
    email: string,
    password: string,
    betaCode?: string
  ) => {
    const requestBody: {
      email: string
      password: string
      beta_code?: string
    } = { email, password }
    if (betaCode) {
      requestBody.beta_code = betaCode
    }

    const result = await httpClient.post<{
      user_id: string
      otp_secret: string
      qr_code_url: string
      message: string
    }>('/api/register', requestBody)

    if (result.success && result.data) {
      return {
        success: true,
        userID: result.data.user_id,
        otpSecret: result.data.otp_secret,
        qrCodeURL: result.data.qr_code_url,
        message: result.message || result.data.message,
      }
    }

    // Only business errors reach here (system/network errors were intercepted)
    return {
      success: false,
      message: result.message || 'Registration failed',
    }
  }

  const verifyOTP = async (userID: string, otpCode: string) => {
    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userID, otp_code: otpCode }),
      })

      const data = await response.json()

      if (response.ok) {
        // Reset 401 flag on successful login
        reset401Flag()

        // Login successful, save token and user info
        const userInfo = { id: data.user_id, email: data.email }
        setToken(data.token)
        setUser(userInfo)
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('auth_user', JSON.stringify(userInfo))

        // Check and redirect to returnUrl if exists
        const returnUrl = sessionStorage.getItem('returnUrl')
        if (returnUrl) {
          sessionStorage.removeItem('returnUrl')
          window.history.pushState({}, '', returnUrl)
          window.dispatchEvent(new PopStateEvent('popstate'))
        } else {
          // Navigate to config page
          window.history.pushState({}, '', '/traders')
          window.dispatchEvent(new PopStateEvent('popstate'))
        }

        return { success: true, message: data.message }
      } else {
        return { success: false, message: data.error }
      }
    } catch (error) {
      return { success: false, message: 'OTP verification failed, please try again' }
    }
  }

  const completeRegistration = async (userID: string, otpCode: string) => {
    try {
      const response = await fetch('/api/complete-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userID, otp_code: otpCode }),
      })

      const data = await response.json()

      if (response.ok) {
        // Reset 401 flag on successful login
        reset401Flag()

        // Registration complete, auto login
        const userInfo = { id: data.user_id, email: data.email }
        setToken(data.token)
        setUser(userInfo)
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('auth_user', JSON.stringify(userInfo))

        // Check and redirect to returnUrl if exists
        const returnUrl = sessionStorage.getItem('returnUrl')
        if (returnUrl) {
          sessionStorage.removeItem('returnUrl')
          window.history.pushState({}, '', returnUrl)
          window.dispatchEvent(new PopStateEvent('popstate'))
        } else {
          // Navigate to config page
          window.history.pushState({}, '', '/traders')
          window.dispatchEvent(new PopStateEvent('popstate'))
        }

        return { success: true, message: data.message }
      } else {
        return { success: false, message: data.error }
      }
    } catch (error) {
      return { success: false, message: 'Registration failed, please try again' }
    }
  }

  const resetPassword = async (
    email: string,
    newPassword: string,
    otpCode: string
  ) => {
    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          new_password: newPassword,
          otp_code: otpCode,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true, message: data.message }
      } else {
        return { success: false, message: data.error }
      }
    } catch (error) {
      return { success: false, message: 'Password reset failed, please try again' }
    }
  }

  const logout = () => {
    const savedToken = localStorage.getItem('auth_token')
    if (savedToken) {
      fetch('/api/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${savedToken}` },
      }).catch(() => {
        /* ignore network errors on logout */
      })
    }
    setUser(null)
    setToken(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        loginAdmin,
        register,
        verifyOTP,
        completeRegistration,
        resetPassword,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
