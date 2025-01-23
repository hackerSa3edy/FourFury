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
        <div className="relative rounded-[clamp(0.5rem,2vw,1rem)] p-[clamp(0.5rem,2vw,1rem)]
            w-full
            bg-gradient-to-br from-white/90 via-white/95 to-cyan-50/90
            dark:from-slate-800/90 dark:via-slate-800/95 dark:to-cyan-900/90
            shadow-[0_clamp(0.125rem,1vw,0.5rem)_clamp(0.5rem,2vw,1rem)_rgba(0,0,0,0.06)]
            dark:shadow-[0_clamp(0.125rem,1vw,0.5rem)_clamp(0.5rem,2vw,1rem)_rgba(0,0,0,0.15)]
            border border-cyan-500 dark:border-cyan-800/50
            backdrop-filter backdrop-blur-[8px]
            transform-gpu transition-all duration-300
            hover:shadow-[0_clamp(0.25rem,1.5vw,1rem)_clamp(1rem,3vw,1.5rem)_rgba(0,0,0,0.08)]
            dark:hover:shadow-[0_clamp(0.25rem,1.5vw,1rem)_clamp(1rem,3vw,1.5rem)_rgba(0,0,0,0.25)]">
            <ParticleBackground />

            <div className="text-center space-y-[clamp(0.75rem,2vw,1rem)] relative z-10">
                <h1 className="text-[clamp(1.5rem,4vw,2.25rem)] font-extrabold
                    bg-gradient-to-r from-cyan-600 via-purple-600 to-cyan-600
                    dark:from-cyan-400 dark:via-purple-400 dark:to-cyan-400
                    bg-clip-text text-transparent
                    motion-safe:animate-gradient-x select-none
                    tracking-tight leading-none">
                    Connect4 BATTLE
                </h1>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(clamp(120px,30vw,180px),1fr))]
                    items-center justify-items-center gap-[clamp(0.75rem,2vw,1rem)]
                    py-[clamp(0.75rem,2vw,1.5rem)]">
                    <PlayerStatus
                        name={gameData.player_1}
                        presence={gameData.mode === 'ai' ? { status: 'online' } : presenceState[gameData.player_1_username]}
                        countdown={gameData.mode === 'ai' ? undefined : countdowns[gameData.player_1_username]}
                        color="from-red-500 via-rose-500 to-red-500 dark:from-purple-300 dark:to-purple-500"
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

                <div className="flex flex-col gap-[clamp(0.5rem,1.5vw,0.75rem)]">
                    <div className="inline-flex items-center justify-center gap-[clamp(0.375rem,1vw,0.5rem)]
                        px-[clamp(0.75rem,2vw,1rem)] py-[clamp(0.375rem,1vw,0.5rem)]
                        bg-gradient-to-r from-slate-100/50 to-cyan-50/50
                        dark:from-slate-800/50 dark:to-cyan-900/50
                        rounded-[clamp(0.375rem,1vw,0.5rem)] text-[clamp(0.875rem,2.5vw,1rem)] font-medium
                        text-slate-700 dark:text-slate-300
                        border border-slate-200/50 dark:border-slate-700/50
                        shadow-sm">
                        {replayInProgress ? (
                            <span className="text-cyan-600 dark:text-cyan-400">
                                Move #{gameData.move_number}
                            </span>
                        ) : !gameData.finished_at ? (
                            <div className="flex items-center gap-2">
                                <span className="text-cyan-600 dark:text-cyan-400">
                                    Move #{gameData.move_number}
                                </span>
                                <span className="text-slate-400 dark:text-slate-500">•</span>
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                                        gameData.next_player_to_move_username === gameData.player_1_username
                                            ? 'bg-rose-500 dark:bg-violet-500'
                                            : 'bg-amber-500 dark:bg-cyan-500'
                                    }`} />
                                    <span className={`font-medium ${
                                        gameData.next_player_to_move_username === gameData.player_1_username
                                            ? 'text-rose-500 dark:text-violet-400'
                                            : 'text-amber-500 dark:text-cyan-400'
                                    }`}>
                                        {gameData.next_player_to_move_username === playerName
                                            ? "Your turn"
                                            : gameData.next_player_to_move_username === gameData.player_1_username
                                                ? `${gameData.player_1}'s turn`
                                                : `${gameData.player_2}'s turn`}
                                    </span>
                                </div>
                            </div>
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
                        <div className="flex flex-wrap items-center justify-center
                            gap-[clamp(0.5rem,1.5vw,0.75rem)]">
                            <RematchButton
                                rematchStatus={rematchStatus}
                                onRematch={handleRematch}
                                onCancelRematch={handleCancelRematch}
                            />
                            <ReplayButton onReplay={handleReplayGame} />
                        </div>
                    )}

                    {rematchStatus === 'waiting' && (
                        <div className="text-[clamp(1rem,3vw,1.25rem)] font-bold
                            bg-gradient-to-r from-cyan-500 to-purple-500
                            bg-clip-text text-transparent
                            animate-pulse">
                            Waiting for opponent to accept rematch...
                        </div>
                    )}
                </div>
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
                flex items-center gap-[clamp(0.25rem,1vw,0.5rem)]
                px-[clamp(0.5rem,2vw,1.5rem)] py-[clamp(0.25rem,1.5vw,0.75rem)]
                rounded-[clamp(0.375rem,1.5vw,0.75rem)]
                bg-gradient-to-br ${color}
                shadow-[0_clamp(0.125rem,0.5vw,0.25rem)_clamp(0.5rem,1.5vw,1rem)_rgba(0,0,0,0.1)]
                hover:shadow-[0_clamp(0.25rem,1vw,0.5rem)_clamp(0.75rem,2vw,1.5rem)_rgba(0,0,0,0.15)]
                hover:-translate-y-0.5
                backdrop-filter backdrop-blur-[clamp(2px,0.5vw,4px)]
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
