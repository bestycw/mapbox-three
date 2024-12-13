import * as THREE from 'three';
import { DEFAULT_MATERIALS } from '../config';
import { MaterialOptions } from '../types/index';

export class MaterialFactory {
    private static materialCache = new Map<string, THREE.Material>();

    static create(type: keyof typeof DEFAULT_MATERIALS, options: Partial<MaterialOptions> = {}): THREE.Material {
        const cacheKey = this.getCacheKey(type, options);
        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(cacheKey)!;
        }

        const defaultConfig = DEFAULT_MATERIALS[type];
        const materialOptions = {
            ...defaultConfig.options,
            ...options,
            opacity: options.opacity ?? 1.0,
            transparent: options.transparent ?? false
        };

        const MaterialClass = (THREE as any)[defaultConfig.type];
        if (!MaterialClass) {
            throw new Error(`Invalid material type: ${type}`);
        }

        const material = new MaterialClass(materialOptions);
        this.materialCache.set(cacheKey, material);
        return material;
    }

    static createCustom(materialClass: typeof THREE.Material, options: MaterialOptions): THREE.Material {
        const cacheKey = this.getCacheKey(materialClass.name, options);
        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(cacheKey)!;
        }

        const material = new materialClass();
        Object.assign(material, options);
        this.materialCache.set(cacheKey, material);
        return material;
    }

    private static getCacheKey(type: string, options?: object): string {
        return `${type}_${JSON.stringify(options || {})}`;
    }

    static clearCache(): void {
        this.materialCache.clear();
    }
} 