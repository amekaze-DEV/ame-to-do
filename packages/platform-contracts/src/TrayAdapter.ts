/**
 * 托盘适配器类型
 *
 * 初始版本仅要求 Windows 平台实现。
 * macOS 实现菜单栏图标；Linux 实现应用指示器；移动端不提供此能力。
 *
 * AI Agent 注意：业务代码禁止直接操作托盘图标，必须通过此接口。
 */

export type TrayMenuItem =
  | { type: 'separator' }
  | {
      type: 'item';
      id: string;
      label: string;
      /** 是否可选（带勾选框） */
      checkable?: boolean;
      /** 是否选中 */
      checked?: boolean;
      /** 是否禁用 */
      disabled?: boolean;
    }
  | {
      type: 'submenu';
      id: string;
      label: string;
      items: TrayMenuItem[];
    };

export interface TrayAdapter {
  /**
   * 创建托盘图标
   * @param iconPath 图标文件路径
   * @param tooltip 鼠标悬停时显示的提示文字
   */
  create(iconPath: string, tooltip: string): Promise<void>;

  /**
   * 更新托盘菜单
   * 菜单项点击通过事件总线触发 tray:click 事件
   */
  setMenu(items: TrayMenuItem[]): Promise<void>;

  /**
   * 显示气泡提示
   * Windows 右下角弹出通知；macOS 菜单栏提示；移动端通知
   */
  showBalloon(title: string, content: string): Promise<void>;
}
