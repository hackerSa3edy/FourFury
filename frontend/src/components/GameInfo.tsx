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
}

interface PlayerPresence {
    status: 'online' | 'offline';
    countdown?: number;
}

interface PresenceState {
    [username: string]: PlayerPresence;
}

// Add new particle effect component
const ParticleBackground = () => (
    <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-2 h-2 rounded-full bg-cyan-400/20 dark:bg-cyan-600/20 animate-float-1"></div>
        <div className="absolute w-2 h-2 rounded-full bg-purple-400/20 dark:bg-purple-600/20 animate-float-2"></div>
        <div className="absolute w-2 h-2 rounded-full bg-pink-400/20 dark:bg-pink-600/20 animate-float-3"></div>
    </div>
);

export const GameInfo = React.memo(({
    gameData,
    handleReplayGame,
    handleRematch,
    handleCancelRematch,
    rematchStatus,
    presenceState,
    countdowns
}: GameInfoProps) => {
    const humanFinishedAt = gameData.finished_at ? new Date(gameData.finished_at).toLocaleString() : null;

    return (
        <div className="relative rounded-xl p-6 bg-gradient-to-br from-white/95 to-cyan-50/95 dark:from-slate-800/95 dark:to-cyan-900/95 shadow-xl border border-cyan-200 dark:border-cyan-800 backdrop-blur-sm transform hover:scale-[1.01] transition-all duration-300">
            <ParticleBackground />

            <div className="text-center space-y-3 relative z-10">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-purple-600 dark:from-cyan-400 dark:to-purple-400 bg-clip-text text-transparent animate-gradient-x">
                    Connect4 BATTLE
                </h1>

                {gameData.mode !== 'ai' ? (
                    <div className="flex justify-center items-center gap-4 py-3">
                        <PlayerStatus
                            name={gameData.player_1}
                            presence={presenceState[gameData.player_1_username]}
                            countdown={countdowns[gameData.player_1_username]}
                            color="from-red-500 to-rose-500 dark:from-purple-400 dark:to-pink-400"
                        />
                        <div className="flex flex-col items-center">
                            <span className="text-xl font-bold bg-gradient-to-br from-cyan-500 to-purple-500 bg-clip-text text-transparent">VS</span>
                            <div className="w-4 h-4 animate-ping-slow opacity-50 bg-gradient-to-br from-cyan-400 to-purple-400 rounded-full"></div>
                        </div>
                        {gameData.player_2_username && (
                            <PlayerStatus
                                name={gameData.player_2 || ''}
                                presence={presenceState[gameData.player_2_username]}
                                countdown={countdowns[gameData.player_2_username]}
                                color="from-yellow-500 to-amber-500 dark:from-blue-400 dark:to-cyan-400"
                            />
                        )}
                    </div>
                ) : (
                    <div className="text-xl">
                        <span className="text-red-500 dark:text-purple-500">{gameData.player_1}</span>
                        <span className="text-slate-700 dark:text-slate-300"> vs </span>
                        <span className="text-yellow-500 dark:text-blue-500">{gameData.player_2}</span>
                    </div>
                )}

                <div className="space-y-2 backdrop-blur-sm bg-white/30 dark:bg-black/30 rounded-lg p-3">
                    <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                        Move #{gameData.move_number}
                    </p>
                    {humanFinishedAt && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Finished: {humanFinishedAt}
                        </p>
                    )}
                </div>

                {humanFinishedAt && (
                    <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-200/30 to-transparent dark:via-cyan-700/30 animate-pulse-slow rounded-lg"></div>
                        <RematchButton
                            rematchStatus={rematchStatus}
                            onRematch={handleRematch}
                            onCancelRematch={handleCancelRematch}
                        />
                        <ReplayButton onReplay={handleReplayGame} />
                    </div>
                )}

                {rematchStatus === 'waiting' && (
                    <div className="mt-4 text-transparent bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text animate-pulse font-bold">
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
        <div className="relative group perspective-1000">
            <div className={`
                transform transition-all duration-300
                ${isOnline ? 'rotate-y-0' : 'rotate-y-180'}
                flex items-center gap-3 px-6 py-3 rounded-xl
                bg-gradient-to-br ${color}
                shadow-lg hover:shadow-xl
            `}>
                <div className={`
                    w-3 h-3 relative rounded-full
                    ${isOnline ? 'bg-green-300' : 'bg-red-300'}
                    shadow-inner
                `}>
                    {isOnline && (
                        <span className="absolute inset-0 rounded-full animate-ping-slow bg-green-400 opacity-75"/>
                    )}
                </div>

                <span className="text-xl font-bold text-white">
                    {name}
                </span>

                {countdown !== undefined && countdown > 0 && (
                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center animate-bounce shadow-lg">
                        <span className="text-sm font-bold text-white">
                            {countdown}
                        </span>
                    </div>
                )}
            </div>

            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out">
                <div className={`
                    px-3 py-2 text-sm rounded-lg whitespace-nowrap
                    ${isOnline ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}
                    text-white shadow-lg
                `}>
                    {isOnline ? '🟢 Online' : countdown ? `⚠️ Disconnected (${countdown}s)` : '🔴 Offline'}
                </div>
            </div>
        </div>
    );
}

GameInfo.displayName = 'GameInfo';
