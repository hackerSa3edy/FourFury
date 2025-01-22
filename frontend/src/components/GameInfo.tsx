import React from "react";
import { RematchButton, ReplayButton } from "@/components/buttons";
import { GameData } from "@/app/games/[id]/page";

interface GameInfoProps {
    gameData: GameData;
    handleReplayGame: () => void;
    handleRematch: () => void;
    handleCancelRematch: () => void;
    rematchStatus: string;
    presenceState: PresenceState;
    countdowns: {[key: string]: number};
    playerName: string;
    replayInProgress: boolean;
}

interface PlayerPresence {
    status: 'online' | 'offline';
    countdown?: number;
}

interface PresenceState {
    [username: string]: PlayerPresence;
}

// Enhanced particle effect with better performance
const ParticleBackground = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none select-none">
        {[...Array(8)].map((_, i) => (
            <div
                key={i}
                className={`
                    absolute w-2 h-2 rounded-full
                    bg-gradient-to-br from-cyan-400/20 to-purple-400/20
                    dark:from-cyan-600/20 dark:to-purple-600/20
                    transform-gpu will-change-transform
                    motion-safe:animate-float-${(i % 5) + 1}
                `}
                style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.2}s`,
                }}
            />
        ))}
    </div>
);

export const GameInfo = React.memo(({
    gameData,
    handleReplayGame,
    handleRematch,
    handleCancelRematch,
    rematchStatus,
    presenceState,
    countdowns,
    playerName,
    replayInProgress
}: GameInfoProps) => {
    const humanFinishedAt = gameData.finished_at
        ? new Date(gameData.finished_at).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : null;

    return (
        <div className="relative rounded-2xl p-2 sm:p-4 mx-auto max-w-2xl w-full
            bg-gradient-to-br from-white/90 via-white/95 to-cyan-50/90
            dark:from-slate-800/90 dark:via-slate-800/95 dark:to-cyan-900/90
            shadow-[0_2px_16px_rgba(0,0,0,0.06)]
            dark:shadow-[0_2px_16px_rgba(0,0,0,0.15)]
            border border-cyan-200/50 dark:border-cyan-800/50
            backdrop-filter backdrop-blur-[8px]
            transform-gpu transition-all duration-300
            hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)]
            dark:hover:shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
            <ParticleBackground />

            <div className="text-center space-y-3 sm:space-y-4 relative z-10">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold
                    bg-gradient-to-r from-cyan-600 via-purple-600 to-cyan-600
                    dark:from-cyan-400 dark:via-purple-400 dark:to-cyan-400
                    bg-clip-text text-transparent
                    motion-safe:animate-gradient-x select-none
                    tracking-tight leading-none">
                    Connect4 BATTLE
                </h1>

                <div className="flex flex-col sm:flex-row justify-center items-center
                    gap-4 sm:gap-8 py-4 sm:py-6">
                    <PlayerStatus
                        name={gameData.player_1}
                        presence={gameData.mode === 'ai' ? { status: 'online' } : presenceState[gameData.player_1_username]}
                        countdown={gameData.mode === 'ai' ? undefined : countdowns[gameData.player_1_username]}
                        color="from-red-500 via-rose-500 to-red-500"
                    />
                    <div className="flex flex-col items-center transform-gpu
                        hover:scale-110 transition-transform duration-300">
                        <span className="text-2xl sm:text-3xl font-black
                            bg-gradient-to-br from-cyan-500 to-purple-500
                            bg-clip-text text-transparent
                            filter drop-shadow-md">
                            VS
                        </span>
                        <div className="w-4 h-4 sm:w-5 sm:h-5
                            animate-ping-slow opacity-50
                            bg-gradient-to-br from-cyan-400 to-purple-400
                            rounded-full blur-[1px]">
                        </div>
                    </div>
                    {
                        gameData.player_2_username && (
                            <PlayerStatus
                                name={gameData.player_2 || ''}
                                presence={gameData.mode === 'ai' ? { status: 'online' } : presenceState[gameData.player_2_username]}
                                countdown={gameData.mode === 'ai' ? undefined : countdowns[gameData.player_2_username]}
                                color="from-yellow-500 to-amber-500 dark:from-blue-400 dark:to-cyan-400"
                            />
                        )
                    }
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1.5
                    bg-gradient-to-r from-slate-100/50 to-cyan-50/50
                    dark:from-slate-800/50 dark:to-cyan-900/50
                    rounded-lg text-sm font-medium
                    text-slate-700 dark:text-slate-300
                    border border-slate-200/50 dark:border-slate-700/50
                    shadow-sm">
                    {replayInProgress ? (
                        <span className="text-cyan-600 dark:text-cyan-400">
                            Move #{gameData.move_number}
                        </span>
                    ) : !gameData.finished_at ? (
                        <span className="text-cyan-600 dark:text-cyan-400">
                            Move #{gameData.move_number}
                        </span>
                    ) : (
                        renderGameStatus(gameData, playerName)
                    )}
                    {humanFinishedAt && (
                        <>
                            <span className="text-slate-400 dark:text-slate-500">•</span>
                            <span className="text-purple-600 dark:text-purple-400">
                                {humanFinishedAt}
                            </span>
                        </>
                    )}
               </div>

                {humanFinishedAt && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mt-4">
                        <RematchButton
                            rematchStatus={rematchStatus}
                            onRematch={handleRematch}
                            onCancelRematch={handleCancelRematch}
                        />
                        <ReplayButton onReplay={handleReplayGame} />
                    </div>
                )}

                {rematchStatus === 'waiting' && (
                    <div className="mt-4 text-lg font-bold
                        bg-gradient-to-r from-cyan-500 to-purple-500
                        bg-clip-text text-transparent
                        animate-pulse">
                        Waiting for opponent to accept rematch...
                    </div>
                )}
            </div>
        </div>
    );
});

function PlayerStatus({ name, presence, countdown, color }: {
    name: string;
    presence?: PlayerPresence;
    countdown?: number;
    color: string;
}) {
    const isOnline = presence?.status === 'online';

    return (
        <div className="relative group">
            <div className={`
                transform-gpu transition-all duration-300 ease-out
                ${isOnline ? 'rotate-y-0' : 'rotate-y-180'}
                flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl
                bg-gradient-to-br ${color}
                shadow-md hover:shadow-lg
                hover:-translate-y-0.5
                backdrop-filter backdrop-blur-sm
            `}>
                <div className={`
                    w-3 sm:w-4 h-3 sm:h-4 relative rounded-full
                    ${isOnline ? 'bg-green-300' : 'bg-gray-400'}
                    shadow-inner
                `}>
                    {isOnline && (
                        <span className="absolute inset-0 rounded-full
                            animate-ping-slow bg-green-400 opacity-75
                            transform-gpu"/>
                    )}
                </div>

                <span className="text-lg sm:text-xl font-bold text-white
                    truncate max-w-[150px] sm:max-w-[200px]
                    filter drop-shadow-sm">
                    {name}
                </span>

                {countdown !== undefined && countdown > 0 && (
                    <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3
                        w-7 h-7 sm:w-9 sm:h-9 rounded-full
                        bg-gradient-to-br from-red-500 to-rose-600
                        flex items-center justify-center
                        animate-bounce shadow-lg transform-gpu
                        border-2 border-white/30">
                        <span className="text-sm sm:text-base font-bold text-white
                            filter drop-shadow-sm">
                            {countdown}
                        </span>
                    </div>
                )}
            </div>

            <div className="absolute -top-14 left-1/2 transform -translate-x-1/2
                opacity-0 group-hover:opacity-100
                transition-all duration-300 ease-in-out z-20
                pointer-events-none select-none">
                <div className={`
                    px-4 py-2 text-sm rounded-lg whitespace-nowrap
                    ${isOnline
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : 'bg-gradient-to-r from-red-500 to-rose-500'}
                    text-white shadow-lg
                    backdrop-filter backdrop-blur-sm
                `}>
                    {isOnline ? '🟢 Online' : countdown ? `⚠️ Disconnected (${countdown}s)` : '🔴 Offline'}
                </div>
            </div>
        </div>
    );
}

const renderGameStatus = (gameData: GameData, playerName: string) => {
    if (gameData.finished_at && !gameData.winner) {
        return (
            <div className="flex items-center gap-2">
                <svg
                    className="w-5 h-5 text-yellow-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-orange-600 dark:text-yellow-500 font-medium">Draw Game!</span>
            </div>
        );
    }

    if (gameData.winner) {
        const winnerUsername = gameData.winner === 1 ? gameData.player_1_username : gameData.player_2_username;
        const isWinner = winnerUsername === playerName;
        const winnerName = gameData.winner === 1 ? gameData.player_1 : gameData.player_2;

        return (
            <div className="flex items-center gap-2">
                <svg
                    className={`w-5 h-5 ${isWinner ? 'text-green-600 dark:text-green-500' : 'text-blue-600 dark:text-blue-500'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    {isWinner ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                </svg>
                <span className={`font-bold ${isWinner ? 'text-green-600 dark:text-green-500' : 'text-blue-600 dark:text-blue-500'}`}>
                    {isWinner ? 'Victory!' : `${winnerName} wins!`}
                </span>
            </div>
        );
    }

    return null;
};

GameInfo.displayName = 'GameInfo';
