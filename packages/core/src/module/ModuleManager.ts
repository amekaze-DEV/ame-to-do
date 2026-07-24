import { ModuleRegistry } from './ModuleRegistry';
import { ModuleLoader } from './ModuleLoader';
import type {
  ModuleDefinition,
  ModuleRegistryEntry,
  DependencyCheckResult,
  ModuleContext,
} from './types';
import type { Database } from '@ame-todo/data/sqlite/Database';
import type { ILogger } from '../log';
import type { ModuleState } from '../config/types';

/**
 * 启用模块结果
 */
export interface EnableModuleResult {
  success: boolean;
  enabled: string[];
  warnings: string[];
  error?: string;
}

/**
 * 禁用模块结果
 */
export interface DisableModuleResult {
  success: boolean;
  disabled: string[];
  warnings: string[];
  error?: string;
}

/**
 * 模块管理器
 *
 * 在 ModuleRegistry 和 ModuleLoader 之上，提供模块开关管理能力：
 * - 启用/禁用模块
 * - 依赖检测与反向依赖检测
 * - 模块状态持久化（module_states 表）
 * - 数据保留逻辑（禁用模块时不删除数据）
 *
 * AI Agent 注意：
 * 1. 启用模块时，若依赖模块未启用，会尝试自动启用依赖
 * 2. 禁用模块时，会同时禁用所有依赖当前模块的模块（反向依赖）
 * 3. 模块状态持久化到数据库，重启后恢复
 * 4. 禁用模块只卸载不删除数据，重新启用后数据仍然存在
 */
export class ModuleManager {
  private readonly registry: ModuleRegistry;
  private readonly loader: ModuleLoader;
  private readonly database: Database | null;
  private readonly logger: ILogger;
  private readonly defaultEnabledModules: string[];

  constructor(
    context: Omit<ModuleContext, never>,
    options: {
      defaultEnabled?: string[];
    } = {},
  ) {
    this.registry = new ModuleRegistry();
    this.loader = new ModuleLoader(this.registry, context);
    this.database = context.database ?? null;
    this.logger = context.logger.child('module-manager');
    this.defaultEnabledModules = options.defaultEnabled ?? [];
  }

  /**
   * 注册模块定义
   */
  register(definition: ModuleDefinition): void {
    this.registry.register(definition);
  }

  /**
   * 批量注册模块定义
   */
  registerAll(definitions: ModuleDefinition[]): void {
    this.registry.registerAll(definitions);
  }

