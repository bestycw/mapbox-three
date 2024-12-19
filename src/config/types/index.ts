import * as THREE from 'three';
import { EventEmitter } from '../../utils/EventEmitter';

// 移除循环依赖，改用类型声明
type MapboxThreeType = any; // 避免循环依赖

/**
 * Mapbox配置接口
 */
export interface MapboxConfig {
  /** 容器ID - 必填 */
  container: string;
  /** 地图样式 - 必填 */
  style: string;
  /** 访问令牌 - 必填 */
  accessToken: string;
  /** 中心点坐标 [经度, 纬度] - 可选，默认 [-74.5, 40] */
  center: [number, number];
  /** 缩放级别 - 可选，默认 9 */
  zoom?: number;
  /** 倾斜角度 - 可选，默认 45 */
  pitch?: number;
  /** 方位角 - 可选，默认 0 */
  bearing?: number;
  /** 抗锯齿 - 可选，默认 true */
  antialias?: boolean;
}

/**
 * Three.js渲染器配置接口 - 所有字段可选，有默认值
 */
export interface ThreeRendererConfig {
  /** 抗锯齿 - 默认 true */
  antialias?: boolean;
  /** 透明度 - 默认 true */
  alpha?: boolean;
  /** 是否保留 - 默认 false */
  preserveDrawingBuffer?: boolean;
  /** 阴影贴图配置 */
  shadowMap?: {
    /** 是否启用 - 默认 true */
    enabled?: boolean;
    /** 阴影类型 - 默认 THREE.PCFSoftShadowMap */
    type?: THREE.ShadowMapType;
  };
}

/**
 * Three.js相机配置接口 - 所有字段可选，有默认值
 */
export interface ThreeCameraConfig {
  /** 视场角 - 默认 45 */
  fov?: number;
  /** 近平面 - 默认 0.1 */
  near?: number;
  /** 远平面 - 默认 Infinity */
  far?: number;
  /** 相机位置 - 默认 new THREE.Vector3(0, 0, 100) */
  position?: THREE.Vector3;
  /** 是否启用相机同步 - 默认 true */
  sync?: boolean;
}

/**
 * Three.js场景配置接口 - 所有字段可选，有默认值
 */
export interface ThreeSceneConfig {
  /** 背景颜色 - 可选 */
  background?: string;
  /** 雾效配置 - 可选 */
  fog?: {
    /** 是否启用 - 默认 false */
    enabled?: boolean;
    /** 起始距离 - 默认 1 */
    near?: number;
    /** 结束距离 - 默认 1000 */
    far?: number;
  };
}

/**
 * Three.js灯光配置接口 - 所有字段可选，有默认值
 */
export interface ThreeLightsConfig {
  /** 环境光配置 */
  ambient?: {
    /** 是否启用 - 默认 true */
    enabled?: boolean;
    /** 颜色 - 默认 '#ffffff' */
    color?: string;
    /** 强度 - 默认 0.5 */
    intensity?: number;
  };
  /** 平行光配置 */
  directional?: {
    /** 是否启用 - 默认 true */
    enabled?: boolean;
    /** 颜色 - 默认 '#ffffff' */
    color?: string;
    /** 强度 - 默认 1.0 */
    intensity?: number;
    /** 位置 - 默认 new THREE.Vector3(100, 100, 100) */
    position?: THREE.Vector3;
    /** 是否投射阴影 - 默认 true */
    castShadow?: boolean;
    /** 阴影配置 */
    shadow?: {
      /** 阴影贴图尺寸 - 默认 new THREE.Vector2(1024, 1024) */
      mapSize?: THREE.Vector2;
      /** 阴影相机配置 */
      camera?: {
        /** 近平面 - 默认 0.5 */
        near?: number;
        /** 远平面 - 默认 500 */
        far?: number;
      };
    };
  };
}

/**
 * Three.js配置接口
 */
