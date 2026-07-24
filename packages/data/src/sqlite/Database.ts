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
import { MIGRATIONS, CURRENT_SCHEMA_VERSION } from "../migrations";

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
   * 建立数据库连接并自动执行迁移
   */
  async connect(): Promise<void> {
    if (this.db) return;
    this.db = await TauriDatabase.load(this.path);
    await this.migrate();
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
   * 执行数据库迁移
   *
   * 从当前 user_version 开始，依次执行版本更高的迁移脚本，
   * 直到达到 CURRENT_SCHEMA_VERSION。
   *
   * AI Agent 注意：
   * - 每个迁移脚本在事务中执行，失败时自动回滚
   * - 迁移成功后才更新 user_version，确保部分失败不会损坏数据库
   */
  async migrate(): Promise<{ fromVersion: number; toVersion: number }> {
    if (!this.db) {
      throw new DatabaseError("Database not connected", "DB_NOT_CONNECTED");
    }

    const currentVersion = await this.getUserVersion();
    const pendingMigrations = MIGRATIONS.filter((m) => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      return { fromVersion: currentVersion, toVersion: currentVersion };
    }

    console.log(
      `[Database] 开始迁移：从 v${currentVersion} 到 v${CURRENT_SCHEMA_VERSION}，共 ${pendingMigrations.length} 个迁移脚本`,
    );

    for (const migration of pendingMigrations) {
      try {
        await this.beginTransaction();
        await this.executeBatch(migration.sql);
        await this.setUserVersion(migration.version);
        await this.commitTransaction();
        console.log(`[Database] 迁移 v${migration.version} 完成：${migration.description}`);
      } catch (error) {
        await this.rollbackTransaction();
        console.error(`[Database] 迁移 v${migration.version} 失败：${migration.description}`, error);
        throw new DatabaseError(
          `Migration v${migration.version} failed: ${error instanceof Error ? error.message : String(error)}`,
          "DB_MIGRATION_FAILED",
        );
      }
    }

    return { fromVersion: currentVersion, toVersion: CURRENT_SCHEMA_VERSION };
  }

  /**
   * 批量执行多条 SQL 语句
   *
   * AI Agent 注意：
   * - 按分号分割 SQL 语句，跳过空语句
   * - 不会处理字符串字面量内部的分号，迁移脚本应避免在字符串中使用分号
   */
  private async executeBatch(sql: string): Promise<void> {
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await this.execute(statement);
    }
  }

  /**
   * 获取当前 schema 版本号
   */
  getCurrentSchemaVersion(): number {
    return CURRENT_SCHEMA_VERSION;
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
