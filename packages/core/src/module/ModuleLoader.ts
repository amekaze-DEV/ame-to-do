import { EventBus, AppEvents } from '../event';
import type { ILogger } from '../log';
import { ModuleRegistry } from './ModuleRegistry';
import type {
  ModuleDefinition,
  ModuleInstance,
  ModuleContext,
  ModuleLifecycleStatus,
} from './types';

/**
 * 模块加载器
 *
 * 负责模块的加载、初始化、卸载等生命周期管理。
 * 模块注册信息由 ModuleRegistry 维护，加载器不直接管理注册表。
 *
 * 生命周期流转：
 * registered → (enable) → loading → (init 成功) → active → (disable) → unloading → (destroy) → inactive
 *
 * AI Agent 注意：
 * 1. 加载模块前必须通过依赖检查，所有直接依赖必须已处于 active 状态
 * 2. 卸载模块时按依赖逆序卸载，即先卸载依赖当前模块的模块
 * 3. 单个模块加载/卸载失败不应影响其他模块，错误记录在 registry entry 中
 * 4. 所有模块状态变更都通过事件总线发出通知
 */
export class ModuleLoader {
  private readonly moduleLogger: ILogger;

  constructor(
    private readonly registry: ModuleRegistry,
    private readonly context: Omit<ModuleContext, never>,
  ) {
    this.moduleLogger = context.logger.child('module-loader');
  }

