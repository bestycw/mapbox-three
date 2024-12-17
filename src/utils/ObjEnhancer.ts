import { GeoUtils } from './GeoUtils';
import { Coordinates, ExtendedObject3D, UserData } from '../config';


/**
 * 增强 Obj 对象，添加地理相关的方法
 */
export function enhancedObj(obj: ExtendedObject3D): ExtendedObject3D {
    console.log(obj)
    const enhanced = obj;
    // obj.userData.isUser = true;
    obj.userData.isUser = true;
    // 添加地理坐标方法
    enhanced.setCoords = function(coords: Coordinates): ExtendedObject3D {

        if(!coords || !Array.isArray(coords) || coords.length <2)  throw new Error('Invalid coordinates');
        if (obj.userData.units === 'meters') {
            const s = GeoUtils.projectedUnitsPerMeter(coords[1]);
            // console.log(s)
            this.scale.set(s, s, s);
        }
        const worldPos = GeoUtils.projectToWorld(coords);
        this.position.copy(worldPos);
        return this;
    };

    enhanced.getCoords = function(): Coordinates {
        return GeoUtils.unprojectFromWorld(this.position);
    };

    // 添加高度控制方法
    enhanced.setAltitude = function(this: ExtendedObject3D, altitude: number): ExtendedObject3D {
        if(!this.getCoords || !this.setCoords) return this;
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
    //应该是obj的userData和userOptions的合并
    obj.userData = {
        isUser: true,
        units: 'meters',
        ...obj.userData,
        ...userOptions,
    };
    return obj;
}

export function formatObj(object: ExtendedObject3D, userOptions: UserData ={}): ExtendedObject3D {
    if(!object.userData.isUser){
        initUserData(object, userOptions);
    }
    if (!object.setCoords) {
        enhancedObj(object);
    }

    return object;
}