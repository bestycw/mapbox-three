import * as THREE from 'three';

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
  center?: [number, number];
  /** 缩放级别 - 可选，默认 9 */
  zoom?: number;
  /** 倾斜角度 - 可选，默认 45 */
  pitch?: number;
  /** 方位角 - 可选，默认 0 */
  bearing?: number;
  /** 抗锯齿 - 可选，默认 true */
  antialias?: boolean;
  /** 地形配置 - 可选 */
  terrain?: {
    /** 地形数据源 - 可选，默认 'mapbox-dem' */
    source?: string;
    /** 地形夸张度 - 可选，默认 1 */
    exaggeration?: number;
  };
}

/**
 * Three.js渲染器配置接口 - 所有字段可选，有默认值
 */
export interface ThreeRendererConfig {
  /** 抗锯齿 - 默认 true */
  antialias?: boolean;
  /** 透明度 - 默认 true */
  alpha?: boolean;
  /** 是否保留��缓冲 - 默认 false */
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
  /** 自动渲染 - 可选，默认 true */
  autoRender?: boolean;
}

/**
 * 例��配置接口 - 所有字段可选，有默认值
 */
export interface InstancingConfig {
  /** 是否启用 - 默认 false */
  enabled?: boolean;
  /** 实例化阈值 - 默认 100 */
  threshold?: number;
  /** 批处理大小 - 默认 100 */
  batchSize?: number;
  /** 动态批处理 - 默认 true */
  dynamicBatching?: boolean;
  /** 更新间隔(ms) - 默认 16 */
  updateInterval?: number;
  /** 最大实例数 - 默认 10000 */
  maxInstanceCount?: number;
  /** 初始实例数 - 默认 1000 */
  initialCount?: number;
  /** 是否裁剪 - 默认 true */
  frustumCulled?: boolean;
  /** 是否投射阴影 - 默认 true */
  castShadow?: boolean;
  /** 是否接收阴影 - 默认 true */
  receiveShadow?: boolean;
}

/**
 * LOD级别接口
 */
export interface LodLevel {
  /** 距离阈值 */
  distance: number;
  /** 细节级别或替代模型 */
  detail: number | THREE.Mesh;
}

/**
 * LOD配置接口 - 所有字段可选，有默认值
 */
export interface LodConfig {
  /** 是否启用 - 默认 false */
  enabled?: boolean;
  /** 动态调整 - 默认 false */
  dynamicAdjustment?: boolean;
  /** 过渡时间(ms) - 默认 300 */
  transitionDuration?: number;
  /** 性能目标(fps) - 默认 60 */
  performanceTarget?: number;
  /** 更新间隔(ms) - 默认 16 */
  updateInterval?: number;
  /** LOD级别配置 - 默认 [{ distance: 0, detail: 1 }, { distance: 1000, detail: 0.5 }, { distance: 2000, detail: 0.1 }] */
  levels?: LodLevel[];
}

/**
 * 对象池配置接口 - 所有字段可选，有默认值
 */
export interface ObjectPoolConfig {
  /** 是否启用 - 默认 false */
  enabled?: boolean;
  /** 默认池大小 - 默认 1000 */
  defaultPoolSize?: number;
  /** 最大池大小 - 默认 10000 */
  maxPoolSize?: number;
  /** 清理间隔(ms) - 默认 60000 */
  cleanupInterval?: number;
  /** 预测性缩放 - 默认 false */
  predictiveScaling?: boolean;
  /** 最小空闲时间(ms) - 默认 30000 */
  minIdleTime?: number;
  /** 最大空闲时间(ms) - 默认 300000 */
  maxIdleTime?: number;
  /** 预热数量 - 默认 0 */
  warmupCount?: number;
}

/**
 * 内存管理器配置接口 - 所有字段可选，有默认值
 */
export interface MemoryManagerConfig {
  /** 是否启用 - 默认 false */
  enabled?: boolean;
  /** 最大缓存大小(MB) - 默认 100 */
  maxCacheSize?: number;
  /** 清理间隔(ms) - 默认 60000 */
  cleanupInterval?: number;
  /** 资源释放策略 - 默认 'lru' */
  disposalStrategy?: 'lru' | 'lfu';
  /** 是否自动清理 - 默认 true */
  autoCleanup?: boolean;
  /** 内存警告阈值(MB) - 默认 50 */
  warningThreshold?: number;
  /** 内存临界阈值(MB) - 默认 100 */
  criticalThreshold?: number;
}

/**
 * 优化配置接口 - 所有字段可选，有默认值
 */
export interface OptimizationConfig {
  /** 实例化配置 */
  instancing?: InstancingConfig;
  /** LOD配置 */
  lod?: LodConfig;
  /** 对象池配置 */
  objectPool?: ObjectPoolConfig;
  /** 内存管理器配置 */
  memoryManager?: MemoryManagerConfig;
}

/**
 * 完整配置接口
 */
export interface MapboxThreeConfig {
  /** Mapbox配置 - 必填 */
  mapbox: MapboxConfig;
  /** Three.js配置 - 可选，有默认值 */
  three?: ThreeConfig;
  /** 优化配置 - 可选，有默认值 */
  optimization?: OptimizationConfig;
}

/**
 * 深度部分类型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 用户数据接口
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
 * 扩展的Three.js对象接口
 */
export interface ExtendedObject3D extends THREE.Object3D {
  /** MapboxThree实例引用 */
  _mapboxThree?: MapboxThreeType;
  /** 几何体 */
  geometry?: THREE.BufferGeometry;
  /** 材质 */
  material?: THREE.Material | THREE.Material[];
  /** 设置坐标方法 */
  setCoords?: (coords: Coordinates) => void;
  /** 获取坐标方法 */
  getCoords?: () => Coordinates;
  /** 设置高度方法 */
  setAltitude?: (altitude: number) => void;
  /** 获取高度方法 */
  getAltitude?: () => number;
  /** 用户数据 */
  userData: UserData;
}

/**
 * 基础类型
 */
export type Coordinates = [number, number] | [number, number, number];

/**
 * 自定义配置接口
 */
export interface CustomConfig {
  /** LOD配置 */
  lod?: {
    /** 是否禁用LOD */
    disableLOD?: boolean;
    /** LOD级别 */
    lodLevels?: LodLevel[];
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
  totalMemory: number;
  /** 缓存资源数量 */
  cachedResources?: number;
  /** 上次清理时间 */
  lastCleanupTime: number;
}

/**
 * 资源使用记录接口
 */
export interface ResourceUsage {
  /** 最后���用时间 */
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
    /** 动画属性 */
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