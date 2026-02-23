/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        neon: {
          blue: '#00d4ff',
          purple: '#a855f7',
          silver: '#c0c0d0',
        },
        surface: {
          DEFAULT: '#0f0f13',
          card: '#16161e',
          border: '#1e1e2e',
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(0, 212, 255, 0.15)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.15)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
