import { useId, memo } from 'react';

interface PlayerNameInputProps {
    label: string;
    value: string;
    onChangeHandler: (value: string) => void;
    error?: string;
    placeholder?: string;
    maxLength?: number;
    minLength?: number;
    disabled?: boolean;
    id?: string;
    ariaLabel?: string;
    autoFocus?: boolean;
}

export const PlayerNameInput = memo(function PlayerNameInput({
    label,
    value,
    onChangeHandler,
    error,
    placeholder = "Enter your name",
    maxLength = 30,
    minLength = 2,
    disabled = false,
    ariaLabel,
    autoFocus = false
}: PlayerNameInputProps) {
    const inputId = useId();
    const errorId = `${inputId}-error`;
    const hasError = Boolean(error);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Improved validation with more robust regex
        if (/^[a-zA-Z\s]*$/.test(value) || value === '') {
            const sanitizedValue = value
                .replace(/\s+/g, ' ')
                .replace(/^\s+/, ''); // Trim leading spaces in real-time
            onChangeHandler(sanitizedValue);
        }
    };

    return (
        <div className="flex flex-col space-y-2 sm:space-y-3">
            <label className="font-semibold text-sm sm:text-base text-gray-700 dark:text-gray-200 tracking-wide">
                {label}
            </label>
            <input
                id={inputId}
                name={inputId}
                type="text"
                required
                disabled={disabled}
                maxLength={maxLength}
                minLength={minLength}
                value={value}
                placeholder={placeholder}
                onChange={handleChange}
                onBlur={() => onChangeHandler(value.trim())}
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : undefined}
                aria-label={ariaLabel}
                autoFocus={autoFocus}
                autoComplete="off"
                spellCheck="false"
                className={`
                    w-full px-4 py-3 sm:py-3.5
                    text-base sm:text-lg
                    rounded-xl border-2 outline-none
                    bg-white/80 dark:bg-gray-700/80
                    text-gray-700 dark:text-gray-200
                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                    ${hasError
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-indigo-200 hover:border-indigo-300 focus:border-indigo-500 dark:border-gray-600 dark:hover:border-gray-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20'
                    }
                    transition-all duration-200
                    disabled:opacity-60 disabled:cursor-not-allowed
                    backdrop-blur-sm
                `}
            />
            {hasError && (
                <p
                    id={errorId}
                    role="alert"
                    className="text-sm text-red-500 dark:text-red-400 font-medium pl-1 animate-fadeIn"
                >
                    {error}
                </p>
            )}
        </div>
    );
});

PlayerNameInput.displayName = 'PlayerNameInput';
