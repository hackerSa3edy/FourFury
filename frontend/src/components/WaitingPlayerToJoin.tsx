
import React, { useState } from "react";

export function WaitingPlayerToJoin({ id }: { id: string }) {
    const [isCopied, setIsCopied] = useState(false);
    const frontendBaseUrl = window.location.origin;
    const linkToShare = `${frontendBaseUrl}/games/${id}/join/`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(linkToShare);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1000);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-gray-900 dark:to-cyan-950">
            <div className="w-full max-w-2xl mx-4 p-8 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-2xl border border-cyan-200 dark:border-cyan-800">
                <div className="text-center space-y-6">
                    <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">Waiting for player to join</h2>
                    <div className="relative">
                        <p className="text-slate-600 dark:text-slate-300 mb-4">
                            Share this link with a friend to join (click to copy):
                        </p>
                        <button
                            onClick={handleCopyLink}
                            className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors break-all"
                        >
                            {linkToShare}
                        </button>
                        <div
                            className={`
                                absolute left-1/2 transform -translate-x-1/2 mt-4
                                bg-cyan-500 text-white px-3 py-1 rounded
                                transition-opacity duration-300
                                ${isCopied ? "opacity-100" : "opacity-0"}
                            `}
                        >
                            Copied!
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
