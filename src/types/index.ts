import * as THREE from 'three';
import { Map } from 'mapbox-gl';
import { MapboxThree } from '../core/MapboxThree';
import { EASING, DEFAULT_MATERIALS, DEFAULT_GEOMETRIES } from '../config';

// Base types
export type Coordinates = [number, number] | [number, number, number];
export type MaterialType = keyof typeof DEFAULT_MATERIALS;
export type GeometryType = 'sphere' | 'box' | 'tube' | 'line';
export type UnitType = 'scene' | 'meters';
export type EasingType = keyof typeof EASING;

// Object options
export interface ObjectOptions {
    units?: UnitType;
    isGeoGroup?: boolean;
    [key: string]: any;
}

// Core interfaces
export interface MapboxThreeOptions {
    defaultLights?: boolean;
    passiveRendering?: boolean;
    map?: Map;
    context?: WebGLRenderingContext;
}

// Base object interface
export interface BaseObject {
    coordinates?: Coordinates;
    altitude?: number;
    scale?: number | [number, number, number];
    rotation?: [number, number, number];
    color?: string | number;
    opacity?: number;
    units?: UnitType;
    material?: MaterialType | THREE.Material;
}

// Geometry specific interfaces
export interface SphereObject extends BaseObject {
    radius?: number;
    segments?: number;
}

export interface LineObject extends BaseObject {
    path: Coordinates[];
    width?: number;
}

export interface TubeObject extends LineObject {
    radius?: number;
    segments?: number;
    radialSegments?: number;
    closed?: boolean;
}

export interface BoxObject extends BaseObject {
    width?: number;
    height?: number;
    depth?: number;
}

// Extended Three.js object
export interface ExtendedObject3D extends THREE.Object3D {
    _mapboxThree?: MapboxThree;
    userData: {
        units?: UnitType;
        isGeoGroup?: boolean;
        animationId?: string;
        [key: string]: any;
    };
}

// Animation types
export interface AnimationOptions {
    duration?: number;
    easing?: EasingType;
    repeat?: number;
    yoyo?: boolean;
    onStart?: () => void;
    onUpdate?: (progress: number) => void;
    onComplete?: () => void;
}

export interface AnimationProperty {
    start: number;
    end: number;
    current?: number;
    easing?: EasingType;
}

export interface AnimationState {
    id: string;
    object: ExtendedObject3D;
    startTime: number;
    duration: number;
    elapsed: number;
    properties: Record<string, AnimationProperty>;
    options: AnimationOptions;
    isPlaying: boolean;
    isPaused: boolean;
}

// Material types
export interface MaterialOptions {
    color?: string | number;
    transparent?: boolean;
    opacity?: number;
    side?: THREE.Side;
    metalness?: number;
    roughness?: number;
    [key: string]: any;
}

// Geometry types
export interface GeometryOptions {
    radius?: number;
    segments?: number;
    width?: number;
    height?: number;
    depth?: number;
    radialSegments?: number;
    closed?: boolean;
    path?: THREE.Vector3[];
    [key: string]: any;
}

// Export config types
export { EASING, DEFAULT_MATERIALS, DEFAULT_GEOMETRIES }; 