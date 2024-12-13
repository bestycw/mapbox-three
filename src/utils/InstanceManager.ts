import * as THREE from 'three';
import { ExtendedObject3D } from '../types';
import { Logger } from './Logger';
import { ErrorHandler } from './ErrorHandler';
import { PERFORMANCE_CONFIG } from '../config/performance';

/**
 * Manages instanced rendering of repeated geometries
 */
export class InstanceManager {
    private static instance: InstanceManager;
    private instances: Map<string, THREE.InstancedMesh>;
    private instanceData: Map<string, Set<ExtendedObject3D>>;
    private logger: Logger;
    private errorHandler: ErrorHandler;

    private constructor() {
        this.instances = new Map();
        this.instanceData = new Map();
        this.logger = Logger.getInstance();
        this.errorHandler = ErrorHandler.getInstance();
    }

    public static getInstance(): InstanceManager {
        if (!InstanceManager.instance) {
            InstanceManager.instance = new InstanceManager();
        }
        return InstanceManager.instance;
    }

    /**
     * Add an object for instanced rendering
     */
    public addInstance(object: ExtendedObject3D): void {
        try {
            if (!object.geometry || !object.material) return;

            const instanceKey = this.getInstanceKey(object);
            let instanceMesh = this.instances.get(instanceKey);

            // Create new instanced mesh if needed
            if (!instanceMesh) {
                instanceMesh = this.createInstancedMesh(object.geometry, object.material, PERFORMANCE_CONFIG.instanceThreshold);
                this.instances.set(instanceKey, instanceMesh);
                this.instanceData.set(instanceKey, new Set());
            }

            // Add object to instance data
            const instances = this.instanceData.get(instanceKey)!;
            if (!instances.has(object)) {
                const instanceId = instances.size;
                object.userData.instanceId = instanceId;
                instances.add(object);

                // Update instance matrix
                const matrix = new THREE.Matrix4();
                object.updateWorldMatrix(true, false);
                matrix.copy(object.matrixWorld);
                instanceMesh.setMatrixAt(instanceId, matrix);
                instanceMesh.instanceMatrix.needsUpdate = true;

                // Hide original object
                object.visible = false;
            }

            this.logger.debug(`Added instance: ${instanceKey} (${instances.size} total)`);
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'InstanceManager.addInstance',
                silent: true
            });
        }
    }

    /**
     * Remove an object from instanced rendering
     */
    public removeInstance(object: ExtendedObject3D): void {
        try {
            const instanceKey = this.getInstanceKey(object);
            const instances = this.instanceData.get(instanceKey);
            const instanceMesh = this.instances.get(instanceKey);

            if (instances && instanceMesh && object.userData.instanceId !== undefined) {
                instances.delete(object);
                object.visible = true;
                delete object.userData.instanceId;

                // If no instances left, remove instanced mesh
                if (instances.size === 0) {
                    instanceMesh.dispose();
                    this.instances.delete(instanceKey);
                    this.instanceData.delete(instanceKey);
                } else {
                    // Rebuild instance matrices
                    this.rebuildInstanceMatrices(instanceKey);
                }
            }
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'InstanceManager.removeInstance',
                silent: true
            });
        }
    }

    /**
     * Update instance matrix for an object
     */
    public updateInstance(object: ExtendedObject3D): void {
        try {
            const instanceKey = this.getInstanceKey(object);
            const instanceMesh = this.instances.get(instanceKey);

            if (instanceMesh && object.userData.instanceId !== undefined) {
                const matrix = new THREE.Matrix4();
                object.updateWorldMatrix(true, false);
                matrix.copy(object.matrixWorld);
                instanceMesh.setMatrixAt(object.userData.instanceId, matrix);
                instanceMesh.instanceMatrix.needsUpdate = true;
            }
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'InstanceManager.updateInstance',
                silent: true
            });
        }
    }

    /**
     * Create a new instanced mesh
     */
    private createInstancedMesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], count: number): THREE.InstancedMesh {
        const mesh = new THREE.InstancedMesh(
            geometry,
            Array.isArray(material) ? material[0] : material,
            count
        );
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        return mesh;
    }

    /**
     * Generate instance key based on geometry and material
     */
    private getInstanceKey(object: ExtendedObject3D): string {
        const geometryId = object.geometry?.uuid || '';
        const materialId = (object.material as THREE.Material)?.uuid || '';
        return `${geometryId}_${materialId}`;
    }

    /**
     * Rebuild instance matrices after removing an instance
     */
    private rebuildInstanceMatrices(instanceKey: string): void {
        const instances = this.instanceData.get(instanceKey);
        const instanceMesh = this.instances.get(instanceKey);

        if (!instances || !instanceMesh) return;

        let instanceId = 0;
        instances.forEach(object => {
            object.userData.instanceId = instanceId;
            const matrix = new THREE.Matrix4();
            object.updateWorldMatrix(true, false);
            matrix.copy(object.matrixWorld);
            instanceMesh.setMatrixAt(instanceId, matrix);
            instanceId++;
        });

        instanceMesh.instanceMatrix.needsUpdate = true;
    }

    /**
     * Get all instanced meshes
     */
    public getInstancedMeshes(): THREE.InstancedMesh[] {
        return Array.from(this.instances.values());
    }

    /**
     * Get instance statistics
     */
    public getStats(): Record<string, number> {
        const stats: Record<string, number> = {};
        this.instanceData.forEach((instances, key) => {
            stats[key] = instances.size;
        });
        return stats;
    }

    /**
     * Dispose of all instances
     */
    public dispose(): void {
        this.instances.forEach(mesh => {
            mesh.dispose();
        });
        this.instances.clear();
        this.instanceData.clear();
    }

    /**
     * 更新实例矩阵
     * @param mesh 实例化网格
     * @param positions 位置数组
     * @param scales 缩放数组
     * @param rotations 旋转数组
     */
    updateInstanceMatrices(mesh: THREE.InstancedMesh, positions: THREE.Vector3[], scales: THREE.Vector3[], rotations: THREE.Euler[]) {
        const matrix = new THREE.Matrix4();
        const count = Math.min(positions.length, mesh.count);

        for (let i = 0; i < count; i++) {
            matrix.compose(positions[i], new THREE.Quaternion().setFromEuler(rotations[i]), scales[i]);
            mesh.setMatrixAt(i, matrix);
        }

        mesh.instanceMatrix.needsUpdate = true;
    }
} 