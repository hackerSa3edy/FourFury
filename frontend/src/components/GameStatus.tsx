import React from "react";
import { GameData } from "@/app/games/[id]/page";

export const GameStatus = React.memo(({ gameData, playerName } : {gameData: GameData; playerName: string}) => {
    const currentPlayer = gameData.move_number % 2 === 0 ? gameData.player_2_username : gameData.player_1_username;
    const currentPlayerName = gameData.move_number % 2 === 0 ? gameData.player_2 : gameData.player_1;
    const storedName = playerName;
    const isMyTurn = currentPlayer === storedName;

    const getWinnerName = () => {
        if (!gameData.winner) return null;
        return gameData.winner === 1 ? gameData.player_1_username : gameData.player_2_username;
    };

    const renderWinnerMessage = () => {
        const isWinner = getWinnerName() === playerName;
        return (
            <div className="flex flex-col items-center space-y-2 animate-float">
                <div className={`p-4 rounded-full ${isWinner ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
                    <svg
                        className={`w-8 h-8 ${isWinner ? 'text-green-500' : 'text-blue-500'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        {isWinner ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                    </svg>
                </div>
                <div className={`text-lg font-bold ${isWinner ? 'text-green-500' : 'text-blue-500'}`}>
                    {isWinner ? 'Victory!' : `${gameData.winner === 1 ? gameData.player_1 : gameData.player_2} wins!`}
                </div>
            </div>
        );
    };

    const renderDrawMessage = () => {
        return (
            <div className="flex flex-col items-center space-y-2 animate-float">
                <div className="p-4 rounded-full bg-yellow-500/20">
                    <svg
                        className="w-8 h-8 text-yellow-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="text-lg font-bold text-yellow-500">
                    Game Draw!
                </div>
            </div>
        );
    };

    const renderTurnIndicator = () => {
        return (
            <div className="flex items-center justify-center space-x-3">
                <div className={`transition-all duration-300 transform ${isMyTurn ? 'scale-110' : 'scale-90 opacity-50'}`}>
                    <div className={`p-3 rounded-lg ${
                        isMyTurn
                            ? 'bg-green-500/20 animate-pulse-slow'
                            : 'bg-slate-500/20'
                    }`}>
                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${
                                isMyTurn ? 'bg-green-500' : 'bg-slate-500'
                            }`} />
                            <span className={`font-medium ${
                                isMyTurn
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-slate-600 dark:text-slate-400'
                            }`}>
                                {isMyTurn ? 'Your move!' : `Waiting for ${currentPlayerName}`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="text-center mt-4 space-y-2">
            {(gameData.finished_at && !gameData.winner) ? renderDrawMessage() :
             gameData.winner ? renderWinnerMessage() :
             renderTurnIndicator()}
        </div>
    );
});

GameStatus.displayName = 'GameStatus';
