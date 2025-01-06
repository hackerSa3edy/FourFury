"use client";

import { BACKEND_API_BASE_URL } from "@/constants";
import { FourFuryButton } from "@/components/buttons";
import { PlayerNameInput } from "@/components/input";
import { useRouter, useParams } from "next/navigation";
import { GameData } from "@/app/games/[id]/page";
import { useEffect, useState } from "react";

import {
    getPlayerNameFromLocalStorage,
    setPlayerNameInLocalStorage,
} from "@/utils/localStorageUtils";

export default function JoinGame() {
    const { id } = useParams();
    const router = useRouter();
    const [playerName, setPlayerName] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [gameData, setGameData] = useState<GameData | null>(null);

    useEffect(() => {
        async function fetchGameData() {
            try {
                const response = await fetch(`${BACKEND_API_BASE_URL}/games/${id}/`);
                if (!response.ok) {
                    throw new Error('Failed to fetch game data');
                }
                const data = await response.json();
                const storedPlayerName = getPlayerNameFromLocalStorage(data.id);

                // Redirect if game is already joined
                if (data.player_2 || storedPlayerName) {
                    router.replace(`/games/${id}`);
                    return;
                }

                setGameData(data);
            } catch (err) {
                setError('Failed to load game data. Please try again.');
                console.error("Error fetching game:", err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchGameData();
    }, [id, router]);

    async function handleJoinGame() {
        if (!playerName.trim()) {
            setError('Please enter your name');
            return;
        }

        setIsJoining(true);
        setError(null);

        try {
            const response = await fetch(`${BACKEND_API_BASE_URL}/games/${id}/join/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ player_name: playerName.trim() }),
            });

            if (!response.ok) {
                throw new Error('Failed to join game');
            }

            const data = await response.json();

            // Store game session data
            setPlayerNameInLocalStorage(data.id, playerName.trim(), 2);

            router.push(`/games/${data.id}`);
        } catch (err) {
            setError('Failed to join game. Please try again.');
            console.error("Error joining game:", err);
        } finally {
            setIsJoining(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-blue-900">
                <div className="p-8 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl">
                    <div className="w-8 h-8 border-3 border-blue-500/80 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
            </div>
        );
    }

    if (!gameData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-blue-900">
                <div className="p-8 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl">
                    <div className="text-red-500 dark:text-red-400 font-medium">Game not found</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-blue-900">
            <div className="mx-auto w-full max-w-md p-8 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl transform-gpu transition-all duration-300 hover:shadow-2xl">
                <div className="text-center space-y-4">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                        Join Game
                    </h2>
                    <div className="space-y-2">
                        <h6 className="text-lg text-gray-700 dark:text-gray-200">
                            <span className="font-semibold text-cyan-600 dark:text-purple-400">
                                {gameData.player_1}{" "}
                            </span>
                            challenged your skills in Connect4
                        </h6>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Please enter your name and click "Join Game" to start the battle
                        </p>
                    </div>
                </div>

                <div className="mt-8 space-y-6">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm text-center animate-fadeIn">
                            {error}
                        </div>
                    )}
                    <PlayerNameInput
                        label="Your name"
                        value={playerName}
                        onChangeHandler={setPlayerName}
                        error={error && !playerName.trim() ? "Name is required" : undefined}
                        disabled={isJoining}
                    />
                    <div className="pt-2">
                        <FourFuryButton
                            label={isJoining ? "Joining..." : "Join Game"}
                            onClickHandler={handleJoinGame}
                            disabled={isJoining || !playerName.trim()}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
