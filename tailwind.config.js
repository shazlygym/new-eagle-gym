/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fdf9ec',
          100: '#faf0cc',
          200: '#f4de95',
          300: '#eec657',
          400: '#e8b030',
          500: '#C9A84C',
          600: '#b8912e',
          700: '#976e25',
          800: '#7c5724',
          900: '#684922',
        },
        dark: {
          50: '#f5f5f5',
          100: '#e0e0e0',
          200: '#9e9e9e',
          300: '#6e6e6e',
          400: '#424242',
          500: '#2a2a2a',
          600: '#1f1f1f',
          700: '#1a1a1a',
          800: '#141414',
          900: '#0d0d0d',
        },
      },
      spacing: {
        // Notch / home-indicator insets. Zero everywhere except installed iOS.
        'safe-t': 'env(safe-area-inset-top, 0px)',
        'safe-b': 'env(safe-area-inset-bottom, 0px)',
        // Fixed chrome heights, so pages can reserve room for them.
        tabbar: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
        header: 'calc(3.5rem + env(safe-area-inset-top, 0px))',
      },
      fontFamily: {
        // The iOS system font covers Latin (SF Pro) and Arabic (SF Arabic) with
        // zero bytes downloaded, which is what makes the app render instantly
        // offline. The rest of the stack is for non-Apple browsers.
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Segoe UI',
          'Noto Sans Arabic',
          'Cairo',
          'Tahoma',
          'Roboto',
          'sans-serif',
        ],
        numeric: ['ui-rounded', '-apple-system', 'SF Pro Rounded', 'Segoe UI', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #C9A84C 0%, #e8c56a 50%, #C9A84C 100%)',
      },
      boxShadow: {
        gold: '0 4px 24px rgba(201,168,76,0.25)',
        'gold-lg': '0 8px 40px rgba(201,168,76,0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        'pulse-gold': 'pulseGold 2s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,168,76,0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(201,168,76,0)' },
        },
      },
    },
  },
  plugins: [],
}