  /**
   * 加载单个模块
   *
   * 执行流程：
   * 1. 检查模块是否已注册
   * 2. 检查依赖是否满足
   * 3. 调用 entry() 获取模块实例
   * 4. 调用 init() 初始化
   * 5. 更新状态为 active
   */
  async load(moduleId: string): Promise<void> {
    const entry = this.registry.get(moduleId);
    if (!entry) {
      throw new ModuleLoaderError(
        `模块 "${moduleId}" 未注册`,
        'MODULE_NOT_REGISTERED',
      );
    }

    if (entry.status === 'active' || entry.status === 'loading') {
      this.moduleLogger.info(`模块 "${moduleId}" 已处于 ${entry.status} 状态，跳过加载`);
      return;
    }

    const depCheck = this.registry.checkDependencies(moduleId);
    if (!depCheck.canEnable) {
      throw new ModuleLoaderError(
        `模块 "${moduleId}" 依赖不满足，缺失: ${depCheck.missingDependencies.join(', ')}`,
        'DEPENDENCY_MISSING',
      );
    }

    for (const depId of entry.definition.dependencies) {
      if (!this.registry.isActive(depId)) {
        this.moduleLogger.info(`自动加载依赖模块 "${depId}"`);
        await this.load(depId);
      }
    }

    try {
      this.registry.setStatus(moduleId, 'loading');
      this.registry.setError(moduleId, undefined);

      this.emitModuleEvent(AppEvents.MODULE_ENABLED, moduleId);

      const instance = await entry.definition.entry(this.context as ModuleContext);
      this.registry.setInstance(moduleId, instance);

      await instance.init();

      this.registry.setStatus(moduleId, 'active');
      this.registry.setEnabled(moduleId, true);
      this.registry.setLoadedAt(moduleId, Date.now());

      this.moduleLogger.info(`模块 "${moduleId}" 加载成功`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.registry.setStatus(moduleId, 'inactive');
      this.registry.setError(moduleId, errorMessage);
      this.registry.setEnabled(moduleId, false);

      this.moduleLogger.error(`模块 "${moduleId}" 加载失败`, error instanceof Error ? error : new Error(errorMessage));

      throw new ModuleLoaderError(
        `模块 "${moduleId}" 加载失败: ${errorMessage}`,
        'LOAD_FAILED',
      );
    }
  }

  /**
   * 加载所有已注册且已启用的模块
   */
  async loadAll(): Promise<{ loaded: string[]; failed: Array<{ id: string; error: string }> }> {
    const loaded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const entry of this.registry.getAll()) {
      if (entry.status === 'registered' || entry.status === 'inactive') {
        try {
          await this.load(entry.definition.id);
          loaded.push(entry.definition.id);
        } catch (error) {
          failed.push({
            id: entry.definition.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return { loaded, failed };
  }

  /**
   * 卸载单个模块
   *
   * 执行流程：
   * 1. 检查模块是否处于 active 状态
   * 2. 先卸载所有反向依赖（依赖当前模块的模块）
   * 3. 调用 dispose() 释放资源
   * 4. 更新状态为 inactive
   */
  async unload(moduleId: string): Promise<void> {
    const entry = this.registry.get(moduleId);
    if (!entry) {
      return;
    }

    if (entry.status !== 'active') {
      this.moduleLogger.info(`模块 "${moduleId}" 未处于 active 状态，跳过卸载`);
      return;
    }

    const reverseDeps = this.registry.checkDependencies(moduleId).reverseDependencies;
    for (const revDepId of reverseDeps) {
      if (this.registry.isActive(revDepId)) {
        this.moduleLogger.info(`先卸载反向依赖模块 "${revDepId}"`);
        await this.unload(revDepId);
      }
    }

    try {
      this.registry.setStatus(moduleId, 'unloading');
      this.emitModuleEvent(AppEvents.MODULE_DISABLED, moduleId);

      if (entry.instance && typeof entry.instance.dispose === 'function') {
        await entry.instance.dispose();
      }

      this.registry.setStatus(moduleId, 'inactive');
      this.registry.setEnabled(moduleId, false);
      this.registry.setInstance(moduleId, undefined);
      this.registry.setLoadedAt(moduleId, undefined);

      this.moduleLogger.info(`模块 "${moduleId}" 卸载成功`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.registry.setError(moduleId, errorMessage);
      this.registry.setStatus(moduleId, 'active');

      this.moduleLogger.error(`模块 "${moduleId}" 卸载失败`, error instanceof Error ? error : new Error(errorMessage));

      throw new ModuleLoaderError(
        `模块 "${moduleId}" 卸载失败: ${errorMessage}`,
        'UNLOAD_FAILED',
      );
    }
  }

  /**
   * 卸载所有已加载的模块
   * 按依赖逆序卸载（先卸载无依赖的模块）
   */
  async unloadAll(): Promise<void> {
    const activeEntries = this.registry.filterByStatus('active');

    const sorted = this.sortByDependencyOrder(activeEntries.map((e) => e.definition));

    for (let i = sorted.length - 1; i >= 0; i--) {
      try {
        await this.unload(sorted[i].id);
      } catch {
        // 继续卸载其他模块
      }
    }
  }

  /**
   * 重新加载模块
   */
  async reload(moduleId: string): Promise<void> {
    await this.unload(moduleId);
    await this.load(moduleId);
  }

  /**
   * 获取模块状态
   */
  getStatus(moduleId: string): ModuleLifecycleStatus | undefined {
    return this.registry.get(moduleId)?.status;
  }

  /**
   * 检查模块是否已加载并处于 active 状态
   */
  isLoaded(moduleId: string): boolean {
    return this.registry.isActive(moduleId);
  }

  /**
   * 获取已加载模块的实例
   */
  getInstance(moduleId: string): ModuleInstance | undefined {
    return this.registry.get(moduleId)?.instance;
  }

  /**
   * 按依赖顺序排序模块（依赖在前，被依赖在后）
   */
  private sortByDependencyOrder(definitions: ModuleDefinition[]): ModuleDefinition[] {
    const visited = new Set<string>();
    const result: ModuleDefinition[] = [];
    const defMap = new Map(definitions.map((d) => [d.id, d]));

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const def = defMap.get(id);
      if (def) {
        for (const dep of def.dependencies) {
          visit(dep);
        }
        result.push(def);
      }
    };

    for (const def of definitions) {
      visit(def.id);
    }

    return result;
  }

  private emitModuleEvent(event: string, moduleId: string): void {
    const eventBus = this.context.eventBus as EventBus;
    if (eventBus && typeof eventBus.emit === 'function') {
      (eventBus.emit as (e: string, data: { moduleId: string }) => void)(
        event,
        { moduleId },
      );
    }
  }
}

/**
 * 模块加载器错误
 */
export class ModuleLoaderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ModuleLoaderError';
  }
}
