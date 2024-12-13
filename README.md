# MapboxThree

A powerful library that combines Mapbox GL JS and Three.js for advanced 3D visualization.

## Features

### Core Features
- Seamless integration of Mapbox GL JS and Three.js
- Geographic coordinate system support
- Automatic camera synchronization
- Event handling and interaction
- Animation system with easing functions

### 3D Objects
- Spheres, boxes, lines, and tubes
- Custom geometries support
- Material management
- Geographic positioning
- Scale and rotation controls

### Performance Optimization System
The library includes a comprehensive optimization system for handling large-scale 3D visualizations:

#### Optimization Strategies
- **Geometry Batching**
  - Combines similar geometries to reduce draw calls
  - Automatic batch management
  - Configurable batch sizes

- **Instanced Rendering**
  - Efficient rendering of repeated objects
  - Automatic instance management
  - Matrix transformation support

- **Object Pooling**
  - Object reuse to reduce GC pressure
  - Automatic lifecycle management
  - Support for multiple object types

- **Level of Detail (LOD)**
  - Distance-based detail adjustment
  - Multiple detail levels
  - Smooth transitions

- **Spatial Indexing**
  - Octree-based spatial partitioning
  - Efficient spatial queries
  - Automatic index updates

#### Performance Configuration
```typescript
const performanceConfig = {
    // Batching
    batchingEnabled: true,
    batchSize: 1000,
    maxBatches: 100,
    
    // Instancing
    instanceThreshold: 100,  // Minimum objects for instancing
    maxInstances: 10000,    // Maximum instances per mesh
    
    // Object Pooling
    poolEnabled: true,
    poolTypes: ['sphere', 'box', 'line', 'tube'],
    maxObjectsInPool: 10000,
    
    // LOD Configuration
    lodLevels: {
        near: { distance: 100, detail: 1.0 },    // Full detail
        medium: { distance: 500, detail: 0.5 },   // Half detail
        far: { distance: 1000, detail: 0.25 }     // Quarter detail
    }
};
```

#### Usage Example
```typescript
// Initialize optimization manager
const optimizationManager = OptimizationManager.getInstance();

// Enable optimization strategies
optimizationManager.enableStrategy('batching');
optimizationManager.enableStrategy('instancing');
optimizationManager.enableStrategy('lod');

// Process objects
const object = new ExtendedObject3D();
optimizationManager.processObject(object);

// Monitor performance
const metrics = optimizationManager.getMetrics();
```

### Utility Classes
- GeometryFactory: Manages geometries with caching
- MaterialFactory: Handles material creation and reuse
- BatchManager: Manages geometry batching
- InstanceManager: Handles instanced rendering
- ObjectPool: Manages object reuse
- SpatialIndex: Provides spatial querying
- GeoUtils: Geographic utilities

### Performance Tools
- EventOptimizer: Optimizes event handling
- PerformanceMonitor: Tracks performance metrics
- ResourceManager: Manages resource lifecycle

## Installation

```bash
npm install mapbox-three
```

## Basic Usage

