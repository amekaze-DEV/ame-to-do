import type { AppEvent, AppEventDataMap, EventHandler } from './types';

/**
 * 应用级事件总线
 * AI Agent 注意：模块间通信必须通过事件总线，禁止直接调用其他模块的方法
 *
 * 设计原则：
 * 1. 单一事件源：所有模块间通信都通过同一 EventBus 实例
 * 2. 错误隔离：单个 handler 异常不影响其他 handler 执行
 * 3. 类型安全：通过 AppEventDataMap 提供事件名与数据类型的映射
 * 4. 内存安全：通过 off() 或 on() 返回的取消函数及时清理订阅
 */
export class EventBus {
  private readonly handlers = new Map<string, Set<EventHandler<unknown>>>();

  /**
   * 订阅事件
   * @param event 事件名称
   * @param handler 事件处理函数
   * @returns 取消订阅函数，调用后移除该 handler
   */
  on<E extends AppEvent>(
    event: E,
    handler: EventHandler<AppEventDataMap[E]>,
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const handlerSet = this.handlers.get(event)!;
    handlerSet.add(handler as EventHandler<unknown>);

    return () => {
      this.off(event, handler);
    };
  }

  /**
   * 订阅事件（仅触发一次）
   * @param event 事件名称
   * @param handler 事件处理函数
   * @returns 取消订阅函数
   */
  once<E extends AppEvent>(
    event: E,
    handler: EventHandler<AppEventDataMap[E]>,
  ): () => void {
    const wrappedHandler = (data: AppEventDataMap[E]) => {
      this.off(event, wrappedHandler as EventHandler<AppEventDataMap[E]>);
      handler(data);
    };
    return this.on(event, wrappedHandler as EventHandler<AppEventDataMap[E]>);
  }

  /**
   * 发布事件
   * 单个 handler 抛出异常不会中断其他 handler 的执行
   * @param event 事件名称
   * @param data 事件数据
   */
  emit<E extends AppEvent>(
    event: E,
    ...data: AppEventDataMap[E] extends undefined ? [] : [AppEventDataMap[E]]
  ): void {
    const eventData = data[0] as AppEventDataMap[E];
    const handlerSet = this.handlers.get(event);
    if (!handlerSet || handlerSet.size === 0) {
      return;
    }

    const handlers = Array.from(handlerSet);
    for (const handler of handlers) {
      try {
        handler(eventData);
      } catch (error) {
        this.handleHandlerError(event, error);
      }
    }
  }

  /**
   * 取消订阅
   * @param event 事件名称
   * @param handler 要移除的处理函数，如果不传则移除该事件的所有 handler
   */
  off<E extends AppEvent>(
    event: E,
    handler?: EventHandler<AppEventDataMap[E]>,
  ): void {
    const handlerSet = this.handlers.get(event);
    if (!handlerSet) {
      return;
    }

    if (handler === undefined) {
      this.handlers.delete(event);
    } else {
      handlerSet.delete(handler as EventHandler<unknown>);
      if (handlerSet.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  /**
   * 清除所有事件的所有订阅
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * 获取指定事件的 handler 数量
   * @param event 事件名称
   */
  getListenerCount(event: AppEvent): number {
    return this.handlers.get(event)?.size ?? 0;
  }

  /**
   * 检查是否有指定事件的订阅
   * @param event 事件名称
   */
  hasListeners(event: AppEvent): boolean {
    return this.getListenerCount(event) > 0;
  }

  /**
   * 处理 handler 执行异常
   * 默认使用 console.error，实际项目中可接入 Logger 系统
   * 设计为可重写的 protected 方法，方便子类扩展
   */
  protected handleHandlerError(event: string, error: unknown): void {
    console.error(`[EventBus] 事件处理异常 [${event}]:`, error);
  }
}

export const eventBus = new EventBus();
