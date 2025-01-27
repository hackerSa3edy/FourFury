"use client";

import React, { useState, useCallback, useEffect, memo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BACKEND_API_BASE_URL, SOCKETIO_BASE_URL } from "@/constants";
import { FourFuryButton } from "@/components/buttons";
import { PlayerNameInput } from "@/components/input";
import { setFourFuryCookie, clearFourFuryCookie } from "@/utils/localStorageUtils";
import { ErrorBoundary } from 'react-error-boundary';
import io, { Socket } from 'socket.io-client';
import ModeButton from '@/components/mode-button';
import { handleError } from '@/utils/errorHandler';

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

interface GameError {
    status?: number;
    detail?: string;
    message?: string;
    name?: string;
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
    const [, setIsOnline] = useState(true);
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

    // Clear FourFury cookie on component mount
    useEffect(() => {
        clearFourFuryCookie();
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

    // Add passive event listeners for better performance
    useEffect(() => {
        const options = { passive: true };
        document.addEventListener('touchstart', () => {}, options);
        document.addEventListener('touchmove', () => {}, options);
        return () => {
            document.removeEventListener('touchstart', () => {});
            document.removeEventListener('touchmove', () => {});
        };
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsOnline(window.navigator.onLine);
        }
    }, []);

    const validateName = useCallback((name: string): string | undefined => {
        if (name.length < 2) return 'Name must be at least 2 characters long';
        if (name.length > 30) return 'Name must be less than 30 characters';
        if (!/^[a-zA-Z0-9\s-_]+$/.test(name)) return 'Name contains invalid characters';
        return undefined;
    }, []);

    const handleGameError = useCallback((err: unknown) => {
        const errorState = handleError(err);
        setFormState(prev => ({
            ...prev,
            error: errorState.message,
            isSubmitting: false,
            isMatchmaking: false
        }));

        // Log error for monitoring
        console.error("Game error:", {
            error: err,
            status: (err as GameError)?.status,
            detail: (err as GameError)?.detail,
            timestamp: new Date().toISOString(),
            mode,
            aiDifficulty: mode === "ai" ? aiDifficulty : undefined
        });
    }, [mode, aiDifficulty]);

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

            // Common error handler for socket events
            const handleSocketError = (message: string) => {
                handleGameError({ status: 500, detail: message });
                newSocket.disconnect();
            };

            newSocket.on('connect', () => {
                setMatchmakingState({
                    status: 'waiting',
                    message: 'Connected! Looking for opponents...'
                });
                newSocket.emit('start_matching', formState.playerUsername, formState.playerName, formState.sessionId);
            });

            newSocket.on('connect_error', (error) => {
                handleSocketError(`Failed to connect to server: ${error.message}`);
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
                    setFourFuryCookie(gameData.id, formState.playerUsername, playerNumber);

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
                handleSocketError(data.message);
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
            handleGameError({ status: 500, detail: 'Failed to initialize connection' });
        }
    }, [formState.playerUsername, formState.playerName, formState.sessionId, handleGameError, router]);

    // Add session creation function
    const createSession = useCallback(async () => {
        try {
            const response = await fetch(`${BACKEND_API_BASE_URL}/games/create_session/`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw { status: response.status, detail: 'Failed to create session' };
            }

            const data = await response.json();
            setFormState(prev => ({
                ...prev,
                playerUsername: data.username,
                sessionId: data.session_id,
            }));
        } catch (error) {
            handleGameError(error);
        }
    }, [handleGameError]);

    // Add useEffect for session creation
    useEffect(() => {
        createSession();
    }, [createSession]);

