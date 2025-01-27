import 'core-js/stable';
import 'regenerator-runtime/runtime';
import "./globals.css";
import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";
import ThemeButton from "@/components/theme-button";
import ThemeProviderWrapper from "./providers";

// Optimize font loading
const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: {
    template: '%s | Four Fury',
    default: 'Four Fury - The Ultimate Connect4 Experience'
  },
  description: "Challenge your strategic thinking with Four Fury, a modern take on the classic Connect4 game. Play with friends in real-time multiplayer matches.",
  keywords: ['Connect4', 'board game', 'multiplayer game', 'strategy game', 'online game'],
  authors: [{ name: 'FourFury Team (Abdelrahman Mohamed @real3bdelrahman)' }],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16' },
      { url: '/icon-32.png', sizes: '32x32' },
      { url: '/icon-192.png', sizes: '192x192' },
      { url: '/icon-512.png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180' },
    ],
  },
  openGraph: {
    title: 'Four Fury',
    description: 'Challenge your friends in Four Fury - The Ultimate Connect4 Experience',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Four Fury',
    description: 'Challenge your friends in Four Fury - The Ultimate Connect4 Experience',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
  ],
  width: 'device-width',
  height: 'device-height',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 2,
  userScalable: false,
  viewportFit: 'cover'
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full`}
      suppressHydrationWarning
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <body
        className={`
          min-h-screen max-h-screen w-full
          bg-gradient-to-br from-blue-50/95 via-white/95 to-cyan-100/95
          dark:from-gray-900/95 dark:via-gray-800/95 dark:to-cyan-900/95
          transition-colors duration-300
          antialiased font-sans
          overflow-hidden
          overscroll-none
          -webkit-font-smoothing-antialiased
          -moz-osx-font-smoothing-grayscale
        `}
        style={{
          WebkitOverflowScrolling: 'touch',
          WebkitTextSizeAdjust: '100%',
          MozTextSizeAdjust: '100%',
          textSizeAdjust: '100%'
        }}
      >
        <ThemeProviderWrapper>
          <main className="relative w-full h-screen overflow-auto">
            <div className="fixed top-4 right-4 z-50 md:top-6 md:right-6 lg:top-8 lg:right-8">
              <ThemeButton />
            </div>
            {children}
          </main>
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
