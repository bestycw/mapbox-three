import * as THREE from 'three';
import { BatchManager } from '../utils/BatchManager';
import { ObjectPool } from '../utils/ObjectPool';
import { GeometryFactory } from '../utils/GeometryFactory';
import { MaterialFactory } from '../utils/MaterialFactory';
import { PERFORMANCE_CONFIG } from '../config/performance';
import { Logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';
import { ExtendedObject3D, OptimizationStrategy, OptimizationMetrics, OptimizationConfig } from '../types';
import { MapboxThree } from './MapboxThree';
// import { MapboxThree } from './MapboxThree';

/**
 * Core manager class that coordinates all optimization strategies
 */
export class OptimizationManager {
    private static instance: OptimizationManager;
    private batchManager: BatchManager;
    private objectPool: ObjectPool;
    private geometryFactory: GeometryFactory;
    private logger: Logger;
    private errorHandler: ErrorHandler;
    private activeStrategies: Set<OptimizationStrategy>;
    private metrics: OptimizationMetrics;

    private constructor(mapboxThree: MapboxThree, config?: OptimizationConfig) {
        this.batchManager = BatchManager.getInstance();
        this.objectPool = ObjectPool.getInstance();
        this.geometryFactory = GeometryFactory.getInstance();
        this.logger = Logger.getInstance();
        this.errorHandler = ErrorHandler.getInstance();
        this.activeStrategies = new Set();
        this.metrics = this.initializeMetrics();
    }

    public static getInstance(mapboxThree: MapboxThree, config?: OptimizationConfig): OptimizationManager {
        if (!OptimizationManager.instance) {
            OptimizationManager.instance = new OptimizationManager(mapboxThree,config );
        }
        return OptimizationManager.instance;
    }

    /**
     * Enable specific optimization strategies
     */
    public enableStrategy(strategy: OptimizationStrategy): void {
        this.activeStrategies.add(strategy);
        this.logger.info(`Enabled optimization strategy: ${strategy}`);
    }

    /**
     * Disable specific optimization strategies
     */
    public disableStrategy(strategy: OptimizationStrategy): void {
        this.activeStrategies.delete(strategy);
        this.logger.info(`Disabled optimization strategy: ${strategy}`);
    }

    /**
     * Check if a strategy is currently active
     */
    public isStrategyEnabled(strategy: OptimizationStrategy): boolean {
        return this.activeStrategies.has(strategy);
    }

    /**
     * Process an object through enabled optimization strategies
     */
    public processObject(object: ExtendedObject3D): ExtendedObject3D {
        try {
            const startTime = performance.now();

            if (this.isStrategyEnabled('batching')) {
                let targetObject = object;
                if (object instanceof THREE.Group) {
                    const meshObject = object.children.find(child => child instanceof THREE.Mesh);
                    if (meshObject instanceof THREE.Mesh) {
                        targetObject = meshObject as ExtendedObject3D;
                    }
                }
                
                // 返回批处理后的网格或原对象
                const batchedObject = this.batchManager.addToBatch(targetObject, targetObject.userData.geometryType);
                if (batchedObject) {
                    object = batchedObject;
                }
            }

            if (this.isStrategyEnabled('objectPooling')) {
                object.userData.pooled = true;
            }

            if (this.isStrategyEnabled('lod')) {
                this.setupLOD(object);
            }

            const endTime = performance.now();
            this.updateMetrics('processTime', endTime - startTime);
            
            return object;
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'OptimizationManager.processObject',
                silent: true
            });
            return object;
        }
    }

    /**
     * Process all pending batches
     */
    public processBatch(): void {
        if (this.isStrategyEnabled('batching')) {
            this.batchManager.processAllPending();
        }
    }

    /**
     * Get all batch meshes
     */
    public getBatchMeshes(): THREE.Mesh[] {
        return this.isStrategyEnabled('batching') ? 
            this.batchManager.getBatchMeshes() : [];
    }

    /**
     * Get batch count
     */
    public getBatchCount(): number {
        return this.getBatchMeshes().length;
    }

    /**
     * Get instance count
     */
    public getInstanceCount(): number {
        return 0; // To be implemented with instancing
    }

    /**
     * Setup LOD for an object if applicable
     */
    private setupLOD(object: ExtendedObject3D): void {
        if (!object.geometry || !PERFORMANCE_CONFIG.lodLevels) return;

        const lodGroup = new THREE.LOD();
        const baseGeometry = object.geometry;
        const baseMaterial = object.material;

        Object.entries(PERFORMANCE_CONFIG.lodLevels).forEach(([_, config]) => {
            const lodGeometry = this.geometryFactory.getLODGeometry(
                object.userData.geometryKey,
                config.distance
            );
            const lodMesh = new THREE.Mesh(lodGeometry, baseMaterial);
            lodGroup.addLevel(lodMesh, config.distance);
        });

        // Add original as highest detail level
        const originalMesh = new THREE.Mesh(baseGeometry, baseMaterial);
        lodGroup.addLevel(originalMesh, 0);

        object.add(lodGroup);
        object.userData.lodEnabled = true;
    }

    /**
     * Initialize performance metrics tracking
     */
    private initializeMetrics(): OptimizationMetrics {
        return {
            processTime: 0,
            objectCount: 0,
            batchCount: 0,
            poolSize: 0,
            memoryUsage: 0,
            lastUpdate: Date.now()
        };
    }

    /**
     * Update performance metrics
     */
    private updateMetrics(metric: keyof OptimizationMetrics, value: number): void {
        if (metric in this.metrics) {
            this.metrics[metric] = value;
            this.metrics.lastUpdate = Date.now();
        }
    }

    /**
     * Get current optimization metrics
     */
    public getMetrics(): OptimizationMetrics {
        return {
            ...this.metrics,
            batchCount: this.batchManager.getBatchMeshes().length,
            poolSize: this.objectPool.getStats().total?.available || 0,
            memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
        };
    }

    /**
     * Clean up and dispose of optimization-related resources
     */
    public dispose(): void {
        this.batchManager.dispose();
        this.objectPool.dispose();
        this.geometryFactory.dispose();
        MaterialFactory.clearCache();
        this.activeStrategies.clear();
        this.metrics = this.initializeMetrics();
    }
} 