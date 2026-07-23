# packages/domain

业务领域模型，禁止依赖 UI 和平台 API。包含日期、农历、节假日、倒班助手、事项、提醒、重复规则、同步实体等领域对象。

## 目录说明

- `src/calendar/` - 日期、农历、节假日、倒班助手领域模型
- `src/item/` - 事项、提醒、重复规则领域模型
- `src/sync/` - 同步实体、冲突实体、设备实体
- `src/shared/` - 领域层共享类型和值对象

## 依赖规则

仅可依赖 `packages/shared`。禁止依赖任何 UI、Tauri、平台实现。
