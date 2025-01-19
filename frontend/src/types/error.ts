export interface ErrorState {
    message: string;
    type: 'popup' | 'fatal' | 'validation';
    duration?: number;
}
