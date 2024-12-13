import * as THREE from 'three';
import { GeometryOptions, GeometryType } from '../types';
import { PERFORMANCE_CONFIG } from '../config/performance';
import { Logger } from './Logger';
import { ErrorHandler } from './ErrorHandler';

/**
 * Factory class for creating and managing geometries with caching and LOD support
 */
export class GeometryFactory {
    private static instance: GeometryFactory;
    private geometryCache: Map<string, THREE.BufferGeometry>;
    private lodCache: Map<string, Map<number, THREE.BufferGeometry>>;
    private logger: Logger;
    private errorHandler: ErrorHandler;

    private constructor() {
        this.geometryCache = new Map();
        this.lodCache = new Map();
        this.logger = Logger.getInstance();
        this.errorHandler = ErrorHandler.getInstance();
    }

    public static getInstance(): GeometryFactory {
        if (!GeometryFactory.instance) {
            GeometryFactory.instance = new GeometryFactory();
        }
        return GeometryFactory.instance;
    }

    /**
     * Create or retrieve a geometry from cache
     */
    public create(type: GeometryType, options: GeometryOptions, forceNew: boolean = false): THREE.BufferGeometry {
        try {
            const cacheKey = this.getCacheKey(type, options);
            
            if (!forceNew && this.geometryCache.has(cacheKey)) {
                this.logger.debug(`Retrieved geometry from cache: ${cacheKey}`);
                return this.geometryCache.get(cacheKey)!;
            }

            const geometry = this.createGeometry(type, options);
            
            if (this.geometryCache.size >= PERFORMANCE_CONFIG.geometryCacheSize) {
                const oldestKey = this.geometryCache.keys().next().value;
                if (oldestKey) {
                    this.disposeGeometry(oldestKey);
                }
            }

            this.geometryCache.set(cacheKey, geometry);
            this.logger.debug(`Created new geometry: ${cacheKey}`);
            
            if (PERFORMANCE_CONFIG.lodLevels && type !== 'line') {
                this.createLODs(type, options, cacheKey);
            }

            return geometry;
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'GeometryFactory.create',
                rethrow: true
            });
            throw error; // TypeScript needs this
        }
    }

    /**
     * Create LOD versions of a geometry
     */
    private createLODs(type: GeometryType, options: GeometryOptions, baseKey: string): void {
        const lodLevels = new Map<number, THREE.BufferGeometry>();
        
        Object.entries(PERFORMANCE_CONFIG.lodLevels).forEach(([level, config]) => {
            const lodOptions = { ...options };
            
            // Adjust geometry detail based on LOD level
            if ('segments' in lodOptions) {
                lodOptions.segments = Math.max(4, Math.floor(lodOptions.segments! * config.detail));
            }
            if ('radialSegments' in lodOptions) {
                lodOptions.radialSegments = Math.max(4, Math.floor(lodOptions.radialSegments! * config.detail));
            }
            
            const lodGeometry = this.createGeometry(type, lodOptions);
            lodLevels.set(config.distance, lodGeometry);
        });

        this.lodCache.set(baseKey, lodLevels);
    }

    /**
     * Get appropriate LOD geometry based on distance
     */
    public getLODGeometry(baseKey: string, distance: number): THREE.BufferGeometry {
        const lodLevels = this.lodCache.get(baseKey);
        if (!lodLevels) return this.geometryCache.get(baseKey)!;

        const distances = Array.from(lodLevels.keys()).sort((a, b) => b - a);
        for (const dist of distances) {
            if (distance >= dist) {
                return lodLevels.get(dist)!;
            }
        }

        return this.geometryCache.get(baseKey)!;
    }

    /**
     * Create a new geometry based on type
     */
    private createGeometry(type: GeometryType, options: GeometryOptions): THREE.BufferGeometry {
        let geometry: THREE.BufferGeometry;
        let curve: THREE.CatmullRomCurve3;

        switch (type) {
            case 'sphere':
                return new THREE.SphereGeometry(
                    options.radius || 1,
                    options.segments || 32,
                    options.segments || 32
                );
            case 'box':
                return new THREE.BoxGeometry(
                    options.width || 1,
                    options.height || 1,
                    options.depth || 1
                );
            case 'tube':
                if (!options.path) {
                    throw new Error('Path is required for tube geometry');
                }
                curve = new THREE.CatmullRomCurve3(options.path);
                return new THREE.TubeGeometry(
                    curve,
                    options.segments || 64,
                    options.radius || 1,
                    options.radialSegments || 8,
                    options.closed || false
                );
            case 'line':
                if (!options.path) {
                    throw new Error('Path is required for line geometry');
                }
                geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(
                    options.path.flatMap(v => [v.x, v.y, v.z]),
                    3
                ));
                return geometry;
            default:
                throw new Error(`Unsupported geometry type: ${type}`);
        }
    }

    /**
     * Generate cache key for geometry
     */
    private getCacheKey(type: GeometryType, options: GeometryOptions): string {
        const cacheKey = {
            type,
            ...options,
            path: options.path?.map(v => [v.x, v.y, v.z])
        };
        return JSON.stringify(cacheKey);
    }

    /**
     * Dispose of a cached geometry
     */
    private disposeGeometry(key: string): void {
        const geometry = this.geometryCache.get(key);
        if (geometry) {
            geometry.dispose();
            this.geometryCache.delete(key);
            
            // Dispose associated LODs
            const lods = this.lodCache.get(key);
            if (lods) {
                lods.forEach(lodGeometry => lodGeometry.dispose());
                this.lodCache.delete(key);
            }
        }
    }

    /**
     * Clear all cached geometries
     */
    public dispose(): void {
        this.geometryCache.forEach(geometry => geometry.dispose());
        this.geometryCache.clear();
        
        this.lodCache.forEach(lods => {
            lods.forEach(geometry => geometry.dispose());
        });
        this.lodCache.clear();
    }
} 