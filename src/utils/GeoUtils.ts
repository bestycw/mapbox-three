import * as THREE from 'three';
import { MERCATOR_A, DEG2RAD, PROJECTION_WORLD_SIZE, EARTH_CIRCUMFERENCE, WORLD_SIZE } from '../config/constants';
import { Coordinates } from '../types/index';

export class GeoUtils {
    // 将坐标投影到世界坐标
    static projectToWorld(coords: Coordinates, altitude = 0): THREE.Vector3 {
        const [lng, lat] = coords;
        const projected = [
            -MERCATOR_A * DEG2RAD * lng * PROJECTION_WORLD_SIZE,
            -MERCATOR_A * Math.log(Math.tan((Math.PI * 0.25) + (0.5 * DEG2RAD * lat))) * PROJECTION_WORLD_SIZE,
        ];

        const z = altitude || coords[2] || 0;
        const pixelsPerMeter = this.projectedUnitsPerMeter(lat);
        projected.push(z * pixelsPerMeter);

        return new THREE.Vector3(projected[0], projected[1], projected[2]);
    }

    static unprojectFromWorld(point: THREE.Vector3): [number, number, number] {
        const lng = -point.x / (MERCATOR_A * DEG2RAD * PROJECTION_WORLD_SIZE);
        const lat = 2 * (Math.atan(Math.exp(point.y / (PROJECTION_WORLD_SIZE * (-MERCATOR_A)))) - Math.PI / 4) / DEG2RAD;
        const pixelsPerMeter = this.projectedUnitsPerMeter(lat);
        const altitude = point.z / pixelsPerMeter;

        return [lng, lat, altitude];
    }

    static projectedUnitsPerMeter(latitude: number): number {
        // return Math.abs(PROJECTION_WORLD_SIZE / Math.cos(DEG2RAD * latitude) / EARTH_CIRCUMFERENCE);
        return WORLD_SIZE / 
        (Math.cos(latitude * DEG2RAD) * EARTH_CIRCUMFERENCE);
    }

    static metersToWorldUnits(meters: number, latitude: number): number {
        return this.projectedUnitsPerMeter(latitude) * meters;
    }

    static worldUnitsToMeters(units: number, latitude: number): number {
        return units / this.projectedUnitsPerMeter(latitude);
    }

    static createPath(coords: Coordinates[]): THREE.CurvePath<THREE.Vector3> {
        const points = coords.map(coord => this.projectToWorld(coord));
        const curve = new THREE.CatmullRomCurve3(points);
        const path = new THREE.CurvePath<THREE.Vector3>();
        path.add(curve);
        return path;
    }

    static calculateBoundingBox(coords: Coordinates[]): THREE.Box3 {
        const points = coords.map(coord => this.projectToWorld(coord));
        const box = new THREE.Box3();
        points.forEach(point => box.expandByPoint(point));
        return box;
    }

    /**
 * 计算相机高度
 * @param fov 视野角度(度)
 * @param zoom 地图缩放级别
 * @param screenHeight 屏幕高度(像素)
 * @returns 相机高度(米)
     */
    static calculateCameraHeight(fov: number, zoom: number, screenHeight: number): number {
       // 基准高度
       const BASE_HEIGHT = 10000; // 10km
    
       // 基础高度随zoom变化
       const zoomHeight = BASE_HEIGHT * Math.pow(0.5, zoom);
       
       // FOV调整因子
        const halfFovRad = (fov / 2) * (Math.PI / 180);
        const fovFactor = 1 / Math.tan(halfFovRad);
        
        // 最终高度
        return zoomHeight * fovFactor;
    } 
} 