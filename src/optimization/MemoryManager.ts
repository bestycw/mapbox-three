import * as THREE from 'three';

/**
 * 内存统计信息接口
 */
export interface MemoryStats {
    geometries: number;      // 几何体数量
    textures: number;        // 纹理数量
    materials: number;       // 材质数量
    programs: number;        // shader程序数量
    totalMemory: number;     // 总内存占用(bytes)
    cachedResources: number; // 缓存资源数量
    lastCleanupTime: number; // 上次清理时间
}

/**
 * 内存管理器配置接口
 */
export interface MemoryManagerConfig {
    enabled?: boolean;
    maxCacheSize?: number;           // 最大缓存大小(MB)
    cleanupInterval?: number;        // 清理间隔(ms)
    disposalStrategy?: 'lru' | 'lfu'; // 资源释放策略
    autoCleanup?: boolean;           // 是否自动清理
    warningThreshold?: number;       // 内存警告阈值(MB)
    criticalThreshold?: number;      // 内存临界阈值(MB)
}

/**
 * 资源使用记录
 */
interface ResourceUsage {
    lastUsed: number;    // 最后使用时间
    useCount: number;    // 使用次数
    size: number;        // 估算大小(bytes)
    type: 'geometry' | 'texture' | 'material' | 'program';
}

/**
 * 内存管理器 - 管理Three.js资源的内存使用
 */
export class MemoryManager {
    private static instance: MemoryManager;
    private renderer: THREE.WebGLRenderer;
    private config: Required<MemoryManagerConfig>;
    
    // 资源缓存
    private textureCache: Map<string, THREE.Texture> = new Map();
    private geometryCache: Map<string, THREE.BufferGeometry> = new Map();
    private materialCache: Map<string, THREE.Material> = new Map();
    private programCache: Map<string, WebGLProgram> = new Map();
    
    // 资源使用记录
    private resourceUsage: Map<string, ResourceUsage> = new Map();
    
    // 性能监控
    private lastCleanupTime: number = 0;
    private warningCallback?: (stats: MemoryStats) => void;
    private criticalCallback?: (stats: MemoryStats) => void;

    private constructor(renderer: THREE.WebGLRenderer, config?: MemoryManagerConfig) {
        this.renderer = renderer;
        this.config = {
            enabled: config?.enabled ?? true,
            maxCacheSize: config?.maxCacheSize ?? 512,  // 512MB
            cleanupInterval: config?.cleanupInterval ?? 30000, // 30s
            disposalStrategy: config?.disposalStrategy ?? 'lru',
            autoCleanup: config?.autoCleanup ?? true,
            warningThreshold: config?.warningThreshold ?? 384, // 384MB
            criticalThreshold: config?.criticalThreshold ?? 480 // 480MB
        };
    }

    /**
     * 获取MemoryManager实例
     */
    public static getInstance(renderer: THREE.WebGLRenderer, config?: MemoryManagerConfig): MemoryManager {
        if (!MemoryManager.instance) {
            MemoryManager.instance = new MemoryManager(renderer, config);
        }
        return MemoryManager.instance;
    }

    /**
     * 缓存纹理
     */
    public cacheTexture(key: string, texture: THREE.Texture): void {
        if (!this.config.enabled) return;

        this.textureCache.set(key, texture);
        this.updateResourceUsage(key, {
            lastUsed: Date.now(),
            useCount: 1,
            size: this.estimateTextureSize(texture),
            type: 'texture'
        });

        this.checkMemoryThresholds();
    }

    /**
     * 缓存几何体
     */
    public cacheGeometry(key: string, geometry: THREE.BufferGeometry): void {
        if (!this.config.enabled) return;

        this.geometryCache.set(key, geometry);
        this.updateResourceUsage(key, {
            lastUsed: Date.now(),
            useCount: 1,
            size: this.estimateGeometrySize(geometry),
            type: 'geometry'
        });

        this.checkMemoryThresholds();
    }

    /**
     * 缓存材质
     */
    public cacheMaterial(key: string, material: THREE.Material): void {
        if (!this.config.enabled) return;

        this.materialCache.set(key, material);
        this.updateResourceUsage(key, {
            lastUsed: Date.now(),
            useCount: 1,
            size: this.estimateMaterialSize(material),
            type: 'material'
        });

        this.checkMemoryThresholds();
    }

    /**
     * 获取缓存的纹理
     */
    public getTexture(key: string): THREE.Texture | undefined {
        const texture = this.textureCache.get(key);
        if (texture) {
            this.updateResourceUsage(key, {
                lastUsed: Date.now(),
                useCount: (this.resourceUsage.get(key)?.useCount || 0) + 1,
                size: this.estimateTextureSize(texture),
                type: 'texture'
            });
        }
        return texture;
    }

    /**
     * 获取缓存的几何体
     */
    public getGeometry(key: string): THREE.BufferGeometry | undefined {
        const geometry = this.geometryCache.get(key);
        if (geometry) {
            this.updateResourceUsage(key, {
                lastUsed: Date.now(),
                useCount: (this.resourceUsage.get(key)?.useCount || 0) + 1,
                size: this.estimateGeometrySize(geometry),
                type: 'geometry'
            });
        }
        return geometry;
    }

