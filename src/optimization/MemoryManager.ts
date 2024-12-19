import * as THREE from 'three';
import { BaseConfig, MemoryStats, MemoryMetrics, ResourceType } from '../config/types';
import { defaultConfig } from '../config/defaults';
import { BaseStrategy } from './BaseStrategy';

interface CachedResource {
    resource: any;
    type: ResourceType;
    lastAccessed: number;
    size: number;
}

/**
 * 内存管理器配置接口
 */
export interface MemoryConfig extends BaseConfig {
    warningThreshold: number;     // 警告阈值
    criticalThreshold: number;    // 临界阈值
    autoCleanup: boolean;         // 自动清理
    cleanupInterval: number;      // 清理间隔
}

/**
 * 内存管理器 - 监控和管理Three.js应用的内存使用
 */
export class MemoryManager extends BaseStrategy<MemoryConfig> {
    private static instance: MemoryManager;
    private renderer: THREE.WebGLRenderer;
    private warningCallback?: (stats: MemoryStats) => void;
    private criticalCallback?: (stats: MemoryStats) => void;
    private lastCleanupTime: number = 0;
    private cache: Map<string, CachedResource> = new Map();

    protected metrics: Required<MemoryMetrics> = {
        operationCount: 0,
        lastUpdateTime: 0,
        memoryUsage: 0,
        geometries: 0,
        textures: 0,
        materials: 0,
        programs: 0,
        totalMemory: 0,
        maxMemory: 0
    };

    public constructor(renderer: THREE.WebGLRenderer, config: Partial<MemoryConfig>) {
        super(config as MemoryConfig);
        this.renderer = renderer;
    }

    public static getInstance(renderer: THREE.WebGLRenderer, config: Partial<MemoryConfig>): MemoryManager {
        if (!MemoryManager.instance) {
            MemoryManager.instance = new MemoryManager(renderer, config);
        }
        return MemoryManager.instance;
    }

    protected validateConfig(config: Partial<MemoryConfig>): Required<MemoryConfig> {
        const defaultMemory = defaultConfig.optimization?.memory ?? {};
        return {
            ...defaultMemory,
            ...config
        } as Required<MemoryConfig>;
    }

    protected onInitialize(): void {
        if (this.config.autoCleanup) {
            setInterval(() => this.checkMemoryUsage(), this.config.updateInterval);
        }
    }

    protected onUpdate(): void {
        if (this.config.autoCleanup) {
            this.checkMemoryUsage();
        }
    }

    protected onClear(): void {
        // 清理临时数据和缓存
        this.cache.clear();
        this.updateMetrics();
    }

    protected onDispose(): void {
        // 释放所有资源
        this.cache.forEach((cached, key) => {
            this.removeCachedResource(key);
        });
        this.renderer.dispose();
        THREE.Cache.clear();
    }

    protected updateMetrics(): void {
        const memory = this.getMemoryInfo();
        this.metrics = {
            ...this.metrics,
            operationCount: this.metrics.operationCount + 1,
            lastUpdateTime: Date.now(),
            memoryUsage: memory.totalJSHeapSize,
            totalMemory: this.calculateTotalMemoryUsage(),
            maxMemory: memory.jsHeapSizeLimit
        };
    }

    /**
     * 设置内存警告回调
     */
    public setWarningCallback(callback: (stats: MemoryStats) => void): void {
        this.warningCallback = callback;
    }

    /**
     * 设置内存临界回调
     */
    public setCriticalCallback(callback: (stats: MemoryStats) => void): void {
        this.criticalCallback = callback;
    }

    /**
     * 检查内存使用情况
     */
    private checkMemoryUsage(): void {
        const memoryMB = this.metrics.memoryUsage / (1024 * 1024);
        
        if (memoryMB > this.config.criticalThreshold) {
            this.emit('critical', this.getMemoryStats());
            this.cleanup();
        } else if (memoryMB > this.config.warningThreshold) {
            this.emit('warning', this.getMemoryStats());
        }
    }

    /**
     * 获取内存统计信息
     */
    public getMemoryStats(): Required<MemoryMetrics> {
        return { ...this.metrics };
    }

