import * as THREE from 'three';
import { DEFAULT_MATERIALS } from '../config/materials';
import { MaterialOptions } from '../types/index';

export class MaterialFactory {
    private static materialCache = new Map<string, THREE.Material>();

    static create(type: keyof typeof DEFAULT_MATERIALS, options: Partial<MaterialOptions> = {}): THREE.Material {
        const cacheKey = this.getCacheKey(type, options);
        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(cacheKey)!;
        }

        const defaultConfig = DEFAULT_MATERIALS[type];
        if (!defaultConfig) {
            throw new Error(`Invalid material type: ${type}`);
        }

        const materialOptions = {
            ...defaultConfig.options,
            ...options
        };

        const MaterialClass = (THREE as any)[defaultConfig.type];
        if (!MaterialClass) {
            throw new Error(`Invalid THREE.js material type: ${defaultConfig.type}`);
        }

        const material = new MaterialClass(materialOptions);
        this.materialCache.set(cacheKey, material);
        return material;
    }

    private static getCacheKey(type: string, options: object): string {
        return `${type}_${JSON.stringify(options)}`;
    }

    static clearCache(): void {
        this.materialCache.clear();
    }
} 