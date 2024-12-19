import * as THREE from 'three';
import { BaseStrategy } from './BaseStrategy';
import { BaseConfig, ExtendedObject3D, LODMetrics } from '../config/types';
import { defaultConfig } from '../config';
// import { LODMetrics } from '../config/types';

/**
 * LOD管理器配置接口
 */
export interface LODConfig extends BaseConfig {
    levels: Array<{ distance: number; detail: number }>;
    dynamicAdjustment: boolean;
    performanceTarget: number;
    transitionDuration: number;
    maxCacheSize: number;
}

/**
 * LOD管理器 - 处理物体的细节层次
 */
export class LODManager extends BaseStrategy<LODConfig> {
    private static instance: LODManager;
    private lodObjects: Map<string, THREE.LOD> = new Map();
    private geometryCache: Map<string, THREE.BufferGeometry> = new Map();
    private maxCacheSize: number = 1000;
    private beforeLODHook?: (object: ExtendedObject3D, distance: number) => void;
    private afterLODHook?: (object: ExtendedObject3D, distance: number) => void;
    private lastFrameTime: number = 0;
    private frameTime: number = 0;
    private transitionObjects: Map<string, {
        startTime: number;
        fromLevel: number;
        toLevel: number;
        duration: number;
    }> = new Map();
    protected metrics: Required<LODMetrics> = {
        operationCount: 0,
        lastUpdateTime: 0,
        memoryUsage: 0,
        activeObjects: 0,
        totalLevels: 0,
        averageDistance: 0
    };

    public constructor(config: Partial<LODConfig>) {
        super(config as LODConfig);
    }

    public static getInstance(config: Partial<LODConfig>): LODManager {
        if (!LODManager.instance) {
            LODManager.instance = new LODManager(config);
        }
        return LODManager.instance;
    }

    protected validateConfig(config: Partial<LODConfig>): Required<LODConfig> {
        const defaultLOD = defaultConfig.optimization?.lod ?? {};
        return {
            ...defaultLOD,
            ...config
        } as Required<LODConfig>;
    }
    protected onInitialize(): void {
        // 初始化时不需要特殊处理
    }

    protected onUpdate(params: { camera: THREE.Camera }): void {
        if (!this.isEnabled) return;

        const { camera } = params;
        this.adjustLODLevels();

        this.lodObjects.forEach((lod) => {
            const distance = camera.position.distanceTo(lod.position);
            
            if (this.beforeLODHook) {
                this.beforeLODHook(lod, distance);
            }

            const currentLevel = lod.getCurrentLevel();
            this.updateOnDistance(lod, distance);
            const newLevel = lod.getCurrentLevel();

            if (currentLevel !== newLevel) {
                this.handleTransition(lod, currentLevel, newLevel);
            }

            if (this.afterLODHook) {
                this.afterLODHook(lod, distance);
            }
        });
    }

    protected onClear(): void {
        // 清理临时数据
        this.clearCache();  // 复用现有方法
        this.lodObjects.clear();
        this.updateMetrics();
    }

