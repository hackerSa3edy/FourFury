"use client";

import { BACKEND_API_BASE_URL, BACKEND_WS_BASE_URL } from "@/constants";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";

export interface GameData {
    id: string;
    player_1: string;
    player_2: string | null;
    move_number: number;
    board: number[][];
    winner: number | null;
    finished_at: string | null;
}

interface WebSocketStatus {
    isConnected: boolean;
    error: string | null;
}

export default function PlayGame() {
    const { id } = useParams();
    const [data, setData] = useState<GameData | null>(null);
    const [isLoading, setLoading] = useState(true);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [wsStatus, setWsStatus] = useState<WebSocketStatus>({
        isConnected: false,
        error: null
    });

    // WebSocket connection logic with reconnection
    useEffect(() => {
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;
        let reconnectTimeout: NodeJS.Timeout;

        const connectWebSocket = () => {
            const ws = new WebSocket(`${BACKEND_WS_BASE_URL}/games/ws/${id}/`);

            ws.addEventListener("open", () => {
                setWsStatus({ isConnected: true, error: null });
                reconnectAttempts = 0; // Reset attempts on successful connection

                // Fetch initial game data
                fetchGameData();
            });

            ws.addEventListener("error", (error) => {
                setWsStatus(prev => ({
                    ...prev,
                    error: "WebSocket connection error"
                }));
            });

            ws.addEventListener("close", () => {
                setWsStatus(prev => ({
                    ...prev,
                    isConnected: false
                }));

                // Attempt to reconnect
                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    reconnectTimeout = setTimeout(connectWebSocket, 2000 * reconnectAttempts);
                }
            });

            ws.addEventListener("message", (event) => {
                try {
                    const data = JSON.parse(JSON.parse(event.data));
                    setData(data);
                } catch (err) {
                    console.error("Error parsing WebSocket message:", err);
                }
            });

            setWs(ws);
        };

        const fetchGameData = async () => {
            try {
                const response = await fetch(`${BACKEND_API_BASE_URL}/games/${id}/`);
                if (!response.ok) throw new Error("Failed to fetch game data");
                const data = await response.json();
                setData(data);
                setLoading(false);
            } catch (err) {
                setWsStatus(prev => ({
                    ...prev,
                    error: "Failed to fetch game data"
                }));
                setLoading(false);
            }
        };

        connectWebSocket();

        // Cleanup
        return () => {
            clearTimeout(reconnectTimeout);
            if (ws) ws.close();
        };
    }, [id]);

    // Loading and error states
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="relative p-8 rounded-xl bg-white dark:bg-slate-800 shadow-xl dark:shadow-slate-700/20">
                    <div className="w-12 h-12 border-4 border-blue-500 dark:border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <div className="text-lg font-medium text-slate-600 dark:text-slate-300 animate-pulse">
                        Loading your game...
                    </div>
                </div>
            </div>
        );
    }

    if (wsStatus.error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="p-8 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shadow-xl border border-red-100 dark:border-red-900">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Connection Error</h3>
                            <p className="text-red-500 dark:text-red-300">{wsStatus.error}. Please try refreshing the page.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <div className="p-8 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shadow-xl border border-red-100 dark:border-red-900 transform transition-all hover:scale-105">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Game Not Found</h3>
                        <p className="text-red-500 dark:text-red-300">Unable to load game data. Please try again later.</p>
                    </div>
                </div>
            </div>
        </div>
    );

    if (!data.player_2) return <WaitingPlayerToJoin id={ data.id } />;

    return (
        <div
            className={`
            flex flex-1 flex-col min-h-full
            py-4
            px-8 md:px-10 lg:px-16 xl:px-18 3xl:px-12 4xl:px-32
            w-full sm:w-9/12 md:w-9/12 lg:w-7/12 xl:w-6/12 2xl:w-5/12 3xl:w-5/12 4xl:w-5/12
            mx-auto
        `}
        >
            <GameInfo gameData={data} />
            <GameStatus gameData={data} />
            <GameBoard gameData={data} ws={ws} />
        </div>
    );
}

function WaitingPlayerToJoin({ id }: { id: string }) {
    const [isCopied, setIsCopied] = useState(false);

    const frontendBaseUrl = window.location.origin;
    const linkToShare = `${frontendBaseUrl}/games/${id}/join/`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(linkToShare);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1000);
    };

    return (
        <div className="flex flex-1 flex-col justify-center min-h-full mx-4">
            <div
                className={`
                    w-full sm:w-5/6 md:w-3/4 lg:w-3/5 xl:w-6/12 3xl:w-1/3
                    mx-auto
                    px-2 py-12
                    text-center
                    shadow-lg rounded-xl
                    border-2
                    bg-cyan-600
                    text-slate-100
                    border-cyan-600
                    shadow-cyan-500
                    dark:bg-inherit
                    dark:text-blue-100
                    dark:border-blue-500
                    dark:shadow-2xl
                    dark:shadow-blue-600
                `}
            >
                <p className="text-xl font-bold">Waiting for player to join</p>
                <div className="relative mt-4">
                    Share this link with a friend to join (click to copy): <br />
                    <span
                        className={`cursor-pointer hover:underline dark:text-blue-400 dark:hover:text-blue-300`}
                        onClick={handleCopyLink}
                    >
                        {linkToShare}
                    </span>
                    <span
                        className={`
                            absolute left-1/2 transform -translate-x-1/2 top-14
                            rounded-md bg-cyan-500 text-slate-100 dark:bg-blue-500 dark:text-blue-100 px-2 py-1Ω
                            text-xs transition-opacity duration-500
                            ${isCopied ? "opacity-100" : "opacity-0"}
                        `}
                    >
                        Copied!
                    </span>
                </div>
            </div>
        </div>
    );
}

