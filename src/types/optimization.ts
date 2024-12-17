import * as THREE from 'three';

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
}

/**
 * Configuration for optimization strategies
 */
export interface OptimizationConfig {
    // Batching configuration
    batchingEnabled: boolean;
    batchSize: number;
    maxBatches: number;
    
    // Instancing configuration
    instanceThreshold: number;
    maxInstances: number;
    
    // Object pooling configuration
    poolEnabled: boolean;
    poolTypes: string[];
    maxObjectsInPool: number;
    
    // LOD configuration
    lodLevels: Record<string, {
        distance: number;
        detail: number;
    }>;
    
    // Culling configuration
    cullingEnabled: boolean;
    cullingThreshold: number;
    frustumCulling: boolean;
    occlusionCulling: boolean;
    
    // Spatial indexing configuration
    spatialIndexConfig: {
        maxDepth: number;
        maxObjectsPerNode: number;
        bounds: THREE.Box3;
    };
    
    // Additional configurations
    geometryCacheSize: number;
    materialCacheSize: number;
    eventThrottling: boolean;
    throttleDelay: number;
    disposeUnusedTimeout: number;
    autoReleaseGeometry: boolean;
    useSharedGeometry: boolean;
    useCompressedTextures: boolean;
    preserveDrawingBuffer: boolean;
    antialias: 'auto' | boolean;
    useWorkers: boolean;
    maxWorkers: number;
    workerTasks: string[];
    enableDebug: boolean;
    performanceMonitoring: boolean;
    monitoringInterval: number;
    autoOptimize: boolean;
    optimizationInterval: number;
    maxDrawCalls: number;
    maxTriangles: number;
    maxTextures: number;
    maxLights: number;
    beforeOptimize: ((scene: THREE.Scene) => void) | null;
    afterOptimize: ((scene: THREE.Scene) => void) | null;
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