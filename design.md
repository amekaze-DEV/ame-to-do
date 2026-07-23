# AME to do 技术设计文档

## 文档信息

| 项目 | 内容 |
|---|---|
| 项目名称 | AME to do |
| 文档类型 | 技术设计文档 |
| 对应 PRD | requirements.md |
| 初始目标平台 | Windows |
| 技术栈 | Tauri + TypeScript + React/Vue + SQLite |
| 文档状态 | 初版设计草案 |

## 设计目标

1. 实现单文件便携封装，运行时自动创建同级数据目录
2. 采用模块化架构，支持模块开关管理，各模块独立加载、独立启用
3. 本地优先，无网络时核心功能完整可用
4. 通过 WebDAV 实现跨端数据同步
5. 平台适配层封装所有 Windows 特定能力，为后续跨平台预留接口
6. 代码结构清晰、注释详尽，便于 AI Agent 后续维护和扩展

## 系统架构

### 整体架构

AME to do 采用分层架构，自上而下分为：

```text
┌─────────────────────────────────────────────────────────────┐
│                      用户界面层 (UI Layer)                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐   │
│  │  万年历  │ │ 事项管理 │ │ 模块管理 │ │    系统设置      │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘   │
│  ┌─────────┐ ┌─────────┐                                   │
│  │ 桌面小部件│ │  首页   │                                   │
│  └─────────┘ └─────────┘                                   │
├─────────────────────────────────────────────────────────────┤
│                   业务逻辑层 (Business Layer)                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ CalendarService│ │ ItemService │ │ ModuleManager       │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ SyncService │ │ AutoLaunch  │ │ WidgetService       │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    数据访问层 (Data Layer)                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐   │
│  │ ConfigStore│ │ SQLite  │ │ SyncMeta │ │   CacheManager  │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                   平台适配层 (Platform Adapter)               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────┐ │
│  │ FileSystem│ │Notification│ │SecureStorage│ │Network │ │Tray│ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────┘ │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ AutoLaunch│ │  Widget  │ │ TaskScheduler│ │DisplayAdapter│          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 架构原则

| 原则 | 说明 |
|---|---|
| 本地优先 | 所有业务逻辑以本地数据为基准，网络仅作为同步通道 |
| 模块隔离 | 各业务模块通过统一接口注册，模块间禁止直接依赖 |
| 平台抽象 | 所有平台特定能力必须通过 Platform Adapter 访问 |
| 数据驱动 | UI 层只负责展示，状态变更通过事件总线或服务层通知 |
| 单文件便携 | 构建产物为单个可执行文件，数据目录运行时自动创建 |

## 技术选型

### 技术栈确认

| 层级 | 技术 | 版本建议 | 选型原因 |
|---|---|---|---|
| 桌面应用壳 | Tauri | v2 | 体积小（<10MB）、Rust 后端性能高、可调用系统 API、支持单文件分发 |
| UI 框架 | React | v18+ | 生态成熟、组件化程度高、TypeScript 支持好 |
| 状态管理 | Zustand | v4+ | 轻量、无样板代码、支持持久化、适合中小型应用 |
| 本地存储 | SQLite | v3 | 结构化查询、事务支持、便于数据迁移、单文件数据库 |
| SQLite 驱动 | @tauri-apps/plugin-sql | Tauri 官方 | Tauri 官方插件，与前端集成简单 |
| 构建工具 | Vite | v5+ | 快速 HMR、与 Tauri 集成成熟 |
| 语言 | TypeScript | v5+ | 类型安全、便于 AI Agent 理解代码结构 |
| 样式方案 | Tailwind CSS | v3+ | 原子化 CSS、响应式友好、便于 DPI 适配 |
| 日期处理 | date-fns | v3+ | 模块化、支持农历转换插件、Tree-shaking 友好 |
| 农历计算 | lunar-javascript | - | 纯 JavaScript 农历计算，无需外部依赖 |
| HTTP 客户端 | fetch + tauri-http | 内置 | Tauri 内置 HTTP API，支持自定义请求头 |
| 日志 | tauri-plugin-log | 官方插件 | 支持日志轮转、等级过滤、文件输出 |

### 为什么不选 Electron

| 维度 | Electron | Tauri |
|---|---|---|
| 包体积 | ~150MB | ~10MB |
| 内存占用 | 高（Chromium 内核） | 低（系统 WebView） |
| 单文件分发 | 困难 | 原生支持 |
| 系统 API 访问 | 需额外 Native 模块 | Rust 后端直接调用 |
| 开机启动实现 | 需第三方库 | 可直接操作注册表 |

### 为什么不选tauri-plugin-store替代SQLite

初始版本数据量较小，tauri-plugin-store（JSON 文件存储）实现更简单。但 SQLite 在以下场景更有优势：

- 事项查询、筛选、排序需要复杂条件
- 数据迁移和版本升级更可控
- 后续扩展统计看板等模块时需要聚合查询
- 单文件数据库便于备份

**决策**：优先使用 SQLite，但如果开发资源紧张，可先使用 JSON 文件存储，通过数据版本机制预留迁移到 SQLite 的能力。

## 项目目录结构

项目采用迁移友好的 Monorepo 结构。`apps/` 只放平台入口和壳工程，`packages/` 放可复用的业务核心、UI、数据、同步和平台抽象，`packages/platform-implementations/` 放各平台的具体实现。后续迁移到 macOS、Linux、Android、iOS 或鸿蒙时，优先新增平台入口和平台实现，不修改业务核心。

```text
ame-to-do/
├── apps/                                # 各平台应用入口，只负责装配，不承载业务规则
│   ├── desktop-tauri/                   # Windows 初始版本，后续兼容 macOS / Linux
│   │   ├── src/                         # 桌面端前端入口
│   │   │   ├── main.tsx                 # React 应用挂载入口
│   │   │   ├── App.tsx                  # 桌面端根组件，只组合路由和布局
│   │   │   ├── routes/                  # 桌面端页面路由
│   │   │   └── app-shell/               # 桌面窗口、托盘、小部件窗口装配
│   │   ├── src-tauri/                   # Tauri Rust 后端，仅用于桌面平台能力桥接
│   │   │   ├── src/
│   │   │   │   ├── main.rs              # Tauri 入口
│   │   │   │   ├── lib.rs               # Tauri 命令注册
│   │   │   │   ├── commands/            # Rust 命令，禁止写业务规则
│   │   │   │   │   ├── fs.rs            # 文件系统命令
│   │   │   │   │   ├── notification.rs  # 通知命令
│   │   │   │   │   ├── autolaunch.rs    # 开机启动命令
│   │   │   │   │   ├── widget.rs        # 小部件命令
│   │   │   │   │   └── tray.rs          # 托盘命令
│   │   │   │   └── utils/               # Rust 侧工具函数
│   │   │   ├── Cargo.toml
│   │   │   └── tauri.conf.json
│   │   ├── public/                      # 桌面端静态资源
│   │   └── package.json                 # 桌面端构建脚本
│   ├── mobile-capacitor/                # 预留：Android / iOS / 鸿蒙移动端入口
│   │   └── README.md                    # 说明迁移时如何接入移动端壳
│   └── web-preview/                     # 预留：浏览器预览和调试入口，不作为正式产品形态
│       └── README.md
├── packages/                            # 可复用代码，平台迁移时尽量不改
│   ├── core/                            # 应用核心框架，平台无关
│   │   ├── src/
│   │   │   ├── app/                     # 启动流程、生命周期、运行模式
│   │   │   │   ├── bootstrap.ts
│   │   │   │   └── lifecycle.ts
│   │   │   ├── module/                  # 模块注册、加载、开关、依赖检测
│   │   │   │   ├── ModuleRegistry.ts
│   │   │   │   ├── ModuleLoader.ts
│   │   │   │   ├── ModuleManager.ts
│   │   │   │   └── types.ts
│   │   │   ├── event/                   # 事件总线，模块间通信唯一入口
│   │   │   ├── config/                  # 配置读写抽象
│   │   │   ├── log/                     # 日志抽象
│   │   │   └── errors/                  # 错误码和错误对象
│   │   └── README.md
│   ├── domain/                          # 业务领域模型，禁止依赖 UI 和平台 API
│   │   ├── src/
│   │   │   ├── calendar/                # 日期、农历、节假日、倒班助手领域模型
│   │   │   ├── item/                    # 事项、提醒、重复规则领域模型
│   │   │   ├── sync/                    # 同步实体、冲突实体、设备实体
│   │   │   └── shared/                  # 领域层共享类型和值对象
│   │   └── README.md
│   ├── services/                        # 平台无关业务服务
│   │   ├── src/
│   │   │   ├── calendar/                # CalendarService / ShiftAssistantService
│   │   │   ├── item-manager/            # ItemService / ReminderService
│   │   │   ├── sync/                    # SyncService / ConflictResolver
│   │   │   ├── module-settings/         # 模块开关业务服务
│   │   │   └── widget-data/             # 小部件数据组装，不负责窗口创建
│   │   └── README.md
│   ├── data/                            # 数据访问层，数据库实现可替换
│   │   ├── src/
│   │   │   ├── repositories/            # ItemRepository / CalendarRepository / ShiftRepository 等接口
│   │   │   ├── sqlite/                  # SQLite 具体实现
│   │   │   ├── migrations/              # 数据迁移脚本
│   │   │   ├── schemas/                 # 表结构定义
│   │   │   └── backup/                  # 备份与恢复逻辑
│   │   └── README.md
│   ├── platform-contracts/              # 平台能力接口，所有业务只依赖这里
│   │   ├── src/
│   │   │   ├── FileSystemAdapter.ts
│   │   │   ├── NotificationAdapter.ts
│   │   │   ├── SecureStorageAdapter.ts
│   │   │   ├── NetworkAdapter.ts
│   │   │   ├── TaskSchedulerAdapter.ts
│   │   │   ├── AutoLaunchAdapter.ts
│   │   │   ├── WidgetAdapter.ts
│   │   │   ├── TrayAdapter.ts
│   │   │   ├── DisplayAdapter.ts
│   │   │   └── PlatformAdapter.ts
│   │   └── README.md
│   ├── platform-implementations/        # 平台接口的具体实现
│   │   ├── windows-tauri/               # Windows + Tauri 实现
│   │   ├── macos-tauri/                 # 预留：macOS + Tauri 实现
│   │   ├── linux-tauri/                 # 预留：Linux + Tauri 实现
│   │   ├── mobile-capacitor/            # 预留：移动端实现
│   │   └── mock/                        # 单元测试和 Web 预览使用的模拟实现
│   ├── ui/                              # 跨端通用 UI 组件
│   │   ├── src/
│   │   │   ├── components/              # Button、Dialog、Form、List 等基础组件
│   │   │   ├── layout/                  # 响应式布局、导航、分栏
│   │   │   ├── theme/                   # 主题、DPI、字号、间距
│   │   │   └── icons/                   # 图标组件
│   │   └── README.md
│   ├── features/                        # 功能模块 UI + 模块入口
│   │   ├── calendar/                    # 万年历、倒班助手 UI 与模块声明
│   │   ├── item-manager/                # 事项管理模块 UI 与模块声明
│   │   ├── sync-settings/               # WebDAV 设置 UI 与模块声明
│   │   ├── module-manager/              # 模块开关 UI 与模块声明
│   │   ├── widget/                      # Windows 初始小部件 UI，与平台窗口创建解耦
│   │   └── settings/                    # 系统设置 UI
│   ├── widget-kit/                      # 平台无关小部件扩展协议
│   │   ├── src/
│   │   │   ├── WidgetExtension.ts       # 功能模块注册小部件卡片的标准接口
│   │   │   ├── WidgetRegistry.ts        # 小部件扩展注册中心
│   │   │   ├── WidgetCardModel.ts       # 标准卡片数据结构
│   │   │   ├── WidgetAction.ts          # 标准点击动作协议
│   │   │   └── WidgetRefreshPolicy.ts   # 标准刷新策略
│   │   └── README.md
│   ├── sync-webdav/                     # WebDAV 协议实现，平台无关
│   │   ├── src/
│   │   │   ├── WebDAVClient.ts
│   │   │   ├── WebDAVPath.ts
│   │   │   └── WebDAVErrors.ts
│   │   └── README.md
│   └── shared/                          # 跨包共享工具
│       ├── src/
│       │   ├── types/
│       │   ├── utils/
│       │   ├── constants/
│       │   └── testing/
│       └── README.md
├── docs/                                # 项目文档
│   ├── ARCHITECTURE.md                  # 架构说明
│   ├── MODULE_GUIDE.md                  # 模块开发指南
│   ├── PORTING_GUIDE.md                 # 跨平台移植指南
│   └── PLATFORM_MATRIX.md               # 各平台能力支持矩阵
├── scripts/                             # 构建、发布、检查脚本
│   ├── build-desktop.js
│   ├── build-single-file.js
│   ├── check-boundaries.js              # 检查跨层依赖，防止平台代码污染业务层
│   └── release.js
├── package.json                         # Monorepo 根配置
├── pnpm-workspace.yaml                  # 工作区配置
├── tsconfig.base.json                   # 全局 TS 配置
└── README.md
```

### 迁移边界规则

| 目录 | 可依赖 | 禁止依赖 | 迁移说明 |
|---|---|---|---|
| `packages/domain` | `packages/shared` | UI、Tauri、浏览器、系统 API | 领域模型必须完全平台无关，迁移时不改 |
| `packages/services` | `domain`、`data` 接口、`platform-contracts` | `platform-implementations`、Tauri 命令 | 业务服务只依赖抽象接口 |
| `packages/data` | `domain`、`shared` | UI、Tauri 窗口、系统通知 | 数据库可从 SQLite 替换为移动端存储 |
| `packages/platform-contracts` | `shared` | 任何具体平台实现 | 定义能力边界，不写实现 |
| `packages/platform-implementations` | `platform-contracts` | 业务 UI | 新平台只新增这里的实现 |
| `packages/ui` | `shared` | 业务服务、平台实现 | 基础 UI 可跨端复用 |
| `packages/features` | `ui`、`services`、`core` | 具体平台实现 | 功能 UI 通过服务和抽象平台能力工作 |
| `apps/*` | 所有需要装配的包 | 业务规则 | 应用入口只负责组装依赖和启动 |

### 移植新增平台的步骤

1. 在 `apps/` 下新增平台入口，例如 `apps/mobile-capacitor/`。
2. 在 `packages/platform-implementations/` 下新增平台实现，例如 `mobile-capacitor/`。
3. 复用 `packages/domain`、`packages/services`、`packages/data`、`packages/ui` 和 `packages/features`。
4. 根据 `docs/PLATFORM_MATRIX.md` 标记新平台已支持、待实现或不支持的能力。
5. 只在平台入口中处理窗口、权限、系统通知、文件路径、安全存储等差异。

### TRAE 维护注意

后续 TRAE 修改代码时，应先判断修改属于哪一层。凡是业务规则、数据结构、同步冲突、提醒计算等逻辑，优先修改 `packages/domain` 或 `packages/services`；凡是 Windows 通知、开机启动、托盘、窗口、小部件悬浮等能力，优先修改 `packages/platform-implementations/windows-tauri` 或 `apps/desktop-tauri/src/app-shell`。禁止为了快速实现功能而在 `apps/desktop-tauri` 中写入业务规则。

## 模块系统设计

### 模块生命周期

```text
模块生命周期状态流转：

registered（已注册）
    ↓ App 启动时扫描模块目录
inactive（已禁用）
    ↓ 用户在模块管理中启用
loading（加载中）
    ↓ 依赖检查通过，初始化完成
active（运行中）
    ↓ 用户禁用或依赖模块被禁用
unloading（卸载中）
    ↓ 清理资源完成
inactive（已禁用）
```

### 模块注册表数据结构

```typescript
// packages/core/src/module/types.ts

/**
 * 模块定义接口
 * AI Agent 注意：新增模块时必须实现此接口
 */
