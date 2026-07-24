import { MIGRATIONS, CURRENT_SCHEMA_VERSION } from '../src/migrations';

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

test('MIGRATIONS 数组不为空', () => {
  assert(MIGRATIONS.length > 0, 'MIGRATIONS 数组不应为空');
});

test('迁移脚本按版本号升序排列', () => {
  for (let i = 1; i < MIGRATIONS.length; i++) {
    assert(
      MIGRATIONS[i].version > MIGRATIONS[i - 1].version,
      `迁移脚本版本应递增：v${MIGRATIONS[i - 1].version} -> v${MIGRATIONS[i].version}`,
    );
  }
});

test('版本号从 1 开始且连续', () => {
  for (let i = 0; i < MIGRATIONS.length; i++) {
    assert(MIGRATIONS[i].version === i + 1, `版本号应连续：预期 v${i + 1}，实际 v${MIGRATIONS[i].version}`);
  }
});

test('每个迁移脚本有描述和 SQL 内容', () => {
  for (const m of MIGRATIONS) {
    assert(m.description.length > 0, `v${m.version} 应有描述`);
    assert(m.sql.length > 0, `v${m.version} 应有 SQL 内容`);
    assert(m.sql.trim().toUpperCase().startsWith('CREATE') || m.sql.trim().startsWith('--'),
      `v${m.version} SQL 应包含有效语句`);
  }
});

test('CURRENT_SCHEMA_VERSION 等于最新迁移版本', () => {
  const latestVersion = MIGRATIONS[MIGRATIONS.length - 1].version;
  assert(CURRENT_SCHEMA_VERSION === latestVersion,
    `CURRENT_SCHEMA_VERSION (${CURRENT_SCHEMA_VERSION}) 应等于最新迁移版本 (${latestVersion})`);
});

test('v1 迁移包含所有必需表', () => {
  const v1 = MIGRATIONS.find(m => m.version === 1);
  assert(v1 !== undefined, 'v1 迁移应存在');

  const requiredTables = [
    'items',
    'calendar_cache',
    'shift_templates',
    'shift_schedules',
    'shift_overrides',
    'sync_metadata',
    'module_states',
  ];

  for (const table of requiredTables) {
    const regex = new RegExp(`CREATE TABLE\\s+(?:IF NOT EXISTS\\s+)?${table}`, 'i');
    assert(regex.test(v1.sql), `v1 应包含 ${table} 表`);
  }
});

test('v2 迁移包含 widget_config 表', () => {
  const v2 = MIGRATIONS.find(m => m.version === 2);
  assert(v2 !== undefined, 'v2 迁移应存在');
  assert(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?widget_config/i.test(v2.sql),
    'v2 应包含 widget_config 表');
});

test('SQL 语句不包含危险的 DROP TABLE（迁移脚本）', () => {
  for (const m of MIGRATIONS) {
    assert(!/DROP\s+TABLE/i.test(m.sql),
      `v${m.version} 不应包含 DROP TABLE（迁移脚本是正向的）`);
  }
});

const passed = results.filter(r => r.passed).length;
const total = results.length;

console.log('\n=== 数据库迁移测试结果 ===');
for (const r of results) {
  const icon = r.passed ? '✓' : '✗';
  console.log(`${icon} ${r.name}${r.error ? `\n   错误: ${r.error}` : ''}`);
}
console.log(`\n总计: ${passed}/${total} 通过`);

if (passed < total) {
  process.exit(1);
}
