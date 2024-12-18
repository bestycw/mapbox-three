import { 
    BaseConfig,
    ObjectPoolConfig,
    LODConfig,
    InstanceConfig,
    MemoryConfig
} from './types';

/**
 * 默认配置
 */
export const defaultConfig = {
    optimization: {
        enabled: true,
        debugMode: false,

        // 对象池配置
        objectPool: {
            enabled: true,
            updateInterval: 16,
            autoCleanup: true,
            cleanupInterval: 30000,
            warningThreshold: 0.8,
            criticalThreshold: 0.9,
            maxSize: 1000,
            debugMode: false,
            maxPoolSize: 100,
            defaultPoolSize: 10,
            shrinkThreshold: 0.3,
            prewarmPools: true
        } as ObjectPoolConfig,

        // LOD配置
        lod: {
            enabled: true,
            updateInterval: 16,
            autoCleanup: true,
            cleanupInterval: 30000,
            warningThreshold: 0.8,
            criticalThreshold: 0.9,
            maxSize: 1000,
            debugMode: false,
            levels: [
                { distance: 0, detail: 1.0 },
                { distance: 50, detail: 0.5 },
                { distance: 100, detail: 0.25 },
                { distance: 200, detail: 0.1 }
            ],
            dynamicAdjustment: true,
            performanceTarget: 60,
            transitionDuration: 500
        } as LODConfig,

        // 实例化配置
        instancing: {
            enabled: true,
            updateInterval: 16,
            autoCleanup: true,
            cleanupInterval: 30000,
            warningThreshold: 0.8,
            criticalThreshold: 0.9,
            maxSize: 1000,
            debugMode: false,
            batchSize: 100,
            dynamicBatching: true,
            mergeGeometry: true,
            shareBuffers: true
        } as InstanceConfig,

        // 内存管理配置
        memory: {
            enabled: true,
            updateInterval: 16,
            autoCleanup: true,
            cleanupInterval: 30000,
            warningThreshold: 0.8,
            criticalThreshold: 0.9,
            maxSize: 1000,
            debugMode: false,
            maxTextureSize: 2048,
            maxGeometryVertices: 65536,
            maxCachedGeometries: 100,
            maxCachedTextures: 100,
            maxCachedMaterials: 100
        } as MemoryConfig
    }
} as const; 