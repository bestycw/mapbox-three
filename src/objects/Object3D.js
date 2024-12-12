import * as THREE from 'three';
import { utils } from '../utils/utils';

export function Object3D(obj, options) {
    if (!obj) return console.error("Object3D: obj parameter required");
    
    var geometry, material;
    
    if (obj.isObject3D) {
        geometry = obj.geometry;
        material = obj.material;
    }

    var geoGroup = new THREE.Group();
    geoGroup.userData = options || {};
    geoGroup.userData.isGeoGroup = true;

    var isArrayOfObjects = obj.length;

    if (isArrayOfObjects) {
        for (var o of obj) geoGroup.add(o);
    }
    else geoGroup.add(obj);

    utils._flipMaterialSides(obj);

    return geoGroup;
} 