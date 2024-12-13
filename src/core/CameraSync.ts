import * as THREE from 'three';
import { Map } from 'mapbox-gl';
import { utils } from '../utils/utils';
import * as Constants from '../utils/constants';

interface CameraSyncState {
    fov: number;
    translateCenter: THREE.Matrix4;
    worldSizeRatio: number;
    cameraToCenterDistance?: number;
    cameraTranslateZ?: THREE.Matrix4;
    topHalfSurfaceDistance?: number;
}

export class CameraSync {
    map: Map;
    camera: THREE.PerspectiveCamera;
    world: THREE.Group;
    active: boolean;
    state: CameraSyncState;

    constructor(map: Map, camera: THREE.PerspectiveCamera, world?: THREE.Group) {
        this.map = map;
        this.camera = camera;
        this.active = true;

        this.camera.matrixAutoUpdate = false;   // We're in charge of the camera now!

        // Position and configure the world group so we can scale it appropriately when the camera zooms
        this.world = world || new THREE.Group();
        this.world.position.x = this.world.position.y = Constants.WORLD_SIZE/2;
        this.world.matrixAutoUpdate = false;

        //set up basic camera state
        this.state = {
            fov: 0.6435011087932844,
            translateCenter: new THREE.Matrix4(),
            worldSizeRatio: 512/Constants.WORLD_SIZE
        };

        this.state.translateCenter.makeTranslation(Constants.WORLD_SIZE/2, -Constants.WORLD_SIZE/2, 0);

        // Listen for move events from the map and update the Three.js camera
        this.map.on('move', this.updateCamera.bind(this));
        this.map.on('resize', this.setupCamera.bind(this));

        this.setupCamera();
    }

    setupCamera(): void {
        const t = this.map.transform as any;
        const halfFov = this.state.fov / 2;
        const cameraToCenterDistance = 0.5 / Math.tan(halfFov) * t.height;
        const groundAngle = Math.PI / 2 + t._pitch;

        this.state.cameraToCenterDistance = cameraToCenterDistance;
        this.state.cameraTranslateZ = new THREE.Matrix4().makeTranslation(0,0,cameraToCenterDistance);
        this.state.topHalfSurfaceDistance = Math.sin(halfFov) * cameraToCenterDistance / Math.sin(Math.PI - groundAngle - halfFov);
    
        this.updateCamera();
    }

    updateCamera(): void {
        if(!this.camera) {
            console.log('nocamera');
            return;
        }

        const t = this.map.transform as any;

        // Calculate z distance of the farthest fragment that should be rendered.
        const furthestDistance = Math.cos(Math.PI / 2 - t._pitch) * this.state.topHalfSurfaceDistance! + this.state.cameraToCenterDistance!;

        // Add a bit extra to avoid precision problems when a fragment's distance is exactly `furthestDistance`
        const farZ = furthestDistance * 1.01;

        this.camera.projectionMatrix = utils.makePerspectiveMatrix(this.state.fov, t.width / t.height, 1, farZ);

        const cameraWorldMatrix = new THREE.Matrix4();
        const cameraTranslateZ = new THREE.Matrix4().makeTranslation(0,0,this.state.cameraToCenterDistance!);
        const rotatePitch = new THREE.Matrix4().makeRotationX(t._pitch);
        const rotateBearing = new THREE.Matrix4().makeRotationZ(t.angle);

        // Unlike the Mapbox GL JS camera, separate camera translation and rotation out into its world matrix
        // If this is applied directly to the projection matrix, it will work OK but break raycasting
        cameraWorldMatrix
            .premultiply(this.state.cameraTranslateZ!)
            .premultiply(rotatePitch)
            .premultiply(rotateBearing);   

        this.camera.matrixWorld.copy(cameraWorldMatrix);

        const zoomPow = t.scale * this.state.worldSizeRatio; 

        // Handle scaling and translation of objects in the map in the world's matrix transform, not the camera
        const scale = new THREE.Matrix4();
        const translateMap = new THREE.Matrix4();
        const rotateMap = new THREE.Matrix4();

        scale.makeScale(zoomPow, zoomPow, zoomPow);
        
        const x = -t.x || -t.point.x;
        const y = t.y || t.point.y;

        translateMap.makeTranslation(x, y, 0);
        rotateMap.makeRotationZ(Math.PI);

        this.world.matrix = new THREE.Matrix4();
        this.world.matrix
            .premultiply(rotateMap)
            .premultiply(this.state.translateCenter)
            .premultiply(scale)
            .premultiply(translateMap);


        console.log('world:', this.world.matrix);
    }
} 