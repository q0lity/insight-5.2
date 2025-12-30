/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Figtree"', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        panel2: 'var(--panel2)',
        border: 'var(--border)',
        border2: 'var(--border2)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        muted2: 'var(--muted2)',
        accent: 'var(--accent)',
        accentSoft: 'var(--accentSoft)',
        indigo: 'var(--indigo)',
        clay: 'var(--accent)',
      },
      boxShadow: {
        glass: '0 24px 60px rgba(15, 23, 42, 0.18)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}
