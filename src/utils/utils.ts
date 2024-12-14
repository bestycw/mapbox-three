import * as THREE from 'three';
import * as Constants from '../config/constants';
import { Validator } from './validate';

type Rotation = number | { x?: number; y?: number; z?: number };
type Scale = number | { x?: number; y?: number; z?: number };
type LngLat = [number, number] | [number, number, number];

interface Types {
    rotation: (r: Rotation, currentRotation: number[]) => number[];
    scale: (s: Scale, currentScale: number[]) => number[];
    applyDefault: (array: (number | undefined)[], current: number[]) => number[];
}

export const utils = {
    prettyPrintMatrix(uglymatrix: number[]): void {
        for (let s = 0; s < 4; s++) {
            const quartet = [
                uglymatrix[s],
                uglymatrix[s + 4],
                uglymatrix[s + 8],
                uglymatrix[s + 12]
            ];
            console.log(quartet.map(num => num.toFixed(4)));
        }
    },

    makePerspectiveMatrix(fovy: number, aspect: number, near: number, far: number): THREE.Matrix4 {
        const out = new THREE.Matrix4();
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);

        const newMatrix = [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, (2 * far * near) * nf, 0
        ] as const;

        out.elements = [...newMatrix];
        return out;
    },

    radify(deg: number | number[] | { x?: number; y?: number; z?: number }): number | number[] {
        function convert(degrees: number = 0): number {
            return Math.PI * 2 * degrees / 360;
        }

        if (typeof deg === 'object') {
            if (Array.isArray(deg)) {
                return deg.map(degree => convert(degree));
            } else {
                return [convert(deg.x), convert(deg.y), convert(deg.z)];
            }
        }
        return convert(deg);
    },

    degreeify(rad: number | { x: number; y: number; z: number }): number | number[] {
        function convert(radians: number = 0): number {
            return radians * 360 / (Math.PI * 2);
        }

        if (typeof rad === 'object') {
            return [convert(rad.x), convert(rad.y), convert(rad.z)];
        }
        return convert(rad);
    },

    projectToWorld(coords: [number, number] | [number, number, number], altitude?: number): THREE.Vector3 {
        const projected = [
            -Constants.MERCATOR_A * Constants.DEG2RAD * coords[0] * Constants.PROJECTION_WORLD_SIZE,
            -Constants.MERCATOR_A * Math.log(Math.tan((Math.PI * 0.25) + (0.5 * Constants.DEG2RAD * coords[1]))) * Constants.PROJECTION_WORLD_SIZE
        ];

        const z = altitude ?? coords[2] ?? 0;
        const pixelsPerMeter = this.projectedUnitsPerMeter(coords[1]);
        projected.push(z * pixelsPerMeter);

        return new THREE.Vector3(projected[0], projected[1], projected[2]);
    },

    projectedUnitsPerMeter(latitude: number): number {
        return Math.abs(Constants.WORLD_SIZE / Math.cos(Constants.DEG2RAD * latitude) / Constants.EARTH_CIRCUMFERENCE);
    },

    _scaleVerticesToMeters(centerLatLng: LngLat, vertices: THREE.Vector3[]): THREE.Vector3[] {
        const pixelsPerMeter = this.projectedUnitsPerMeter(centerLatLng[1]);
        const centerProjected = this.projectToWorld(centerLatLng);

        for (let i = 0; i < vertices.length; i++) {
            vertices[i].multiplyScalar(pixelsPerMeter);
        }

        return vertices;
    },

    projectToScreen(coords: LngLat): void {
        console.log("WARNING: Projecting to screen coordinates is not yet implemented");
    },

    unprojectFromScreen(pixel: number[]): void {
        console.log("WARNING: unproject is not yet implemented");
    },

    unprojectFromWorld(worldUnits: THREE.Vector3): LngLat {
        const unprojected = [
            -worldUnits.x / (Constants.MERCATOR_A * Constants.DEG2RAD * Constants.PROJECTION_WORLD_SIZE),
            2 * (Math.atan(Math.exp(worldUnits.y / (Constants.PROJECTION_WORLD_SIZE * (-Constants.MERCATOR_A)))) - Math.PI / 4) / Constants.DEG2RAD
        ];

        const pixelsPerMeter = this.projectedUnitsPerMeter(unprojected[1]);
        const height = worldUnits.z || 0;
        unprojected.push(height / pixelsPerMeter);

        return unprojected as LngLat;
    },

    _flipMaterialSides(obj: THREE.Object3D | THREE.Object3D[]): void {
        const objects = Array.isArray(obj) ? obj : [obj];
        objects.forEach(object => {
            if (!object) return;

            if ('material' in object && object.material instanceof THREE.Material) {
                object.material.side = THREE.DoubleSide;
            }

            if (object.children) {
                object.children.forEach(child => this._flipMaterialSides(child));
            }
        });
    },

    normalizeVertices(vertices: THREE.Vector3[]): { vertices: THREE.Vector3[]; position: THREE.Vector3 } {
        const geometry = new THREE.BufferGeometry().setFromPoints(vertices);
        geometry.computeBoundingSphere();
        const center = geometry.boundingSphere!.center;
        const radius = geometry.boundingSphere!.radius;

        const scaled = vertices.map(v3 => {
            return v3.clone().sub(center);
        });

        return { vertices: scaled, position: center };
    },

    flattenVectors(vectors: THREE.Vector3[]): number[] {
        const flattenedArray: number[] = [];
        for (const vertex of vectors) {
            flattenedArray.push(vertex.x, vertex.y, vertex.z);
        }
        return flattenedArray;
    },

    lnglatsToWorld(coords: LngLat[]): THREE.Vector3[] {
        return coords.map(pt => {
            const p = this.projectToWorld(pt);
            return new THREE.Vector3(p.x, p.y, p.z);
        });
    },

    extend<T extends object>(original: T, addition: Partial<T>): void {
        Object.assign(original, addition);
    },

    clone<T extends object>(original: T): T {
        return { ...original };
    },

    types: {
        rotation(r: Rotation, currentRotation: number[]): number[] {
            if (typeof r === 'number') r = { z: r };
            const degrees = this.applyDefault([r.x, r.y, r.z], currentRotation);
            return utils.radify(degrees) as number[];
        },

        scale(s: Scale, currentScale: number[]): number[] {
            if (typeof s === 'number') return [s, s, s];
            return this.applyDefault([s.x, s.y, s.z], currentScale);
        },

        applyDefault(array: (number | undefined)[], current: number[]): number[] {
            return array.map((item, index) => item ?? current[index]);
        }
    } as Types,

    _validate<T extends object>(userInputs: Partial<T>, defaults: { [K in keyof T]: T[K] | null }): T {
        const validatedOutput = { ...defaults } as T;
        
        for (const key in userInputs) {
            if (userInputs[key] !== undefined) {
                validatedOutput[key as keyof T] = userInputs[key] as T[keyof T];
            } else if (defaults[key] === null) {
                throw new Error(`${key} is required`);
            }
        }
        
        return validatedOutput;
    },

    Validator: new Validator(),
    exposedMethods: ['projectToWorld', 'projectedUnitsPerMeter', 'extend', 'unprojectFromWorld'] as const
}; 