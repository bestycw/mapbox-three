import * as THREE from 'three';
import { Objects } from './Objects';
import { Object3D } from './Object3D';

export class ObjectFactory {
    constructor(mapboxThree) {
        this.mapboxThree = mapboxThree;
        this.objects = new Objects();
        this.objects.world = mapboxThree.world;
        this.objects.map = mapboxThree.map;
    }

    createBox(options = {}) {
        const {
            width = 20,
            height = 20,
            depth = 20,
            color = 'red',
            units = 'meters',
            material = 'MeshBasicMaterial'
        } = options;

        const geometry = new THREE.BoxGeometry(width, height, depth);
        const materialObj = typeof material === 'string' 
            ? new THREE[material]({ 
                color,
                transparent: false,
                opacity: 1.0,
                side: THREE.DoubleSide
            }) 
            : material;

        const mesh = new THREE.Mesh(geometry, materialObj);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const obj = Object3D(mesh, { units });
        this.objects._addMethods(obj);
        return obj;
    }

    createSphere(options = {}) {
        options = this.objects.utils._validate(options, this.objects._defaults.sphere);
        const mesh = this.objects.sphere(options);
        const obj = Object3D(mesh, { units: options.units });
        this.objects._addMethods(obj);
        return obj;
    }

    createLine(options = {}) {
        options = this.objects.utils._validate(options, this.objects._defaults.line);
        const line = this.objects.line(options);
        const obj = Object3D(line);
        this.objects._addMethods(obj);
        return obj;
    }

    createTube(options = {}) {
        options = this.objects.utils._validate(options, this.objects._defaults.tube);
        const tube = this.objects.tube(options);
        const obj = Object3D(tube);
        this.objects._addMethods(obj);
        return obj;
    }
}