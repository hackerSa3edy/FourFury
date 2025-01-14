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
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      animation: {
          'gradient-xy': 'gradient-xy 15s ease infinite',
          'text-shimmer': 'text-shimmer 2s ease-in-out infinite',
      },
      keyframes: {
          'gradient-xy': {
              '0%, 100%': {
                  'background-size': '400% 400%',
                  'background-position': 'left center'
              },
              '50%': {
                  'background-size': '200% 200%',
                  'background-position': 'right center'
              }
          },
          'text-shimmer': {
              '0%, 100%': {
                  'background-size': '200% 200%',
                  'background-position': 'left center'
              },
              '50%': {
                  'background-size': '200% 200%',
                  'background-position': 'right center'
              }
          }
      },
      boxShadow: {
          '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
  darkMode: "class",
} satisfies Config;
