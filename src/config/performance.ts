import * as THREE from 'three';

/**
 * Performance configuration for the library
 */
export const PERFORMANCE_CONFIG = {
    // Batching configuration
    batchingEnabled: true,
    batchSize: 500,
    maxBatches: 100,
    
    // Instancing configuration
    instanceThreshold: 100,  // Minimum number of similar objects to trigger instancing
    maxInstances: 10000,    // Maximum instances per instanced mesh
    
    // Object pooling configuration
    poolEnabled: true,
    poolTypes: ['sphere', 'box', 'line', 'tube'],
    maxObjectsInPool: 10000,
    
    // Level of Detail (LOD) configuration
    lodLevels: {
        near: { distance: 100, detail: 1.0 },    // Full detail
        medium: { distance: 500, detail: 0.5 },   // Half detail
        far: { distance: 1000, detail: 0.25 }     // Quarter detail
    },
    
    // Culling configuration
    cullingEnabled: true,
    cullingThreshold: 50,  // Distance in world units for culling
    frustumCulling: true,  // Enable THREE.js frustum culling
    occlusionCulling: true, // Enable occlusion culling for static objects
    
    // Spatial indexing configuration
    spatialIndexConfig: {
        maxDepth: 8,
        maxObjectsPerNode: 16,
        bounds: new THREE.Box3(
            new THREE.Vector3(-1000, -1000, -1000),
            new THREE.Vector3(1000, 1000, 1000)
        )
    },
    
    // Geometry and material caching
    geometryCacheSize: 1000,
    materialCacheSize: 100,
    
    // Event handling optimization
    eventThrottling: true,
    throttleDelay: 16,  // ~60fps
    
    // Memory management
    disposeUnusedTimeout: 60000,  // Dispose unused resources after 1 minute
    autoReleaseGeometry: true,    // Automatically release geometry when object is removed
    
    // Rendering optimization
    useSharedGeometry: true,      // Use shared geometry for identical shapes
    useCompressedTextures: true,  // Use compressed textures when available
    preserveDrawingBuffer: false, // Disable preserveDrawingBuffer for better performance
    antialias: 'auto',           // 'auto', true, or false
    
    // Worker thread configuration
    useWorkers: true,
    maxWorkers: 4,
    workerTasks: ['geometry', 'physics', 'pathfinding'],
    
    // Debug and monitoring
    enableDebug: false,
    performanceMonitoring: true,
    monitoringInterval: 1000,     // Performance monitoring interval in ms
    
    // Auto-optimization
    autoOptimize: true,           // Automatically apply optimizations
    optimizationInterval: 5000,   // Check for optimization opportunities every 5 seconds
    
    // Resource limits
    maxDrawCalls: 5000,
    maxTriangles: 1000000,
    maxTextures: 100,
    maxLights: 4,
    
    // Custom optimization hooks
    beforeOptimize: null as ((scene: THREE.Scene) => void) | null,
    afterOptimize: null as ((scene: THREE.Scene) => void) | null
}; 