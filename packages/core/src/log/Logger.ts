import {
  LogLevels,
  LOG_LEVEL_PRIORITY,
  type LogLevel,
  type LogRecord,
  type LoggerOptions,
  type ILogger,
} from './types';

/**
 * 判断当前环境是否为 Tauri 运行环境
 * 通过检查 window.__TAURI__ 或 window.__TAURI_INTERNALS__ 是否存在
 */
function isTauriEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return !!(window as unknown as Record<string, unknown>).__TAURI__;
}

/**
 * 格式化日志为纯文本行
 * 格式：[YYYY-MM-DD HH:mm:ss.SSS] [LEVEL] [context] message {...metadata}
 */
function formatLogLine(record: LogRecord): string {
  const time = new Date(record.timestamp).toISOString().replace('T', ' ').slice(0, 23);
  const context = record.context ? ` [${record.context}]` : '';
  const parts: string[] = [`[${time}] [${record.level.toUpperCase()}]${context} ${record.message}`];

  if (record.error) {
    parts.push(`\n  error: ${record.error.name}: ${record.error.message}`);
    if (record.error.stack) {
      parts.push(`\n  stack: ${record.error.stack.replace(/\n/g, '\n        ')}`);
    }
  }

  if (record.metadata && Object.keys(record.metadata).length > 0) {
    try {
      parts.push(`\n  metadata: ${JSON.stringify(record.metadata, null, 2).replace(/\n/g, '\n        ')}`);
    } catch {
      parts.push('\n  metadata: [无法序列化]');
    }
  }

  return parts.join('');
}

/**
 * 格式化日志为控制台输出样式
 */
function formatConsoleMessage(record: LogRecord): string {
  const context = record.context ? `[${record.context}] ` : '';
  let message = `${context}${record.message}`;
  if (record.metadata && Object.keys(record.metadata).length > 0) {
    message += ` ${JSON.stringify(record.metadata)}`;
  }
  return message;
}

/**
 * 文件日志队列
 * 在 Tauri 环境中，使用 Tauri 的文件系统 API；非 Tauri 环境中保留在内存队列（供测试使用）
 */
class FileLogWriter {
  private pendingLogs: string[] = [];
  private writtenLogs: string[] = [];
  private writing = false;

  constructor(private logDir: string) {}

  async append(record: LogRecord): Promise<void> {
    const line = formatLogLine(record);
    this.pendingLogs.push(line);
    await this.flush();
  }

  private async flush(): Promise<void> {
    if (this.writing || this.pendingLogs.length === 0) {
      return;
    }

    this.writing = true;
    const logsToWrite = this.pendingLogs.splice(0);

    try {
      if (isTauriEnvironment()) {
        await this.writeToTauriFile(logsToWrite);
      } else {
        // 非 Tauri 环境下保留在内存中（用于测试验证）
        this.writtenLogs.push(...logsToWrite);
      }
    } finally {
      this.writing = false;
      if (this.pendingLogs.length > 0) {
        void this.flush();
      }
    }
  }

  private async writeToTauriFile(logsToWrite: string[]): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const { BaseDirectory, writeTextFile, create, exists } = await import('@tauri-apps/plugin-fs');
      const fileName = this.getLogFileName();
      const filePath = `${this.logDir}/${fileName}`;
      const content = logsToWrite.map(line => `${line}\n`).join('');

      const fileExists = await exists(filePath, { baseDir: BaseDirectory.AppLocalData });
      if (!fileExists) {
        await create(filePath, { baseDir: BaseDirectory.AppLocalData });
      }
      await writeTextFile(filePath, content, {
        baseDir: BaseDirectory.AppLocalData,
        append: true,
      });
    } catch (error) {
      console.error('[Logger] 写入日志文件失败:', error);
    }
  }

  private getLogFileName(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `app_${year}-${month}-${day}.log`;
  }

  /**
   * 获取当前待写入的日志内容（主要用于非 Tauri 环境测试）
   */
  getPendingLogs(): string[] {
    return [...this.pendingLogs, ...this.writtenLogs];
  }

  clearPendingLogs(): void {
    this.pendingLogs = [];
    this.writtenLogs = [];
  }
}

/**
 * 应用级日志器
 *
 * 设计原则：
 * 1. 统一的日志接口：所有模块通过同一套 debug/info/warn/error 方法记录日志
 * 2. 级别过滤：低于设定级别的日志不会输出到控制台和文件
 * 3. 上下文支持：通过 child() 方法创建带上下文的子日志器，便于定位日志来源
 * 4. 平台适配：Tauri 环境下优先使用 tauri-plugin-log 写入系统日志；非 Tauri 环境下降级到控制台
 * 5. 敏感信息：禁止在日志中记录密码、Token 等敏感信息（由调用方负责脱敏）
 */
export class Logger implements ILogger {
  private level: LogLevel;
  private enableConsole: boolean;
  private enableFile: boolean;
  private readonly context: string;
  private readonly fileWriter: FileLogWriter;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevels.INFO;
    this.enableConsole = options.console ?? true;
    this.enableFile = options.file ?? true;
    this.context = options.context ?? '';
    this.fileWriter = new FileLogWriter(options.logDir ?? './logs');
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.level];
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const record: LogRecord = {
      level,
      message,
      timestamp: Date.now(),
      context: this.context || undefined,
      error,
      metadata,
    };

    if (this.enableConsole) {
      this.writeToConsole(record);
    }

    if (this.enableFile) {
      void this.fileWriter.append(record);
    }
  }

  private writeToConsole(record: LogRecord): void {
    const message = formatConsoleMessage(record);
    switch (record.level) {
      case LogLevels.DEBUG:
        console.debug(message);
        break;
      case LogLevels.INFO:
        console.info(message);
        break;
      case LogLevels.WARN:
        console.warn(message);
        break;
      case LogLevels.ERROR:
        if (record.error) {
          console.error(message, record.error);
        } else {
          console.error(message);
        }
        break;
    }
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevels.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevels.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevels.WARN, message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log(LogLevels.ERROR, message, metadata, error);
  }

  child(context: string): ILogger {
    return new Logger({
      level: this.level,
      console: this.enableConsole,
      file: this.enableFile,
      logDir: this.fileWriter['logDir'],
      rotate: true,
      context: this.context ? `${this.context}:${context}` : context,
    });
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * 获取文件写入器中的待写入日志（主要用于测试）
   */
  getPendingLogs(): string[] {
    return this.fileWriter.getPendingLogs();
  }

  /**
   * 清空待写入日志（主要用于测试）
   */
  clearPendingLogs(): void {
    this.fileWriter.clearPendingLogs();
  }
}

export const logger = new Logger();