    protected onDispose(): void {
        // 释放资源
        this.lodObjects.forEach(lod => {
            lod.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    if (child.material instanceof THREE.Material) {
                        child.material.dispose();
                    }
                }
            });
        });
        this.lodObjects.clear();
        this.clearCache();
    }

    protected updateMetrics(): void {
        let totalMemory = 0;
        let totalLevels = 0;

        this.geometryCache.forEach(geometry => {
            totalMemory += this.estimateGeometrySize(geometry);
        });

        this.lodObjects.forEach(lod => {
            totalLevels += lod.levels.length;
        });

        this.metrics = {
            ...this.metrics,
            operationCount: this.metrics.operationCount + 1,
            lastUpdateTime: Date.now(),
            memoryUsage: totalMemory
        };
    }

    /**
     * 获取或创建简的几何体
     */
    private getSimplifiedGeometry(originalGeometry: THREE.BufferGeometry, detail: number): THREE.BufferGeometry {
        const uuid = originalGeometry.uuid || THREE.MathUtils.generateUUID();
        const cacheKey = `${uuid}_${detail}`;
        
        if (this.geometryCache.has(cacheKey)) {
            return this.geometryCache.get(cacheKey)!;
        }

        const simplified = this.simplifyGeometry(originalGeometry, detail);
        
        // 缓存管理
        if (this.geometryCache.size >= this.maxCacheSize) {
            const keys = Array.from(this.geometryCache.keys());
            if (keys.length > 0) {
                const oldestKey = keys[0];
                const oldGeometry = this.geometryCache.get(oldestKey);
                oldGeometry?.dispose();
                this.geometryCache.delete(oldestKey);
            }
        }
        
        this.geometryCache.set(cacheKey, simplified);
        return simplified;
    }

    /**
     * 为对象设置LOD
     */
    public setupLOD(object: ExtendedObject3D, customLevels?: Array<{ distance: number; detail: number | THREE.Mesh }>) {
        // 检查对象的userData中是否禁用了LOD
        if (!this.config.enabled || object.userData.disableLOD) return object;

        if (object instanceof THREE.LOD) return object;
        // console.log(customLevels)
        const levels = customLevels || this.config.levels;
        if (!levels || levels.length === 0) return object;

        const lod = new THREE.LOD();
        lod.autoUpdate = false;
        lod.position.copy(object.position);
        lod.rotation.copy(object.rotation);
        lod.scale.copy(object.scale);
        lod.userData = { ...object.userData };
        object.visible = true;
        levels.forEach(({ distance, detail }) => {
            const levelObject = this.createLODLevel(object, detail);
            if (levelObject) {
                lod.addLevel(levelObject, distance);
            }
        });
        // console.log(lod)
        const id = object.uuid;
        this.lodObjects.set(id, lod);

        return lod;
    }

    /**
     * 创建LOD级别对象
     */
    private createLODLevel(originalObject: ExtendedObject3D, detail: number | THREE.Mesh ): ExtendedObject3D | null {
        if (!(originalObject instanceof THREE.Mesh)) return null;

        if (typeof detail !== 'number') {
            return detail;
        }

        const geometry = originalObject.geometry;
        if (!geometry) return null;

        const simplifiedGeometry = this.getSimplifiedGeometry(geometry, detail);
        const material = originalObject.material;

        const levelObject = new THREE.Mesh(simplifiedGeometry, material);
        levelObject.castShadow = originalObject.castShadow;
        levelObject.receiveShadow = originalObject.receiveShadow;

        return levelObject;
    }

    /**
     * 简化几何体
     */
    private simplifyGeometry(geometry: THREE.BufferGeometry, detail: number): THREE.BufferGeometry {
        if (detail >= 1) return geometry.clone();

        const positions = geometry.getAttribute('position');
        const normals = geometry.getAttribute('normal');
        const uvs = geometry.getAttribute('uv');
        const indices = geometry.getIndex();

        // 如果有索引，使用索引优化
        if (indices) {
            return this.simplifyIndexedGeometry(geometry, detail);
        }

        const targetVertexCount = Math.max(4, Math.floor(positions.count * detail));
        const simplified = new THREE.BufferGeometry();
        
        // 使用顶点聚类算法
        const gridSize = Math.ceil(1 / detail);
        const grid: Map<string, number[]> = new Map();
        
        // 将顶点分配到网格
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            
            // 计算网格坐标
            const gx = Math.floor(x * gridSize);
            const gy = Math.floor(y * gridSize);
            const gz = Math.floor(z * gridSize);
            const key = `${gx},${gy},${gz}`;
            
            if (!grid.has(key)) {
                grid.set(key, []);
            }
            grid.get(key)!.push(i);
        }

        // 为每个网格单元创建平均顶点
        const newPositions: number[] = [];
        const newNormals: number[] = [];
        const newUvs: number[] = [];
        
        grid.forEach(indices => {
            let avgX = 0, avgY = 0, avgZ = 0;
            let avgNX = 0, avgNY = 0, avgNZ = 0;
            let avgU = 0, avgV = 0;
            
            indices.forEach(index => {
                avgX += positions.getX(index);
                avgY += positions.getY(index);
                avgZ += positions.getZ(index);
                
                if (normals) {
                    avgNX += normals.getX(index);
                    avgNY += normals.getY(index);
                    avgNZ += normals.getZ(index);
                }
                
                if (uvs) {
                    avgU += uvs.getX(index);
                    avgV += uvs.getY(index);
                }
            });
            
            const count = indices.length;
            newPositions.push(avgX/count, avgY/count, avgZ/count);
            
            if (normals) {
                const length = Math.sqrt(avgNX*avgNX + avgNY*avgNY + avgNZ*avgNZ);
                newNormals.push(avgNX/length, avgNY/length, avgNZ/length);
            }
            
            if (uvs) {
                newUvs.push(avgU/count, avgV/count);
            }
        });

        simplified.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
        if (normals) {
            simplified.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
        }
        if (uvs) {
            simplified.setAttribute('uv', new THREE.Float32BufferAttribute(newUvs, 2));
        }

        return simplified;
    }

    /**
     * 简化带索引的几何体
     */
    private simplifyIndexedGeometry(geometry: THREE.BufferGeometry, detail: number): THREE.BufferGeometry {
        const indices = geometry.getIndex()!;
        const positions = geometry.getAttribute('position');
        const normals = geometry.getAttribute('normal');
        const uvs = geometry.getAttribute('uv');

        const targetTriangleCount = Math.max(2, Math.floor(indices.count / 3 * detail));
        const simplified = new THREE.BufferGeometry();

        // 计算每个顶点的重要性
        const vertexImportance = new Float32Array(positions.count);
        for (let i = 0; i < indices.count; i += 3) {
            const a = indices.getX(i);
            const b = indices.getX(i + 1);
            const c = indices.getX(i + 2);

            // 计算三角形面积作为重要性度量
            const va = new THREE.Vector3().fromBufferAttribute(positions, a);
            const vb = new THREE.Vector3().fromBufferAttribute(positions, b);
            const vc = new THREE.Vector3().fromBufferAttribute(positions, c);
            const area = new THREE.Triangle(va, vb, vc).getArea();

            vertexImportance[a] += area;
            vertexImportance[b] += area;
            vertexImportance[c] += area;
        }

        // 根据重要性排序顶点
        const vertexOrder = Array.from({length: positions.count}, (_, i) => i)
            .sort((a, b) => vertexImportance[b] - vertexImportance[a]);

        // 选择重要的顶点
        const targetVertexCount = Math.ceil(positions.count * detail);
        const selectedVertices = new Set(vertexOrder.slice(0, targetVertexCount));

        // 创建新的顶点和索引数组
        const newPositions: number[] = [];
        const newNormals: number[] = [];
        const newUvs: number[] = [];
        const newIndices: number[] = [];
        const oldToNewIndex = new Map();

        // 只保留选的顶点
        selectedVertices.forEach(oldIndex => {
            const newIndex = newPositions.length / 3;
            oldToNewIndex.set(oldIndex, newIndex);

            newPositions.push(
                positions.getX(oldIndex),
                positions.getY(oldIndex),
                positions.getZ(oldIndex)
            );

            if (normals) {
                newNormals.push(
                    normals.getX(oldIndex),
                    normals.getY(oldIndex),
                    normals.getZ(oldIndex)
                );
            }

            if (uvs) {
                newUvs.push(
                    uvs.getX(oldIndex),
                    uvs.getY(oldIndex)
                );
            }
        });

        // 重建索引
        for (let i = 0; i < indices.count; i += 3) {
            const a = indices.getX(i);
            const b = indices.getX(i + 1);
            const c = indices.getX(i + 2);

            if (selectedVertices.has(a) && selectedVertices.has(b) && selectedVertices.has(c)) {
                newIndices.push(
                    oldToNewIndex.get(a),
                    oldToNewIndex.get(b),
                    oldToNewIndex.get(c)
                );
            }
        }

        simplified.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
        if (normals) {
            simplified.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
        }
        if (uvs) {
            simplified.setAttribute('uv', new THREE.Float32BufferAttribute(newUvs, 2));
        }
        simplified.setIndex(newIndices);

        return simplified;
    }

    private updateOnDistance( lod: THREE.LOD, distance:number ):void {
        const levels = lod.levels;
        // console.log(levels)
        if (levels.length > 1) {

            
            // 确保第一个层级可作为默认值
            levels[0].object.visible = true;

            let i, l;
            for (i = 1, l = levels.length; i < l; i++) {
                // 初始化滞后阈值
                if (levels[i].hysteresis === undefined) {
                    levels[i].hysteresis = 0;
                }

                let levelDistance = levels[i].distance;

                if (levels[i].object.visible) {
                    levelDistance -= levelDistance * levels[i].hysteresis;
                }
                // console.log(distance,distance-levelDistance)
                if (distance >= levelDistance) {
                    // console.log(i)
                    levels[i - 1].object.visible = false;
                    levels[i].object.visible = true;
                } else {
                    break;
                }
            }
     
            // 记录前层级
            (lod as any)._currentLevel = i - 1;
            // console.log(i,l)
            // 隐藏剩余的层级
            for (; i < l; i++) {
                levels[i].object.visible = false;
            }
        }
    }
    /**
     * 设置LOD钩子函数
     */
    public setHooks(
        beforeHook?: (object: ExtendedObject3D, distance: number) => void,
        afterHook?: (object: ExtendedObject3D, distance: number) => void
    ): void {
        this.beforeLODHook = beforeHook;
        this.afterLODHook = afterHook;
    }

    /**
     * 移除对象的LOD
     */
    public remove(object: ExtendedObject3D): void {
        const id = object.uuid;
        if (this.lodObjects.has(id)) {
            this.lodObjects.delete(id);
        }
    }

    /**
     * 获取对象的LOD配置
     */
    public getConfig(object?: ExtendedObject3D): Array<{ distance: number; detail: number }> | undefined {
        if (!object) return undefined;
        const lod = this.lodObjects.get(object.uuid);
        if (!lod) return undefined;

        return lod.levels.map(level => ({
            distance: level.distance,
            detail: level.object instanceof THREE.Mesh
                ? level.object.geometry.getAttribute('position').count / 
                  (object instanceof THREE.Mesh ? object.geometry.getAttribute('position').count : 1)
                : 1
        }));
    }

    /**
     * 启用/禁用LOD功能
     */
    public setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;
    }

    /**
     * 获取所有LOD对象
     */
    public getLODObjects(): Map<string, THREE.LOD> {
        return this.lodObjects;
    }

    /**
     * 清理缓存
     */
    public clearCache(): void {
        this.geometryCache.forEach(geometry => geometry.dispose());
        this.geometryCache.clear();
    }

    /**
     * 设置最大缓存大小
     */
    public setMaxCacheSize(size: number): void {
        this.maxCacheSize = size;
        while (this.geometryCache.size > size) {
            const oldestKey = this.geometryCache.keys().next().value;
            if (!oldestKey) break;
            const oldGeometry = this.geometryCache.get(oldestKey);
            oldGeometry?.dispose();
            this.geometryCache.delete(oldestKey);
        }
    }

    /**
     * 释放资源
     */
    public dispose(): void {
        this.clearCache();
        this.lodObjects.forEach(lod => {
            lod.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    if (child.material instanceof THREE.Material) {
                        child.material.dispose();
                    }
                }
            });
        });
        this.lodObjects.clear();
    }

    /**
     * 动态调整LOD级别
     */
    private adjustLODLevels(): void {
        if (!this.config.dynamicAdjustment || !this.config.levels || !this.config.performanceTarget) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.frameTime = deltaTime;
        this.lastFrameTime = currentTime;

        const fps = 1000 / deltaTime;
        if (fps < this.config.performanceTarget * 0.8) {
            this.config.levels = this.config.levels.map(level => ({
                distance: level.distance * 0.8,
                detail: level.detail
            }));
        } else if (fps > this.config.performanceTarget * 1.2) {
            this.config.levels = this.config.levels.map(level => ({
                distance: level.distance * 1.2,
                detail: level.detail
            }));
        }
    }

    /**
     * 处理LOD过渡
     */
    private handleTransition(lod: THREE.LOD, currentLevel: number, newLevel: number): void {
        if (!this.config.transitionDuration) return;

        const id = lod.uuid;
        const currentTime = performance.now();

        // 开始新的过渡
        if (currentLevel !== newLevel) {
            this.transitionObjects.set(id, {
                startTime: currentTime,
                fromLevel: currentLevel,
                toLevel: newLevel,
                duration: this.config.transitionDuration
            });
        }

        // 更新现有过渡
        const transition = this.transitionObjects.get(id);
        if (transition) {
            const progress = (currentTime - transition.startTime) / transition.duration;
            if (progress >= 1) {
                this.transitionObjects.delete(id);
                return;
            }

            // 应用过渡效果
            const fromObject = lod.getObjectForDistance(transition.fromLevel);
            const toObject = lod.getObjectForDistance(transition.toLevel);
            if (fromObject instanceof THREE.Mesh && toObject instanceof THREE.Mesh) {
                fromObject.visible = true;
                toObject.visible = true;
                fromObject.material.opacity = 1 - progress;
                toObject.material.opacity = progress;
            }
        }
    }

    /**
     * 估算几何体大小
     */
    private estimateGeometrySize(geometry: THREE.BufferGeometry): number {
        let size = 0;
        for (const attribute of Object.values(geometry.attributes)) {
            size += attribute.array.byteLength;
        }
        return size;
    }
} 