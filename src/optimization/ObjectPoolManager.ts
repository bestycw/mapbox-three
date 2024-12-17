import * as THREE from 'three';
import { defaultConfig, ExtendedObject3D } from '../config';

/**
 * 对象池配置接口
 */
export interface ObjectPoolConfig {
    enabled?: boolean;
    maxSize?: number;
    preloadCount?: number;
    autoExpand?: boolean;
    cleanupInterval?: number;
    predictiveScaling?: boolean;    // 启用预测性扩展
    minIdleTime?: number;          // 最小空闲时间（毫秒）
    maxIdleTime?: number;          // 最大空闲时间（毫秒）
    warmupCount?: number;          // 预热对象数量
}

/**
 * 对象生命周期信息
 */
interface ObjectLifecycle {
    createdAt: number;
    lastUsedAt: number;
    useCount: number;
    timeInPool: number;
    lastReturnedAt?: number;
}

/**
 * 池性能指标
 */
interface PoolPerformanceMetrics {
    hitRate: number;
    averageAcquisitionTime: number;
    peakUsage: number;
    turnoverRate: number;
    memoryUsage: number;
    predictionAccuracy?: number;
}

/**
 * 对象池管理器 - 管理Three.js对象的重用
 */
export class ObjectPoolManager {
    private pools: Map<string, ExtendedObject3D[]> = new Map();
    private config: Required<ObjectPoolConfig>;
    private inUseObjects: Map<string, Set<ExtendedObject3D>> = new Map();
    private lastCleanupTime: number = 0;
    
    // 新增的生命周期和性能监控
    private objectLifecycles: Map<ExtendedObject3D, ObjectLifecycle> = new Map();
    private performanceMetrics: Map<string, PoolPerformanceMetrics> = new Map();
    private acquisitionTimes: Map<string, number[]> = new Map();
    private demandHistory: Map<string, { timestamp: number, count: number }[]> = new Map();
    
    constructor(config?: ObjectPoolConfig) {
        this.config = {
            ...defaultConfig.optimization!.objectPool!,
            ...config
        } as Required<ObjectPoolConfig>;
    }

    /**
     * 从对象池获取对象
     */
    public acquire<T extends ExtendedObject3D>(
        type: string,
        factory: () => T,
        reset?: (obj: T) => void
    ): T {
        const startTime = performance.now();

        if (!this.config.enabled) {
            return factory();
        }

        let pool = this.pools.get(type);
        if (!pool) {
            pool = [];
            this.pools.set(type, pool);
            this.preload(type, factory);
        }

        // 预测性扩展
        if (this.config.predictiveScaling) {
            this.updateDemandHistory(type);
            const prediction = this.predictDemand(type);
            if (prediction > pool.length) {
                this.expandPool(type, factory, prediction - pool.length);
            }
        }

        let object = pool.pop() as T;
        if (!object && this.config.autoExpand) {
            object = factory();
        }

        if (!object) {
            throw new Error(`No available objects in pool: ${type}`);
        }

        // 更新生命周期信息
        const lifecycle = this.objectLifecycles.get(object) || {
            createdAt: performance.now(),
            lastUsedAt: performance.now(),
            useCount: 0,
            timeInPool: 0
        };
        
        lifecycle.lastUsedAt = performance.now();
        lifecycle.useCount++;
        if (lifecycle.lastReturnedAt) {
            lifecycle.timeInPool += performance.now() - lifecycle.lastReturnedAt;
        }
        this.objectLifecycles.set(object, lifecycle);

        // 记录使��中的对象
        if (!this.inUseObjects.has(type)) {
            this.inUseObjects.set(type, new Set());
        }
        this.inUseObjects.get(type)!.add(object);

        // 重置对象状态
        if (reset) {
            reset(object);
        }

        // 更新性能指标
        this.updateAcquisitionTime(type, performance.now() - startTime);
        this.updatePerformanceMetrics(type);

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

        // 更新生命周期信息
        const lifecycle = this.objectLifecycles.get(object);
        if (lifecycle) {
            lifecycle.lastReturnedAt = performance.now();
        }

        // 重置对象基本属性
        object.position.set(0, 0, 0);
        object.rotation.set(0, 0, 0);
        object.scale.set(1, 1, 1);
        object.visible = false;

        pool.push(object);
    }

