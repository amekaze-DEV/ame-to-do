/**
 * 安全存储适配器类型
 *
 * AI Agent 注意：
 * - 此接口仅用于存储敏感信息，如 WebDAV 密码、授权令牌等
 * - 平台实现应使用系统级安全存储（Windows Credential Manager、macOS Keychain、Android Keystore 等）
 * - 敏感信息绝对不能明文写入普通文件或日志
 */

export interface SecureStorageAdapter {
  /**
   * 保存凭据
   * @param key 凭据标识，建议使用业务含义前缀，例如 'webdav.password'
   * @param value 要保存的敏感值（密码、令牌等）
   */
  setCredential(key: string, value: string): Promise<void>;

  /**
   * 读取凭据
   * @returns 凭据值，不存在时返回 null
   */
  getCredential(key: string): Promise<string | null>;

  /**
   * 删除凭据
   */
  deleteCredential(key: string): Promise<void>;
}
