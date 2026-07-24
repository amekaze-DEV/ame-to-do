import type { WidgetAction } from './types';

/**
 * 小部件卡片内容行
 * 用于表示待办、提醒、排班等列表型内容
 *
 * AI Agent 注意：所有平台的小部件 UI 都应基于此模型渲染，
 * 禁止在平台实现中直接访问业务数据。
 */
export interface WidgetCardRow {
  id: string;
  primaryText: string;
  secondaryText?: string;
  badge?: string;
  priority?: 'high' | 'medium' | 'low';
  action?: WidgetAction;
}

/**
 * 小部件标准卡片模型
 * Windows 桌面小部件、未来移动端 Widget 和鸿蒙服务卡片都应从该模型转换为各自平台 UI。
 *
 * AI Agent 注意：该模型是平台无关的，新增字段时必须同步更新所有平台实现。
 */
export interface WidgetCardModel {
  /** 卡片唯一 ID */
  id: string;
  /** 卡片标题 */
  title: string;
  /** 卡片摘要文本 */
  summary?: string;
  /** 卡片内容行，适合待办、提醒、排班等列表型内容 */
  rows: WidgetCardRow[];
  /** 右上角或底部快捷动作 */
  actions?: WidgetAction[];
  /** 更新时间，用于展示数据新鲜度（Unix 毫秒时间戳） */
  updatedAt: number;
  /** 空状态文案 */
  emptyText?: string;
}
