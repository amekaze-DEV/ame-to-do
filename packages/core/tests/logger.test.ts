import { Logger, LogLevels, type ILogger } from '../src/log';

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

test('info 日志被记录到待写入队列', async () => {
  const logger = new Logger({ console: false, file: true, logDir: './test-logs' });
  logger.info('测试信息日志');
  await new Promise(resolve => setTimeout(resolve, 50));
  const pending = logger.getPendingLogs();
  assert(pending.length === 1, '应有 1 条待写入日志');
  assert(pending[0].includes('测试信息日志'), '日志内容应包含消息');
  assert(pending[0].includes('[INFO]'), '日志级别应为 INFO');
});

test('debug 日志在默认 info 级别下被过滤', async () => {
  const logger = new Logger({ console: false, file: true });
  logger.debug('测试调试日志');
  await new Promise(resolve => setTimeout(resolve, 50));
  const pending = logger.getPendingLogs();
  assert(pending.length === 0, 'debug 日志应被过滤');
});

test('setLevel 可动态调整日志级别', async () => {
  const logger = new Logger({ console: false, file: true });
  logger.setLevel(LogLevels.DEBUG);
  logger.debug('测试调试日志');
  await new Promise(resolve => setTimeout(resolve, 50));
  const pending = logger.getPendingLogs();
  assert(pending.length === 1, '调整后 debug 日志应被记录');
});

test('error 日志包含错误对象信息', async () => {
  const logger = new Logger({ console: false, file: true });
  const testError = new Error('测试错误');
  logger.error('测试错误日志', testError);
  await new Promise(resolve => setTimeout(resolve, 50));
  const pending = logger.getPendingLogs();
  assert(pending.length === 1, '应有 1 条错误日志');
  assert(pending[0].includes('测试错误日志'), '应包含错误消息');
  assert(pending[0].includes('Error: 测试错误'), '应包含错误对象');
});

test('metadata 被序列化到日志中', async () => {
  const logger = new Logger({ console: false, file: true });
  logger.info('测试元数据', { userId: '123', action: 'login' });
  await new Promise(resolve => setTimeout(resolve, 50));
  const pending = logger.getPendingLogs();
  assert(pending.length === 1, '应有 1 条日志');
  assert(pending[0].includes('"userId": "123"'), '应包含序列化后的 metadata');
});

test('child() 创建带上下文的子日志器', async () => {
  const parent = new Logger({ console: false, file: true, context: 'parent' });
  const child = parent.child('child');
  child.info('子日志器消息');
  await new Promise(resolve => setTimeout(resolve, 50));
  const pending = (child as unknown as { getPendingLogs: () => string[] }).getPendingLogs();
  assert(pending.length === 1, '子日志器应记录日志');
  assert(pending[0].includes('[parent:child]'), '上下文应为 parent:child');
});

test('级别过滤对 warn/error 生效', async () => {
  const logger = new Logger({ console: false, file: true, level: LogLevels.ERROR });
  logger.warn('警告日志');
  logger.error('错误日志');
  await new Promise(resolve => setTimeout(resolve, 50));
  const pending = logger.getPendingLogs();
  assert(pending.length === 1, '只有 error 日志应被记录');
  assert(pending[0].includes('[ERROR]'), '应只包含 ERROR 日志');
});

test('clearPendingLogs 清空待写入日志', async () => {
  const logger = new Logger({ console: false, file: true });
  logger.info('日志一');
  logger.info('日志二');
  await new Promise(resolve => setTimeout(resolve, 50));
  assert(logger.getPendingLogs().length === 2, '初始应有 2 条日志');
  logger.clearPendingLogs();
  assert(logger.getPendingLogs().length === 0, '清空后应为 0');
});

setTimeout(() => {
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log('\n=== Logger 测试结果 ===');
  for (const r of results) {
    const icon = r.passed ? '✓' : '✗';
    console.log(`${icon} ${r.name}${r.error ? `\n   错误: ${r.error}` : ''}`);
  }
  console.log(`\n总计: ${passed}/${total} 通过`);

  if (passed < total) {
    process.exit(1);
  }
}, 200);
