"use client";

import React, { useState, useCallback, useEffect, memo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BACKEND_API_BASE_URL, SOCKETIO_BASE_URL } from "@/constants";
import { FourFuryButton } from "@/components/buttons";
import { PlayerNameInput } from "@/components/input";
import { setPlayerNameInLocalStorage } from "@/utils/localStorageUtils";
import { ErrorBoundary } from 'react-error-boundary';
import io, { Socket } from 'socket.io-client';

interface GameResponse {
    id: string;
    player_1: string;
}

interface FormState {
    playerName: string;
    playerUsername: string;
    sessionId: string | null;
    error: string | undefined;
    isSubmitting: boolean;
    isMatchmaking: boolean;
}

interface ErrorFallbackProps {
    error: Error;
    resetErrorBoundary: () => void;
}

const ErrorFallback = ({ error, resetErrorBoundary }: ErrorFallbackProps) => {
    return (
        <div className="text-center p-4">
            <h2 className="text-red-600 text-xl">Something went wrong:</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">{error.message}</p>
            <button
                onClick={resetErrorBoundary}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Try again
            </button>
        </div>
    );
};

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

const SUBMISSION_COOLDOWN = 2000; // 2 seconds cooldown

interface MatchmakingState {
    status: 'idle' | 'connecting' | 'waiting' | 'matched' | 'error';
    message: string;
}

