"use client";

import { BACKEND_API_BASE_URL, SOCKETIO_BASE_URL } from "@/constants";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { FourFuryButton } from "@/components/buttons";
import { io, Socket } from "socket.io-client";

import { getPlayerNameFromLocalStorage } from "@/utils/localStorageUtils";

interface MovesData {
    row: number;
    column: number;
    value: number;
}

export interface GameData {
    id: string;
    player_1: string;
    player_1_username: string;
    player_2: string | null;
    player_2_username: string | null;
    move_number: number;
    movees: MovesData[];
    board: number[][];
    winner: number | null;
    next_player_to_move_username: string;
    finished_at: string | null;
    mode: string;
    ai_difficulty: number | null;
}

interface SocketStatus {
    isConnected: boolean;
    error: string | null;
}

export default function PlayGame() {
    const { id } = useParams();
    const [data, setData] = useState<GameData | null>(null);
    const [isLoading, setLoading] = useState(true);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [socketStatus, setSocketStatus] = useState<SocketStatus>({
        isConnected: false,
        error: null
    });
    const [replayInProgress, setReplayInProgress] = useState(false);

    const handleReplayGame = useCallback(() => {
        if (replayInProgress || !data?.movees) return;
        setReplayInProgress(true);

        // Store the original board state
        const originalBoard = data.board.map(row => [...row]);

        // init empty 6x7 board
        const N = 6; const M = 7;
        const newBoard = Array.from({ length: N }, () => Array(M).fill(0));
        setData(curr => curr ? { ...curr, board: newBoard, move_number: 0 } : null);

        setTimeout(() => {
            data.movees.forEach((move, index) => {
                setTimeout(() => {
                    setData(prev => {
                        if (!prev) return prev;
                        newBoard[move.row][move.column] = move.value;

                        // On last move, restore the original board to show winning cells
                        if (index === data.movees.length - 1) {
                            setReplayInProgress(false);
                            return { ...prev, board: originalBoard, move_number: index + 1 };
                        }
                        return { ...prev, board: newBoard, move_number: index + 1 };
                    });
                }, index * 450);
            });
        }, 450);
    }, [replayInProgress, data]);

    const playerName = useMemo(() => {
        return getPlayerNameFromLocalStorage(Array.isArray(id) ? id[0] : id || '')?.split(',')[1];
    }, [id]);

    // Separate data fetching effect
    useEffect(() => {
        const fetchGameData = async () => {
            try {
                const response = await fetch(`${BACKEND_API_BASE_URL}/games/${id}/`);
                if (!response.ok) throw new Error("Failed to fetch game data");
                const data = await response.json();
                setData(data);
                setLoading(false);
            } catch {
                setSocketStatus(prev => ({
                    ...prev,
                    error: "Failed to fetch game data"
                }));
                setLoading(false);
            }
        };

        fetchGameData();
    }, [id]);

    // Socket.IO connection effect
    useEffect(() => {
        const socket = io(SOCKETIO_BASE_URL, {
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });

        const handleConnect = () => {
            setSocketStatus({ isConnected: true, error: null });
            // Only join if we have valid game data
            if (data?.id) {
                socket.emit('join_game', data.id);
            }
        };

        const handleDisconnect = () => {
            setSocketStatus(prev => ({
                ...prev,
                isConnected: false
            }));
        };

        const handleGameUpdate = (updatedGameData: string) => {
            try {
                const updatedGame: GameData = JSON.parse(updatedGameData);
                setData(updatedGame);
            } catch (error) {
                console.error('Error parsing game update:', error);
            }
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('game_update', handleGameUpdate);
        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setSocketStatus(prev => ({
                ...prev,
                error: "Failed to connect to game server"
            }));
        });

        setSocket(socket);

        // Cleanup
        return () => {
            if (socket) {
                socket.off('connect', handleConnect);
                socket.off('disconnect', handleDisconnect);
                socket.off('game_update', handleGameUpdate);
                if (data?.id) {
                    socket.emit('leave_game', data.id);
                }
                socket.close();
            }
        };
    }, [data?.id]);

    // Loading and error states
    if (isLoading) {
        return (
            <div className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-center bg-gradient-to-bl from-blue-50 to-blue-200 dark:from-gray-900 dark:to-blue-900 z-40">
                <div className="relative p-8 rounded-xl bg-white dark:bg-slate-800 shadow-xl dark:shadow-slate-700/20">
                    <div className="w-12 h-12 border-4 border-blue-500 dark:border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <div className="text-lg font-medium text-slate-600 dark:text-slate-300 animate-pulse">
                        Loading your game...
                    </div>
                </div>
            </div>
        );
    }

    if (socketStatus.error) {
        return (
            <div className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 z-40">
                <div className="p-8 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shadow-xl border border-red-100 dark:border-red-900 transform transition-all hover:scale-105">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Connection Error</h3>
                            <p className="text-red-500 dark:text-red-300">{socketStatus.error}. Please try refreshing the page.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!data || !playerName) return (
        <div className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 z-40">
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

    if (!data.player_2_username && data.id) return <WaitingPlayerToJoin id={ data.id } />;

    return (
        <div
            className="
            flex flex-1 flex-col min-h-full
            py-4 sm:py-6 md:py-8 lg:py-10
            px-4 sm:px-8 md:px-12 xl:px-16
            w-full sm:w-10/12 md:w-8/12 lg:w-6/12
            mx-auto bg-gradient-to-br from-cyan-50 to-cyan-200 dark:from-gray-900 dark:to-cyan-900
        "
        >
            <GameInfo
                gameData={data}
                handleReplayGame={handleReplayGame}
            />
            <GameStatus gameData={data} playerName={playerName} />
            <GameBoard gameData={data} socket={socket} playerName={playerName} />
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
const GameInfo = React.memo(({ gameData, handleReplayGame }: { gameData: GameData; handleReplayGame: () => void; }) => {
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
            <p> Move #{gameData.move_number} </p>
            {humanFinishedAt && (
                <div className="mx-auto mt-2 w-1/2 sm:w-1/3">
                    <FourFuryButton
                        label="Replay Game"
                        onClickHandler={handleReplayGame}
                    />
                </div>
            )}
        </div>
    );
});

const GameBoard = React.memo(({ gameData, socket, playerName }: { gameData: GameData; socket: Socket | null; playerName: string }) => {
    const [highlightedColumn, setHighlightedColumn] = useState<number | null>(null);
    const handleColumnHover = useCallback((colIndex: number) => setHighlightedColumn(colIndex), []);
    const handleColumnLeave = useCallback(() => setHighlightedColumn(null), []);

    const handleCellClick = useCallback((i: number, j: number) => {
        if (!socket || !socket.connected || !gameData) {
            console.log('Socket not ready:', {
                socketExists: !!socket,
                socketConnected: socket?.connected,
                gameDataExists: !!gameData
            });
            return;
        }

        const currentPlayer = gameData.move_number % 2 === 0 ? gameData.player_2_username : gameData.player_1_username;
        const storedName = playerName;

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
            game_id: gameData.id,
            player: storedName,
            column: j
        };

        try {
            console.log('Sending move:', payload);
            socket.emit('move', payload);
        } catch (error) {
            console.error('Error sending move:', error);
        }
    }, [socket, gameData, playerName]);

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
                                    playerName={playerName}
                                    gameData={gameData}
                                    highlightedColumn={highlightedColumn}
                                    handleColumnHover={handleColumnHover}
                                    handleColumnLeave={handleColumnLeave}
                                />
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

const GameBoardCell = React.memo(({ rowIndex, colIndex, cellValue, handleCellClick, playerName, gameData, highlightedColumn, handleColumnHover, handleColumnLeave }: {
    rowIndex: number;
    colIndex: number;
    cellValue: number;
    handleCellClick: (i: number, j: number) => void;
    playerName: string;
    gameData: GameData;
    highlightedColumn: number | null;
    handleColumnHover: (colIndex: number) => void;
    handleColumnLeave: () => void;
}) => {
    const isHighlighted = useMemo(() => {
        return !gameData.finished_at &&
               gameData.next_player_to_move_username === playerName &&
               highlightedColumn === colIndex &&
               cellValue === 0;
    }, [gameData.finished_at, gameData.next_player_to_move_username, playerName, highlightedColumn, colIndex, cellValue]);

    const isPlayable = useMemo(() => {
        return cellValue === 0 && !gameData.finished_at && gameData.next_player_to_move_username === playerName;
    }, [cellValue, gameData.finished_at, gameData.next_player_to_move_username, playerName]);

    const cellStyle = useMemo(() => {
        const baseStyle = `
            h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-14 lg:w-14 xl:h-16 xl:w-16 3xl:h-20 3xl:w-20
            rounded-full border-2 transition-all duration-200 cursor-${isPlayable ? 'pointer' : 'not-allowed'}
            ${isHighlighted ? 'border-cyan-400 dark:border-cyan-500 shadow-lg' : 'border-white dark:border-violet-300'}
        `;

        if (cellValue === 1) return `${baseStyle} bg-red-400 dark:bg-purple-500`;
        if (cellValue === 2) return `${baseStyle} bg-yellow-300 dark:bg-blue-600`;
        if (cellValue === 3) return `${baseStyle} bg-green-400 dark:bg-green-600`;

        return `${baseStyle} ${isHighlighted ? 'bg-cyan-800 dark:bg-cyan-900/30' : ''}`;
    }, [cellValue, isHighlighted, isPlayable]);

    return (
        <td
            className="p-1"
            onMouseEnter={() => isPlayable && handleColumnHover(colIndex)}
            onMouseLeave={handleColumnLeave}
        >
            <button
                className={cellStyle}
                onClick={() => isPlayable && handleCellClick(rowIndex, colIndex)}
                aria-label={`Cell ${rowIndex}-${colIndex}`}
                disabled={!isPlayable}
            />
        </td>
    );
});

const GameStatus = React.memo(({ gameData, playerName }: { gameData: GameData; playerName: string }) => {
    const currentPlayer = gameData.move_number % 2 === 0 ? gameData.player_2_username : gameData.player_1_username;
    const currentPlayerName = gameData.move_number % 2 === 0 ? gameData.player_2 : gameData.player_1;
    const storedName = playerName;
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
                    {isMyTurn ? 'Your turn' : `Waiting for ${currentPlayerName}`}
                </span>
            )}
        </div>
    );
});

GameStatus.displayName = 'GameStatus';
GameBoardCell.displayName = 'GameBoardCell';
GameBoard.displayName = 'GameBoard';
GameInfo.displayName = 'GameInfo';
