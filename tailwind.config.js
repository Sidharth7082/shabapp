/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f3f7f0',
          100: '#e3eddd',
          200: '#c7dcbc',
          300: '#a3c492',
          400: '#7fa96b',
          500: '#4b6b36',
          600: '#405c2e',
          700: '#354e26',
          800: '#2b3f1f',
          900: '#22331a'
        },
        ink: {
          DEFAULT: '#1f2937',
          soft: '#4b5563',
          mute: '#6b7280'
        },
        surface: {
          DEFAULT: '#ffffff',
          sunken: '#f6f7f4',
          raised: '#fbfcfa',
          line: '#e5e7eb'
        },
        danger: {
          DEFAULT: '#c0392b',
          soft: '#fdecea'
        },
        warn: {
          DEFAULT: '#b45309',
          soft: '#fef3c7'
        },
        ok: {
          DEFAULT: '#15803d',
          soft: '#dcfce7'
        },
        info: {
          DEFAULT: '#1d4ed8',
          soft: '#e0eaff'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.95rem' }]
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem'
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.05), 0 1px 3px rgba(16,24,40,0.08)',
        raised: '0 4px 12px rgba(16,24,40,0.08), 0 1px 3px rgba(16,24,40,0.05)',
        elevated: '0 12px 32px rgba(16,24,40,0.14), 0 2px 8px rgba(16,24,40,0.08)',
        sheet: '0 -12px 40px rgba(16,24,40,0.22)'
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'slide-up': {
          from: { transform: 'translateY(16px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' }
        },
        'pop-in': {
          from: { transform: 'scale(0.96)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' }
        }
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out both',
        'slide-up': 'slide-up 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'sheet-up': 'sheet-up 280ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'pop-in': 'pop-in 200ms cubic-bezier(0.22, 1, 0.36, 1) both'
      },
      minHeight: {
        tap: '48px'
      },
      minWidth: {
        tap: '48px'
      }
    }
  },
  plugins: []
}
