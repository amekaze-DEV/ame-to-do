/**
 * 应用事件类型定义
 * AI Agent 注意：模块间通信必须通过事件总线，禁止直接调用其他模块的方法
 * 新增事件时请在此处添加类型定义和对应的事件数据接口
 */

export const AppEvents = {
  APP_STARTED: 'app:started',
  APP_MINIMIZED: 'app:minimized',
  MODULE_ENABLED: 'module:enabled',
  MODULE_DISABLED: 'module:disabled',
  ITEM_CREATED: 'item:created',
  ITEM_UPDATED: 'item:updated',
  ITEM_DELETED: 'item:deleted',
  ITEM_COMPLETED: 'item:completed',
  SYNC_STARTED: 'sync:started',
  SYNC_COMPLETED: 'sync:completed',
  SYNC_FAILED: 'sync:failed',
  SYNC_CONFLICT: 'sync:conflict',
  REMINDER_TRIGGERED: 'reminder:triggered',
  WIDGET_REFRESH: 'widget:refresh',
  CONFIG_CHANGED: 'config:changed',
} as const;

export type AppEvent = typeof AppEvents[keyof typeof AppEvents];

export interface ModuleEventData {
  moduleId: string;
}

export interface ItemEventData {
  itemId: string;
}

export interface SyncEventData {
  provider?: string;
  error?: string;
}

export interface ReminderEventData {
  itemId: string;
  reminderTime: number;
}

export interface ConfigEventData {
  key: string;
  value: unknown;
  previousValue?: unknown;
}

export interface AppEventDataMap {
  [AppEvents.APP_STARTED]: undefined;
  [AppEvents.APP_MINIMIZED]: undefined;
  [AppEvents.MODULE_ENABLED]: ModuleEventData;
  [AppEvents.MODULE_DISABLED]: ModuleEventData;
  [AppEvents.ITEM_CREATED]: ItemEventData;
  [AppEvents.ITEM_UPDATED]: ItemEventData;
  [AppEvents.ITEM_DELETED]: ItemEventData;
  [AppEvents.ITEM_COMPLETED]: ItemEventData;
  [AppEvents.SYNC_STARTED]: SyncEventData;
  [AppEvents.SYNC_COMPLETED]: SyncEventData;
  [AppEvents.SYNC_FAILED]: SyncEventData;
  [AppEvents.SYNC_CONFLICT]: SyncEventData;
  [AppEvents.REMINDER_TRIGGERED]: ReminderEventData;
  [AppEvents.WIDGET_REFRESH]: undefined;
  [AppEvents.CONFIG_CHANGED]: ConfigEventData;
}

export type EventHandler<T = unknown> = (data: T) => void;
