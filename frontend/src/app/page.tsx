"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState, useCallback } from 'react';

export default function LandingPage() {
    const [isTransitioning, setIsTransitioning] = useState(false);

    const handleTransition = useCallback(() => {
        setIsTransitioning(true);
    }, []);

    return (
        <div className={`
            fixed inset-0 w-full h-full
            bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50
            dark:from-gray-900 dark:via-blue-900/30 dark:to-emerald-900/30
            animate-gradient-slow transition-all duration-500 ease-out
            ${isTransitioning ? 'animate-page-leave' : 'scale-100 opacity-100'}
        `}>
            {/* Animated Background Elements */}
            <div className="absolute inset-0 opacity-30 dark:opacity-20">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-300 dark:bg-emerald-600 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 dark:bg-blue-600 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 dark:bg-indigo-600 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
            </div>

            {/* Grid Pattern Overlay */}
            <div
                className="absolute inset-0 bg-grid-pattern opacity-10 dark:opacity-5"
                style={{
                    WebkitBackfaceVisibility: 'hidden',
                    backfaceVisibility: 'hidden',
                    WebkitPerspective: '1000',
                    perspective: '1000',
                    WebkitTransform: 'translate3d(0,0,0)',
                    transform: 'translate3d(0,0,0)'
                }}
            ></div>

            {/* Scrollable Content Container */}
            <div className="relative w-full h-full overflow-auto">
                <div className={`
                    flex flex-col items-center justify-center min-h-full
                    px-3 py-6 sm:p-6 md:p-8
                    transition-all duration-500 ease
                    ${isTransitioning ? 'translate-y-[-5%] opacity-0' : 'translate-y-0 opacity-100'}
                `}>
                    {/* Main Title */}
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl
                        font-bold text-center mb-1 sm:mb-2
                        text-transparent bg-clip-text
                        bg-gradient-to-r from-emerald-600 to-blue-600
                        dark:from-emerald-400 dark:to-blue-400">
                        Connect Four Championship
                    </h1>

                    {/* Subtitle */}
                    <p className="text-sm sm:text-base md:text-lg
                        text-gray-600 dark:text-gray-300
                        text-center mb-2 sm:mb-4
                        max-w-[90%] sm:max-w-2xl
                        px-2">
                        Challenge your strategic thinking in the ultimate battle of wits
                    </p>

                    {/* Logo Container */}
                    <div className="relative w-[85%] sm:w-[75%] md:max-w-md
                        animate-float mb-2 sm:mb-4
                        before:absolute before:inset-0 before:-z-10
                        before:transform before:translate-y-2
                        before:bg-gradient-to-r before:from-emerald-500/30 before:to-blue-500/30
                        dark:before:from-emerald-400/20 dark:before:to-blue-400/20
                        before:blur-xl before:rounded-3xl">
                        <Image
                            src="/connect-four.png"
                            alt="Connect 4 Logo"
                            width={500}
                            height={250}
                            priority
                            className="w-full h-auto transform transition-transform duration-700"
                        />
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3
                        gap-3 sm:gap-4
                        max-w-3xl mb-4 sm:mb-6
                        px-3 sm:px-4
                        w-full">
                        <div className="text-center bg-white/50 dark:bg-gray-800/50
                            rounded-lg p-3 sm:p-4
                            backdrop-blur-sm">
                            <h3 className="text-sm sm:text-base font-semibold
                                text-emerald-600 dark:text-emerald-400
                                mb-1">
                                Multiple Game Modes
                            </h3>
                            <p className="text-xs sm:text-sm
                                text-gray-600 dark:text-gray-400">
                                Play against AI or challenge friends
                            </p>
                        </div>
                        <div className="text-center bg-white/50 dark:bg-gray-800/50
                            rounded-lg p-3 sm:p-4
                            backdrop-blur-sm">
                            <h3 className="text-sm sm:text-base font-semibold
                                text-blue-600 dark:text-blue-400
                                mb-1">
                                Global Rankings
                            </h3>
                            <p className="text-xs sm:text-sm
                                text-gray-600 dark:text-gray-400">
                                Compete for the top spot on the leaderboard
                            </p>
                        </div>
                        <div className="text-center bg-white/50 dark:bg-gray-800/50
                            rounded-lg p-3 sm:p-4
                            backdrop-blur-sm">
                            <h3 className="text-sm sm:text-base font-semibold
                                text-indigo-600 dark:text-indigo-400
                                mb-1">
                                Strategic Mastery
                            </h3>
                            <p className="text-xs sm:text-sm
                                text-gray-600 dark:text-gray-400">
                                Perfect your tactics and become a champion
                            </p>
                        </div>
                    </div>

                    {/* Call to Action Button */}
                    <Link
                        href="/modes"
                        onClick={handleTransition}
                        className={`
                            group flex flex-col items-center
                            transform transition-all duration-300
                            mt-2 sm:mt-4
                            ${isTransitioning ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'}
                        `}
                        aria-label="Start Game"
                    >
                        <span className="text-base sm:text-lg font-semibold
                            text-gray-700 dark:text-gray-200
                            mb-3 sm:mb-4
                            group-hover:text-emerald-600 dark:group-hover:text-emerald-400
                            transition-colors">
                            Ready to Play?
                        </span>

                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full
                            bg-gradient-to-br from-emerald-500/80 to-blue-500/80
                            dark:from-emerald-400/20 dark:to-blue-400/20
                            shadow-lg dark:shadow-emerald-500/10
                            backdrop-blur-sm
                            group-hover:from-emerald-400 group-hover:to-blue-400
                            dark:group-hover:from-emerald-300/30 dark:group-hover:to-blue-300/30
                            transition-all duration-300
                            animate-bounce-subtle
                            flex items-center justify-center
                        ">
                            <svg
                                className="w-6 h-6 sm:w-8 sm:h-8
                                    text-white/90 dark:text-white/80
                                    transform transition-transform duration-300
                                    group-hover:scale-110 group-hover:text-white
                                    drop-shadow-lg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                                />
                            </svg>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
