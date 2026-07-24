-- v1_init.sql：初始建表脚本
--
-- AI Agent 注意：
-- - 此脚本对应数据库版本 1，首次运行时执行
-- - 禁止直接修改此脚本，新增表或修改表结构必须创建新版本的迁移脚本
-- - 版本号通过 PRAGMA user_version 管理

-- 统一事项表
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

-- 节假日缓存表
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

-- 班次模板表
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

-- 轮班周期表
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

-- 临时班次调整表
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

-- 同步元数据表
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 模块开关状态表
CREATE TABLE IF NOT EXISTS module_states (
  module_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);