export interface ThreeConfig {
  /** 渲染器配置 - 可选，有默认值 */
  renderer?: ThreeRendererConfig;
  /** 相机配置 - 可选，有默认值 */
  camera?: ThreeCameraConfig;
  /** 场景配置 - 可选，有默认值 */
  scene?: ThreeSceneConfig;
  /** 灯光配置 - 可选，有默认值 */
  lights?: ThreeLightsConfig;
  /** 渲染模式 - 可选，默认 'auto' */
  renderMode?: 'auto' | 'manual' | 'ondemand';
  /** 自动渲染 - 可选，默 true */
  autoRender?: boolean;
}

/**
 * 基础配置接口 - 所有字段可选，有默认值
 */
export interface BaseConfig {
    enabled?: boolean;              // 是否启用 - 默认 false
    updateInterval?: number;        // 更新间隔(ms) - 默认 16
    autoCleanup?: boolean;         // 是否自动清理 - 默认 true
    cleanupInterval?: number;      // 清理间隔(ms) - 默认 60000
    warningThreshold?: number;     // 警告阈值(0-1) - 默认 0.7
    criticalThreshold?: number;    // 临界阈值(0-1) - 默认 0.9
    maxSize?: number;              // 最大大小 - 默认 1000
    debugMode?: boolean;           // 调试模式 - 默认 false
}

/**
 * 基础指标接口 - 所有字段可选
 */
export interface BaseMetrics {
    operationCount?: number;       // 操作计数
    lastUpdateTime?: number;       // 最后更新时间
    memoryUsage?: number;         // 内存使用量
}

/**
 * 实例化配置接口 - 所有字段可选，有默认值
 */
export interface InstanceConfig extends BaseConfig {
    threshold?: number;           // 启用实例化的阈值 - 默认 100
    maxInstanceCount?: number;    // 每个组的最大实例数 - 默认 10000
    batchSize?: number;          // 批处理大小 - 默认 100
    dynamicBatching?: boolean;   // 是否启用动态批处理 - 默认 true
    mergeGeometry?: boolean;     // 是否合体 - 默认 true
    shareBuffers?: boolean;      // 是否共享缓冲区 - 默认 true
    initialCount?: number;       // 初始实例数 - 默认 1000
    frustumCulled?: boolean;     // 是否进行视锥裁剪 - 默认 true
    castShadow?: boolean;        // 是否投射阴影 - 默认 true
    receiveShadow?: boolean;     // 是否接收阴影 - 默认 true
}

/**
 * 实例化指标接口 - 所有字段可选
 */
export interface InstanceMetrics extends BaseMetrics {
    instanceCount?: number;      // 实例数量
    batchCount?: number;        // 批次数量
    drawCalls?: number;         // 绘制调用次数
    updateTime?: number;        // 更新时间
}

/**
 * LOD配置接口 - 所有字段可选，有默认值
 */
export interface LODConfig extends BaseConfig {
    levels?: Array<{              // LOD级别配置
        distance: number;         // 距离阈值
        detail: number;          // 细节级别 (0-1)
    }>;
    dynamicAdjustment?: boolean;  // 是否动态调整 - 默认 false
    performanceTarget?: number;   // 性能目标（FPS）- 默认 60
    transitionDuration?: number;  // 过渡时间（毫秒）- 默认 300
}

/**
 * LOD指标接口 - 所有字段可选
 */
export interface LODMetrics extends BaseMetrics {
    activeObjects?: number;       // 活跃对象数
    totalLevels?: number;        // 总级别数
    averageDistance?: number;    // 平均距离
}

/**
 * 对象池配置接口 - 所有字段可选，有默认值
 */
export interface ObjectPoolConfig extends BaseConfig {
    maxPoolSize?: number;          // 每个池的最大对象数量 - 默认 10000
    defaultPoolSize?: number;      // 默认池大小 - ���认 1000
    shrinkThreshold?: number;      // 收缩阈值 (0-1) - 默认 0.3
    prewarmPools?: boolean;        // 是否预热池 - 默认 false
    predictiveScaling?: boolean;   // 是否启用预测性缩放 - 默认 false
    minIdleTime?: number;          // 最小空闲时间(ms) - 默认 30000
    maxIdleTime?: number;          // 最大空闲时间(ms) - 默认 300000
    warmupCount?: number;          // 预热数量 - 默认 0
}

