/**
 * 显示器适配器类型
 *
 * 用于获取显示器信息、DPI 缩放等，供：
 * - 小部件在多显示器环境下定位
 * - DPI 自适应（Tailwind rem 基准计算）
 * - 判断其他应用是否全屏（用于小部件自动隐藏）
 *
 * AI Agent 注意：平台实现应确保 DPI 变化时通过事件通知业务层。
 */

export interface DisplayInfo {
  /** 显示器唯一标识 */
  id: string;
  /** 是否为主显示器 */
  isPrimary: boolean;
  /** 显示器位置 X */
  x: number;
  /** 显示器位置 Y */
  y: number;
  /** 显示器宽度（逻辑像素） */
  width: number;
  /** 显示器高度（逻辑像素） */
  height: number;
  /** DPI 缩放比例，例如 1.0 表示 100%，1.5 表示 150% */
  scaleFactor: number;
}

export interface DisplayAdapter {
  /**
   * 获取所有显示器信息
   */
  getDisplays(): Promise<DisplayInfo[]>;

  /**
   * 获取主显示器当前 DPI 缩放比例
   */
  getScaleFactor(): Promise<number>;

  /**
   * 获取主显示器尺寸（逻辑像素）
   */
  getPrimaryDisplaySize(): Promise<{ width: number; height: number }>;

  /**
   * 监听显示器变化（分辨率、缩放、新增/移除显示器）
   * @returns 取消监听函数
   */
  onDisplayChanged(callback: () => void): () => void;
}