    /**
     * 预热对象池
     */
    private preload<T extends ExtendedObject3D>(type: string, factory: () => T): void {
        const pool = this.pools.get(type)!;
        const warmupCount = this.config.warmupCount || this.config.preloadCount;
        
        for (let i = 0; i < warmupCount; i++) {
            const object = factory();
            object.visible = false;
            this.objectLifecycles.set(object, {
                createdAt: performance.now(),
                lastUsedAt: performance.now(),
                useCount: 0,
                timeInPool: 0
            });
            pool.push(object);
        }
    }

    /**
     * 扩展对象池
     */
    private expandPool<T extends ExtendedObject3D>(type: string, factory: () => T, count: number): void {
        const pool = this.pools.get(type)!;
        for (let i = 0; i < count && pool.length < this.config.maxSize; i++) {
            const object = factory();
            object.visible = false;
            this.objectLifecycles.set(object, {
                createdAt: performance.now(),
                lastUsedAt: performance.now(),
                useCount: 0,
                timeInPool: 0
            });
            pool.push(object);
        }
    }

    /**
     * 更新需求历史
     */
    private updateDemandHistory(type: string): void {
        if (!this.demandHistory.has(type)) {
            this.demandHistory.set(type, []);
        }
        
        const history = this.demandHistory.get(type)!;
        const currentDemand = this.inUseObjects.get(type)?.size || 0;
        
        history.push({
            timestamp: performance.now(),
            count: currentDemand
        });

        // 保留最近1小时的历史数据
        const oneHourAgo = performance.now() - 3600000;
        while (history.length > 0 && history[0].timestamp < oneHourAgo) {
            history.shift();
        }
    }

    /**
     * 预测未来需求
     */
    private predictDemand(type: string): number {
        const history = this.demandHistory.get(type);
        if (!history || history.length < 2) {
            return this.config.preloadCount;
        }

        // 使用简单的线性回归预测
        const recentHistory = history.slice(-10); // 使用最近10个数据点
        const xMean = recentHistory.reduce((sum, p) => sum + p.timestamp, 0) / recentHistory.length;
        const yMean = recentHistory.reduce((sum, p) => sum + p.count, 0) / recentHistory.length;

        const slope = recentHistory.reduce((sum, p) => {
            return sum + (p.timestamp - xMean) * (p.count - yMean);
        }, 0) / recentHistory.reduce((sum, p) => {
            return sum + Math.pow(p.timestamp - xMean, 2);
        }, 0);

        const prediction = yMean + slope * (performance.now() - xMean);
        return Math.max(Math.ceil(prediction), this.config.preloadCount);
    }

    /**
     * 更新获取时间统计
     */
    private updateAcquisitionTime(type: string, time: number): void {
        if (!this.acquisitionTimes.has(type)) {
            this.acquisitionTimes.set(type, []);
        }
        const times = this.acquisitionTimes.get(type)!;
        times.push(time);
        if (times.length > 100) times.shift(); // 保留最近100次的数据
    }

    /**
     * 更新性能指标
     */
    private updatePerformanceMetrics(type: string): void {
        const pool = this.pools.get(type);
        const inUse = this.inUseObjects.get(type);
        const times = this.acquisitionTimes.get(type);

        if (!pool || !times) return;

        const totalObjects = pool.length + (inUse?.size || 0);
        const metrics: PoolPerformanceMetrics = {
            hitRate: pool.length > 0 ? pool.length / totalObjects : 0,
            averageAcquisitionTime: times.reduce((a, b) => a + b, 0) / times.length,
            peakUsage: Math.max(inUse?.size || 0, this.performanceMetrics.get(type)?.peakUsage || 0),
            turnoverRate: (inUse?.size || 0) / totalObjects,
            memoryUsage: this.estimateMemoryUsage(type)
        };

        this.performanceMetrics.set(type, metrics);
    }

