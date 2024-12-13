import { Logger } from './Logger';
import { MapboxThreeError } from './Errors';

/**
 * Error handling options
 */
export interface ErrorHandlingOptions {
  rethrow?: boolean;
  silent?: boolean;
  context?: string;
}

/**
 * Utility class for handling errors consistently across the application
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Get the singleton instance of the error handler
   */
  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an error with consistent logging and optional rethrow
   * @param error - The error to handle
   * @param options - Error handling options
   */
  public handleError(error: Error, options: ErrorHandlingOptions = {}): void {
    const { rethrow = false, silent = false, context = '' } = options;

    if (!silent) {
      const errorMessage = this.formatErrorMessage(error, context);
      this.logger.error(errorMessage);

      if (error instanceof MapboxThreeError) {
        // Log additional details for our custom errors
        if (error.stack) {
          this.logger.debug('Stack trace:', error.stack);
        }
      }
    }

    if (rethrow) {
      throw error;
    }
  }

  /**
   * Format an error message with context
   */
  private formatErrorMessage(error: Error, context: string): string {
    const contextPrefix = context ? `[${context}] ` : '';
    return `${contextPrefix}${error.name}: ${error.message}`;
  }

  /**
   * Wrap an async function with error handling
   * @param fn - The async function to wrap
   * @param options - Error handling options
   */
  public static async wrapAsync<T>(
    fn: () => Promise<T>,
    options: ErrorHandlingOptions = {}
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      ErrorHandler.getInstance().handleError(error as Error, options);
      throw error;
    }
  }

  /**
   * Create a wrapped version of a method that includes error handling
   * @param target - The target object
   * @param methodName - The name of the method to wrap
   * @param options - Error handling options
   */
  public static wrapMethod(
    target: any,
    methodName: string,
    options: ErrorHandlingOptions = {}
  ): void {
    const originalMethod = target[methodName];
    
    target[methodName] = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        ErrorHandler.getInstance().handleError(error as Error, {
          ...options,
          context: `${target.constructor.name}.${methodName}`
        });
        throw error;
      }
    };
  }
} 