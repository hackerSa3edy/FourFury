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
        'float-particle': 'float-particle 10s linear infinite',
        'text-shine': 'text-shine 2s linear infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'gradient-slow': 'gradient 15s ease infinite',
        'blob': 'blob 7s infinite',
        'text-shimmer': 'text-shimmer 2s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shine': 'shine 2s infinite',
        'float': 'float 3s ease-in-out infinite',
        'float-1': 'float 10s ease-in-out infinite',
        'float-2': 'float 12s ease-in-out infinite -2s',
        'float-3': 'float 14s ease-in-out infinite -4s',
        'float-slow': 'float 6s ease-in-out infinite',
        'winning-cell': 'winning 2s ease-in-out infinite',
        'bounce-subtle': 'bounce-subtle 1s infinite',
        'page-enter': 'pageEnter 0.5s ease-out forwards',
        'page-leave': 'pageLeave 0.5s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'float-particle': {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(-100px) translateX(50px)' },
        },
        'text-shine': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        'slide-up': {
            '0%': { transform: 'translateY(100%)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'winning': {
          '0%, 100%': {
            transform: 'scale(1)',
            filter: 'brightness(1)',
          },
          '50%': {
            transform: 'scale(1.05)',
            filter: 'brightness(1.2)',
          },
        },
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
        'gradient': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': '0% 50%',
          },
          '50%': {
            'background-size': '400% 400%',
            'background-position': '100% 50%',
          },
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
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'blob': {
          '0%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)',
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)',
          },
          '100%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
        },
        'shine': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10%)' }
        },
        'page-enter': {
          '0%': {
            transform: 'scale(0.95) translateY(20%)',
            opacity: '0'
          },
          '100%': {
            transform: 'scale(1) translateY(0)',
            opacity: '1'
          },
        },
        'page-leave': {
          '0%': {
            transform: 'scale(1)',
            opacity: '1'
          },
          '100%': {
            transform: 'scale(1.5)',
            opacity: '0'
          },
        },
        'fadeInUp': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'pageEnter': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'pageLeave': {
          '0%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
          '100%': {
            opacity: '0',
            transform: 'translateY(-20px)'
          }
        },
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(to right, rgb(229 231 235 / 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgb(229 231 235 / 0.1) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '24px 24px',
      },
      boxShadow: {
        '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
  darkMode: "class",
} satisfies Config;
