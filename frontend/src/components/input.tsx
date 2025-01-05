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
    id = "playerNameInput",
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
        <div className="w-full">
            <label
                htmlFor={inputId}
                className={`
                    block text-sm font-medium mb-1
                    ${hasError
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-gray-700 dark:text-gray-300'}
                `}
            >
                {label}
            </label>
            <div className="relative">
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
                        w-full px-3 py-2
                        rounded-lg border-2 transition-all duration-200
                        bg-white/90 dark:bg-gray-800/90
                        placeholder:text-gray-400 dark:placeholder:text-gray-500
                        ${hasError
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-400 dark:focus:border-red-400'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:focus:border-blue-400'}
                        ${disabled
                            ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-900'
                            : 'hover:border-gray-400 dark:hover:border-gray-500'}
                        focus:outline-none focus:ring-2 focus:ring-opacity-50
                        transform-gpu transition-transform
                        focus:scale-[1.02]
                        will-change-transform
                        motion-reduce:transform-none
                    `}
                />
                {hasError && (
                    <p
                        id={errorId}
                        role="alert"
                        className="mt-1 text-sm text-red-500 dark:text-red-400 animate-fadeIn"
                    >
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
});

PlayerNameInput.displayName = 'PlayerNameInput';
