/**
 * 任务调度适配器类型
 *
 * AI Agent 注意：
 * - 用于 WebDAV 自动同步、提醒检测等后台周期性任务
 * - 平台实现应在应用未被用户关闭时持续运行
 * - 任务回调应尽量轻量，避免阻塞主线程
 */

export interface TaskSchedulerAdapter {
  /**
   * 注册周期性任务
   * @param id 任务唯一 ID，用于取消
   * @param intervalMs 执行间隔（毫秒），建议不小于 60000（1 分钟）
   * @param callback 任务回调
   *
   * AI Agent 注意：首次调用不会立即执行，需要等到第一个间隔后执行。
   * 如需立即执行，调用方应在注册后手动执行一次。
   */
  scheduleTask(id: string, intervalMs: number, callback: () => void): Promise<void>;

  /**
   * 取消已注册的任务
   */
  cancelTask(id: string): Promise<void>;
}
