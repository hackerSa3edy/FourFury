import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { GameData } from '@/app/games/[id]/page';

interface PlayerPresence {
    status: 'online' | 'offline';
    countdown?: number | null | undefined;
}

interface PresenceState {
    [username: string]: PlayerPresence;
}

export function useGamePresence(socket: Socket | null, data: GameData | null) {
    const [presenceState, setPresenceState] = useState<PresenceState>({});
    const [forfeitMessage, setForfeitMessage] = useState<string>('');

    useEffect(() => {
        if (!socket || !data || data.mode === 'ai') return;

        const handleVisibilityChange = () => {
            if (data?.id) {
                socket.emit('presence_update', {
                    game_id: data.id,
                    status: document.hidden ? 'offline' : 'online'
                });
            }
        };

        const handleCountdownUpdate = (data: { username: string; countdown: number | null; status: 'online' | 'offline' }) => {
            setPresenceState(prev => ({
                ...prev,
                [data.username]: {
                    status: data.status,
                    countdown: data.countdown ?? undefined
                }
            }));

            // Emit an event that other hooks can listen to
            const event = new CustomEvent('playerPresenceChanged', {
                detail: { username: data.username, status: data.status, countdown: data.countdown ?? undefined }
            });
            window.dispatchEvent(event);
        };

        const handleForfeit = (data: { username: string; message: string }) => {
            setForfeitMessage(data.message);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        socket.on('countdown_update', handleCountdownUpdate);
        socket.on('forfeit_game', handleForfeit);

        if (data?.id) {
            socket.emit('presence_update', {
                game_id: data.id,
                status: (!document.hidden) ? 'online' : 'offline'
            });
        }

        const countdownInterval = setInterval(() => {
            setPresenceState(prev => {
                const newState = { ...prev };
                Object.keys(newState).forEach(username => {
                    if (newState[username].countdown && newState[username].countdown! > 0) {
                        newState[username] = {
                            ...newState[username],
                            countdown: newState[username].countdown! - 1
                        };
                    }
                });
                return newState;
            });
        }, 1000);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            socket.off('countdown_update', handleCountdownUpdate);
            socket.off('forfeit_game', handleForfeit);
            clearInterval(countdownInterval);
        };
    }, [socket, data]);

    return { presenceState, forfeitMessage };
}