    // Add online/offline detection and session recreation
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Recreate session when connection is restored
            if (!formState.sessionId) {
                createSession();
            }
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [formState.sessionId, createSession]);

    const handleStartGame = useCallback(async () => {
        const now = Date.now();
        if (now - lastSubmissionTime < SUBMISSION_COOLDOWN) {
            handleGameError({ status: 429, detail: 'Please wait before submitting again' });
            return;
        }

        const trimmedName = formState.playerName.trim();
        const validationError = validateName(trimmedName);

        if (validationError) {
            handleGameError({ status: 400, detail: validationError });
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
                try {
                    const response = await fetch(`${BACKEND_API_BASE_URL}/games/start/`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            player_name: trimmedName,
                            mode,
                            ai_difficulty: mode === "ai" ? aiDifficulty : undefined,
                            timestamp: new Date().toISOString()
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw {
                            status: response.status,
                            detail: errorData.detail || 'Failed to start game'
                        };
                    }

                    const data = await response.json() as GameResponse;
                    setFourFuryCookie(data.id, formState.playerUsername, 1);
                    router.push(`/games/${data.id}`);
                } catch (error) {
                    handleGameError(error);
                }
            });
        } catch (error) {
            handleGameError(error);
        }
    }, [
        formState.playerName,
        formState.playerUsername,
        lastSubmissionTime,
        mode,
        aiDifficulty,
        router,
        validateName,
        initializeSocketConnection,
        handleGameError
    ]);

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
            <div className="fixed inset-0 w-full h-full
                bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50
                dark:from-gray-900 dark:via-blue-900/30 dark:to-emerald-900/30
                animate-gradient-slow">
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

                <div className="relative w-full h-full flex items-center justify-center p-3 sm:p-4 lg:p-6 overflow-auto">
                    <div className="w-full max-w-[90%] sm:max-w-[440px] lg:max-w-[480px]
                        my-auto
                        bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg
                        p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-2xl
                        transition-all duration-300 hover:shadow-blue-500/20 dark:hover:shadow-emerald-500/20
                        scale-100 hover:scale-[1.02]
                        border border-white/20 dark:border-gray-700/50
                        animate-fade-in-up">

                        {/* Optimize spacing for smaller screens */}
                        <div className="text-center space-y-1 sm:space-y-3">
                            <h1 className="text-3xl sm:text-4xl font-bold
                                bg-gradient-to-r from-emerald-600 to-blue-600
                                dark:from-emerald-400 dark:to-blue-400
                                bg-clip-text text-transparent animate-gradient">
                                Four Fury
                            </h1>
                            <h2 className="text-base sm:text-lg font-medium text-gray-800 dark:text-gray-300">
                                Start Your Adventure
                            </h2>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleStartGame();
                            }}
                            className="mt-3 sm:mt-6 space-y-2 sm:space-y-4"
                            noValidate
                        >
                            <PlayerNameInput
                                label="Your Name"
                                value={formState.playerName}
                                onChangeHandler={handleNameChange}
                                error={undefined}
                                disabled={formState.isSubmitting}
                            />

                            <div className="space-y-2 sm:space-y-4">
                                <div className="text-center relative">
                                    <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3
                                        bg-gradient-to-r from-emerald-600 to-blue-600
                                        dark:from-emerald-400 dark:to-blue-400
                                        bg-clip-text text-transparent">
                                        Choose Your Battle
                                    </h3>
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-blue-600/10
                                            dark:from-emerald-400/5 dark:to-blue-400/5 rounded-lg transform -skew-y-1"></div>
                                        <p className="text-sm text-gray-800 dark:text-gray-400
                                            py-1.5 sm:py-2 px-3 sm:px-4 relative z-10">
                                            Select your preferred way to play
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-center gap-1 xs:gap-2 sm:gap-3 md:gap-4 flex-wrap sm:flex-nowrap">
                                    {["human", "online", "ai"].map((gameMode) => (
                                        <ModeButton
                                            key={gameMode}
                                            mode={gameMode}
                                            currentMode={mode}
                                            onClick={setMode}
                                        />
                                    ))}
                                </div>

                                {mode === "ai" && (
                                    <div className="bg-gray-100 dark:bg-gray-700 p-3 sm:p-4 rounded-lg">
                                        <label className="block text-center mb-2 sm:mb-3">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                AI Difficulty
                                            </span>
                                        </label>
                                        <div className="flex justify-center gap-1.5 sm:gap-2">
                                            {[1, 2, 3, 4, 5].map((level) => (
                                                <button
                                                    key={level}
                                                    type="button"
                                                    onClick={() => setAiDifficulty(level)}
                                                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all duration-300
                                                        ${aiDifficulty === level
                                                            ? "bg-gradient-to-r from-emerald-600 to-blue-600 text-white transform scale-110"
                                                            : "bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200"
                                                        }`}
                                                >
                                                    {level}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="text-center mt-2 text-xs sm:text-sm text-gray-800 dark:text-gray-300">
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
            </div>
            {renderMatchmakingOverlay()}
        </ErrorBoundary>
    );
});

StartGame.displayName = 'StartGame';
export default StartGame;
