import React, { useState, useCallback, useMemo } from "react";
import { GameData } from "@/app/games/[id]/page";
import { Socket } from "socket.io-client";

export const GameBoard = React.memo(({ gameData, socket, playerName }: { gameData: GameData; socket: Socket | null; playerName: string }) => {
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
                p-6 md:p-8
                shadow-[0_0_15px_rgba(0,0,0,0.1)]
                dark:shadow-[0_0_15px_rgba(14,165,233,0.2)]
                bg-gradient-to-br from-cyan-500/90 to-blue-600/90
                dark:from-slate-800/90 dark:to-cyan-900/90
                backdrop-blur-md
                border border-cyan-400/30
                dark:border-cyan-500/30
                transition-all duration-500
                hover:shadow-[0_0_25px_rgba(0,0,0,0.15)]
                dark:hover:shadow-[0_0_25px_rgba(14,165,233,0.3)]
                max-h-[80vh] overflow-y-auto
                relative
                before:absolute before:inset-0
                before:bg-gradient-to-br before:from-white/5 before:to-transparent
                before:rounded-xl
            `}
        >
            <div className="relative z-10">
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

    const isWinningCell = useMemo(() => {
        return cellValue === 3;
    }, [cellValue]);

    const cellStyle = useMemo(() => {
        const baseStyle = `
            aspect-square w-8 sm:w-10 md:w-12 lg:w-14 xl:w-16
            rounded-full
            transform transition-all duration-300
            cursor-${isPlayable ? 'pointer' : 'not-allowed'}
            relative
            before:absolute before:inset-0
            before:rounded-full
            before:transition-opacity
            before:duration-300
            after:absolute after:inset-0
            after:rounded-full
            after:transition-opacity
            after:duration-300
            hover:scale-110
            hover:z-10
        `;

        const glowStyle = `
            shadow-lg
            ${isHighlighted ? 'animate-pulse' : ''}
            hover:shadow-[0_0_15px_rgba(255,255,255,0.5)]
        `;

        if (isWinningCell) {
            return `
                ${baseStyle}
                ${glowStyle}
                bg-gradient-to-br from-green-400 to-emerald-500
                dark:from-emerald-400 dark:to-green-600
                before:bg-gradient-to-br before:from-white/30 before:to-transparent
                after:bg-[radial-gradient(circle_at_50%_120%,rgba(0,255,0,0.4),transparent_70%)]
                animate-winning-cell
                hover:from-green-300 hover:to-emerald-400
                dark:hover:from-emerald-300 dark:hover:to-green-500
                hover:shadow-[0_0_20px_rgba(34,197,94,0.6)]
            `;
        }

        if (cellValue === 1) {
            return `
                ${baseStyle}
                ${glowStyle}
                bg-gradient-to-br from-red-400 to-rose-500
                dark:from-violet-500 dark:to-purple-600
                before:bg-gradient-to-br before:from-white/30 before:to-transparent
                after:bg-[radial-gradient(circle_at_50%_120%,rgba(255,192,203,0.3),transparent_70%)]
                hover:from-pink-400 hover:to-rose-500
                dark:hover:from-violet-400 dark:hover:to-purple-500
                hover:shadow-[0_0_20px_rgba(255,182,193,0.6)]
                dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.6)]
            `;
        }

        if (cellValue === 2) {
            return `
                ${baseStyle}
                ${glowStyle}
                bg-gradient-to-br from-amber-300 to-yellow-500
                dark:from-teal-500 dark:to-cyan-600
                before:bg-gradient-to-br before:from-white/30 before:to-transparent
                after:bg-[radial-gradient(circle_at_50%_120%,rgba(173,216,230,0.3),transparent_70%)]
                hover:from-orange-300 hover:to-amber-400
                dark:hover:from-teal-400 dark:hover:to-cyan-500
                hover:shadow-[0_0_20px_rgba(251,191,36,0.6)]
                dark:hover:shadow-[0_0_20px_rgba(45,212,191,0.6)]
            `;
        }

        return `
            ${baseStyle}
            backdrop-blur-sm
            border-2 border-white/30
            dark:border-white/10
            ${isHighlighted ? 'bg-gradient-to-br from-sky-500/90 to-indigo-600/90 shadow-lg animate-pulse' : 'bg-white/10 dark:bg-white/5'}
            before:bg-gradient-to-br before:from-white/20 before:to-transparent
            hover:before:opacity-100
            after:bg-[radial-gradient(circle_at_50%_120%,rgba(186,230,253,0.3),transparent_70%)]
            hover:after:opacity-100
            hover:border-white/50
            dark:hover:border-white/20
            hover:bg-sky-400/20
            dark:hover:bg-indigo-400/20
            hover:shadow-[0_0_15px_rgba(186,230,253,0.4)]
            dark:hover:shadow-[0_0_15px_rgba(129,140,248,0.3)]
        `;
    }, [cellValue, isHighlighted, isPlayable, isWinningCell]);

    return (
        <td
            className="p-1.5 md:p-2"
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

GameBoardCell.displayName = 'GameBoardCell';
GameBoard.displayName = 'GameBoard';
