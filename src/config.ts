import * as THREE from 'three';

// World constants
export const WORLD_SIZE = 1024000;
export const MERCATOR_A = 6378137.0;
export const PROJECTION_WORLD_SIZE = WORLD_SIZE / (MERCATOR_A * Math.PI * 2);
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;
export const EARTH_CIRCUMFERENCE = 40075000;

// Animation easing functions
export const EASING = {
    Linear: (t: number): number => t,
    QuadIn: (t: number): number => t * t,
    QuadOut: (t: number): number => t * (2 - t),
    QuadInOut: (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    ElasticOut: (t: number): number => {
        const p = 0.3;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
    }
} as const;

// Default material configurations
export const DEFAULT_MATERIALS = {
    basic: {
        type: 'MeshBasicMaterial',
        options: {
            color: 0xffffff,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        }
    },
    line: {
        type: 'LineBasicMaterial',
        options: {
            color: 0x000000,
            linewidth: 1,
            transparent: true,
            opacity: 1
        }
    },
    standard: {
        type: 'MeshStandardMaterial',
        options: {
            color: 0xffffff,
            metalness: 0.5,
            roughness: 0.5,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        }
    }
} as const;

// Default geometry configurations
export const DEFAULT_GEOMETRIES = {
    sphere: {
        radius: 1,
        segments: 32,
        material: 'basic',
        units: 'meters'
    },
    box: {
        width: 1,
        height: 1,
        depth: 1,
        material: 'basic',
        units: 'meters'
    },
    line: {
        width: 1,
        material: 'line',
        units: 'meters'
    },
    tube: {
        radius: 1,
        segments: 64,
        radialSegments: 8,
        closed: false,
        material: 'basic',
        units: 'meters',
        path: [] as THREE.Vector3[]
    }
} as const;

// Camera settings
export const CAMERA = {
    fov: 28,
    near: 0.000000000001,
    far: Infinity,
    defaultPosition: [0, 0, 1000] as [number, number, number]
} as const;

// Light settings
export const LIGHTS = {
    ambient: {
        color: 0xffffff,
        intensity: 0.5
    },
    directional: {
        color: 0xffffff,
        intensity: 0.8,
        position: [0, 80000000, 100000000] as [number, number, number]
    }
} as const; 