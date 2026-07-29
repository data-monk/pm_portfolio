/** @type {import('tailwindcss').Config} */
import tailwindcssAnimate from 'tailwindcss-animate'

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        // ANZ blue + white theme tokens
        anz: {
          blue:    '#007DC3',
          navy:    '#003D66',
          ink:     '#1A2B3C',
          muted:   '#7A8FA0',
          surface: '#F2F7FC',
          border:  '#D0DDE8',
        },
        // RaaS teal theme tokens
        raas: {
          teal:   '#0E7490',
          light:  '#0891B2',
          glow:   'rgba(14,116,144,0.15)',
          border: 'rgba(14,116,144,0.25)',
        },
        // Legacy dark-theme tokens (used by sub-apps)
        neon: {
          blue: '#00d4ff',
          purple: '#a855f7',
          silver: '#c0c0d0',
        },
        amber: {
          DEFAULT: '#e89419',
          dim: '#7a4f0c',
        },
        frost: '#dde3ed',
        mist: '#6b7591',
        surface: {
          DEFAULT: '#08080d',
          card: '#111118',
          border: '#1c1c28',
        },
        // Violet-crumbs shadcn CSS variable tokens
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        urgent: {
          DEFAULT: 'hsl(var(--urgent))',
          foreground: 'hsl(var(--urgent-foreground))',
        },
        'violet-glow': 'hsl(var(--violet-glow))',
        'violet-light': 'hsl(var(--violet-light))',
        'violet-deep': 'hsl(var(--violet-deep))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        glow: '0 0 20px rgba(0, 212, 255, 0.15)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.15)',
        'glow-amber': '0 0 20px rgba(232, 148, 25, 0.2)',
        'card':        '0 1px 3px rgba(0, 61, 102, 0.08), 0 4px 16px rgba(0, 61, 102, 0.06)',
        'card-hover':  '0 4px 12px rgba(0, 61, 102, 0.12), 0 12px 32px rgba(0, 61, 102, 0.10)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
