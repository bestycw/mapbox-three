import * as THREE from 'three';

/**
 * 深度合并配置对象
 * @param target 目标配置对象
 * @param source 源配置对象
 * @returns 合并后的配置对象
 */
export function deepMerge<T extends object>(target: T, source?: Partial<T>): T {
    if (!source) return { ...target };
    
    const result = { ...target };
    
    for (const key in source) {
        const value = source[key];
        const targetValue = target[key];
        
        if (value === undefined) continue;
        
        if (value instanceof THREE.Vector3) {
            // 处理 Vector3 类型
            result[key] = value.clone() as any;
        } else if (value instanceof THREE.Color) {
            // 处理 Color 类型
            result[key] = value.clone() as any;
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            // 递归合并嵌套对象
            result[key] = deepMerge(
                targetValue as object || {},
                value as object
            ) as any;
        } else {
            // 直接赋值基本类型和数组
            result[key] = value as any;
        }
    }
    
    return result;
} 