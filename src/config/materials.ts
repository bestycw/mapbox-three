import * as THREE from 'three';

export const DEFAULT_MATERIALS = {
    basic: {
        type: 'MeshBasicMaterial',
        options: {
            color: 0xffffff,
            transparent: false,
            opacity: 1.0,
            side: THREE.DoubleSide
        }
    },
    standard: {
        type: 'MeshStandardMaterial',
        options: {
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.5,
            transparent: false,
            opacity: 1.0,
            side: THREE.DoubleSide
        }
    },
    phong: {
        type: 'MeshPhongMaterial',
        options: {
            color: 0xffffff,
            specular: 0x111111,
            shininess: 30,
            transparent: false,
            opacity: 1.0,
            side: THREE.DoubleSide
        }
    },
    line: {
        type: 'LineBasicMaterial',
        options: {
            color: 0xffffff,
            linewidth: 1,
            transparent: false,
            opacity: 1.0
        }
    }
}; 