# 跨平台移植指南

> 本文档说明如何将 AME to do 从 Windows 平台移植到其他平台（macOS、Linux、Android、iOS、鸿蒙等）。所有平台移植都必须遵循本文档的步骤，确保业务核心不被污染。

## 核心原则

### 1. 业务核心零修改

| 包 | 是否可修改 | 说明 |
|---|---|---|
| `packages/domain` | ❌ 禁止 | 领域模型完全平台无关 |
| `packages/services` | ❌ 禁止 | 业务服务只依赖抽象接口 |
| `packages/data` | ⚠️ 仅限数据层实现替换 | 可新增存储实现（如 IndexedDB），不得修改领域模型 |
| `packages/platform-contracts` | ⚠️ 仅可新增接口 | 不得删除或修改已有接口方法签名 |
| `packages/ui` | ❌ 禁止 | UI 组件完全平台无关 |
| `packages/features` | ⚠️ 仅可新增平台特有 UI | 不得在已有功能模块中直接写入平台代码 |
| `packages/widget-kit` | ❌ 禁止 | 小部件扩展协议平台无关 |
| `packages/sync-webdav` | ❌ 禁止 | WebDAV 协议实现平台无关 |

### 2. 平台差异仅在三处实现

```
平台差异 → 只允许出现在以下三个位置：
  1. packages/platform-implementations/<platform>/   ← 平台接口的具体实现
  2. apps/<platform>/                                  ← 平台入口和壳工程
  3. docs/PLATFORM_MATRIX.md                           ← 能力支持矩阵
```

## 移植步骤

### 第 1 步：新增平台入口

在 `apps/` 目录下创建新平台的入口工程，例如移植到鸿蒙：

```
apps/
└── harmony-os/                    # 鸿蒙平台入口
    ├── src/                       # 前端入口
    │   ├── main.tsx               # 应用挂载入口
    │   └── App.tsx                # 根组件（组合路由和平台特有布局）
    ├── entry/                     # 鸿蒙原生壳工程
    ├── public/                    # 静态资源
    └── package.json
```

**注意事项：**
- `App.tsx` 只负责组合路由和平台特有的布局（如底部导航 vs 侧边导航）
- 不得在 `apps/*` 中写入任何业务规则
- 所有业务功能通过引入 `packages/` 下的包来获得

### 第 2 步：新增平台实现

在 `packages/platform-implementations/` 下创建新平台的适配器实现：

```
packages/platform-implementations/
└── harmony-os/                    # 鸿蒙平台实现
    ├── src/
    │   ├── FileSystemAdapter.ts   # 实现平台文件系统接口
    │   ├── NotificationAdapter.ts # 实现平台通知接口
    │   ├── SecureStorageAdapter.ts
    │   ├── NetworkAdapter.ts
    │   ├── TaskSchedulerAdapter.ts
    │   ├── AutoLaunchAdapter.ts   # 如不支持则抛出 NotSupportedError
    │   ├── WidgetAdapter.ts       # 如不支持则抛出 NotSupportedError
    │   ├── TrayAdapter.ts         # 如不支持则抛出 NotSupportedError
    │   ├── DisplayAdapter.ts
    │   └── PlatformAdapter.ts     # 总适配器，组合以上所有适配器
    └── package.json
```

**注意事项：**
- 每个适配器必须实现 `packages/platform-contracts` 中定义的对应接口
- 平台不支持的能力，不要静默失败，而应：
  - 在方法中抛出 `NotSupportedError`
  - 在 `docs/PLATFORM_MATRIX.md` 中标记为 ❌ 不支持
  - 在功能模块的模块声明中标记该能力为可选依赖

### 第 3 步：更新平台能力矩阵

在 `docs/PLATFORM_MATRIX.md` 中，为新平台添加一列，并逐一标记每个能力的状态：

- ✅ 已实现并通过测试
- ⏳ 计划实现
- ❌ 不支持（附原因）
- 🔍 调研中

### 第 4 步：平台特有数据存储（如需）

如果新平台不支持 SQLite（例如 Web 预览），需要在 `packages/data/` 下新增该平台的数据层实现：

```
packages/data/src/
├── repositories/      # 接口定义（不变）
├── sqlite/            # SQLite 实现（桌面平台）
├── indexeddb/         # IndexedDB 实现（Web 平台，新增）
└── migrations/        # 迁移脚本（不变）
```

**注意：** `packages/data/src/repositories/` 中的接口定义不得修改，只能新增实现。

### 第 5 步：平台特有 UI 布局（如需）

如果新平台的导航、布局与桌面端差异较大（例如移动端底部导航 vs 桌面端侧边导航），在 `apps/<platform>/src/` 中实现平台特有布局：

```typescript
// apps/harmony-os/src/App.tsx
import { PlatformAdapter } from '@ame-todo/platform-implementations-harmony';
import { AppBootstrap } from '@ame-todo/core';
import { MobileNavigationLayout } from './layouts/MobileNavigationLayout';

const platform = new PlatformAdapter();

export default function App() {
  return (
    <AppBootstrap platform={platform}>
      <MobileNavigationLayout />
    </AppBootstrap>
  );
}
```

### 第 6 步：运行边界检查

实现完成后，运行边界检查脚本，确保没有平台代码泄漏到业务层：

```bash
node scripts/check-boundaries.js
```

如果脚本报错，说明某些业务包错误地依赖了平台实现，需要修复。

### 第 7 步：更新移植指南

在本文档末尾追加新平台的移植经验，特别是：

- 该平台的特有坑点（权限、文件路径格式、通知渠道等）
- 哪些能力无法支持及其原因
- 构建和调试的特殊步骤

## 各平台特有注意事项

### Windows (Tauri)

- 开机启动通过注册表实现，需要管理员权限
- 通知使用 Windows 10/11 内置通知中心
- 小部件通过 Tauri 多窗口 + `alwaysOnTop` + `transparent` 实现
- 凭据通过 Windows Credential Manager 保存

### macOS (Tauri) - 待完善

- 开机启动通过 LaunchAgent 实现
- 小部件可考虑菜单栏或桌面组件
- 凭据通过 Keychain 保存

### Linux (Tauri) - 待完善

- 开机启动通过 `.desktop` 文件实现
- 通知通过 `libnotify` 实现
- 凭据通过 Secret Service (dbus) 实现

### Android / iOS (Capacitor) - 待完善

- 不支持开机启动
- 小部件使用各平台的系统 Widget 实现，不使用悬浮窗
- 通知使用各平台的推送服务
- SQLite 可用 @capacitor-community/sqlite 插件

### Web 预览 - 待完善

- 不支持文件系统写入、通知、托盘、开机启动、小部件
- 数据存储使用 IndexedDB
- 适合用于功能演示和 UI 调试

## 移植质量 Checklist

移植完成后，请确认以下所有项：

- [ ] 所有 `packages/domain`、`packages/services` 中的文件未被修改
- [ ] 所有平台特有代码都在 `apps/<platform>/` 或 `packages/platform-implementations/<platform>/` 中
- [ ] `docs/PLATFORM_MATRIX.md` 已更新，每个能力都有明确的状态标记
- [ ] 不支持的能力方法抛出了 `NotSupportedError`（而非静默失败）
- [ ] 边界检查脚本 `scripts/check-boundaries.js` 运行通过
- [ ] 核心功能（万年历、事项管理、WebDAV 同步）在新平台上可正常使用
- [ ] 本文档已追加该平台的移植经验和注意事项
