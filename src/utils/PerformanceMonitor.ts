// import { EventEmitter } from 'events';

import { EventEmitter } from "./EventEmitter";

/**
 * 性能监控配置接口
 */
interface PerformanceConfig {
    /** 采样间隔(ms) - 默认 1000 */
    sampleInterval?: number;
    /** 历史记录大小 - 默认 60 */
    historySize?: number;
    /** 是否启用内存监控 - 默认 true */
    enableMemoryMonitor?: boolean;
    /** 是否启用FPS监控 - 默认 true */
    enableFPSMonitor?: boolean;
    /** 是否启用操作监控 - 默认 true */
    enableOperationMonitor?: boolean;
    /** FPS警告阈值 - 默认 30 */
    fpsWarningThreshold?: number;
    /** 内存警告阈值(MB) - 默认 512 */
    memoryWarningThreshold?: number;
}

/**
 * 性能指标接口
 */
interface PerformanceMetrics {
    performance: {
        fps: number;
        frameTime: number;
        operations: Record<string, number>;
    };
    memory?: {
        geometries: number;
        textures: number;
        materials: number;
        totalMemory: number;
    };
    operations: Map<string, {
        count: number;
        totalTime: number;
        averageTime: number;
        lastTime: number;
    }>;
}

/**
 * 操作指标接口
 */
interface OperationMetrics {
    startTime: number;
    name: string;
}

/**
 * 性能监控器 - 监和分析应用性能
 */
export class PerformanceMonitor extends EventEmitter {
    private static instance: PerformanceMonitor;
    private config: Required<PerformanceConfig>;
    private metrics: PerformanceMetrics;
    private history: PerformanceMetrics[];
    private frameCount: number = 0;
    private lastFrameTime: number = 0;
    private monitorInterval: NodeJS.Timeout | null = null;
    private activeOperations: Map<string, OperationMetrics> = new Map();

    private constructor(config?: PerformanceConfig) {
        super();
        this.config = this.validateConfig(config || {});
        this.metrics = this.initializeMetrics();
        this.history = [];
        this.startMonitoring();
    }

    /**
     * 获取单例实例
     */
    public static getInstance(config?: PerformanceConfig): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor(config);
        }
        return PerformanceMonitor.instance;
    }

    /**
     * 验证和规范化配置
     */
    private validateConfig(config: PerformanceConfig): Required<PerformanceConfig> {
        return {
            sampleInterval: config.sampleInterval ?? 1000,
            historySize: config.historySize ?? 60,
            enableMemoryMonitor: config.enableMemoryMonitor ?? true,
            enableFPSMonitor: config.enableFPSMonitor ?? true,
            enableOperationMonitor: config.enableOperationMonitor ?? true,
            fpsWarningThreshold: config.fpsWarningThreshold ?? 30,
            memoryWarningThreshold: config.memoryWarningThreshold ?? 512
        };
    }

    /**
     * 初始化性能指标
     */
    private initializeMetrics(): PerformanceMetrics {
        return {
            performance: {
                fps: 0,
                frameTime: 0,
                operations: {}
            },
            memory: {
                geometries: 0,
                textures: 0,
                materials: 0,
                totalMemory: 0
            },
            operations: new Map()
        };
    }

    /**
     * 开始性能监控
     */
    private startMonitoring(): void {
        // 帧率监控
        if (this.config.enableFPSMonitor) {
            this.lastFrameTime = performance.now();
            this.monitorFrame();
        }

        // 定期采样
        this.monitorInterval = setInterval(() => {
            this.sampleMetrics();
        }, this.config.sampleInterval);
    }

    /**
     * 监控帧率
     */
    private monitorFrame(): void {
        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.frameCount++;

        if (delta >= 1000) {
            this.metrics.performance.fps = Math.round((this.frameCount * 1000) / delta);
            this.metrics.performance.frameTime = delta / this.frameCount;
            
            if (this.metrics.performance.fps < this.config.fpsWarningThreshold) {
                this.emit('fpsWarning', this.metrics.performance.fps);
            }

            this.frameCount = 0;
            this.lastFrameTime = now;
        }

        requestAnimationFrame(() => this.monitorFrame());
    }

    /**
     * 采样性能指标
     */
    private sampleMetrics(): void {
        // 内存监控
        if (this.config.enableMemoryMonitor) {
            const memory = (performance as any).memory;
            if (memory) {
                this.metrics.memory = {
                    geometries: 0,
                    textures: 0,
                    materials: 0,
                    totalMemory: memory.totalJSHeapSize
                };

                const usedMemoryMB = this.metrics.memory.totalMemory / (1024 * 1024);
                if (usedMemoryMB > this.config.memoryWarningThreshold) {
                    this.emit('memoryWarning', usedMemoryMB);
                }
            }
        }

        // 保存历史记录
        this.history.push({ ...this.metrics });
        if (this.history.length > this.config.historySize) {
            this.history.shift();
        }

        this.emit('metrics', this.metrics);
    }

    /**
     * 开始操作计时
     */
    public startOperation(name: string): OperationMetrics {
        if (!this.config.enableOperationMonitor) return { startTime: 0, name };

        const metrics = {
            startTime: performance.now(),
            name
        };
        this.activeOperations.set(name, metrics);
        return metrics;
    }

    /**
     * 结束操作计时
     */
    public endOperation(metrics: OperationMetrics): void {
        if (!this.config.enableOperationMonitor) return;

        const endTime = performance.now();
        const duration = endTime - metrics.startTime;

        let operation = this.metrics.operations.get(metrics.name);
        if (!operation) {
            operation = {
                count: 0,
                totalTime: 0,
                averageTime: 0,
                lastTime: 0
            };
            this.metrics.operations.set(metrics.name, operation);
        }

        operation.count++;
        operation.totalTime += duration;
        operation.averageTime = operation.totalTime / operation.count;
        operation.lastTime = duration;

        this.activeOperations.delete(metrics.name);
        this.emit('operation', {
            name: metrics.name,
            duration,
            metrics: operation
        });
    }

    /**
     * 获取当前性能指标
     */
    public getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    /**
     * 获取性能历史记录
     */
    public getHistory(): PerformanceMetrics[] {
        return [...this.history];
    }

    /**
     * 获取操作统计信息
     */
    public getOperationStats(name: string) {
        return this.metrics.operations.get(name);
    }

    /**
     * 重置性能监控
     */
    public reset(): void {
        this.metrics = this.initializeMetrics();
        this.history = [];
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        this.activeOperations.clear();
    }

    /**
     * 停止性能监控
     */
    public dispose(): void {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        this.removeAllListeners();
        this.reset();
    }
} 