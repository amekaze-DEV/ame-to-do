# packages/platform-contracts

平台能力接口层。所有业务层只依赖这里定义的抽象接口，不依赖具体平台实现。

## 目录说明

- `src/FileSystemAdapter.ts`
- `src/NotificationAdapter.ts`
- `src/SecureStorageAdapter.ts`
- `src/NetworkAdapter.ts`
- `src/TaskSchedulerAdapter.ts`
- `src/AutoLaunchAdapter.ts`
- `src/WidgetAdapter.ts`
- `src/TrayAdapter.ts`
- `src/DisplayAdapter.ts`
- `src/PlatformAdapter.ts` - 总接口

## 依赖规则

仅可依赖 `packages/shared`。禁止依赖任何具体平台实现或 UI。
