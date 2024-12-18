import * as THREE from 'three';
import { MapboxThreeConfig } from '../types';

/**
 * 默认配置
 */
export const defaultConfig: MapboxThreeConfig = {
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
  },

  // Three.js 配置
  three: {
    renderer: {
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false,
      shadowMap: {
        enabled: true,
        type: THREE.PCFSoftShadowMap
      }
    },

    camera: {
      fov: 45,
      near: 0.1,
      far: Infinity,
      position: new THREE.Vector3(0, 0, 100)
    },

    scene: {
      fog: {
        enabled: false,
        near: 1,
        far: 1000
      }
    },

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

    renderMode: 'auto',
    autoRender: true
  },

  // 优化配置
  optimization: {
    instancing: {
      enabled: false,
      threshold: 100,
      batchSize: 100,
      dynamicBatching: true,
      updateInterval: 16,
      maxInstanceCount: 10000,
      initialCount: 1000,
      frustumCulled: true,
      castShadow: true,
      receiveShadow: true
    },

    lod: {
      enabled: false,
      dynamicAdjustment: false,
      transitionDuration: 300,
      performanceTarget: 60,
      updateInterval: 16,
      levels: [
        { distance: 0, detail: 1 },
        { distance: 1000, detail: 0.5 },
        { distance: 2000, detail: 0.1 }
      ]
    },

    objectPool: {
      enabled: false,
      defaultPoolSize: 1000,
      maxPoolSize: 10000,
      cleanupInterval: 60000,
      predictiveScaling: false,
      minIdleTime: 30000,
      maxIdleTime: 300000,
      warmupCount: 0
    },
    memoryManager: {
      enabled: false,
      maxCacheSize: 100,
      cleanupInterval: 60000,
      disposalStrategy: 'lru',
      autoCleanup: true,
      warningThreshold: 50,
      criticalThreshold: 100
    }
  }
}; 