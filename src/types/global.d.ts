/// <reference types="vite/client" />

import { MapboxThree } from '../core/MapboxThree';
import * as THREE from 'three';
import { Map } from 'mapbox-gl';

declare global {
    interface Window {
        MapboxThree: typeof MapboxThree;
        THREE: typeof THREE;
    }

    namespace mapboxgl {
        interface Map extends Map {
            repaint: boolean;
            transform: {
                width: number;
                height: number;
                angle: number;
                _pitch: number;
                scale: number;
                x: number;
                y: number;
                point: {
                    x: number;
                    y: number;
                };
            };
        }
    }
}

// Augment THREE.js types
declare module 'three' {
    interface Object3D {
        userData: {
            units?: 'scene' | 'meters';
            isGeoGroup?: boolean;
            animationId?: string;
            [key: string]: any;
        };
    }

    interface Material {
        side: THREE.Side;
    }
}

// Augment mapbox-gl types
declare module 'mapbox-gl' {
    interface Map {
        repaint: boolean;
        transform: {
            width: number;
            height: number;
            angle: number;
            _pitch: number;
            scale: number;
            x: number;
            y: number;
            point: {
                x: number;
                y: number;
            };
        };
    }
}

export {}; 