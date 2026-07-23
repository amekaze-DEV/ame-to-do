# packages/data

数据访问层，数据库实现可替换。包含仓库接口、SQLite 具体实现、迁移脚本、表结构定义和备份恢复逻辑。

## 目录说明

- `src/repositories/` - ItemRepository / CalendarRepository / ShiftRepository 等接口
- `src/sqlite/` - SQLite 具体实现
- `src/migrations/` - 数据迁移脚本
- `src/schemas/` - 表结构定义
- `src/backup/` - 备份与恢复逻辑

## 依赖规则

可依赖 `packages/domain`、`packages/shared`。禁止依赖 UI、Tauri 窗口、系统通知。
