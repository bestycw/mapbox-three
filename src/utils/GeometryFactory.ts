import * as THREE from 'three';
import { DEFAULT_GEOMETRIES } from '../config';
import { GeometryOptions, GeometryType } from '../types/index';

export class GeometryFactory {
    private static geometryCache = new Map<string, THREE.BufferGeometry>();

    static create(type: GeometryType, options?: Partial<GeometryOptions>): THREE.BufferGeometry {
        const cacheKey = this.getCacheKey(type, options);
        if (this.geometryCache.has(cacheKey)) {
            return this.geometryCache.get(cacheKey)!.clone();
        }

        const defaultConfig = DEFAULT_GEOMETRIES[type];
        const geometryOptions = {
            ...defaultConfig,
            ...options
        };

        let geometry: THREE.BufferGeometry;

        switch (type) {
            case 'sphere':
                geometry = new THREE.SphereGeometry(
                    geometryOptions.radius,
                    geometryOptions.segments,
                    geometryOptions.segments
                );
                break;

            case 'box':
                geometry = new THREE.BoxGeometry(
                    geometryOptions.width,
                    geometryOptions.height,
                    geometryOptions.depth
                );
                break;

            case 'tube':
                if (!geometryOptions.path) {
                    throw new Error('Tube geometry requires a path');
                }
                const curve = new THREE.CatmullRomCurve3(geometryOptions.path);
                geometry = new THREE.TubeGeometry(
                    curve,
                    geometryOptions.segments,
                    geometryOptions.radius,
                    geometryOptions.radialSegments,
                    geometryOptions.closed
                );
                break;

            default:
                throw new Error(`Unsupported geometry type: ${type}`);
        }

        this.geometryCache.set(cacheKey, geometry);
        return geometry.clone();
    }

    static createCustom(geometryClass: typeof THREE.BufferGeometry, options: GeometryOptions): THREE.BufferGeometry {
        const cacheKey = this.getCacheKey(geometryClass.name, options);
        if (this.geometryCache.has(cacheKey)) {
            return this.geometryCache.get(cacheKey)!.clone();
        }

        const geometry = new geometryClass();
        Object.assign(geometry, options);
        this.geometryCache.set(cacheKey, geometry);
        return geometry.clone();
    }

    private static getCacheKey(type: string, options?: object): string {
        return `${type}_${JSON.stringify(options || {})}`;
    }

    static clearCache(): void {
        this.geometryCache.forEach(geometry => geometry.dispose());
        this.geometryCache.clear();
    }
} 