import type {
  ModuleDefinition,
  ModuleRegistryEntry,
  ModuleLifecycleStatus,
  DependencyCheckResult,
} from './types';

/**
 * 模块注册表
 *
 * 管理所有已注册的模块定义及其运行时状态。
 * 不负责模块的加载和卸载，只维护注册信息。
 *
 * AI Agent 注意：
 * 1. 注册不意味着加载，加载由 ModuleLoader 负责
 * 2. 模块 ID 全局唯一，重复注册会抛出错误
 * 3. 依赖检查仅基于注册表信息，不验证模块实际可用性
 */
export class ModuleRegistry {
  private readonly entries = new Map<string, ModuleRegistryEntry>();

  /**
   * 注册模块定义
   * @param definition 模块定义
   * @throws 如果模块 ID 已注册
   */
  register(definition: ModuleDefinition): void {
    if (this.entries.has(definition.id)) {
      throw new ModuleRegistryError(
        `模块 "${definition.id}" 已注册，请勿重复注册`,
        'DUPLICATE_MODULE',
      );
    }

    this.entries.set(definition.id, {
      definition,
      status: 'registered',
      enabled: false,
    });
  }

  /**
   * 批量注册模块
   */
  registerAll(definitions: ModuleDefinition[]): void {
    for (const def of definitions) {
      this.register(def);
    }
  }

  /**
   * 取消注册模块
   * @param moduleId 模块 ID
   * @throws 如果模块未注册或仍处于 active/unloading 状态
   */
  unregister(moduleId: string): void {
    const entry = this.entries.get(moduleId);
    if (!entry) {
      return;
    }

    if (entry.status === 'active' || entry.status === 'unloading') {
      throw new ModuleRegistryError(
        `模块 "${moduleId}" 处于 ${entry.status} 状态，无法取消注册，请先卸载`,
        'MODULE_STILL_ACTIVE',
      );
    }

    this.entries.delete(moduleId);
  }

  /**
   * 获取模块注册条目
   */
  get(moduleId: string): ModuleRegistryEntry | undefined {
    return this.entries.get(moduleId);
  }

  /**
   * 检查模块是否已注册
   */
  has(moduleId: string): boolean {
    return this.entries.has(moduleId);
  }

  /**
   * 获取所有注册条目
   */
  getAll(): ModuleRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * 获取已注册的模块 ID 列表
   */
  getModuleIds(): string[] {
    return Array.from(this.entries.keys());
  }

  /**
   * 更新模块状态
   * 内部方法，仅由 ModuleLoader 调用
   */
  setStatus(moduleId: string, status: ModuleLifecycleStatus): void {
    const entry = this.entries.get(moduleId);
    if (!entry) {
      throw new ModuleRegistryError(
        `模块 "${moduleId}" 未注册`,
        'MODULE_NOT_FOUND',
      );
    }
    entry.status = status;
  }

  /**
   * 设置模块实例
   * 内部方法，仅由 ModuleLoader 调用
   */
  setInstance(moduleId: string, instance: ModuleRegistryEntry['instance']): void {
    const entry = this.entries.get(moduleId);
    if (!entry) {
      throw new ModuleRegistryError(
        `模块 "${moduleId}" 未注册`,
        'MODULE_NOT_FOUND',
      );
    }
    entry.instance = instance;
  }

  /**
   * 设置模块启用状态
   * 内部方法，仅由 ModuleManager/ModuleLoader 调用
   */
  setEnabled(moduleId: string, enabled: boolean): void {
    const entry = this.entries.get(moduleId);
    if (!entry) {
      throw new ModuleRegistryError(
        `模块 "${moduleId}" 未注册`,
        'MODULE_NOT_FOUND',
      );
    }
    entry.enabled = enabled;
  }

  /**
   * 设置模块错误信息
   */
  setError(moduleId: string, error: string | undefined): void {
    const entry = this.entries.get(moduleId);
    if (!entry) {
      return;
    }
    entry.error = error;
  }

  /**
   * 设置加载时间
   */
  setLoadedAt(moduleId: string, timestamp: number | undefined): void {
    const entry = this.entries.get(moduleId);
    if (!entry) {
      return;
    }
    entry.loadedAt = timestamp;
  }

  /**
   * 检查模块是否已启用（用户层面的开关状态）
   */
  isEnabled(moduleId: string): boolean {
    return this.entries.get(moduleId)?.enabled ?? false;
  }

  /**
   * 检查模块是否处于 active 状态
   */
  isActive(moduleId: string): boolean {
    return this.entries.get(moduleId)?.status === 'active';
  }

  /**
   * 按状态筛选模块
   */
  filterByStatus(status: ModuleLifecycleStatus): ModuleRegistryEntry[] {
    return this.getAll().filter((e) => e.status === status);
  }

  /**
   * 依赖检查
   *
   * 检查启用指定模块所需的依赖是否满足，
   * 同时返回反向依赖（哪些模块依赖当前模块）。
   *
   * AI Agent 注意：此方法只检查注册信息，
   * 不验证依赖模块实际上是否可加载。
   */
  checkDependencies(moduleId: string): DependencyCheckResult {
    const entry = this.entries.get(moduleId);
    if (!entry) {
      return {
        canEnable: false,
        missingDependencies: [moduleId],
        reverseDependencies: [],
      };
    }

    const missingDependencies = entry.definition.dependencies.filter(
      (depId) => !this.has(depId),
    );

    const reverseDependencies = this.getAll()
      .filter((e) => e.definition.dependencies.includes(moduleId))
      .map((e) => e.definition.id);

    return {
      canEnable: missingDependencies.length === 0,
      missingDependencies,
      reverseDependencies,
    };
  }

  /**
   * 清空注册表（主要用于测试）
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * 获取已注册模块数量
   */
  get size(): number {
    return this.entries.size;
  }
}

/**
 * 模块注册表错误
 */
export class ModuleRegistryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ModuleRegistryError';
  }
}
