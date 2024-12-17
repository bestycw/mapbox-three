import * as THREE from 'three';
import { ExtendedObject3D, InstancingConfig } from '../config';
import { defaultConfig } from '../config/defaults';

/**
 * 实例化管理器配置接口
 */
export interface InstanceManagerConfig {
    enabled?: boolean;
    threshold?: number;           // 启用实例化的阈值
    maxInstanceCount?: number;    // 每个组的最大实例数
    batchSize?: number;          // 批处理大小
    dynamicBatching?: boolean;   // 是否启用动态批处理
    updateInterval?: number;     // 更新间隔（毫秒）
}

/**
 * 实例组接口
 */
interface InstanceGroup {
    mesh: THREE.InstancedMesh;
    geometry: THREE.BufferGeometry;
    material: THREE.Material | THREE.Material[];
    count: number;
    maxCount: number;
    objects: Map<ExtendedObject3D, number>;
    matrix: THREE.Matrix4[];
    dirty: boolean;
}

/**
 * 实例化管理器 - 管理Three.js对象的实例化渲染
 */
export class InstanceManager {
    private static instance: InstanceManager;
    private config: Required<InstanceManagerConfig>;
    private instanceGroups: Map<string, InstanceGroup> = new Map();
    private lastUpdateTime: number = 0;
    private metrics: {
        instanceCount: number;
        batchCount: number;
        memoryUsage: number;
        updateTime: number;
        drawCalls: number;
    } = {
        instanceCount: 0,
        batchCount: 0,
        memoryUsage: 0,
        updateTime: 0,
        drawCalls: 0
    };

    private constructor(config: InstanceManagerConfig) {
        this.config = {
            ...defaultConfig.optimization!.instancing!,
            ...config
        } as Required<InstanceManagerConfig>;
    }

    /**
     * 获取InstanceManager实例
     */
    public static getInstance(config: InstanceManagerConfig): InstanceManager {
        if (!InstanceManager.instance) {
            InstanceManager.instance = new InstanceManager(config);
        }
        return InstanceManager.instance;
    }

    /**
     * 添加要实例化的对象
     */
    public addInstance(
        object: ExtendedObject3D,
        groupId: string,
        instanceConfig?: InstancingConfig
    ): THREE.InstancedMesh | null {
        if (!this.config.enabled || !(object instanceof THREE.Mesh)) {
            return null;
        }

        let group = this.instanceGroups.get(groupId);
        if (!group) {
            group = this.createInstanceGroup(object, groupId, instanceConfig);
            this.instanceGroups.set(groupId, group);
        }

        // 检查是否超出最大实例数
        if (group.count >= group.maxCount) {
            if (this.config.dynamicBatching) {
                this.expandInstanceGroup(group);
            } else {
                console.warn(`Instance group ${groupId} has reached its maximum capacity`);
                return null;
            }
        }

        const instanceId = group.count++;
        group.objects.set(object, instanceId);
        group.matrix[instanceId] = object.matrix.clone();
        group.dirty = true;

        this.updateMetrics();
        return group.mesh;
    }

    /**
     * 更新实例化对象
     */
    public updateInstance(object: ExtendedObject3D, groupId: string): void {
        const group = this.instanceGroups.get(groupId);
        if (!group) return;

        const instanceId = group.objects.get(object);
        if (instanceId === undefined) return;

        group.matrix[instanceId].copy(object.matrix);
        group.dirty = true;
    }

    /**
     * 移除实例化对象
     */
    public removeInstance(object: ExtendedObject3D, groupId: string): void {
        const group = this.instanceGroups.get(groupId);
        if (!group) return;

        const instanceId = group.objects.get(object);
        if (instanceId === undefined) return;

        // 移动最后一个实例到被删除的位置
        const lastInstanceId = group.count - 1;
        if (instanceId !== lastInstanceId) {
            const lastObject = Array.from(group.objects.entries())
                .find(([_, id]) => id === lastInstanceId)?.[0];
            if (lastObject) {
                group.matrix[instanceId].copy(group.matrix[lastInstanceId]);
                group.objects.set(lastObject, instanceId);
            }
        }

        group.objects.delete(object);
        group.count--;
        group.dirty = true;

        this.updateMetrics();
    }

