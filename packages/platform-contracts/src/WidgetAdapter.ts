/**
 * 小部件适配器类型
 *
 * 设计原则：
 * WidgetAdapter 只表示平台小部件的承载能力（创建窗口、更新内容、设置属性等），
 * 不定义小部件应该显示什么内容。小部件内容由 widget-kit 包中的 WidgetExtension
 * 体系生成，平台实现仅负责将标准化卡片数据渲染为平台 UI。
 *
 * 初始版本仅要求 Windows 平台实现。其他平台不得直接复用 Windows 悬浮窗形态，
 * 应基于各自平台特性单独实现，例如：
 * - macOS: 菜单栏项 / 桌面组件
 * - Android/iOS: App Widget
 * - Linux: 桌面组件
 * - 鸿蒙: 服务卡片
 *
 * AI Agent 注意：平台实现应在 packages/platform-implementations/[platform]/ 中，
 * 业务代码禁止直接创建或操作平台小部件窗口。
 */

/** 小部件配置（平台适配器使用） */
export interface WidgetConfig {
  /** 窗口位置 X */
  positionX: number;
  /** 窗口位置 Y */
  positionY: number;
  /** 窗口宽度 */
  width: number;
  /** 窗口高度 */
  height: number;
  /** 背景透明度（0-1） */
  opacity: number;
}

/** 卡片行（简化版，供 WidgetData 使用） */
export interface WidgetCardRow {
  id: string;
  primaryText: string;
  secondaryText?: string;
  badge?: string;
  priority?: 'high' | 'medium' | 'low';
}

/** 卡片模型（简化版，供 WidgetData 使用） */
export interface WidgetCardModel {
  id: string;
  title: string;
  summary?: string;
  rows: WidgetCardRow[];
  updatedAt: number;
  emptyText?: string;
}

/** 小部件数据（由 WidgetRegistry 收集，推送到平台窗口） */
export interface WidgetData {
  cards: WidgetCardModel[];
  generatedAt: number;
}

export interface WidgetAdapter {
  /**
   * 创建平台小部件承载窗口
   * 初始版本仅要求 Windows 实现
   */
  create(config: WidgetConfig): Promise<void>;

  /**
   * 更新平台小部件窗口中的标准化卡片数据
   * 平台实现负责将 WidgetCardModel 转换为各自平台的 UI 形式
   */
  update(data: WidgetData): Promise<void>;

  /**
   * 关闭并销毁小部件
   */
  close(): Promise<void>;

  /**
   * 设置小部件位置
   */
  setPosition(x: number, y: number): Promise<void>;

  /**
   * 设置小部件大小
   */
  setSize(width: number, height: number): Promise<void>;

  /**
   * 设置背景透明度（0-1）
   */
  setOpacity(opacity: number): Promise<void>;
}
