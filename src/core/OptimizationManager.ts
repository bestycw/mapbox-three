import * as THREE from 'three';
import { MapboxThree } from './MapboxThree';
import { ExtendedObject3D } from '../types';
import { OptimizationConfig } from '../types/config';
import { LODManager } from './LODManager';

/**
 * OptimizationManager - 管理Three.js场景的性能优化
 */
export class OptimizationManager {
    private static instance: OptimizationManager;
    private mapboxThree: MapboxThree;
    private config: OptimizationConfig;
    private lodManager: LODManager;

    private constructor(mapboxThree: MapboxThree, config?: OptimizationConfig) {
        this.mapboxThree = mapboxThree;
        this.config = config || {};
        this.lodManager = new LODManager(config?.lod);
    }

    /**
     * 获取OptimizationManager实例
     */
    public static getInstance(mapboxThree: MapboxThree, config?: OptimizationConfig): OptimizationManager {
        if (!OptimizationManager.instance) {
            OptimizationManager.instance = new OptimizationManager(mapboxThree, config);
        }
        return OptimizationManager.instance;
    }

    /**
     * 为对象设置LOD
     */
    public setupLOD(object: ExtendedObject3D, customLevels?: Array<{ distance: number; detail: number }>) {
        return this.lodManager.setupLOD(object, customLevels);
    }

    /**
     * 更新LOD对象
     */
    public updateLOD(camera: THREE.Camera): void {
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
} 