  /**
   * 从数据库加载模块状态并初始化
   *
   * 执行流程：
   * 1. 从 module_states 表读取所有模块状态
   * 2. 首次运行时，为默认启用模块写入初始状态
   * 3. 加载所有已启用的模块
   */
  async initialize(): Promise<{ loaded: string[]; failed: string[] }> {
    await this.ensureModuleStatesTable();

    const storedStates = await this.loadStatesFromDB();

    for (const entry of this.registry.getAll()) {
      const stored = storedStates.find((s) => s.moduleId === entry.definition.id);
      if (stored) {
        this.registry.setEnabled(entry.definition.id, stored.enabled);
      } else {
        const isDefaultEnabled = this.defaultEnabledModules.includes(entry.definition.id);
        this.registry.setEnabled(entry.definition.id, isDefaultEnabled);
        await this.saveStateToDB(entry.definition.id, isDefaultEnabled);
      }
    }

    const loaded: string[] = [];
    const failed: string[] = [];

    for (const entry of this.registry.getAll()) {
      if (this.registry.isEnabled(entry.definition.id)) {
        try {
          await this.loader.load(entry.definition.id);
          loaded.push(entry.definition.id);
        } catch (error) {
          failed.push(entry.definition.id);
          this.logger.error(
            `初始化时加载模块 "${entry.definition.id}" 失败`,
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      }
    }

    return { loaded, failed };
  }

  /**
   * 启用模块
   *
   * 自动启用所有缺失的依赖模块。
   * 启用成功后将状态持久化到数据库。
   */
  async enableModule(moduleId: string): Promise<EnableModuleResult> {
    const entry = this.registry.get(moduleId);
    if (!entry) {
      return {
        success: false,
        enabled: [],
        warnings: [],
        error: `模块 "${moduleId}" 未注册`,
      };
    }

    if (this.registry.isActive(moduleId)) {
      return {
        success: true,
        enabled: [moduleId],
        warnings: [`模块 "${moduleId}" 已处于启用状态`],
      };
    }

    const depCheck = this.registry.checkDependencies(moduleId);
    if (!depCheck.canEnable) {
      return {
        success: false,
        enabled: [],
        warnings: [],
        error: `模块 "${moduleId}" 依赖不满足，缺失: ${depCheck.missingDependencies.join(', ')}`,
      };
    }

    const enabled: string[] = [];
    const warnings: string[] = [];

    try {
      for (const depId of entry.definition.dependencies) {
        if (!this.registry.isActive(depId)) {
          this.logger.info(`自动启用依赖模块: ${depId}`);
          const depResult = await this.enableModule(depId);
          if (!depResult.success) {
            return {
              success: false,
              enabled,
              warnings: [...warnings, ...depResult.warnings],
              error: `依赖模块 "${depId}" 启用失败: ${depResult.error}`,
            };
          }
          enabled.push(...depResult.enabled);
        }
      }

      await this.loader.load(moduleId);
      enabled.push(moduleId);

      await this.saveStateToDB(moduleId, true);

      return {
        success: true,
        enabled: Array.from(new Set(enabled)),
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        enabled,
        warnings,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 禁用模块
   *
   * 自动禁用所有依赖当前模块的模块（反向依赖）。
   * 禁用只卸载模块，不删除任何数据。
   * 禁用成功后将状态持久化到数据库。
   */
  async disableModule(moduleId: string): Promise<DisableModuleResult> {
    const entry = this.registry.get(moduleId);
    if (!entry) {
      return {
        success: false,
        disabled: [],
        warnings: [],
        error: `模块 "${moduleId}" 未注册`,
      };
    }

    if (!this.registry.isActive(moduleId)) {
      return {
        success: true,
        disabled: [moduleId],
        warnings: [`模块 "${moduleId}" 已处于禁用状态`],
      };
    }

    const depCheck = this.registry.checkDependencies(moduleId);
    const disabled: string[] = [];
    const warnings: string[] = [];

    try {
      for (const revDepId of depCheck.reverseDependencies) {
        if (this.registry.isActive(revDepId)) {
          warnings.push(`模块 "${revDepId}" 依赖 "${moduleId}"，将被一并禁用`);
          const revResult = await this.disableModule(revDepId);
          if (!revResult.success) {
            return {
              success: false,
              disabled,
              warnings: [...warnings, ...revResult.warnings],
              error: `反向依赖模块 "${revDepId}" 禁用失败: ${revResult.error}`,
            };
          }
          disabled.push(...revResult.disabled);
        }
      }

      await this.loader.unload(moduleId);
      disabled.push(moduleId);

      await this.saveStateToDB(moduleId, false);

      return {
        success: true,
        disabled: Array.from(new Set(disabled)),
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        disabled,
        warnings,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 切换模块启用状态
   */
  async toggleModule(moduleId: string): Promise<EnableModuleResult | DisableModuleResult> {
    if (this.registry.isActive(moduleId)) {
      return this.disableModule(moduleId);
    }
    return this.enableModule(moduleId);
  }

  /**
   * 检查模块依赖
   */
  checkDependencies(moduleId: string): DependencyCheckResult {
    return this.registry.checkDependencies(moduleId);
  }

  /**
   * 获取所有模块列表（含状态）
   */
  getAllModules(): ModuleRegistryEntry[] {
    return this.registry.getAll();
  }

  /**
   * 获取单个模块信息
   */
  getModule(moduleId: string): ModuleRegistryEntry | undefined {
    return this.registry.get(moduleId);
  }

  /**
   * 检查模块是否已启用
   */
  isEnabled(moduleId: string): boolean {
    return this.registry.isActive(moduleId);
  }

  /**
   * 关闭并清理所有模块
   */
  async shutdown(): Promise<void> {
    await this.loader.unloadAll();
  }

  private async ensureModuleStatesTable(): Promise<void> {
    if (!this.database) return;

    try {
      await this.database.execute(`
        CREATE TABLE IF NOT EXISTS module_states (
          module_id TEXT PRIMARY KEY,
          enabled INTEGER NOT NULL DEFAULT 1,
          updated_at INTEGER NOT NULL
        )
      `);
    } catch (error) {
      this.logger.warn('创建 module_states 表失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async loadStatesFromDB(): Promise<ModuleState[]> {
    if (!this.database) return [];

    try {
      const rows = await this.database.select<{
        module_id: string;
        enabled: number;
        updated_at: number;
      }>('SELECT module_id, enabled, updated_at FROM module_states');

      return rows.map((row) => ({
        moduleId: row.module_id,
        enabled: row.enabled === 1,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      this.logger.warn('从数据库加载模块状态失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private async saveStateToDB(moduleId: string, enabled: boolean): Promise<void> {
    if (!this.database) return;

    try {
      await this.database.execute(
        `INSERT INTO module_states (module_id, enabled, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(module_id) DO UPDATE SET
           enabled = excluded.enabled,
           updated_at = excluded.updated_at`,
        [moduleId, enabled ? 1 : 0, Date.now()],
      );
    } catch (error) {
      this.logger.warn('保存模块状态到数据库失败', {
        moduleId,
        enabled,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
