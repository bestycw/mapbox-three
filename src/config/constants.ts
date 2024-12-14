import * as THREE from 'three';

// World
const _WORLD_SIZE = 1024000;
const _MERCATOR_A = 6378137.0;

export const WORLD_SIZE: number = _WORLD_SIZE;
export const PROJECTION_WORLD_SIZE: number = _WORLD_SIZE / (_MERCATOR_A * Math.PI * 2);
export const MERCATOR_A: number = _MERCATOR_A; // 900913 projection property
export const DEG2RAD: number = Math.PI / 180;
export const RAD2DEG: number = 180 / Math.PI;
export const EARTH_CIRCUMFERENCE: number = 40075000; // In meters

// Transformations
export const RADIANS_TO_DEGREES: number = 180 / Math.PI;
export const DEGREES_TO_RADIANS: number = Math.PI / 180;

// Coordinate calculations
export const MERCATOR_SCALE: number = WORLD_SIZE / (2 * Math.PI * MERCATOR_A);

// Camera
export const CAMERA_FOV: number = 28;
export const CAMERA_NEAR: number = 0.1;
export const CAMERA_FAR: number = 1e6;

// Camera movement
export const ZOOM_DISTANCE_FACTOR: number = 20;  // Distance factor for zoom level
export const MIN_PITCH: number = -60;  // Minimum pitch in degrees
export const MAX_PITCH: number = 60;   // Maximum pitch in degrees 

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