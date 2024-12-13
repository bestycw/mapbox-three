import * as THREE from 'three';
import { CAMERA, LIGHTS } from '../config';
import { Map as MapboxMap } from 'mapbox-gl';
import { Logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';
import { InitializationError, RenderError, ResourceError } from '../utils/Errors';

interface RenderManagerOptions {
    defaultLights?: boolean;
    passiveRendering?: boolean;
    map?: MapboxMap;
    context?: WebGLRenderingContext;
}

/**
 * 管理Three.js渲染相关的核心类
 */
export class RenderManager {
    private readonly scene: THREE.Scene = new THREE.Scene();
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private readonly raycaster: THREE.Raycaster = new THREE.Raycaster();
    private readonly mouse: THREE.Vector2 = new THREE.Vector2();
    private logger: Logger;
    private errorHandler: ErrorHandler;

    constructor(options: RenderManagerOptions = {}) {
        this.logger = Logger.getInstance();
        this.errorHandler = ErrorHandler.getInstance();

        try {
            this.logger.info('Initializing RenderManager...');
            this.initializeCamera(options);
            this.initializeRenderer(options);
            this.setupLights(options);
            this.logger.info('RenderManager initialized successfully');
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'RenderManager.constructor',
                rethrow: true
            });
        }
    }

    private initializeCamera(options: RenderManagerOptions): void {
        try {
            this.logger.debug('Initializing camera...');
            const canvas = options.map?.getCanvas();
            
            if (!canvas) {
                this.logger.warn('Canvas not available, using window dimensions for aspect ratio');
            }
            
            const aspect = canvas 
                ? canvas.width / canvas.height 
                : window.innerWidth / window.innerHeight;
            
            this.logger.debug(`Camera aspect ratio: ${aspect}`);
            
            this.camera = new THREE.PerspectiveCamera(
                CAMERA.fov,
                aspect,
                CAMERA.near,
                CAMERA.far
            );
            this.camera.position.set(...CAMERA.defaultPosition);
            this.logger.debug('Camera initialized');
        } catch (error: unknown) {
            throw new InitializationError(`Failed to initialize camera: ${(error as Error).message}`);
        }
    }

    private initializeRenderer(options: RenderManagerOptions): void {
        try {
            this.logger.debug('Initializing renderer...');
            
            if (!options.context) {
                throw new InitializationError('WebGL context is required');
            }

            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                canvas: options.map?.getCanvas(),
                context: options.context
            });
            
            this.renderer.shadowMap.enabled = true;
            this.renderer.autoClear = false;  // 保留地图背景
            this.logger.debug('Renderer initialized');
        } catch (error: unknown) {
            throw new InitializationError(`Failed to initialize renderer: ${(error as Error).message}`);
        }
    }

    private setupLights(options: RenderManagerOptions): void {
        try {
            if (options.defaultLights === false) {
                this.logger.debug('Skipping default lights setup');
                return;
            }

            this.logger.debug('Setting up default lights...');
            const ambient = new THREE.AmbientLight(
                LIGHTS.ambient.color,
                LIGHTS.ambient.intensity
            );
            const directional = new THREE.DirectionalLight(
                LIGHTS.directional.color,
                LIGHTS.directional.intensity
            );
            directional.position.set(...LIGHTS.directional.position);

            this.scene.add(ambient, directional);
            this.logger.debug('Default lights setup complete');
        } catch (error: unknown) {
            throw new InitializationError(`Failed to setup lights: ${(error as Error).message}`);
        }
    }

    updateMousePosition(event: MouseEvent): void {
        try {
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            this.logger.debug(`Mouse position updated: (${this.mouse.x}, ${this.mouse.y})`);
        } catch (error: unknown) {
            this.errorHandler.handleError(error as Error, {
                context: 'RenderManager.updateMousePosition',
                silent: true
            });
        }
    }

    getIntersects(): THREE.Intersection[] {
        try {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);
            this.logger.debug(`Found ${intersects.length} intersections`);
            return intersects;
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'RenderManager.getIntersects',
                silent: true
            });
            return [];
        }
    }

    render(): void {
        try {
            this.renderer.render(this.scene, this.camera);
        } catch (error: unknown) {
            throw new RenderError(`Failed to render scene: ${(error as Error).message}`);
        }
    }

    getScene = (): THREE.Scene => this.scene;
    getCamera = (): THREE.PerspectiveCamera => this.camera;
    getRenderer = (): THREE.WebGLRenderer => this.renderer;

    dispose(): void {
        try {
            this.logger.info('Disposing RenderManager resources...');
            
            // Dispose renderer
            this.renderer.dispose();
            this.logger.debug('Renderer disposed');

            // Dispose scene objects
            this.scene.traverse((object) => {
                try {
                    if (object instanceof THREE.Mesh) {
                        object.geometry.dispose();
                        if (object.material instanceof THREE.Material) {
                            object.material.dispose();
                        } else if (Array.isArray(object.material)) {
                            object.material.forEach(material => material.dispose());
                        }
                    }
                } catch (error: unknown) {
                    throw new ResourceError(`Failed to dispose object: ${(error as Error).message}`);
                }
            });
            
            this.logger.info('RenderManager resources disposed successfully');
        } catch (error) {
            this.errorHandler.handleError(error as Error, {
                context: 'RenderManager.dispose',
                rethrow: true
            });
        }
    }
} 