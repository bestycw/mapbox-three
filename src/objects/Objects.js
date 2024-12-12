import * as THREE from 'three';
import { utils } from '../utils/utils';
import { AnimationManager } from '../animation/AnimationManager';

export class Objects {
    constructor() {
        this.animationManager = new AnimationManager();
        this._defaults = {
            line: {
                geometry: null,
                color: 'black',
                width: 1,
                opacity: 1
            },
            sphere: {
                position: [0,0,0],
                radius: 1,
                sides: 20,
                units: 'scene',
                material: 'MeshBasicMaterial'
            },
            tube: {                
                geometry: null,
                radius: 1,
                sides: 6,
                material: 'MeshBasicMaterial'
            },
            extrusion: {
                footprint: null,
                base: 0,
                top: 100,
                color: 'black',
                material: 'MeshBasicMaterial',
                scaleToLatitude: false
            },
            loadObj: {
                obj: null,
                mtl: null,
                rotation: 0,
                scale: 1,
                units: 'scene'
            },
            Object3D: {
                obj: null, 
                units: 'scene'
            }
        };

        this.geometries = {
            line: ['LineString'],
            tube: ['LineString'],
            sphere: ['Point']
        };
    }

    line(obj) {
        obj = utils._validate(obj, this._defaults.line);

        //project to world and normalize
        var straightProject = utils.lnglatsToWorld(obj.geometry);
        var normalized = utils.normalizeVertices(straightProject);

        //flatten array for buffergeometry
        var flattenedArray = utils.flattenVectors(normalized.vertices);

        var positions = new Float32Array(flattenedArray); // 3 vertices per point
        var geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // material
        var material = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 21 });
        var line = new THREE.Line(geometry, material);

        line.options = obj.options || {};
        line.position.copy(normalized.position);

        return line;
    }

    _addMethods(obj, isStatic) {
        var root = this;

        if (!isStatic) {
            if (!obj.coordinates) obj.coordinates = [0,0,0];

            // Bestow this mesh with animation superpowers and keeps track of its movements in the global animation queue            
            root.animationManager.enroll(obj); 

            obj.setCoords = function(lnglat) {
                if (obj.userData.units === 'meters') {
                    var s = utils.projectedUnitsPerMeter(lnglat[1]);
                    obj.scale.set(s,s,s);
                }

                obj.coordinates = lnglat;
                obj.set({position: lnglat});
                
                return obj;
            };

            obj.setRotation = function(xyz) {
                if (typeof xyz === 'number') xyz = {z: xyz};

                var r = {
                    x: utils.radify(xyz.x) || obj.rotation.x,
                    y: utils.radify(xyz.y) || obj.rotation.y,
                    z: utils.radify(xyz.z) || obj.rotation.z
                };

                obj._setObject({rotation: [r.x, r.y, r.z]});
            };
        }

        obj.add = function() {
            root.world.add(obj);
            if (!isStatic) obj.set({position: obj.coordinates});
            return obj;
        };

        obj.remove = function() {
            root.world.remove(obj);
            root.map.repaint = true;
        };

        obj.duplicate = function(a) {
            var dupe = obj.clone();
            dupe.userData = obj.userData;
            root._addMethods(dupe);
            return dupe;
        };

        return obj;
    }

    _makeGroup(obj, options) {
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
} 