import * as THREE from 'three';
import { Map } from 'mapbox-gl';
import { CameraSync } from './CameraSync';
import { ObjectFactory } from '../objects/ObjectFactory';
import { AnimationManager } from '../animation/AnimationManager';
import { EventManager } from '../events/EventManager';
import { RenderManager } from '../render/RenderManager';
import { GeoUtils } from '../utils/GeoUtils';
import { 
    MapboxThreeOptions, 
    SphereObject, 
    LineObject, 
    TubeObject, 
    BoxObject,
    ExtendedObject3D,
    AnimationOptions
} from '../types';

/**
 * MapboxThree - Main class for integrating Three.js with Mapbox GL JS
 */
export class MapboxThree {
    private map: Map;
    private context: WebGLRenderingContext;
    private options: Required<MapboxThreeOptions>;
    
    // Core components
    private renderManager: RenderManager;
    private cameraSync: CameraSync;
    private objectFactory: ObjectFactory;
    private animationManager: AnimationManager;
    private eventManager: EventManager;

    // Scene objects
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    world: THREE.Group;

    /**
     * Creates a new MapboxThree instance
     * @param map Mapbox GL JS map instance
     * @param context WebGL rendering context
     * @param options Configuration options
     */
    constructor(map: Map, context: WebGLRenderingContext, options: MapboxThreeOptions = {}) {
        this.map = map;
        this.context = context;
        this.options = {
            defaultLights: options.defaultLights ?? true,
            passiveRendering: options.passiveRendering ?? true
        };

        // Initialize render manager
        this.renderManager = new RenderManager(this, {
            defaultLights: this.options.defaultLights,
            passiveRendering: this.options.passiveRendering
        });

        // Get core components from render manager
        this.scene = this.renderManager.getScene();
        this.camera = this.renderManager.getCamera();
        this.renderer = this.renderManager.getRenderer();

        // Create world container
        this.world = new THREE.Group();
        this.scene.add(this.world);
        // Initialize other managers
        this.cameraSync = new CameraSync(map, this.camera, this.world);
        this.objectFactory = new ObjectFactory(this);
        this.animationManager = new AnimationManager();
        this.eventManager = new EventManager();

        // Setup event listeners
        this.setupEventListeners();

        // Start render loop
        this.update = this.update.bind(this);
        this.update();
    }

    /**
     * Creates a sphere object
     * @param options Sphere configuration options
     * @returns Created sphere object
     */
    sphere(options: Partial<SphereObject> = {}): ExtendedObject3D {
        return this.objectFactory.createSphere(options);
    }

    /**
     * Creates a line object
     * @param options Line configuration options
     * @returns Created line object
     */
    line(options: LineObject): ExtendedObject3D {
        return this.objectFactory.createLine(options);
    }

    /**
     * Creates a tube object
     * @param options Tube configuration options
     * @returns Created tube object
     */
    tube(options: Partial<TubeObject> = {}): ExtendedObject3D {
        return this.objectFactory.createTube(options);
    }

    /**
     * Creates a box object
     * @param options Box configuration options
     * @returns Created box object
     */
    box(options: Partial<BoxObject> = {}): ExtendedObject3D {
        return this.objectFactory.createBox(options);
    }

    /**
     * Adds an object to the scene
     * @param obj Object to add
     * @returns Added object
     */
    add(obj: ExtendedObject3D): ExtendedObject3D {
        obj._mapboxThree = this;
        this.world.add(obj);
        return obj;
    }

    /**
     * Removes an object from the scene
     * @param obj Object to remove
     * @returns Removed object
     */
    remove(obj: ExtendedObject3D): ExtendedObject3D {
        this.world.remove(obj);
        obj._mapboxThree = undefined;
        return obj;
    }

    /**
     * Animates an object's properties
     * @param object Object to animate
     * @param properties Properties to animate
     * @param options Animation options
     * @returns Animation ID
     */
    animate(
        object: ExtendedObject3D,
        properties: Record<string, { start: number; end: number }>,
        options?: AnimationOptions
    ): string {
        return this.animationManager.animate(object, properties, options);
    }

    /**
     * Adds an event listener to an object
     * @param object Object to listen for events on
     * @param type Event type
     * @param callback Event callback
     */
    addEventListener(object: ExtendedObject3D, type: string, callback: (event: any) => void): void {
        this.eventManager.addEventListener(object, type as any, callback);
    }

    /**
     * Removes an event listener from an object
     * @param object Object to remove listener from
     * @param type Event type
     * @param callback Event callback
     */
    removeEventListener(object: ExtendedObject3D, type: string, callback: (event: any) => void): void {
        this.eventManager.removeEventListener(object, type as any, callback);
    }

    /**
     * Projects geographic coordinates to world coordinates
     * @param lnglat Geographic coordinates
     * @param altitude Altitude in meters
     * @returns World coordinates
     */
    projectToWorld(lnglat: [number, number], altitude: number = 0): THREE.Vector3 {
        return GeoUtils.projectToWorld([lnglat[0], lnglat[1], altitude]);
    }

    /**
     * Unprojects world coordinates to geographic coordinates
     * @param point World coordinates
     * @returns Geographic coordinates
     */
    unprojectFromWorld(point: THREE.Vector3): [number, number, number] {
        return GeoUtils.unprojectFromWorld(point);
    }

    /**
     * Converts meters to world units at a given latitude
     * @param meters Distance in meters
     * @param latitude Latitude at which to calculate
     * @returns Distance in world units
     */
    metersToWorldUnits(meters: number, latitude: number): number {
        return GeoUtils.metersToWorldUnits(meters, latitude);
    }

    /**
     * Updates the scene
     */
    private update(): void {
        if (this.map.repaint) {
            this.map.repaint = false;
        }

        // console.log('MapboxThree.update:', {
        //     cameraPosition: this.camera.position,
        //     worldPosition: this.world.position,
        //     worldScale: this.world.scale,
        //     worldRotation: this.world.rotation
        // });

        this.renderer.resetState();
        this.cameraSync.updateCamera();
        this.renderManager.render();

        if (!this.options.passiveRendering) {
            this.map.triggerRepaint();
        }
    }

    /**
     * Sets up event listeners
     */
    private setupEventListeners(): void {
        const canvas = this.map.getCanvas();

        canvas.addEventListener('mousemove', (event: MouseEvent) => {
            this.renderManager.updateMousePosition(event);
            const intersects = this.renderManager.getIntersects();
            this.eventManager.handleMouseMove(intersects);
        });

        canvas.addEventListener('mousedown', (event: MouseEvent) => {
            this.renderManager.updateMousePosition(event);
            const intersects = this.renderManager.getIntersects();
            this.eventManager.handleMouseDown(intersects);
        });

        canvas.addEventListener('mouseup', () => {
            this.eventManager.handleMouseUp();
        });
    }

    /**
     * Disposes of all resources
     */
    dispose(): void {
        this.renderManager.dispose();
        this.animationManager.stopAll();
        this.eventManager.clear();
        this.world.clear();
    }
} 