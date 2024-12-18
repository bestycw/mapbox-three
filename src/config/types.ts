import * as THREE from 'three';

// ... existing types ...

export interface OptimizationOptions {
    lod?: {
        levels: Array<{ distance: number; detail: number | THREE.Mesh }>;
    };
    instancing?: {
        groupId: string;
        maxInstances?: number;
    };
    objectPool?: {
        key: string;
        maxSize?: number;
    };
}

export interface PerformanceMetrics {
    memory?: {
        geometries: number;
        textures: number;
        materials: number;
        totalMemory: number;
    };
    instances?: {
        count: number;
        batches: number;
        drawCalls: number;
    };
    performance: {
        fps: number;
        frameTime: number;
        operations: Record<string, number>;
    };
} 