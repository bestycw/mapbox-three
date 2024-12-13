import * as THREE from 'three';
import { MapboxThree } from '../core/MapboxThree';
import { MaterialFactory } from '../utils/MaterialFactory';
import { GeometryFactory } from '../utils/GeometryFactory';
import { GeoUtils } from '../utils/GeoUtils';
import { Object3D, createObject3D } from './Object3D';
import { 
    SphereObject,
    LineObject,
    TubeObject,
    BoxObject,
    MaterialType
} from '../types';

export class ObjectFactory {
    private mapboxThree: MapboxThree;

    constructor(mapboxThree: MapboxThree) {
        this.mapboxThree = mapboxThree;
    }

    createBox(options: Partial<BoxObject> = {}): Object3D {
        console.log('ObjectFactory.createBox:', options);
        
        const geometry = GeometryFactory.create('box', options);
        const material = this.createMaterial(options.material || 'basic', {
            color: options.color,
            opacity: options.opacity,
            transparent: options.opacity !== undefined && options.opacity < 1
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const obj = createObject3D(mesh);
        if (options.coordinates) {
            obj.setCoords(options.coordinates);
        }

        return this.setupObject(obj, options);
    }

    createSphere(options: Partial<SphereObject> = {}): Object3D {
        const geometry = GeometryFactory.create('sphere', options);
        const material = this.createMaterial(options.material || 'basic', {
            color: options.color,
            opacity: options.opacity,
            transparent: options.opacity !== undefined && options.opacity < 1
        });

        const mesh = new THREE.Mesh(geometry, material);
        const obj = createObject3D(mesh);
        if (options.coordinates) {
            obj.setCoords(options.coordinates);
        }
        return this.setupObject(obj, options);
    }

    createLine(options: LineObject): Object3D {
        const points = options.path.map(coord => GeoUtils.projectToWorld(coord));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = MaterialFactory.create('line', {
            color: options.color,
            linewidth: options.width,
            opacity: options.opacity,
            transparent: options.opacity !== undefined && options.opacity < 1
        });

        const line = new THREE.Line(geometry, material);
        const obj = createObject3D(line);
        if (options.coordinates) {
            obj.setCoords(options.coordinates);
        }
        return this.setupObject(obj, options);
    }

    createTube(options: Partial<TubeObject> = {}): Object3D {
        if (!options.path || !options.path.length) {
            throw new Error('Tube requires a non-empty path');
        }

        const geometry = GeometryFactory.create('tube', {
            ...options,
            path: options.path.map(coord => GeoUtils.projectToWorld(coord))
        });

        const material = this.createMaterial(options.material || 'basic', {
            color: options.color,
            opacity: options.opacity,
            transparent: options.opacity !== undefined && options.opacity < 1
        });

        const mesh = new THREE.Mesh(geometry, material);
        const obj = createObject3D(mesh);
        if (options.coordinates) {
            obj.setCoords(options.coordinates);
        }
        return this.setupObject(obj, options);
    }

    private createMaterial(type: MaterialType | THREE.Material, options: any): THREE.Material {
        if (type instanceof THREE.Material) {
            return type;
        }
        return MaterialFactory.create(type, options);
    }

    private setupObject(obj: Object3D, options: Partial<BoxObject>): Object3D {
        if (options.scale) {
            if (Array.isArray(options.scale)) {
                const [x, y, z] = options.scale;
                obj.scale.set(x, y, z);
            } else {
                obj.scale.setScalar(options.scale);
            }
        }

        if (options.rotation) {
            const [x, y, z] = options.rotation;
            obj.rotation.set(x, y, z);
        }

        obj.userData.units = options.units || 'meters';
        this.mapboxThree.world.add(obj);

        return obj;
    }
} 