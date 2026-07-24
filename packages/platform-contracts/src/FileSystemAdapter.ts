/**
 * 文件系统适配器类型
 *
 * AI Agent 注意：
 * - 所有路径都应相对于平台数据目录，或使用绝对路径
 * - 平台实现应确保所有文件操作不跨越数据目录边界（安全考虑）
 * - 错误处理由调用方负责，适配器只负责抛出原始错误
 */

export interface FileSystemAdapter {
  /**
   * 获取平台数据目录路径
   * Windows: %LOCALAPPDATA%/com.ame.todo 或便携模式下的 ./ame-to-do-data
   * macOS: ~/Library/Application Support/com.ame.todo
   * Android: /data/data/com.ame.todo/files
   */
  getDataDir(): Promise<string>;

  /**
   * 读取文本文件内容
   * @param path 文件路径（相对数据目录或绝对路径）
   * @throws 文件不存在或无权限时抛出错误
   */
  readTextFile(path: string): Promise<string>;

  /**
   * 写入文本文件
   * @param path 文件路径
   * @param content 要写入的文本内容
   */
  writeTextFile(path: string, content: string): Promise<void>;

  /**
   * 检查路径是否存在
   */
  exists(path: string): Promise<boolean>;

  /**
   * 创建目录
   * @param recursive 是否递归创建父目录，默认 false
   */
  createDir(path: string, recursive?: boolean): Promise<void>;
}
