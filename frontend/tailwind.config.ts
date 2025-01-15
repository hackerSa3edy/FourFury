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
          'fade-in-up': 'fadeInUp 0.5s ease-out',
          'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'shine': 'shine 2s infinite',
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
      fadeInUp: {
        '0%': {
          opacity: '0',
          transform: 'translateY(20px)'
        },
        '100%': {
          opacity: '1',
          transform: 'translateY(0)'
        }
      },
      shine: {
        '0%': { transform: 'translateX(-100%)' },
        '100%': { transform: 'translateX(100%)' }
      }
    },
  },
  plugins: [],
  darkMode: "class",
} satisfies Config;
