import * as THREE from 'three';
import { BaseConfig, MemoryStats, MemoryMetrics } from '../config/types';
import { defaultConfig } from '../config';
import { BaseStrategy } from './BaseStrategy';
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
        const defaultMemory = defaultConfig.optimization?.memoryManager ?? {};
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
        this.checkMemoryUsage();
    }

    protected onDispose(): void {
        // Clean up any monitoring intervals
    }

    protected onClear(): void {
        this.cleanup();
    }

    protected updateMetrics(): void {
        const info = this.renderer.info;
        const memory = this.getMemoryInfo();

        this.metrics = {
            ...this.metrics,
            operationCount: this.metrics.operationCount + 1,
            lastUpdateTime: Date.now(),
            memoryUsage: memory.totalJSHeapSize
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
        const stats = this.getMemoryStats();
        const usageRatio = stats.totalJSHeapSize / stats.jsHeapSizeLimit;

        if (usageRatio >= this.config.criticalThreshold) {
            this.criticalCallback?.(stats);
            if (this.config.autoCleanup) {
                this.cleanup();
            }
        } else if (usageRatio >= this.config.warningThreshold) {
            this.warningCallback?.(stats);
        }

        this.updateMetrics();
    }

    /**
     * 获取内存统计信息
     */
    public getMemoryStats(): MemoryStats {
        const info = this.renderer.info;
        const memory = this.getMemoryInfo();

        return {
            geometries: info.memory.geometries,
            textures: info.memory.textures,
            materials: 0, // Need to implement material counting
            programs: info.programs?.length || 0,
            totalJSHeapSize: memory.totalJSHeapSize,
            usedJSHeapSize: memory.usedJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            lastCleanupTime: this.lastCleanupTime
        };
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
        const now = Date.now();
        if (now - this.lastCleanupTime < this.config.cleanupInterval) {
            return;
        }

        // 清理Three.js资源
        this.renderer.dispose();
        THREE.Cache.clear();

        // 强制垃圾回收（如果可用）
        if (window.gc) {
            window.gc();
        }

        this.lastCleanupTime = now;
        this.updateMetrics();
        this.emit('cleaned');
    }

    /**
     * 释放特定资源
     */
    public disposeResources(resources: {
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
} 