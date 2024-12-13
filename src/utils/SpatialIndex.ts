import * as THREE from 'three';
import { ExtendedObject3D } from '../types';
import { Logger } from './Logger';
import { ErrorHandler } from './ErrorHandler';
import { PERFORMANCE_CONFIG } from '../config/performance';

/**
 * Octree node for spatial indexing
 */
class OctreeNode {
    bounds: THREE.Box3;
    objects: ExtendedObject3D[];
    children: OctreeNode[];
    level: number;

    constructor(bounds: THREE.Box3, level: number) {
        this.bounds = bounds;
        this.objects = [];
        this.children = [];
        this.level = level;
    }

    /**
     * Split node into 8 child nodes
     */
    split(): void {
        const center = new THREE.Vector3();
        this.bounds.getCenter(center);
        const size = new THREE.Vector3();
        this.bounds.getSize(size);
        const halfSize = size.multiplyScalar(0.5);

        for (let x = 0; x < 2; x++) {
            for (let y = 0; y < 2; y++) {
                for (let z = 0; z < 2; z++) {
                    const min = new THREE.Vector3(
                        center.x + (x - 0.5) * halfSize.x,
                        center.y + (y - 0.5) * halfSize.y,
                        center.z + (z - 0.5) * halfSize.z
                    );
                    const max = new THREE.Vector3(
                        center.x + (x + 0.5) * halfSize.x,
                        center.y + (y + 0.5) * halfSize.y,
                        center.z + (z + 0.5) * halfSize.z
                    );
                    const childBounds = new THREE.Box3(min, max);
                    this.children.push(new OctreeNode(childBounds, this.level + 1));
                }
            }
        }
    }
}

/**
 * Spatial index implementation using octree structure
 */
export class SpatialIndex {
    private static instance: SpatialIndex;
    private root: OctreeNode;
    private maxDepth: number;
    private maxObjectsPerNode: number;
    private logger: Logger;
    private errorHandler: ErrorHandler;

    private constructor() {
        const { spatialIndexConfig } = PERFORMANCE_CONFIG;
        this.maxDepth = spatialIndexConfig.maxDepth;
        this.maxObjectsPerNode = spatialIndexConfig.maxObjectsPerNode;
        this.root = new OctreeNode(spatialIndexConfig.bounds, 0);
        this.logger = Logger.getInstance();
        this.errorHandler = ErrorHandler.getInstance();
    }

    public static getInstance(): SpatialIndex {
        if (!SpatialIndex.instance) {
            SpatialIndex.instance = new SpatialIndex();
        }
        return SpatialIndex.instance;
    }

    /**
     * Insert an object into the spatial index
     */
    public insert(object: ExtendedObject3D): void {
        try {
            this.insertIntoNode(object, this.root);
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'SpatialIndex.insert',
                silent: true
            });
        }
    }

    private insertIntoNode(object: ExtendedObject3D, node: OctreeNode): void {
        if (!object.geometry) return;

        // Update object's bounding box
        object.geometry.computeBoundingBox();
        const bbox = object.geometry.boundingBox!.clone();
        bbox.applyMatrix4(object.matrixWorld);

        // Check if object fits in node
        if (!node.bounds.containsBox(bbox)) return;

        // If node is at max depth or has space, add object
        if (node.level === this.maxDepth || node.objects.length < this.maxObjectsPerNode) {
            node.objects.push(object);
            object.userData.spatialIndex = this.getNodePath(node);
            return;
        }

        // Split node if needed
        if (node.children.length === 0) {
            node.split();
        }

        // Try to insert into children
        node.children.forEach(child => {
            this.insertIntoNode(object, child);
        });
    }

    /**
     * Remove an object from the spatial index
     */
    public remove(object: ExtendedObject3D): void {
        try {
            if (!object.userData.spatialIndex) return;
            const node = this.getNodeFromPath(object.userData.spatialIndex);
            if (node) {
                const index = node.objects.indexOf(object);
                if (index !== -1) {
                    node.objects.splice(index, 1);
                }
            }
            delete object.userData.spatialIndex;
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'SpatialIndex.remove',
                silent: true
            });
        }
    }

    /**
     * Query objects within a bounding box
     */
    public query(bounds: THREE.Box3): ExtendedObject3D[] {
        try {
            const result: ExtendedObject3D[] = [];
            this.queryNode(bounds, this.root, result);
            return result;
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'SpatialIndex.query',
                silent: true
            });
            return [];
        }
    }

    private queryNode(bounds: THREE.Box3, node: OctreeNode, result: ExtendedObject3D[]): void {
        if (!node.bounds.intersectsBox(bounds)) return;

        // Add objects in this node that intersect with query bounds
        node.objects.forEach(object => {
            if (object.geometry) {
                object.geometry.computeBoundingBox();
                const bbox = object.geometry.boundingBox!.clone();
                bbox.applyMatrix4(object.matrixWorld);
                if (bounds.intersectsBox(bbox)) {
                    result.push(object);
                }
            }
        });

        // Recurse into children
        node.children.forEach(child => {
            this.queryNode(bounds, child, result);
        });
    }

    /**
     * Get path to node in octree (for object tracking)
     */
    private getNodePath(node: OctreeNode): number[] {
        const path: number[] = [];
        let current = node;
        let parent = this.findParent(current);

        while (parent) {
            const index = parent.children.indexOf(current);
            path.unshift(index);
            current = parent;
            parent = this.findParent(current);
        }

        return path;
    }

    /**
     * Find parent node of a given node
     */
    private findParent(node: OctreeNode): OctreeNode | null {
        const findParentRecursive = (current: OctreeNode): OctreeNode | null => {
            for (const child of current.children) {
                if (child === node) return current;
                const found = findParentRecursive(child);
                if (found) return found;
            }
            return null;
        };

        return findParentRecursive(this.root);
    }

    /**
     * Get node from path
     */
    private getNodeFromPath(path: number[]): OctreeNode | null {
        let current = this.root;
        for (const index of path) {
            if (!current.children[index]) return null;
            current = current.children[index];
        }
        return current;
    }

    /**
     * Clear the spatial index
     */
    public clear(): void {
        this.root = new OctreeNode(PERFORMANCE_CONFIG.spatialIndexConfig.bounds, 0);
    }
} 