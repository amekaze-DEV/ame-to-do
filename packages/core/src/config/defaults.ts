import type { AppConfig, ModuleState } from './types';

/**
 * 默认配置
 * AI Agent 注意：新增配置字段时必须在此处提供默认值
 */
export const defaultConfig: AppConfig = {
  version: 1,
  theme: 'system',
  language: 'zh-CN',
  windowStartupBehavior: 'normal',
  notification: {
    enabled: true,
    sound: true,
    showPreview: true,
  },
  webdav: {
    enabled: false,
    serverUrl: '',
    authType: 'basic',
    username: '',
    remoteDir: '/AME-to-do',
    syncOnStartup: false,
    syncOnChange: false,
    autoSyncIntervalMinutes: 0,
    conflictStrategy: 'timestamp_wins',
  },
  autoLaunch: {
    enabled: false,
    startMinimized: true,
    syncOnLaunch: false,
  },
  widget: {
    enabled: false,
    showOnStartup: false,
    opacity: 0.9,
    hideOnFullscreen: true,
    allowCovered: false,
  },
  modules: {},
  log: {
    level: 'info',
    retentionDays: 30,
  },
  extensions: {},
};

/**
 * 创建模块默认状态
 */
export function createDefaultModuleState(moduleId: string): ModuleState {
  return {
    moduleId,
    enabled: true,
    updatedAt: Date.now(),
  };
}
