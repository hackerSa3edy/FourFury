import { memo } from 'react';

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

FourFuryButton.displayName = 'FourFuryButton';
