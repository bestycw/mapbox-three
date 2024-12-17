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

##### 细节层次 (LOD)
LOD系统通过根据观察距离动态调整对象的细节级别来优化渲染性能。

**使用场景**：
- 大规模3D模型的渲染
- 远近景物的细节控制
- 复杂地形或建筑模型
- 需要在性能和视觉质量之间平衡的场景

**核心功能**：
- 基于距离的自动细节调整
- 支持自定义LOD级别
- 平滑的细节过渡效果
- 动态性能调整
- 内存优化的几何体管理

**配置示例**：
```typescript
const config = {
    optimization: {
        lod: {
            enabled: true,                // 启用LOD
            dynamicAdjustment: true,     // 启用动态调整
            transitionDuration: 300,      // 过渡动画时长(ms)
            performanceTarget: 60,        // 目标帧率
            levels: [
                { distance: 0, detail: 1 },      // 近距离：完整细节
                { distance: 1000, detail: 0.5 }, // 中距离：一半细节
                { distance: 2000, detail: 0.25 } // 远距离：四分之一细节
            ]
        }
    }
};
```

**使用示例**：
```typescript
// 使用默认LOD配置
mapboxThree.add(object);

// 使用自定义LOD配置
mapboxThree.add(object, {}, {
    lod: {
        lodLevels: [
            { distance: 0, detail: 1 },
            { distance: 1000, detail: 0.6 },
            { distance: 2000, detail: 0.3 }
        ]
    }
});

// 使用不同几何体作为LOD级别
const highDetail = new THREE.TorusKnotGeometry(100, 30, 128, 32);
const mediumDetail = new THREE.TorusKnotGeometry(100, 30, 64, 16);
const lowDetail = new THREE.TorusKnotGeometry(100, 30, 32, 8);

mapboxThree.add(highMesh, {}, {
    lod: {
        lodLevels: [
            { distance: 0, detail: highMesh },
            { distance: 1000, detail: mediumMesh },
            { distance: 2000, detail: lowMesh }
        ]
    }
});
```

##### 对象池
对象池系统通过重用对象来减少内存分配和垃圾回收，提高性能和内存使用效率。

**使用场景**：
- 频繁创建和销毁的对象（如粒子系统）
- 大量相似对象的动态管理
- 需要优化内存使用的场景
- 实时动画和特效系统

**核心功能**：
1. 基础功能
- 自动对象预加载和预热
- 动态池大小调整
- 智能内存管理
- 自动对象重置
- 性能监控统计

2. 生命周期管理
- 对象使用次数追踪
- 空闲时间监控
- 自动清理策略
- 对象年龄管理

3. 性能监控
- 缓存命中率统计
- 获取时间追踪
- 内存使用估算
- 对象周转率计算
- 峰值使用量记录

4. 预测性扩展
- 基于历史数据的需求预测
- 自动扩展池大小
- 智能预热策略
- 动态容量调整

**配置示例**：
```typescript
const config = {
    optimization: {
        objectPool: {
            enabled: true,           // 启用对象池
            maxSize: 1000,          // 每个池的最大对象数
            preloadCount: 50,       // 预加载对象数量
            autoExpand: true,       // 自动扩展池大小
            cleanupInterval: 5000,  // 清理间隔(ms)
            predictiveScaling: true, // 启用预测性扩展
            minIdleTime: 30000,     // 最小空闲时间(ms)
            maxIdleTime: 300000,    // 最大空闲时间(ms)
            warmupCount: 100        // 预热对象数���
        }
    }
};
```