    /**
     * 更新所有实例化组
     */
    public update(): void {
        const currentTime = performance.now();
        if (currentTime - this.lastUpdateTime < this.config.updateInterval) {
            return;
        }

        const startTime = performance.now();
        this.instanceGroups.forEach(group => {
            if (group.dirty) {
                for (let i = 0; i < group.count; i++) {
                    group.mesh.setMatrixAt(i, group.matrix[i]);
                }
                group.mesh.instanceMatrix.needsUpdate = true;
                group.dirty = false;
            }
        });
        this.metrics.updateTime = performance.now() - startTime;
        this.lastUpdateTime = currentTime;
    }

    /**
     * 创建实例化组
     */
    private createInstanceGroup(
        template: THREE.Mesh,
        groupId: string,
        config?: InstancingConfig
    ): InstanceGroup {
        const initialCount = Math.min(
            config?.initialCount || this.config.batchSize,
            this.config.maxInstanceCount
        );

        // 确保使用单个材质
        const material = Array.isArray(template.material) ? template.material[0] : template.material;

        const mesh = new THREE.InstancedMesh(
            template.geometry,
            material,
            initialCount
        );
        mesh.frustumCulled = true;
        mesh.castShadow = template.castShadow;
        mesh.receiveShadow = template.receiveShadow;

        return {
            mesh,
            geometry: template.geometry,
            material: template.material,
            count: 0,
            maxCount: initialCount,
            objects: new Map(),
            matrix: new Array(initialCount).fill(null).map(() => new THREE.Matrix4()),
            dirty: false
        };
    }



    /**
     * 更新性能指标
     */
    private updateMetrics(): void {
        let totalInstances = 0;
        let totalMemory = 0;

        this.instanceGroups.forEach(group => {
            totalInstances += group.count;
            totalMemory += this.calculateGroupMemory(group);
        });

        this.metrics = {
            instanceCount: totalInstances,
            batchCount: this.instanceGroups.size,
            memoryUsage: totalMemory,
            updateTime: this.metrics.updateTime,
            drawCalls: this.instanceGroups.size
        };
    }

    /**
     * 计算实例化组内存使用
     */
    private calculateGroupMemory(group: InstanceGroup): number {
        const geometrySize = this.estimateGeometrySize(group.geometry);
        const materialSize = 1024; // 估算材质大小约1KB
        const instanceSize = 16 * 4; // 4x4矩阵，每个浮点数4字节
        return geometrySize + materialSize + (instanceSize * group.maxCount);
    }

    /**
     * 估几何体内存大小
     */
    private estimateGeometrySize(geometry: THREE.BufferGeometry): number {
        let size = 0;
        for (const attribute of Object.values(geometry.attributes) as THREE.BufferAttribute[]) {
            size += attribute.array.byteLength;
        }
        return size;
    }

    /**
     * 获取性能指标
     */
    public getMetrics() {
        return { ...this.metrics };
    }

    /**
     * 获取实例化组信息
     */
    public getGroupInfo(groupId: string) {
        const group = this.instanceGroups.get(groupId);
        if (!group) return null;

        return {
            instanceCount: group.count,
            maxInstances: group.maxCount,
            memoryUsage: this.calculateGroupMemory(group),
            dirty: group.dirty
        };
    }

    /**
     * 清理资源
     */
    public dispose(): void {
        this.instanceGroups.forEach(group => {
            group.geometry.dispose();
            if (group.material instanceof THREE.Material) {
                group.material.dispose();
            }
        });
        this.instanceGroups.clear();
        this.metrics = {
            instanceCount: 0,
            batchCount: 0,
            memoryUsage: 0,
            updateTime: 0,
            drawCalls: 0
        };
    }

