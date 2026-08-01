/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Near-black neutral surfaces. `ink` climbs from the page background up
        // through card, raised and border steps, so components pick a depth
        // rather than guessing at a hex. Kept hue-free so the lime accent is the
        // only colour on the screen that carries meaning.
        ink: {
          950: '#09090B', // page background
          900: '#0E0E11',
          800: '#141417', // sunken (inputs)
          700: '#18181B', // card
          600: '#232327', // raised control
          500: '#32323A', // border / divider
          400: '#7A7A83', // dim text — 4.7:1 on the page background, so it
          //                  stays readable where it labels rather than disables
          300: '#A1A1AA', // muted text
          200: '#C7C7D0', // secondary text
          100: '#E4E4E7',
          50: '#FAFAFA', // primary text
        },
        // Lime. Very bright against near-black (13:1), which is why every
        // surface painted with brand-500 carries dark text, not white.
        brand: {
          50: '#F7FEE7',
          100: '#ECFCCB',
          200: '#D9F99D',
          300: '#CFF171',
          400: '#BEF264',
          500: '#A3E635', // primary accent
          600: '#8CCF22', // pressed
          700: '#74AD16',
          800: '#5C8A12',
          900: '#48690F',
        },
        // Cyan, the second accent — supersets, drop sets, the carbs bar. Far
        // enough from lime in hue to read as a different thing at a glance.
        aqua: {
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
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
        'brand-gradient': 'linear-gradient(135deg, #A3E635 0%, #22D3EE 100%)',
        'brand-soft': 'linear-gradient(135deg, rgba(163,230,53,0.16) 0%, rgba(34,211,238,0.16) 100%)',
      },
      boxShadow: {
        // Lower alpha than the old blue glow: lime is far brighter, so the same
        // opacity would read as a halo rather than a lift.
        brand: '0 6px 24px -6px rgba(163,230,53,0.35)',
        'brand-lg': '0 12px 40px -8px rgba(163,230,53,0.4)',
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
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(163,230,53,0.4)' },
          '50%': { boxShadow: '0 0 0 14px rgba(163,230,53,0)' },
        },
      },
    },
  },
  plugins: [],
}
