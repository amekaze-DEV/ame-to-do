/**
 * 应用配置类型定义
 * AI Agent 注意：所有用户可配置项应在此定义，新增配置字段时同步更新默认值和验证规则
 */

/** 主题模式 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** 应用语言 */
export type AppLanguage = 'zh-CN' | 'zh-TW' | 'en';

/** 窗口启动行为 */
export type WindowStartupBehavior = 'normal' | 'minimized' | 'tray';

/** WebDAV 认证方式 */
export type WebDAVAuthType = 'basic' | 'token';

/** 同步冲突策略 */
export type ConflictStrategy = 'local_wins' | 'remote_wins' | 'keep_both' | 'timestamp_wins';

/**
 * 通知设置
 */
export interface NotificationSettings {
  /** 是否启用通知 */
  enabled: boolean;
  /** 是否启用声音 */
  sound: boolean;
  /** 是否显示预览内容 */
  showPreview: boolean;
  /** 勿扰模式开始时间（分钟，从 0 开始，例如 1320=22:00） */
  doNotDisturbStart?: number;
  /** 勿扰模式结束时间（分钟） */
  doNotDisturbEnd?: number;
}

/**
 * WebDAV 同步配置
 * 注意：password / token 不保存在此处，应通过 SecureStorage 安全存储
 */
export interface WebDAVSettings {
  /** 是否启用 WebDAV 同步 */
  enabled: boolean;
  /** WebDAV 服务地址 */
  serverUrl: string;
  /** 认证方式 */
  authType: WebDAVAuthType;
  /** 用户名（basic 认证） */
  username: string;
  /** 远程应用目录 */
  remoteDir: string;
  /** 是否启动时自动同步 */
  syncOnStartup: boolean;
  /** 是否数据变更后自动同步 */
  syncOnChange: boolean;
  /** 自动同步间隔（分钟），0 表示不自动同步 */
  autoSyncIntervalMinutes: number;
  /** 冲突解决策略 */
  conflictStrategy: ConflictStrategy;
  /** 上次同步时间戳 */
  lastSyncAt?: number;
}

/**
 * 开机启动设置
 */
export interface AutoLaunchSettings {
  /** 是否启用开机启动 */
  enabled: boolean;
  /** 启动后是否最小化到托盘 */
  startMinimized: boolean;
  /** 启动后是否自动同步 */
  syncOnLaunch: boolean;
}

/**
 * 桌面小部件设置
 */
export interface WidgetSettings {
  /** 是否启用桌面小部件 */
  enabled: boolean;
  /** 开机后是否自动显示 */
  showOnStartup: boolean;
  /** 背景透明度（0-1） */
  opacity: number;
  /** 是否在其他应用全屏时隐藏 */
  hideOnFullscreen: boolean;
  /** 是否允许被其他窗口遮挡 */
  allowCovered: boolean;
  /** 窗口位置 X */
  positionX?: number;
  /** 窗口位置 Y */
  positionY?: number;
  /** 窗口宽度 */
  width?: number;
  /** 窗口高度 */
  height?: number;
}

/**
 * 模块开关状态
 */
export interface ModuleState {
  /** 模块 ID */
  moduleId: string;
  /** 是否启用 */
  enabled: boolean;
  /** 最后修改时间戳 */
  updatedAt: number;
}

/**
 * 日志设置
 */
/**
 * 配置中的日志级别
 * 注意：与 log 模块的 LogLevel 区分，配置层只做持久化存储
 */
export type ConfigLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogSettings {
  /** 日志级别 */
  level: ConfigLogLevel;
  /** 日志文件保留天数 */
  retentionDays: number;
}

/**
 * 应用完整配置
 */
export interface AppConfig {
  /** 应用版本，用于配置迁移 */
  version: number;
  /** 主题模式 */
  theme: ThemeMode;
  /** 应用语言 */
  language: AppLanguage;
  /** 窗口启动行为 */
  windowStartupBehavior: WindowStartupBehavior;
  /** 通知设置 */
  notification: NotificationSettings;
  /** WebDAV 同步设置 */
  webdav: WebDAVSettings;
  /** 开机启动设置 */
  autoLaunch: AutoLaunchSettings;
  /** 桌面小部件设置 */
  widget: WidgetSettings;
  /** 模块开关状态映射 */
  modules: Record<string, ModuleState>;
  /** 日志设置 */
  log: LogSettings;
  /** 扩展配置字段，供未来模块使用 */
  extensions: Record<string, unknown>;
}

/** 配置变更事件数据 */
export interface ConfigChangedEvent {
  /** 变更的配置键路径，例如 'theme'、'webdav.enabled' */
  key: string;
  /** 新值 */
  value: unknown;
  /** 旧值 */
  previousValue?: unknown;
}

/** 配置存储接口 */
export interface IConfigStore {
  /** 获取完整配置 */
  getConfig(): AppConfig;
  /** 获取指定路径的配置值 */
  get<T>(path: string): T | undefined;
  /** 设置指定路径的配置值 */
  set<T>(path: string, value: T): void;
  /** 批量更新配置 */
  patch(partial: Partial<AppConfig>): void;
  /** 重置为默认配置 */
  reset(): void;
  /** 加载配置（从持久化存储） */
  load(): Promise<void>;
  /** 保存配置（到持久化存储） */
  save(): Promise<void>;
  /** 监听配置变更 */
  onChange(callback: (event: ConfigChangedEvent) => void): () => void;
}
