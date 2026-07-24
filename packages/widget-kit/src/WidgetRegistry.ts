import type { WidgetCardModel } from './WidgetCardModel';
import type { WidgetExtension } from './WidgetExtension';
import type { WidgetDataContext } from './WidgetExtension';

/**
 * 小部件配置
 * 用于控制哪些扩展被启用、卡片尺寸等
 *
 * AI Agent 注意：该配置由用户通过系统设置维护，保存到 ConfigStore。
 */
export interface WidgetConfig {
  /** 启用的扩展 ID 列表 */
  enabledExtensions: string[];
  /** 请求的卡片尺寸 */
  cardSize: 'small' | 'medium' | 'large';
}

/**
 * 小部件数据
 * 由 WidgetRegistry 收集所有启用扩展的卡片数据，
 * 通过 PlatformAdapter.widget.update() 推送到平台小部件窗口。
 */
export interface WidgetData {
  /** 卡片数据列表 */
  cards: WidgetCardModel[];
  /** 数据生成时间戳 */
  generatedAt: number;
}

/**
 * 小部件扩展注册中心
 *
 * 设计目标：
 * 1. 所有业务模块通过此中心注册小部件扩展
 * 2. 平台实现通过此中心收集所有启用扩展的卡片数据
 * 3. 业务模块与平台实现之间通过该中心解耦
 *
 * AI Agent 注意：
 * - 注册中心不保存任何业务状态，仅维护扩展的引用
 * - 收集卡片数据时应捕获每个扩展的异常，单个扩展失败不影响其他扩展
 */
export class WidgetRegistry {
  private extensions = new Map<string, WidgetExtension>();

  /**
   * 注册一个小部件扩展
   * 如果 ID 已存在会抛出错误
   */
  register(extension: WidgetExtension): void {
    if (this.extensions.has(extension.id)) {
      throw new Error(`Widget extension already registered: ${extension.id}`);
    }
    this.extensions.set(extension.id, extension);
  }

  /**
   * 注销一个小部件扩展
   */
  unregister(extensionId: string): void {
    this.extensions.delete(extensionId);
  }

  /**
   * 获取已注册的扩展
   */
  get(extensionId: string): WidgetExtension | undefined {
    return this.extensions.get(extensionId);
  }

  /**
   * 列出所有已注册扩展
   */
  listAll(): WidgetExtension[] {
    return [...this.extensions.values()];
  }

  /**
   * 列出启用的扩展
   */
  listEnabled(config: WidgetConfig): WidgetExtension[] {
    return [...this.extensions.values()].filter(
      (ext) => config.enabledExtensions.includes(ext.id),
    );
  }

  /**
   * 收集所有启用扩展的卡片数据
   *
   * AI Agent 注意：
   * - 单个扩展抛错不应中断整个收集流程
   * - 错误应记录到日志但不抛出
   */
  async collectCards(context: WidgetDataContext & { config: WidgetConfig }): Promise<WidgetCardModel[]> {
    const enabled = this.listEnabled(context.config);
    const results: WidgetCardModel[] = [];

    for (const ext of enabled) {
      try {
        const card = await ext.getCardData(context);
        results.push(card);
      } catch (error) {
        console.error(`[WidgetRegistry] 扩展 ${ext.id} 收集卡片数据失败:`, error);
      }
    }

    return results;
  }
}

export const widgetRegistry = new WidgetRegistry();
