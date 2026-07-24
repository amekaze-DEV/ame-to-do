import { EventBus, AppEvents, type ItemEventData } from '../src/event';

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

test('on + emit: 订阅并接收事件', () => {
  const bus = new EventBus();
  let received: ItemEventData | null = null;
  bus.on(AppEvents.ITEM_CREATED, (data) => {
    received = data;
  });
  bus.emit(AppEvents.ITEM_CREATED, { itemId: 'test-1' });
  assert(received !== null, '事件未被接收');
  assert(received.itemId === 'test-1', '事件数据不正确');
});

test('off: 取消订阅后不再接收事件', () => {
  const bus = new EventBus();
  let count = 0;
  const handler = () => { count++; };
  bus.on(AppEvents.APP_STARTED, handler);
  bus.emit(AppEvents.APP_STARTED);
  assert(count === 1, '第一次发射应收到');
  bus.off(AppEvents.APP_STARTED, handler);
  bus.emit(AppEvents.APP_STARTED);
  assert(count === 1, '取消订阅后不应再收到');
});

test('on 返回取消函数', () => {
  const bus = new EventBus();
  let count = 0;
  const unsub = bus.on(AppEvents.APP_STARTED, () => { count++; });
  bus.emit(AppEvents.APP_STARTED);
  assert(count === 1, '订阅中应收到');
  unsub();
  bus.emit(AppEvents.APP_STARTED);
  assert(count === 1, '取消后不应再收到');
});

test('once: 仅触发一次', () => {
  const bus = new EventBus();
  let count = 0;
  bus.once(AppEvents.APP_STARTED, () => { count++; });
  bus.emit(AppEvents.APP_STARTED);
  bus.emit(AppEvents.APP_STARTED);
  assert(count === 1, 'once 应仅触发一次');
});

test('错误隔离: 单个 handler 异常不影响其他 handler', () => {
  const bus = new EventBus();
  let secondCalled = false;
  bus.on(AppEvents.APP_STARTED, () => {
    throw new Error('第一个 handler 出错');
  });
  bus.on(AppEvents.APP_STARTED, () => {
    secondCalled = true;
  });
  bus.emit(AppEvents.APP_STARTED);
  assert(secondCalled === true, '第二个 handler 应被调用');
});

test('多 handler 按订阅顺序执行', () => {
  const bus = new EventBus();
  const order: number[] = [];
  bus.on(AppEvents.APP_STARTED, () => { order.push(1); });
  bus.on(AppEvents.APP_STARTED, () => { order.push(2); });
  bus.on(AppEvents.APP_STARTED, () => { order.push(3); });
  bus.emit(AppEvents.APP_STARTED);
  assert(order.join(',') === '1,2,3', `顺序应为 1,2,3，实际为 ${order.join(',')}`);
});

test('off 不传 handler 清除该事件所有订阅', () => {
  const bus = new EventBus();
  let count = 0;
  bus.on(AppEvents.APP_STARTED, () => { count++; });
  bus.on(AppEvents.APP_STARTED, () => { count++; });
  bus.off(AppEvents.APP_STARTED);
  bus.emit(AppEvents.APP_STARTED);
  assert(count === 0, '所有订阅应已清除');
});

test('clear: 清除所有事件订阅', () => {
  const bus = new EventBus();
  bus.on(AppEvents.APP_STARTED, () => { });
  bus.on(AppEvents.ITEM_CREATED, () => { });
  assert(bus.hasListeners(AppEvents.APP_STARTED), '应有订阅');
  assert(bus.hasListeners(AppEvents.ITEM_CREATED), '应有订阅');
  bus.clear();
  assert(!bus.hasListeners(AppEvents.APP_STARTED), 'clear 后应无订阅');
  assert(!bus.hasListeners(AppEvents.ITEM_CREATED), 'clear 后应无订阅');
});

test('getListenerCount / hasListeners', () => {
  const bus = new EventBus();
  assert(bus.getListenerCount(AppEvents.APP_STARTED) === 0, '初始应为 0');
  assert(!bus.hasListeners(AppEvents.APP_STARTED), '初始应无订阅');
  bus.on(AppEvents.APP_STARTED, () => { });
  bus.on(AppEvents.APP_STARTED, () => { });
  assert(bus.getListenerCount(AppEvents.APP_STARTED) === 2, '应有 2 个订阅');
  assert(bus.hasListeners(AppEvents.APP_STARTED), '应有订阅');
});

test('emit 无订阅事件不报错', () => {
  const bus = new EventBus();
  bus.emit(AppEvents.APP_STARTED);
});

test('同一 handler 多次订阅仅注册一次', () => {
  const bus = new EventBus();
  let count = 0;
  const handler = () => { count++; };
  bus.on(AppEvents.APP_STARTED, handler);
  bus.on(AppEvents.APP_STARTED, handler);
  bus.emit(AppEvents.APP_STARTED);
  assert(count === 1, '同一 handler 应仅触发一次');
});

test('类型安全: 事件数据类型匹配', () => {
  const bus = new EventBus();
  bus.on(AppEvents.CONFIG_CHANGED, (data) => {
    assert(data.key === 'theme', 'key 应为 theme');
    assert(data.value === 'dark', 'value 应为 dark');
  });
  bus.emit(AppEvents.CONFIG_CHANGED, { key: 'theme', value: 'dark' });
});

const passed = results.filter(r => r.passed).length;
const total = results.length;

console.log('\n=== EventBus 测试结果 ===');
for (const r of results) {
  const icon = r.passed ? '✓' : '✗';
  console.log(`${icon} ${r.name}${r.error ? `\n   错误: ${r.error}` : ''}`);
}
console.log(`\n总计: ${passed}/${total} 通过`);

if (passed < total) {
  process.exit(1);
}
