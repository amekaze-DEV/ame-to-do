# 架构说明

> 本文档是 AME to do 的架构总览文档。所有开发者（包括 AI Agent）在修改代码前必须阅读本文档，确保理解各层职责和边界。

## 架构分层总览

AME to do 采用**四层架构**，从上到下依赖关系严格单向：

```
┌─────────────────────────────────────────────────────────────┐
│                      用户界面层 (UI Layer)                    │
│  万年历 │ 事项管理 │ 模块管理 │ 系统设置 │ 桌面小部件 │ 首页  │
├─────────────────────────────────────────────────────────────┤
│                   业务逻辑层 (Business Layer)                 │
│  CalendarService │ ItemService │ ModuleManager                │
│  SyncService    │ AutoLaunch  │ WidgetService                │
├─────────────────────────────────────────────────────────────┤
│                    数据访问层 (Data Layer)                    │
│  ConfigStore │ SQLite │ SyncMeta │ CacheManager              │
├─────────────────────────────────────────────────────────────┤
│                   平台适配层 (Platform Adapter)               │
│  FileSystem │ Notification │ SecureStorage │ Network │ Tray  │
│  AutoLaunch │ Widget       │ TaskScheduler │ DisplayAdapter   │
└─────────────────────────────────────────────────────────────┘
```

## 各层职责

### 用户界面层 (UI Layer)

| 职责 | 禁止做 |
|---|---|
| 展示数据、响应交互 | 直接调用 Tauri API 或系统 API |
| 路由管理、页面布局 | 直接读写数据库 |
| 调用业务服务获取数据 | 实现业务规则 |
| 通过事件总线监听状态变化 | 直接依赖平台实现 |

### 业务逻辑层 (Business Layer)

| 职责 | 禁止做 |
|---|---|
| 实现业务规则和工作流 | 直接操作 DOM 或 UI 状态 |
| 协调数据层和平台层 | 直接调用 Tauri 命令 |
| 提供领域服务接口 | 直接依赖具体平台实现 |
| 管理模块生命周期 | 绕过接口直接访问平台能力 |

### 数据访问层 (Data Layer)

| 职责 | 禁止做 |
|---|---|
| 持久化数据的读写 | 包含业务规则判断 |
| 数据迁移和版本管理 | 直接操作 UI |
| 缓存管理 | 依赖平台实现 |
| 备份与恢复 | 直接调用 Tauri 命令 |

### 平台适配层 (Platform Adapter)

| 职责 | 禁止做 |
|---|---|
| 封装平台特定 API | 包含业务规则 |
| 提供统一的平台能力接口 | 直接操作业务数据 |
| 处理平台差异和权限 | 直接访问数据库 |
| 上报平台能力不可用的错误 | 包含 UI 逻辑 |

## 依赖方向规则

```
UI Layer → Business Layer → Data Layer → Platform Adapter
   ↓            ↓              ↓               ↓
(只能向下)   (只能向下)     (只能向下)     (只能依赖系统API)
```

- ✅ 上层可以依赖下层
- ❌ 下层绝对不能依赖上层
- ❌ 同层之间可以依赖（但需通过明确的接口）

## 模块系统

AME to do 采用模块化架构，每个功能模块是一个独立单元：

```
┌─────────────────────────────────────────────────┐
│              Module (功能模块)                    │
│  ┌───────────────┐  ┌─────────────────────────┐ │
│  │  Module UI    │  │  Module Business Logic   │ │
│  │  (React 组件) │  │  (Services + State)      │ │
│  └───────────────┘  └─────────────────────────┘ │
│  ┌───────────────┐  ┌─────────────────────────┐ │
│  │  Module Config│  │  Module Dependencies     │ │
│  │  (开关 + 设置)│  │  (声明依赖的平台能力)    │ │
│  └───────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 模块开发规则

1. 每个模块必须通过 `ModuleDefinition` 接口注册
2. 模块必须明确声明自己依赖的平台能力（如通知、文件系统等）
3. 模块不得直接依赖其他模块的内部实现，只能通过事件总线通信
4. 模块的开关状态由 `ModuleManager` 统一管理

## 事件总线

模块间通信的唯一通道是事件总线（Event Bus），禁止模块间直接调用。

```
Module A → emit(Event) → Event Bus → on(Event) → Module B
```

**为什么用事件总线？**
- 模块解耦：移除一个模块不影响其他模块
- 开关友好：模块禁用后事件监听自动失效
- 跨平台一致：事件机制与平台无关

## 目录结构与架构的对应关系

| 架构层 | 所在目录 |
|---|---|
| UI Layer | `apps/*/src/` + `packages/ui/` + `packages/features/*/ui/` |
| Business Layer | `packages/services/` + `packages/core/` |
| Data Layer | `packages/data/` |
| Platform Adapter (接口) | `packages/platform-contracts/` |
| Platform Adapter (实现) | `packages/platform-implementations/*/` |

## 边界检查

为了防止架构腐化，项目提供了自动化边界检查：

```bash
node scripts/check-boundaries.js
```

该脚本会扫描所有 import 语句，检查是否有违反依赖方向的引用。

常见的违规模式：

| 违规 | 示例 | 修复方式 |
|---|---|---|
| 业务层直接引用 Tauri | `import { invoke } from '@tauri-apps/api/core'` in `packages/services/` | 通过 `PlatformAdapter` 间接调用 |
| 数据层引用 UI | `import { useStore } from 'zustand'` in `packages/data/` | 数据层只返回数据，状态管理交给上层 |
| 平台层引用业务 | `import { ItemService } from '@ame-todo/services'` in `platform-implementations/` | 平台层只提供能力，不调用业务 |

## 架构决策记录 (ADR)

### ADR-001：选择 Tauri v2 而非 Electron

**决策**：使用 Tauri v2 作为桌面应用框架

**原因**：
- 包体积小（MB 级 vs 百 MB 级）
- 内存占用低
- 安全性高（Rust 后端 + 沙箱）
- 支持单文件打包

**权衡**：Tauri 的 API 不如 Electron 成熟，部分平台能力需要自行封装

### ADR-002：选择 SQLite 而非 IndexedDB

**决策**：桌面端使用 SQLite 作为本地数据库

**原因**：
- 关系型查询能力强（适合日历、事项等复杂查询）
- 数据迁移工具成熟
- 备份方便（单文件）
- 与 WebDAV 同步配合良好

**权衡**：Web 预览版需要额外实现 IndexedDB 适配层

### ADR-003：平台适配层三层架构

**决策**：平台能力分为 contracts（接口）→ implementations（实现）→ apps（装配）三层

**原因**：
- 确保业务代码完全平台无关
- 新增平台时无需修改任何业务代码
- 可独立测试各平台实现

**权衡**：增加了一定的代码量和理解成本

### ADR-004：事件总线作为模块间唯一通信方式

**决策**：模块间不直接调用，只通过事件总线通信

**原因**：
- 模块解耦，支持模块开关
- 便于调试和监控
- 与平台无关

**权衡**：增加了理解成本，跨模块调用不如直接调用直观
