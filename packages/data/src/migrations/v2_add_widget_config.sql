-- v2_add_widget_config.sql：新增小部件配置表
--
-- AI Agent 注意：
-- - 此脚本对应数据库版本 2
-- - 从版本 1 升级到版本 2 时执行
-- - 新增迁移脚本时必须严格递增版本号

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
);