export interface ModuleDefinition {
  /** 模块唯一标识，建议格式：kebab-case */
  readonly id: string;
  /** 模块显示名称 */
  readonly name: string;
  /** 模块版本，遵循 semver */
  readonly version: string;
  /** 模块描述 */
  readonly description: string;
  /** 依赖模块 ID 列表 */
  readonly dependencies: string[];
  /** 所需权限 */
  readonly permissions: ModulePermission[];
  /** 数据 schema 版本 */
  readonly dataSchemaVersion: number;
  /** 模块入口函数 */
  readonly entry: (context: ModuleContext) => ModuleInstance | Promise<ModuleInstance>;
}

export interface ModuleInstance {
  /** 初始化 */
  init(): Promise<void>;
  /** 销毁，释放资源 */
  destroy(): Promise<void>;
  /** 返回模块 UI 组件（如适用） */
  getUI?(): React.ComponentType;
  /** 返回模块设置组件（如适用） */
  getSettings?(): React.ComponentType;
}

export interface ModuleContext {
  /** 事件总线 */
  eventBus: EventBus;
  /** 配置存储 */
  configStore: ConfigStore;
  /** 数据库访问 */
  database: Database;
  /** 平台适配器 */
  platform: PlatformAdapter;
  /** 日志器 */
  logger: Logger;
}

