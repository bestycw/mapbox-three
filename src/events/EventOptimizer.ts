import { PERFORMANCE_CONFIG } from '../config/performance';
import { Logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';
import { EventError } from '../utils/Errors';

type EventCallback = (event: any) => void;

/**
 * Manages event optimization and throttling
 */
export class EventOptimizer {
    private static instance: EventOptimizer;
    private throttledHandlers: Map<string, Map<string, ThrottledHandler>>;
    private logger: Logger;
    private errorHandler: ErrorHandler;

    private constructor() {
        this.throttledHandlers = new Map();
        this.logger = Logger.getInstance();
        this.errorHandler = ErrorHandler.getInstance();
    }

    public static getInstance(): EventOptimizer {
        if (!EventOptimizer.instance) {
            EventOptimizer.instance = new EventOptimizer();
        }
        return EventOptimizer.instance;
    }

    /**
     * Create or get a throttled version of an event handler
     */
    public throttle(
        eventType: string,
        handlerId: string,
        callback: EventCallback,
        delay: number = PERFORMANCE_CONFIG.throttleDelay
    ): EventCallback {
        try {
            if (!PERFORMANCE_CONFIG.eventThrottling) {
                return callback;
            }

            if (!this.throttledHandlers.has(eventType)) {
                this.throttledHandlers.set(eventType, new Map());
            }

            const handlersForType = this.throttledHandlers.get(eventType)!;
            
            if (!handlersForType.has(handlerId)) {
                const handler = new ThrottledHandler(callback, delay);
                handlersForType.set(handlerId, handler);
                this.logger.debug(`Created throttled handler: ${eventType}.${handlerId}`);
            }

            return (event: any) => handlersForType.get(handlerId)!.handle(event);
        } catch (error: unknown) {
            this.errorHandler.handleError(new EventError(`Failed to create throttled handler: ${(error as Error).message}`), {
                context: 'EventOptimizer.throttle',
                silent: true
            });
            return callback; // Fallback to original callback
        }
    }

    /**
     * Remove a throttled handler
     */
    public removeHandler(eventType: string, handlerId: string): void {
        try {
            const handlersForType = this.throttledHandlers.get(eventType);
            if (handlersForType) {
                handlersForType.delete(handlerId);
                if (handlersForType.size === 0) {
                    this.throttledHandlers.delete(eventType);
                }
                this.logger.debug(`Removed throttled handler: ${eventType}.${handlerId}`);
            }
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'EventOptimizer.removeHandler',
                silent: true
            });
        }
    }

    /**
     * Clear all throttled handlers
     */
    public clearHandlers(): void {
        try {
            this.throttledHandlers.clear();
            this.logger.debug('Cleared all throttled handlers');
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'EventOptimizer.clearHandlers',
                silent: true
            });
        }
    }

    /**
     * Get statistics about throttled handlers
     */
    public getStats(): Record<string, { handlerCount: number, totalCalls: number, throttledCalls: number }> {
        const stats: Record<string, { handlerCount: number, totalCalls: number, throttledCalls: number }> = {};
        
        this.throttledHandlers.forEach((handlers, eventType) => {
            let totalCalls = 0;
            let throttledCalls = 0;
            
            handlers.forEach(handler => {
                totalCalls += handler.getTotalCalls();
                throttledCalls += handler.getThrottledCalls();
            });
            
            stats[eventType] = {
                handlerCount: handlers.size,
                totalCalls,
                throttledCalls
            };
        });

        return stats;
    }
}

/**
 * Helper class for handling throttled events
 */
class ThrottledHandler {
    private callback: EventCallback;
    private delay: number;
    private lastCall: number = 0;
    private totalCalls: number = 0;
    private throttledCalls: number = 0;

    constructor(callback: EventCallback, delay: number) {
        this.callback = callback;
        this.delay = delay;
    }

    public handle(event: any): void {
        this.totalCalls++;
        const now = Date.now();
        
        if (now - this.lastCall >= this.delay) {
            this.callback(event);
            this.lastCall = now;
        } else {
            this.throttledCalls++;
        }
    }

    public getTotalCalls(): number {
        return this.totalCalls;
    }

    public getThrottledCalls(): number {
        return this.throttledCalls;
    }
} 