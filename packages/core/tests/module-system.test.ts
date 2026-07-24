import { ModuleRegistry, ModuleRegistryError } from '../src/module/ModuleRegistry';
import {
  ModuleLoader,
  ModuleLoaderError,
} from '../src/module/ModuleLoader';
import { EventBus } from '../src/event/EventBus';
import { Logger } from '../src/log/Logger';
import { ConfigStore } from '../src/config/ConfigStore';
import {
  createTestModuleA,
  createTestModuleB,
  createFailingModule,
} from '../../features/test-modules';

type TestResult = { name: string; passed: boolean; error?: string };
const results: TestResult[] = [];

function test(name: string, fn: () => void | Promise<void>): void {
  Promise.resolve()
    .then(fn)
    .then(() => {
      results.push({ name, passed: true });
    })
    .catch((e) => {
      results.push({
        name,
        passed: false,
        error: e instanceof Error ? e.message : String(e),
      });
    });
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function createContext() {
  const eventBus = new EventBus();
  const logger = new Logger({ level: 'error', fileOutput: false });
  const configStore = new ConfigStore('./test-config.json', { eventBus });
  const platform = {} as any;
  const database = {} as any;
  return { eventBus, logger, configStore, platform, database };
}

test('ModuleRegistry: 注册单个模块', () => {
  const registry = new ModuleRegistry();
  const def = createTestModuleA();
  registry.register(def);
  assert(registry.has(def.id), '模块应已注册');
  assert(registry.size === 1, '应有 1 个模块');
});

test('ModuleRegistry: 重复注册应抛出错误', () => {
  const registry = new ModuleRegistry();
  const def = createTestModuleA();
  registry.register(def);
  try {
    registry.register(def);
    assert(false, '应抛出重复注册错误');
  } catch (e) {
    assert(e instanceof ModuleRegistryError, '应抛出 ModuleRegistryError');
    assert((e as ModuleRegistryError).code === 'DUPLICATE_MODULE', '错误码应为 DUPLICATE_MODULE');
  }
});

test('ModuleRegistry: 批量注册', () => {
  const registry = new ModuleRegistry();
  const defs = [createTestModuleA(), createTestModuleB()];
  registry.registerAll(defs);
  assert(registry.size === 2, '应有 2 个模块');
  assert(registry.has('test-module-a'), 'A 应存在');
  assert(registry.has('test-module-b'), 'B 应存在');
});

test('ModuleRegistry: 查询模块定义', () => {
  const registry = new ModuleRegistry();
  const def = createTestModuleA();
  registry.register(def);
  const entry = registry.get(def.id);
  assert(entry !== undefined, '应能获取到模块');
  assert(entry.definition.id === def.id, 'ID 应匹配');
  assert(entry.status === 'registered', '初始状态应为 registered');
  assert(entry.enabled === false, '默认应禁用');
});

test('ModuleRegistry: 取消注册', () => {
  const registry = new ModuleRegistry();
  const def = createTestModuleA();
  registry.register(def);
  registry.unregister(def.id);
  assert(!registry.has(def.id), '模块应已移除');
  assert(registry.size === 0, '应为空');
});

test('ModuleRegistry: 依赖检查 - 无依赖', () => {
  const registry = new ModuleRegistry();
  registry.register(createTestModuleA());
  const result = registry.checkDependencies('test-module-a');
  assert(result.canEnable === true, '应可启用');
  assert(result.missingDependencies.length === 0, '不应有缺失依赖');
});

test('ModuleRegistry: 依赖检查 - 有依赖但未注册', () => {
  const registry = new ModuleRegistry();
  registry.register(createTestModuleB());
  const result = registry.checkDependencies('test-module-b');
  assert(result.canEnable === false, '应不可启用');
  assert(result.missingDependencies.includes('test-module-a'), '应缺失 test-module-a');
});

test('ModuleRegistry: 依赖检查 - 依赖已注册', () => {
  const registry = new ModuleRegistry();
  registry.register(createTestModuleA());
  registry.register(createTestModuleB());
  const result = registry.checkDependencies('test-module-b');
  assert(result.canEnable === true, '应可启用');
});

test('ModuleRegistry: 反向依赖检测', () => {
  const registry = new ModuleRegistry();
  registry.register(createTestModuleA());
  registry.register(createTestModuleB());
  const result = registry.checkDependencies('test-module-a');
  assert(result.reverseDependencies.includes('test-module-b'), 'B 应是 A 的反向依赖');
});

test('ModuleRegistry: 按状态筛选', () => {
  const registry = new ModuleRegistry();
  registry.register(createTestModuleA());
  registry.register(createTestModuleB());
  const registered = registry.filterByStatus('registered');
  assert(registered.length === 2, '所有模块应为 registered 状态');
});

test('ModuleLoader: 加载无依赖模块', async () => {
  const registry = new ModuleRegistry();
  const ctx = createContext();
  const loader = new ModuleLoader(registry, ctx);

  registry.register(createTestModuleA());
  await loader.load('test-module-a');

  assert(registry.isActive('test-module-a'), '模块应处于 active 状态');
  assert(registry.isEnabled('test-module-a'), '模块应已启用');
  assert(registry.get('test-module-a')?.instance !== undefined, '实例应已创建');
});

test('ModuleLoader: 加载有依赖模块自动加载依赖', async () => {
  const registry = new ModuleRegistry();
  const ctx = createContext();
  const loader = new ModuleLoader(registry, ctx);

  registry.register(createTestModuleA());
  registry.register(createTestModuleB());
  await loader.load('test-module-b');

  assert(registry.isActive('test-module-a'), '依赖模块 A 应自动加载');
  assert(registry.isActive('test-module-b'), '模块 B 应处于 active 状态');
});

test('ModuleLoader: 加载缺失依赖的模块应抛出错误', async () => {
  const registry = new ModuleRegistry();
  const ctx = createContext();
  const loader = new ModuleLoader(registry, ctx);

  registry.register(createTestModuleB());
  try {
    await loader.load('test-module-b');
    assert(false, '应抛出依赖缺失错误');
  } catch (e) {
    assert(e instanceof ModuleLoaderError, '应抛出 ModuleLoaderError');
    assert((e as ModuleLoaderError).code === 'DEPENDENCY_MISSING', '错误码应为 DEPENDENCY_MISSING');
  }
});

test('ModuleLoader: init 失败的模块状态应为 inactive', async () => {
  const registry = new ModuleRegistry();
  const ctx = createContext();
  const loader = new ModuleLoader(registry, ctx);

  registry.register(createFailingModule());
  try {
    await loader.load('failing-module');
    assert(false, '应抛出加载失败错误');
  } catch {
    const entry = registry.get('failing-module');
    assert(entry?.status === 'inactive', '失败后状态应为 inactive');
    assert(entry?.error !== undefined, '应记录错误信息');
    assert(entry?.enabled === false, '应标记为禁用');
  }
});

test('ModuleLoader: 卸载模块', async () => {
  const registry = new ModuleRegistry();
  const ctx = createContext();
  const loader = new ModuleLoader(registry, ctx);

  registry.register(createTestModuleA());
  await loader.load('test-module-a');
  await loader.unload('test-module-a');

  assert(!registry.isActive('test-module-a'), '模块不应再处于 active 状态');
  assert(registry.get('test-module-a')?.status === 'inactive', '状态应为 inactive');
  assert(registry.get('test-module-a')?.instance === undefined, '实例应已清除');
});

test('ModuleLoader: 卸载模块自动卸载反向依赖', async () => {
  const registry = new ModuleRegistry();
  const ctx = createContext();
  const loader = new ModuleLoader(registry, ctx);

  registry.register(createTestModuleA());
  registry.register(createTestModuleB());
  await loader.load('test-module-b');

  assert(registry.isActive('test-module-a'), 'A 应已加载');
  assert(registry.isActive('test-module-b'), 'B 应已加载');

  await loader.unload('test-module-a');

  assert(!registry.isActive('test-module-b'), 'B 作为 A 的反向依赖应被卸载');
  assert(!registry.isActive('test-module-a'), 'A 应已卸载');
});

test('ModuleLoader: 重复加载跳过', async () => {
  const registry = new ModuleRegistry();
  const ctx = createContext();
  const loader = new ModuleLoader(registry, ctx);

  registry.register(createTestModuleA());
  await loader.load('test-module-a');
  await loader.load('test-module-a');

  assert(registry.isActive('test-module-a'), '模块应仍为 active 状态');
});

test('ModuleLoader: 加载和卸载事件通知', async () => {
  const registry = new ModuleRegistry();
  const ctx = createContext();
  const loader = new ModuleLoader(registry, ctx);

  const enabledEvents: string[] = [];
  const disabledEvents: string[] = [];

  ctx.eventBus.on('module:enabled', (d) => enabledEvents.push(d.moduleId));
  ctx.eventBus.on('module:disabled', (d) => disabledEvents.push(d.moduleId));

  registry.register(createTestModuleA());
  await loader.load('test-module-a');
  assert(enabledEvents.includes('test-module-a'), '应触发 enabled 事件');

  await loader.unload('test-module-a');
  assert(disabledEvents.includes('test-module-a'), '应触发 disabled 事件');
});

test('ModuleLoader: loadAll 批量加载', async () => {
  const registry = new ModuleRegistry();
  const ctx = createContext();
  const loader = new ModuleLoader(registry, ctx);

  registry.register(createTestModuleA());
  registry.register(createTestModuleB());
  const result = await loader.loadAll();

  assert(result.loaded.length > 0, '应有模块被加载');
  assert(registry.isActive('test-module-a'), 'A 应已加载');
  assert(registry.isActive('test-module-b'), 'B 应已加载');
});

setTimeout(() => {
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.log('\n=== 模块系统测试结果 ===');
  for (const r of results) {
    const icon = r.passed ? '✓' : '✗';
    console.log(`${icon} ${r.name}${r.error ? `\n   错误: ${r.error}` : ''}`);
  }
  console.log(`\n总计: ${passed}/${total} 通过`);

  if (passed < total) {
    process.exit(1);
  }
}, 200);
