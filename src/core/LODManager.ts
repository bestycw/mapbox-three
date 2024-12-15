import * as THREE from 'three';
import { ExtendedObject3D } from '../types';

/**
 * LOD配置接口
 */
export interface LODConfig {
    enabled?: boolean;
    levels?: Array<{
        distance: number;
        detail: number;
    }>;
}

/**
 * LOD管理器 - 处理物体的细节层次
 */
export class LODManager {
    private lodObjects: Map<string, THREE.LOD> = new Map();
    private config: Required<LODConfig>;
    private beforeLODHook?: (object: ExtendedObject3D, distance: number) => void;
    private afterLODHook?: (object: ExtendedObject3D, distance: number) => void;

    constructor(config?: LODConfig) {
        this.config = {
            enabled: config?.enabled ?? true,
            levels: config?.levels ?? [
                { distance: 0, detail: 1 },
                { distance: 500, detail: 0.5 },
                { distance: 1000, detail: 0.25 }
            ]
        };
    }

    /**
     * 为对象设置LOD
     */
    public setupLOD(object: ExtendedObject3D, customLevels?: Array<{ distance: number; detail: number }>) {
        // 检查对象的userData中是否禁用了LOD
        if (!this.config.enabled || object.userData.disableLOD) return object;

        if (object instanceof THREE.LOD) return object;

        const levels = customLevels || this.config.levels;
        if (!levels || levels.length === 0) return object;

        const lod = new THREE.LOD();
        // console.log(object.position)
        lod.position.copy(object.position);
        lod.rotation.copy(object.rotation);
        lod.scale.copy(object.scale);
        lod.userData = { ...object.userData };

        // // 如果是ExtendedObject3D，复制其方法
        // if ('setCoords' in object) {
        //     (lod as any).setCoords = (object as any).setCoords;
        //     (lod as any).getCoords = (object as any).getCoords;
        //     (lod as any).setAltitude = (object as any).setAltitude;
        //     (lod as any).getAltitude = (object as any).getAltitude;
        // }

        levels.forEach(({ distance, detail }) => {
            const levelObject = this.createLODLevel(object, detail);
            if (levelObject) {
                lod.addLevel(levelObject, distance);
            }
        });

        const id = object.uuid;
        this.lodObjects.set(id, lod);

        return lod;
    }

    /**
     * 创建LOD级别对象
     */
    private createLODLevel(originalObject: ExtendedObject3D, detail: number): ExtendedObject3D | null {
        if (!(originalObject instanceof THREE.Mesh)) return null;

        const geometry = originalObject.geometry;
        if (!geometry) return null;

        const simplifiedGeometry = this.simplifyGeometry(geometry, detail);
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

        const targetVertexCount = Math.max(4, Math.floor(positions.count * detail));
        const simplified = new THREE.BufferGeometry();
        
        const stride = Math.max(1, Math.floor(1 / detail));
        const newPositions = [];
        const newNormals = [];
        const newUvs = [];

        for (let i = 0; i < positions.count; i += stride) {
            if (newPositions.length / 3 >= targetVertexCount) break;

            newPositions.push(
                positions.getX(i),
                positions.getY(i),
                positions.getZ(i)
            );

            if (normals) {
                newNormals.push(
                    normals.getX(i),
                    normals.getY(i),
                    normals.getZ(i)
                );
            }

            if (uvs) {
                newUvs.push(
                    uvs.getX(i),
                    uvs.getY(i)
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

        return simplified;
    }

    /**
     * 更新LOD对象
     */
    public update(camera: THREE.Camera): void {
        if (!this.config.enabled) return;

        this.lodObjects.forEach((lod) => {
            const distance = camera.position.distanceTo(lod.position);
            
            if (this.beforeLODHook) {
                this.beforeLODHook(lod, distance);
            }

            lod.update(camera);

            if (this.afterLODHook) {
                this.afterLODHook(lod, distance);
            }
        });
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
    public getConfig(object: ExtendedObject3D): Array<{ distance: number; detail: number }> | undefined {
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
} 