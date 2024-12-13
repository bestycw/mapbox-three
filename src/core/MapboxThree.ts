import * as THREE from 'three';
import { Map } from 'mapbox-gl';
import { CameraSync } from './CameraSync';
import { ObjectFactory } from '../objects/ObjectFactory';
import { AnimationManager } from '../animation/AnimationManager';
import { EventManager } from '../events/EventManager';
import { RenderManager } from './RenderManager';
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
 * MapboxThree - 整合 Three.js 和 Mapbox GL JS 的主类
 */
export class MapboxThree {
    // 基础属性不再是只读的
    private map!: Map;
    private context!: WebGLRenderingContext;
    private options!: Required<MapboxThreeOptions>;
    
    // 管理器和场景对象保持现状
    private renderManager!: RenderManager;
    private cameraSync!: CameraSync;
    private objectFactory!: ObjectFactory;
    private animationManager!: AnimationManager;
    private eventManager!: EventManager;

    // 场景对象也需要移除 readonly
    public scene!: THREE.Scene;
    public camera!: THREE.PerspectiveCamera;
    public renderer!: THREE.WebGLRenderer;
    public world!: THREE.Group;

    // 这些仍然保持 readonly
    private readonly raycaster: THREE.Raycaster = new THREE.Raycaster();
    private readonly mouse: THREE.Vector2 = new THREE.Vector2();

    constructor(map: Map, context: WebGLRenderingContext, options: MapboxThreeOptions = {}) {
        this.initializeCore(map, context, options);
        this.initializeManagers();
        this.setupEventListeners();
        this.startRenderLoop();
    }

    private initializeCore(map: Map, context: WebGLRenderingContext, options: MapboxThreeOptions): void {
        this.map = map;
        this.context = context;
        this.options = {
            defaultLights: options.defaultLights ?? true,
            passiveRendering: options.passiveRendering ?? true,
            map,
            context
        };

        this.renderManager = new RenderManager(this.options);
        this.scene = this.renderManager.getScene();
        this.camera = this.renderManager.getCamera();
        this.renderer = this.renderManager.getRenderer();
        this.world = new THREE.Group();
        this.scene.add(this.world);
    }

    private initializeManagers(): void {
        this.cameraSync = new CameraSync(this.map, this.camera, this.world);
        this.objectFactory = new ObjectFactory(this);
        this.animationManager = new AnimationManager();
        this.eventManager = new EventManager();
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
        this.renderer.resetState();
        // this.cameraSync.updateCamera();
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

    /**
     * 处理地图点击事件
     * @param event 鼠标事件
     */
    private onMapClick(event: MouseEvent): void {
        // 计算鼠标在标准化设备坐标中的位置
        const canvas = this.map.getCanvas();
        const rect = canvas.getBoundingClientRect();
        
        this.mouse.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

        // 更新射线
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // 检查射线与物体的相交
        const intersects = this.raycaster.intersectObjects(this.world.children, true);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            console.log('Clicked object:', {
                object,
                position: object.position,
                worldPosition: object.getWorldPosition(new THREE.Vector3()),
                intersectionPoint: intersects[0].point
            });
            
            // 触发点击事件
            this.eventManager.emit('click', {
                object,
                intersection: intersects[0],
                originalEvent: event
            });
        }
    }

    /**
     * 添加点击事件监听器
     * @param callback 回调函数
     */
    onObjectClick(callback: (event: { 
        object: THREE.Object3D; 
        intersection: THREE.Intersection; 
        originalEvent: MouseEvent 
    }) => void): void {
        this.eventManager.on('click', callback);
    }

    private startRenderLoop(): void {
        // 绑定 update 方法到实例
        this.update = this.update.bind(this);
        // 开始渲染循环
        this.update();
        // 添加点击事件监听
        this.map.getCanvas().addEventListener('click', this.onMapClick.bind(this));
    }
} 