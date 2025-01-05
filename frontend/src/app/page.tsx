"use client";

import { BACKEND_API_BASE_URL } from "@/constants";
import { useRouter } from "next/navigation"
import { useState } from "react";

export default function StartGame() {
    const router = useRouter();
    const [playerName, setPlayerName] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleStartGame() {
        setIsLoading(true);
        const data = { player_name: playerName };
        try {
            const response = await fetch(`${BACKEND_API_BASE_URL}/games/start/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error();
            const responseData = await response.json();
            router.push(`/games/${responseData.id}`);
            console.log(`success: ${responseData}`);
        } catch (err) {
            console.log("Something went wrong", err);
        } finally {
            setIsLoading(false);
        }
    }

    return (
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

                <div className="mt-8 space-y-6">
                    <div className="relative">
                        <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Your Name
                        </label>
                        <input
                            type="text"
                            name="playerName"
                            id="playerName"
                            placeholder="Enter your name"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            className="block w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600
                            bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200
                            focus:ring-2 focus:ring-purple-500 focus:border-transparent
                            transition-all duration-300 ease-in-out
                            placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleStartGame}
                        disabled={isLoading || !playerName.trim()}
                        className={`w-full py-3 px-4 rounded-lg font-medium text-white
                        ${isLoading || !playerName.trim()
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'}
                        transform transition-all duration-300 ease-in-out
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
                        shadow-lg hover:shadow-xl`}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Loading...
                            </span>
                        ) : (
                            'Start Game'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
