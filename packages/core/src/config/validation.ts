import { defaultConfig } from './defaults';
import type {
  AppConfig,
  AppLanguage,
  ConflictStrategy,
  ConfigLogLevel,
  ThemeMode,
  WebDAVAuthType,
  WindowStartupBehavior,
} from './types';

/**
 * 配置验证函数集合
 * AI Agent 注意：新增配置字段时，如果字段有固定取值范围，应在此处添加验证
 */

const VALID_THEME_MODES: ThemeMode[] = ['light', 'dark', 'system'];
const VALID_LANGUAGES: AppLanguage[] = ['zh-CN', 'zh-TW', 'en'];
const VALID_STARTUP_BEHAVIORS: WindowStartupBehavior[] = ['normal', 'minimized', 'tray'];
const VALID_WEBDAV_AUTH_TYPES: WebDAVAuthType[] = ['basic', 'token'];
const VALID_CONFLICT_STRATEGIES: ConflictStrategy[] = [
  'local_wins',
  'remote_wins',
  'keep_both',
  'timestamp_wins',
];
const VALID_LOG_LEVELS: ConfigLogLevel[] = ['debug', 'info', 'warn', 'error'];

/**
 * 验证值是否在允许的枚举值中
 */
function isOneOf<T extends string>(value: unknown, validValues: T[]): value is T {
  return typeof value === 'string' && validValues.includes(value as T);
}

/**
 * 验证透明度值是否在 [0, 1] 范围内
 */
function isValidOpacity(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 1;
}

/**
 * 验证正整数或零
 */
function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * 验证配置并返回修复后的配置
 * 不会抛出异常，对于无效值使用默认值替换
 */
export function validateConfig(config: Partial<AppConfig>): Partial<AppConfig> {
  const validated: Partial<AppConfig> = {};

  if (config.version !== undefined) {
    validated.version = isNonNegativeInteger(config.version) ? config.version : defaultConfig.version;
  }

  if (config.theme !== undefined) {
    validated.theme = isOneOf(config.theme, VALID_THEME_MODES) ? config.theme : defaultConfig.theme;
  }

  if (config.language !== undefined) {
    validated.language = isOneOf(config.language, VALID_LANGUAGES)
      ? config.language
      : defaultConfig.language;
  }

  if (config.windowStartupBehavior !== undefined) {
    validated.windowStartupBehavior = isOneOf(config.windowStartupBehavior, VALID_STARTUP_BEHAVIORS)
      ? config.windowStartupBehavior
      : defaultConfig.windowStartupBehavior;
  }

  if (config.notification !== undefined) {
    validated.notification = {
      ...defaultConfig.notification,
      ...config.notification,
    };
    const { doNotDisturbStart, doNotDisturbEnd } = validated.notification;
    if (doNotDisturbStart !== undefined && !isNonNegativeInteger(doNotDisturbStart)) {
      delete validated.notification.doNotDisturbStart;
    }
    if (doNotDisturbEnd !== undefined && !isNonNegativeInteger(doNotDisturbEnd)) {
      delete validated.notification.doNotDisturbEnd;
    }
  }

  if (config.webdav !== undefined) {
    validated.webdav = {
      ...defaultConfig.webdav,
      ...config.webdav,
    };
    if (!isOneOf(validated.webdav.authType, VALID_WEBDAV_AUTH_TYPES)) {
      validated.webdav.authType = defaultConfig.webdav.authType;
    }
    if (!isOneOf(validated.webdav.conflictStrategy, VALID_CONFLICT_STRATEGIES)) {
      validated.webdav.conflictStrategy = defaultConfig.webdav.conflictStrategy;
    }
    if (!isNonNegativeInteger(validated.webdav.autoSyncIntervalMinutes)) {
      validated.webdav.autoSyncIntervalMinutes = defaultConfig.webdav.autoSyncIntervalMinutes;
    }
    if (typeof validated.webdav.remoteDir !== 'string' || validated.webdav.remoteDir.length === 0) {
      validated.webdav.remoteDir = defaultConfig.webdav.remoteDir;
    }
  }

  if (config.autoLaunch !== undefined) {
    validated.autoLaunch = {
      ...defaultConfig.autoLaunch,
      ...config.autoLaunch,
    };
  }

  if (config.widget !== undefined) {
    validated.widget = {
      ...defaultConfig.widget,
      ...config.widget,
    };
    if (!isValidOpacity(validated.widget.opacity)) {
      validated.widget.opacity = defaultConfig.widget.opacity;
    }
  }

  if (config.modules !== undefined) {
    validated.modules = config.modules;
  }

  if (config.log !== undefined) {
    validated.log = {
      ...defaultConfig.log,
      ...config.log,
    };
    if (!isOneOf(validated.log.level, VALID_LOG_LEVELS)) {
      validated.log.level = defaultConfig.log.level;
    }
    if (!isNonNegativeInteger(validated.log.retentionDays)) {
      validated.log.retentionDays = defaultConfig.log.retentionDays;
    }
  }

  if (config.extensions !== undefined) {
    validated.extensions = config.extensions;
  }

  return validated;
}
