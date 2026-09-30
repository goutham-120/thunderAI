/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#12324E',
          dark: '#0B2034',
          hover: '#1C3A57',
          light: '#274B6E',
        },
        steel: {
          DEFAULT: '#5E82A6',
          light: '#8FAECF',
          dark: '#3D5E80',
          border: '#D0E3F0'
        },
        storm: {
          bg: '#EAF0F6',
          surface: '#EEF4FA',
          card: '#F4F8FB',
          border: '#D0E3F0'
        },
        cyanaccent: {
          DEFAULT: '#38BDF8',
          dark: '#0284C7',
          light: '#E0F2FE'
        },
        goldaccent: {
          DEFAULT: '#FFC53D',
          dark: '#D97706',
          light: '#FFFBEB'
        },
        radar: {
          light: '#E0F2FE',
          green: '#22C55E',
          yellow: '#EAB308',
          orange: '#F97316',
          red: '#EF4444',
          magenta: '#D946EF',
          purple: '#8B5CF6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        sora: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}
