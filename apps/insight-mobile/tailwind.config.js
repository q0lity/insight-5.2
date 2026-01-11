/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', 'System'],
      },
      colors: {
        bg: '#0b1020',
        panel: 'rgba(15, 19, 32, 0.92)',
        panel2: '#141a2a',
        text: '#e5e7eb',
        muted: 'rgba(148, 163, 184, 0.72)',
        muted2: 'rgba(148, 163, 184, 0.4)',
        accent: '#d95d39',
        accentSoft: 'rgba(217, 93, 57, 0.18)',
        indigo: '#8b93ff',
        border: 'rgba(148, 163, 184, 0.16)',
        border2: 'rgba(148, 163, 184, 0.24)',
      },
    },
  },
  plugins: [],
}
