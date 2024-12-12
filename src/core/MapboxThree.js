import * as THREE from 'three';
import { CameraSync } from './CameraSync';
import { ObjectFactory } from '../objects/ObjectFactory';
import { utils } from '../utils/utils';

export class MapboxThree {
    constructor(map, context, options = {}) {
        this.map = map;
        this.context = context;
        
        // Apply default options
        this.options = {
            defaultLights: false,
            passiveRendering: true,
            ...options
        };

        // Initialize Three.js scene
        this.scene = new THREE.Scene();
        
        // Initialize renderer with minimal options
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            canvas: map.getCanvas(),
            context: context
        });
        // this.renderer.setSize( window.innerWidth, window.innerHeight );
        // this.renderer.setAnimationLoop( animate );
        this.renderer.shadowMap.enabled = true;
        this.renderer.autoClear = false;

        // Initialize camera with infinite far plane
        this.camera = new THREE.PerspectiveCamera(
            28,
            map.getCanvas().width / map.getCanvas().height,
            0.000000000001,
            Infinity
        );

        // Create world container for all objects
        this.world = new THREE.Group();
        this.scene.add(this.world);

        // Setup camera sync
        this.cameraSync = new CameraSync(map, this.camera, this.world);
        
        // Initialize object factory
        this.objectFactory = new ObjectFactory(this);

        // Setup default lights if requested
        if (this.options.defaultLights) {
            this.defaultLights();
        }

        // 监听地图大小变化
        // map.on('resize', () => {
        //     this.camera.aspect = map.getCanvas().width / map.getCanvas().height;
        //     this.camera.updateProjectionMatrix();
        //     this.renderer.setSize(map.getCanvas().width, map.getCanvas().height);
        // });
    }

    defaultLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff));
        const sunlight = new THREE.DirectionalLight(0xffffff, 0.25);
        sunlight.position.set(0, 80000000, 100000000);
        sunlight.matrixWorldNeedsUpdate = true;
        this.world.add(sunlight);
    }

    update() {
        if (this.map.repaint) this.map.repaint = false;
        // console.log('update',this);
        this.renderer.resetState () ;
        this.cameraSync.updateCamera();
        this.renderer.render(this.scene, this.camera);
        if (this.options.passiveRendering === false) {
            this.map.triggerRepaint();
        }
    }

    // Object creation methods
    sphere(options) {
        return this.objectFactory.createSphere(options);
    }

    line(options) {
        return this.objectFactory.createLine(options);
    }

    tube(options) {
        return this.objectFactory.createTube(options);
    }

    loadObj(options, callback) {
        return this.objectFactory.loadObj(options, callback);
    }

    add(obj) {
        obj._mapboxThree = this;
        this.world.add(obj);
        return obj;
    }

    remove(obj) {
        this.world.remove(obj);
        obj._mapboxThree = null;
        return obj;
    }

    projectToWorld(lnglat, altitude = 0) {
        return utils.projectToWorld(lnglat, altitude);
    }

    unprojectFromWorld(point) {
        return utils.unprojectFromWorld(point);
    }

    metersToWorldUnits(meters, latitude) {
        return utils.projectedUnitsPerMeter(latitude) * meters;
    }
}

// export { MapboxThree }; 