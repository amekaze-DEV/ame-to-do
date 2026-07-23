/**
 * SQLite 数据库连接管理器
 *
 * 基于 @tauri-apps/plugin-sql 封装，提供统一的连接、执行、查询和版本管理能力。
 *
 * AI Agent 注意：
 * - 修改表结构时必须新增迁移脚本，不得直接修改已有迁移脚本
 * - 所有数据库操作应通过此类的实例方法完成，禁止在业务层直接调用 plugin-sql
 */
import TauriDatabase, { QueryResult } from "@tauri-apps/plugin-sql";

const DEFAULT_DB_PATH = "sqlite:ame-to-do.db";

export interface DatabaseOptions {
  /** 数据库路径，默认 sqlite:ame-to-do.db */
  path?: string;
}

/**
 * 数据库查询结果行
 */
export type QueryRow = Record<string, unknown>;

/**
 * 数据库连接管理类
 */
export class Database {
  private db: TauriDatabase | null = null;
  private readonly path: string;

  constructor(options: DatabaseOptions = {}) {
    this.path = options.path ?? DEFAULT_DB_PATH;
  }

  /**
   * 建立数据库连接
   */
  async connect(): Promise<void> {
    if (this.db) return;
    this.db = await TauriDatabase.load(this.path);
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (!this.db) return;
    await this.db.close();
    this.db = null;
  }

  /**
   * 执行不返回结果的 SQL（INSERT/UPDATE/CREATE 等）
   */
  async execute(sql: string, bindValues?: unknown[]): Promise<QueryResult> {
    if (!this.db) {
      throw new DatabaseError("Database not connected", "DB_NOT_CONNECTED");
    }
    return this.db.execute(sql, bindValues);
  }

  /**
   * 执行返回多行的查询
   */
  async select<T extends QueryRow = QueryRow>(sql: string, bindValues?: unknown[]): Promise<T[]> {
    if (!this.db) {
      throw new DatabaseError("Database not connected", "DB_NOT_CONNECTED");
    }
    return this.db.select<T[]>(sql, bindValues);
  }

  /**
   * 执行返回单行或 null 的查询
   */
  async selectOne<T extends QueryRow = QueryRow>(
    sql: string,
    bindValues?: unknown[],
  ): Promise<T | null> {
    const rows = await this.select<T>(sql, bindValues);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 获取数据库用户版本（PRAGMA user_version）
   */
  async getUserVersion(): Promise<number> {
    const row = await this.selectOne<{ user_version: number }>("PRAGMA user_version");
    return row?.user_version ?? 0;
  }

  /**
   * 设置数据库用户版本（PRAGMA user_version）
   */
  async setUserVersion(version: number): Promise<void> {
    await this.execute(`PRAGMA user_version = ${version}`);
  }

  /**
   * 开始事务
   */
  async beginTransaction(): Promise<void> {
    await this.execute("BEGIN TRANSACTION");
  }

  /**
   * 提交事务
   */
  async commitTransaction(): Promise<void> {
    await this.execute("COMMIT");
  }

  /**
   * 回滚事务
   */
  async rollbackTransaction(): Promise<void> {
    await this.execute("ROLLBACK");
  }

  /**
   * 检查当前是否已连接
   */
  isConnected(): boolean {
    return this.db !== null;
  }
}

/**
 * 数据库错误对象
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}
