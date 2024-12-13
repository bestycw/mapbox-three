import * as THREE from 'three';
import { ExtendedObject3D } from '../types';
import { EventOptimizer } from './EventOptimizer';
import { Logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';
import { EventError } from '../utils/Errors';

type EventType = 'click' | 'mousemove' | 'mousedown' | 'mouseup' | 'mouseover' | 'mouseout';
type EventCallback = (event: { object: ExtendedObject3D, intersection: THREE.Intersection }) => void;

interface EventListener {
    object: ExtendedObject3D;
    callback: EventCallback;
}

/**
 * Manages event handling with optimization
 */
export class EventManager {
    private listeners: Map<EventType, Set<EventListener>>;
    private activeObjects: Set<ExtendedObject3D>;
    private eventOptimizer: EventOptimizer;
    private logger: Logger;
    private errorHandler: ErrorHandler;

    constructor() {
        this.listeners = new Map();
        this.activeObjects = new Set();
        this.eventOptimizer = EventOptimizer.getInstance();
        this.logger = Logger.getInstance();
        this.errorHandler = ErrorHandler.getInstance();

        // Initialize listener sets for each event type
        ['click', 'mousemove', 'mousedown', 'mouseup', 'mouseover', 'mouseout'].forEach(type => {
            this.listeners.set(type as EventType, new Set());
        });
    }

    /**
     * Add an event listener with throttling
     */
    public addEventListener(object: ExtendedObject3D, type: EventType, callback: EventCallback): void {
        try {
            const listeners = this.listeners.get(type);
            if (!listeners) {
                throw new EventError(`Invalid event type: ${type}`);
            }

            const throttledCallback = this.eventOptimizer.throttle(
                type,
                `${object.uuid}_${type}`,
                callback
            );

            listeners.add({ object, callback: throttledCallback });
            this.activeObjects.add(object);
            
            this.logger.debug(`Added ${type} listener for object ${object.uuid}`);
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'EventManager.addEventListener',
                silent: true
            });
        }
    }

    /**
     * Remove an event listener
     */
    public removeEventListener(object: ExtendedObject3D, type: EventType, callback: EventCallback): void {
        try {
            const listeners = this.listeners.get(type);
            if (!listeners) return;

            listeners.forEach(listener => {
                if (listener.object === object && listener.callback === callback) {
                    listeners.delete(listener);
                    this.eventOptimizer.removeHandler(type, `${object.uuid}_${type}`);
                }
            });

            // Remove object if it has no more listeners
            if (this.getObjectListenerCount(object) === 0) {
                this.activeObjects.delete(object);
            }

            this.logger.debug(`Removed ${type} listener for object ${object.uuid}`);
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'EventManager.removeEventListener',
                silent: true
            });
        }
    }

    /**
     * Handle mouse move events
     */
    public handleMouseMove(intersects: THREE.Intersection[]): void {
        try {
            const listeners = this.listeners.get('mousemove');
            if (!listeners) return;

            const hoveredObjects = new Set<ExtendedObject3D>();

            intersects.forEach(intersection => {
                const object = intersection.object as ExtendedObject3D;
                if (this.activeObjects.has(object)) {
                    hoveredObjects.add(object);
                    this.dispatchEvent('mousemove', object, intersection);
                    
                    if (!object.userData.isHovered) {
                        object.userData.isHovered = true;
                        this.dispatchEvent('mouseover', object, intersection);
                    }
                }
            });

            // Handle mouseout for previously hovered objects
            this.activeObjects.forEach(object => {
                if (object.userData.isHovered && !hoveredObjects.has(object)) {
                    object.userData.isHovered = false;
                    this.dispatchEvent('mouseout', object, null);
                }
            });
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'EventManager.handleMouseMove',
                silent: true
            });
        }
    }

    /**
     * Handle mouse down events
     */
    public handleMouseDown(intersects: THREE.Intersection[]): void {
        try {
            intersects.forEach(intersection => {
                const object = intersection.object as ExtendedObject3D;
                if (this.activeObjects.has(object)) {
                    this.dispatchEvent('mousedown', object, intersection);
                }
            });
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'EventManager.handleMouseDown',
                silent: true
            });
        }
    }

    /**
     * Handle mouse up events
     */
    public handleMouseUp(): void {
        try {
            this.activeObjects.forEach(object => {
                if (object.userData.isHovered) {
                    this.dispatchEvent('mouseup', object, null);
                    this.dispatchEvent('click', object, null);
                }
            });
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'EventManager.handleMouseUp',
                silent: true
            });
        }
    }

    /**
     * Dispatch an event to listeners
     */
    private dispatchEvent(type: EventType, object: ExtendedObject3D, intersection: THREE.Intersection | null): void {
        const listeners = this.listeners.get(type);
        if (!listeners) return;

        listeners.forEach(listener => {
            if (listener.object === object) {
                listener.callback({
                    object,
                    intersection: intersection || { distance: 0, point: new THREE.Vector3() } as THREE.Intersection
                });
            }
        });
    }

    /**
     * Get the number of listeners for an object
     */
    private getObjectListenerCount(object: ExtendedObject3D): number {
        let count = 0;
        this.listeners.forEach(listeners => {
            listeners.forEach(listener => {
                if (listener.object === object) count++;
            });
        });
        return count;
    }

    /**
     * Get event statistics
     */
    public getStats(): Record<string, { listenerCount: number, activeObjects: number }> {
        const stats: Record<string, { listenerCount: number, activeObjects: number }> = {};
        
        this.listeners.forEach((listeners, type) => {
            stats[type] = {
                listenerCount: listeners.size,
                activeObjects: this.activeObjects.size
            };
        });

        return stats;
    }

    /**
     * Clear all event listeners
     */
    public clear(): void {
        try {
            this.listeners.forEach((listeners, type) => {
                listeners.clear();
            });
            this.activeObjects.clear();
            this.eventOptimizer.clearHandlers();
            this.logger.debug('Cleared all event listeners');
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'EventManager.clear',
                silent: true
            });
        }
    }
} 