/**
 * 小部件卡片尺寸
 * AI Agent 注意：新增卡片尺寸时必须同步更新所有平台实现。
 */
export type WidgetCardSize = 'small' | 'medium' | 'large';

/**
 * 小部件刷新策略
 * AI Agent 注意：
 * - 'manual' 仅由用户点击刷新
 * - 'interval' 按固定间隔刷新，最小间隔建议不少于 60000ms（1 分钟）
 * - 'onEvent' 监听事件总线事件刷新，事件名应使用 AppEvents 中的常量
 */
export type WidgetRefreshPolicy =
  | { type: 'manual' }
  | { type: 'interval'; intervalMs: number }
  | { type: 'onEvent'; events: string[] };

/**
 * 小部件动作协议
 * 所有平台都应理解这些动作，再由平台入口转换为打开页面、聚焦窗口、执行命令等具体行为。
 *
 * AI Agent 注意：新增动作类型时必须在所有平台实现中同步处理。
 */
export type WidgetAction =
  | { type: 'openRoute'; route: string; params?: Record<string, string> }
  | { type: 'openItem'; itemId: string }
  | { type: 'openDate'; date: string }
  | { type: 'runModuleAction'; moduleId: string; actionId: string; payload?: unknown };
