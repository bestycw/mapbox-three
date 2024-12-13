/**
 * Base error class for all application errors
 */
export class MapboxThreeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when there are initialization issues
 */
export class InitializationError extends MapboxThreeError {
  constructor(message: string) {
    super(`Initialization Error: ${message}`);
  }
}

/**
 * Error thrown when there are rendering issues
 */
export class RenderError extends MapboxThreeError {
  constructor(message: string) {
    super(`Render Error: ${message}`);
  }
}

/**
 * Error thrown when there are resource loading issues
 */
export class ResourceError extends MapboxThreeError {
  constructor(message: string) {
    super(`Resource Error: ${message}`);
  }
}

/**
 * Error thrown when there are coordinate transformation issues
 */
export class CoordinateError extends MapboxThreeError {
  constructor(message: string) {
    super(`Coordinate Error: ${message}`);
  }
}

/**
 * Error thrown when there are configuration issues
 */
export class ConfigurationError extends MapboxThreeError {
  constructor(message: string) {
    super(`Configuration Error: ${message}`);
  }
}

/**
 * Error thrown when there are event handling issues
 */
export class EventError extends MapboxThreeError {
  constructor(message: string) {
    super(`Event Error: ${message}`);
  }
}

/**
 * Error thrown when there are state management issues
 */
export class StateError extends MapboxThreeError {
  constructor(message: string) {
    super(`State Error: ${message}`);
  }
} 