**使用示例**：
```typescript
// 从对象池获取对象
const object = optimizationManager.acquireFromPool(
    'particle',
    () => {
        // 工厂函数：创建新对象
        return new THREE.Mesh(
            new THREE.SphereGeometry(1),
            new THREE.MeshBasicMaterial()
        );
    },
    (obj) => {
        // 重置函数：重置对象状态
        obj.visible = true;
        obj.position.set(0, 0, 0);
        obj.scale.set(1, 1, 1);
    }
);

// 使用对象
// ...

// 释放对象回池
optimizationManager.releaseToPool('particle', object);

// 获取对象池统计信息
const stats = optimizationManager.getObjectPoolManager().getStats();
console.log(stats);
/* 输出示例：
{
    "particle": {
        available: 100,        // 可用对象数
        inUse: 50,            // 使用中对象数
        metrics: {
            hitRate: 0.85,    // 缓存命中率
            averageAcquisitionTime: 0.5, // 平均获取时间(ms)
            peakUsage: 200,   // 峰值使用量
            turnoverRate: 0.4, // 对象周转率
            memoryUsage: 1024 // 内存使用(bytes)
        },
        lifecycle: {
            averageUseCount: 15,     // 平均使用次数
            averageTimeInPool: 5000, // 平均池中时间(ms)
            oldestObject: 1234567890 // 最老对象创建时间
        }
    }
}
*/

// 清理未使用的对象
optimizationManager.cleanup();
```

**性能优化建议**：
1. 预热策略
   - 根据预期负载设置适当的预热数量
   - 在空闲时间进行预热
   - 使用历史数据调整预热量

2. 内存管理
   - 设置合理的最大池大小
   - 配置适当的空闲时间阈值
   - 定期清理长时间未使用的对象

3. 预测性扩展
   - 启用预测性扩展以应对负载波动
   - 监控预测准确度
   - 根据实际情况调整预测参数

4. 监控和调优
   - 定期检查性能指标
   - 关注缓存命中率
   - 分析对象使用模式
   - 优化获取和释放策略

这两个优化系统可以结合使用，在处理大规模动态3D场景时提供显著的性能提升。

##### 内存管理
内存管理系统通过智能缓存和资源生命周期管理来优化内存使用。

**使用场景**：
- 大规模3D场景的资源管理
- 动态加载和卸载的场景
- 内存敏感的应用
- 需要预防内存泄漏的场景

**核心功能**：
1. 资源缓存管理
- 几何体缓存
- 纹理缓存
- 材质缓存
- Shader程序缓存

2. 内存监控
- 实时内存统计
- 资源使用追踪
- 阈值警告系统
- 自动清理机制

3. 资源生命周期
- 使用频率分析
- 空闲时间追踪
- LRU/LFU清理策略
- 智能预加载

**配置示例**：
```typescript
const config = {
    optimization: {
        memoryManager: {
            enabled: true,
            maxCacheSize: 512,        // 最大缓存大小(MB)
            cleanupInterval: 30000,   // 清理间隔(ms)
            disposalStrategy: 'lru',  // 资源释放策略
            autoCleanup: true,        // 自动清理
            warningThreshold: 384,    // 警告阈值(MB)
            criticalThreshold: 480    // 临界阈值(MB)
        }
    }
};
```

**使用示例**：
```typescript
// 获取内存管理器
const memoryManager = optimizationManager.getMemoryManager();

// 缓存资源
memoryManager.cacheGeometry('key', geometry);
memoryManager.cacheTexture('key', texture);
memoryManager.cacheMaterial('key', material);

// 获取缓存的资源
const cachedGeometry = memoryManager.getGeometry('key');

// 监控内存使用
const stats = memoryManager.getMemoryStats();
console.log('Memory usage:', stats);
/* 输出示例：
{
    geometries: 100,         // 几何体数量
    textures: 50,           // 纹理数量
    materials: 30,          // 材质数量
    programs: 10,           // shader程序数量
    totalMemory: 256000000, // 总内存使用(bytes)
    cachedResources: 190,   // 缓存资源数量
    lastCleanupTime: 1234567890 // 上次清理时间
}
*/

// 设置内存警告回调
memoryManager.setWarningCallback((stats) => {
    console.warn('Memory usage warning:', stats);
});

// 手动清理资源
memoryManager.cleanup();
```

**性能优化建议**：
1. 缓存策略
   - 根据使用频率调整缓存大小
   - 合理设置清理阈值
   - 选择适当的释放策略

2. 内存监控
   - 定期检查内存使用
   - 设置合理的警告阈值
   - 及时响应内存警告

3. 资源管理
   - 及时释放不需要的资源
   - 使用预加载优化加载时间
   - 避免重复创建相同资源

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