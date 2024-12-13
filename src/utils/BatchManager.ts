import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ExtendedObject3D, GeometryType } from '../types';
import { PERFORMANCE_CONFIG } from '../config/performance';
import { Logger } from './Logger';
import { ErrorHandler } from './ErrorHandler';

/**
 * Manages batching of similar objects for improved rendering performance
 */
export class BatchManager {
    private static instance: BatchManager;
    private batches: Map<string, THREE.Mesh>;
    private batchedObjects: Map<string, Set<ExtendedObject3D>>;
    private pendingBatches: Map<string, ExtendedObject3D[]>;
    private logger: Logger;
    private errorHandler: ErrorHandler;

    private constructor() {
        this.batches = new Map();
        this.batchedObjects = new Map();
        this.pendingBatches = new Map();
        this.logger = Logger.getInstance();
        this.errorHandler = ErrorHandler.getInstance();
    }

    public static getInstance(): BatchManager {
        if (!BatchManager.instance) {
            BatchManager.instance = new BatchManager();
        }
        return BatchManager.instance;
    }

    /**
     * Add an object to a batch
     */
    public addToBatch(object: ExtendedObject3D, type: GeometryType): ExtendedObject3D | null {
        try {
            if (!PERFORMANCE_CONFIG.batchingEnabled) return null;

            // Log object properties for debugging
            this.logger.debug('Adding object to batch:', {
                type,
                hasGeometry: !!object.geometry,
                hasMaterial: !!object.material,
                geometryType: object.geometry?.type,
                materialType: (object.material as THREE.Material)?.type
            });
            // console.log(object);
            if (!object.geometry) {
                this.logger.warn(`Object has no geometry, skipping batch. Object type: ${type}`);
                return null;
            }
            if (!object.material) {
                this.logger.warn(`Object has no material, skipping batch. Object type: ${type}`);
                return null;
            }

            const batchKey = this.getBatchKey(object, type);
            this.logger.debug(`Adding object to batch: ${batchKey}`);
            // console.log(batchKey);
            if (!this.pendingBatches.has(batchKey)) {
                this.pendingBatches.set(batchKey, []);
                this.logger.debug(`Created new pending batch: ${batchKey}`);
            }

            const pending = this.pendingBatches.get(batchKey)!;
            pending.push(object);
            this.logger.debug(`Added object to pending batch: ${batchKey} (${pending.length} objects)`);

            const batchSize = PERFORMANCE_CONFIG.batchSize || 100; // Default to 100 if not set
            // console.log(pexding.length);
            if (pending.length >= batchSize) {
                this.logger.debug(`Batch size reached for ${batchKey}, processing batch...`);
                this.processBatch(batchKey);
                return this.batches.get(batchKey) || null;
            }

            return null;
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'BatchManager.addToBatch',
                silent: false
            });
            return null;
        }
    }

    /**
     * Process a pending batch
     */
    private processBatch(batchKey: string): void {
        try {
            const pending = this.pendingBatches.get(batchKey)!;
            if (pending.length === 0) {
                this.logger.debug(`No pending objects for batch: ${batchKey}`);
                return;
            }

            this.logger.debug(`Processing batch: ${batchKey} with ${pending.length} objects`);
            // Verify all objects have required properties
            const validObjects = pending.filter(obj => obj.geometry && obj.material);
            if (validObjects.length === 0) {
                this.logger.warn(`No valid objects in batch: ${batchKey}`);
                return;
            }
            // console.log(validObjects);
            // Collect geometries and transform them according to object positions
            const geometries = validObjects.map(obj => {
                const geometry = obj.geometry!.clone();
                obj.updateMatrix();
                geometry.applyMatrix4(obj.matrix);
                return geometry;
            });

            // this.logger.debug(`Collected ${geometries.length} geometries for batch: ${batchKey}`);

            // Merge geometries
            const mergedGeometry = BufferGeometryUtils.mergeGeometries(
                geometries,
                false
            );

            this.logger.debug(`Merged geometries for batch: ${batchKey}`);

            // Create or update batch mesh
            if (this.batches.has(batchKey)) {
                const batchMesh = this.batches.get(batchKey)!;
                if (batchMesh.geometry) {
                    batchMesh.geometry.dispose();
                }
                batchMesh.geometry = mergedGeometry;
                this.logger.debug(`Updated existing batch mesh: ${batchKey}`);
            } else {
                const material = validObjects[0].material!;
                const batchMesh = new THREE.Mesh(mergedGeometry, material);
                
                // Reset batch mesh transform since geometries are pre-transformed
                batchMesh.position.set(0, 0, 0);
                batchMesh.rotation.set(0, 0, 0);
                batchMesh.scale.set(1, 1, 1);
                
                this.batches.set(batchKey, batchMesh);
                this.logger.debug(`Created new batch mesh: ${batchKey}`);
            }

            // Track batched objects
            if (!this.batchedObjects.has(batchKey)) {
                this.batchedObjects.set(batchKey, new Set());
            }
            validObjects.forEach(obj => {
                this.batchedObjects.get(batchKey)!.add(obj);
                obj.visible = false;
            });

            // Clear pending batch
            pending.length = 0;

            this.logger.debug(`Batch processing complete: ${batchKey}`);
            this.logger.debug(`Current batch count: ${this.batches.size}`);
            this.logger.debug(`Current batch keys: ${Array.from(this.batches.keys()).join(', ')}`);
        } catch (error) {
            this.errorHandler.handleError(error instanceof Error ? error : new Error('Unknown error'), {
                context: 'BatchManager.processBatch',
                silent: false
            });
        }
    }

    /**
     * Process all pending batches
     */
    public processAllPending(): void {
        this.logger.debug(`Processing all pending batches...`);
        this.logger.debug(`Pending batch keys: ${Array.from(this.pendingBatches.keys()).join(', ')}`);
        
        this.pendingBatches.forEach((pending, key) => {
            this.logger.debug(`Processing pending batch: ${key} (${pending.length} objects)`);
            this.processBatch(key);
        });

        this.logger.debug(`All pending batches processed. Current batch count: ${this.batches.size}`);
    }

    /**
     * Get all batch meshes
     */
    public getBatchMeshes(): THREE.Mesh[] {
        return Array.from(this.batches.values());
    }

    /**
     * Get batch statistics
     */
    public getStats(): Record<string, { objectCount: number, pending: number }> {
        const stats: Record<string, { objectCount: number, pending: number }> = {};
        
        this.batches.forEach((_, key) => {
            stats[key] = {
                objectCount: this.batchedObjects.get(key)?.size || 0,
                pending: this.pendingBatches.get(key)?.length || 0
            };
        });

        return stats;
    }

    /**
     * Generate a batch key based on object properties
     */
    private getBatchKey(object: ExtendedObject3D, type: GeometryType): string {
        try {
            const material = object.material as THREE.Material;
            const materialId = material ? material.uuid : 'default';
            const color = material && (material as any).color ? 
                (material as any).color.getHexString() : 'default';
            return `${type}_${materialId}_${color}`;
        } catch (error) {
            this.logger.warn(`Error generating batch key: ${error instanceof Error ? error.message : 'Unknown error'}`);
            // Fallback to a simple type-based key
            return `${type}_${Date.now()}`;
        }
    }

    /**
     * Dispose of all batches
     */
    public dispose(): void {
        this.batches.forEach(batch => {
            if (batch.geometry) {
                batch.geometry.dispose();
            }
        });
        this.batches.clear();
        this.batchedObjects.clear();
        this.pendingBatches.clear();
    }
} 