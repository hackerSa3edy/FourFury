import { memo } from 'react';
import { useRouter } from 'next/navigation';

interface FourFuryButtonProps {
    label: string;
    onClickHandler: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    ariaLabel?: string;
    variant?: 'primary' | 'secondary' | 'danger';
}

export const FourFuryButton = memo(function FourFuryButton({
    label,
    onClickHandler,
    disabled = false,
    type = 'button',
    ariaLabel,
    variant = 'primary'
}: FourFuryButtonProps) {
    const loadingAnimation = `
        after:content-['']
        after:absolute
        after:w-5 after:h-5 sm:after:w-6 sm:after:h-6
        after:top-1/2 after:left-1/2
        after:-translate-x-1/2 after:-translate-y-1/2
        after:border-3 after:border-white/90
        after:border-t-transparent
        after:rounded-full after:animate-spin
        after:backdrop-blur-sm
    `;

    const variantStyles: Record<string, string> = {
        primary: 'from-indigo-600/95 via-blue-600/95 to-violet-600/95 bg-[length:200%_100%]',
        secondary: 'from-slate-600/90 to-gray-600/90',
        danger: 'from-rose-600/90 to-red-600/90',
    };

    return (
        <button
            type={type}
            onClick={onClickHandler}
            disabled={disabled}
            aria-disabled={disabled}
            aria-label={ariaLabel}
            className={`
                relative w-full
                bg-gradient-to-r ${variantStyles[variant]}
                text-white font-bold
                py-3 sm:py-4 px-6 sm:px-8
                text-sm sm:text-base
                rounded-xl
                transform-gpu transition-all duration-300
                focus:outline-none focus:ring-4
                focus:ring-indigo-500/40 focus:ring-offset-2
                active:scale-[0.98] animate-gradient-x
                ${
                    disabled
                        ? 'opacity-60 cursor-not-allowed bg-gray-400/80 backdrop-blur-sm'
                        : 'hover:shadow-lg hover:shadow-indigo-500/20 hover:bg-[length:300%_100%] active:shadow-indigo-500/10 motion-safe:hover:animate-shimmer'
                }
                before:content-['']
                before:absolute
                before:inset-0
                before:rounded-xl
                before:bg-gradient-to-b
                before:from-white/20
                before:to-transparent
                before:opacity-0
                before:transition-opacity
                before:duration-300
                hover:before:opacity-100
                active:before:opacity-40
                ${disabled && label.toLowerCase().includes('loading') ? loadingAnimation : ''}
                will-change-transform
                motion-reduce:transform-none
                select-none
            `}
        >
            {/* Inner label span */}
            <span
                className={`
                    relative inline-flex items-center justify-center
                    transition-opacity duration-200
                    ${disabled && label.toLowerCase().includes('loading') ? 'opacity-0' : 'opacity-100'}
                `}
            >
                {label}
            </span>
        </button>
    );
});

interface RematchButtonProps {
    rematchStatus: string;
    onRematch: () => void;
    onCancelRematch: () => void;
}

export const RematchButton = memo(function RematchButton({
    rematchStatus,
    onRematch,
    onCancelRematch
}: RematchButtonProps) {
    if (rematchStatus === 'waiting') {
        return (
            <button
                onClick={onCancelRematch}
                className="px-8 py-3 min-w-[180px] bg-gradient-to-r from-red-500 to-rose-600
                         text-white rounded-xl font-medium shadow-lg
                         transform transition-all duration-300
                         hover:scale-105 hover:shadow-xl
                         active:scale-95
                         border border-red-400/50
                         dark:from-red-600 dark:to-rose-700"
            >
                Cancel Request
            </button>
        );
    }

    return (
        <button
            onClick={onRematch}
            disabled={rematchStatus === 'waiting'}
            className="px-8 py-3 min-w-[180px] bg-gradient-to-r from-emerald-500 to-cyan-500
                     text-white rounded-xl font-medium shadow-lg
                     transform transition-all duration-300
                     hover:scale-105 hover:shadow-xl
                     active:scale-95
                     border border-emerald-400/50
                     dark:from-emerald-600 dark:to-cyan-600
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
            Play Again
        </button>
    );
});

interface ReplayButtonProps {
    onReplay: () => void;
}

export const ReplayButton = memo(function ReplayButton({ onReplay }: ReplayButtonProps) {
    return (
        <button
            onClick={onReplay}
            className="px-8 py-3 min-w-[180px] bg-gradient-to-r from-violet-500 to-purple-600
                     text-white rounded-xl font-medium shadow-lg
                     transform transition-all duration-300
                     hover:scale-105 hover:shadow-xl
                     active:scale-95
                     border border-violet-400/50
                     dark:from-violet-600 dark:to-purple-700"
        >
            <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Replay Game
            </div>
        </button>
    );
});

interface HomeButtonProps {
    onClick?: () => void;
}

export const HomeButton = memo(function HomeButton({ onClick }: HomeButtonProps) {
    const router = useRouter();

    const handleClick = () => {
        if (onClick) {
            onClick();
            return;
        }
        router.push('/modes');
    };

    return (
        <button
            onClick={handleClick}
            className="fixed top-4 left-4 p-3 rounded-full bg-white/90 dark:bg-slate-800/90
                     shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300
                     border border-cyan-200 dark:border-cyan-800 group z-50"
            aria-label="Return to home"
        >
            <div className="relative">
                <svg
                    className="w-6 h-6 text-cyan-600 dark:text-cyan-400 transform transition-transform duration-300
                             group-hover:-translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                </svg>
                <span className="absolute left-full ml-2 px-2 py-1 text-sm font-medium text-cyan-600 dark:text-cyan-400
                               bg-white/90 dark:bg-slate-800/90 rounded-md opacity-0 group-hover:opacity-100
                               transition-opacity duration-300 whitespace-nowrap">
                    Return Home
                </span>
            </div>
        </button>
    );
});

HomeButton.displayName = 'HomeButton';
FourFuryButton.displayName = 'FourFuryButton';
RematchButton.displayName = 'RematchButton';
ReplayButton.displayName = 'ReplayButton';
