/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        tint: '#D95D39',
        'tint-light': 'rgba(217,93,57,0.15)',
        // Dark theme
        'dark-bg': '#0B1020',
        'dark-surface': '#141a2a',
        // Light theme
        'light-bg': '#FFFFFF',
        'light-surface': '#F8F9FA',
        // Warm theme
        'warm-bg': '#F2F0ED',
        // Olive theme
        'olive-bg': '#1A1F16',
        'olive-surface': '#252B20',
        'olive-tint': '#8B9A6D',
        // Status colors
        success: '#22C55E',
        error: '#EF4444',
        warning: '#F97316',
      },
      fontFamily: {
        'figtree': ['Figtree_400Regular', 'sans-serif'],
        'figtree-medium': ['Figtree_500Medium', 'sans-serif'],
        'figtree-semibold': ['Figtree_600SemiBold', 'sans-serif'],
        'figtree-bold': ['Figtree_700Bold', 'sans-serif'],
        'space-grotesk': ['SpaceGrotesk_500Medium', 'sans-serif'],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '24px',
      },
    },
  },
  plugins: [],
};
