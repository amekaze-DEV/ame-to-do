import type { WidgetAction, WidgetCardSize, WidgetRefreshPolicy } from './types';
import type { WidgetCardModel } from './WidgetCardModel';

/**
 * 小部件扩展上下文
 * 用于小部件获取卡片数据时的运行时环境信息
 *
 * AI Agent 注意：新增上下文字段时必须同步更新所有调用方。
 */
export interface WidgetDataContext {
  /** 当前语言代码 */
  language: string;
  /** 当前主题模式 */
  theme: 'light' | 'dark' | 'system';
  /** 显示器 DPI 缩放比例 */
  scaleFactor: number;
  /** 当前请求的卡片尺寸 */
  cardSize?: WidgetCardSize;
}

/**
 * 小部件动作上下文
 * 用于处理动作时的运行时环境信息
 *
 * AI Agent 注意：扩展字段时同步更新所有动作处理器。
 */
export interface WidgetActionContext {
  /** 触发动作的小部件扩展 ID */
  extensionId: string;
  /** 请求打开的卡片尺寸 */
  cardSize?: WidgetCardSize;
}

/**
 * 小部件扩展接口
 *
 * 这是业务模块向小部件提供内容的唯一扩展点。
 * 后续新增功能模块（如排班、统计、生产提醒）时，
 * 应通过实现此接口注册小部件卡片，不要直接修改 Windows 小部件窗口逻辑。
 *
 * AI Agent 注意：
 * 1. 每个扩展的 id 必须唯一，建议使用模块名作为前缀，例如 item.todayTodo
 * 2. getCardData() 必须是纯函数，不得直接操作平台 API
 * 3. handleAction() 中应通过事件总线或模块上下文触发业务逻辑
 */
export interface WidgetExtension {
  /** 扩展唯一标识，建议使用模块名作为前缀，例如 item.todayTodo */
  readonly id: string;
  /** 来源模块 ID，例如 calendar、item-manager、shift-schedule */
  readonly moduleId: string;
  /** 卡片显示名称 */
  readonly title: string;
  /** 默认是否在小部件中启用 */
  readonly defaultEnabled: boolean;
  /** 卡片支持的尺寸 */
  readonly supportedSizes: WidgetCardSize[];
  /** 刷新策略 */
  readonly refreshPolicy: WidgetRefreshPolicy;
  /**
   * 获取标准化卡片数据
   * 所有平台的小部件 UI 都基于此模型渲染
   */
  getCardData(context: WidgetDataContext): Promise<WidgetCardModel>;
  /**
   * 处理卡片点击、按钮点击等标准动作
   * 通过事件总线或模块上下文转发到业务逻辑
   */
  handleAction?(action: WidgetAction, context: WidgetActionContext): Promise<void>;
}
