import * as THREE from 'three';
import { ExtendedObject3D } from './index';

/**
 * Available optimization strategies
 */
export type OptimizationStrategy = 
    | 'batching'      // Geometry batching for similar objects
    | 'instancing'    // Instanced rendering for repeated geometries
    | 'objectPooling' // Object reuse
    | 'lod'          // Level of detail
    | 'culling'      // Frustum and occlusion culling
    | 'spatialIndex'; // Spatial indexing for efficient querying

/**
 * Performance metrics tracked by the optimization manager
 */
export interface OptimizationMetrics {
    processTime: number;    // Time taken to process optimizations
    objectCount: number;    // Total number of objects being managed
    batchCount: number;     // Number of active batches
    poolSize: number;       // Size of object pool
    memoryUsage: number;    // Current memory usage
    lastUpdate: number;     // Timestamp of last metrics update
    instanceCount?: number; // Number of instanced objects
    drawCalls?: number;    // Number of draw calls
    lod: LODMetrics;
    instance: InstanceMetrics;
    pool: PoolMetrics;
}

/**
 * Configuration for optimization strategies
 */
export interface OptimizationConfig {
    
    // Spatial indexing configuration
    spatialIndexConfig: {
        maxDepth: number;
        maxObjectsPerNode: number;
        bounds: THREE.Box3;
    };

    lod?: LODConfig;
    instancing?: {
        enabled?: boolean;
        threshold?: number;
        maxInstanceCount?: number;
        batchSize?: number;
        dynamicBatching?: boolean;
        updateInterval?: number;
    };
    objectPool?: {
        enabled?: boolean;
        defaultPoolSize?: number;
        maxPoolSize?: number;
        cleanupInterval?: number;
        predictiveScaling?: boolean;
        minIdleTime?: number;
        maxIdleTime?: number;
        warmupCount?: number;
    };
}

/**
 * Extended properties for optimized objects
 */
export interface OptimizationProperties {
    geometryType: string;
    geometryKey: string;
    batchId?: string;
    instanceId?: number;
    pooled?: boolean;
    lodEnabled?: boolean;
    culled?: boolean;
    spatialIndex?: number[];
}

/**
 * Performance monitoring data
 */
export interface PerformanceData {
    fps: number;
    drawCalls: number;
    triangles: number;
    points: number;
    lines: number;
    textures: number;
    geometries: number;
    materials: number;
    timestamp: number;
}

/**
 * 实例化配置
 */
export interface InstanceConfig {
    initialCount?: number;      // 初始实例数量
    maxCount?: number;          // 最大实例数量
    batchSize?: number;         // 批处理大小
    dynamicBatching?: boolean;  // 是否启用动态批处理
    updateInterval?: number;    // 更新间隔
    frustumCulled?: boolean;    // 是否启用视锥体剔除
    castShadow?: boolean;       // 是否投射阴影
    receiveShadow?: boolean;    // 是否接收阴影
    coordinates?: [number, number];
}

/**
 * 实例化性能指标
 */
export interface InstanceMetrics {
    instanceCount: number;     // 实例数量
    batchCount: number;       // 批次数量
    memoryUsage: number;      // 内存使用
    updateTime: number;       // 更新时间
    drawCalls: number;        // 绘制调用次数
}

/**
 * 实例化组信息
 */
export interface InstanceGroupInfo {
    instanceCount: number;    // 当前实例数量
    maxInstances: number;     // 最大实例数量
    memoryUsage: number;      // 内存使用
    dirty: boolean;          // 是否需要更新
}

/**
 * 对象池配置
 */
export interface PoolConfig {
    initialSize?: number;
    maxSize?: number;
    growthFactor?: number;
    autoShrink?: boolean;
    shrinkDelay?: number;
}

/**
 * 对象池性能指标
 */
export interface PoolMetrics {
    activeObjects: number;
    availableObjects: number;
    totalCreated: number;
    totalReused: number;
    memoryUsage: number;
}

/**
 * LOD 相关类型
 */
export interface LODLevel {
    distance: number;
    detail: number | THREE.Mesh;
}

/**
 * LOD 信息
 */
export interface LODInfo {
    currentLevel: number;
    totalLevels: number;
    distances: number[];
    active: boolean;
    memoryUsage: number;
}

/**
 * LOD 性能指标
 */
export interface LODMetrics {
    activeObjects: number;
    switchCount: number;
    memoryUsage: number;
}

/**
 * LOD 配置
 */
export interface LODConfig {
    enabled?: boolean;
    updateInterval?: number;
    dynamicAdjustment?: boolean;
    transitionDuration?: number;
    performanceTarget?: number;
    levels?: {
        distance: number;
        detail: number | THREE.Mesh;
    }[];
} 