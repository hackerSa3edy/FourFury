
import React from "react";

interface ExitWarningDialogProps {
    setShowExitWarning: (show: boolean) => void;
    onExit: () => void;
}

export const ExitWarningDialog = ({ setShowExitWarning, onExit }: ExitWarningDialogProps) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-red-600">Warning!</h3>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
                If you leave the game now, you will forfeit and your opponent will be declared the winner. Are you sure?
            </p>
            <div className="flex justify-end space-x-4">
                <button
                    onClick={() => setShowExitWarning(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                    Stay
                </button>
                <button
                    onClick={onExit}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Leave Game
                </button>
            </div>
        </div>
    </div>
);
