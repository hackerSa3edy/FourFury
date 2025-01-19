import { memo } from 'react';

interface ModeButtonProps {
    mode: string;
    currentMode: "human" | "online" | "ai";
    onClick: (mode: "human" | "online" | "ai") => void;
}

const ModeButton = memo(function ModeButton({ mode, currentMode, onClick }: ModeButtonProps) {
    const getIcon = () => {
        if (mode === "human") return "👥";
        if (mode === "online") return "🌐";
        return "🤖";
    };

    const getLabel = () => {
        if (mode === "human") return "Local";
        if (mode === "online") return "Online";
        return "AI";
    };

    const getTooltip = () => {
        if (mode === "human") return "Local Multiplayer Battle 🤝";
        if (mode === "online") return "Play Online with Friends 🌍";
        return "Test Your Skills vs AI 🎯";
    };

    return (
        <button
            type="button"
            onClick={() => onClick(mode as "human" | "online" | "ai")}
            className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg transition-all duration-300 relative group z-50 min-w-[80px] sm:min-w-[100px]
                ${currentMode === mode
                    ? "bg-gradient-to-r from-emerald-600 to-blue-600 text-white transform scale-105"
                    : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
                }`}
        >
            <div className="flex flex-col items-center space-y-0.5 sm:space-y-1">
                <span className="text-lg sm:text-xl md:text-2xl">{getIcon()}</span>
                <span className="text-xs sm:text-sm md:text-base font-medium">{getLabel()}</span>
            </div>
            <div className="absolute -bottom-10 sm:-bottom-12 left-1/2 transform -translate-x-1/2 w-max pointer-events-none">
                <div className="bg-gray-800/80 dark:bg-gray-900/80 text-white px-2 sm:px-3 py-1 rounded-md
                    text-[10px] sm:text-xs md:text-sm opacity-0 group-hover:opacity-100 transition-all duration-300
                    shadow-lg relative whitespace-nowrap">
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2
                        border-[3px] sm:border-4 border-transparent border-b-gray-800/80 dark:border-b-gray-900/80">
                    </div>
                    {getTooltip()}
                </div>
            </div>
        </button>
    );
});

ModeButton.displayName = 'ModeButton';

export default ModeButton;
