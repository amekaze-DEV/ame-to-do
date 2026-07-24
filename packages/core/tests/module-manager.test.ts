import { ModuleManager } from '../src/module/ModuleManager';
import type { ModuleDefinition, ModuleContext } from '../src/module/types';
import type { ILogger } from '../src/log/types';

/**
 * 内存数据库 mock，用于测试 ModuleManager 的持久化逻辑
 */
class MockDatabase {
  private tables = new Map<string, Map<string, Record<string, unknown>>>();

  async execute(sql: string, params?: unknown[]): Promise<void> {
    if (sql.includes('CREATE TABLE IF NOT EXISTS module_states')) {
      if (!this.tables.has('module_states')) {
        this.tables.set('module_states', new Map());
      }
      return;
    }

    if (sql.includes('INSERT INTO module_states')) {
      const table = this.tables.get('module_states') ?? new Map();
      const moduleId = params?.[0] as string;
      table.set(moduleId, {
        module_id: moduleId,
        enabled: params?.[1],
        updated_at: params?.[2],
      });
      this.tables.set('module_states', table);
      return;
    }
  }

  async select<T>(_sql: string, _params?: unknown[]): Promise<T[]> {
    const table = this.tables.get('module_states');
    if (!table) return [];
    return Array.from(table.values()) as T[];
  }

  reset(): void {
    this.tables.clear();
  }
}

function createMockLogger(): ILogger {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    child: () => createMockLogger(),
    setLevel: () => {},
    getLevel: () => 'info' as const,
  };
}

function createTestModule(id: string, dependencies: string[] = []): ModuleDefinition {
  return {
    id,
    name: id,
    description: `测试模块 ${id}`,
    version: '1.0.0',
    dependencies,
    permissions: [],
    entry: () => ({
      init: async () => {},
      dispose: async () => {},
    }),
  };
}

function createContext(database: MockDatabase): ModuleContext {
  return {
    eventBus: {
      on: () => () => {},
      emit: () => {},
      off: () => {},
      once: () => () => {},
      clear: () => {},
      getListenerCount: () => 0,
      hasListeners: () => false,
    } as unknown as ModuleContext['eventBus'],
    logger: createMockLogger(),
    configStore: {} as ModuleContext['configStore'],
    database: database as unknown as ModuleContext['database'],
    platform: {} as ModuleContext['platform'],
  };
}

interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
}

const tests: TestCase[] = [];
let failedCount = 0;
let passedCount = 0;

function test(name: string, fn: () => void | Promise<void>): void {
  tests.push({ name, fn });
}

async function runTests(): Promise<void> {
  console.log('=== ModuleManager 测试结果 ===');

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`✗ ${name}`);
      console.error(err);
      failedCount++;
    }
  }

  console.log(`\n总计: ${passedCount}/${passedCount + failedCount} 通过`);
}

test('注册模块', () => {
  const db = new MockDatabase();
  const manager = new ModuleManager(createContext(db));
  manager.register(createTestModule('mod-a'));

  if (!manager.getModule('mod-a')) {
    throw new Error('模块未注册成功');
  }
});

test('启用无依赖模块', async () => {
  const db = new MockDatabase();
  const manager = new ModuleManager(createContext(db));
  manager.register(createTestModule('mod-a'));

  const result = await manager.enableModule('mod-a');
  if (!result.success) {
    throw new Error(`启用失败: ${result.error}`);
  }
  if (!manager.isEnabled('mod-a')) {
    throw new Error('模块未处于启用状态');
  }
});

test('启用模块自动启用依赖', async () => {
  const db = new MockDatabase();
  const manager = new ModuleManager(createContext(db));
  manager.register(createTestModule('mod-a'));
  manager.register(createTestModule('mod-b', ['mod-a']));

  const result = await manager.enableModule('mod-b');
  if (!result.success) {
    throw new Error(`启用失败: ${result.error}`);
  }
  if (!manager.isEnabled('mod-a') || !manager.isEnabled('mod-b')) {
    throw new Error('依赖模块未自动启用');
  }
  if (!result.enabled.includes('mod-a') || !result.enabled.includes('mod-b')) {
    throw new Error('返回结果未包含依赖模块');
  }
});

