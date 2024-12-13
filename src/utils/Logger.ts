/**
 * Log levels for different types of messages
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Configuration options for the logger
 */
export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableTimestamp: boolean;
  customFormatter?: (level: LogLevel, message: string, ...args: any[]) => string;
}

/**
 * Logger utility class for consistent logging across the application
 */
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig = {
    minLevel: LogLevel.INFO,
    enableConsole: true,
    enableTimestamp: true
  };

  private constructor() {}

  /**
   * Get the singleton instance of the logger
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Configure the logger settings
   * @param config - Logger configuration options
   */
  public configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Format the log message with timestamp and level
   */
  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    if (this.config.customFormatter) {
      return this.config.customFormatter(level, message, ...args);
    }

    const timestamp = this.config.enableTimestamp ? `[${new Date().toISOString()}] ` : '';
    const formattedMessage = args.length > 0 ? this.interpolate(message, args) : message;
    return `${timestamp}[${level}] ${formattedMessage}`;
  }

  /**
   * Interpolate variables into the message string
   */
  private interpolate(message: string, args: any[]): string {
    return message.replace(/{(\d+)}/g, (match, index) => {
      return typeof args[index] !== 'undefined' ? this.stringify(args[index]) : match;
    });
  }

  /**
   * Safely stringify any value
   */
  private stringify(value: any): string {
    try {
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    } catch (error) {
      return '[Unstringifiable value]';
    }
  }

  /**
   * Log a debug message
   */
  public debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  /**
   * Log an info message
   */
  public info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  /**
   * Log a warning message
   */
  public warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  /**
   * Log an error message
   */
  public error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, ...args);
    
    if (this.config.enableConsole) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
      }
    }
  }

  /**
   * Check if the message should be logged based on minimum log level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    const minLevelIndex = levels.indexOf(this.config.minLevel);
    const currentLevelIndex = levels.indexOf(level);
    return currentLevelIndex >= minLevelIndex;
  }
} 