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
        after:w-5
        after:h-5
        after:top-1/2
        after:left-1/2
        after:-translate-x-1/2
        after:-translate-y-1/2
        after:border-3
        after:border-white/80
        after:border-t-transparent
        after:rounded-full
        after:animate-spin
        after:backdrop-blur-sm
    `;

    const variantStyles = {
        primary: 'from-purple-600/90 via-blue-600/90 to-purple-600/90 bg-[length:200%_100%]',
        secondary: 'from-gray-500/90 to-gray-600/90',
        danger: 'from-red-500/90 to-red-600/90'
    };

    return (
        <button
            type={type}
            onClick={onClickHandler}
            disabled={disabled}
            aria-disabled={disabled}
            aria-label={ariaLabel}
            className={`
                relative
                w-full
                bg-gradient-to-r
                ${variantStyles[variant]}
                backdrop-blur-sm
                text-white
                font-bold
                py-3.5 px-7
                rounded-xl
                transform-gpu transition-all duration-300
                focus:outline-none
                focus:ring-4
                focus:ring-purple-500/30
                focus:ring-offset-2
                active:scale-[0.98]
                animate-gradient-x
                ${disabled
                    ? 'opacity-60 cursor-not-allowed bg-gray-400/80 backdrop-blur-sm'
                    : `
                        hover:shadow-xl
                        hover:shadow-purple-500/25
                        hover:bg-[length:300%_100%]
                        active:shadow-purple-500/15
                        motion-safe:hover:animate-shimmer
                    `
                }
                before:content-['']
                before:absolute
                before:inset-0
                before:rounded-xl
                before:bg-gradient-to-br
                before:from-white/20
                before:to-transparent
                before:opacity-0
                before:transition-opacity
                before:duration-300
                hover:before:opacity-100
                active:before:opacity-50
                ${disabled && label.toLowerCase().includes('loading') ? loadingAnimation : ''}
                will-change-transform
                motion-reduce:transform-none
                select-none
            `}
        >
            <span className={`
                relative
                inline-flex
                items-center
                justify-center
                transition-opacity duration-200
                ${disabled && label.toLowerCase().includes('loading') ? 'opacity-0' : 'opacity-100'}
            `}>
                {label}
            </span>
            {disabled && label.toLowerCase().includes('loading') && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-3 border-white/80 border-t-transparent rounded-full animate-spin" />
                </div>
            )}
        </button>
    );
});

FourFuryButton.displayName = 'FourFuryButton';
