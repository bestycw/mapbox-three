import { MapboxThree } from './core/MapboxThree';
import * as THREE from 'three';

declare global {
    interface Window {
        MapboxThree: typeof MapboxThree;
        THREE: typeof THREE;
    }
}

// Export as window global when using script tag
if (typeof window !== 'undefined') {
    window.MapboxThree = MapboxThree;
    window.THREE = THREE;
}

// Export for module systems
export { 
    MapboxThree,
    THREE 
}; 