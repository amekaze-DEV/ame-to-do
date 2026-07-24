import type { FileSystemAdapter } from './FileSystemAdapter';
import type { NotificationAdapter } from './NotificationAdapter';
import type { SecureStorageAdapter } from './SecureStorageAdapter';
import type { NetworkAdapter } from './NetworkAdapter';
import type { TaskSchedulerAdapter } from './TaskSchedulerAdapter';
import type { AutoLaunchAdapter } from './AutoLaunchAdapter';
import type { WidgetAdapter } from './WidgetAdapter';
import type { TrayAdapter } from './TrayAdapter';
import type { DisplayAdapter } from './DisplayAdapter';

/**
 * 平台适配器总接口
 *
 * 这是业务代码访问平台特定能力的唯一入口。
 * 所有平台能力必须通过此接口暴露，业务代码禁止直接调用：
 * - Tauri API（invoke、window.__TAURI__ 等）
 * - window 对象上的平台特定属性
 * - Node.js fs/path 等模块
 * - 浏览器 API（除了标准 DOM 操作）
 *
 * AI Agent 注意：
 * 1. 新增平台能力时必须先在此接口中定义，然后在各平台实现中分别实现
 * 2. 平台实现代码位于 packages/platform-implementations/[platform]/ 目录
 * 3. 每个子适配器应保持单一职责，不要把不同能力混合在一个适配器中
 * 4. WidgetAdapter 只表示平台小部件承载能力，小部件内容由 widget-kit 包负责
 * 5. 模块注册系统的 ModuleContext 中注入的 platform 即此接口实例
 */
export interface PlatformAdapter {
  /** 文件系统操作 */
  filesystem: FileSystemAdapter;
  /** 系统通知 */
  notification: NotificationAdapter;
  /** 安全存储（密码、令牌等敏感信息） */
  secureStorage: SecureStorageAdapter;
  /** 网络请求（HTTP/WebDAV） */
  network: NetworkAdapter;
  /** 周期性任务调度 */
  taskScheduler: TaskSchedulerAdapter;
  /** 开机启动 */
  autoLaunch: AutoLaunchAdapter;
  /** 桌面小部件（初始版本仅 Windows 实现） */
  widget: WidgetAdapter;
  /** 系统托盘/菜单栏 */
  tray: TrayAdapter;
  /** 显示器信息与 DPI 缩放 */
  display: DisplayAdapter;
}
