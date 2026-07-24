/**
 * 日志级别定义
 * AI Agent 注意：日志级别按严重程度递增，过滤时只记录>=设定级别的日志
 */
export const LogLevels = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export type LogLevel = typeof LogLevels[keyof typeof LogLevels];

/**
 * 日志记录结构
 */
export interface LogRecord {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: string;
  error?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * 日志输出目标
 */
export type LogTarget = 'console' | 'file';

/**
 * 日志配置选项
 */
export interface LoggerOptions {
  /** 最低日志级别，默认 info */
  level?: LogLevel;
  /** 是否输出到控制台，默认 true */
  console?: boolean;
  /** 是否输出到文件，默认 true */
  file?: boolean;
  /** 日志文件目录，默认 ./logs */
  logDir?: string;
  /** 是否按日期轮转，默认 true */
  rotate?: boolean;
  /** 日志上下文前缀，用于区分模块来源 */
  context?: string;
}

/**
 * 日志器接口
 */
export interface ILogger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void;
  child(context: string): ILogger;
  setLevel(level: LogLevel): void;
}

/**
 * 日志级别优先级映射（用于比较）
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevels.DEBUG]: 0,
  [LogLevels.INFO]: 1,
  [LogLevels.WARN]: 2,
  [LogLevels.ERROR]: 3,
};
