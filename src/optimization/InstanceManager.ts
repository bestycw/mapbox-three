import * as THREE from 'three';
import { 
    ExtendedObject3D, 
    InstanceConfig,
    InstanceMetrics,
} from '../config/types';
import { defaultConfig } from '../config/defaults';
import { BaseStrategy } from './BaseStrategy';

/**
 * Instance group interface
 */
interface InstanceGroup {
    id: string;
    mesh: THREE.InstancedMesh;
    geometry: THREE.BufferGeometry;
    material: THREE.Material | THREE.Material[];
    count: number;
    maxCount: number;
    objects: Map<ExtendedObject3D, number>;
    matrix: THREE.Matrix4[];
    dirty: boolean;
    config: Required<InstanceConfig>;
}

/**
 * Instance Manager - Manages instanced rendering of Three.js objects
 */
export class InstanceManager extends BaseStrategy<InstanceConfig> {
    private static instance: InstanceManager;
    private instanceGroups: Map<string, InstanceGroup> = new Map();
    protected metrics: Required<InstanceMetrics> = {
        operationCount: 0,
        lastUpdateTime: 0,
        memoryUsage: 0,
        instanceCount: 0,
        batchCount: 0,
        updateTime: 0,
        drawCalls: 0
    };

    public constructor(config: Partial<InstanceConfig>) {
        super(config as InstanceConfig);
    }

    protected validateConfig(config: Partial<InstanceConfig>): Required<InstanceConfig> {
        const defaultInstancing = defaultConfig.optimization?.instancing ?? {};
        return {
            ...defaultInstancing,
            ...config
        } as Required<InstanceConfig>;
    }

    protected onInitialize(): void {
        // No special initialization needed
    }

    protected onUpdate(params: any): void {
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
    }

    protected onDispose(): void {
        this.instanceGroups.forEach(group => {
            this.disposeGroup(group);
        });
        this.instanceGroups.clear();
    }

    private disposeGroup(group: InstanceGroup): void {
        // First, remove all instances from their parents
        group.objects.forEach((_, object) => {
            if (object.parent) {
                object.parent.remove(object);
            }
        });

        // Remove instance mesh from its parent
        if (group.mesh && group.mesh.parent) {
            group.mesh.parent.remove(group.mesh);
        }

        // Reset instance matrix
        if (group.mesh) {
            for (let i = 0; i < group.maxCount; i++) {
                group.mesh.setMatrixAt(i, new THREE.Matrix4());
            }
            group.mesh.instanceMatrix.needsUpdate = true;
            group.mesh.count = 0;  // Important: reset instance count
        }

        // Dispose geometry
        if (group.geometry) {
            group.geometry.dispose();
        }

        // Dispose materials
        if (Array.isArray(group.material)) {
            group.material.forEach(mat => mat?.dispose());
        } else if (group.material) {
            group.material.dispose();
        }

        // Dispose instance mesh resources
        if (group.mesh) {
            if (group.mesh.geometry) {
                group.mesh.geometry.dispose();
            }
            if (Array.isArray(group.mesh.material)) {
                group.mesh.material.forEach(mat => mat?.dispose());
            } else if (group.mesh.material) {
                group.mesh.material.dispose();
            }
            group.mesh.dispose();  // Dispose the instanced mesh itself
        }

        // Clear all references
        group.objects.clear();
        group.matrix = [];
        group.count = 0;
        group.dirty = false;
    }

    protected onClear(): void {
        this.instanceGroups.forEach((group, groupId) => {
            this.clearInstanceGroup(groupId);
        });
    }

    protected updateMetrics(): void {
        this.monitorOperation('updateMetrics', () => {
            let totalInstances = 0;
            let totalMemory = 0;
            let drawCalls = 0;

            this.instanceGroups.forEach(group => {
                totalInstances += group.count;
                totalMemory += this.calculateGroupMemory(group);
                if (group.count > 0) drawCalls++;
            });

            this.metrics = {
                ...this.metrics,
                instanceCount: totalInstances,
                batchCount: this.instanceGroups.size,
                memoryUsage: totalMemory,
                drawCalls,
                operationCount: this.metrics.operationCount + 1,
                lastUpdateTime: Date.now()
            };
        });
    }

