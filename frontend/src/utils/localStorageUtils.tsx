export function setPlayerNameInLocalStorage(gameId: string, playerName: string, playerId: number): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(`game_${gameId}`, `${playerId},${playerName}`);
}

export function getPlayerNameFromLocalStorage(game_id: string): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(`game_${game_id}`);
}
