/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep navy surfaces. `ink` climbs from the page background up through
        // card, raised and border steps, so components pick a depth rather than
        // guessing at a hex.
        ink: {
          950: '#070B14', // page background
          900: '#0B1120',
          800: '#111A2E', // sunken (inputs)
          700: '#16203A', // card
          600: '#1E2B4A', // raised control
          500: '#2A3A5F', // border / divider
          400: '#3D5180', // disabled text
          300: '#7C8CB0', // muted text
          200: '#A9B6D4', // secondary text
          100: '#D6DEF0',
          50: '#F1F5FD', // primary text
        },
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6', // primary accent
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        violet: {
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
        },
      },
      spacing: {
        // Notch / home-indicator insets. Zero everywhere except installed iOS.
        'safe-t': 'env(safe-area-inset-top, 0px)',
        'safe-b': 'env(safe-area-inset-bottom, 0px)',
        // Fixed chrome heights, so pages can reserve room for them.
        tabbar: 'calc(4.25rem + env(safe-area-inset-bottom, 0px))',
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
        'brand-gradient': 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
        'brand-soft': 'linear-gradient(135deg, rgba(59,130,246,0.16) 0%, rgba(139,92,246,0.16) 100%)',
      },
      boxShadow: {
        brand: '0 6px 24px -6px rgba(59,130,246,0.45)',
        'brand-lg': '0 12px 40px -8px rgba(99,102,241,0.5)',
        card: '0 1px 2px rgba(0,0,0,0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        'pulse-brand': 'pulseBrand 2.4s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        pulseBrand: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(59,130,246,0.45)' },
          '50%': { boxShadow: '0 0 0 14px rgba(59,130,246,0)' },
        },
      },
    },
  },
  plugins: [],
}
