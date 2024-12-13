import * as THREE from 'three';
import { ExtendedObject3D, GeometryType } from '../types';
import { PERFORMANCE_CONFIG } from '../config/performance';
import { Logger } from './Logger';
import { ErrorHandler } from './ErrorHandler';

/**
 * Manages pools of reusable 3D objects
 */
export class ObjectPool {
    private static instance: ObjectPool;
    private pools: Map<string, ExtendedObject3D[]>;
    private activeObjects: Set<ExtendedObject3D>;
    private logger: Logger;
    private errorHandler: ErrorHandler;

    private constructor() {
        this.pools = new Map();
        this.activeObjects = new Set();
        this.logger = Logger.getInstance();
        this.errorHandler = ErrorHandler.getInstance();

        // Initialize pools for each type
        PERFORMANCE_CONFIG.poolTypes.forEach(type => {
            this.pools.set(type, []);
        });
    }

    public static getInstance(): ObjectPool {
        if (!ObjectPool.instance) {
            ObjectPool.instance = new ObjectPool();
        }
        return ObjectPool.instance;
    }

    /**
     * Acquire an object from the pool or create a new one
     */
    public acquire(type: GeometryType): ExtendedObject3D | null {
        try {
            if (!PERFORMANCE_CONFIG.poolEnabled) {
                return null;
            }

            const pool = this.pools.get(type);
            if (!pool) {
                throw new Error(`No pool exists for type: ${type}`);
            }

            let object: ExtendedObject3D;

            if (pool.length > 0) {
                object = pool.pop()!;
                this.logger.debug(`Acquired object from pool: ${type}`);
            } else if (this.getTotalPoolSize() < PERFORMANCE_CONFIG.maxObjectsInPool) {
                object = new THREE.Object3D() as ExtendedObject3D;
                object.userData.poolType = type;
                this.logger.debug(`Created new pooled object: ${type}`);
            } else {
                this.logger.warn(`Object pool limit reached for type: ${type}`);
                return null;
            }

            object.visible = true;
            this.activeObjects.add(object);
            return object;
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'ObjectPool.acquire',
                silent: true
            });
            return null;
        }
    }

    /**
     * Return an object to the pool
     */
    public release(object: ExtendedObject3D): void {
        try {
            if (!PERFORMANCE_CONFIG.poolEnabled) return;

            const type = object.userData.poolType;
            if (!type || !this.pools.has(type)) {
                this.logger.warn('Attempted to release object with invalid pool type');
                return;
            }

            // Reset object state
            object.visible = false;
            object.position.set(0, 0, 0);
            object.rotation.set(0, 0, 0);
            object.scale.set(1, 1, 1);
            object.userData = { ...object.userData, poolType: type };

            // Return to pool
            this.pools.get(type)!.push(object);
            this.activeObjects.delete(object);
            this.logger.debug(`Released object to pool: ${type}`);
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'ObjectPool.release',
                silent: true
            });
        }
    }

    /**
     * Get the total number of objects in all pools
     */
    private getTotalPoolSize(): number {
        let total = 0;
        this.pools.forEach(pool => {
            total += pool.length;
        });
        return total + this.activeObjects.size;
    }

    /**
     * Get pool statistics
     */
    public getStats(): Record<string, { available: number, active: number }> {
        const stats: Record<string, { available: number, active: number }> = {};
        
        this.pools.forEach((pool, type) => {
            const activeCount = Array.from(this.activeObjects)
                .filter(obj => obj.userData.poolType === type).length;
            
            stats[type] = {
                available: pool.length,
                active: activeCount
            };
        });

        return stats;
    }

    /**
     * Clear all pools and dispose of objects
     */
    public dispose(): void {
        this.pools.forEach((pool, type) => {
            pool.forEach(object => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            pool.length = 0;
        });

        this.activeObjects.clear();
        this.logger.info('Object pools cleared');
    }
} 