    /**
     * 获取缓存的材质
     */
    public getMaterial(key: string): THREE.Material | undefined {
        const material = this.materialCache.get(key);
        if (material) {
            this.updateResourceUsage(key, {
                lastUsed: Date.now(),
                useCount: (this.resourceUsage.get(key)?.useCount || 0) + 1,
                size: this.estimateMaterialSize(material),
                type: 'material'
            });
        }
        return material;
    }

    /**
     * 更新资源使用记录
     */
    private updateResourceUsage(key: string, usage: ResourceUsage): void {
        this.resourceUsage.set(key, usage);
        
        if (this.config.autoCleanup) {
            this.checkAndCleanup();
        }
    }

    /**
     * 检查并执行清理
     */
    private checkAndCleanup(): void {
        const currentTime = Date.now();
        if (currentTime - this.lastCleanupTime < this.config.cleanupInterval) {
            return;
        }

        const stats = this.getMemoryStats();
        const totalMemoryMB = stats.totalMemory / (1024 * 1024);

        if (totalMemoryMB > this.config.maxCacheSize) {
            this.cleanup();
        }
    }

    /**
     * 清理资源
     */
    public cleanup(): void {
        const resources = Array.from(this.resourceUsage.entries());
        
        // 根据策略排序资源
        if (this.config.disposalStrategy === 'lru') {
            resources.sort((a, b) => a[1].lastUsed - b[1].lastUsed);
        } else {
            resources.sort((a, b) => a[1].useCount - b[1].useCount);
        }

        // 释放资源直到内存降至安全水平
        for (const [key, usage] of resources) {
            if (this.getMemoryStats().totalMemory / (1024 * 1024) <= this.config.maxCacheSize * 0.8) {
                break;
            }

            this.disposeResource(key, usage.type);
        }

        this.lastCleanupTime = Date.now();
    }

    /**
     * 释放指定资源
     */
    private disposeResource(key: string, type: ResourceUsage['type']): void {
        switch (type) {
            case 'texture': {
                const texture = this.textureCache.get(key);
                if (texture) {
                    texture.dispose();
                    this.textureCache.delete(key);
                }
                break;
            }
            case 'geometry': {
                const geometry = this.geometryCache.get(key);
                if (geometry) {
                    geometry.dispose();
                    this.geometryCache.delete(key);
                }
                break;
            }
            case 'material': {
                const material = this.materialCache.get(key);
                if (material) {
                    material.dispose();
                    this.materialCache.delete(key);
                }
                break;
            }
            case 'program': {
                const program = this.programCache.get(key);
                if (program) {
                    this.renderer.getContext().deleteProgram(program);
                    this.programCache.delete(key);
                }
                break;
            }
        }
        this.resourceUsage.delete(key);
    }

    /**
     * 获取内存统计信息
     */
    public getMemoryStats(): MemoryStats {
        const info = this.renderer.info;
        let totalMemory = 0;

        // 计算总内存使用
        this.resourceUsage.forEach(usage => {
            totalMemory += usage.size;
        });

        return {
            geometries: info.memory.geometries,
            textures: info.memory.textures,
            materials: this.materialCache.size,
            programs: info.programs?.length || 0,
            totalMemory: totalMemory,
            cachedResources: this.resourceUsage.size,
            lastCleanupTime: this.lastCleanupTime
        };
    }

    /**
     * 估算纹理大小
     */
    private estimateTextureSize(texture: THREE.Texture): number {
        if (!texture.image) return 0;
        const { width, height } = texture.image;
        // 假设每个像素4字节(RGBA)
        return width * height * 4;
    }

    /**
     * 估算几何体大小
     */
    private estimateGeometrySize(geometry: THREE.BufferGeometry): number {
        let size = 0;
        for (const attribute of Object.values(geometry.attributes)) {
            size += attribute.array.byteLength;
        }
        if (geometry.index) {
            size += geometry.index.array.byteLength;
        }
        return size;
    }

    /**
     * 估算材质大小
     */
    private estimateMaterialSize(material: THREE.Material): number {
        // 基础大小 + 纹理大小
        let size = 1024; // 基础大小约1KB
        if (material instanceof THREE.MeshStandardMaterial) {
            if (material.map) size += this.estimateTextureSize(material.map);
            if (material.normalMap) size += this.estimateTextureSize(material.normalMap);
            if (material.roughnessMap) size += this.estimateTextureSize(material.roughnessMap);
            if (material.metalnessMap) size += this.estimateTextureSize(material.metalnessMap);
        }
        return size;
    }

    /**
     * 检查内存阈值
     */
    private checkMemoryThresholds(): void {
        const stats = this.getMemoryStats();
        const totalMemoryMB = stats.totalMemory / (1024 * 1024);

        if (totalMemoryMB > this.config.criticalThreshold) {
            this.criticalCallback?.(stats);
            this.cleanup(); // 强制清理
        } else if (totalMemoryMB > this.config.warningThreshold) {
            this.warningCallback?.(stats);
        }
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
     * 释放所有资源
     */
    public dispose(): void {
        this.textureCache.forEach(texture => texture.dispose());
        this.geometryCache.forEach(geometry => geometry.dispose());
        this.materialCache.forEach(material => material.dispose());
        this.programCache.forEach(program => {
            this.renderer.getContext().deleteProgram(program);
        });

        this.textureCache.clear();
        this.geometryCache.clear();
        this.materialCache.clear();
        this.programCache.clear();
        this.resourceUsage.clear();
    }
} 