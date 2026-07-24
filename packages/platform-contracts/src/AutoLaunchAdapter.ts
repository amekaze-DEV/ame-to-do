/**
 * 开机启动适配器类型
 *
 * AI Agent 注意：
 * - Windows: 通过注册表或启动文件夹实现
 * - macOS: 通过 LaunchAgents 实现
 * - Android: 通过 BOOT_COMPLETED 广播实现
 * - 业务代码禁止直接操作注册表或启动文件夹，必须通过此接口
 */

export interface AutoLaunchAdapter {
  /**
   * 检查当前是否已设置开机启动
   */
  isEnabled(): Promise<boolean>;

  /**
   * 启用开机启动
   * @throws 权限不足或系统限制时抛出错误
   */
  enable(): Promise<void>;

  /**
   * 禁用开机启动
   */
  disable(): Promise<void>;
}
