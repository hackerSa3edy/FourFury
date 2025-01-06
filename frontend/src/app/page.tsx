"use client";

import { BACKEND_API_BASE_URL } from "@/constants";
import { FourFuryButton } from "@/components/buttons";
import { PlayerNameInput } from "@/components/input";
import { useRouter } from "next/navigation"
import { memo, useCallback, useState, useTransition, useEffect } from 'react';
import { setPlayerNameInLocalStorage  } from "@/utils/localStorageUtils";
import { ErrorBoundary } from 'react-error-boundary';

interface GameResponse {
    id: string;
    player_1: string;
}

interface FormState {
    playerName: string;
    error: string | undefined;
    isSubmitting: boolean;
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

const SUBMISSION_COOLDOWN = 2000; // 2 seconds cooldown

const StartGame = memo(function StartGame() {
    const router = useRouter();
    const [formState, setFormState] = useState<FormState>({
        playerName: "",
        error: undefined,
        isSubmitting: false
    });
    const [isPending, startTransition] = useTransition();
    const [lastSubmissionTime, setLastSubmissionTime] = useState<number>(0);

    // Cleanup session storage on component mount
    useEffect(() => {
        sessionStorage.removeItem('gameId');
        sessionStorage.removeItem('playerName');
        sessionStorage.removeItem('playerNumber');
    }, []);

    const validateName = (name: string): string | undefined => {
        if (name.length < 2) return 'Name must be at least 2 characters long';
        if (name.length > 30) return 'Name must be less than 30 characters';
        if (!/^[a-zA-Z0-9\s-_]+$/.test(name)) return 'Name contains invalid characters';
        return undefined;
    };

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

        try {
            startTransition(async () => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

                try {
                    const response = await fetch(`${BACKEND_API_BASE_URL}/games/start/`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify({
                            player_name: trimmedName,
                            timestamp: new Date().toISOString()
                        }),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => null);
                        throw new Error(errorData?.message || 'Failed to start game');
                    }

                    const data = (await response.json()) as GameResponse;

                    // Store game session data in local storage
                    setPlayerNameInLocalStorage(data.id, trimmedName, 1);

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
    }, [formState.playerName, router, lastSubmissionTime]);

    const handleNameChange = useCallback((value: string) => {
        setFormState(prev => ({
            ...prev,
            playerName: value,
            error: undefined
        }));
    }, []);

    return (
        <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => {
                window.location.reload();
                sessionStorage.clear();
            }}
        >
            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="max-w-md mx-auto space-y-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl transform transition-all duration-500 hover:scale-[1.02]">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent animate-gradient">
                            Four Fury
                        </h1>
                        <h2 className="mt-2 text-xl font-medium text-gray-600 dark:text-gray-300">
                            Start Your Adventure
                        </h2>
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleStartGame();
                        }}
                        className="mt-8 space-y-6"
                        noValidate
                    >
                        <PlayerNameInput
                            label="Your Name"
                            value={formState.playerName}
                            onChangeHandler={handleNameChange}
                            error={formState.error}
                            disabled={formState.isSubmitting}
                            maxLength={30}
                            minLength={2}
                            placeholder="Enter your game name"
                        />
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
