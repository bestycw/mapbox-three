import * as THREE from 'three';
import { GeoUtils } from '../utils/GeoUtils';
import { Coordinates } from '../types';

export class Object3D extends THREE.Object3D {
    setCoords(coords: Coordinates): this {
        const worldPos = GeoUtils.projectToWorld(coords);
        this.position.copy(worldPos);
        return this;
    }

    getCoords(): Coordinates {
        return GeoUtils.unprojectFromWorld(this.position);
    }
}

export function createObject3D(obj: THREE.Object3D | THREE.Object3D[]): Object3D {
    const geoGroup = new Object3D();
    geoGroup.userData.isGeoGroup = true;

    const isArrayOfObjects = Array.isArray(obj);
    if (isArrayOfObjects) {
        obj.forEach(o => geoGroup.add(o));
    } else {
        geoGroup.add(obj);
    }

    return geoGroup;
} 