import { ConfigStore } from '../src/config';
import { EventBus, AppEvents } from '../src/event';
import { defaultConfig } from '../src/config/defaults';

type TestResult = { name: string; passed: boolean; error?: string };
const results: TestResult[] = [];

function test(name: string, fn: () => void | Promise<void>): void {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result
        .then(() => results.push({ name, passed: true }))
        .catch((e) => results.push({ name, passed: false, error: e instanceof Error ? e.message : String(e) }));
    } else {
      results.push({ name, passed: true });
    }
  } catch (e) {
    results.push({ name, passed: false, error: e instanceof Error ? e.message : String(e) });
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

test('默认配置正确加载', () => {
  const store = new ConfigStore();
  const config = store.getConfig();
  assert(config.theme === defaultConfig.theme, '主题应为默认值');
  assert(config.language === defaultConfig.language, '语言应为默认值');
  assert(config.webdav.enabled === false, 'WebDAV 默认禁用');
});

test('通过路径获取配置值', () => {
  const store = new ConfigStore();
  assert(store.get('theme') === 'system', '应能获取 theme');
  assert(store.get('webdav.enabled') === false, '应能获取嵌套值 webdav.enabled');
  assert(store.get('not.exist') === undefined, '不存在路径返回 undefined');
});

test('通过路径设置配置值并触发事件', () => {
  const eventBus = new EventBus();
  const store = new ConfigStore('./test-config.json', { eventBus });
  let received = false;

  eventBus.on(AppEvents.CONFIG_CHANGED, (data) => {
    if (data.key === 'theme' && data.value === 'dark') {
      received = true;
    }
  });

  store.set('theme', 'dark');
  assert(store.get('theme') === 'dark', 'theme 应已更新');
  assert(received === true, '应收到 config:changed 事件');
});

test('设置相同值不触发事件', () => {
  const eventBus = new EventBus();
  const store = new ConfigStore('./test-config.json', { eventBus });
  let count = 0;

  eventBus.on(AppEvents.CONFIG_CHANGED, (data) => {
    if (data.key === 'theme') {
      count++;
    }
  });

  store.set('theme', 'system');
  store.set('theme', 'system');
  assert(count === 0, '相同值不应触发事件');
});

test('patch 批量更新并触发事件', () => {
  const eventBus = new EventBus();
  const store = new ConfigStore('./test-config.json', { eventBus });
  const events: string[] = [];

  eventBus.on(AppEvents.CONFIG_CHANGED, (data) => {
    events.push(data.key);
  });

  store.patch({
    theme: 'dark',
    language: 'en',
  });

  assert(store.get('theme') === 'dark', 'theme 应已更新');
  assert(store.get('language') === 'en', 'language 应已更新');
  assert(events.includes('theme'), '应触发 theme 变更事件');
  assert(events.includes('language'), '应触发 language 变更事件');
});

test('reset 重置为默认配置', () => {
  const eventBus = new EventBus();
  const store = new ConfigStore('./test-config.json', { eventBus });
  store.set('theme', 'dark');
  assert(store.get('theme') === 'dark', '先确认已修改');

  let received = false;
  eventBus.on(AppEvents.CONFIG_CHANGED, (data) => {
    if (data.key === 'theme' && data.value === defaultConfig.theme) {
      received = true;
    }
  });

  store.reset();
  assert(store.get('theme') === defaultConfig.theme, 'theme 应重置为默认值');
  assert(received === true, 'reset 应触发事件');
});

test('onChange 监听配置变更', () => {
  const eventBus = new EventBus();
  const store = new ConfigStore('./test-config.json', { eventBus });
  let received = false;

  const unsub = store.onChange((event) => {
    if (event.key === 'log.level' && event.value === 'debug') {
      received = true;
    }
  });

  store.set('log.level', 'debug');
  assert(received === true, 'onChange 应收到通知');
  unsub();
});

test('模块启用状态管理', () => {
  const eventBus = new EventBus();
  const store = new ConfigStore('./test-config.json', { eventBus });

  assert(store.isModuleEnabled('calendar') === true, '默认模块应启用');

  let eventReceived = false;
  eventBus.on(AppEvents.MODULE_DISABLED, (data) => {
    if (data.moduleId === 'calendar') {
      eventReceived = true;
    }
  });

  store.setModuleEnabled('calendar', false);
  assert(store.isModuleEnabled('calendar') === false, '模块应被禁用');
  assert(eventReceived === true, '应触发 module:disabled 事件');

  store.setModuleEnabled('calendar', true);
  assert(store.isModuleEnabled('calendar') === true, '模块应被启用');
});

test('load 非 Tauri 环境不报错', async () => {
  const store = new ConfigStore('./test-config.json');
  await store.load();
  assert(store.getConfig().theme === defaultConfig.theme, '应为默认配置');
});

setTimeout(() => {
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log('\n=== ConfigStore 测试结果 ===');
  for (const r of results) {
    const icon = r.passed ? '✓' : '✗';
    console.log(`${icon} ${r.name}${r.error ? `\n   错误: ${r.error}` : ''}`);
  }
  console.log(`\n总计: ${passed}/${total} 通过`);

  if (passed < total) {
    process.exit(1);
  }
}, 200);
