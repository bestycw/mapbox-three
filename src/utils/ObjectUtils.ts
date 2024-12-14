import * as THREE from 'three';
import { BaseObject, MaterialOptions, UnitType } from '../types/index';
import { DEFAULT_GEOMETRIES } from '../config/constants';

export class ObjectUtils {
    static createMaterial(type: string, options: MaterialOptions): THREE.Material {
        const MaterialClass = (THREE as any)[type] as new (options: MaterialOptions) => THREE.Material;
        if (!MaterialClass) {
            throw new Error(`Invalid material type: ${type}`);
        }
        return new MaterialClass(options);
    }

    static mergeDefaults<T extends BaseObject>(options: Partial<T>, defaults: typeof DEFAULT_GEOMETRIES[keyof typeof DEFAULT_GEOMETRIES]): T {
        return {
            ...defaults,
            ...options
        } as unknown as T;
    }

    static validateCoordinates(coords: any): coords is [number, number] | [number, number, number] {
        if (!Array.isArray(coords)) return false;
        if (coords.length !== 2 && coords.length !== 3) return false;
        return coords.every(n => typeof n === 'number');
    }

    static validateScale(scale: any): scale is number | [number, number, number] {
        if (typeof scale === 'number') return true;
        if (Array.isArray(scale) && scale.length === 3) {
            return scale.every(n => typeof n === 'number');
        }
        return false;
    }

    static validateRotation(rotation: any): rotation is [number, number, number] {
        if (!Array.isArray(rotation)) return false;
        if (rotation.length !== 3) return false;
        return rotation.every(n => typeof n === 'number');
    }

    static validateUnit(unit: any): unit is UnitType {
        return unit === 'scene' || unit === 'meters';
    }

    static validateObject<T extends BaseObject>(obj: Partial<T>): obj is T {
        if (obj.coordinates && !this.validateCoordinates(obj.coordinates)) return false;
        if (obj.scale && !this.validateScale(obj.scale)) return false;
        if (obj.rotation && !this.validateRotation(obj.rotation)) return false;
        if (obj.units && !this.validateUnit(obj.units)) return false;
        return true;
    }
} 