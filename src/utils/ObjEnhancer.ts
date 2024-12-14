import { GeoUtils } from './GeoUtils';
import { Coordinates, ExtendedObject3D, UserData } from '../types';


/**
 * 增强 Obj 对象，添加地理相关的方法
 */
export function enhancedObj(obj: ExtendedObject3D): ExtendedObject3D {
    const enhanced = obj;
    // obj.userData.isUser = true;
    obj.userData.isUser = true;
    // 添加地理坐标方法
    enhanced.setCoords = function(coords: Coordinates): ExtendedObject3D {
        const worldPos = GeoUtils.projectToWorld(coords);
        this.position.copy(worldPos);
        return this;
    };

    enhanced.getCoords = function(): Coordinates {
        return GeoUtils.unprojectFromWorld(this.position);
    };

    // 添加高度控制方法
    enhanced.setAltitude = function(altitude: number): ExtendedObject3D {
        const coords = this.getCoords();
        const worldPos = GeoUtils.projectToWorld(coords, altitude);
        this.position.copy(worldPos);
        return this;
    };

    enhanced.getAltitude = function(): number {
        return this.position.y;
    };
    return enhanced;
} 

export function initUserData(obj: ExtendedObject3D, userOptions: UserData ={}): ExtendedObject3D {
    // if(!userOptions) return obj;
    if (userOptions.scale) {
        if (Array.isArray(userOptions.scale)) {
            const [x, y, z] = userOptions.scale;
            obj.scale.set(x, y, z);
        } else {
            obj.scale.setScalar(userOptions.scale);
        }
    }

    if (userOptions.rotation) {
        const [x, y, z] = userOptions.rotation;
        obj.rotation.set(x, y, z);
    }
    obj.userData = {
        isUser: true,
        units: 'meters',
        ...userOptions,
    };
    return obj;
}

export function formatObj(object: ExtendedObject3D, userOptions: UserData ={}): ExtendedObject3D {
    if (!object.setCoords) {
        enhancedObj(object);
    }
    if(!object.userData.isUser){
        initUserData(object, userOptions);
    }
    return object;
}