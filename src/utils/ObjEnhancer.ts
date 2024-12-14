import * as THREE from 'three';
import { GeoUtils } from './GeoUtils';
import { Coordinates } from '../types';

// 修改接口定义
interface EnhancedObject3D extends THREE.Mesh {
    setCoords(coords: Coordinates): EnhancedObject3D;
    getCoords(): Coordinates;
    setAltitude(altitude: number): EnhancedObject3D;
    getAltitude(): number;
    setUnits(units: string): EnhancedObject3D;
    getUnits(): string;
}

/**
 * 增强 Obj 对象，添加地理相关的方法
 */
export function enhancedObj(obj: THREE.Mesh): EnhancedObject3D {
    const enhanced = obj as EnhancedObject3D;
    // 添加地理坐标方法
    enhanced.setCoords = function(coords: Coordinates): EnhancedObject3D {
        const worldPos = GeoUtils.projectToWorld(coords);
        this.position.copy(worldPos);
        return this;
    };

    enhanced.getCoords = function(): Coordinates {
        return GeoUtils.unprojectFromWorld(this.position);
    };

    // 添加高度控制方法
    enhanced.setAltitude = function(altitude: number): EnhancedObject3D {
        const coords = this.getCoords();
        const worldPos = GeoUtils.projectToWorld(coords, altitude);
        this.position.copy(worldPos);
        return this;
    };

    enhanced.getAltitude = function(): number {
        return this.position.y;
    };

    // 添加单位设置方法
    enhanced.setUnits = function(units: string): EnhancedObject3D {
        this.userData.units = units;
        return this;
    };

    enhanced.getUnits = function(): string {
        return this.userData.units || 'meters';
    };

    return enhanced;
} 