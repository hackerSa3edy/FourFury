"use client";

import { BACKEND_API_BASE_URL, BACKEND_WS_BASE_URL } from "@/constants";
import { useEffect, useState } from "react";
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


export default function PlayGame() {
    const { id } = useParams();
    const [data, setData] = useState<GameData | null>(null);
    const [isLoading, setLoading] = useState(true);
    const [ws, setWs] = useState<WebSocket | null>(null);

    useEffect(() => {
        const ws = new WebSocket(`${BACKEND_WS_BASE_URL}/games/ws/${id}/`);
        ws.addEventListener("open", () => {
            fetch(`${BACKEND_API_BASE_URL}/games/${id}/`)
                .then((response) => {
                    if (!response.ok) throw new Error();
                    return response.json();
                })
                .then((data) => {
                    setData(data);
                    setLoading(false);
                })
                .catch((err) => {
                    console.log("Something went wrong", err);
                });
        });
        ws.addEventListener("message", (event) => {
            const data = JSON.parse(JSON.parse(event.data));
            setData(data);
        });
        setWs(ws);

        // clean up WS connection when the component is unmounted
        return () => {
            ws.close();
        };
    }, [id]);

    if (isLoading) return <div className="text-black">loading...</div>;
    if (!data) return <div className="text-black">no data</div>;

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
            <GameBoard gameData={data} ws={ws} />
        </div>
    );
}

function GameInfo({ gameData }: { gameData: GameData }) {
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
}

function GameBoard({gameData, ws}: {gameData: GameData; ws: WebSocket | null}) {
    const handleCellClick = (i: number, j: number) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            const payload = {
                player: gameData.move_number % 2 === 0 ? gameData.player_1 : gameData.player_2,
                column: j,
            };
            ws.send(JSON.stringify(payload));
        }
    };

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
}

function GameBoardCell({
    rowIndex,
    colIndex,
    cellValue,
    handleCellClick,
}: {
    rowIndex: number;
    colIndex: number;
    cellValue: number;
    handleCellClick: (i: number, j: number) => void;
}) {
    return (
        <td
            key={`cell-${rowIndex}-${colIndex}`}
        >
            <button
                className={`
                    h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-14 lg:w-14 xl:h-16 xl:w-16 3xl:h-20 3xl:w-20
                    rounded-full border-2 transition duration-200 border-cyan-100 dark:border-violet-300
                    ${cellValue === 1
                        ? "bg-red-400 dark:bg-purple-500"
                        : cellValue === 2
                            ? "bg-yellow-300 dark:bg-blue-600"
                            : cellValue == 3
                                ? "bg-green-400 dark:bg-green-600"
                                : ""
                    }
                `}
                onClick={() => handleCellClick(rowIndex, colIndex)}
            ></button>
        </td>
    );
}
