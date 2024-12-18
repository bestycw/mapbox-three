export class EventEmitter {
    private events: { [key: string]: ((...args: any[]) => void)[] } = {};

    on(event: string, listener: (...args: any[]) => void): void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    emit(event: string, ...args: any[]): void {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(...args));
        }
    }

    removeListener(event: string, listener: (...args: any[]) => void): void {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(l => l !== listener);
        }
    }

    removeAllListeners(): void {
        this.events = {};
    }
} 