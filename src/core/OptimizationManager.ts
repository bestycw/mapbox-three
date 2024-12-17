import * as THREE from 'three';
import { LODManager } from '../optimization/LODManager';
import { ObjectPoolManager } from '../optimization/ObjectPoolManager';
import { InstanceManager } from '../optimization/InstanceManager';

import { 
    OptimizationConfig, 
    LodLevel, 
    InstancingConfig,
    ExtendedObject3D, 
    MemoryStats
} from '../config/types';
import { MemoryManager } from '../optimization/MemoryManager';

/**
 * 优化管理器 - 统一管理各种优化策略
 */
export class OptimizationManager {
    private static instance: OptimizationManager;   
    private lodManager!: LODManager;
    private objectPoolManager!: ObjectPoolManager;
    private instanceManager!: InstanceManager;
    private memoryManager!: MemoryManager;

    private constructor(renderer: THREE.WebGLRenderer, config?: OptimizationConfig) {
        this.initializeManagers(renderer, config || {});
    }

    private initializeManagers(renderer: THREE.WebGLRenderer, config: OptimizationConfig): void {
        this.lodManager = new LODManager(config.lod || {});
        this.objectPoolManager = new ObjectPoolManager(config.objectPool || {});
        this.instanceManager = InstanceManager.getInstance(config.instancing || {});
        this.memoryManager = MemoryManager.getInstance(renderer, config.memoryManager || {});
        
        if (this.memoryManager) {
            this.memoryManager.setWarningCallback((stats) => {
                console.warn('Memory usage warning:', stats);
            });
            
            this.memoryManager.setCriticalCallback((stats) => {
                console.error('Critical memory usage:', stats);
            });
        }
    }

    public static getInstance(renderer: THREE.WebGLRenderer, config?: OptimizationConfig): OptimizationManager {
        if (!OptimizationManager.instance) {
            OptimizationManager.instance = new OptimizationManager(renderer, config);
        }
        return OptimizationManager.instance;
    }

    // === LOD 管理 ===
    public setupLOD(object: ExtendedObject3D, levels?: LodLevel[]): ExtendedObject3D {
        return this.lodManager.setupLOD(object, levels);
    }

    public removeLOD(object: ExtendedObject3D): void {
        this.lodManager.remove(object);
    }

    public updateLOD(camera: THREE.Camera): void {
        this.lodManager.update(camera);
    }

    // === 实例化管理 ===
    public addInstance(
        object: ExtendedObject3D,
        groupId: string,
        config?: Partial<InstancingConfig>
    ): THREE.InstancedMesh | null {
        return this.instanceManager.addInstance(object, groupId, config);
    }

    public removeInstance(object: ExtendedObject3D, groupId: string): void {
        this.instanceManager.removeInstance(object, groupId);
    }

    public updateInstance(object: ExtendedObject3D, groupId: string): void {
        this.instanceManager.updateInstance(object, groupId);
    }

    public getInstanceMetrics() {
        return this.instanceManager.getMetrics();
    }

    public clearInstanceGroup(groupId: string): void {
        this.instanceManager.clearInstances(groupId);
    }

    public updateInstanceConfig(groupId: string, config: Partial<InstancingConfig>): void {
        this.instanceManager.updateGroupConfig(groupId, config);
    }

    public getGroupObjects(groupId: string): ExtendedObject3D[] {
        return this.instanceManager.getGroupObjects(groupId);
    }

    public hasInstance(object: ExtendedObject3D, groupId: string): boolean {
        return this.instanceManager.hasInstance(object, groupId);
    }

    public getObjectGroupId(object: ExtendedObject3D): string | null {
        return this.instanceManager.getObjectGroupId(object);
    }

    // === 对象池管理 ===
    public getObjectFromPool<T extends ExtendedObject3D>(
        key: string,
        factory: () => T,
        reset?: (obj: T) => void
    ): T {
        return this.objectPoolManager.acquire(key, factory, reset);
    }

    public releaseObjectToPool(type: string, object: ExtendedObject3D): void {
        this.objectPoolManager.release(type, object);
    }

    public clearUpPoolObjects(): void {
        this.objectPoolManager.clearUp();
    }

    // === 便捷访问方法 ===
    public getLODManager(): LODManager {
        return this.lodManager;
    }

    public getInstanceManager(): InstanceManager {
        return this.instanceManager;
    }

    public getObjectPoolManager(): ObjectPoolManager {
        return this.objectPoolManager;
    }

    public dispose(): void {
        this.lodManager.dispose();
        this.instanceManager.dispose();
        this.objectPoolManager.dispose();
        if (this.memoryManager) {
            this.memoryManager.dispose();
        }
    }

    /**
     * 获取内存统计信息
     */
    public getMemoryStats(): MemoryStats {
        return this.memoryManager.getMemoryStats();
    }
    
    public memoryCleanup(): void {
        if (this.memoryManager) {
            this.memoryManager.cleanup();
        }
    }
} 