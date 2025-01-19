import { ErrorState } from '@/types/error';

export const handleError = (error: unknown): ErrorState => {
    if (error instanceof Error) {
        switch (error.message) {
            case 'Failed to create session':
                return {
                    message: 'Session creation failed. Please refresh the page.',
                    type: 'fatal'
                };
            default:
                return {
                    message: error.message,
                    type: 'popup',
                    duration: 5000
                };
        }
    }

    if (typeof error === 'object' && error !== null && 'status' in error) {
        const typedError = error as { status: number; detail?: string };
        switch (typedError.status) {
            case 400:
                if (typedError.detail?.includes("own game")) {
                    return {
                        message: "You cannot join your own game",
                        type: 'popup',
                        duration: 3000
                    };
                }
                if (typedError.detail?.includes("already full")) {
                    return {
                        message: "This game is already full",
                        type: 'fatal'
                    };
                }
                return {
                    message: typedError.detail || "Invalid request",
                    type: 'popup',
                    duration: 3000
                };
            case 401:
                return {
                    message: "Session expired. Please refresh the page",
                    type: 'fatal'
                };
            case 403:
                return {
                    message: "You are not authorized to perform this action",
                    type: 'fatal'
                };
            case 404:
                return {
                    message: "Game not found",
                    type: 'fatal'
                };
            case 408:
                return {
                    message: "Request timed out. Please try again",
                    type: 'popup',
                    duration: 5000
                };
            case 429:
                return {
                    message: "Too many requests. Please wait a moment",
                    type: 'popup',
                    duration: 5000
                };
            case 500:
                return {
                    message: "Server error. Please try again later",
                    type: 'fatal'
                };
            case 502:
                return {
                    message: "Server is temporarily unavailable. Please try again later",
                    type: 'fatal'
                };
            default:
                return {
                    message: typedError.detail || "An unexpected error occurred",
                    type: 'popup',
                    duration: 5000
                };
        }
    }

    return {
        message: "Connection error. Please check your internet connection",
        type: 'fatal'
    };
};
