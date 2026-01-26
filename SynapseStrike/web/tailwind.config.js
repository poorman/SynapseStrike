/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Background System
        'bg-primary': '#0d1117',
        'bg-secondary': '#161b22',
        'bg-tertiary': '#21262d',

        // Glass Panel Colors
        glass: {
          DEFAULT: 'rgba(22, 27, 34, 0.88)',
          elevated: 'rgba(33, 38, 45, 0.92)',
          subtle: 'rgba(22, 27, 34, 0.75)',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-hover': 'rgba(255, 255, 255, 0.15)',
        },

        // Trading Colors - Updated brand colors
        trading: {
          long: 'rgb(0, 200, 5)',        // Profit green
          'long-muted': 'rgb(0, 140, 5)',
          short: 'rgb(255, 80, 0)',      // Loss orange-red
          'short-muted': 'rgb(180, 50, 0)',
          alert: '#F59E0B',
          neutral: '#6B7280',
          info: '#3B82F6',
          action: 'rgb(204, 255, 0)',    // Action button yellow-green
        },

        // Text Colors
        txt: {
          primary: '#F9FAFB',
          secondary: '#9CA3AF',
          muted: '#6B7280',
          disabled: '#4B5563',
        },

        // Accent - using new brand green
        accent: {
          primary: 'rgb(0, 200, 5)',
          secondary: '#3B82F6',
        },

        // Override green and red palettes
        green: {
          50: 'rgb(230, 255, 230)',
          100: 'rgb(200, 255, 200)',
          200: 'rgb(100, 230, 100)',
          300: 'rgb(50, 220, 50)',
          400: 'rgb(0, 200, 5)',
          500: 'rgb(0, 200, 5)',
          600: 'rgb(0, 160, 5)',
          700: 'rgb(0, 140, 5)',
          800: 'rgb(0, 100, 5)',
          900: 'rgb(0, 70, 5)',
        },
        red: {
          50: 'rgb(255, 240, 230)',
          100: 'rgb(255, 200, 170)',
          200: 'rgb(255, 150, 100)',
          300: 'rgb(255, 120, 60)',
          400: 'rgb(255, 80, 0)',
          500: 'rgb(255, 80, 0)',
          600: 'rgb(220, 60, 0)',
          700: 'rgb(180, 50, 0)',
          800: 'rgb(140, 40, 0)',
          900: 'rgb(100, 30, 0)',
        },
      },

      // Backdrop Blur
      backdropBlur: {
        glass: '12px',
        'glass-heavy': '16px',
        'glass-light': '8px',
      },

      // Border Radius
      borderRadius: {
        glass: '12px',
        'glass-sm': '8px',
        'glass-lg': '16px',
      },

      // Box Shadow - Updated with new brand colors
      boxShadow: {
        glass: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'glass-elevated': '0 8px 16px -4px rgba(0, 0, 0, 0.4), 0 4px 8px -2px rgba(0, 0, 0, 0.3)',
        'glow-accent': '0 0 20px rgba(59, 130, 246, 0.15)',
        'glow-long': '0 0 20px rgba(0, 200, 5, 0.25)',
        'glow-short': '0 0 20px rgba(255, 80, 0, 0.25)',
      },

      // Font Family - Updated to Capsule Sans Text
      fontFamily: {
        sans: ['"Capsule Sans Text"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['IBM Plex Mono', 'SF Mono', 'Roboto Mono', 'monospace'],
      },

      // Transitions
      transitionDuration: {
        'fast': '120ms',
        'normal': '150ms',
        'slow': '200ms',
      },

      // Animations
      animation: {
        'flash-green': 'flash-green 400ms ease-out',
        'flash-red': 'flash-red 400ms ease-out',
        'pulse-live': 'pulse-live 2s ease-in-out infinite',
        'toast-in': 'toast-in 200ms ease-out',
        'modal-in': 'modal-in 200ms ease-out',
      },
      keyframes: {
        'flash-green': {
          '0%': { background: 'rgba(0, 200, 5, 0.3)' },
          '100%': { background: 'transparent' },
        },
        'flash-red': {
          '0%': { background: 'rgba(255, 80, 0, 0.3)' },
          '100%': { background: 'transparent' },
        },
        'pulse-live': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'toast-in': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'modal-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
