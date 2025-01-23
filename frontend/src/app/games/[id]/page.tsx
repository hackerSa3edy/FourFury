// games/[id]/page.tsx
"use client";

import { BACKEND_API_BASE_URL, SOCKETIO_BASE_URL } from "@/constants";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { HomeButton } from "@/components/buttons";

import { getFourFuryCookie } from "@/utils/localStorageUtils";
import { WaitingPlayerToJoin } from "@/components/WaitingPlayerToJoin";
import { GameInfo } from "@/components/GameInfo";
import { GameBoard } from "@/components/GameBoard";
import { ExitWarningDialog } from "@/components/ExitWarningDialog";
import { useGamePresence } from '@/hooks/useGamePresence';
import { useGameRematch } from '@/hooks/useGameRematch';

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
    const [showExitWarning, setShowExitWarning] = useState(false);
    const router = useRouter();
    const { presenceState, countdowns } = useGamePresence(socket, data);

    const playerName = useMemo(() => {
        return getFourFuryCookie(Array.isArray(id) ? id[0] : id || '')?.split(',')[1];
    }, [id]);

    const {
        rematchStatus,
        rematchRequest,
        rematchError,
        handleRematch,
        handleCancelRematch,
        handleAcceptRematch,
        handleDeclineRematch,
    } = useGameRematch(socket, Array.isArray(id) ? id[0] : id || '', playerName);

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

    // Enhanced loading state
    if (isLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center
                bg-gradient-to-br from-blue-50/90 to-blue-200/90
                dark:from-gray-900/90 dark:to-blue-900/90
                backdrop-blur-md z-50">
                <div className="relative p-6 sm:p-8 rounded-2xl
                    bg-white/90 dark:bg-slate-800/90
                    shadow-2xl border border-blue-200
                    dark:border-blue-800
                    transform transition-all duration-500
                    animate-fade-in">
                    <div className="w-10 sm:w-12 h-10 sm:h-12
                        border-4 border-blue-500
                        dark:border-purple-500
                        border-t-transparent rounded-full
                        animate-spin mx-auto mb-4" />
                    <div className="text-base sm:text-lg font-medium
                        text-slate-600 dark:text-slate-300
                        animate-pulse text-center">
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

    if (!data || !playerName || (playerName !== data?.player_1_username && !data?.player_2_username)) return (
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
        <div className="min-h-screen w-full bg-gradient-to-br from-cyan-50/95 via-white/95 to-cyan-100/95
            dark:from-gray-900/95 dark:via-gray-800/95 dark:to-cyan-900/95
            transition-all duration-500 ease-in-out hover:brightness-105
            fixed inset-0 overflow-auto">

            <HomeButton onClick={handleExitWarning} />

            {/* Main content with responsive layout */}
            <div className="w-full min-h-screen pt-16 px-[clamp(1rem,3vw,1.5rem)] pb-[clamp(1rem,3vw,1.5rem)]">
                <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_minmax(300px,400px)] gap-[clamp(1rem,3vw,1.5rem)]">
                    {/* Game Info Container - Stacks on top for mobile, moves to right on desktop */}
                    <div className="lg:col-start-2 lg:row-start-1 h-full flex items-start">
                        <div className="w-full h-auto
                            bg-white/90 dark:bg-slate-800/90 rounded-[clamp(0.5rem,2vw,1rem)]
                            shadow-[0_clamp(0.25rem,1vw,0.5rem)_clamp(1rem,3vw,2rem)_rgba(0,0,0,0.1)]
                            dark:shadow-[0_clamp(0.25rem,1vw,0.5rem)_clamp(1rem,3vw,2rem)_rgba(0,0,0,0.2)]
                            border-2 border-blue-100/50 dark:border-slate-700/50
                            transition-all duration-300
                            hover:shadow-[0_clamp(0.5rem,2vw,1rem)_clamp(2rem,4vw,3rem)_rgba(0,0,0,0.15)]
                            dark:hover:shadow-[0_clamp(0.5rem,2vw,1rem)_clamp(2rem,4vw,3rem)_rgba(0,0,0,0.3)]
                            p-[clamp(0.5rem,2vw,1rem)]
                            lg:sticky lg:top-20">
                            <GameInfo
                                gameData={data}
                                handleReplayGame={handleReplayGame}
                                handleRematch={handleRematch}
                                handleCancelRematch={handleCancelRematch}
                                rematchStatus={rematchStatus}
                                presenceState={presenceState}
                                countdowns={countdowns}
                                playerName={playerName}
                                replayInProgress={replayInProgress}
                            />
                        </div>
                    </div>

                    {/* Game Board Container - Stacks below on mobile, moves to left on desktop */}
                    <div className="lg:col-start-1 lg:row-start-1 h-full flex items-center justify-center">
                        <div className="w-full h-full max-h-[min(calc(100vh-8rem),calc(100vw-2rem))] lg:max-h-[min(calc(100vh-8rem),calc(100vw-400px))] aspect-square
                            min-w-[320px] min-h-[320px]
                            flex items-center justify-center
                            bg-white/90 dark:bg-slate-800/90 rounded-[clamp(0.5rem,2vw,1rem)]
                            shadow-[0_clamp(0.25rem,1vw,0.5rem)_clamp(1rem,3vw,2rem)_rgba(0,0,0,0.1)]
                            dark:shadow-[0_clamp(0.25rem,1vw,0.5rem)_clamp(1rem,3vw,2rem)_rgba(0,0,0,0.2)]
                            border-2 border-blue-100/50 dark:border-slate-700/50
                            transition-all duration-300
                            hover:shadow-[0_clamp(0.5rem,2vw,1rem)_clamp(2rem,4vw,3rem)_rgba(0,0,0,0.15)]
                            dark:hover:shadow-[0_clamp(0.5rem,2vw,1rem)_clamp(2rem,4vw,3rem)_rgba(0,0,0,0.3)]
                            p-[clamp(0.5rem,2vw,1rem)]">
                            <GameBoard
                                gameData={data}
                                socket={socket}
                                playerName={playerName}
                            />
                        </div>
                    </div>
                </div>
            </div>

        {/* Rematch Request Popup - enhanced styling */}
        {rematchRequest && (
            <div className="fixed inset-0 flex items-center justify-center
                bg-gradient-to-br from-black/80 to-purple-900/80
                backdrop-blur-md z-50 transition-opacity duration-500">
                <div className="bg-gradient-to-br from-white to-purple-50
                    dark:from-gray-800 dark:to-purple-900
                    min-h-screen w-full sm:min-h-0 sm:w-auto sm:max-w-lg sm:mx-6 sm:rounded-3xl
                    p-8 sm:p-10
                    flex flex-col items-center justify-center
                    transform transition-all duration-300 hover:scale-[1.02]
                    border-2 border-purple-200 dark:border-purple-700">
                    <div className="mb-8 w-full">
                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-400 to-pink-500
                            rounded-full flex items-center justify-center
                            shadow-lg transform hover:rotate-12 transition-transform">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-center bg-gradient-to-r from-purple-600 to-pink-600
                            bg-clip-text text-transparent">
                            Rematch Challenge!
                        </h3>
                    </div>
                    <p className="text-center mb-8 text-gray-600 dark:text-gray-300 px-4">
                        <span className="font-semibold text-purple-600 dark:text-purple-400">{rematchRequest.requesterName}</span>
                        <span> wants to prove themselves in another game!</span>
                    </p>
                    <div className="flex flex-col w-full gap-4 px-4 sm:px-0 sm:flex-row sm:justify-center">
                        <button
                            onClick={handleAcceptRematch}
                            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-lg font-medium transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:from-green-500 hover:to-emerald-600 focus:ring-2 focus:ring-green-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                        >
                            Accept Challenge
                        </button>
                        <button
                            onClick={handleDeclineRematch}
                            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-red-400 to-rose-500 text-white rounded-lg font-medium transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:from-red-500 hover:to-rose-600 focus:ring-2 focus:ring-red-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                        >
                            Decline
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Enhanced Error and Warning Dialogs */}
        {rematchStatus === 'declined' && (
            <div className="fixed inset-0 flex items-center justify-center
                bg-gradient-to-br from-black/80 to-red-900/80 backdrop-blur-md z-50">
                <div className="bg-gradient-to-br from-white to-red-50
                    dark:from-gray-800 dark:to-red-900 p-10
                    rounded-3xl shadow-2xl max-w-lg w-full mx-6
                    transform transition-all duration-300
                    border-2 border-red-200 dark:border-red-700">
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
    </div>
    );
}