export type ModulePermission =
  | 'filesystem:read'
  | 'filesystem:write'
  | 'notification'
  | 'network'
  | 'autolaunch'
  | 'widget';
```

### 模块依赖处理

```typescript
// 伪代码：模块依赖检测与启用逻辑

/**
 * 启用模块前的依赖检查
 * @param moduleId 要启用的模块 ID
 * @returns 检查结果，包含是否可启用及缺失依赖列表
 * 
 * AI Agent 注意：此方法用于模块开关管理的依赖检测，
 * 禁用模块时也需要反向检测哪些模块依赖它
 */
function checkDependencies(moduleId: string): DependencyCheckResult {
  const module = registry.get(moduleId);
  const missingDeps = module.dependencies.filter(
    depId => !registry.get(depId)?.isEnabled
  );
  
  return {
    canEnable: missingDeps.length === 0,
    missingDependencies: missingDeps,
    // 反向依赖：哪些模块依赖当前模块
    reverseDependencies: registry.findAll(m => m.dependencies.includes(moduleId))
  };
}
```

## 数据库设计

### 表结构

```sql
-- items.sql：统一事项表
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,           -- item_前缀 + UUID
  item_type TEXT NOT NULL CHECK(item_type IN ('todo', 'timed')),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
  due_at INTEGER,                -- Unix 时间戳（秒），可为空
  remind_at INTEGER,             -- Unix 时间戳（秒），可为空
  repeat_rule TEXT DEFAULT 'none', -- none | daily | weekly | monthly | custom(JSON)
  enabled INTEGER NOT NULL DEFAULT 1, -- 0=禁用提醒，1=启用
  last_triggered_at INTEGER,     -- 最近一次触发时间
  next_trigger_at INTEGER,       -- 下一次触发时间
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'done')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,            -- 软删除标记
  device_id TEXT NOT NULL,       -- 最后修改设备 ID
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'syncing', 'synced', 'conflict', 'failed')),
  sync_version INTEGER NOT NULL DEFAULT 1  -- 用于乐观锁冲突检测
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_items_type ON items(item_type);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_priority ON items(priority);
CREATE INDEX IF NOT EXISTS idx_items_due ON items(due_at);
CREATE INDEX IF NOT EXISTS idx_items_next_trigger ON items(next_trigger_at);
CREATE INDEX IF NOT EXISTS idx_items_sync ON items(sync_status);

