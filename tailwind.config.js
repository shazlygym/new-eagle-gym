/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#fdf9ec',
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
          50:  '#f5f5f5',
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
      fontFamily: {
        arabic: ['Cairo', 'Tajawal', 'sans-serif'],
        sans:   ['Inter', 'Cairo', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #C9A84C 0%, #e8c56a 50%, #C9A84C 100%)',
        'dark-gradient': 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
      },
      boxShadow: {
        gold: '0 4px 24px rgba(201,168,76,0.25)',
        'gold-lg': '0 8px 40px rgba(201,168,76,0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-gold': 'pulseGold 2s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn: { from: { transform: 'translateX(-20px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,168,76,0.4)' },
          '50%': { boxShadow: '0 0 0 10px rgba(201,168,76,0)' },
        },
      },
    },
  },
  plugins: [],
}
