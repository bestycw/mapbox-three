import { EventEmitter } from 'events';
import { BaseConfig, BaseMetrics } from '../config/types';

/**
 * 基础优化策略类
 */
export abstract class BaseStrategy<TConfig extends BaseConfig> extends EventEmitter {
    protected config: Required<TConfig>;
    protected isEnabled: boolean = true;
    protected metrics: BaseMetrics;

    constructor(config: TConfig) {
        super();
        this.config = this.validateConfig(config);
        this.metrics = {
            operationCount: 0,
            lastUpdateTime: 0,
            memoryUsage: 0
        };
    }

    /**
     * 验证和规范化配置
     */
    protected abstract validateConfig(config: Partial<TConfig>): Required<TConfig>;

    /**
     * 初始化策略
     */
    public initialize(): void {
        if (this.config.enabled) {
            this.onInitialize();
        }
    }

    /**
     * 更新策略
     */
    public update(params: any): void {
        if (!this.isEnabled || !this.config.enabled) return;
        this.onUpdate(params);
        this.updateMetrics();
    }

    /**
     * 清理资源
     */
    public dispose(): void {
        this.onDispose();
        this.removeAllListeners();
    }

    /**
     * 清理临时数据
     */
    public clear(): void {
        this.onClear();
    }

    /**
     * 获取性能指标
     */
    public getMetrics(): BaseMetrics {
        return this.metrics;
    }

    /**
     * 启用/禁用策略
     */
    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
    }

    /**
     * 具体初始化实现
     */
    protected abstract onInitialize(): void;

    /**
     * 具体更新实现
     */
    protected abstract onUpdate(params: any): void;

    /**
     * 具体清理实现
     */
    protected abstract onDispose(): void;

    /**
     * 具体清理临时数据实现
     */
    protected abstract onClear(): void;

    /**
     * 更新性能指标
     */
    protected abstract updateMetrics(): void;

    /**
     * 错误处理
     */
    protected handleError(message: string, error?: any): void {
        console.error(`[${this.constructor.name}] ${message}`, error);
        this.emit('error', { message, error });
    }
} 