import * as THREE from 'three';
import { CAMERA, LIGHTS } from '../config';
import { Map as MapboxMap } from 'mapbox-gl';

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

    constructor(options: RenderManagerOptions = {}) {
        this.initializeCamera(options);
        this.initializeRenderer(options);
        this.setupLights(options);
    }

    private initializeCamera(options: RenderManagerOptions): void {
        const canvas = options.map?.getCanvas();
        // console.log('canvas', canvas);
        const aspect = canvas 
            ? canvas.width / canvas.height 
            : window.innerWidth / window.innerHeight;
        // console.log('aspect', aspect);
        this.camera = new THREE.PerspectiveCamera(
            CAMERA.fov,
            aspect,
            CAMERA.near,
            CAMERA.far
        );
        this.camera.position.set(...CAMERA.defaultPosition);
    }

    private initializeRenderer(options: RenderManagerOptions): void {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            canvas: options.map?.getCanvas(),
            context: options.context
        });
        this.renderer.shadowMap.enabled = true;
        this.renderer.autoClear = false;  // 保留地图背景
    }

    private setupLights(options: RenderManagerOptions): void {
        if (options.defaultLights === false) return;

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
    }

    // 射线相关方法
    updateMousePosition(event: MouseEvent): void {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    getIntersects(): THREE.Intersection[] {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        return this.raycaster.intersectObjects(this.scene.children, true);
    }

    // 渲染方法
    render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    // Getter方法
    getScene = (): THREE.Scene => this.scene;
    getCamera = (): THREE.PerspectiveCamera => this.camera;
    getRenderer = (): THREE.WebGLRenderer => this.renderer;

    // 资源释放
    dispose(): void {
        this.renderer.dispose();
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (object.material instanceof THREE.Material) {
                    object.material.dispose();
                } else if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                }
            }
        });
    }
} 