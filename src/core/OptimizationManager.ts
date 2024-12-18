import * as THREE from 'three';
import { EventEmitter } from '../utils/EventEmitter';
import { 
    BaseMetrics,
    ExtendedObject3D,
    OptimizationConfig,
    OptimizationEvent,
    OptimizationOptions,
    PerformanceMetrics,
    MemoryMetrics,
    InstanceMetrics
} from '../config/types/index';
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
        this.performanceMonitor = PerformanceMonitor.getInstance();
        
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
    public optimize(object: ExtendedObject3D, options: Partial<OptimizationOptions> = {}): ExtendedObject3D | void{
        // console.log(options)
        try {
            if (!this.isEnabled) return object;

            const metrics = this.performanceMonitor.startOperation('optimize');

            if (options.lod) {
                const lodStrategy = this.getStrategy('lod') as LODManager;
                return  lodStrategy?.setupLOD(object, options.lod.levels);
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
        const memoryManager = this.getStrategy<MemoryManager>('memory');
        const instanceManager = this.getStrategy<InstanceManager>('instancing');
        
        return {
            memory: memoryManager?.getMetrics(),
            instances: instanceManager ? {
                count: instanceManager.getMetrics().instanceCount ?? 0,
                batches: instanceManager.getMetrics().batchCount ?? 0,
                drawCalls: instanceManager.getMetrics().drawCalls ?? 0
            } : undefined,
            performance: this.performanceMonitor.getMetrics().performance
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

    public getStrategy<T extends BaseStrategy<any>>(name: string): T | undefined {
        return this.strategies.get(name) as T | undefined;
    }

    /**
     * 获取完整性能报告
     */
    public getPerformanceReport(): {
        overall: PerformanceMetrics;
        strategies: Record<string, BaseMetrics>;
        operations: Record<string, {
            count: number;
            averageTime: number;
            lastTime: number;
        }>;
    } {
        const report: {
            overall: PerformanceMetrics;
            strategies: Record<string, BaseMetrics>;
            operations: Record<string, {
                count: number;
                averageTime: number;
                lastTime: number;
            }>;
        } = {
            overall: this.performanceMonitor.getMetrics(),
            strategies: {},
            operations: {}
        };

        // 收集所有策略的指标
        this.strategies.forEach((strategy, name) => {
            report.strategies[name] = strategy.getMetrics();
        });

        // 收集所有操作的性能数据
        const operations = this.performanceMonitor.getHistory();
        operations.forEach((metrics: PerformanceMetrics) => {
            Object.entries(metrics.performance.operations).forEach(([name, value]) => {
                report.operations[name] = {
                    count: value,
                    averageTime: value,
                    lastTime: value
                };
            });
        });

        return report;
    }

    /**
     * 监控性能并自动优化
     */
    private monitorAndOptimize(): void {
        this.performanceMonitor.on('fpsWarning', (fps: number) => {
            if (fps < 30) {
                // 自动优化策略
                this.strategies.forEach(strategy => {
                    if (strategy instanceof LODManager) {
                        // 降低LOD级别
                        // strategy.adjustQualityLevel('down');
                    }
                    if (strategy instanceof MemoryManager) {
                        strategy.cleanup();
                    }
                });
            }
        });

        this.performanceMonitor.on('memoryWarning', (memoryMB: number) => {
            // 触发内存清理
            const memoryStrategy = this.getStrategy<MemoryManager>('memory');
            if (memoryStrategy) {
                memoryStrategy.cleanup();
            }
        });
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