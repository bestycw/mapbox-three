import * as THREE from 'three';
import { EventEmitter } from 'events';
import { 
    ExtendedObject3D,
    OptimizationConfig,
    OptimizationEvent,
    OptimizationOptions,
    PerformanceMetrics
} from '../config/types';
import { BaseStrategy } from '../optimization/BaseStrategy';
import { LODManager } from '../optimization/LODManager';
import { InstanceManager } from '../optimization/InstanceManager';
import { MemoryManager } from '../optimization/MemoryManager';
import { ObjectPoolManager } from '../optimization/ObjectPoolManager';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';

/**
 * OptimizationManager - A modular and extensible optimization system
 * 
 * Features:
 * - Plugin-based architecture for easy extension
 * - Event-driven communication
 * - Unified configuration management
 * - Performance monitoring
 * - Error handling
 */
export class OptimizationManager extends EventEmitter {
    private static instance: OptimizationManager;
    private strategies: Map<string, BaseStrategy<any>>;
    private config: Required<OptimizationConfig>;
    private renderer: THREE.WebGLRenderer;
    private isEnabled: boolean;
    private performanceMonitor: PerformanceMonitor;

    private constructor(renderer: THREE.WebGLRenderer, config?: Partial<OptimizationConfig>) {
        super();
        this.renderer = renderer;
        this.strategies = new Map();
        this.config = config as Required<OptimizationConfig>; 
        this.isEnabled = true;
        this.performanceMonitor = new PerformanceMonitor();
        
        this.initialize();
    }

    /**
     * Initialize all optimization strategies
     */
    private initialize(): void {
        try {
            if (this.config.lod) {
                this.registerStrategy('lod', new LODManager(this.config.lod));
            }
            if (this.config.instancing) {
                this.registerStrategy('instancing', new InstanceManager(this.config.instancing));
            }
            if (this.config.objectPool) {
                this.registerStrategy('objectPool', new ObjectPoolManager(this.config.objectPool));
            }
            if (this.config.memoryManager) {
                this.registerStrategy('memory', new MemoryManager(this.renderer, this.config.memoryManager));
            }

            this.emit(OptimizationEvent.INITIALIZED);
        } catch (error) {
            this.handleError('Initialization failed', error);
        }
    }

    /**
     * Register a new optimization strategy
     */
    public registerStrategy(name: string, strategy: BaseStrategy<any>): void {
        if (this.strategies.has(name)) {
            this.handleError(`Strategy ${name} already exists`);
            return;
        }
        
        this.strategies.set(name, strategy);
        strategy.initialize();
    }

    /**
     * High-level API for object optimization
     */
    public optimize(object: ExtendedObject3D, options: Partial<OptimizationOptions> = {}): void {
        try {
            if (!this.isEnabled) return;

            const metrics = this.performanceMonitor.startOperation('optimize');

            if (options.lod) {
                const lodStrategy = this.getStrategy('lod') as LODManager;
                lodStrategy?.setupLOD(object, options.lod);
            }
            if (options.instancing) {
                const instanceStrategy = this.getStrategy('instancing') as InstanceManager;
                instanceStrategy?.update({ object, ...options.instancing });
            }

            this.performanceMonitor.endOperation(metrics);
            this.emit(OptimizationEvent.OBJECT_OPTIMIZED, { object, options });
        } catch (error) {
            this.handleError('Optimization failed', error);
        }
    }

    /**
     * Update all active optimizations
     */
    public update(camera: THREE.Camera): void {
        if (!this.isEnabled) return;

        const metrics = this.performanceMonitor.startOperation('update');
        
        this.strategies.forEach(strategy => {
            strategy.update({ camera });
        });

        this.performanceMonitor.endOperation(metrics);
    }

    /**
     * Get performance metrics
     */
    public getMetrics(): PerformanceMetrics {
        return {
            memory: this.getStrategy('memory')?.getMetrics(),
            instances: this.getStrategy('instancing')?.getMetrics(),
            performance: this.performanceMonitor.getMetrics()
        };
    }

    /**
     * Error handling
     */
    private handleError(message: string, error?: any): void {
        console.error(`[OptimizationManager] ${message}`, error);
        this.emit(OptimizationEvent.ERROR, { message, error });
        // if (this.config.debugMode) {
        //     console.debug('[OptimizationManager] Error details:', error);
        // }
    }

    /**
     * Cleanup and dispose
     */
    public dispose(): void {
        this.strategies.forEach(strategy => strategy.dispose());
        this.strategies.clear();
        this.removeAllListeners();
        this.isEnabled = false;
    }

    // Singleton instance management
    public static getInstance(renderer: THREE.WebGLRenderer, config?: Partial<OptimizationConfig>): OptimizationManager {
        if (!OptimizationManager.instance) {
            OptimizationManager.instance = new OptimizationManager(renderer, config);
        }
        return OptimizationManager.instance;
    }

    private getStrategy<T extends BaseStrategy<any>>(name: string): T | undefined {
        return this.strategies.get(name) as T | undefined;
    }
}

// Example usage:
/*
const manager = OptimizationManager.getInstance(renderer);

// Simple usage
manager.optimize(object, {
    lod: {
        levels: [
            { distance: 0, geometry: highDetailGeometry },
            { distance: 100, geometry: lowDetailGeometry }
        ]
    },
    instancing: {
        groupId: 'trees',
        maxInstances: 1000
    }
});

// Event handling
manager.on(OptimizationEvent.OBJECT_OPTIMIZED, (data) => {
    console.log('Object optimized:', data);
});

// Performance monitoring
const metrics = manager.getMetrics();
*/ 