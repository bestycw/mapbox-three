import * as THREE from 'three';
import { ExtendedObject3D } from '../types/index';

type EventCallback = (event: any) => void;
type EventType = 'click' | 'hover' | 'mouseenter' | 'mouseleave' | 'drag' | 'dragstart' | 'dragend';

interface EventSubscription {
    object: ExtendedObject3D;
    type: EventType;
    callback: EventCallback;
    enabled: boolean;
}

export class EventManager {
    private subscriptions: Map<string, EventSubscription[]> = new Map();
    private hoveredObject: ExtendedObject3D | null = null;
    private draggedObject: ExtendedObject3D | null = null;
    private isDragging: boolean = false;

    /**
     * Adds an event listener to an object
     * @param object The object to listen for events on
     * @param type The type of event to listen for
     * @param callback The callback to execute when the event occurs
     */
    addEventListener(object: ExtendedObject3D, type: EventType, callback: EventCallback): void {
        const id = object.uuid;
        if (!this.subscriptions.has(id)) {
            this.subscriptions.set(id, []);
        }

        this.subscriptions.get(id)!.push({
            object,
            type,
            callback,
            enabled: true
        });
    }

    /**
     * Removes an event listener from an object
     * @param object The object to remove the listener from
     * @param type The type of event to remove
     * @param callback The callback to remove
     */
    removeEventListener(object: ExtendedObject3D, type: EventType, callback: EventCallback): void {
        const id = object.uuid;
        const subs = this.subscriptions.get(id);
        if (!subs) return;

        const index = subs.findIndex(sub => 
            sub.type === type && sub.callback === callback
        );

        if (index !== -1) {
            subs.splice(index, 1);
            if (subs.length === 0) {
                this.subscriptions.delete(id);
            }
        }
    }

    /**
     * Enables or disables all event listeners for an object
     * @param object The object to enable/disable events for
     * @param enabled Whether to enable or disable events
     */
    setEnabled(object: ExtendedObject3D, enabled: boolean): void {
        const id = object.uuid;
        const subs = this.subscriptions.get(id);
        if (subs) {
            subs.forEach(sub => sub.enabled = enabled);
        }
    }

    /**
     * Handles mouse move events
     * @param intersects Array of intersected objects
     */
    handleMouseMove(intersects: THREE.Intersection[]): void {
        const intersectedObject = intersects[0]?.object as ExtendedObject3D | undefined;

        // Handle hover events
        if (this.hoveredObject !== intersectedObject) {
            if (this.hoveredObject) {
                this.emit(this.hoveredObject, 'mouseleave');
            }
            if (intersectedObject) {
                this.emit(intersectedObject, 'mouseenter');
            }
            this.hoveredObject = intersectedObject || null;
        }

        if (this.hoveredObject) {
            this.emit(this.hoveredObject, 'hover');
        }

        // Handle drag events
        if (this.isDragging && this.draggedObject) {
            this.emit(this.draggedObject, 'drag', intersects[0].point);
        }
    }

    /**
     * Handles mouse down events
     * @param intersects Array of intersected objects
     */
    handleMouseDown(intersects: THREE.Intersection[]): void {
        const intersectedObject = intersects[0]?.object as ExtendedObject3D | undefined;
        if (intersectedObject) {
            this.draggedObject = intersectedObject;
            this.isDragging = true;
            this.emit(intersectedObject, 'dragstart', intersects[0].point);
        }
    }

    /**
     * Handles mouse up events
     */
    handleMouseUp(): void {
        if (this.draggedObject) {
            this.emit(this.draggedObject, 'dragend');
            if (!this.isDragging) {
                this.emit(this.draggedObject, 'click');
            }
            this.draggedObject = null;
        }
        this.isDragging = false;
    }

    /**
     * Clears all event subscriptions
     */
    clear(): void {
        this.subscriptions.clear();
        this.hoveredObject = null;
        this.draggedObject = null;
        this.isDragging = false;
    }

    private emit(object: ExtendedObject3D, type: EventType, data?: any): void {
        const subs = this.subscriptions.get(object.uuid);
        if (!subs) return;

        subs.forEach(sub => {
            if (sub.type === type && sub.enabled) {
                sub.callback({ type, target: object, data });
            }
        });
    }
} 