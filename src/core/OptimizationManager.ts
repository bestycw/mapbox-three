import * as THREE from 'three';
// import { MapboxThree } from './MapboxThree';
import { ExtendedObject3D } from '../types';
import { OptimizationConfig } from '../types/config';
import { LODManager } from '../optimization/LODManager';
import { ObjectPoolManager } from '../optimization/ObjectPoolManager';

/**
 * OptimizationManager - 管理Three.js场景的性能优化
 */
export class OptimizationManager {
    private static instance: OptimizationManager;
    private lodManager: LODManager;
    private objectPoolManager: ObjectPoolManager;

    private constructor(config?: OptimizationConfig) {
        this.lodManager = new LODManager( config?.lod);
        this.objectPoolManager = new ObjectPoolManager(config?.objectPool);
    }

    /**
     * 获取OptimizationManager实例
     */
    public static getInstance( config?: OptimizationConfig): OptimizationManager {
        if (!OptimizationManager.instance) {
            OptimizationManager.instance = new OptimizationManager( config);
        }
        return OptimizationManager.instance;
    }

    /**
     * 为对象设置LOD
     */
    public setupLOD(object: ExtendedObject3D, customLevels?: Array<{ distance: number; detail: number | THREE.Mesh }>) {
        return this.lodManager.setupLOD(object, customLevels);
    }

    /**
     * 更新LOD对象
     */
    public updateLOD(camera:THREE.Camera): void {
        this.lodManager.update(camera);
    }

    /**
     * 移除对象的LOD
     */
    public removeLOD(object: ExtendedObject3D): void {
        this.lodManager.remove(object);
    }

    /**
     * 获取LOD管理器
     */
    public getLODManager(): LODManager {
        return this.lodManager;
    }

    /**
     * 从对象池获取对象
     */
    public acquireFromPool<T extends ExtendedObject3D>(
        type: string,
        factory: () => T,
        reset?: (obj: T) => void
    ): T {
        return this.objectPoolManager.acquire(type, factory, reset);
    }

    /**
     * 释放对象到对象池
     */
    public releaseToPool(type: string, object: ExtendedObject3D): void {
        this.objectPoolManager.release(type, object);
    }

    /**
     * 获取对象池管理器
     */
    public getObjectPoolManager(): ObjectPoolManager {
        return this.objectPoolManager;
    }

    /**
     * 清理优化管理器
     */
    public cleanup(): void {
        this.objectPoolManager.cleanup();
    }

    /**
     * 释放资源
     */
    public dispose(): void {
        this.lodManager.dispose();
        this.objectPoolManager.dispose();
    }
} 