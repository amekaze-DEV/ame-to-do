/**
 * 通知适配器类型
 *
 * AI Agent 注意：
 * - 定时通知由平台实现持久化，应用未运行时也能触发
 * - 应用启动时应调用 handleMissedNotifications() 处理错过的通知
 * - 敏感信息（如待办详情）应通过 showPreview 控制是否显示
 */

export type NotificationPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export interface NotificationOptions {
  /** 通知标题 */
  title: string;
  /** 通知正文 */
  body?: string;
  /** 通知图标（平台相关路径） */
  icon?: string;
  /** 通知关联的动作 ID，点击通知时传回 */
  actionId?: string;
  /** 额外数据，点击通知时传回 */
  extra?: Record<string, unknown>;
}

export interface MissedNotification {
  /** 通知 ID */
  id: string;
  /** 原定时触发时间（Unix 毫秒） */
  scheduledAt: number;
  /** 通知选项 */
  options: NotificationOptions;
}

export interface NotificationAdapter {
  /**
   * 检查当前通知权限状态
   */
  checkPermission(): Promise<NotificationPermission>;

  /**
   * 发送即时通知
   * 立即显示在系统通知栏
   */
  showNotification(options: NotificationOptions): Promise<void>;

  /**
   * 注册定时通知
   * @param id 通知唯一 ID，用于取消
   * @param options 通知内容
   * @param triggerAt 触发时间（Unix 毫秒时间戳）
   *
   * AI Agent 注意：应用未运行时平台也应能触发此通知。
   */
  scheduleNotification(
    id: string,
    options: NotificationOptions,
    triggerAt: number,
  ): Promise<void>;

  /**
   * 取消已注册的定时通知
   */
  cancelNotification(id: string): Promise<void>;

  /**
   * 处理应用未运行时错过的通知
   * 应用启动时调用，返回错过的通知列表供业务层处理（例如补提醒）
   */
  handleMissedNotifications(): Promise<MissedNotification[]>;
}