```typescript
import { MapboxThree } from 'mapbox-three';

const mapboxThree = new MapboxThree({
    mapboxConfig: {
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v10',
        accessToken: 'your-access-token',
        center: [-74.5, 40],
        zoom: 9,
        pitch: 60
    }
});

// Add a sphere
mapboxThree.sphere({
    coordinates: [-74.5, 40],
    radius: 100,
- 🌍 Seamless integration of Three.js with Mapbox GL JS
- 🎨 Easy creation of 3D objects (spheres, boxes, lines, tubes)
- 🎯 Automatic coordinate transformation between geo and world coordinates
- 🎥 Synchronized camera controls
- 🏔️ Support for Mapbox terrain
- 🎮 Interactive object controls

### 3D Objects
- **Basic Shapes**
  - Spheres with customizable radius and segments
  - Boxes with adjustable dimensions
  - Lines with multiple points
  - Tubes following paths
- **Properties**
  - Position using geographic coordinates
  - Scale and rotation
  - Custom materials and colors
  - Opacity and transparency
  - Units (meters or scene units)

### Performance Optimizations
- **Resource Management**
  - Geometry caching
  - Material caching
  - Object pooling
  - Automatic resource disposal
- **Rendering Optimizations**
  - Batch rendering
  - Level of Detail (LOD) support
  - Frustum culling
  - Geometry merging
- **Event Handling**
  - Event throttling
  - Optimized raycasting
  - Efficient event delegation

### Advanced Features
- **Animation System**
  - Property animations
  - Easing functions
  - Animation chaining
  - Playback controls
- **Event System**
  - Click events
  - Hover events
  - Mouse interaction
  - Custom event handling
- **Material System**
  - Standard materials
  - Custom materials
  - Material presets
  - Dynamic updates

### Developer Features
- **Error Handling**
  - Custom error types
  - Detailed error messages
  - Error tracking
  - Fallback mechanisms
- **Logging System**
  - Multiple log levels
  - Configurable logging
  - Performance logging
  - Debug information
- **Type Safety**
  - Full TypeScript support
  - Type definitions
  - Type inference
  - Compile-time checks

## Installation

```bash
npm install mapbox-three
```

## Basic Usage

```typescript
// Initialize MapboxThree
const mapboxThree = new MapboxThree({
    mapboxConfig: {
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v11',
        accessToken: 'YOUR_MAPBOX_TOKEN',
        center: [-74.5, 40],
        zoom: 9,
        pitch: 60,
        bearing: 30,
        terrain: {
            source: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            exaggeration: 1.5
        }
    },
    defaultLights: true
});

// Add a 3D sphere
const sphere = mapboxThree.sphere({
    coordinates: [-74.5, 40],
    radius: 200,
    color: '#ff0000',
    opacity: 0.8,
    units: 'meters',
    altitude: 500
});
mapboxThree.add(sphere);

// Add animation
mapboxThree.animate(sphere, {
    'position.y': { start: sphere.position.y, end: sphere.position.y + 1000 }
}, {
    duration: 2000,
    easing: 'easeInOutQuad',
    yoyo: true,
    repeat: -1
});

// Add event listener
mapboxThree.addEventListener(sphere, 'click', (event) => {
    console.log('Sphere clicked!', event);
});
```

## Advanced Usage

### Custom Objects
```typescript
// Create a custom path
const path = [
    [-74.5, 40],
    [-74.3, 40.2],
    [-74.7, 40.4]
];

// Create a tube following the path
const tube = mapboxThree.tube({
    path,
    radius: 50,
    color: '#ffff00',
    opacity: 0.8,
    units: 'meters',
    altitude: 400,
    segments: 64
});
mapboxThree.add(tube);
```

### Performance Optimization
```typescript
// Configure performance settings
mapboxThree.configure({
    batchingEnabled: true,
    lodLevels: {
        near: { distance: 1000, detail: 1 },
        medium: { distance: 2000, detail: 0.5 },
        far: { distance: 5000, detail: 0.25 }
    },
    eventThrottling: true,
    throttleDelay: 16
});
```

### Error Handling
```typescript
try {
    // Your code
} catch (error) {
    if (error instanceof InitializationError) {
        console.error('Initialization failed:', error.message);
    } else if (error instanceof RenderError) {
        console.error('Rendering failed:', error.message);
    }
}
```

## API Documentation

### Core Classes
- `MapboxThree`: Main class for integration
- `RenderManager`: Handles rendering pipeline
- `ObjectFactory`: Creates 3D objects
- `EventManager`: Manages events
- `AnimationManager`: Handles animations

### Utility Classes
- `GeometryFactory`: Manages geometries
- `MaterialFactory`: Manages materials
- `BatchManager`: Handles object batching
- `ObjectPool`: Manages object reuse
- `GeoUtils`: Geographic utilities

### Performance Tools
- `EventOptimizer`: Optimizes event handling
- `PerformanceMonitor`: Monitors performance
- `ResourceManager`: Manages resources

## Contributing

Contributions are welcome! Please read our contributing guidelines for details.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 