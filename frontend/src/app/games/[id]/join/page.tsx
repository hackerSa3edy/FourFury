"use client";

import { BACKEND_API_BASE_URL } from "@/constants";
import { FourFuryButton } from "@/components/buttons";
import { PlayerNameInput } from "@/components/input";
import { useRouter, useParams } from "next/navigation";
import { GameData } from "@/app/games/[id]/page";
import { useEffect, useState, useCallback } from "react";

import {
    setFourFuryCookie,
} from "@/utils/localStorageUtils";

interface ErrorResponse {
    message: string;
    status?: number;
}

const ErrorMessage = ({ message }: { message: string }) => (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50
        bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4
        border-l-4 border-red-500 animate-slideDown">
        <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <div className="flex-1 md:flex md:justify-between">
                <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>
            </div>
        </div>
    </div>
);

export default function JoinGame() {
    const { id } = useParams();
    const router = useRouter();
    const [playerName, setPlayerName] = useState("");
    const [playerUsername, setPlayerUsername] = useState("");
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [gameData, setGameData] = useState<GameData | null>(null);

    const validateName = (name: string): string | undefined => {
        if (name.length < 2) return 'Name must be at least 2 characters long';
        if (name.length > 30) return 'Name must be less than 30 characters';
        if (!/^[a-zA-Z0-9\s-_]+$/.test(name)) return 'Name contains invalid characters';
        return undefined;
    };

    // Add session creation function
    const createSession = useCallback(async () => {
        try {
            const response = await fetch(`${BACKEND_API_BASE_URL}/games/create_session/`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to create session');
            }

            const data = await response.json();
            setPlayerUsername(data.username);
            setSessionId(data.session_id);
        } catch (error) {
            console.error('Session creation error:', error);
            setError('Failed to create session');
        }
    }, []);

    // Add useEffect for session creation and game data fetching
    useEffect(() => {
        async function initialize() {
            try {
                await createSession();
                const response = await fetch(`${BACKEND_API_BASE_URL}/games/${id}/`);
                if (!response.ok) {
                    throw new Error('Failed to fetch game data');
                }
                const data = await response.json();

                if (data.player_2) {
                    router.replace(`/games/${id}`);
                    return;
                }

                setGameData(data);
            } catch (err) {
                setError('Failed to load game data. Please try again.');
                console.error("Error during initialization:", err);
            } finally {
                setIsLoading(false);
            }
        }

        initialize();
    }, [id, router, createSession]);

    // Modify handleJoinGame to include session information
    async function handleJoinGame() {
        if (isJoining || !sessionId) return;

        const trimmedName = playerName.trim();
        const validationError = validateName(trimmedName);

        if (validationError) {
            setError(validationError);
            return;
        }

        setIsJoining(true);
        setError(null);

        try {
            console.log('playerName:', playerName);
            const response = await fetch(`${BACKEND_API_BASE_URL}/games/${id}/join/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                credentials: 'include',
                body: JSON.stringify({
                    player_name: trimmedName,
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch((): ErrorResponse | null => null);
                throw new Error(errorData?.message || 'Failed to join game');
            }

            const data = await response.json();
            setFourFuryCookie(data.id, playerUsername, 2);
            router.push(`/games/${data.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to join game');
            console.error("Error joining game:", err);
        } finally {
            setIsJoining(false);
        }
    }

    if (isLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50/90 to-blue-200/90 dark:from-gray-900/90 dark:to-blue-900/90 backdrop-blur-sm">
                <div className="relative p-6 sm:p-8 rounded-2xl bg-white/80 dark:bg-slate-800/80 shadow-xl transform hover:scale-105 transition-all duration-300">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-500 dark:border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <div className="text-base sm:text-lg font-medium text-slate-600 dark:text-slate-300 animate-pulse">
                        Loading...
                    </div>
                </div>
            </div>
        );
    }

    if (!gameData) {
        return (
            <div className="flex flex-1 min-h-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="p-8 rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-xl border border-red-100 dark:border-red-900">
                    <div className="text-red-500 dark:text-red-400 font-medium">Game not found</div>
                </div>
            </div>
        );
    }

    return (
        <>
            {error && <ErrorMessage message={error} />}
            <div className="
                fixed inset-0
                flex items-center justify-center
                p-4 sm:p-6 md:p-8
                bg-gradient-to-br from-cyan-50/90 to-cyan-100/90 dark:from-gray-900/90 dark:to-cyan-900/90
                backdrop-blur-sm
            ">
                <div className="
                    w-full max-w-lg
                    p-6 sm:p-8 md:p-10
                    rounded-2xl
                    bg-white/80 dark:bg-gray-800/80
                    shadow-xl
                    transform transition-all duration-500
                    hover:scale-[1.02]
                    border border-cyan-100/50 dark:border-cyan-900/50
                ">
                    <div className="text-center space-y-6">
                        <h2 className="
                            text-3xl sm:text-4xl font-bold
                            bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400
                            bg-clip-text text-transparent
                            animate-gradient
                        ">
                            Join Game
                        </h2>
                        <div className="space-y-3">
                            <h6 className="text-base sm:text-lg text-gray-700 dark:text-gray-200">
                                <span className="font-semibold text-cyan-600 dark:text-blue-400">
                                    {gameData.player_1}{" "}
                                </span>
                                challenged your skills in Connect4
                            </h6>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Enter your name below to begin the battle
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 space-y-6">
                        <PlayerNameInput
                            label="Your name"
                            value={playerName}
                            onChangeHandler={setPlayerName}
                            error={undefined}
                            disabled={isJoining}
                            autoFocus={true}
                        />
                        <div className="pt-2">
                            <FourFuryButton
                                label={isJoining ? "Joining..." : "Join Game"}
                                onClickHandler={() => handleJoinGame()}
                                disabled={isJoining || !playerName.trim()}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
