import { EventBus } from '../event';
import { AppEvents, type ConfigEventData } from '../event/types';
import { defaultConfig } from './defaults';
import { validateConfig } from './validation';
import type { AppConfig, ConfigChangedEvent, IConfigStore, ModuleState } from './types';

/** 将 AppConfig 转为可索引的记录类型，用于路径操作 */
type ConfigRecord = Record<string, unknown>;

/**
 * 判断当前环境是否为 Tauri 运行环境
 */
function isTauriEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return !!(window as unknown as Record<string, unknown>).__TAURI__;
}

/**
 * 深度合并对象
 * 用 source 覆盖 target 的同名字段，递归合并对象，数组和基本类型直接覆盖
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target } as Record<string, unknown>;

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      );
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue;
    }
  }

  return result as T;
}

/**
 * 根据路径获取嵌套对象的值
 * @param obj 目标对象
 * @param path 点分隔路径，例如 'webdav.enabled'
 */
function getValueByPath<T>(obj: Record<string, unknown>, path: string): T | undefined {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current as T | undefined;
}

/**
 * 根据路径设置嵌套对象的值，返回变更路径列表
 * @param obj 目标对象
 * @param path 点分隔路径
 * @param value 要设置的值
 * @returns 实际发生变更的叶子路径列表
 */
function setValueByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): string[] {
  const parts = path.split('.');
  const changedPaths: string[] = [];

  if (parts.length === 1) {
    if (obj[path] !== value) {
      obj[path] = value;
      changedPaths.push(path);
    }
    return changedPaths;
  }

  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next = current[part];
    if (next === undefined || next === null || typeof next !== 'object' || Array.isArray(next)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  if (current[lastPart] !== value) {
    current[lastPart] = value;
    changedPaths.push(path);
  }

  return changedPaths;
}

/**
 * 应用级配置存储
 *
 * 设计原则：
 * 1. 单一配置源：所有配置读写通过 ConfigStore 管理
 * 2. 持久化：配置保存到 ${dataDir}/config.json
 * 3. 事件通知：配置变更时触发 config:changed 事件，通知订阅者
 * 4. 路径访问：支持点分隔路径获取和设置嵌套配置
 * 5. 默认值：未持久化的配置使用默认值
 * 6. 验证：对关键配置字段进行基础校验
 */
export class ConfigStore implements IConfigStore {
  private config: AppConfig;
  private eventBus?: EventBus;

  constructor(
    private configPath: string = './config.json',
    options?: { eventBus?: EventBus },
  ) {
    this.config = { ...defaultConfig };
    this.eventBus = options?.eventBus;
  }

  getConfig(): AppConfig {
    return this.config;
  }

  get<T>(path: string): T | undefined {
    return getValueByPath<T>(this.configAsRecord(), path);
  }

  set<T>(path: string, value: T): void {
    const previousValue = this.get<T>(path);
    const changedPaths = setValueByPath(this.configAsRecord(), path, value);

    if (changedPaths.length > 0) {
      this.emitChange(path, value, previousValue);
    }
  }

  patch(partial: Partial<AppConfig>): void {
    const previousConfig = { ...this.config };
    this.config = deepMerge(
      this.config as unknown as ConfigRecord,
      partial as ConfigRecord,
    ) as unknown as AppConfig;
    const changedPaths = this.findChangedPaths(previousConfig, this.config);

    for (const path of changedPaths) {
      const value = getValueByPath<unknown>(this.configAsRecord(), path);
      const previousValue = getValueByPath<unknown>(previousConfig as unknown as ConfigRecord, path);
      this.emitChange(path, value, previousValue);
    }
  }

  reset(): void {
    const previousConfig = this.config;
    this.config = { ...defaultConfig };
    const changedPaths = this.findChangedPaths(previousConfig, this.config);

    for (const path of changedPaths) {
      const value = getValueByPath<unknown>(this.configAsRecord(), path);
      const previousValue = getValueByPath<unknown>(previousConfig as unknown as ConfigRecord, path);
      this.emitChange(path, value, previousValue);
    }
  }

  async load(): Promise<void> {
    if (!isTauriEnvironment()) {
      // 非 Tauri 环境下使用内存配置（测试场景）
      return;
    }

    try {
      const { BaseDirectory, readTextFile, exists } = await import('@tauri-apps/plugin-fs');
      const fileExists = await exists(this.configPath, { baseDir: BaseDirectory.AppLocalData });

      if (!fileExists) {
        await this.save();
        return;
      }

      const content = await readTextFile(this.configPath, { baseDir: BaseDirectory.AppLocalData });
      const parsed = JSON.parse(content) as Partial<AppConfig>;
      const validated = validateConfig(parsed);
      this.config = deepMerge(
        defaultConfig as unknown as ConfigRecord,
        validated as ConfigRecord,
      ) as unknown as AppConfig;
    } catch (error) {
      console.error('[ConfigStore] 加载配置失败，使用默认配置:', error);
      this.config = { ...defaultConfig };
    }
  }

  async save(): Promise<void> {
    if (!isTauriEnvironment()) {
      // 非 Tauri 环境下不保存到文件（测试场景）
      return;
    }

    try {
      const { BaseDirectory, writeTextFile, create, exists } = await import('@tauri-apps/plugin-fs');
      const fileExists = await exists(this.configPath, { baseDir: BaseDirectory.AppLocalData });
      if (!fileExists) {
        await create(this.configPath, { baseDir: BaseDirectory.AppLocalData });
      }
      await writeTextFile(this.configPath, JSON.stringify(this.config, null, 2), {
        baseDir: BaseDirectory.AppLocalData,
      });
    } catch (error) {
      console.error('[ConfigStore] 保存配置失败:', error);
      throw error;
    }
  }

  onChange(callback: (event: ConfigChangedEvent) => void): () => void {
    if (!this.eventBus) {
      console.warn('[ConfigStore] 未配置事件总线，onChange 不会收到通知');
      return () => { };
    }

    return this.eventBus.on(AppEvents.CONFIG_CHANGED, (data) => {
      callback(data as ConfigEventData);
    });
  }

  /**
   * 设置模块启用状态
   */
  setModuleEnabled(moduleId: string, enabled: boolean): void {
    const modules = { ...this.config.modules };

    modules[moduleId] = {
      moduleId,
      enabled,
      updatedAt: Date.now(),
    };

    this.set('modules', modules);

    // 同步触发模块事件
    if (this.eventBus) {
      this.eventBus.emit(
        enabled ? AppEvents.MODULE_ENABLED : AppEvents.MODULE_DISABLED,
        { moduleId },
      );
    }
  }

  /**
   * 获取模块启用状态
   */
  isModuleEnabled(moduleId: string): boolean {
    return this.config.modules[moduleId]?.enabled ?? true;
  }

  /**
   * 获取模块状态，如果不存在则返回默认状态
   */
  getModuleState(moduleId: string): ModuleState {
    return (
      this.config.modules[moduleId] ?? {
        moduleId,
        enabled: true,
        updatedAt: Date.now(),
      }
    );
  }

  private emitChange(key: string, value: unknown, previousValue?: unknown): void {
    if (!this.eventBus) {
      return;
    }
    this.eventBus.emit(AppEvents.CONFIG_CHANGED, {
      key,
      value,
      previousValue,
    });
  }

  private configAsRecord(): ConfigRecord {
    return this.config as unknown as ConfigRecord;
  }

  private findChangedPaths(previous: AppConfig, current: AppConfig): string[] {
    const paths = new Set<string>();
    this.collectPaths(previous as unknown as ConfigRecord, '', paths);
    this.collectPaths(current as unknown as ConfigRecord, '', paths);

    return Array.from(paths).filter((path) => {
      const prev = getValueByPath<unknown>(previous as unknown as ConfigRecord, path);
      const curr = getValueByPath<unknown>(current as unknown as ConfigRecord, path);
      return JSON.stringify(prev) !== JSON.stringify(curr);
    });
  }

  private collectPaths(obj: ConfigRecord, prefix: string, paths: Set<string>): void {
    for (const key of Object.keys(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        this.collectPaths(value as ConfigRecord, path, paths);
      } else {
        paths.add(path);
      }
    }
  }
}

export const configStore = new ConfigStore();
