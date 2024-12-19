import * as THREE from 'three';
// import { EventEmitter } from 'events';
import { 
    ExtendedObject3D,
    ObjectPoolConfig,
    ObjectPoolMetrics,
    // BaseConfig
} from '../config/types';
import { defaultConfig } from '../config/defaults';
import { BaseStrategy } from './BaseStrategy';
import { EventEmitter } from '../utils/EventEmitter';
/**
 * 对象池接口
 */
interface ObjectPool<T extends ExtendedObject3D> {
    active: Set<T>;               // 活跃对象集合
    inactive: T[];                // 非活跃对象数组
    factory: () => T;             // 对象工厂函数
    reset?: (obj: T) => void;     // 重置对象的函数
    lastAccessTime: number;       // 最后访问时间
    metadata: {                   // 池元数据
        creationTime: number;     // 创建时间
        totalCreated: number;     // 总共创建的对象数
        maxActive: number;        // 最大活跃对象数
        hitCount: number;         // 命中次数
        missCount: number;        // 未命中次数
    };
}

/**
 * 对象池管理器事件类型
 */
export type ObjectPoolEvents = {
    'objectAcquired': { key: string; object: ExtendedObject3D };
    'objectReleased': { key: string; object: ExtendedObject3D };
    'poolCreated': { key: string; size: number };
    'poolExpanded': { object: ExtendedObject3D };
    'poolShrinked': { key: string; newSize: number };
    'poolCleared': { key: string };
    'error': { message: string; error?: any };
};

/**
 * 对象池管理器 - 管理Three.js对象的重用
 */
export class ObjectPoolManager extends BaseStrategy<ObjectPoolConfig> {
    private static instance: ObjectPoolManager;
    private pools: Map<string, ObjectPool<any>> = new Map();
    private eventEmitter = new EventEmitter();
    protected metrics: Required<ObjectPoolMetrics> = {
        operationCount: 0,
        lastUpdateTime: 0,
        memoryUsage: 0,
        totalObjects: 0,
        activeObjects: 0,
        inactiveObjects: 0,
        hitRatio: 0
    };

    public constructor(config: Partial<ObjectPoolConfig>) {
        super(config as ObjectPoolConfig);
    }

    public static getInstance(config: Partial<ObjectPoolConfig>): ObjectPoolManager {
        if (!ObjectPoolManager.instance) {
            ObjectPoolManager.instance = new ObjectPoolManager(config);
        }
        return ObjectPoolManager.instance;
    }

    protected validateConfig(config: Partial<ObjectPoolConfig>): Required<ObjectPoolConfig> {
        const defaultPool = defaultConfig.optimization?.objectPool ?? {};
        return {
            ...defaultPool,
            ...config
        } as Required<ObjectPoolConfig>;
    }

    protected onInitialize(): void {
        if (this.config.cleanupInterval) {
            setInterval(() => this.cleanup(), this.config.cleanupInterval);
        }
    }

    protected onUpdate(): void {
        this.updatePoolMetrics();
    }

    protected onDispose(): void {
        this.pools.forEach((pool, key) => {
            pool.active.forEach(obj => this.disposeObject(obj));
            pool.inactive.forEach(obj => this.disposeObject(obj));
        });
        this.pools.clear();
    }

    protected onClear(): void {
        this.clearAllPools();
        this.updateMetrics();
    }