test('启用缺失依赖的模块失败', async () => {
  const db = new MockDatabase();
  const manager = new ModuleManager(createContext(db));
  manager.register(createTestModule('mod-b', ['mod-a']));

  const result = await manager.enableModule('mod-b');
  if (result.success) {
    throw new Error('应该启用失败');
  }
  if (!result.error?.includes('依赖不满足')) {
    throw new Error(`错误信息不正确: ${result.error}`);
  }
});

test('禁用模块自动禁用反向依赖', async () => {
  const db = new MockDatabase();
  const manager = new ModuleManager(createContext(db));
  manager.register(createTestModule('mod-a'));
  manager.register(createTestModule('mod-b', ['mod-a']));

  await manager.enableModule('mod-b');
  const result = await manager.disableModule('mod-a');

  if (!result.success) {
    throw new Error(`禁用失败: ${result.error}`);
  }
  if (manager.isEnabled('mod-a') || manager.isEnabled('mod-b')) {
    throw new Error('反向依赖模块未自动禁用');
  }
  if (!result.warnings.some((w) => w.includes('mod-b'))) {
    throw new Error('未提示反向依赖将被禁用');
  }
});

test('重复启用已启用模块返回警告', async () => {
  const db = new MockDatabase();
  const manager = new ModuleManager(createContext(db));
  manager.register(createTestModule('mod-a'));

  await manager.enableModule('mod-a');
  const result = await manager.enableModule('mod-a');

  if (!result.success) {
    throw new Error(`重复启用不应失败: ${result.error}`);
  }
  if (result.warnings.length === 0) {
    throw new Error('应返回已启用警告');
  }
});

test('toggle 切换模块状态', async () => {
  const db = new MockDatabase();
  const manager = new ModuleManager(createContext(db));
  manager.register(createTestModule('mod-a'));

  await manager.toggleModule('mod-a');
  if (!manager.isEnabled('mod-a')) {
    throw new Error('toggle 后应启用');
  }

  await manager.toggleModule('mod-a');
  if (manager.isEnabled('mod-a')) {
    throw new Error('再次 toggle 后应禁用');
  }
});

test('initialize 加载默认启用模块', async () => {
  const db = new MockDatabase();
  const manager = new ModuleManager(createContext(db), {
    defaultEnabled: ['mod-a'],
  });
  manager.register(createTestModule('mod-a'));
  manager.register(createTestModule('mod-b'));

  const result = await manager.initialize();
  if (!result.loaded.includes('mod-a')) {
    throw new Error('默认启用模块未加载');
  }
  if (result.loaded.includes('mod-b')) {
    throw new Error('非默认启用模块不应加载');
  }
  if (!manager.isEnabled('mod-a')) {
    throw new Error('默认启用模块状态不正确');
  }
});

test('持久化：禁用状态保存到数据库', async () => {
  const db = new MockDatabase();
  const manager = new ModuleManager(createContext(db));
  manager.register(createTestModule('mod-a'));

  await manager.enableModule('mod-a');
  await manager.disableModule('mod-a');

  const states = await db.select<{
    module_id: string;
    enabled: number;
    updated_at: number;
  }>('SELECT * FROM module_states');
  const state = states.find((s) => s.module_id === 'mod-a');
  if (!state) {
    throw new Error('未找到持久化状态');
  }
  if (state.enabled !== 0) {
    throw new Error('禁用状态未正确保存');
  }
});

test('持久化：新管理器读取已保存状态', async () => {
  const db = new MockDatabase();
  const manager1 = new ModuleManager(createContext(db));
  manager1.register(createTestModule('mod-a'));
  await manager1.enableModule('mod-a');
  await manager1.disableModule('mod-a');

  const manager2 = new ModuleManager(createContext(db));
  manager2.register(createTestModule('mod-a'));
  await manager2.initialize();

  if (manager2.isEnabled('mod-a')) {
    throw new Error('新管理器应读取到禁用状态');
  }
});

test('未注册模块操作返回错误', async () => {
  const db = new MockDatabase();
  const manager = new ModuleManager(createContext(db));

  const enableResult = await manager.enableModule('not-exist');
  if (enableResult.success) {
    throw new Error('未注册模块启用应失败');
  }

  const disableResult = await manager.disableModule('not-exist');
  if (disableResult.success) {
    throw new Error('未注册模块禁用应失败');
  }
});

runTests().then(() => {
  if (failedCount > 0) {
    process.exit(1);
  }
});
