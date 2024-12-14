import * as THREE from 'three';
import mapboxgl from 'mapbox-gl';
import { ObjectFactory } from '../objects/ObjectFactory';
import { Logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';
import { CameraConfig, LightsConfig, MapboxThreeConfig, RendererConfig, SceneConfig } from '../types/config';
import { DEFAULT_CONFIG } from '../config/DefaultConfig';
import { deepMerge } from '../utils/deepMerge';
import { 
    BoxObject,
    SphereObject,
    ExtendedObject3D
} from '../types';
import { CameraSync } from './CameraSync';

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
    private objectFactory!: ObjectFactory;
    private cameraSync!: CameraSync;
    
    public world!: THREE.Group;
    public isInitialized: boolean = false;

    private readonly logger: Logger;
    private readonly errorHandler: ErrorHandler;
    private readonly layerId: string = 'mapbox-three-layer';

    constructor(options: Partial<MapboxThreeConfig>) {
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
    private initializeConfig(options: Partial<MapboxThreeConfig>): MapboxThreeConfig {
        const config = deepMerge(DEFAULT_CONFIG, options);
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
            render: (gl: WebGLRenderingContext, matrix: number[]) => {
                this.render(matrix);
            }
        };
    }

    private initializeThreeJS(gl: WebGLRenderingContext): void {
        const { three } = this.config;
        this.setupRenderer(gl, three?.renderer);
        // 初始化场景
        this.setupScene(three?.scene);

        // 初始化相机
        this.setupCamera(three?.camera);
        
        // 初始化灯光
        this.setupLights(three?.lights);

        // 初始化对象工厂
        this.objectFactory = new ObjectFactory(this);
        

    }
    private setupScene(config?: SceneConfig): void {
        // if (!config) throw new Error('Scene is not defined');
        this.scene = new THREE.Scene();
        this.world = new THREE.Group();
        this.scene.add(this.world);

        if (config?.background) {
            this.scene.background = new THREE.Color(config.background);
        }

    }
    private setupRenderer(gl: WebGLRenderingContext, config?: RendererConfig): void {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.map.getCanvas(),
            context: gl,
            ...(config || {})
        });
        this.renderer.autoClear = false;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    private setupCamera(config?: CameraConfig): void {
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
            this.world
        );

        // 如果配置中启用了相机同步
        if (config?.sync !== false) {
            this.cameraSync.enable();
        }
    }
    private setupLights(config?: LightsConfig): void {
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

    private render(matrix: number[]): void {
        try {
            // // 更新相机
            // this.cameraSync.update();

            // const cameraMat = new THREE.Matrix4().fromArray(matrix);
            // this.camera.projectionMatrix.copy(cameraMat);
            if (this.map.repaint) {
                this.map.repaint = false;
            }
            this.renderer.resetState();
            this.renderer.render(this.scene, this.camera);

            if (this.config.three?.renderMode === 'auto') {
                this.map.triggerRepaint();
            }
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'MapboxThree.render',
                silent: true
            });
        }
    }

    // 公共API
    public add(object: ExtendedObject3D): this {
        this.world.add(object);
        return this;
    }

    public remove(object: ExtendedObject3D): this {
        this.world.remove(object);
        return this;
    }

    public box(options: Partial<BoxObject> = {}): ExtendedObject3D {
        console.log('box', this.objectFactory);
        return this.objectFactory.createBox(options);
    }

    public sphere(options: Partial<SphereObject> = {}): ExtendedObject3D {
        return this.objectFactory.createSphere(options);
    }

    public dispose(): void {
        this.renderer?.dispose();
        this.map?.remove();
    }
} 