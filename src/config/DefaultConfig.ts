import * as THREE from 'three';
import { MapboxThreeConfig } from '../types/config';

export const DEFAULT_CONFIG: MapboxThreeConfig = {
    // Mapbox 配置
    mapbox: {
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v11',
        accessToken: '',  // 用户必须提供
        center: [-74.5, 40],
        zoom: 9,
        pitch: 45,
        bearing: 0,
        antialias: true,
        terrain: {
            source: 'mapbox-dem',
            exaggeration: 1
        }
    },

    // Three.js 配置
    three: {
        // 渲染器配置
        renderer: {
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: false,
            shadowMap: {
                enabled: true,
                type: THREE.PCFSoftShadowMap
            }
        },

        // 相机配置
        camera: {
            fov: 45,
            near: 0.1,
            far: Infinity,
            position: new THREE.Vector3(0, 0, 100)
        },

        // 场景配置
        scene: {
            // background: '#000000',  // 透明背景
            fog: {
                enabled: false,
                // color: '#000000',
                near: 1,
                far: 1000
            }
        },

        // 灯光配置
        lights: {
            ambient: {
                enabled: true,
                color: '#ffffff',
                intensity: 0.5
            },
            directional: {
                enabled: true,
                color: '#ffffff',
                intensity: 1.0,
                position: new THREE.Vector3(100, 100, 100),
                castShadow: true,
                shadow: {
                    mapSize: new THREE.Vector2(1024, 1024),
                    camera: {
                        near: 0.5,
                        far: 500
                    }
                }
            }
        },

        // 渲染模式
        renderMode: 'auto',  // 'auto' | 'manual' | 'ondemand'
        autoRender: true
    },

    // 性能优化配置
    optimization: {
        // 批处理
        batching: {
            enabled: true,
            maxBatchSize: 1000,
            // dynamicBatching: true
        },

        // 实例化
        instancing: {
            enabled: true,
            threshold: 100,
            // dynamicInstancing: true
        },

        // LOD
        lod: {
            enabled: false,
            levels: [
                { distance: 0, detail: 1 },
                { distance: 1000, detail: 0.5 },
                { distance: 2000, detail: 0.1 },
                // { distance: 5000, detail: 0.1}
            ]
        },


        // 对象池
        objectPool: {
            enabled: false,
            maxSize: 1000,
            preloadCount: 10,
            autoExpand: true,
            cleanupInterval: 60000,
            predictiveScaling: false,
            minIdleTime: 30000,
            maxIdleTime: 300000,
            warmupCount: 0 
        },

        // // 渲染优化
        // rendering: {
        //     frustumCulling: true,
        //     occlusionCulling: true,
        //     maxFPS: 60,
        //     skipFrames: 0
        // }
    },

    // 调试配置
    // debug: {
    //     enabled: false,
    //     showStats: false,
    //     logLevel: 'warn',  // 'error' | 'warn' | 'info' | 'debug'
    //     showBoundingBoxes: false,
    //     showWireframe: false
    // }
}; 