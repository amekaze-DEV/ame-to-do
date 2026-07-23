# packages/services

平台无关业务服务层。包含 CalendarService、ItemService、SyncService、ModuleSettingsService、WidgetDataService 等。

## 目录说明

- `src/calendar/` - CalendarService / ShiftAssistantService
- `src/item-manager/` - ItemService / ReminderService
- `src/sync/` - SyncService / ConflictResolver
- `src/module-settings/` - 模块开关业务服务
- `src/widget-data/` - 小部件数据组装，不负责窗口创建

## 依赖规则

可依赖 `packages/domain`、`packages/data` 接口、`packages/platform-contracts`。禁止依赖 `packages/platform-implementations` 和 Tauri 命令。
