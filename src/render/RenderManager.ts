import * as THREE from 'three';
import { MapboxThree } from '../core/MapboxThree';
import { CAMERA, LIGHTS } from '../config';

export class RenderManager {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    private mapboxThree: MapboxThree;
    private isPassiveRendering: boolean;

    constructor(mapboxThree: MapboxThree, options: { defaultLights?: boolean; passiveRendering?: boolean } = {}) {
        this.mapboxThree = mapboxThree;
        this.isPassiveRendering = options.passiveRendering ?? false;

        // Initialize scene
        this.scene = new THREE.Scene();
        
        // Initialize camera
        this.camera = new THREE.PerspectiveCamera(
            CAMERA.fov,
            window.innerWidth / window.innerHeight,
            CAMERA.near,
            CAMERA.far
        );
        this.camera.position.set(...CAMERA.defaultPosition);

        // Initialize renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Initialize raycaster
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Add default lights if requested
        if (options.defaultLights !== false) {
            this.setupDefaultLights();
        }

        // Setup event listeners
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    /**
     * Sets up default lighting for the scene
     */
    private setupDefaultLights(): void {
        const ambient = new THREE.AmbientLight(
            LIGHTS.ambient.color,
            LIGHTS.ambient.intensity
        );
        this.scene.add(ambient);

        const directional = new THREE.DirectionalLight(
            LIGHTS.directional.color,
            LIGHTS.directional.intensity
        );
        directional.position.set(...LIGHTS.directional.position);
        this.scene.add(directional);
    }

    /**
     * Handles window resize events
     */
    private handleResize(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Updates mouse position for raycasting
     * @param event Mouse event
     */
    updateMousePosition(event: MouseEvent): void {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    /**
     * Gets objects intersecting with the current mouse position
     * @returns Array of intersected objects
     */
    getIntersects(): THREE.Intersection[] {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        return this.raycaster.intersectObjects(this.scene.children, true);
    }

    /**
     * Renders the scene
     */
    render(): void {
        // if (!this.isPassiveRendering) {
        //     // console.log('RenderManager.render:', {
        //     //     isPassiveRendering: this.isPassiveRendering
        //     // });
        //     requestAnimationFrame(this.render.bind(this));
        // }
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Gets the scene
     * @returns THREE.Scene
     */
    getScene(): THREE.Scene {
        return this.scene;
    }

    /**
     * Gets the camera
     * @returns THREE.PerspectiveCamera
     */
    getCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }

    /**
     * Gets the renderer
     * @returns THREE.WebGLRenderer
     */
    getRenderer(): THREE.WebGLRenderer {
        return this.renderer;
    }

    /**
     * Disposes of all resources
     */
    dispose(): void {
        window.removeEventListener('resize', this.handleResize.bind(this));
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