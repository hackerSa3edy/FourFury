import { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { clearFourFuryCookie, setFourFuryCookie, getCurrentPlayer } from "@/utils/localStorageUtils";

interface RematchRequest {
    requestedBy: string;
    requesterName: string;
}

export function useGameRematch(socket: Socket | null, gameId: string, playerName: string | undefined) {
    const [rematchStatus, setRematchStatus] = useState<string>('idle');
    const [rematchRequest, setRematchRequest] = useState<RematchRequest | null>(null);
    const [rematchError, setRematchError] = useState<string | null>(null);
    const router = useRouter();

    const handleRematch = useCallback(() => {
        if (!socket || !gameId) return;
        setRematchStatus('requesting');
        console.log('Requesting rematch:', gameId);
        socket.emit('request_rematch', gameId);
    }, [socket, gameId]);

    const handleCancelRematch = useCallback(() => {
        if (!socket || !gameId) return;
        socket.emit('cancel_rematch', gameId);
        setRematchStatus('idle');
    }, [socket, gameId]);

    const handleAcceptRematch = useCallback(() => {
        if (!socket || !gameId) return;
        socket.emit('accept_rematch', gameId);
        setRematchRequest(null);
    }, [socket, gameId]);

    const handleDeclineRematch = useCallback(() => {
        if (!socket || !gameId) return;
        socket.emit('decline_rematch', gameId);
        setRematchRequest(null);
    }, [socket, gameId]);

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
            const player = getCurrentPlayer(gameId);

            if (!player) {
                console.error('No player found in local storage');
                return;
            }

            clearFourFuryCookie();
            setFourFuryCookie(data.game_id, player.username, player.number as 1 | 2);
            router.push(`/games/${data.game_id}`);
        });

        socket.on('rematch_declined', () => {
            setRematchStatus('declined');
            setRematchRequest(null);
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
            setRematchRequest(null);
        });

        socket.on('opponent_disconnected', () => {
            console.log('Opponent disconnected');
            if (rematchStatus === 'waiting' || rematchRequest) {
                setRematchStatus('idle');
                setRematchRequest(null);
                setRematchError('Opponent left the game');
                setTimeout(() => {
                    setRematchError(null);
                    router.push('/');
                }, 3500);
            }
        });

        const handlePresenceChanged = (event: CustomEvent) => {
            const { status } = event.detail;
            if (status === 'offline' && rematchStatus === 'waiting') {
                setRematchError('Opponent left the game');
                setRematchStatus('idle');
                setTimeout(() => {
                    setRematchError(null);
                    router.push('/');
                }, 3500);
            }
        };

        window.addEventListener('playerPresenceChanged', handlePresenceChanged as EventListener);

        return () => {
            socket.off('rematch_requested');
            socket.off('rematch_started');
            socket.off('rematch_declined');
            socket.off('rematch_error');
            socket.off('rematch_cancelled');
            socket.off('opponent_disconnected');
            window.removeEventListener('playerPresenceChanged', handlePresenceChanged as EventListener);
        };
    }, [socket, playerName, router, gameId, rematchStatus, rematchRequest]);

    return {
        rematchStatus,
        rematchRequest,
        rematchError,
        handleRematch,
        handleCancelRematch,
        handleAcceptRematch,
        handleDeclineRematch,
    };
}
