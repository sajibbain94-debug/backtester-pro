/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // TradingView-style palette
        tv: {
          bg:         '#131722',
          panel:      '#1e2130',
          border:     '#2a2e39',
          hover:      '#2a2e39',
          text:       '#d1d4dc',
          muted:      '#787b86',
          dim:        '#4a4f61',
          green:      '#26a69a',
          red:        '#ef5350',
          blue:       '#2962ff',
          yellow:     '#f59e0b',
          purple:     '#a855f7',
          orange:     '#f97316',
          cyan:       '#22d3ee',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Cascadia Code"', 'monospace'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        'tv-panel': '0 4px 24px rgba(0,0,0,0.45)',
        'tv-dropdown': '0 8px 32px rgba(0,0,0,0.55)',
      },
      borderRadius: {
        tv: '4px',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(4px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
