// Example improvements:
// 1. Minimal checks, consistent naming, short doc comments.
export function setPlayerNameInLocalStorage(
  gameId: string,
  username: string,
  playerNumber: 1 | 2
) {
  if (typeof window === 'undefined') return;
  if (!gameId || !username) return;
  const value = `${gameId},${username},${playerNumber}`;
  localStorage.setItem(`fourfury_${gameId}`, value);
  // Also set in cookie for middleware access
  document.cookie = `fourfury_${gameId}=${value}; path=/`;
}

export function getPlayerNameFromLocalStorage(gameId: string) {
  if (typeof window === 'undefined') return null;
  if (!gameId) return null;
  const stored = localStorage.getItem(`fourfury_${gameId}`);
  return stored || null;
}

export function delPlayerNameFromLocalStorage(gameId: string) {
  if (typeof window === 'undefined') return null;
  if (!gameId) return null;
  localStorage.removeItem(`fourfury_${gameId}`);
}

export function validateGameSession(gameId: string): boolean {
  if (typeof window === 'undefined') return false;
  const stored = getPlayerNameFromLocalStorage(gameId);
  if (!stored) return false;

  const [storedGameId, username, playerNumber] = stored.split(',');
  const isValid = storedGameId === gameId &&
                 !!username &&
                 (playerNumber === '1' || playerNumber === '2');

  // If invalid, clean up storage
  if (!isValid) {
    delPlayerNameFromLocalStorage(gameId);
  }

  return isValid;
}

export function getCurrentPlayer(gameId: string): { username: string; number: number } | null {
  if (typeof window === 'undefined') return null;
  const stored = getPlayerNameFromLocalStorage(gameId);
  if (!stored) return null;
  const [, username, playerNumber] = stored.split(',');
  return { username, number: parseInt(playerNumber, 10) };
}
