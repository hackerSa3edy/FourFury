"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { BACKEND_API_BASE_URL } from "@/constants";
import { FourFuryButton } from "@/components/buttons";
import { PlayerNameInput } from "@/components/input";
import { setFourFuryCookie } from "@/utils/localStorageUtils";
import { GameData } from "@/app/games/[id]/page";
import { ErrorState } from "@/types/error";
import { handleError } from "@/utils/errorHandler";
import {
    ErrorMessage,
    LoadingSpinner,
    ConnectionErrorMessage,
    GameNotFoundError
} from "@/components/errors";

interface SessionData {
    username: string;
    session_id: string;
}

interface GameState {
    gameData: GameData | null;
    isLoading: boolean;
    isJoining: boolean;
    error: ErrorState | null;
}

export default function JoinGame() {
    const { id } = useParams();
    const router = useRouter();
    const [playerName, setPlayerName] = useState("");
    const [session, setSession] = useState<SessionData | null>(null);
    const [, setIsOnline] = useState(true);
    const [gameState, setGameState] = useState<GameState>({
        gameData: null,
        isLoading: true,
        isJoining: false,
        error: null
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsOnline(window.navigator.onLine);
        }
    }, []);

    useEffect(() => {
        if (gameState.error?.type === 'popup' && gameState.error.duration) {
            const timeout = setTimeout(() => {
                setGameState(prev => ({ ...prev, error: null }));
            }, gameState.error.duration);

            return () => clearTimeout(timeout);
        }
    }, [gameState.error]);

    const validateName = useCallback((name: string): string | undefined => {
        if (name.length < 2) return 'Name must be at least 2 characters long';
        if (name.length > 30) return 'Name must be less than 30 characters';
        if (!/^[a-zA-Z0-9\s-_]+$/.test(name)) return 'Name contains invalid characters';
        return undefined;
    }, []);

    const createSession = useCallback(async () => {
        const response = await fetch(`${BACKEND_API_BASE_URL}/games/create_session/`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to create session');
        return response.json();
    }, []);

    const fetchGameData = useCallback(async (sessionUsername: string) => {
        try {
            const response = await fetch(`${BACKEND_API_BASE_URL}/games/${id}/`);
            if (!response.ok) {
                const errorData = await response.json();
                switch (response.status) {
                    case 401:
                        throw new Error('Session expired. Please refresh the page.');
                    case 403:
                        throw new Error('You are not authorized to view this game.');
                    case 404:
                        throw new Error('Game not found.');
                    case 502:
                        throw new Error('Server is temporarily unavailable. Please try again later.');
                    default:
                        throw new Error(errorData.detail || 'Failed to fetch game data');
                }
            }
            const data = await response.json();

            if (data.player_1_username === sessionUsername || data.player_2_username) {
                router.replace(`/games/${id}`);
                return null;
            }

            return data;
        } catch (error) {
            throw error;
        }
    }, [id, router]);

    const initialize = useCallback(async () => {
        try {
            const sessionData = await createSession();
            setSession(sessionData);
            const gameData = await fetchGameData(sessionData.username);
            if (gameData) {
                setGameState(prev => ({ ...prev, gameData }));
            }
        } catch (error) {
            const errorState = handleError(error);
            setGameState(prev => ({
                ...prev,
                error: errorState
            }));
        } finally {
            setGameState(prev => ({ ...prev, isLoading: false }));
        }
    }, [createSession, fetchGameData]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Recreate session when connection is restored
            if (!session) {
                initialize();
            }
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [session, initialize]);

    useEffect(() => {
        initialize();
    }, [initialize]);

    const handleJoinGame = async () => {
        if (gameState.isJoining || !session) return;

        const trimmedName = playerName.trim();
        const validationError = validateName(trimmedName);

        if (validationError) {
            setGameState(prev => ({
                ...prev,
                error: {
                    message: validationError,
                    type: 'popup',
                    duration: 3000
                }
            }));
            return;
        }

        setGameState(prev => ({ ...prev, isJoining: true, error: null }));

        try {
            const response = await fetch(`${BACKEND_API_BASE_URL}/games/${id}/join/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                credentials: 'include',
                body: JSON.stringify({ player_name: trimmedName })
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    throw { status: response.status, detail: 'Invalid server response' };
                }
                throw { status: response.status, detail: errorData.detail };
            }

            const data = await response.json();
            setFourFuryCookie(data.id, session.username, 2);
            router.push(`/games/${data.id}`);
        } catch (err) {
            const errorState = handleError(err);
            setGameState(prev => ({
                ...prev,
                error: errorState
            }));
        } finally {
            setGameState(prev => ({ ...prev, isJoining: false }));
        }
    };

    if (gameState.isLoading) return <LoadingSpinner />;

    if (gameState.error?.type === 'fatal') {
        if (gameState.error.message.includes('Game not found')) {
            return <GameNotFoundError />;
        }
        return <ConnectionErrorMessage message={gameState.error.message} />;
    }

    return (
        <>
            {gameState.error?.type === 'popup' && <ErrorMessage message={gameState.error.message} />}
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
                    <div className="w-full max-w-[90%] sm:max-w-[440px] lg:max-w-[480px] my-auto bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-2xl transition-all duration-300 hover:shadow-blue-500/20 dark:hover:shadow-emerald-500/20 border border-white/20 dark:border-gray-700/50">
                        <div className="text-center space-y-1 sm:space-y-3">
                            <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-red-600 via-blue-600 to-emerald-600 dark:from-red-400 dark:via-blue-400 dark:to-emerald-400 bg-clip-text text-transparent animate-gradient-fast pb-2">
                                BATTLE TIME!
                            </h1>
                            <div className="space-y-3">
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 animate-pulse">
                                    {gameState.gameData?.player_1}
                                </h2>
                                <div className="space-y-2">
                                    <p className="text-lg font-semibold text-gray-600 dark:text-gray-400 leading-tight">
                                        is calling you out for an epic showdown.
                                    </p>
                                    <p className="text-base text-gray-500 dark:text-gray-400">
                                        Ready to prove your skill?
                                    </p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            handleJoinGame();
                        }} className="mt-6 space-y-4" noValidate>
                            <PlayerNameInput
                                label="Your Name"
                                value={playerName}
                                onChangeHandler={setPlayerName}
                                error={undefined}
                                disabled={gameState.isJoining}
                                autoFocus={true}
                            />

                            <FourFuryButton
                                type="submit"
                                label={gameState.isJoining ? "Joining Game..." : "Join Game"}
                                onClickHandler={handleJoinGame}
                                disabled={gameState.isJoining || !playerName.trim()}
                            />
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
