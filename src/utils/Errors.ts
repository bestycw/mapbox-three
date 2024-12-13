/**
 * Base error class for MapboxThree errors
 */
export class MapboxThreeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MapboxThreeError';
    }
}

/**
 * Error thrown when there's an issue with rendering
 */
export class RenderError extends MapboxThreeError {
    constructor(message: string) {
        super(message);
        this.name = 'RenderError';
    }
}

/**
 * Error thrown when there's an issue with geometry operations
 */
export class GeometryError extends MapboxThreeError {
    constructor(message: string) {
        super(message);
        this.name = 'GeometryError';
    }
}

/**
 * Error thrown when there's an issue with materials
 */
export class MaterialError extends MapboxThreeError {
    constructor(message: string) {
        super(message);
        this.name = 'MaterialError';
    }
}

/**
 * Error thrown when there's an issue with batching operations
 */
export class BatchingError extends MapboxThreeError {
    constructor(message: string) {
        super(message);
        this.name = 'BatchingError';
    }
}

/**
 * Error thrown when there's an issue with optimization operations
 */
export class OptimizationError extends MapboxThreeError {
    constructor(message: string) {
        super(message);
        this.name = 'OptimizationError';
    }
}

/**
 * Error thrown when there's an issue with scene operations
 */
export class SceneError extends MapboxThreeError {
    constructor(message: string) {
        super(message);
        this.name = 'SceneError';
    }
}

/**
 * Error thrown when there's an issue with configuration
 */
export class ConfigurationError extends MapboxThreeError {
    constructor(message: string) {
        super(message);
        this.name = 'ConfigurationError';
    }
}

/**
 * Error thrown when there's an issue with resource management
 */
export class ResourceError extends MapboxThreeError {
    constructor(message: string) {
        super(message);
        this.name = 'ResourceError';
    }
}

/**
 * Error thrown when there's an issue with initialization
 */
export class InitializationError extends MapboxThreeError {
    constructor(message: string) {
        super(message);
        this.name = 'InitializationError';
    }
}

/**
 * Error thrown when there's an issue with validation
 */
export class ValidationError extends MapboxThreeError {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Error thrown when there's an issue with event handling
 */
export class EventError extends MapboxThreeError {
    constructor(message: string) {
        super(message);
        this.name = 'EventError';
    }
} 