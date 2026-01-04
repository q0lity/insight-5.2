import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        clay: {
          DEFAULT: "#D95D39",
          soft: "rgba(217, 93, 57, 0.12)",
          dark: "#B84A2B",
        },
        sand: {
          DEFAULT: "#E6E4E0", // The main background
          light: "#F2F0ED",
          dark: "#D6D4D0",
        },
        ink: {
          DEFAULT: "#1C1C1E", // The main text color
          soft: "#48484A",
          lighter: "#8E8E93",
        },
        peach: "#FCECE8",
        teal: "#488B86",
        stone: "#48484A", // Darker stone for better contrast against sand
        mist: "#D1D1D6",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["var(--font-figtree)", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-merriweather)", "Georgia", "serif"],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.04)',
        'clay': '0 4px 14px rgba(217, 93, 57, 0.3)',
      }
    },
  },
  plugins: [],
} satisfies Config;