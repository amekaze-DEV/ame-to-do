import type { EventBus } from '../event';
import type { ConfigStore } from '../config';
import type { ILogger } from '../log';
import type { Database } from '@ame-todo/data/sqlite/Database';
import type { PlatformAdapter } from '@ame-todo/platform-contracts';
import type { ComponentType } from 'react';

/**
 * 模块生命周期状态
 *
 * registered → inactive → loading → active → unloading → inactive
 *
 * AI Agent 注意：修改状态流转时必须同步更新 design.md 中的状态图
 */
export type ModuleLifecycleStatus =
  | 'registered'
  | 'inactive'
  | 'loading'
  | 'active'
  | 'unloading';

/**
 * 模块权限声明
 *
 * 模块在 definition.permissions 中声明所需权限，
 * 实际权限校验在 ModuleLoader 中执行。
 */
export type ModulePermission =
  | 'filesystem:read'
  | 'filesystem:write'
  | 'notification'
  | 'network'
  | 'autolaunch'
  | 'widget';

/**
 * 模块运行时上下文
 *
 * 这是模块访问核心基础设施的唯一入口。
 * 模块禁止直接获取全局实例，必须通过 context 使用。
 *
 * AI Agent 注意：新增基础设施能力时，先在此接口中添加字段，
 * 然后在 ModuleLoader 中注入，最后更新 ModuleContext 的使用方。
 */
export interface ModuleContext {
  eventBus: EventBus;
  configStore: ConfigStore;
  database: Database;
  platform: PlatformAdapter;
  logger: ILogger;
}

/**
 * 模块定义接口
 *
 * 每个功能模块必须导出一个实现此接口的对象。
 * 模块定义是静态的，注册后不应修改。
 *
 * AI Agent 注意：
 * 1. id 必须全局唯一，建议格式：kebab-case（如 'calendar', 'item-manager'）
 * 2. dependencies 只声明直接依赖，间接依赖由加载器自动传递
 * 3. entry 函数应尽量轻量，重逻辑放到 ModuleInstance.init() 中
 */
export interface ModuleDefinition {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly dependencies: string[];
  readonly permissions: ModulePermission[];
  readonly dataSchemaVersion: number;
  readonly entry: (context: ModuleContext) => ModuleInstance | Promise<ModuleInstance>;
}

/**
 * 模块实例接口
 *
 * 由 ModuleDefinition.entry() 返回，表示已加载的运行时模块。
 * 生命周期：init() → (运行中) → dispose()
 *
 * AI Agent 注意：
 * 1. init() 中进行事件订阅、服务初始化等，应可重复调用
 * 2. dispose() 中必须清理所有资源：取消订阅、关闭定时器、释放句柄
 * 3. getUI/getSettings 仅在需要时实现，返回 React 组件
 */
export interface ModuleInstance {
  init(): Promise<void>;
  dispose(): Promise<void>;
  getUI?(): ComponentType;
  getSettings?(): ComponentType;
}

/**
 * 模块注册表条目
 *
 * 内部使用，将 ModuleDefinition 与运行时状态绑定。
 */
export interface ModuleRegistryEntry {
  definition: ModuleDefinition;
  status: ModuleLifecycleStatus;
  instance?: ModuleInstance;
  enabled: boolean;
  loadedAt?: number;
  error?: string;
}

/**
 * 依赖检查结果
 *
 * 用于模块开关管理的依赖检测。
 */
export interface DependencyCheckResult {
  canEnable: boolean;
  missingDependencies: string[];
  reverseDependencies: string[];
}
