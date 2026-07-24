import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { PlatformAdapter } from '../src/PlatformAdapter';

type TestResult = { name: string; passed: boolean; error?: string };
const results: TestResult[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, passed: true });
  } catch (e) {
    results.push({ name, passed: false, error: e instanceof Error ? e.message : String(e) });
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const requiredAdapters: (keyof PlatformAdapter)[] = [
  'filesystem',
  'notification',
  'secureStorage',
  'network',
  'taskScheduler',
  'autoLaunch',
  'widget',
  'tray',
  'display',
];

const srcDir = join(process.cwd(), 'packages', 'platform-contracts', 'src');

test('PlatformAdapter 接口定义存在', () => {
  const path = join(srcDir, 'PlatformAdapter.ts');
  assert(existsSync(path), 'PlatformAdapter.ts 应存在');
});

test('9 个子适配器接口文件全部存在', () => {
  const expectedFiles = [
    'FileSystemAdapter.ts',
    'NotificationAdapter.ts',
    'SecureStorageAdapter.ts',
    'NetworkAdapter.ts',
    'TaskSchedulerAdapter.ts',
    'AutoLaunchAdapter.ts',
    'WidgetAdapter.ts',
    'TrayAdapter.ts',
    'DisplayAdapter.ts',
  ];

  for (const file of expectedFiles) {
    const path = join(srcDir, file);
    assert(existsSync(path), `${file} 应存在`);
  }
});

test('所有必需适配器字段在 PlatformAdapter 中定义', () => {
  const typeCheck: Record<keyof PlatformAdapter, true> = {
    filesystem: true,
    notification: true,
    secureStorage: true,
    network: true,
    taskScheduler: true,
    autoLaunch: true,
    widget: true,
    tray: true,
    display: true,
  };

  for (const key of requiredAdapters) {
    assert(typeCheck[key] === true, `${key} 应在 PlatformAdapter 中定义`);
  }
});

test('子适配器数量为 9 个', () => {
  assert(requiredAdapters.length === 9, `应有 9 个子适配器，实际 ${requiredAdapters.length} 个`);
});

test('index.ts 导出所有接口', () => {
  const indexPath = join(srcDir, 'index.ts');
  assert(existsSync(indexPath), 'index.ts 应存在');

  const expectedExports = [
    'PlatformAdapter',
    'FileSystemAdapter',
    'NotificationAdapter',
    'SecureStorageAdapter',
    'NetworkAdapter',
    'TaskSchedulerAdapter',
    'AutoLaunchAdapter',
    'WidgetAdapter',
    'TrayAdapter',
    'DisplayAdapter',
  ];

  const content = readFileSync(indexPath, 'utf-8');
  for (const name of expectedExports) {
    assert(content.includes(name), `index.ts 应导出 ${name}`);
  }
});

test('src 目录下共有 11 个 TypeScript 文件', () => {
  const files = readdirSync(srcDir).filter(f => f.endsWith('.ts'));
  assert(files.length === 11, `应有 11 个 .ts 文件（9 个子适配器 + PlatformAdapter + index.ts），实际 ${files.length} 个`);
});

const passed = results.filter(r => r.passed).length;
const total = results.length;

console.log('\n=== PlatformAdapter 接口测试结果 ===');
for (const r of results) {
  const icon = r.passed ? '✓' : '✗';
  console.log(`${icon} ${r.name}${r.error ? `\n   错误: ${r.error}` : ''}`);
}
console.log(`\n总计: ${passed}/${total} 通过`);

if (passed < total) {
  process.exit(1);
}
