import * as THREE from 'three';
import mapboxgl from 'mapbox-gl';
import { Logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';
// import { defaultConfig } from '../config/DefaultConfig';
import { deepMerge } from '../utils/deepMerge';
import { CameraSync } from './CameraSync';
import { formatObj } from '../utils/ObjEnhancer';
import { OptimizationManager } from './OptimizationManager';
import { 
    MapboxThreeConfig, 
    ThreeSceneConfig, 
    ThreeRendererConfig, 
    ThreeCameraConfig, 
    ThreeLightsConfig,
    CustomConfig, 
    OptimizationConfig,
    ExtendedObject3D,
    UserData
} from '../config/types';
import { defaultConfig } from '../config/defaults/index';

/**
 * MapboxThree - 整合 Three.js 和 Mapbox GL JS 的主类
 */
export class MapboxThree {
    private config!: MapboxThreeConfig;
    private map!: mapboxgl.Map;
    private renderer!: THREE.WebGLRenderer;
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private customLayer!: mapboxgl.CustomLayerInterface;
    // private objectFactory!: ObjectFactory;
    private cameraSync!: CameraSync;
    private optimizationManager!: OptimizationManager;
    public world!: THREE.Group;
    public isInitialized: boolean = false;
    public virtualCamera!: THREE.Camera;
    private readonly logger: Logger;
    private readonly errorHandler: ErrorHandler;
    private readonly layerId: string = 'mapbox-three-layer';

    constructor(options: MapboxThreeConfig) {
        this.logger = Logger.getInstance();
        this.errorHandler = ErrorHandler.getInstance();
        this.config = this.initializeConfig(options);
    }
    public init(): Promise<MapboxThree> {
        return new Promise<MapboxThree>((resolve, reject) => {
            try {
                this.map = new mapboxgl.Map(this.config.mapbox);
                this.createCustomLayer();
                this.map.on('load', () => {
                    this.map.addLayer(this.customLayer);
                    this.isInitialized = true;
                    resolve(this);
                });
            } catch (error) {
                reject(error);
            }
        });
    }
    private initializeConfig(options: MapboxThreeConfig): MapboxThreeConfig {
        const config = deepMerge(defaultConfig, options);
        if (!config.mapbox.accessToken) {
            throw new Error('Mapbox access token is required');
        }
        return config;
    }

    private createCustomLayer(): void {
        this.customLayer = {
            id: this.layerId,
            type: 'custom',
            renderingMode: '3d',
            onAdd: (map: mapboxgl.Map, gl: WebGLRenderingContext) => {
                this.initializeThreeJS(gl);

            },
            render: () => {
                if(this.config.three?.autoRender){
                    this.render();
                }
            }
        };
    }

    private initializeThreeJS(gl: WebGLRenderingContext): void {
        const { three, optimization } = this.config;
        this.setupRenderer(gl, three?.renderer);
        this.setupScene(three?.scene);
        this.setupCamera(three?.camera);
        this.setupLights(three?.lights);
        
        // Initialize optimization manager after renderer is set up
        this.optimizationManager = OptimizationManager.getInstance(this.renderer, optimization);
    }

    private setupScene(config?: ThreeSceneConfig): void {
        this.scene = new THREE.Scene();
        this.world = new THREE.Group();
        this.scene.add(this.world);

        if (config?.background) {
            this.scene.background = new THREE.Color(config.background);
        }

    }
    private setupRenderer(gl: WebGLRenderingContext, config?: ThreeRendererConfig): void {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.map.getCanvas(),
            context: gl,
            ...(config || {})
        });
        this.renderer.autoClear = false;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    private setupCamera(config?: ThreeCameraConfig): void {
        if (!config) throw new Error('Camera is not defined');
        this.camera = new THREE.PerspectiveCamera(
            config.fov || 45,
            this.map.getCanvas().clientWidth / this.map.getCanvas().clientHeight,
            config.near || 0.1,
            config.far || Infinity
        );
        this.cameraSync = new CameraSync(
            this.map,
            this.camera,
            this.world,
            this
        );

        // 如果配置���启用了相机同步
        if (config?.sync !== false) {
            this.cameraSync.enable();
        }
    }
    private setupLights(config?: ThreeLightsConfig): void {
        if (!config) return;

        // const { lights } = config;   

        if (config.ambient?.enabled) {
            const light = new THREE.AmbientLight(
                config.ambient.color || '#ffffff',
                config.ambient.intensity || 0.5
            );
            this.scene.add(light);
        }

        if (config.directional?.enabled) {
            const light = new THREE.DirectionalLight(
                config.directional.color || '#ffffff',
                config.directional.intensity || 1.0
            );
            if (config.directional.position) {
                light.position.copy(config.directional.position);
            }
            this.scene.add(light);
        }
    }

    public render(callback?: () => void): void {
        try {
            if (this.optimizationManager) {
                this.optimizationManager.update(this.virtualCamera || this.camera);
            }

            if (this.map.repaint) {
                this.map.repaint = false;
            }
            
            this.renderer.resetState();
            this.renderer.render(this.scene, this.camera);

            if (this.config.three?.renderMode === 'auto') {
                this.map.triggerRepaint();
            }
            if(callback){
                callback();
            }
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'MapboxThree.render',
                silent: true
            });
        }
    }

    // 公共API
    public add(object: ExtendedObject3D, userOptions?: UserData, config?: CustomConfig): ExtendedObject3D {
        const { lod, coordinates } = config || {};
        
        // Check both global and object-specific LOD configuration
        if (this.optimizationManager) {
            const globalLODEnabled = this.config.optimization?.lod?.enabled;
            const objectLODDisabled = lod?.disableLOD;
            // console.log(globalLODEnabled,objectLODDisabled)
            if (globalLODEnabled && !objectLODDisabled) {
                const levels = lod?.lodLevels || this.config.optimization?.lod?.levels;
                // console.log(levels)
                if (levels) {
                   object =  this.optimizationManager.optimize(object, {
                        lod: { levels }
                    }) as ExtendedObject3D;
                }
            }
        }
        // console.log(object)
        formatObj(object, userOptions);
        
        if (object instanceof THREE.Mesh || object instanceof THREE.Group || object instanceof THREE.LOD) {
            this.world.add(object);
        } else if (object instanceof THREE.Light) {
            this.scene.add(object);
        } else if (object instanceof THREE.PerspectiveCamera) {
            this.scene.add(object);
        }

        if (coordinates && object.setCoords) {
            object.setCoords(coordinates);
        }

        return object;
    }

    public remove(object: ExtendedObject3D): this {
        // if (this.optimizationManager) {
        //     const lodStrategy = this.optimizationManager.getStrategy('lod');
        //     if (lodStrategy) {
        //         lodStrategy.remove(object);
        //     }
        // }
        this.world.remove(object);
        return this;
    }

    public dispose(): void {
        if (this.optimizationManager) {
            this.optimizationManager.dispose();
        }
        this.renderer?.dispose();
        this.map?.remove();
    }

    /**
     * 获取优化管理实例
     */
    public getOptimizationManager(): OptimizationManager {
        return this.optimizationManager;
    }

    /**
     * 获取地图缩放级别
     */
    public getMapZoom(): number {
        return this.map.getZoom();
    }

    /**
     * 获取地图变换对象
     */
    public getMapTransform(): any {
        return this.map.transform;
    }
} 