    public addInstance(
        object: ExtendedObject3D,
        groupId: string,
        instanceConfig?: Partial<InstanceConfig>
    ): THREE.InstancedMesh | null {
        return this.monitorOperation('addInstance', () => {
            if (!this.config.enabled || !(object instanceof THREE.Mesh)) {
                return null;
            }

            let group = this.instanceGroups.get(groupId);
            if (!group) {
                group = this.createInstanceGroup(object, groupId, instanceConfig);
                this.instanceGroups.set(groupId, group);
            }

            if (group.count >= group.maxCount) {
                if (group.config.dynamicBatching) {
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
        });
    }

    public updateInstance(object: ExtendedObject3D, groupId: string): void {
        const group = this.instanceGroups.get(groupId);
        if (!group) return;

        const instanceId = group.objects.get(object);
        if (instanceId === undefined) return;

        group.matrix[instanceId].copy(object.matrix);
        group.dirty = true;
    }

    public removeInstance(object: ExtendedObject3D, groupId: string): void {
        const group = this.instanceGroups.get(groupId);
        if (!group) return;
        console.log(group)
        const instanceId = group.objects.get(object);
        if (instanceId === undefined) return;

        // Remove the object from its parent if it has one
        if (object.parent) {
            object.parent.remove(object);
        }

        const lastInstanceId = group.count - 1;
        if (instanceId !== lastInstanceId) {
            // Move the last instance to the removed position
            const lastObject = Array.from(group.objects.entries())
                .find(([_, id]) => id === lastInstanceId)?.[0];
            if (lastObject) {
                group.matrix[instanceId].copy(group.matrix[lastInstanceId]);
                group.objects.set(lastObject, instanceId);
                if (group.mesh) {
                    group.mesh.setMatrixAt(instanceId, group.matrix[instanceId]);
                }
            }
        }

        // Clear the matrix at the last position
        group.matrix[lastInstanceId].identity();
  

        group.objects.delete(object);
        group.count--;
        group.dirty = true;

        if (group.mesh) {
            group.mesh.setMatrixAt(lastInstanceId, group.matrix[lastInstanceId]);
            group.mesh.count = group.count;  // Update instance mesh count
            group.mesh.instanceMatrix.needsUpdate = true;
        }
        this.updateMetrics();
    }

    private createInstanceGroup(
        template: THREE.Mesh,
        groupId: string,
        config?: Partial<InstanceConfig>
    ): InstanceGroup {
        const groupConfig = this.validateConfig({
            ...this.config,
            ...config
        });

        const initialCount = Math.min(
            groupConfig.initialCount,
            groupConfig.maxInstanceCount
        );

        const material = Array.isArray(template.material) ? template.material[0] : template.material;

        const mesh = new THREE.InstancedMesh(
            template.geometry,
            material,
            initialCount
        );

        mesh.frustumCulled = groupConfig.frustumCulled;
        mesh.castShadow = groupConfig.castShadow;
        mesh.receiveShadow = groupConfig.receiveShadow;

        return {
            id: groupId,
            mesh,
            geometry: template.geometry,
            material: template.material,
            count: 0,
            maxCount: initialCount,
            objects: new Map(),
            matrix: new Array(initialCount).fill(null).map(() => new THREE.Matrix4()),
            dirty: false,
            config: groupConfig
        };
    }

    private calculateGroupMemory(group: InstanceGroup): number {
        const geometrySize = this.estimateGeometrySize(group.geometry!);
        const materialSize = 1024; // Estimate material size as 1KB
        const instanceSize = 16 * 4; // 4x4 matrix, 4 bytes per float
        return geometrySize + materialSize + (instanceSize * group.maxCount);
    }

    private estimateGeometrySize(geometry: THREE.BufferGeometry): number {
        let size = 0;
        for (const attribute of Object.values(geometry.attributes)) {
            size += (attribute as THREE.BufferAttribute).array.byteLength;
        }
        return size;
    }

    public getMetrics(): Required<InstanceMetrics> {
        return { ...this.metrics };
    }

    public getGroupInfo(groupId: string) {
        const group = this.instanceGroups.get(groupId);
        if (!group) return null;

        return {
            instanceCount: group.count,
            maxInstances: group.maxCount,
            memoryUsage: this.calculateGroupMemory(group),
            dirty: group.dirty,
            config: { ...group.config }
        };
    }

    public clearInstanceGroup(groupId: string): void {
        const group = this.instanceGroups.get(groupId);
        if (!group) return;

        // 创建实例对象的副本，避免在迭代过程中修改集合
        const objectsToRemove = Array.from(group.objects.keys());
        
        // 逐个移除实例
        objectsToRemove.forEach(object => {
            if (object.parent) {
                object.parent.remove(object);
            }
            group.objects.delete(object);
        });

        // 重置实例化网格
        if (group.mesh) {
            if (group.mesh.parent) {
                group.mesh.parent.remove(group.mesh);
            }
            // 重置所有矩阵
            for (let i = 0; i < group.maxCount; i++) {
                group.mesh.setMatrixAt(i, new THREE.Matrix4());
            }
            group.mesh.instanceMatrix.needsUpdate = true;
            group.mesh.count = 0;
        }

        // 清理资源
        this.disposeGroup(group);
        this.instanceGroups.delete(groupId);
        this.updateMetrics();
    }

    public updateGroupConfig(groupId: string, config: Partial<InstanceConfig>): void {
        const group = this.instanceGroups.get(groupId);
        if (!group) return;

        const newConfig = this.validateConfig({
            ...group.config,
            ...config
        });

        group.config = newConfig;
        if (group.mesh) {
            group.mesh.frustumCulled = newConfig.frustumCulled;
            group.mesh.castShadow = newConfig.castShadow;
            group.mesh.receiveShadow = newConfig.receiveShadow;
        }

        if (newConfig.maxInstanceCount > group.maxCount) {
            this.expandInstanceGroup(group, newConfig.maxInstanceCount);
        }
    }

    public getGroupObjects(groupId: string): ExtendedObject3D[] {
        const group = this.instanceGroups.get(groupId);
        return group ? Array.from(group.objects.keys()) : [];
    }

    public hasInstance(object: ExtendedObject3D, groupId: string): boolean {
        const group = this.instanceGroups.get(groupId);
        return group ? group.objects.has(object) : false;
    }

    public getObjectGroupId(object: ExtendedObject3D): string | null {
        for (const [groupId, group] of this.instanceGroups.entries()) {
            if (group.objects.has(object)) {
                return groupId;
            }
        }
        return null;
    }

    private expandInstanceGroup(group: InstanceGroup, targetCount?: number): void {
        const newMaxCount = targetCount ? 
            Math.min(targetCount, group.config.maxInstanceCount) :
            Math.min(group.maxCount * 2, group.config.maxInstanceCount);

        if (newMaxCount <= group.maxCount) return;

        const newMesh = new THREE.InstancedMesh(
            group.geometry,
            group.material,
            newMaxCount
        );

        newMesh.frustumCulled = group.config.frustumCulled;
        newMesh.castShadow = group.config.castShadow;
        newMesh.receiveShadow = group.config.receiveShadow;

        // Copy existing instances
        for (let i = 0; i < group.count; i++) {
            newMesh.setMatrixAt(i, group.matrix[i]);
        }
        newMesh.instanceMatrix.needsUpdate = true;

        // Expand matrix array
        const newMatrix = new Array(newMaxCount).fill(null).map((_, i) => 
            i < group.matrix.length ? group.matrix[i] : new THREE.Matrix4()
        );

        // Update group
        group.mesh = newMesh;
        group.maxCount = newMaxCount;
        group.matrix = newMatrix;
    }

    public getInstanceGroup(groupId: string): InstanceGroup | undefined {
        return this.instanceGroups.get(groupId);
    }
} 
