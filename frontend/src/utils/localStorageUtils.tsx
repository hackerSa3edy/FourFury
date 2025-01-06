// Example improvements:
// 1. Minimal checks, consistent naming, short doc comments.
export function setPlayerNameInLocalStorage(
  gameId: string,
  name: string,
  playerNumber: 1 | 2
) {
  if (typeof window === 'undefined') return;
  if (!gameId || !name) return;
  localStorage.setItem(
    `fourfury_${gameId}`,
    `${gameId},${name},${playerNumber}`
  );
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
