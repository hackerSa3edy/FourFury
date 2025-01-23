import React, { useState, useCallback, useMemo, useEffect } from "react";
import { GameData } from "@/app/games/[id]/page";
import { Socket } from "socket.io-client";

export const GameBoard = React.memo(({ gameData, socket, playerName }: {
    gameData: GameData;
    socket: Socket | null;
    playerName: string
}) => {
    const [highlightedColumn, setHighlightedColumn] = useState<number | null>(null);
    const handleColumnHover = useCallback((colIndex: number) => setHighlightedColumn(colIndex), []);
    const handleColumnLeave = useCallback(() => setHighlightedColumn(null), []);

    const handleCellClick = useCallback((i: number, j: number) => {
        if (!socket?.connected || !gameData) return;

        const currentPlayer = gameData.move_number % 2 === 0 ? gameData.player_2_username : gameData.player_1_username;
        if (currentPlayer !== playerName) return;

        socket.emit('move', {
            game_id: gameData.id,
            player: playerName,
            column: j
        });
    }, [socket, gameData, playerName]);

    return (
        <div className="relative w-full h-full perspective-1000">
            <div className={`
                h-full w-full
                rounded-[clamp(0.5rem,2vw,1rem)]
                p-[clamp(0.25rem,1.5vw,1rem)]
                bg-gradient-to-br from-sky-400/90 via-blue-500/90 to-indigo-600/90
                dark:from-slate-800/95 dark:via-slate-900/95 dark:to-indigo-900/95
                shadow-[0_clamp(0.25rem,2vw,0.5rem)_clamp(1rem,4vw,2rem)_rgba(0,0,0,0.1)]
                dark:shadow-[0_clamp(0.25rem,2vw,0.5rem)_clamp(1rem,4vw,2rem)_rgba(59,130,246,0.1)]
                border border-sky-200/30
                dark:border-indigo-500/20
                backdrop-filter backdrop-blur-lg
                transform-gpu transition-all duration-500
                hover:shadow-[0_clamp(0.5rem,3vw,0.75rem)_clamp(1.5rem,6vw,3rem)_rgba(0,0,0,0.15)]
                dark:hover:shadow-[0_clamp(0.5rem,3vw,0.75rem)_clamp(1.5rem,6vw,3rem)_rgba(59,130,246,0.15)]
                scale-100
            `}>
                <div className="w-full h-full flex items-center justify-center">
                    <div className="w-full h-full max-w-[min(90vmin,600px)] aspect-square">
                        <div
                            className="grid grid-cols-7 w-full h-full
                                gap-[clamp(0.25rem,1.5vw,0.75rem)]
                                p-[clamp(0.375rem,1.5vw,0.75rem)]
                                place-items-center"
                            role="grid"
                            aria-label="Connect Four Game Board"
                        >
                            {gameData.board.map((row: number[], rowIndex: number) => (
                                row.map((cell: number, colIndex: number) => (
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
                                ))
                            ))}
                        </div>
                    </div>
                </div>
            </div>
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
    const [isPressed, setIsPressed] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        setIsTouchDevice('ontouchstart' in window);
    }, []);

    const isHighlighted = useMemo(() => (
        !gameData.finished_at &&
        gameData.next_player_to_move_username === playerName &&
        highlightedColumn === colIndex &&
        cellValue === 0
    ), [gameData.finished_at, gameData.next_player_to_move_username, playerName, highlightedColumn, colIndex, cellValue]);

    const isPlayable = useMemo(() => (
        cellValue === 0 &&
        !gameData.finished_at &&
        gameData.next_player_to_move_username === playerName
    ), [cellValue, gameData.finished_at, gameData.next_player_to_move_username, playerName]);

    const cellStyle = useMemo(() => {
        const baseStyle = `
            aspect-square
            min-w-[26px] min-h-[26px]
            rounded-full
            w-full h-full
            box-border
            flex items-center justify-center
            transform-gpu transition-all duration-300
            cursor-${isPlayable ? 'pointer' : 'not-allowed'}
            relative
            select-none
            ${isPressed ? 'scale-90' : ''}
            ${isPlayable && !isTouchDevice ? 'hover:scale-105' : ''}
            focus:outline-none focus:ring-[clamp(0.125rem,0.5vw,0.25rem)] focus:ring-white/50
            shadow-[0_clamp(0.125rem,0.5vw,0.25rem)_clamp(0.5rem,1.5vw,1rem)_rgba(0,0,0,0.1)]
            m-0
        `;

        if (cellValue === 3) {
            return `
                ${baseStyle}
                bg-gradient-to-br from-emerald-400 to-green-500
                dark:from-emerald-500 dark:to-green-600
                shadow-[0_0_20px_rgba(16,185,129,0.4)]
                dark:shadow-[0_0_20px_rgba(16,185,129,0.6)]
                animate-pulse-slow
            `;
        }

        const tokenStyles = {
            1: `
                ${baseStyle}
                bg-gradient-to-br from-rose-400 to-pink-600
                dark:from-violet-500 dark:to-purple-700
                shadow-[0_0_12px_rgba(244,63,94,0.3)]
                dark:shadow-[0_0_12px_rgba(139,92,246,0.3)]
            `,
            2: `
                ${baseStyle}
                bg-gradient-to-br from-amber-300 to-yellow-500
                dark:from-cyan-400 dark:to-teal-600
                shadow-[0_0_12px_rgba(245,158,11,0.3)]
                dark:shadow-[0_0_12px_rgba(45,212,191,0.3)]
            `
        };

        return cellValue ? tokenStyles[cellValue as keyof typeof tokenStyles] : `
            ${baseStyle}
            bg-white/10
            dark:bg-white/5
            border-2 border-white/20
            dark:border-white/10
            ${isHighlighted ? 'bg-sky-400/20 dark:bg-indigo-400/20 animate-pulse' : ''}
        `;
    }, [cellValue, isHighlighted, isPlayable, isPressed, isTouchDevice]);

    const handlePress = useCallback(() => {
        if (isPlayable) {
            setIsPressed(true);
            setTimeout(() => setIsPressed(false), 150);
        }
    }, [isPlayable]);

    return (
        <button
            className={cellStyle}
            onClick={() => isPlayable && handleCellClick(rowIndex, colIndex)}
            onTouchStart={() => {
                handlePress();
                if (isPlayable) {
                    handleColumnHover(colIndex);
                }
            }}
            onTouchEnd={() => {
                handleColumnLeave();
                setIsPressed(false);
            }}
            onMouseDown={handlePress}
            onMouseEnter={() => isPlayable && handleColumnHover(colIndex)}
            onMouseLeave={() => {
                handleColumnLeave();
                setIsPressed(false);
            }}
            disabled={!isPlayable}
            role="gridcell"
            aria-label={`Place token in column ${colIndex + 1}`}
            aria-disabled={!isPlayable}
        />
    );
});

GameBoard.displayName = 'GameBoard';
GameBoardCell.displayName = 'GameBoardCell';
