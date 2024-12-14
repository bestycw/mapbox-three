import * as THREE from 'three';
import {  MapboxOptions } from 'mapbox-gl';

// Mapbox 配置
export interface MapboxConfig extends MapboxOptions {
    container: string | HTMLElement;
    style: string;
    accessToken: string;
    terrain?: {
        source: string;
        exaggeration?: number;
    };
}

// Three.js 渲染器配置
export interface RendererConfig {
    antialias?: boolean;
    alpha?: boolean;
    preserveDrawingBuffer?: boolean;
    powerPreference?: 'high-performance' | 'low-power' | 'default';
    precision?: 'highp' | 'mediump' | 'lowp';
    shadowMap?: {
        enabled?: boolean;
        type?: THREE.ShadowMapType;
    };
}

// 相机配置
export interface CameraConfig {
    fov?: number;
    near?: number;
    far?: number;
    position?: THREE.Vector3;
    lookAt?: THREE.Vector3;
    zoom?: number;
    sync?: boolean;
}

// 场景配置
export interface SceneConfig {
    background?: THREE.Color | string;
    fog?: {
        enabled: boolean;
        color?: string;
        near?: number;
        far?: number;
    };
    environment?: string; // 环境贴图路径
}

// 灯光配置
export interface LightsConfig {
    ambient?: {
        enabled?: boolean;
        color?: string;
        intensity?: number;
    };
    directional?: {
        enabled?: boolean;
        color?: string;
        intensity?: number;
        position?: THREE.Vector3;
        castShadow?: boolean;
        shadow?: {
            mapSize?: THREE.Vector2;
            camera?: {
                near?: number;
                far?: number;
            };
        };
    };
    hemisphere?: {
        enabled?: boolean;
        skyColor?: string;
        groundColor?: string;
        intensity?: number;
    };
}

// Three.js 整体配置
export interface ThreeConfig {
    renderer?: RendererConfig;
    camera?: CameraConfig;
    scene?: SceneConfig;
    lights?: LightsConfig;
    renderMode?: 'auto' | 'manual' | 'ondemand';
}

// 性能相关配置
export interface PerformanceConfig {
    fps?: number;
    batching?: {
        enabled?: boolean;
        maxBatchSize?: number;
    };
    instancing?: {
        enabled?: boolean;
        threshold?: number;
    };
    lod?: {
        enabled?: boolean;
        levels?: Array<{
            distance: number;
            detail: number;
        }>;
    };
}

// 完整配置接口
export interface MapboxThreeConfig {
    mapbox: MapboxConfig;
    three?: ThreeConfig;
    performance?: PerformanceConfig;
    debug?: boolean;
}

