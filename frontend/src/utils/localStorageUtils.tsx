// Example improvements:
// 1. Minimal checks, consistent naming, short doc comments.
export function setFourFuryCookie(
  gameId: string,
  username: string,
  playerNumber: 1 | 2
) {
  if (typeof window === 'undefined') return;
  if (!gameId || !username) return;
  const value = `${gameId},${username},${playerNumber}`;
  localStorage.setItem('game_id', value);
  // Also set in cookie for middleware access
  document.cookie = `game_id=${value}; path=/`;
}

export function getFourFuryCookie(gameId: string) {
  if (typeof window === 'undefined') return null;
  if (!gameId) return null;
  const stored = localStorage.getItem('game_id');
  return stored || null;
}


export function validateGameSession(gameId: string): boolean {
  if (typeof window === 'undefined') return false;
  const stored = getFourFuryCookie(gameId);
  if (!stored) return false;

  const [storedGameId, username, playerNumber] = stored.split(',');
  const isValid = storedGameId === gameId &&
                 !!username &&
                 (playerNumber === '1' || playerNumber === '2');

  // If invalid, clean up storage
  if (!isValid) {
    clearFourFuryCookie();
  }

  return isValid;
}

export function getCurrentPlayer(gameId: string): { username: string; number: number } | null {
  if (typeof window === 'undefined') return null;
  const stored = getFourFuryCookie(gameId);
  if (!stored) return null;
  const [, username, playerNumber] = stored.split(',');
  return { username, number: parseInt(playerNumber, 10) };
}

export function clearFourFuryCookie() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('game_id');

}