-- calendar_cache.sql：节假日缓存表
CREATE TABLE IF NOT EXISTS calendar_cache (
  date TEXT PRIMARY KEY,         -- YYYY-MM-DD 格式
  lunar_date TEXT,               -- 农历日期
  solar_term TEXT,               -- 节气
  holiday_name TEXT,             -- 节假日名称
  is_workday INTEGER,            -- 0=休息，1=工作日，2=调休上班
  holiday_type TEXT,             -- holiday | workday_makeup | normal
  data_version INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

-- shift_templates.sql：班次模板表
CREATE TABLE IF NOT EXISTS shift_templates (
  id TEXT PRIMARY KEY,           -- shift_template_前缀 + UUID
  name TEXT NOT NULL,            -- 白班、夜班、中班、休息等
  start_time TEXT,               -- HH:mm，休息班次可为空
  end_time TEXT,                 -- HH:mm，休息班次可为空
  cross_day INTEGER NOT NULL DEFAULT 0, -- 是否跨天
  color TEXT NOT NULL,           -- 日历显示颜色
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  device_id TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

-- shift_schedules.sql：轮班周期表
CREATE TABLE IF NOT EXISTS shift_schedules (
  id TEXT PRIMARY KEY,           -- shift_schedule_前缀 + UUID
  name TEXT NOT NULL,            -- 例如“两白两夜两休”
  start_date TEXT NOT NULL,      -- YYYY-MM-DD
  cycle_json TEXT NOT NULL,      -- JSON 数组：[{ shiftTemplateId, days }]
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  device_id TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

-- shift_overrides.sql：临时班次调整表
CREATE TABLE IF NOT EXISTS shift_overrides (
  id TEXT PRIMARY KEY,           -- shift_override_前缀 + UUID
  date TEXT NOT NULL,            -- YYYY-MM-DD
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

-- sync_metadata.sql：同步元数据表
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- module_states.sql：模块开关状态表
CREATE TABLE IF NOT EXISTS module_states (
  module_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

-- widget_config.sql：小部件配置表
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
```

### 数据版本与迁移

```typescript
// packages/data/src/sqlite/Database.ts

/**
 * 数据库管理器
 * AI Agent 注意：修改表结构时必须新增迁移脚本，
 * 不得直接修改已有迁移脚本，否则会导致已部署用户数据损坏
 */
class Database {
  private currentSchemaVersion = 2;
  
  async migrate(): Promise<void> {
    const userVersion = await this.getUserVersion();
    
    for (let v = userVersion + 1; v <= this.currentSchemaVersion; v++) {
      await this.runMigration(v);
      await this.setUserVersion(v);
    }
  }
  
  private async runMigration(version: number): Promise<void> {
    switch (version) {
      case 1:
        // 初始建表，在数据库初始化时自动执行
        break;
      case 2:
        // 新增 widget_config 表
        await this.execute(`
          CREATE TABLE IF NOT EXISTS widget_config (
            id TEXT PRIMARY KEY DEFAULT 'default',
            position_x INTEGER DEFAULT 100,
            position_y INTEGER DEFAULT 100,
            width INTEGER DEFAULT 300,
            height INTEGER DEFAULT 400,
            opacity REAL DEFAULT 0.9,
            updated_at INTEGER NOT NULL
          )
        `);
        break;
      // 后续版本在此添加，AI Agent 新增迁移时遵循此模式
    }
  }
}
```

## 平台适配层设计

### 适配器接口定义

```typescript
// packages/platform-contracts/src/PlatformAdapter.ts

/**
 * 平台适配器总接口
 * AI Agent 注意：所有平台特定能力必须在此定义抽象接口，
 * 业务代码只允许使用这些接口，禁止直接调用 Tauri API 或 window 对象
 */
export interface PlatformAdapter {
  filesystem: FileSystemAdapter;
  notification: NotificationAdapter;
  secureStorage: SecureStorageAdapter;
  network: NetworkAdapter;
  taskScheduler: TaskSchedulerAdapter;
  autoLaunch: AutoLaunchAdapter;
  widget: WidgetAdapter;
  tray: TrayAdapter;
  display: DisplayAdapter;
}

export interface FileSystemAdapter {
  /** 获取数据目录路径 */
  getDataDir(): Promise<string>;
  /** 读取文本文件 */
  readTextFile(path: string): Promise<string>;
  /** 写入文本文件 */
  writeTextFile(path: string, content: string): Promise<void>;
  /** 检查路径是否存在 */
  exists(path: string): Promise<boolean>;
  /** 创建目录 */
  createDir(path: string, recursive?: boolean): Promise<void>;
}

export interface NotificationAdapter {
  /** 检查通知权限 */
  checkPermission(): Promise<NotificationPermission>;
  /** 发送即时通知 */
  showNotification(options: NotificationOptions): Promise<void>;
  /** 注册定时通知 */
  scheduleNotification(id: string, options: NotificationOptions, triggerAt: number): Promise<void>;
  /** 取消通知 */
  cancelNotification(id: string): Promise<void>;
  /** 处理错过的通知 */
  handleMissedNotifications(): Promise<MissedNotification[]>;
}

export interface SecureStorageAdapter {
  /** 保存凭据 */
  setCredential(key: string, value: string): Promise<void>;
  /** 读取凭据 */
  getCredential(key: string): Promise<string | null>;
  /** 删除凭据 */
  deleteCredential(key: string): Promise<void>;
}

export interface NetworkAdapter {
  /** 发送 HTTP 请求 */
  request(options: RequestOptions): Promise<ResponseData>;
}

export interface TaskSchedulerAdapter {
  /** 注册定时任务 */
  scheduleTask(id: string, intervalMs: number, callback: () => void): Promise<void>;
  /** 取消定时任务 */
  cancelTask(id: string): Promise<void>;
}

export interface AutoLaunchAdapter {
  /** 检查是否已设置开机启动 */
  isEnabled(): Promise<boolean>;
  /** 设置开机启动 */
  enable(): Promise<void>;
  /** 取消开机启动 */
  disable(): Promise<void>;
}

export interface WidgetAdapter {
  /**
   * 创建平台小部件承载窗口
   * 初始版本仅要求 Windows 实现。其他平台不得直接复用 Windows 悬浮窗形态，
   * 应基于各自平台特性单独实现，例如移动端系统 Widget、鸿蒙服务卡片等。
   */
  create(config: WidgetConfig): Promise<void>;
  /** 更新平台小部件窗口中的标准化卡片数据 */
  update(data: WidgetData): Promise<void>;
  /** 关闭小部件 */
  close(): Promise<void>;
  /** 设置小部件位置 */
  setPosition(x: number, y: number): Promise<void>;
  /** 设置小部件大小 */
  setSize(width: number, height: number): Promise<void>;
  /** 设置透明度 */
  setOpacity(opacity: number): Promise<void>;
}

export interface TrayAdapter {
  /** 创建托盘图标 */
  create(iconPath: string, tooltip: string): Promise<void>;
  /** 更新托盘菜单 */
  setMenu(items: TrayMenuItem[]): Promise<void>;
  /** 显示气泡提示 */
  showBalloon(title: string, content: string): Promise<void>;
}

export interface DisplayAdapter {
  /** 获取所有显示器信息 */
  getDisplays(): Promise<DisplayInfo[]>;
  /** 获取当前 DPI 缩放比例 */
  getScaleFactor(): Promise<number>;
  /** 获取主显示器尺寸 */
  getPrimaryDisplaySize(): Promise<{ width: number; height: number }>;
  /** 监听显示器变化 */
  onDisplayChanged(callback: () => void): () => void;
}
```

### Windows 实现要点

```rust
// apps/desktop-tauri/src-tauri/src/commands/autolaunch.rs

use tauri::command;
use tauri_plugin_autostart::ManagerExt;

/**
 * Windows 开机启动实现
 * AI Agent 注意：此命令封装了 Windows 注册表操作，
 * 前端代码通过 PlatformAdapter.autoLaunch 调用，不直接访问此命令
 */
#[command]
pub async fn set_auto_launch(app: tauri::AppHandle, enable: bool) -> Result<(), String> {
    let autostart_manager = app.autolaunch();
    
    if enable {
        autostart_manager.enable()
            .map_err(|e| format!("启用开机启动失败: {}", e))?;
    } else {
        autostart_manager.disable()
            .map_err(|e| format!("禁用开机启动失败: {}", e))?;
    }
    
    Ok(())
}
```

## 倒班助手设计

### 领域模型

倒班助手归属于万年历模块，但其数据独立于节假日缓存。班次模板、轮班周期和临时调整都属于用户数据，需要本地保存并参与 WebDAV 同步。

```typescript
// packages/domain/src/calendar/shift.ts

export interface ShiftTemplate {
  id: string;
  name: string;
  startTime?: string;
  endTime?: string;
  crossDay: boolean;
  color: string;
  description?: string;
}

export interface ShiftCycleStep {
  shiftTemplateId: string;
  days: number;
}

export interface ShiftSchedule {
  id: string;
  name: string;
  startDate: string;
  cycle: ShiftCycleStep[];
  enabled: boolean;
}

export interface ShiftOverride {
  id: string;
  date: string;
  shiftTemplateId: string;
  reason?: string;
}
```

### 班次推算逻辑

```typescript
// packages/services/src/calendar/ShiftAssistantService.ts

/**
 * 倒班助手服务
 * TRAE 注意：临时调整优先于周期推算；夜班等跨天班次需要在次日详情中提示。
 */
class ShiftAssistantService {
  async getShiftForDate(date: string): Promise<ResolvedShift | null> {
    const override = await this.shiftRepository.findOverrideByDate(date);
    if (override) {
      return this.resolveOverride(override);
    }

    const schedule = await this.shiftRepository.getEnabledSchedule();
    if (!schedule) {
      return null;
    }

    return this.calculateByCycle(date, schedule);
  }

  private calculateByCycle(date: string, schedule: ShiftSchedule): ResolvedShift | null {
    const daysFromStart = diffDays(schedule.startDate, date);
    if (daysFromStart < 0) {
      return null;
    }

    const cycleLength = schedule.cycle.reduce((sum, step) => sum + step.days, 0);
    const indexInCycle = daysFromStart % cycleLength;

    let cursor = 0;
    for (const step of schedule.cycle) {
      if (indexInCycle >= cursor && indexInCycle < cursor + step.days) {
        return this.resolveTemplate(step.shiftTemplateId);
      }
      cursor += step.days;
    }

    return null;
  }
}
```

### 与事项提醒联动

班次提醒不直接写入通知系统，而是通过事项管理和通知适配层完成。用户开启“上班前提醒”后，倒班助手根据班次开始时间生成提醒计划；提醒触发、稍后提醒、错过提醒补偿仍由事项管理和通知服务统一处理。

| 联动项 | 说明 |
|---|---|
| 班前提醒 | 根据班次开始时间提前 N 分钟提醒 |
| 跨天班次 | 夜班等跨天班次在开始日和结束日都可展示提示 |
| 临时调整 | 临时调整后重新计算对应日期提醒 |
| 同步冲突 | 多端修改班次规则时标记冲突，不静默覆盖 |

## WebDAV 同步设计

### 同步架构

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   本地数据   │◄───►│  SyncEngine │◄───►│  WebDAV存储  │
│  (SQLite)   │     │             │     │             │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │ ConflictResolver │
                    └─────────────┘
```

### 同步流程

```typescript
// packages/services/src/sync/SyncService.ts

/**
 * 同步引擎核心流程
 * AI Agent 注意：同步逻辑必须以本地数据为基准，
 * 冲突处理不能静默覆盖任何一方的数据
 */
class SyncEngine {
  async sync(): Promise<SyncResult> {
    // 1. 检查 WebDAV 配置
    if (!this.config.isValid()) {
      return { status: 'skipped', reason: 'config_missing' };
    }
    
    // 2. 获取本地变更记录
    const localChanges = await this.getLocalChanges();
    
    // 3. 下载远程索引
    const remoteIndex = await this.webdav.downloadIndex();
    
    // 4. 三向合并
    const mergeResult = await this.threeWayMerge(localChanges, remoteIndex);
    
    // 5. 处理冲突
    const conflicts = mergeResult.conflicts;
    for (const conflict of conflicts) {
      await this.conflictResolver.resolve(conflict);
    }
    
    // 6. 上传本地变更
    await this.uploadChanges(mergeResult.localOnly);
    
    // 7. 下载远程新增/修改
    await this.downloadChanges(mergeResult.remoteOnly);
    
    // 8. 更新同步索引
    await this.updateSyncIndex();
    
    return { status: 'success', conflicts: conflicts.length };
  }
  
  /**
   * 三向合并算法
   * 基于最后共同祖先（lastSyncIndex）进行比较
   */
  private async threeWayMerge(
    localChanges: ChangeSet,
    remoteIndex: RemoteIndex
  ): Promise<MergeResult> {
    const lastSync = await this.getLastSyncIndex();
    
    return {
      localOnly: [],     // 仅本地有变更，直接上传
      remoteOnly: [],    // 仅远程有变更，直接下载
      bothChanged: [],   // 双方都有变更，标记冲突
      conflicts: []
    };
  }
}
```

### 同步文件格式

```text
WebDAV 远程目录结构：

/AME-to-do/
├── index.json              # 数据索引，记录所有数据文件清单和版本
├── data/
│   ├── items/
│   │   ├── item_xxx.json   # 单条事项数据
│   │   └── item_yyy.json
│   ├── calendar/
│   │   └── cache_v3.json   # 节假日缓存数据
│   ├── shifts/
│   │   ├── templates.json   # 班次模板
│   │   ├── schedules.json   # 轮班周期
│   │   └── overrides.json   # 临时班次调整
│   └── config/
│       └── app_config.json # 应用配置（不含密码）
├── meta/
│   ├── devices.json        # 设备列表
│   └── sync_v2.json        # 同步元数据
└── backups/
    └── backup_20260722.zip # 自动备份（可选）
```

### 冲突解决策略

```typescript
// 冲突解决优先级（按配置选择）
type ConflictStrategy = 
  | 'local_wins'      // 保留本地版本
  | 'remote_wins'     // 使用远程版本
  | 'keep_both'       // 保留两份，用户手动合并
  | 'timestamp_wins'; // 更新时间较新的胜出

/**
 * AI Agent 注意：默认策略为 'timestamp_wins'，
 * 但所有冲突必须记录日志并通知用户
 */
```

## 显示适配设计

### DPI 适配

```typescript
// packages/platform-contracts/src/DisplayAdapter.ts

/**
 * DPI 自适应逻辑
 * AI Agent 注意：所有 UI 组件应使用 rem/em 或逻辑像素，
 * 禁止在代码中硬编码 px 值。基础字号根据 DPI 动态计算。
 */
function getBaseFontSize(scaleFactor: number): number {
  // 基准：96 DPI = 1.0 scale = 16px
  return Math.round(16 * scaleFactor);
}

// Tailwind CSS 配置中动态设置 root font-size
// 在应用启动时检测 DPI 并设置 document.documentElement.style.fontSize
```

### 响应式断点

```typescript
// 响应式断点定义（基于逻辑像素，非物理像素）
const breakpoints = {
  compact: '0px',      // 手机竖屏 / 小窗口
  medium: '768px',     // 平板 / 横屏手机
  expanded: '1024px',  // 桌面窗口
  wide: '1440px',      // 宽屏桌面
};

/**
 * AI Agent 注意：布局组件使用这些断点进行响应式调整，
 * 日历月视图在 compact 下显示 1 列，expanded 下显示 7 列
 */
```

### 横竖屏适配

```typescript
// 监听窗口尺寸变化，判断当前方向
type Orientation = 'portrait' | 'landscape';

function getOrientation(width: number, height: number): Orientation {
  return width >= height ? 'landscape' : 'portrait';
}

// 布局策略：
// - portrait：导航栏在底部，内容垂直堆叠
// - landscape：导航栏在左侧，内容左右分栏
```

## 单文件封装方案

### 构建配置

```json
// tauri.conf.json 关键配置
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "tauri": {
    "bundle": {
      "active": true,
      "targets": ["nsis"],
      "windows": {
        "nsis": {
          "installMode": "both",
          "installerHooks": "./scripts/nsis-hooks.nsh"
        }
      }
    },
    "allowlist": {
      "all": false,
      "fs": {
        "all": true,
        "scope": ["$APPDATA/**", "$RESOURCE/**"]
      },
      "path": {
        "all": true
      },
      "notification": {
        "all": true
      }
    }
  }
}
```

### 数据目录策略

```typescript
// packages/core/src/app/bootstrap.ts

/**
 * 应用启动时的数据目录初始化
 * AI Agent 注意：这是单文件便携的关键逻辑，
 * 数据目录始终与可执行文件同级，不写入系统目录
 */
async function initDataDirectory(): Promise<string> {
  // 获取可执行文件所在目录
  const exeDir = await getExeDirectory();
  const dataDir = `${exeDir}/ame-to-do-data`;
  
  // 检查并创建数据目录
  if (!(await platform.filesystem.exists(dataDir))) {
    await platform.filesystem.createDir(dataDir, true);
    
    // 创建子目录结构
    await platform.filesystem.createDir(`${dataDir}/db`, true);
    await platform.filesystem.createDir(`${dataDir}/logs`, true);
    await platform.filesystem.createDir(`${dataDir}/cache`, true);
    await platform.filesystem.createDir(`${dataDir}/backups`, true);
  }
  
  return dataDir;
}
```

### 绿色运行模式

```text
运行模式检测：

1. 可执行文件所在目录存在 ame-to-do-data/ → 绿色模式（便携模式）
2. 不存在 → 首次运行，自动创建数据目录，进入绿色模式
3. 未来可扩展：检测注册表/系统配置，支持安装模式

数据目录结构：
ame-to-do-data/
├── db/
│   └── app.db              # SQLite 数据库
├── logs/
│   └── app_2026-07-22.log  # 日志文件
├── cache/
│   └── calendar_2026.json  # 节假日缓存
├── backups/
│   └── auto_backup_001.zip # 自动备份
└── config.json             # 轻量配置（可快速查看）
```

## 桌面小部件设计

### 设计边界

初始版本的桌面小部件只针对 Windows 平台实现。Windows 版本采用 Tauri 多窗口能力创建桌面悬浮窗口；其他平台的同类功能不直接复用 Windows 悬浮窗形态，而是在后续平台设计中分别定义，例如 macOS 菜单栏/桌面组件、Android App Widget、iOS Widget、Linux 桌面组件、鸿蒙服务卡片。

小部件能力分为两层：`packages/widget-kit` 提供平台无关的扩展协议，功能模块通过它注册卡片、数据源、刷新策略和点击动作；`packages/platform-implementations/windows-tauri` 和 `apps/desktop-tauri/src/app-shell` 负责 Windows 平台窗口创建、置顶、透明、拖动、多显示器和全屏隐藏。业务模块禁止直接调用 Windows 小部件窗口 API。

### 标准扩展接口

```typescript
// packages/widget-kit/src/WidgetExtension.ts

/**
 * 小部件扩展接口
 * TRAE 注意：后续新增功能模块如排班、统计、生产提醒时，
 * 应通过此接口注册小部件卡片，不要直接修改 Windows 小部件窗口逻辑。
 */
export interface WidgetExtension {
  /** 扩展唯一标识，建议使用模块名作为前缀，例如 item.todayTodo */
  readonly id: string;
  /** 来源模块 ID，例如 calendar、item-manager、shift-schedule */
  readonly moduleId: string;
  /** 卡片显示名称 */
  readonly title: string;
  /** 默认是否在小部件中启用 */
  readonly defaultEnabled: boolean;
  /** 卡片支持的尺寸 */
  readonly supportedSizes: WidgetCardSize[];
  /** 刷新策略 */
  readonly refreshPolicy: WidgetRefreshPolicy;
  /** 获取标准化卡片数据 */
  getCardData(context: WidgetDataContext): Promise<WidgetCardModel>;
  /** 处理卡片点击、按钮点击等标准动作 */
  handleAction?(action: WidgetAction, context: WidgetActionContext): Promise<void>;
}

export type WidgetCardSize = 'small' | 'medium' | 'large';

export type WidgetRefreshPolicy =
  | { type: 'manual' }
  | { type: 'interval'; intervalMs: number }
  | { type: 'onEvent'; events: string[] };
```

### 标准卡片模型

```typescript
// packages/widget-kit/src/WidgetCardModel.ts

/**
 * 小部件标准卡片模型
 * Windows 桌面小部件、未来移动端 Widget 和鸿蒙服务卡片都应从该模型转换为各自平台 UI。
 */
export interface WidgetCardModel {
  /** 卡片唯一 ID */
  id: string;
  /** 卡片标题 */
  title: string;
  /** 卡片摘要文本 */
  summary?: string;
  /** 卡片内容行，适合待办、提醒、排班等列表型内容 */
  rows: WidgetCardRow[];
  /** 右上角或底部快捷动作 */
  actions?: WidgetAction[];
  /** 更新时间，用于展示数据新鲜度 */
  updatedAt: number;
  /** 空状态文案 */
  emptyText?: string;
}

export interface WidgetCardRow {
  id: string;
  primaryText: string;
  secondaryText?: string;
  badge?: string;
  priority?: 'high' | 'medium' | 'low';
  action?: WidgetAction;
}
```

### 标准动作协议

```typescript
// packages/widget-kit/src/WidgetAction.ts

/**
 * 小部件动作协议
 * 所有平台都应理解这些动作，再由平台入口转换为打开页面、聚焦窗口、执行命令等具体行为。
 */
export type WidgetAction =
  | { type: 'openRoute'; route: string; params?: Record<string, string> }
  | { type: 'openItem'; itemId: string }
  | { type: 'openDate'; date: string }
  | { type: 'runModuleAction'; moduleId: string; actionId: string; payload?: unknown };
```

### 扩展注册中心

```typescript
// packages/widget-kit/src/WidgetRegistry.ts

class WidgetRegistry {
  private extensions = new Map<string, WidgetExtension>();

  register(extension: WidgetExtension): void {
    if (this.extensions.has(extension.id)) {
      throw new Error(`Widget extension already registered: ${extension.id}`);
    }
    this.extensions.set(extension.id, extension);
  }

  unregister(extensionId: string): void {
    this.extensions.delete(extensionId);
  }

  listEnabled(config: WidgetConfig): WidgetExtension[] {
    return [...this.extensions.values()].filter(ext => config.enabledExtensions.includes(ext.id));
  }

  async collectCards(context: WidgetDataContext): Promise<WidgetCardModel[]> {
    const enabled = this.listEnabled(context.config);
    return Promise.all(enabled.map(ext => ext.getCardData(context)));
  }
}
```

### 初始内置扩展

| 扩展 ID | 来源模块 | 卡片内容 | 刷新策略 |
|---|---|---|---|
| `calendar.today` | 万年历 | 今日公历、农历、星期、节假日、调休状态 | 日期变化、节假日缓存更新 |
| `calendar.todayShift` | 万年历 / 倒班助手 | 今日班次、班次时间、班前提醒状态 | 日期变化、班次规则变更 |
| `item.todayTodo` | 事项管理 | 今日待办事项，按优先级排序 | 事项变更、定时刷新 |
| `item.upcomingReminder` | 事项管理 | 即将到期的定时提醒 | 提醒变更、定时刷新 |

### Windows 技术方案

Tauri v2 支持多窗口，小部件实现为独立窗口：

```typescript
// packages/platform-implementations/windows-tauri/src/WindowsWidgetAdapter.ts

class WindowsWidgetAdapter implements WidgetAdapter {
  async create(config: WidgetConfig): Promise<void> {
    const webview = new WebviewWindow('widget', {
      url: '/widget',
      width: config.width,
      height: config.height,
      x: config.position.x,
      y: config.position.y,
      alwaysOnTop: true,
      decorations: false,        // 无边框
      transparent: true,         // 透明背景
      resizable: true,
      skipTaskbar: true,         // 不显示在任务栏
      visible: false,            // 先隐藏，等加载完成再显示
    });
    
    // 等待加载完成后显示
    webview.once('tauri://created', () => {
      webview.show();
    });
  }
}
```

### 小部件与主应用通信

```typescript
// 通过事件总线和 WidgetRegistry 通信
// 功能模块更新数据后触发事件，小部件注册中心重新收集标准卡片数据，
// Windows 小部件窗口只负责渲染标准卡片，不包含具体业务规则。

eventBus.on('item:updated', (data) => {
  widgetRuntime.refreshByEvent('item:updated');
});
```

## 开机启动设计

### Windows 实现

使用 `tauri-plugin-autostart` 插件：

```rust
// apps/desktop-tauri/src-tauri/src/main.rs

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"])  // 开机启动时传递最小化参数
        ))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 启动参数处理

```typescript
// apps/desktop-tauri/src/main.tsx

/**
 * 启动参数处理
 * AI Agent 注意：新增启动参数时需在此处理
 */
async function handleStartupArgs(): Promise<void> {
  const args = await getLaunchArgs();
  
  if (args.includes('--minimized')) {
    // 开机启动或托盘恢复：最小化到托盘
    await trayAdapter.show();
    return;
  }
  
  if (args.includes('--show-widget')) {
    // 仅显示小部件
    await widgetService.show();
    return;
  }
  
  // 默认：显示主窗口
  await mainWindow.show();
}
```

## 安全设计

### 凭据管理流程

```text
用户输入 WebDAV 密码
      │
      ▼
前端 ──► Rust 后端命令
              │
              ▼
    Windows Credential Manager
    或 macOS Keychain
    或 Linux Secret Service
              │
              ▼
    保存凭据（密钥由系统管理）

读取时反向流程：Rust 后端从系统安全存储读取，
通过 Tauri 命令返回给前端，前端不持久保存密码
```

### 数据加密策略

| 数据类型 | 存储位置 | 加密方式 | 说明 |
|---|---|---|---|
| WebDAV 密码 | 系统安全存储 | 系统级加密 | 不透出到应用层 |
| 本地数据库 | 数据目录 | 暂不加密（预留） | 后续支持 SQLCipher |
| 同步文件 | WebDAV | 不加密 | 不含密码 |
| 日志文件 | 数据目录 | 不加密 | 敏感信息脱敏 |
| 配置文件 | 数据目录 | 不加密 | 不含敏感信息 |

```typescript
// 预留加密接口
interface EncryptionProvider {
  encrypt(plainText: string, key: CryptoKey): Promise<ArrayBuffer>;
  decrypt(cipherData: ArrayBuffer, key: CryptoKey): Promise<string>;
}

// 初始版本使用空实现，后续可替换为真实实现
class NoOpEncryptionProvider implements EncryptionProvider {
  async encrypt(plainText: string): Promise<ArrayBuffer> {
    return new TextEncoder().encode(plainText);
  }
  async decrypt(cipherData: ArrayBuffer): Promise<string> {
    return new TextDecoder().decode(cipherData);
  }
}
```

## 事件总线设计

```typescript
// packages/core/src/event/EventBus.ts

/**
 * 应用级事件总线
 * AI Agent 注意：模块间通信必须通过事件总线，禁止直接调用其他模块的方法
 */
class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  
  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    
    // 返回取消订阅函数
    return () => this.handlers.get(event)?.delete(handler);
  }
  
  emit<T>(event: string, data: T): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(h => {
        try {
          h(data);
        } catch (e) {
          logger.error(`事件处理异常 [${event}]:`, e);
        }
      });
    }
  }
}

// 核心事件定义
type AppEvent =
  | 'app:started'
  | 'app:minimized'
  | 'module:enabled'
  | 'module:disabled'
  | 'item:created'
  | 'item:updated'
  | 'item:deleted'
  | 'item:completed'
  | 'sync:started'
  | 'sync:completed'
  | 'sync:failed'
  | 'sync:conflict'
  | 'reminder:triggered'
  | 'widget:refresh'
  | 'config:changed';
```

## AI Agent 维护规范

### 代码组织原则

1. **单一职责**：每个文件只做一件事，函数不超过 50 行
2. **显式依赖**：所有依赖通过构造函数或参数传入，禁止全局变量
3. **类型优先**：所有公共 API 必须有 TypeScript 类型定义
4. **注释规范**：复杂逻辑必须有注释，说明"为什么"而非"做什么"

### 新增模块指南

```text
AI Agent 新增模块步骤：

1. 在 `packages/features/` 下创建功能模块 UI 和模块声明
2. 如涉及新业务规则，在 `packages/domain/` 中新增领域模型
3. 如涉及业务流程，在 `packages/services/` 中新增服务
4. 实现 ModuleDefinition 接口，导出模块定义
5. 在模块目录创建 README.md，说明模块职责和接口
6. 在 ModuleRegistry 中注册模块（或自动扫描）
7. 如需要数据库表，在 `packages/data/src/schemas/` 添加 SQL 文件
8. 如需要数据迁移，在 `packages/data/src/migrations/` 添加迁移脚本
9. 如需要平台能力，先在 `packages/platform-contracts/` 定义接口，再在 `packages/platform-implementations/` 新增实现
10. 更新 `docs/PORTING_GUIDE.md` 和 `docs/PLATFORM_MATRIX.md`
7. 更新本设计文档的相关章节
```

### 错误码规范

```typescript
// packages/shared/src/constants/errorCodes.ts

/**
 * 错误码规范：MODULE_ACTION_DETAIL 格式
 * AI Agent 注意：新增错误码时遵循此格式
 */
export const ErrorCodes = {
  // 通用错误
  COMMON_UNKNOWN: 'COMMON_001',
  COMMON_INVALID_PARAM: 'COMMON_002',
  
  // 文件系统
  FS_DIR_CREATE_FAILED: 'FS_001',
  FS_FILE_READ_FAILED: 'FS_002',
  FS_FILE_WRITE_FAILED: 'FS_003',
  
  // 数据库
  DB_CONNECTION_FAILED: 'DB_001',
  DB_MIGRATION_FAILED: 'DB_002',
  DB_QUERY_FAILED: 'DB_003',
  
  // WebDAV 同步
  SYNC_CONFIG_INVALID: 'SYNC_001',
  SYNC_CONNECT_FAILED: 'SYNC_002',
  SYNC_AUTH_FAILED: 'SYNC_003',
  SYNC_UPLOAD_FAILED: 'SYNC_004',
  SYNC_DOWNLOAD_FAILED: 'SYNC_005',
  SYNC_CONFLICT: 'SYNC_006',
  
  // 模块
  MODULE_LOAD_FAILED: 'MOD_001',
  MODULE_DEPENDENCY_MISSING: 'MOD_002',
  MODULE_ALREADY_ENABLED: 'MOD_003',
  
  // 通知
  NOTIFY_PERMISSION_DENIED: 'NOTIFY_001',
  NOTIFY_SCHEDULE_FAILED: 'NOTIFY_002',
} as const;
```

## 构建与发布

### 开发命令

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run tauri dev

# 构建生产版本
npm run tauri build

# 构建单文件可执行文件（Windows）
npm run build:single-file

# 运行测试
npm test
```

### 发布产物

```text
dist/
├── AME-to-do.exe              # 主可执行文件（单文件）
├── AME-to-do-data/            # 运行时自动创建
│   ├── db/
│   ├── logs/
│   ├── cache/
│   └── backups/
└── README.txt                 # 使用说明（可选）
```

## 附录：接口速查表

### Tauri 命令清单

| 命令 | 功能 | 前端调用路径 |
|---|---|---|
| `get_data_dir` | 获取数据目录 | `core.app.getDataDir()` |
| `read_config` | 读取配置 | `core.config.read()` |
| `write_config` | 写入配置 | `core.config.write()` |
| `set_credential` | 保存凭据 | `platform.secureStorage.set()` |
| `get_credential` | 读取凭据 | `platform.secureStorage.get()` |
| `show_notification` | 发送通知 | `platform.notification.show()` |
| `schedule_notification` | 定时通知 | `platform.notification.schedule()` |
| `set_auto_launch` | 设置开机启动 | `platform.autoLaunch.enable()` |
| `create_widget` | 创建小部件 | `platform.widget.create()` |
| `update_widget` | 更新小部件 | `platform.widget.update()` |
| `set_tray_menu` | 设置托盘菜单 | `platform.tray.setMenu()` |
| `sync_webdav` | 执行 WebDAV 同步 | `modules.sync.engine.sync()` |
| `test_webdav_connection` | 测试连接 | `modules.sync.webdav.test()` |