    /**
     * 估算内存使用
     */
    private estimateMemoryUsage(type: string): number {
        const pool = this.pools.get(type);
        const inUse = this.inUseObjects.get(type);
        if (!pool) return 0;

        let totalSize = 0;
        const countObjects = (obj: ExtendedObject3D) => {
            if (obj instanceof THREE.Mesh) {
                // 估算几何体内存
                if (obj.geometry instanceof THREE.BufferGeometry) {
                    for (const attribute of Object.values(obj.geometry.attributes) as THREE.BufferAttribute[]) {
                        totalSize += attribute.array.byteLength;
                    }
                }
                // 估算材质内存
                if (obj.material instanceof THREE.Material) {
                    totalSize += 1024; // 假设每个材质约1KB
                }
            }
        };

        pool.forEach(countObjects);
        inUse?.forEach(countObjects);

        return totalSize;
    }

    /**
     * 清理长时间未使用的对象
     */
    public clearUp(): void {
        const currentTime = Date.now();
        if (currentTime - this.lastCleanupTime < this.config.cleanupInterval) {
            return;
        }

        this.pools.forEach((pool, type) => {
            const inUseCount = this.inUseObjects.get(type)?.size ?? 0;
            const totalCount = pool.length + inUseCount;

            // 检查空闲时间
            const idleObjects = pool.filter(obj => {
                const lifecycle = this.objectLifecycles.get(obj);
                if (!lifecycle?.lastReturnedAt) return false;
                
                const idleTime = currentTime - lifecycle.lastReturnedAt;
                return idleTime > this.config.maxIdleTime;
            });

            // 移除长时间空闲的对象
            idleObjects.forEach(obj => {
                const index = pool.indexOf(obj);
                if (index !== -1) {
                    pool.splice(index, 1);
                    this.disposeObject(obj);
                    this.objectLifecycles.delete(obj);
                }
            });

            // 如果总数超过预加载数量的两倍，则清理多余的对象
            if (totalCount > this.config.preloadCount * 2) {
                const excessCount = pool.length - this.config.preloadCount;
                if (excessCount > 0) {
                    const objectsToRemove = pool.splice(0, excessCount);
                    objectsToRemove.forEach(obj => {
                        this.disposeObject(obj);
                        this.objectLifecycles.delete(obj);
                    });
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
        this.objectLifecycles.delete(object);
    }

    /**
     * 获���对象池状态
     */
    public getStats(): { [key: string]: { 
        available: number; 
        inUse: number;
        metrics: PoolPerformanceMetrics;
        lifecycle: {
            averageUseCount: number;
            averageTimeInPool: number;
            oldestObject: number;
        };
    }} {
        const stats: ReturnType<typeof this.getStats> = {};
        
        this.pools.forEach((pool, type) => {
            const metrics = this.performanceMetrics.get(type) || {
                hitRate: 0,
                averageAcquisitionTime: 0,
                peakUsage: 0,
                turnoverRate: 0,
                memoryUsage: 0
            };

            // 计算生命周期统计
            const lifecycles = Array.from(this.objectLifecycles.values());
            const averageUseCount = lifecycles.reduce((sum, l) => sum + l.useCount, 0) / lifecycles.length;
            const averageTimeInPool = lifecycles.reduce((sum, l) => sum + l.timeInPool, 0) / lifecycles.length;
            const oldestObject = Math.min(...lifecycles.map(l => l.createdAt));

            stats[type] = {
                available: pool.length,
                inUse: this.inUseObjects.get(type)?.size ?? 0,
                metrics,
                lifecycle: {
                    averageUseCount,
                    averageTimeInPool,
                    oldestObject
                }
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
        this.objectLifecycles.clear();
        this.performanceMetrics.clear();
        this.acquisitionTimes.clear();
        this.demandHistory.clear();
    }
} 