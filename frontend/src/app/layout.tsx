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
  fallback: ['system-ui', 'arial'],
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
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html
      lang="en"
      className={`h-full transition-colors duration-300 ease-in-out ${inter.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`
          min-h-screen w-full flex flex-col
          bg-gradient-to-bl from-blue-50 via-white to-fuchsia-100
          dark:from-gray-900 dark:via-gray-800 dark:to-slate-900
          transition-colors duration-300
          antialiased font-sans
          overflow-x-hidden
        `}
      >
        <ThemeProviderWrapper>
          <main className="flex-1 flex relative w-full">
            <div className="fixed top-4 right-4 z-50">
              <ThemeButton />
            </div>
            <div className="w-full flex-1 flex items-center justify-center">
              {children}
            </div>
          </main>
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
