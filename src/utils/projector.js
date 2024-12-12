import * as THREE from 'three';

export class Projector {
    constructor(mapboxThree) {
        this.mapboxThree = mapboxThree;
        this.map = mapboxThree.map;
    }

    // 将经纬度转换为Three.js世界坐标
    project(lnglat, altitude = 0) {
        // 使用Mapbox的墨卡托投影
        const mercator = mapboxgl.MercatorCoordinate.fromLngLat(
            lnglat,
            altitude
        );

        // 转换为Three.js坐标系统
        return new THREE.Vector3(
            mercator.x - 0.5,
            mercator.y - 0.5,
            mercator.z || 0
        );
    }

    // 将Three.js世界坐标转回经纬度
    unproject(point) {
        const coord = new mapboxgl.MercatorCoordinate(
            point.x + 0.5,
            point.y + 0.5,
            point.z
        );
        return coord.toLngLat();
    }

    // 获取当前缩放级别下的缩放因子
    getScaleFactor(latitude) {
        return Math.cos(latitude * Math.PI / 180) * 2 * Math.PI;
    }

    // 将米转换为世界单位
    metersToWorldUnits(meters, latitude) {
        return meters * this.getScaleFactor(latitude) / this.map.transform.scale;
    }
} 