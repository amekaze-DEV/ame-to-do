/**
 * 网络请求适配器类型
 *
 * AI Agent 注意：
 * - WebDAV、节假日更新等所有网络请求必须通过此接口
 * - 业务代码禁止直接使用 fetch、axios 等网络 API
 * - 平台实现应统一处理超时、重试、证书校验等
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'PROPFIND' | 'MKCOL' | 'MOVE' | 'COPY';

export interface RequestOptions {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: string | ArrayBuffer;
  /** 超时时间（毫秒），默认 30000 */
  timeoutMs?: number;
  /** 是否跳过 SSL 证书校验（仅限自建服务场景） */
  allowInsecure?: boolean;
  /** Basic 认证用户名 */
  username?: string;
  /** Basic 认证密码 */
  password?: string;
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  /** 原始二进制响应体（可选） */
  arrayBuffer?: () => Promise<ArrayBuffer>;
}

export interface NetworkAdapter {
  /**
   * 发送 HTTP 请求
   *
   * AI Agent 注意：WebDAV 协议使用的 PROPFIND/MKCOL/MOVE/COPY 等非标准 HTTP 方法，
   * 平台实现应确保支持这些扩展方法。
   */
  request(options: RequestOptions): Promise<ResponseData>;
}
