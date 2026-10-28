/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'Geist',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
      },
      colors: {
        // Channel triplets live in index.css, scoped to [data-theme].
        lumos: {
          bg: 'rgb(var(--lumos-bg) / <alpha-value>)',
          surface: 'rgb(var(--lumos-surface) / <alpha-value>)',
          elevated: 'rgb(var(--lumos-elevated) / <alpha-value>)',
          line: 'rgb(var(--lumos-line) / <alpha-value>)',
          'line-strong': 'rgb(var(--lumos-line-strong) / <alpha-value>)',
          accent: 'rgb(var(--lumos-accent) / <alpha-value>)',
          'accent-soft': 'rgb(var(--lumos-accent-soft) / <alpha-value>)',
          'accent-strong': 'rgb(var(--lumos-accent-strong) / <alpha-value>)',
          'accent-ink': 'rgb(var(--lumos-accent-ink) / <alpha-value>)',
        },
      },
      keyframes: {
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'theme-pop': {
          '0%': { opacity: '0', transform: 'translateY(2px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'rise-in': 'rise-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'soft-pulse': 'soft-pulse 2s ease-in-out infinite',
        'theme-pop': 'theme-pop 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      boxShadow: {
        glow: '0 0 40px -12px rgb(var(--lumos-accent) / 0.5)',
        panel:
          '0 18px 38px -28px rgb(0 0 0 / 0.9), inset 0 1px 0 0 rgb(255 255 255 / 0.035)',
        'panel-raised':
          '0 24px 48px -30px rgb(0 0 0 / 0.95), inset 0 1px 0 0 rgb(255 255 255 / 0.045)',
      },
      transitionTimingFunction: {
        glide: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
