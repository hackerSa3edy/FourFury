import Link from 'next/link';

export const ErrorMessage = ({ message }: { message: string }) => (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="p-4 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-xl border border-red-200 dark:border-red-800">
            <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p className="text-base font-medium text-red-600 dark:text-red-400">{message}</p>
            </div>
        </div>
    </div>
);

export const GameNotFoundError = () => (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/30 dark:to-emerald-900/30">
        <div className="absolute inset-0 opacity-30 dark:opacity-20">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-300 dark:bg-emerald-600 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 dark:bg-blue-600 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 dark:bg-indigo-600 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
        <div className="relative w-full h-full flex items-center justify-center p-4">
            <div className="max-w-md p-8 rounded-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg shadow-xl border border-red-100 dark:border-red-900 text-center transform transition-all duration-300 hover:scale-105">
                <div className="mb-4">
                    <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Game Not Found</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    This battle arena doesn&apos;t exist or has already concluded!
                </p>
                <Link
                    href="/"
                    className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                    Return to Homepage
                </Link>
            </div>
        </div>
    </div>
);


export const LoadingSpinner = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/30 dark:to-emerald-900/30">
        <div className="relative p-8 rounded-2xl bg-white/90 dark:bg-gray-800/90 shadow-2xl">
            <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-300 dark:bg-emerald-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 dark:bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 dark:bg-indigo-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
                </div>
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-xl font-medium bg-gradient-to-r from-emerald-600 to-blue-600 dark:from-emerald-400 dark:to-blue-400 bg-clip-text text-transparent">
                    Loading Game...
                </div>
            </div>
        </div>
    </div>
);

export const ConnectionErrorMessage = ({ message }: { message: string }) => (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/30 dark:to-emerald-900/30">
        <div className="w-full h-full flex items-center justify-center p-4">
            <div className="max-w-md p-8 rounded-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg shadow-xl border border-red-100 dark:border-red-900 text-center">
                <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-red-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Connection Error</h3>
                <p className="text-gray-600 dark:text-gray-400">
                    {message}
                </p>
                <div className="flex space-x-4 justify-center">
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg transition-all duration-200 transform hover:scale-105"
                    >
                        Retry Connection
                    </button>
                    <Link
                        href="/"
                        className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white rounded-lg transition-all duration-200 transform hover:scale-105"
                    >
                        Return Home
                    </Link>
                </div>
            </div>
        </div>
    </div>
);
