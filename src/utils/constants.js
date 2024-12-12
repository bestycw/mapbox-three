// World
const _WORLD_SIZE = 1024000;
const _MERCATOR_A = 6378137.0;

export const WORLD_SIZE = _WORLD_SIZE;
export const PROJECTION_WORLD_SIZE = _WORLD_SIZE / (_MERCATOR_A * Math.PI * 2);
export const MERCATOR_A = _MERCATOR_A; // 900913 projection property
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;
export const EARTH_CIRCUMFERENCE = 40075000; // In meters

// Transformations
export const RADIANS_TO_DEGREES = 180 / Math.PI;
export const DEGREES_TO_RADIANS = Math.PI / 180;

// Coordinate calculations
export const MERCATOR_SCALE = WORLD_SIZE / (2 * Math.PI * MERCATOR_A);

// Camera
export const CAMERA_FOV = 28;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 1e6;

// Camera movement
export const ZOOM_DISTANCE_FACTOR = 20;  // Distance factor for zoom level
export const MIN_PITCH = -60;  // Minimum pitch in degrees
export const MAX_PITCH = 60;   // Maximum pitch in degrees