import * as THREE from 'three';
import { PERFORMANCE_CONFIG } from '../config/performance';
import { BatchManager } from './BatchManager';
import { Logger } from './Logger';
import { ErrorHandler } from './ErrorHandler';
import { ExtendedObject3D, GeometryType } from '../types';
import { OptimizationStrategy } from '../types/optimization';

/**
 * Manages various optimization techniques for the 3D scene
 */
export class OptimizationManager {
    private static instance: OptimizationManager;
    private batchManager: BatchManager;
    private logger: Logger;
    private errorHandler: ErrorHandler;
    private scene: THREE.Scene | null;
    private isOptimizing: boolean;
    private enabledStrategies: Set<OptimizationStrategy>;

    private constructor() {
        this.batchManager = BatchManager.getInstance();
        this.logger = Logger.getInstance();
        this.errorHandler = ErrorHandler.getInstance();
        this.scene = null;
        this.isOptimizing = false;
        this.enabledStrategies = new Set();

        // Initialize default strategies from config
        if (PERFORMANCE_CONFIG.batchingEnabled) {
            this.enabledStrategies.add('batching');
        }
    }

    public static getInstance(): OptimizationManager {
        if (!OptimizationManager.instance) {
            OptimizationManager.instance = new OptimizationManager();
        }
        return OptimizationManager.instance;
    }

    /**
     * Enable a specific optimization strategy
     */
    public enableStrategy(strategy: OptimizationStrategy): void {
        this.enabledStrategies.add(strategy);
        this.logger.debug(`Enabled optimization strategy: ${strategy}`);
    }

    /**
     * Disable a specific optimization strategy
     */
    public disableStrategy(strategy: OptimizationStrategy): void {
        this.enabledStrategies.delete(strategy);
        this.logger.debug(`Disabled optimization strategy: ${strategy}`);
    }

    /**
     * Check if a strategy is enabled
     */
    public isStrategyEnabled(strategy: OptimizationStrategy): boolean {
        return this.enabledStrategies.has(strategy);
    }

    /**
     * Get all enabled strategies
     */
    public getEnabledStrategies(): OptimizationStrategy[] {
        return Array.from(this.enabledStrategies);
    }

    /**
     * Initialize the optimization manager with a scene
     */
    public initialize(scene: THREE.Scene): void {
        this.scene = scene;
        this.logger.debug('OptimizationManager initialized with scene');
    }

    /**
     * Add an object for optimization
     */
    public addObject(object: ExtendedObject3D, type: GeometryType): void {
        try {
            if (!PERFORMANCE_CONFIG.autoOptimize) {
                this.logger.debug('Auto-optimization is disabled');
                return;
            }

            if (this.isStrategyEnabled('batching')) {
                this.batchManager.addToBatch(object, type);
            }

            // Add other optimization techniques here as needed
        } catch (error) {
            this.errorHandler.handleError(error instanceof Error ? error : new Error('Unknown error'), {
                context: 'OptimizationManager.addObject',
                silent: false
            });
        }
    }

    /**
     * Process all pending optimizations
     */
    public processOptimizations(): void {
        try {
            if (this.isOptimizing) {
                this.logger.debug('Optimization already in progress');
                return;
            }

            this.isOptimizing = true;
            this.logger.debug('Processing optimizations...');

            if (this.isStrategyEnabled('batching')) {
                this.batchManager.processAllPending();
                
                // Add batch meshes to scene
                if (this.scene) {
                    const batchMeshes = this.batchManager.getBatchMeshes();
                    batchMeshes.forEach(mesh => {
                        if (!this.scene!.getObjectById(mesh.id)) {
                            this.scene!.add(mesh);
                        }
                    });
                }
            }

            // Add other optimization processing here

            this.logger.debug('Optimizations processed');
        } catch (error) {
            this.errorHandler.handleError(error instanceof Error ? error : new Error('Unknown error'), {
                context: 'OptimizationManager.processOptimizations',
                silent: false
            });
        } finally {
            this.isOptimizing = false;
        }
    }

    /**
     * Get optimization statistics
     */
    public getStats(): Record<string, any> {
        return {
            enabledStrategies: Array.from(this.enabledStrategies),
            batching: this.isStrategyEnabled('batching') ? this.batchManager.getStats() : null,
            // Add other optimization stats here
        };
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        this.batchManager.dispose();
        this.scene = null;
        this.enabledStrategies.clear();
    }
} 