// Memoize static components
const GameInfo = React.memo(({ gameData }: { gameData: GameData }) => {
    let humanFinishedAt = null;
    if (gameData.finished_at) {
        humanFinishedAt = new Date(gameData.finished_at).toLocaleString();
    }

    return (
        <div
            className={`
                py-4
                px-5 rounded-xl
                text-center
                shadow-lg
                border-2
                bg-slate-200
                text-cyan-800
                border-cyan-300
                shadow-cyan-500
                dark:bg-violet-950
                dark:text-violet-100
                dark:border-violet-500
                dark:shadow-violet-500
                text-md 3xl:text-lg tracking-tight
            `}
        >
            <p className="text-xl 3xl:text-2xl font-bold mb-1">Connect4 BATTLE</p>
            <p className="text-lg 3xl:text-xl font-bold ">
                Game:
                <span className="text-red-400 dark:text-purple-400"> {gameData.player_1}</span> vs
                <span className="text-yellow-400 dark:text-blue-500 drop-shadow-2xl"> {gameData.player_2}</span>
            </p>
            {humanFinishedAt && <p> Game finished at {humanFinishedAt}</p>}
            {!humanFinishedAt && <p> Move #{gameData.move_number} </p>}
        </div>
    );
});

const GameBoard = React.memo(({ gameData, ws }: { gameData: GameData; ws: WebSocket | null }) => {
    const handleCellClick = useCallback((i: number, j: number) => {
        if (!ws || ws.readyState !== WebSocket.OPEN || !gameData) {
            console.log('WebSocket not ready:', {
                wsExists: !!ws,
                wsState: ws?.readyState,
                gameDataExists: !!gameData
            });
            return;
        }

        const currentPlayer = gameData.move_number % 2 === 0 ? gameData.player_2 : gameData.player_1;
        const storedName = sessionStorage.getItem('playerName');

        console.log('Move attempt:', {
            currentPlayer,
            storedName,
            moveNumber: gameData.move_number,
            column: j
        });

        // Verify it's the player's turn
        if (currentPlayer !== storedName) {

            console.log(`Not your turn: ${currentPlayer} !== ${storedName}`);
            return;
        }

        const payload = {
            type: 'move',  // Add message type
            player: storedName,
            column: j,
            moveNumber: gameData.move_number
        };

        try {
            console.log('Sending move:', payload);
            ws.send(JSON.stringify(payload));
        } catch (error) {
            console.error('Error sending move:', error);
        }
    }, [ws, gameData]);

    return (
        <div
            className={`
                mt-4 rounded-xl
                p-5 shadow-2xl
                bg-cyan-600
                shadow-cyan-700
                border-2
                border-cyan-600
                dark:bg-inherit
                dark:shadow-blue-600
                dark:border-2
                dark:border-blue-600
            `}
        >
            <table className="mx-auto my-0 sm:my-2">
                <tbody>
                    {gameData.board.map((row: number[], rowIndex: number) => (
                        <tr key={`row-${rowIndex}`}>
                            {row.map((cell: number, colIndex: number) => (
                                <GameBoardCell
                                    key={`${rowIndex}-${colIndex}`}
                                    rowIndex={rowIndex}
                                    colIndex={colIndex}
                                    cellValue={cell}
                                    handleCellClick={handleCellClick}
                                />
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

const GameBoardCell = React.memo(({ rowIndex, colIndex, cellValue, handleCellClick }: {
    rowIndex: number;
    colIndex: number;
    cellValue: number;
    handleCellClick: (i: number, j: number) => void;
}) => {
    const cellStyle = useMemo(() => {
        let style = `
            h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-14 lg:w-14 xl:h-16 xl:w-16 3xl:h-20 3xl:w-20
            rounded-full border-2 transition duration-200 border-cyan-100 dark:border-violet-300
        `;

        if (cellValue === 1) style += " bg-red-400 dark:bg-purple-500";
        else if (cellValue === 2) style += " bg-yellow-300 dark:bg-blue-600";
        else if (cellValue === 3) style += " bg-green-400 dark:bg-green-600";

        return style;
    }, [cellValue]);

    return (
        <td>
            <button
                className={cellStyle}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                aria-label={`Cell ${rowIndex}-${colIndex}`}
                disabled={cellValue !== 0}
            />
        </td>
    );
});

const GameStatus = React.memo(({ gameData }: { gameData: GameData }) => {
    const currentPlayer = gameData.move_number % 2 === 0 ? gameData.player_2 : gameData.player_1;
    const storedName = sessionStorage.getItem('playerName');
    const isMyTurn = currentPlayer === storedName;
    console.log(`turn: ${isMyTurn}`, `stored name: ${storedName}`, `current player: ${currentPlayer}`);

    const getWinnerName = () => {
        if (!gameData.winner) return null;
        // gameData.winner will be 1 or 2, so use that to get the correct player name
        return gameData.winner === 1 ? gameData.player_1 : gameData.player_2;
    };

    return (
        <div className="text-center mt-4 text-lg font-medium">
            {gameData.winner ? (
                <span className="text-green-500">
                    {getWinnerName() === storedName ? 'You won!' : `${getWinnerName()} won!`}
                </span>
            ) : (
                <span className={isMyTurn ? 'text-green-500' : 'text-gray-500'}>
                    {isMyTurn ? 'Your turn' : `Waiting for ${currentPlayer}`}
                </span>
            )}
        </div>
    );
});

GameStatus.displayName = 'GameStatus';
GameBoardCell.displayName = 'GameBoardCell';
GameBoard.displayName = 'GameBoard';
GameInfo.displayName = 'GameInfo';