    /**
     * 获取内存信息
     */
    private getMemoryInfo(): {
        totalJSHeapSize: number;
        usedJSHeapSize: number;
        jsHeapSizeLimit: number;
    } {
        const performance = window.performance as any;
        if (performance && performance.memory) {
            return performance.memory;
        }
        return {
            totalJSHeapSize: 0,
            usedJSHeapSize: 0,
            jsHeapSizeLimit: 0
        };
    }

    /**
     * 清理资源
     */
    public cleanup(): void {
        if (Date.now() - this.lastCleanupTime < this.config.cleanupInterval) {
            return;
        }
        this.onDispose();  // 复用 onDispose 方法
        this.lastCleanupTime = Date.now();
        this.updateMetrics();
        this.emit('cleaned');
    }

    /**
     * 释放特定资源
     */
    public disposeSpecificResources(resources: {
        geometries?: THREE.BufferGeometry[];
        materials?: THREE.Material[];
        textures?: THREE.Texture[];
    }): void {
        try {
            if (resources.geometries) {
                resources.geometries.forEach(geometry => {
                    if (geometry) {
                        geometry.dispose();
                    }
                });
            }
            if (resources.materials) {
                resources.materials.forEach(material => {
                    if (material) {
                        material.dispose();
                    }
                });
            }
            if (resources.textures) {
                resources.textures.forEach(texture => {
                    if (texture) {
                        texture.dispose();
                    }
                });
            }
            this.updateMetrics();
            this.emit('resourcesDisposed', resources);
        } catch (error) {
            this.handleError('Failed to dispose resources', error);
        }
    }

    // private handleError(message: string, error?: any): void {
    //     console.error(`[MemoryManager] ${message}`, error);
    //     this.emit('error', { message, error });
    // }

    // 资源缓存方法
    public cacheResource(key: string, resource: any, type: ResourceType): void {
        const size = this.estimateResourceSize(resource, type);
        
        if (this.shouldCleanup()) {
            this.cleanup();
        }

        this.cache.set(key, {
            resource,
            type,
            lastAccessed: Date.now(),
            size
        });

        this.updateResourceCount(type, 1);
        this.updateMetrics();
        this.emit('resourceAdded', key, type);
    }

    public getCachedResource(key: string): any {
        const cached = this.cache.get(key);
        if (cached) {
            cached.lastAccessed = Date.now();
            return cached.resource;
        }
        return null;
    }

    public removeCachedResource(key: string): void {
        const cached = this.cache.get(key);
        if (cached) {
            this.updateResourceCount(cached.type, -1);
            if (cached.resource.dispose) {
                cached.resource.dispose();
            }
            this.cache.delete(key);
            this.updateMetrics();
            this.emit('resourceRemoved', key, cached.type);
        }
    }

    // 资源大小估算
    private estimateResourceSize(resource: any, type: ResourceType): number {
        switch (type) {
            case 'geometry':
                return this.estimateGeometrySize(resource);
            case 'texture':
                return this.estimateTextureSize(resource);
            case 'material':
                return 1024; // 估计材质大小1KB
            case 'program':
                return 2048; // 估计着色器程序大小为2KB
            default:
                return 512;
        }
    }

    private estimateGeometrySize(geometry: THREE.BufferGeometry): number {
        let size = 0;
        for (const attribute of Object.values(geometry.attributes)) {
            size += (attribute as THREE.BufferAttribute).array.byteLength;
        }
        return size;
    }

    private estimateTextureSize(texture: THREE.Texture): number {
        const width = texture.image?.width || 0;
        const height = texture.image?.height || 0;
        return width * height * 4; // 假设每个像素4字节(RGBA)
    }

    // 缓存管理
    private shouldCleanup(): boolean {
        return this.metrics.memoryUsage > this.config.warningThreshold * 1024 * 1024;
    }

    private updateResourceCount(type: ResourceType, delta: number): void {
        switch (type) {
            case 'geometry':
                this.metrics.geometries += delta;
                break;
            case 'texture':
                this.metrics.textures += delta;
                break;
            case 'material':
                this.metrics.materials += delta;
                break;
            case 'program':
                this.metrics.programs += delta;
                break;
        }
        this.metrics.totalMemory = this.calculateTotalMemoryUsage();
    }

    // 其他辅助方法
    private calculateTotalMemoryUsage(): number {
        let total = 0;
        this.cache.forEach(cached => {
            total += cached.size;
        });
        return total;
    }
} 