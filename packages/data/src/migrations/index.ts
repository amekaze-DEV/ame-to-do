/**
 * 数据库迁移脚本管理
 *
 * 设计原则：
 * 1. 每个迁移脚本对应一个数据库版本号（从 1 开始递增）
 * 2. 迁移脚本在构建时嵌入到 bundle 中，不依赖运行时文件读取
 * 3. 版本号通过 SQLite 的 PRAGMA user_version 管理
 * 4. 新增迁移时必须递增版本号，不得修改已有迁移脚本
 *
 * AI Agent 注意：
 * - 新增迁移脚本的步骤：
 *   1. 在 migrations/ 目录下创建 v{n}_description.sql
 *   2. 在 MIGRATIONS 数组中添加新的 { version, sql } 条目
 *   3. 更新 CURRENT_SCHEMA_VERSION
 * - 绝对不要修改已有的迁移 SQL，否则已部署用户的数据会损坏
 * - 如果需要回滚，请创建新的正向迁移脚本而不是修改旧脚本
 */

const v1InitSql = `-- v1_init.sql：初始建表脚本
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL CHECK(item_type IN ('todo', 'timed')),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
  due_at INTEGER,
  remind_at INTEGER,
  repeat_rule TEXT DEFAULT 'none',
  enabled INTEGER NOT NULL DEFAULT 1,
  last_triggered_at INTEGER,
  next_trigger_at INTEGER,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'done')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  device_id TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'syncing', 'synced', 'conflict', 'failed')),
  sync_version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_items_type ON items(item_type);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_priority ON items(priority);
CREATE INDEX IF NOT EXISTS idx_items_due ON items(due_at);
CREATE INDEX IF NOT EXISTS idx_items_next_trigger ON items(next_trigger_at);
CREATE INDEX IF NOT EXISTS idx_items_sync ON items(sync_status);

CREATE TABLE IF NOT EXISTS calendar_cache (
  date TEXT PRIMARY KEY,
  lunar_date TEXT,
  solar_term TEXT,
  holiday_name TEXT,
  is_workday INTEGER,
  holiday_type TEXT,
  data_version INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS shift_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  cross_day INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  device_id TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS shift_schedules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  cycle_json TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  device_id TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS shift_overrides (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  shift_template_id TEXT NOT NULL,
  reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  device_id TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_shift_templates_sync ON shift_templates(sync_status);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_enabled ON shift_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_shift_overrides_date ON shift_overrides(date);
CREATE INDEX IF NOT EXISTS idx_shift_overrides_sync ON shift_overrides(sync_status);

CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS module_states (
  module_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);`;

const v2AddWidgetConfigSql = `-- v2_add_widget_config.sql：新增小部件配置表
CREATE TABLE IF NOT EXISTS widget_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  position_x INTEGER DEFAULT 100,
  position_y INTEGER DEFAULT 100,
  width INTEGER DEFAULT 300,
  height INTEGER DEFAULT 400,
  opacity REAL DEFAULT 0.9,
  show_today INTEGER DEFAULT 1,
  show_todos INTEGER DEFAULT 1,
  show_reminders INTEGER DEFAULT 1,
  auto_hide_fullscreen INTEGER DEFAULT 1,
  screen_index INTEGER DEFAULT 0,
  updated_at INTEGER NOT NULL
);`;

/**
 * 迁移脚本条目
 */
export interface MigrationScript {
  /** 目标数据库版本号 */
  version: number;
  /** 迁移描述 */
  description: string;
  /** 要执行的 SQL 语句（可包含多条语句，用分号分隔） */
  sql: string;
}

/**
 * 所有已注册的迁移脚本
 * 按版本号从小到大排序，AI Agent 新增迁移时在此数组末尾追加
 */
export const MIGRATIONS: MigrationScript[] = [
  {
    version: 1,
    description: '初始建表：items、calendar_cache、shift_templates、shift_schedules、shift_overrides、sync_metadata、module_states',
    sql: v1InitSql,
  },
  {
    version: 2,
    description: '新增 widget_config 表',
    sql: v2AddWidgetConfigSql,
  },
];

/**
 * 当前数据库 schema 版本号
 * AI Agent 新增迁移脚本后必须同步更新此值
 */
export const CURRENT_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
