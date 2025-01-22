import React, { useState, useEffect } from "react";

export function WaitingPlayerToJoin({ id }: { id: string }) {
    const [isCopied, setIsCopied] = useState(false);
    const [dots, setDots] = useState('');

    // Use environment variable for base URL
    const frontendBaseUrl = process.env.REACT_APP_FRONTEND_URL || window.location.origin;
    const linkToShare = `${frontendBaseUrl}/games/${id}/join/`;

    // Animated dots for waiting message
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(linkToShare);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/30 dark:to-emerald-900/30 animate-gradient-slow">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 opacity-30 dark:opacity-20">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-300 dark:bg-emerald-600 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 dark:bg-blue-600 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 dark:bg-indigo-600 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
            </div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-grid-pattern opacity-10 dark:opacity-5"></div>

            <div className="relative w-full h-full flex items-center justify-center p-3 sm:p-4 lg:p-6 overflow-auto">
                <div className="w-full max-w-[min(90vw,540px)] my-auto bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg p-4 md:p-6 rounded-xl md:rounded-2xl shadow-2xl transition-all duration-300 hover:shadow-blue-500/20 dark:hover:shadow-emerald-500/20 border border-white/20 dark:border-gray-700/50">
                    <div className="flex flex-col items-center space-y-4 md:space-y-6">
                        {/* Loading Spinner */}
                        <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-emerald-500"></div>
                        </div>

                        {/* Header */}
                        <div className="text-center space-y-2">
                            <h3 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-indigo-600 dark:from-emerald-400 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                                Waiting for opponent{dots}
                            </h3>
                            <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">
                                Share this link with a friend to start playing
                            </p>
                        </div>

                        {/* Share Link Section */}
                        <div className="w-full space-y-3">
                            <div className="flex flex-col sm:flex-row gap-2 w-full">
                                <div className="flex-1 min-w-0">
                                    <div className="w-full rounded-lg bg-gray-200/100 hover:bg-gray-200/90 dark:bg-gray-700/40 dark:hover:bg-gray-700/60 border-2 border-transparent hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-200">
                                        <div className="px-3 py-2.5 text-xs md:text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
                                            {linkToShare}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCopyLink}
                                    className="shrink-0 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-medium transition-colors duration-200 flex items-center justify-center gap-2 text-sm md:text-base"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <span>Copy</span>
                                </button>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                            <p>The game will start automatically when your opponent joins</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 pointer-events-none">
                {isCopied && (
                    <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg transform transition-all duration-300 animate-slide-up">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-xs md:text-sm font-medium">Link copied!</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
