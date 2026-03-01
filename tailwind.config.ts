import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        // Brand palette — Indigo → Violet
        brand: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        // Violet accent
        violet: {
          50:  '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        // Emerald accent
        emerald: {
          50:  '#ECFDF5',
          100: '#D1FAE5',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        // Amber accent
        amber: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        // Rose accent
        rose: {
          400: '#FB7185',
          500: '#F43F5E',
          600: '#E11D48',
        },
        // Neutral surface
        surface: {
          50:  '#F8F9FC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'card':    '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-md': '0 4px 12px 0 rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)',
        'card-lg': '0 10px 30px 0 rgba(0,0,0,0.10), 0 4px 8px -2px rgba(0,0,0,0.06)',
        'brand':   '0 4px 14px 0 rgba(99,102,241,0.25)',
        'brand-lg':'0 8px 30px 0 rgba(99,102,241,0.35)',
        'glow':    '0 0 20px rgba(99,102,241,0.20)',
        'inner-sm':'inset 0 1px 2px rgba(0,0,0,0.05)',
        'glass':   '0 8px 32px 0 rgba(31, 38, 135, 0.12)',
      },
      backgroundImage: {
        'brand-gradient':         'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        'brand-gradient-soft':    'linear-gradient(135deg, #818CF8 0%, #A78BFA 100%)',
        'brand-gradient-dark':    'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        'emerald-gradient':       'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
        'card-gradient':          'linear-gradient(145deg, #ffffff 0%, #f8f9fc 100%)',
        'sidebar-gradient':       'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
        'hero-pattern':           'radial-gradient(ellipse at top, #EEF2FF 0%, #F8F9FC 60%)',
      },
      animation: {
        'fade-in':      'fadeIn 0.2s ease-out',
        'slide-up':     'slideUp 0.3s ease-out',
        'slide-right':  'slideRight 0.3s ease-out',
        'scale-in':     'scaleIn 0.15s ease-out',
        'bounce-soft':  'bounceSoft 0.4s ease-out',
        'shimmer':      'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%':   { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        bounceSoft: {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(1.08)' },
          '70%':  { transform: 'scale(0.97)' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