    protected updateMetrics(): void {
        this.updatePoolMetrics();
        this.metrics = {
            ...this.metrics,
            operationCount: this.metrics.operationCount + 1,
            lastUpdateTime: Date.now(),
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    /**
     * 更新池指标
     */
    private updatePoolMetrics(): void {
        let totalActive = 0;
        let totalInactive = 0;
        let totalHits = 0;
        let totalMisses = 0;

        this.pools.forEach(pool => {
            totalActive += pool.active.size;
            totalInactive += pool.inactive.length;
            totalHits += pool.metadata.hitCount;
            totalMisses += pool.metadata.missCount;
        });

        this.metrics = {
            ...this.metrics,
            totalObjects: totalActive + totalInactive,
            activeObjects: totalActive,
            inactiveObjects: totalInactive,
            hitRatio: totalHits / (totalHits + totalMisses) || 0
        };
    }

    /**
     * 估算内存使用
     */
    private estimateMemoryUsage(): number {
        let usage = 0;
        this.pools.forEach(pool => {
            // 估算每个对象约占用1KB
            usage += (pool.active.size + pool.inactive.length) * 1024;
        });
        return usage;
    }

    /**
     * 从池中获取对象
     */
    public acquire<T extends ExtendedObject3D>(
        key: string,
        factory: () => T,
        reset?: (obj: T) => void
    ): T {
        let pool = this.pools.get(key) as ObjectPool<T>;

        if (!pool) {
            pool = this.createPool(key, factory, reset);
        }

        pool.lastAccessTime = Date.now();
        let object: T;

        if (pool.inactive.length > 0) {
            object = pool.inactive.pop()!;
            pool.metadata.hitCount++;
        } else {
            object = this.expandPool(pool);
            pool.metadata.missCount++;
        }

        if (pool.reset) {
            pool.reset(object);
        }

        pool.active.add(object);
        pool.metadata.maxActive = Math.max(pool.metadata.maxActive, pool.active.size);
        
        this.updateMetrics();
        this.emit('objectAcquired', { key, object });

        return object;
    }

    /**
     * 将对象返回池中
     */
    public release<T extends ExtendedObject3D>(key: string, object: T): void {
        const pool = this.pools.get(key) as ObjectPool<T>;
        if (!pool || !pool.active.has(object)) {
            this.handleError(`Attempting to release an object not from pool: ${key}`);
            return;
        }

        try {
            pool.active.delete(object);
            if (pool.inactive.length < (this.config.maxPoolSize ?? Infinity)) {
                pool.inactive.push(object);
                object.visible = false;
            } else {
                // 如果池已满，直接销毁对象
                this.disposeObject(object);
            }

            pool.lastAccessTime = Date.now();
            this.updateMetrics();
            this.emit('objectReleased', { key, object });
        } catch (error) {
            this.handleError('Failed to release object', error);
        }
    }

    /**
     * 创建新的对象池
     */
    private createPool<T extends ExtendedObject3D>(
        key: string,
        factory: () => T,
        reset?: (obj: T) => void
    ): ObjectPool<T> {
        const pool: ObjectPool<T> = {
            active: new Set(),
            inactive: [],
            factory,
            reset,
            lastAccessTime: Date.now(),
            metadata: {
                creationTime: Date.now(),
                totalCreated: 0,
                maxActive: 0,
                hitCount: 0,
                missCount: 0
            }
        };

        // 预填充池
        if (this.config.prewarmPools) {
            const size = Math.min(this.config.defaultPoolSize!, this.config.maxPoolSize!);
            for (let i = 0; i < size; i++) {
                const object = factory();
                object.visible = false;
                pool.inactive.push(object);
                pool.metadata.totalCreated++;
            }
        }

        this.pools.set(key, pool);
        this.emit('poolCreated', { key, size: pool.inactive.length });
        return pool;
    }

    /**
     * 扩展池容量
     */
    private expandPool<T extends ExtendedObject3D>(pool: ObjectPool<T>): T {
        const object = pool.factory();
        pool.metadata.totalCreated++;
        
        if (this.config.debugMode) {
            console.debug(`[ObjectPoolManager] Created new object. Total created: ${pool.metadata.totalCreated}`);
        }

        this.emit('poolExpanded', { object });
        return object;
    }

    /**
     * 清理未使用的对象
     */
    public cleanup(): void {
        const now = Date.now();
        this.pools.forEach((pool, key) => {
            // 检查池是否长时间未使用
            const idleTime = now - pool.lastAccessTime;
            if (idleTime > this.config.cleanupInterval! * 2) {
                this.clearPool(key);
                return;
            }

            // 收缩过大的池
            const totalObjects = pool.active.size + pool.inactive.length;
            const inactiveRatio = pool.inactive.length / totalObjects;

            if (inactiveRatio > (this.config.shrinkThreshold ?? 0.3)) {
                const targetInactive = Math.ceil((this.config.defaultPoolSize ?? 100) * (this.config.shrinkThreshold ?? 0.3));
                while (pool.inactive.length > targetInactive) {
                    const object = pool.inactive.pop();
                    if (object) {
                        this.disposeObject(object);
                    }
                }
                this.emit('poolShrinked', { key, newSize: pool.inactive.length });
            }
        });

        this.updateMetrics();
    }

    /**
     * 销单个对象
     */
    private disposeObject(object: ExtendedObject3D): void {
        if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose();
            if (Array.isArray(object.material)) {
                object.material.forEach(mat => mat.dispose());
            } else if (object.material) {
                object.material.dispose();
            }
        }
    }

    /**
     * 获取池统计信息
     */
    public getPoolStats(key: string) {
        const pool = this.pools.get(key);
        if (!pool) return null;

        return {
            active: pool.active.size,
            inactive: pool.inactive.length,
            totalCreated: pool.metadata.totalCreated,
            maxActive: pool.metadata.maxActive,
            hitRatio: pool.metadata.hitCount / (pool.metadata.hitCount + pool.metadata.missCount) || 0,
            lastAccessTime: pool.lastAccessTime
        };
    }

    /**
     * 重置池的统计信息
     */
    public resetPoolStats(key: string): void {
        const pool = this.pools.get(key);
        if (!pool) return;

        pool.metadata = {
            creationTime: Date.now(),
            totalCreated: pool.metadata.totalCreated,
            maxActive: pool.active.size,
            hitCount: 0,
            missCount: 0
        };
    }

    /**
     * 获取池中活跃对象数量
     */
    public getActiveCount(key: string): number {
        return this.pools.get(key)?.active.size || 0;
    }

    /**
     * 获取池中非活跃对象数量
     */
    public getInactiveCount(key: string): number {
        return this.pools.get(key)?.inactive.length || 0;
    }

    /**
     * 清理特定的池
     */
    public clearPool(key: string): void {
        const pool = this.pools.get(key);
        if (!pool) return;

        pool.active.clear();
        pool.inactive = [];
        this.updateMetrics();
        this.emit('poolCleared', { key });
    }

    /**
     * 清理所有池
     */
    public clearAllPools(): void {
        this.pools.forEach((pool, key) => {
            pool.active.clear();
            pool.inactive = [];
            this.emit('poolCleared', { key });
        });
        this.updateMetrics();
    }

    /**
     * 发出事件
     */
    public emit<K extends keyof ObjectPoolEvents>(
        event: K,
        data: ObjectPoolEvents[K]
    ): void {
        this.eventEmitter.emit(event, data);
    }

    /** 
     * 处理错误
     */
    protected handleError(message: string, error?: any): void {
        console.error(`[ObjectPoolManager] ${message}`, error);
        this.emit('error', { message, error });
    }

    /**
     * 获取所有池的统计信息
     */
    public getStats() {
        const stats: Record<string, any> = {};
        this.pools.forEach((pool, key) => {
            stats[key] = {
                available: pool.inactive.length,
                inUse: pool.active.size,
                metrics: {
                    hitRate: pool.metadata.hitCount / (pool.metadata.hitCount + pool.metadata.missCount) || 0,
                    averageAcquisitionTime: 0.5, // 暂时使用固定值，后续可以实现实际计算
                    peakUsage: pool.metadata.maxActive,
                    turnoverRate: pool.metadata.totalCreated / Math.max(1, pool.active.size + pool.inactive.length),
                    memoryUsage: this.estimateMemoryUsage()
                },
                lifecycle: {
                    averageUseCount: pool.metadata.totalCreated / Math.max(1, pool.active.size + pool.inactive.length),
                    averageTimeInPool: Date.now() - pool.metadata.creationTime,
                    oldestObject: pool.metadata.creationTime
                }
            };
        });
        return stats;
    }
} 