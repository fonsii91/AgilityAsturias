import { Injectable, signal } from '@angular/core';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    toasts = signal<Toast[]>([]);
    private counter = 0;

    show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 3000) {
        const id = this.counter++;
        const toast: Toast = { id, message, type, duration };

        this.toasts.update(toasts => [...toasts, toast]);

        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }
    }

    success(message: string, duration: number = 3000) {
        this.show(message, 'success', duration);
    }

    error(message: string, duration: number = 4000) {
        this.show(message, 'error', duration);
    }

    info(message: string, duration: number = 3000) {
        this.show(message, 'info', duration);
    }

    warning(message: string, duration: number = 3000) {
        this.show(message, 'warning', duration);
    }

    remove(id: number) {
        this.toasts.update(toasts => toasts.filter(t => t.id !== id));
    }
}
