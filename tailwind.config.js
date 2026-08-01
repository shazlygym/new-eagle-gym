/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Near-black surfaces with a faint blue cast — the colour of cold steel
        // rather than of switched-off plastic. A truly hue-free ramp reads as
        // "default dark mode"; two points of blue is enough to read as a
        // material without tinting anything laid on top of it.
        //
        // The ramp climbs page → card → raised → border, so a component picks a
        // depth instead of guessing at a hex.
        ink: {
          950: '#08080B', // page background
          900: '#0D0E12', // sunken page — headers, the plane behind a sheet
          800: '#131419', // sunken (inputs, wells)
          700: '#191A20', // card
          600: '#24262E', // raised control
          500: '#343742', // border / divider
          400: '#7D8191', // dim text — 5.2:1 on the page background, so it stays
          //                  readable where it labels rather than disables
          300: '#A3A7B5', // muted text — 8.4:1
          200: '#C9CCD6', // secondary text
          100: '#E6E8ED',
          50: '#FAFAFC', // primary text
        },
        // Lime. Very bright against near-black (13:1), which is why every
        // surface painted with brand-500 carries dark text, not white.
        //
        // It is the app's only *action* colour: anything lime is either the
        // thing to tap now or the thing that just went right. Data uses the
        // ramps below. Spending lime on ornament is what stopped it meaning
        // anything.
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

        // ─── Data hues ────────────────────────────────────────────────────
        // Four accents chosen as a set: each sits at roughly the same lightness
        // against near-black, so a chart reads as one family rather than as
        // whatever colours were to hand. Each carries one fixed meaning, and
        // nothing in the app reaches past these into a Tailwind default again.

        /** Cool secondary — timed work, supersets, carbohydrate. */
        aqua: {
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
        },
        /** Heat — calories, warnings, a trend moving the wrong way. */
        flame: {
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        /** The fourth series, where three are not enough — fat, body weight. */
        plum: {
          200: '#F5D0FE',
          300: '#F0ABFC',
          400: '#E879F9',
          500: '#D946EF',
          600: '#C026D3',
        },
        /** Destructive only. Never decorative, never a data series. */
        danger: {
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
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
        // offline. That rules out a display webface, so the display voice is
        // built from weight, tracking and scale instead — see `.display-title`
        // and `.num-hero` in index.css.
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
        // Lime only. This used to run lime → cyan: the single gradient in the
        // app, and it read as decoration borrowed from a different design.
        // Now it is a lit solid — one hue, brighter along the top edge, the way
        // a painted plate catches the light.
        'brand-gradient': 'linear-gradient(158deg, #C9F358 0%, #A3E635 46%, #8CCF22 100%)',
        'brand-soft':
          'linear-gradient(158deg, rgba(163,230,53,0.20) 0%, rgba(163,230,53,0.05) 100%)',
        /**
         * Knurling — the diagonal cross-hatch cut into a barbell so it will not
         * slip. It is the one texture every lifter has under their hands every
         * session, and at 5% alpha it is felt rather than seen. The only
         * ornament in the app, and it is spent on one hero surface per screen.
         */
        knurl:
          'repeating-linear-gradient(115deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 7px)',
      },
      boxShadow: {
        // Lower alpha than the old blue glow: lime is far brighter, so the same
        // opacity would read as a halo rather than a lift.
        brand: '0 6px 24px -6px rgba(163,230,53,0.35)',
        'brand-lg': '0 12px 40px -8px rgba(163,230,53,0.4)',
        card: '0 1px 2px rgba(0,0,0,0.5)',
        // Real elevation, for the one surface per screen that sits above the
        // rest. Two shadows: a tight contact edge so it rests on the page, and
        // a wide soft one so it rests *above* it.
        lift: '0 2px 6px -2px rgb(0 0 0 / 0.55), 0 16px 32px -16px rgb(0 0 0 / 0.9)',
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
