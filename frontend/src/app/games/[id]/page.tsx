"use client";

import { BACKEND_API_BASE_URL, SOCKETIO_BASE_URL } from "@/constants";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { HomeButton, RematchButton, ReplayButton } from "@/components/buttons";

import { getFourFuryCookie, clearFourFuryCookie, setFourFuryCookie, getCurrentPlayer } from "@/utils/localStorageUtils";

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

interface GameInfoProps {
    gameData: GameData;
    handleReplayGame: () => void;
    handleRematch: () => void;
    handleCancelRematch: () => void; // Add this line
    rematchStatus: string;
}

interface RematchRequest {
    requestedBy: string;
    requesterName: string;
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
    const [rematchStatus, setRematchStatus] = useState<string>('idle');
    const [rematchRequest, setRematchRequest] = useState<RematchRequest | null>(null);
    const [rematchError, setRematchError] = useState<string | null>(null); // Add this line
    const [showExitWarning, setShowExitWarning] = useState(false);
    const router = useRouter();

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

    const handleRematch = useCallback(() => {
        if (!socket || !data) return;
        setRematchStatus('requesting');
        console.log('Requesting rematch:', data.id);
        socket.emit('request_rematch', data.id);
    }, [socket, data]);

    const handleCancelRematch = useCallback(() => {
        if (!socket || !data?.id) return;
        socket.emit('cancel_rematch', data.id);
        setRematchStatus('idle');
    }, [socket, data?.id]);

    const playerName = useMemo(() => {
        return getFourFuryCookie(Array.isArray(id) ? id[0] : id || '')?.split(',')[1];
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

    useEffect(() => {
        if (!socket) return;

        socket.on('rematch_requested', (data: RematchRequest) => {
            if (data.requestedBy !== playerName) {
                setRematchRequest(data);
            } else {
                setRematchStatus('waiting');
            }
        });

        socket.on('rematch_started', (data) => {
            console.log('Rematch started:', data);
            const currGameId = Array.isArray(id) ? id[0] : id || '';
            const player = getCurrentPlayer(currGameId);

            if (!player) {
                console.error('No player found in local storage');
                setSocketStatus(prev => ({
                    ...prev,
                    error: "Session expired. Please start a new game."
                }));
                return;
            }

            clearFourFuryCookie();
            setFourFuryCookie(data.game_id, player.username, player.number as 1 | 2);
            router.push(`/games/${data.game_id}`);
        });

        socket.on('rematch_declined', () => {
            setRematchStatus('declined');
            setRematchRequest(null);  // Clear the rematch request
            setTimeout(() => {
                setRematchStatus('idle');
                router.push('/');
            }, 2000);
        });

        socket.on('rematch_error', (data) => {
            setRematchError(data.message);
            setRematchStatus('idle');
            setRematchRequest(null);
            setTimeout(() => {
                setRematchError(null);
                router.push('/');
            }, 3500);
        });

        socket.on('rematch_cancelled', () => {
            setRematchStatus('idle');
            setRematchRequest(null);  // Clear the rematch request
        });

        return () => {
            socket.off('rematch_requested');
            socket.off('rematch_started');
            socket.off('rematch_declined');
            socket.off('rematch_error');
            socket.off('rematch_cancelled');
        };
    }, [socket, playerName, router, id]);

    const handleAcceptRematch = useCallback(() => {
        if (!socket || !id) return;
        const gameId = Array.isArray(id) ? id[0] : id;
        socket.emit('accept_rematch', gameId);
        setRematchRequest(null);
    }, [socket, id]);

    const handleDeclineRematch = useCallback(() => {
        if (!socket || !id) return;
        const gameId = Array.isArray(id) ? id[0] : id;
        socket.emit('decline_rematch', gameId);
        setRematchRequest(null);
    }, [socket, id]);

    // Add useEffect for handling page exit
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!data?.finished_at) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [data?.finished_at]);

    const handleExitWarning = () => {
        if (!data?.finished_at) {
            setShowExitWarning(true);
        } else {
            router.push('/');
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50/90 to-blue-200/90 dark:from-gray-900/90 dark:to-blue-900/90 backdrop-blur-md z-50">
                <div className="relative p-8 rounded-2xl bg-white/90 dark:bg-slate-800/90 shadow-2xl">
                    <div className="w-12 h-12 border-4 border-blue-500 dark:border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <div className="text-lg font-medium text-slate-600 dark:text-slate-300 animate-pulse">
                        Loading your game...
                    </div>
                </div>
            </div>
        );
    }
    // Error state
    if (socketStatus.error) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 backdrop-blur-md z-50">
                <div className="p-8 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-2xl border border-red-200 dark:border-red-800">
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
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 backdrop-blur-md z-50">
            <div className="p-8 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-2xl border border-red-200 dark:border-red-800">
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