    /**
     * 清除指定组的所有实例
     */
    public clearInstances(groupId: string): void {
        const group = this.instanceGroups.get(groupId);
        if (!group) return;

        // 清除所有实例对象和资源
        group.objects.forEach((instanceId, object) => {
            // console.log(object);
            if (object instanceof THREE.Mesh) {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(mat => mat.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });

        // 清理实例化网格
        if (group.mesh) {
            if (group.mesh.geometry) group.mesh.geometry.dispose();
            if (group.mesh.material) {
                if (Array.isArray(group.mesh.material)) {
                    group.mesh.material.forEach(mat => mat.dispose());
                } else {
                    group.mesh.material.dispose();
                }
            }
            group.mesh.instanceMatrix.needsUpdate = true;
            group.mesh.count = 0;
        }

        // 清除组数据
        group.objects.clear();
        group.count = 0;
        this.instanceGroups.delete(groupId);
        
        // 更新性能指标
        this.updateMetrics();
    }

    /**
     * 清除所有实例组
     */
    public clearAll(): void {
        this.instanceGroups.forEach((group, groupId) => {
            this.clearInstances(groupId);
        });
    }

    /**
     * 更新实例组配置
     */
    public updateGroupConfig(groupId: string, config: Partial<InstancingConfig>): void {
        const group = this.instanceGroups.get(groupId);
        if (!group) return;

        if (config.frustumCulled !== undefined) {
            group.mesh.frustumCulled = config.frustumCulled;
        }
        if (config.castShadow !== undefined) {
            group.mesh.castShadow = config.castShadow;
        }
        if (config.receiveShadow !== undefined) {
            group.mesh.receiveShadow = config.receiveShadow;
        }
        
        // 如果需要更新最大实例数
        if (config.maxInstanceCount && config.maxInstanceCount > group.maxCount) {
            this.expandInstanceGroup(group, config.maxInstanceCount);
        }
    }

    /**
     * 获取组内所有实例对象
     */
    public getGroupObjects(groupId: string): ExtendedObject3D[] {
        const group = this.instanceGroups.get(groupId);
        if (!group) return [];
        return Array.from(group.objects.keys());
    }

    /**
     * 检查对象是否在指定组中
     */
    public hasInstance(object: ExtendedObject3D, groupId: string): boolean {
        const group = this.instanceGroups.get(groupId);
        return group ? group.objects.has(object) : false;
    }

    /**
     * 获取对象所在的组ID
     */
    public getObjectGroupId(object: ExtendedObject3D): string | null {
        for (const [groupId, group] of this.instanceGroups.entries()) {
            if (group.objects.has(object)) {
                return groupId;
            }
        }
        return null;
    }

    /**
     * 扩展实例化组容量到指定大小
     */
    private expandInstanceGroup(group: InstanceGroup, targetCount?: number): void {
        const newMaxCount = targetCount ? 
            Math.min(targetCount, this.config.maxInstanceCount) :
            Math.min(group.maxCount * 2, this.config.maxInstanceCount);

        if (newMaxCount <= group.maxCount) return;

        const newMesh = new THREE.InstancedMesh(
            group.geometry,
            group.material,
            newMaxCount
        );
        newMesh.frustumCulled = group.mesh.frustumCulled;
        newMesh.castShadow = group.mesh.castShadow;
        newMesh.receiveShadow = group.mesh.receiveShadow;

        // 复制现有实例
        for (let i = 0; i < group.count; i++) {
            newMesh.setMatrixAt(i, group.matrix[i]);
        }
        newMesh.instanceMatrix.needsUpdate = true;

        // 扩展矩阵数组
        const newMatrix = new Array(newMaxCount).fill(null).map((_, i) => 
            i < group.matrix.length ? group.matrix[i] : new THREE.Matrix4()
        );

        // 更新组
        group.mesh = newMesh;
        group.maxCount = newMaxCount;
        group.matrix = newMatrix;
    }

    public clearInstanceGroup(groupId: string):void {
        const group = this.instanceGroups.get(groupId);
        if (!group) return;

        // 清除组内所有实例
        group.objects.forEach((instanceId, object) => {
            if (object instanceof THREE.Mesh) {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(mat => mat.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });

        // 清理实例化网格
        if (group.mesh) {
            if (group.mesh.geometry) group.mesh.geometry.dispose();
            if (group.mesh.material) {
                if (Array.isArray(group.mesh.material)) {
                    group.mesh.material.forEach(mat => mat.dispose());
                } else {
                    group.mesh.material.dispose();
                }
            }
            group.mesh.instanceMatrix.needsUpdate = true;
            group.mesh.count = 0;
        }

        // 清除���数据
        group.objects.clear();
        group.count = 0;
        this.instanceGroups.delete(groupId);
    }

    // 添加 getInstanceGroup 方法
    public getInstanceGroup(groupId: string): InstanceGroup | undefined {
        return this.instanceGroups.get(groupId);
    }
} 
