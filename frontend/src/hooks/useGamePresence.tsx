import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { GameData } from '@/app/games/[id]/page';

interface PlayerPresence {
    status: 'online' | 'offline';
    countdown?: number;
}

interface PresenceState {
    [username: string]: PlayerPresence;
}

export function useGamePresence(socket: Socket | null, data: GameData | null) {
    const [presenceState, setPresenceState] = useState<PresenceState>({});
    const [countdowns, setCountdowns] = useState<{[key: string]: number}>({});

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

        const handlePresenceChange = (data: { username: string; status: 'online' | 'offline' }) => {
            setPresenceState(prev => ({
                ...prev,
                [data.username]: { status: data.status }
            }));

            // Emit an event that other hooks can listen to
            const event = new CustomEvent('playerPresenceChanged', {
                detail: { username: data.username, status: data.status }
            });
            window.dispatchEvent(event);
        };

        const handleCountdownStart = (data: { username: string; countdown: number }) => {
            setPresenceState(prev => ({
                ...prev,
                [data.username]: { status: 'offline', countdown: data.countdown }
            }));

            setCountdowns(prev => ({
                ...prev,
                [data.username]: data.countdown
            }));
        };

        const handleCountdownCancel = (data: { username: string }) => {
            setPresenceState(prev => ({
                ...prev,
                [data.username]: { status: 'online' }
            }));

            setCountdowns(prev => {
                const newCountdowns = { ...prev };
                delete newCountdowns[data.username];
                return newCountdowns;
            });
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        socket.on('presence_changed', handlePresenceChange);
        socket.on('countdown_started', handleCountdownStart);
        socket.on('countdown_cancelled', handleCountdownCancel);

        if (data?.id) {
            socket.emit('presence_update', {
                game_id: data.id,
                status: 'online'
            });
        }

        const countdownInterval = setInterval(() => {
            setCountdowns(prev => {
                const newCountdowns = { ...prev };
                Object.keys(newCountdowns).forEach(username => {
                    if (newCountdowns[username] > 0) {
                        newCountdowns[username]--;
                    }
                });
                return newCountdowns;
            });
        }, 1000);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            socket.off('presence_changed', handlePresenceChange);
            socket.off('countdown_started', handleCountdownStart);
            socket.off('countdown_cancelled', handleCountdownCancel);
            clearInterval(countdownInterval);
        };
    }, [socket, data]);

    return { presenceState, countdowns };
}