    if (!data.player_2_username && data.id) return <WaitingPlayerToJoin id={data.id} />;

    return (
        <>
            <HomeButton onClick={handleExitWarning} />
            <div className="min-h-screen w-full bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-gray-900 dark:to-cyan-950">
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                    <div className="flex flex-col space-y-6">
                        <GameInfo
                            gameData={data}
                            handleReplayGame={handleReplayGame}
                            handleRematch={handleRematch}
                            handleCancelRematch={handleCancelRematch}
                            rematchStatus={rematchStatus}
                        />
                        <GameStatus gameData={data} playerName={playerName} />
                        <GameBoard gameData={data} socket={socket} playerName={playerName} />
                    </div>
                </div>
            </div>

            {/* Rematch Request Popup */}
            {rematchRequest && (
                <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-black/70 to-purple-900/70 backdrop-blur-sm z-50">
                    <div className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-500 ease-out scale-100 hover:scale-102 border border-purple-200 dark:border-purple-700">
                        <div className="mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Rematch Challenge!
                            </h3>
                        </div>
                        <p className="text-center mb-8 text-gray-600 dark:text-gray-300">
                            <span className="font-semibold text-purple-600 dark:text-purple-400">{rematchRequest.requesterName}</span>
                            <span> wants to prove themselves in another game!</span>
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <button
                                onClick={handleAcceptRematch}
                                className="px-8 py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-lg font-medium transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:from-green-500 hover:to-emerald-600 focus:ring-2 focus:ring-green-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                            >
                                Accept Challenge
                            </button>
                            <button
                                onClick={handleDeclineRematch}
                                className="px-8 py-3 bg-gradient-to-r from-red-400 to-rose-500 text-white rounded-lg font-medium transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:from-red-500 hover:to-rose-600 focus:ring-2 focus:ring-red-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                            >
                                Decline
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {rematchStatus === 'declined' && (
                <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-black/70 to-red-900/70 backdrop-blur-sm z-50">
                    <div className="bg-gradient-to-br from-white to-red-50 dark:from-gray-800 dark:to-red-900 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform animate-bounce-gentle">
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-xl text-center font-medium bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                            Rematch declined
                        </p>
                        <p className="text-center mt-2 text-gray-600 dark:text-gray-300">
                            Returning to home...
                        </p>
                    </div>
                </div>
            )}

            {/* Rematch Error Popup */}
            {rematchError && (
                <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-black/70 to-red-900/70 backdrop-blur-sm z-50">
                    <div className="bg-gradient-to-br from-white to-red-50 dark:from-gray-800 dark:to-red-900 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform animate-bounce-gentle">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center animate-pulse">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-center bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                                Oops! Something went wrong
                            </h3>
                            <p className="text-center text-gray-600 dark:text-gray-300">
                                {rematchError}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Returning to home...
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {showExitWarning && (
                <ExitWarningDialog
                    setShowExitWarning={setShowExitWarning}
                    onExit={() => router.push('/')}
                />
            )}
        </>
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
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-gray-900 dark:to-cyan-950">
            <div className="w-full max-w-2xl mx-4 p-8 rounded-xl bg-white/90 dark:bg-slate-800/90 shadow-2xl border border-cyan-200 dark:border-cyan-800">
                <div className="text-center space-y-6">
                    <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">Waiting for player to join</h2>
                    <div className="relative">
                        <p className="text-slate-600 dark:text-slate-300 mb-4">
                            Share this link with a friend to join (click to copy):
                        </p>
                        <button
                            onClick={handleCopyLink}
                            className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors break-all"
                        >
                            {linkToShare}
                        </button>
                        <div
                            className={`
                                absolute left-1/2 transform -translate-x-1/2 mt-4
                                bg-cyan-500 text-white px-3 py-1 rounded
                                transition-opacity duration-300
                                ${isCopied ? "opacity-100" : "opacity-0"}
                            `}
                        >
                            Copied!
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const GameInfo = React.memo(({ gameData, handleReplayGame, handleRematch, handleCancelRematch, rematchStatus }: GameInfoProps) => {
    const humanFinishedAt = gameData.finished_at ? new Date(gameData.finished_at).toLocaleString() : null;

    return (
        <div className="rounded-xl p-6 bg-white/90 dark:bg-slate-800/90 shadow-xl border border-cyan-200 dark:border-cyan-800">
            <div className="text-center space-y-3">
                <h1 className="text-3xl font-bold text-cyan-700 dark:text-cyan-300">Connect4 BATTLE</h1>
                <div className="text-xl">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Game: </span>
                    <span className="text-red-500 dark:text-purple-500">{gameData.player_1}</span>
                    <span className="text-slate-700 dark:text-slate-300"> vs </span>
                    <span className="text-yellow-500 dark:text-blue-500">{gameData.player_2}</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                    <p>Move #{gameData.move_number}</p>
                    {humanFinishedAt && <p>Game finished at {humanFinishedAt}</p>}
                </div>

                {humanFinishedAt && (
                    <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-200/20 to-transparent dark:via-cyan-700/20 animate-pulse-slow"></div>

                        <RematchButton
                            rematchStatus={rematchStatus}
                            onRematch={handleRematch}
                            onCancelRematch={handleCancelRematch}
                        />

                        <ReplayButton onReplay={handleReplayGame} />
                    </div>
                )}

                {rematchStatus === 'waiting' && (
                    <div className="mt-4 text-cyan-600 dark:text-cyan-400 animate-pulse">
                        Waiting for opponent to accept rematch...
                    </div>
                )}
            </div>
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
                max-h-[80vh] overflow-y-auto
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
            aspect-square w-6 sm:w-8 md:w-10 lg:w-12 xl:w-14
            rounded-full border-2
            transform transition-all duration-300
            hover:scale-105 active:scale-95
            cursor-${isPlayable ? 'pointer' : 'not-allowed'}
            ${isHighlighted ? 'border-cyan-400 dark:border-cyan-500 shadow-lg animate-pulse' : 'border-white dark:border-violet-300'}
        `;

        if (cellValue === 1) return `${baseStyle} bg-gradient-to-br from-red-400 to-red-500 dark:from-purple-500 dark:to-purple-600`;
        if (cellValue === 2) return `${baseStyle} bg-gradient-to-br from-yellow-300 to-yellow-400 dark:from-blue-500 dark:to-blue-600`;
        if (cellValue === 3) return `${baseStyle} bg-gradient-to-br from-green-400 to-green-500 dark:from-green-500 dark:to-green-600`;

        return `${baseStyle} ${isHighlighted ? 'bg-gradient-to-br from-cyan-700 to-cyan-800 dark:from-cyan-800 dark:to-cyan-900' : ''}`;
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

    const getWinnerName = () => {
        if (!gameData.winner) return null;
        return gameData.winner === 1 ? gameData.player_1_username : gameData.player_2_username;
    };

    return (
        <div className="text-center mt-4 space-y-2">
            <div className="flex items-center justify-center gap-2">
                {gameData.winner ? (
                    <span className="text-green-500">
                        {getWinnerName() === playerName ? 'You won!' : `${gameData.winner === 1 ? gameData.player_1 : gameData.player_2} won!`}
                    </span>
                ) : (
                    <span className={isMyTurn ? 'text-green-500' : 'text-gray-500'}>
                        {isMyTurn ? 'Your turn' : `Waiting for ${currentPlayerName}`}
                    </span>
                )}
            </div>
        </div>
    );
});

interface ExitWarningDialogProps {
    setShowExitWarning: (show: boolean) => void;
    onExit: () => void;
}

const ExitWarningDialog = ({ setShowExitWarning, onExit }: ExitWarningDialogProps) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-red-600">Warning!</h3>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
                If you leave the game now, you will forfeit and your opponent will be declared the winner. Are you sure?
            </p>
            <div className="flex justify-end space-x-4">
                <button
                    onClick={() => setShowExitWarning(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                    Stay
                </button>
                <button
                    onClick={onExit}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Leave Game
                </button>
            </div>
        </div>
    </div>
);

GameStatus.displayName = 'GameStatus';
GameBoardCell.displayName = 'GameBoardCell';
GameBoard.displayName = 'GameBoard';
GameInfo.displayName = 'GameInfo';