/**
 * 对象池指标接口 - 所有字段可选
 */
export interface ObjectPoolMetrics extends BaseMetrics {
    totalObjects?: number;         // 总对象数
    activeObjects?: number;        // 活跃对象数
    inactiveObjects?: number;      // 非活跃对象数
    hitRatio?: number;            // 命中率
}

/**
 * 内存管理配置接口 - 所有字段可选，有默认值
 */
export interface MemoryConfig extends BaseConfig {
    maxTextureSize?: number;     // 最大纹理大小 - 默认 2048
    maxGeometryVertices?: number;// 最大几何体顶点数 - 默认 65536
    maxCachedGeometries?: number;// 最大缓存几何体数 - 默认 1000
    maxCachedTextures?: number;  // 最大缓存纹理数 - 默认 100
    maxCachedMaterials?: number; // 最大缓存材质数 - 默认 100
    maxCacheSize?: number;       // 最大缓存大小(MB) - 默认 100
    disposalStrategy?: 'lru' | 'lfu'; // 资源释放策略 - 默认 'lru'
}

/**
 * 内存管理指标接口 - 所有字段可选
 */
export interface MemoryMetrics extends BaseMetrics {
    geometries?: number;         // 几何体数量
    textures?: number;          // 纹理数量
    materials?: number;         // 材质数量
    programs?: number;          // 着色器程序数量
    totalMemory?: number;       // 总内存使用
    maxMemory?: number;         // 最大内存限制
}

/**
 * 扩展的Three.js对象接口
 */
export interface ExtendedObject3D extends THREE.Object3D {
    _mapboxThree?: MapboxThreeType;
    geometry?: THREE.BufferGeometry;
    material?: THREE.Material | THREE.Material[];
    [key: string]: any;
}

/**
 * 完整配置接口 - 只保留必需的初始化字段
 */
export interface MapboxThreeConfig {
    /** Mapbox配置 - 必填 */
    mapbox: MapboxConfig;
    /** Three.js配置 - 选，有默认值 */
    three?: ThreeConfig;
    /** 优化配置 - 可选，有默认值 */
    optimization?: OptimizationConfig;
}

/**
 * 优化配置接口 - 所有字段可选，有默认值
 */
export interface OptimizationConfig {
  /** 实例化配置 */
  instancing?: InstanceConfig;
  /** LOD配置 */
  lod?: LODConfig;
  /** 对象池配置 */
  objectPool?: ObjectPoolConfig;
  /** 内存管理器配置 */
  memoryManager?: MemoryConfig;
}

/**
 * ��户数据接口
 */
export interface UserData {
  /** 单位类型 */
  units?: 'scene' | 'meters';
  /** 是否为用户对象 */
  isUser?: boolean;
  /** 动画ID */
  animationId?: string;
  /** 对象池类型 */
  poolType?: string;
  /** 其他自定义属性 */
  [key: string]: any;
}

/**
 * 基础类型
 */
export type Coordinates = [number, number] | [number, number, number];

/**
 * LOD级别接口
 */
export interface LODLevel {
    /** 距离阈值 */
    distance: number;
    /** 细节级别 */
    detail: number;
}

/**
 * 自定义配置接口
 */
export interface CustomConfig {
  /** LOD配置 */
  lod?: {
    /** 是否禁用LOD */
    disableLOD?: boolean;
    /** LOD级别 */
    lodLevels?: LODLevel[];
  };
  /** 坐标配置 */
  coordinates?: Coordinates;
}

/**
 * 内存统计信息接口
 */
