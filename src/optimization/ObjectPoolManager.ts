import * as THREE from 'three';
import { ExtendedObject3D } from '../types';

/**
 * 对象池配置接口
 */
export interface ObjectPoolConfig {
    enabled?: boolean;
    maxSize?: number;
    preloadCount?: number;
    autoExpand?: boolean;
    cleanupInterval?: number;
}

/**
 * 对象池管理器 - 管理Three.js对象的重用
 */
export class ObjectPoolManager {
    private pools: Map<string, ExtendedObject3D[]> = new Map();
    private config: Required<ObjectPoolConfig>;
    private inUseObjects: Map<string, Set<ExtendedObject3D>> = new Map();
    private lastCleanupTime: number = 0;

    constructor(config?: ObjectPoolConfig) {
        this.config = {
            enabled: config?.enabled ?? true,
            maxSize: config?.maxSize ?? 1000,
            preloadCount: config?.preloadCount ?? 10,
            autoExpand: config?.autoExpand ?? true,
            cleanupInterval: config?.cleanupInterval ?? 60000 // 默认1分钟清理一次
        };
    }

    /**
     * 从对象池获取对象
     */
    public acquire<T extends ExtendedObject3D>(
        type: string,
        factory: () => T,
        reset?: (obj: T) => void
    ): T {
        if (!this.config.enabled) {
            return factory();
        }

        let pool = this.pools.get(type);
        if (!pool) {
            pool = [];
            this.pools.set(type, pool);
            // 预加载对象
            this.preload(type, factory);
        }

        let object = pool.pop() as T;
        if (!object && this.config.autoExpand) {
            object = factory();
        }

        if (!object) {
            throw new Error(`No available objects in pool: ${type}`);
        }

        // 记录使用中的对象
        if (!this.inUseObjects.has(type)) {
            this.inUseObjects.set(type, new Set());
        }
        this.inUseObjects.get(type)!.add(object);

        // 重置对象状态
        if (reset) {
            reset(object);
        }

        return object;
    }

    /**
     * 释放对象回对象池
     */
    public release(type: string, object: ExtendedObject3D): void {
        if (!this.config.enabled) {
            return;
        }

        const pool = this.pools.get(type);
        if (!pool) {
            this.pools.set(type, [object]);
            return;
        }

        // 检查对象池大小限制
        if (pool.length >= this.config.maxSize) {
            this.disposeObject(object);
            return;
        }

        // 从使用中移除
        this.inUseObjects.get(type)?.delete(object);

        // 重置对象基本属性
        object.position.set(0, 0, 0);
        object.rotation.set(0, 0, 0);
        object.scale.set(1, 1, 1);
        object.visible = false;

        pool.push(object);
    }

    /**
     * 预加载对象
     */
    private preload<T extends ExtendedObject3D>(type: string, factory: () => T): void {
        const pool = this.pools.get(type)!;
        for (let i = 0; i < this.config.preloadCount; i++) {
            const object = factory();
            object.visible = false;
            pool.push(object);
        }
    }

    /**
     * 清理长时间未使用的对象
     */
    public cleanup(): void {
        const currentTime = Date.now();
        if (currentTime - this.lastCleanupTime < this.config.cleanupInterval) {
            return;
        }

        this.pools.forEach((pool, type) => {
            const inUseCount = this.inUseObjects.get(type)?.size ?? 0;
            const totalCount = pool.length + inUseCount;

            // 如果总数超过预加载数量的两倍，则清理多余的对象
            if (totalCount > this.config.preloadCount * 2) {
                const excessCount = pool.length - this.config.preloadCount;
                if (excessCount > 0) {
                    const objectsToRemove = pool.splice(0, excessCount);
                    objectsToRemove.forEach(obj => this.disposeObject(obj));
                }
            }
        });

        this.lastCleanupTime = currentTime;
    }

    /**
     * 销毁对象
     */
    private disposeObject(object: ExtendedObject3D): void {
        if (object instanceof THREE.Mesh) {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material instanceof THREE.Material) {
                object.material.dispose();
            }
        }
    }

    /**
     * 获取对象池状态
     */
    public getStats(): { [key: string]: { available: number; inUse: number } } {
        const stats: { [key: string]: { available: number; inUse: number } } = {};
        
        this.pools.forEach((pool, type) => {
            stats[type] = {
                available: pool.length,
                inUse: this.inUseObjects.get(type)?.size ?? 0
            };
        });

        return stats;
    }

    /**
     * 清空所有对象池
     */
    public dispose(): void {
        this.pools.forEach(pool => {
            pool.forEach(obj => this.disposeObject(obj));
        });
        this.pools.clear();
        this.inUseObjects.clear();
    }
} 