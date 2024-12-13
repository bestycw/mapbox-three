# MapboxThree

结合 Mapbox GL JS 和 Three.js 的强大3D可视化库。

## 特性

### 核心功能
- 无缝集成 Mapbox GL JS 和 Three.js
- 地理坐标系统支持
- 自动相机同步
- 事件处理和交互
- 带缓动功能的动画系统

### 3D对象
- 球体、立方体、线条和管道
- 支持自定义几何体
- 材质管理
- 地理位置定位
- 缩放和旋转控制

### 性能优化系统
该库包含一个全面的优化系统，用于处理大规模3D可视化：

#### 优化策略
- **几何体批处理**
  - 合并相似几何体以减少绘制调用
  - 自动批次管理
  - 可配置批次大小

- **实例化渲染**
  - 高效渲染重复对象
  - 自动实例管理
  - 矩阵变换支持

- **对象池**
  - 对象复用以减少垃圾回收压力
  - 自动生命周期管理
  - 支持多种对象类型

- **细节层次 (LOD)**
  - 基于距离的细节调整
  - 多级细节支持
  - 平滑过渡

- **空间索引**
  - 基于八叉树的空间分区
  - 高效空间查询
  - 自动索引更新

#### 性能配置
```typescript
const performanceConfig = {
    // 批处理
    batchingEnabled: true,
    batchSize: 1000,        // 每批次最大对象数
    maxBatches: 100,        // 最大批次数
    
    // 实例化
    instanceThreshold: 100,  // 触发实例化的最小相似对象数
    maxInstances: 10000,    // 每个实例化网格的最大实例数
    
    // 对象池
    poolEnabled: true,
    poolTypes: ['sphere', 'box', 'line', 'tube'],
    maxObjectsInPool: 10000,
    
    // LOD配置
    lodLevels: {
        near: { distance: 100, detail: 1.0 },    // 近距离：全细节
        medium: { distance: 500, detail: 0.5 },   // 中距离：半细节
        far: { distance: 1000, detail: 0.25 }     // 远距离：低细节
    }
};
```

#### 使用示例
```typescript
// 初始化优化管理器
const optimizationManager = OptimizationManager.getInstance();

// 启用优化策略
optimizationManager.enableStrategy('batching');
optimizationManager.enableStrategy('instancing');
optimizationManager.enableStrategy('lod');

// 处理对象
const object = new ExtendedObject3D();
optimizationManager.processObject(object);

// 监控性能
const metrics = optimizationManager.getMetrics();
```

### 工具类
- GeometryFactory: 带缓存的几何体管理
- MaterialFactory: 材质创建和复用
- BatchManager: 几何体批处理管理
- InstanceManager: 实例化渲染管理
- ObjectPool: 对象复用管理
- SpatialIndex: 空间查询
- GeoUtils: 地理工具

### 性能工具
- EventOptimizer: 事件处理优化
- PerformanceMonitor: 性能指标跟踪
- ResourceManager: 资源生命周期管理

## 安装

```bash
npm install mapbox-three
```

## 基本使用

```typescript
import { MapboxThree } from 'mapbox-three';

const mapboxThree = new MapboxThree({
    mapboxConfig: {
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v10',
        accessToken: 'your-access-token',
        center: [-74.5, 40],
        zoom: 9,
        pitch: 60
    }
});

// 添加一个球体
mapboxThree.sphere({
    coordinates: [-74.5, 40],
    radius: 100,
    color: '#ff0000',
    units: 'meters'
});
```

## 文档

详细文档请访问我们的[文档网站](https://docs.mapbox-three.com)。

## 贡献

欢迎贡献！请阅读我们的贡献指南了解详情。

## 许可证

本项目采用 MIT 许可证 - 详见 LICENSE 文件。 