export interface MemoryStats {
  /** 几何体数量 */
  geometries?: number;
  /** 纹理数量 */
  textures?: number;
  /** 材质数量 */
  materials?: number;
  /** shader程序数量 */
  programs?: number;
  /** 总内存占用(bytes) */
  totalJSHeapSize: number;
  /** 已使用内存(bytes) */
  usedJSHeapSize: number;
  /** 内存限制(bytes) */
  jsHeapSizeLimit: number;
  /** 缓存资源数量 */
  cachedResources?: number;
  /** 上次清理时间 */
  lastCleanupTime: number;
}

/**
 * 资源使用记录接口
 */
export interface ResourceUsage {
  /** 最后用时间 */
  lastUsed: number;
  /** 使用次数 */
  useCount: number;
  /** 估算大小(bytes) */
  size: number;
  /** 资源类型 */
  type: 'geometry' | 'texture' | 'material' | 'program';
}

/**
 * 动画选项接口
 */
export interface AnimationOptions {
    /** 动画持续时间(ms) - 默认 1000 */
    duration?: number;
    /** 缓动类型 */
    easing?: EasingType;
    /** 重复次数 */
    repeat?: number;
    /** 是否往返动画 */
    yoyo?: boolean;
    /** 动画开始回调 */
    onStart?: () => void;
    /** 动画更新回调 */
    onUpdate?: (progress: number) => void;
    /** 动画完成回调 */
    onComplete?: () => void;
}

/**
 * 动画状态接口
 */
export interface AnimationState {
    /** 动画ID */
    id: string;
    /** 动画对象 */
    object: ExtendedObject3D;
    /** 开始时间 */
    startTime: number;
    /** 持续时间 */
    duration: number;
    /** 已经过时间 */
    elapsed: number;
    /** 动画性 */
    properties: Record<string, { start: number; end: number; easing?: EasingType }>;
    /** 动画选项 */
    options: AnimationOptions;
    /** 是否正在播放 */
    isPlaying: boolean;
    /** 是否暂停 */
    isPaused: boolean;
}

/**
 * 缓动类型
 */
export type EasingType = 'Linear' | 'QuadIn' | 'QuadOut' | 'QuadInOut' | 'ElasticOut';

/**
 * 优化事件枚举
 */
export enum OptimizationEvent {
    INITIALIZED = 'initialized',
    OBJECT_OPTIMIZED = 'objectOptimized',
    ERROR = 'error'
}

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
    memory?: MemoryMetrics;
    instances?: {
        count: number;
        batches: number;
        drawCalls: number;
    };
    performance: {
        fps: number;
        frameTime: number;
        operations: Record<string, number>;
    };
}

/**
 * 基础策略类
 */
export abstract class BaseStrategy<TConfig extends BaseConfig = BaseConfig> extends EventEmitter {
    protected config: TConfig;
    protected isEnabled: boolean = true;
    protected metrics: BaseMetrics = {
        operationCount: 0,
        lastUpdateTime: 0,
        memoryUsage: 0
    };

    constructor(config: TConfig) {
        super();
        this.config = config;
    }

    protected abstract validateConfig(config: Partial<TConfig>): Required<TConfig>;
    protected abstract onInitialize(): void;
    protected abstract onUpdate(params: any): void;
    protected abstract onDispose(): void;
    protected abstract onClear(): void;
    protected abstract updateMetrics(): void;

    protected disposeResources(resources: {
        geometries?: THREE.BufferGeometry[];
        materials?: THREE.Material[];
        textures?: THREE.Texture[];
    }): void {
        if (resources.geometries) {
            resources.geometries.forEach(geometry => geometry.dispose());
        }
        if (resources.materials) {
            resources.materials.forEach(material => material.dispose());
        }
        if (resources.textures) {
            resources.textures.forEach(texture => texture.dispose());
        }
    }
}

/**
 * 优化选项接口
 */
export interface OptimizationOptions {
    lod?: {
        levels: Array<{ distance: number; detail: number | THREE.Mesh }>;
    };
    instancing?: {
        groupId: string;
        maxInstances?: number;
    };
    objectPool?: {
        key: string;
        maxSize?: number;
    };
}

/**
 * 资源类型
 */
export type ResourceType = 'geometry' | 'texture' | 'material' | 'program';