const StartGame = memo(function StartGame() {
    const router = useRouter();
    const [formState, setFormState] = useState<FormState>({
        playerName: "",
        playerUsername: "",
        sessionId: null,
        error: undefined,
        isSubmitting: false,
        isMatchmaking: false
    });
    const [, startTransition] = useTransition(); // Remove isPending
    const [lastSubmissionTime, setLastSubmissionTime] = useState<number>(0);
    const [mode, setMode] = useState<"human"|"ai"|"online">("human");
    const [aiDifficulty, setAiDifficulty] = useState(3);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [matchmakingState, setMatchmakingState] = useState<MatchmakingState>({
        status: 'idle',
        message: ''
    });

    // Cleanup session storage on component mount
    useEffect(() => {
        localStorage.clear();
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (socket) {
                socket.off('connect');
                socket.off('connect_error');
                socket.off('matching_status');
                socket.off('match_found');
                socket.off('matching_error');
                socket.off('matching_cancelled');
                socket.disconnect();
            }
        };
    }, [socket]);

    const validateName = useCallback((name: string): string | undefined => {
        if (name.length < 2) return 'Name must be at least 2 characters long';
        if (name.length > 30) return 'Name must be less than 30 characters';
        if (!/^[a-zA-Z0-9\s-_]+$/.test(name)) return 'Name contains invalid characters';
        return undefined;
    }, []);

    const initializeSocketConnection = useCallback(() => {
        try {
            setMatchmakingState({
                status: 'connecting',
                message: 'Connecting to server...'
            });

            const newSocket = io(SOCKETIO_BASE_URL, {
                transports: ['websocket'],
                autoConnect: true,
                reconnection: true,
                reconnectionAttempts: 3,
                timeout: 10000
            });

            newSocket.on('connect', () => {
                setMatchmakingState({
                    status: 'waiting',
                    message: 'Connected! Looking for opponents...'
                });
                newSocket.emit('start_matching', formState.playerUsername, formState.playerName, formState.sessionId);
            });

            newSocket.on('connect_error', (error) => {
                setMatchmakingState({
                    status: 'error',
                    message: `Failed to connect to server${error.message ? error.message : ""}`
                });
                setFormState(prev => ({
                    ...prev,
                    error: 'Connection failed. Please try again.',
                    isMatchmaking: false
                }));
                newSocket.disconnect();
            });

            newSocket.on('matching_status', (data) => {
                setMatchmakingState({
                    status: 'waiting',
                    message: data.message
                });
            });

            newSocket.on('match_found', (data) => {
                setMatchmakingState({
                    status: 'matched',
                    message: 'Match found! Starting game...'
                });

                try {
                    const gameData = JSON.parse(data.game);
                    const playerNumber = gameData.player_1_username === formState.playerUsername ? 1 : 2;
                    setPlayerNameInLocalStorage(gameData.id, formState.playerUsername, playerNumber);

                    // Short delay to show the "match found" message
                    setTimeout(() => {
                        router.push(`/games/${gameData.id}`);
                    }, 1000);
                } catch {
                    setMatchmakingState({
                        status: 'error',
                        message: 'Error starting game'
                    });
                }
            });

            newSocket.on('matching_error', (data) => {
                setMatchmakingState({
                    status: 'error',
                    message: data.message
                });
                setFormState(prev => ({
                    ...prev,
                    error: data.message,
                    isMatchmaking: false
                }));
                newSocket.disconnect();
            });

            newSocket.on('matching_cancelled', () => {
                setMatchmakingState({
                    status: 'idle',
                    message: ''
                });
                setFormState(prev => ({
                    ...prev,
                    isMatchmaking: false
                }));
            });

            setSocket(newSocket);
        } catch {
            setMatchmakingState({
                status: 'error',
                message: 'Failed to initialize connection'
            });
            setFormState(prev => ({
                ...prev,
                error: 'Failed to connect to matchmaking server',
                isMatchmaking: false
            }));
        }
    }, [formState.playerUsername, router, formState.playerName, formState.sessionId]);

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
            setFormState(prev => ({
                ...prev,
                playerUsername: data.username,
                sessionId: data.session_id,
            }));
        } catch (error) {
            console.error('Session creation error:', error);
            setFormState(prev => ({
                ...prev,
                error: 'Failed to create session'
            }));
        }
    }, []);

    // Add useEffect for session creation
    useEffect(() => {
        createSession();
    }, [createSession]);

    const handleStartGame = useCallback(async () => {
        const now = Date.now();
        if (now - lastSubmissionTime < SUBMISSION_COOLDOWN) {
            setFormState(prev => ({
                ...prev,
                error: 'Please wait before submitting again'
            }));
            return;
        }

        const trimmedName = formState.playerName.trim();
        const validationError = validateName(trimmedName);

        if (validationError) {
            setFormState(prev => ({
                ...prev,
                error: validationError
            }));
            return;
        }

        setFormState(prev => ({
            ...prev,
            isSubmitting: true,
            error: undefined
        }));
        setLastSubmissionTime(now);

        if (mode === "online") {
            setFormState(prev => ({
                ...prev,
                isMatchmaking: true,
                error: undefined
            }));
            initializeSocketConnection();
            return;
        }

        try {
            startTransition(async () => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

                try {
                    const response = await fetch(`${BACKEND_API_BASE_URL}/games/start/`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                            // Add SameSite attribute handling
                            // "Cookie": document.cookie // Explicitly include cookies
                        },
                        credentials: 'include', // This is correct but needs server-side CORS support
                        body: JSON.stringify({
                            player_name: trimmedName,
                            mode,
                            ai_difficulty: mode === "ai" ? aiDifficulty : undefined,
                            timestamp: new Date().toISOString()
                        }),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => null);
                        if (response.status === 401) {
                            setFormState(prev => ({
                                ...prev,
                                error: 'Please log in to continue. Your session may have expired.',
                                isSubmitting: false
                            }));
                            return;
                        }
                        throw new Error(errorData?.message || 'Failed to start game');
                    }

                    const data = (await response.json()) as GameResponse;

                    // Store game session data in local storage
                    setPlayerNameInLocalStorage(data.id, formState.playerUsername, 1);

                    router.push(`/games/${data.id}`);
                } catch (error) {
                    if (error instanceof Error) {
                        if (error.name === 'AbortError') {
                            throw new Error('Request timed out. Please try again.');
                        }
                        throw error;
                    }
                    throw new Error('An unexpected error occurred');
                }
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
            setFormState(prev => ({
                ...prev,
                error: errorMessage
            }));
            console.error("Game start error:", { error: err, timestamp: new Date().toISOString() });
        } finally {
            setFormState(prev => ({
                ...prev,
                isSubmitting: false
            }));
        }
    }, [formState.playerName, formState.playerUsername, router, lastSubmissionTime, mode, aiDifficulty, initializeSocketConnection, validateName]);

    const handleCancelMatchmaking = useCallback(() => {
        if (socket) {
            socket.emit('cancel_matching');
            socket.disconnect();
            setSocket(null);
            setMatchmakingState({
                status: 'idle',
                message: ''
            });
            setFormState(prev => ({
                ...prev,
                isMatchmaking: false,
                isSubmitting: false,
                error: undefined
            }));
        }
    }, [socket]);

    const handleNameChange = useCallback((value: string) => {
        setFormState(prev => ({
            ...prev,
            playerName: value,  // Changed from playerUsername to playerName
            error: undefined
        }));
    }, []);

    const renderMatchmakingOverlay = () => {
        if (!formState.isMatchmaking) return null;

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                    <div className="text-center">
                        <h3 className="text-xl font-bold mb-4">
                            {matchmakingState.status === 'matched' ? '🎮 Match Found!' : '🔍 Finding Opponent...'}
                        </h3>
                        <div className="mb-4">
                            {matchmakingState.status === 'connecting' && (
                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            )}
                            {matchmakingState.status === 'waiting' && (
                                <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            )}
                            <p className={`${
                                matchmakingState.status === 'error' ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'
                            }`}>
                                {matchmakingState.message}
                            </p>
                        </div>
                        {matchmakingState.status !== 'matched' && (
                            <button
                                onClick={handleCancelMatchmaking}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => {
                window.location.reload();
                sessionStorage.clear();
            }}
        >
            {formState.error && <ErrorMessage message={formState.error} />}
            <div className="w-full min-h-screen px-4 py-8 sm:px-6 md:px-8 lg:px-12
                flex items-center justify-center">
                <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto
                    bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg
                    p-4 sm:p-6 md:p-8 lg:p-10 rounded-2xl shadow-2xl
                    transition-all duration-300 hover:shadow-3xl
                    transform hover:-translate-y-1">
                    <div className="text-center space-y-2 sm:space-y-3 md:space-y-4">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold
                            bg-gradient-to-r from-emerald-600 to-blue-600
                            dark:from-emerald-400 dark:to-blue-400
                            bg-clip-text text-transparent animate-gradient
                            tracking-tight">
                            Four Fury
                        </h1>
                        <h2 className="text-base sm:text-lg md:text-xl font-medium
                            text-gray-600 dark:text-gray-300">
                            Start Your Adventure
                        </h2>
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleStartGame();
                        }}
                        className="mt-4 sm:mt-6 md:mt-8 space-y-3 sm:space-y-4 md:space-y-6"
                        noValidate
                    >
                        <PlayerNameInput
                            label="Your Name"
                            value={formState.playerName}
                            onChangeHandler={handleNameChange}
                            error={undefined}  // Remove error prop here since we're showing it in ErrorMessage
                            disabled={formState.isSubmitting}
                        />

                        <div className="space-y-4">
                            <div className="text-center relative">
                                <h3 className="text-lg sm:text-xl font-semibold mb-3
                                    bg-gradient-to-r from-emerald-600 to-blue-600
                                    dark:from-emerald-400 dark:to-blue-400
                                    bg-clip-text text-transparent">
                                    Choose Your Battle
                                </h3>
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-blue-600/10
                                        dark:from-emerald-400/5 dark:to-blue-400/5 rounded-lg transform -skew-y-1"></div>
                                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400
                                        py-2 px-4 relative z-10 leading-relaxed">
                                        Select your preferred way to play
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setMode("human")}
                                    className={`px-6 py-3 rounded-lg transition-all duration-300 relative group
                                        ${mode === "human"
                                            ? "bg-gradient-to-r from-emerald-600 to-blue-600 text-white transform scale-105"
                                            : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                                        }`}
                                >
                                    <div className="flex flex-col items-center">
                                        <span className="text-xl mb-1">👥</span>
                                        <span className="font-medium">Local</span>
                                    </div>
                                    <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 w-max
                                        pointer-events-none">
                                        <div className="bg-gray-800 dark:bg-gray-900 text-white px-3 py-1 rounded-md
                                            text-xs sm:text-sm opacity-0 group-hover:opacity-100 transition-all duration-300
                                            shadow-lg">
                                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2
                                                border-4 border-transparent border-b-gray-800 dark:border-b-gray-900"></div>
                                            Local Multiplayer Battle 🤝
                                        </div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode("online")}
                                    className={`px-6 py-3 rounded-lg transition-all duration-300 relative group
                                        ${mode === "online"
                                            ? "bg-gradient-to-r from-emerald-600 to-blue-600 text-white transform scale-105"
                                            : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                                        }`}
                                >
                                    <div className="flex flex-col items-center">
                                        <span className="text-xl mb-1">🌐</span>
                                        <span className="font-medium">Online</span>
                                    </div>
                                    <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 w-max
                                        pointer-events-none">
                                        <div className="bg-gray-800 dark:bg-gray-900 text-white px-3 py-1 rounded-md
                                            text-xs sm:text-sm opacity-0 group-hover:opacity-100 transition-all duration-300
                                            shadow-lg">
                                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2
                                                border-4 border-transparent border-b-gray-800 dark:border-b-gray-900"></div>
                                            Play Online with Friends 🌍
                                        </div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode("ai")}
                                    className={`px-6 py-3 rounded-lg transition-all duration-300 relative group
                                        ${mode === "ai"
                                            ? "bg-gradient-to-r from-emerald-600 to-blue-600 text-white transform scale-105"
                                            : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                                        }`}
                                >
                                    <div className="flex flex-col items-center">
                                        <span className="text-xl mb-1">🤖</span>
                                        <span className="font-medium">AI</span>
                                    </div>
                                    <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 w-max
                                        pointer-events-none">
                                        <div className="bg-gray-800 dark:bg-gray-900 text-white px-3 py-1 rounded-md
                                            text-xs sm:text-sm opacity-0 group-hover:opacity-100 transition-all duration-300
                                            shadow-lg">
                                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2
                                                border-4 border-transparent border-b-gray-800 dark:border-b-gray-900"></div>
                                            Test Your Skills vs AI 🎯
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {mode === "ai" && (
                                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                                    <label className="block text-center mb-3">
                                        <span className="text-sm font-medium">AI Difficulty</span>
                                    </label>
                                    <div className="flex justify-center gap-2">
                                        {[1, 2, 3, 4, 5].map((level) => (
                                            <button
                                                key={level}
                                                type="button"
                                                onClick={() => setAiDifficulty(level)}
                                                className={`w-10 h-10 rounded-full transition-all duration-300
                                                    ${aiDifficulty === level
                                                        ? "bg-gradient-to-r from-emerald-600 to-blue-600 text-white transform scale-110"
                                                        : "bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500"
                                                    }`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="text-center mt-2 text-sm text-gray-600 dark:text-gray-300">
                                        {aiDifficulty === 1 && "Beginner"}
                                        {aiDifficulty === 2 && "Easy"}
                                        {aiDifficulty === 3 && "Medium"}
                                        {aiDifficulty === 4 && "Hard"}
                                        {aiDifficulty === 5 && "Expert"}
                                    </div>
                                </div>
                            )}
                        </div>

                        {renderMatchmakingOverlay()}

                        <FourFuryButton
                            type="submit"
                            label={formState.isSubmitting ? "Starting Game..." : "Start Game"}
                            onClickHandler={handleStartGame}
                            disabled={formState.isSubmitting || !formState.playerName.trim()}
                        />
                    </form>
                </div>
            </div>
        </ErrorBoundary>
    );
});

StartGame.displayName = 'StartGame';
export default StartGame;
