# UI 组件与模块移植到其他项目指南

> 本文档说明如何将 AME to do 项目中的 UI 组件、模块、工具库等可复用资产移植到其他 APP 项目中。目标是让其他项目能够低成本地引入本项目沉淀的通用组件和模块。

## 可复用资产清单

以下资产按可移植性从高到低排序：

| 资产 | 所在包 | 可移植性 | 说明 |
|---|---|---|---|
| **共享工具函数** | `packages/shared` | ⭐⭐⭐⭐⭐ | 零业务依赖，纯工具 |
| **通用 UI 组件库** | `packages/ui` | ⭐⭐⭐⭐⭐ | 纯展示组件，无业务逻辑 |
| **小部件扩展协议** | `packages/widget-kit` | ⭐⭐⭐⭐ | 协议层，不依赖具体平台 |
| **WebDAV 客户端** | `packages/sync-webdav` | ⭐⭐⭐⭐ | 纯协议实现，依赖网络适配器接口 |
| **领域模型** | `packages/domain` | ⭐⭐⭐ | 与业务绑定，但不依赖 UI 和平台 |
| **功能模块 UI** | `packages/features/*` | ⭐⭐ | 与本项目业务绑定较深 |
| **业务服务** | `packages/services` | ⭐⭐ | 与本项目业务绑定 |
| **应用核心框架** | `packages/core` | ⭐ | 与本项目架构深度绑定 |

---

## 1. 移植 `packages/shared`（共享工具）

### 适用场景

其他项目需要本项目沉淀的通用工具函数、类型定义、常量等。

### 移植方式

#### 方式 A：直接复制（最简单）

```bash
# 在目标项目中
cp -r ame-to-do/packages/shared/src ./src/shared
```

#### 方式 B：npm 包引入（推荐，长期维护）

```bash
# 在本项目中发布包
cd packages/shared
pnpm publish --access public

# 在目标项目中引入
pnpm add @ame-todo/shared
```

### 注意事项

- `packages/shared` **禁止依赖任何其他业务包**，只能依赖纯工具库（如 date-fns、lodash 等）
- 如果发现 `packages/shared` 中有依赖其他业务包的代码，请将其移到对应业务包中

---

## 2. 移植 `packages/ui`（通用 UI 组件库）

### 适用场景

其他项目需要使用本项目的基础 UI 组件（Button、Dialog、Form、List、布局组件等），获得一致的视觉风格和交互体验。

### 前置依赖

目标项目必须已安装：
- React v18+
- TypeScript v5+
- Tailwind CSS v3+（如需使用样式类）

### 移植方式

#### 方式 A：整包引入（推荐）

```bash
# 方式 A1：npm 包
pnpm add @ame-todo/ui

# 方式 A2：Monorepo 软链接（两个项目在同一 Monorepo 中时）
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - '../ame-to-do/packages/ui'
```

引入后在目标项目中配置：

```typescript
// tailwind.config.js（目标项目）
module.exports = {
  presets: [
    require('@ame-todo/ui/tailwind.preset.js') // 使用 AME to do 的主题预设
  ],
  content: [
    // ... 目标项目自己的内容扫描路径
    'node_modules/@ame-todo/ui/**/*.{js,ts,jsx,tsx}', // 扫描 UI 包
  ],
  // ...
};
```

```typescript
// 目标项目入口
import '@ame-todo/ui/styles/globals.css'; // 引入全局样式和 CSS 变量
```

#### 方式 B：按需复制组件

如果只需要个别组件，可以按需复制：

```bash
# 复制 Button 组件
cp -r ame-to-do/packages/ui/src/components/Button ./src/components/

# 复制布局组件
cp -r ame-to-do/packages/ui/src/layout/* ./src/layout/

# 复制主题和 CSS 变量
cp ame-to-do/packages/ui/src/theme/* ./src/theme/
```

### 主题定制

目标项目可以通过覆盖 CSS 变量来自定义主题，无需修改 UI 包源代码：

```css
/* 目标项目的全局样式 */
:root {
  --color-primary-600: #10b981; /* 覆盖为绿色主题 */
  --font-size-base: 15px;         /* 覆盖基础字号 */
  /* ... 其他变量 */
}
```

### 可移植组件清单

| 分类 | 组件名 | 说明 | 依赖 |
|---|---|---|---|
| **基础组件** | Button | 按钮（多种变体、尺寸、状态） | 仅 Tailwind |
| | Dialog | 对话框（确认、表单、全屏） | 仅 Tailwind |
| | Input | 输入框（文本、密码、数字、搜索） | 仅 Tailwind |
| | Form | 表单（字段验证、布局） | 需 react-hook-form（可选） |
| | List | 列表（虚拟滚动、分组、选择） | 仅 Tailwind |
| | Card | 卡片容器 | 仅 Tailwind |
| | Badge | 徽章 | 仅 Tailwind |
| | Icon | 图标组件库 | 需 lucide-react |
| **布局组件** | NavigationLayout | 导航布局（自动适配横竖屏） | 仅 Tailwind |
| | Sidebar | 侧边栏 | 仅 Tailwind |
| | BottomNav | 底部导航 | 仅 Tailwind |
| | ResponsiveGrid | 响应式网格 | 仅 Tailwind |
| **主题系统** | ThemeProvider | 主题提供者（亮色/暗色、DPI 适配） | 仅 Tailwind |
| | useTheme | 主题 Hook | 仅 Tailwind |
| | CSS 变量 | 颜色、字号、间距等变量 | 仅 Tailwind |

---

## 3. 移植 `packages/widget-kit`（小部件扩展协议）

### 适用场景

其他项目也需要实现"桌面小部件/服务卡片/信息卡片"功能，希望复用标准化的卡片模型和扩展注册机制。

### 移植内容

```
packages/widget-kit/src/
├── WidgetExtension.ts       # 扩展接口定义
├── WidgetRegistry.ts        # 扩展注册中心
├── WidgetCardModel.ts       # 标准卡片数据模型
├── WidgetAction.ts          # 标准动作协议
└── WidgetRefreshPolicy.ts   # 刷新策略
```

### 注意事项

- `widget-kit` 完全不依赖具体平台，只定义协议和数据模型
- 各平台的小部件窗口实现（如 Windows 悬浮窗、移动端系统 Widget）需要各项目自行实现
- 可以直接复制文件到目标项目，无需修改

---

## 4. 移植 `packages/sync-webdav`（WebDAV 客户端）

### 适用场景

其他项目也需要 WebDAV 同步能力。

### 前置依赖

目标项目需要提供一个 `NetworkAdapter` 的实现（或直接传入 fetch 封装）。

### 移植方式

```bash
# npm 包方式
pnpm add @ame-todo/sync-webdav

# 或直接复制
cp -r ame-to-do/packages/sync-webdav/src ./src/sync-webdav
```

---

## 5. 移植功能模块（`packages/features/*`）

### 适用场景

其他项目需要本项目的完整功能模块（如万年历、事项管理）。

### 挑战

功能模块与本项目的业务服务、领域模型耦合度较高，直接移植成本较大。

### 推荐方式

#### 方式 A：作为整体模块引入（推荐）

确保目标项目也使用相同的架构（`packages/core` 的模块系统），然后：

```bash
pnpm add @ame-todo/feature-calendar
pnpm add @ame-todo/feature-item-manager
```

在目标项目的模块注册中心注册这些模块。

#### 方式 B：提取 UI，重写业务

如果只需要界面而不需要业务逻辑，可以只复制 `packages/features/*/ui/` 部分，业务服务由目标项目自行实现。

---

## 6. 移植质量 Checklist

移植完成后，请确认：

- [ ] 移植的代码在目标项目中可正常编译，无类型错误
- [ ] 如果是 UI 组件，视觉效果与原项目一致
- [ ] 没有将本项目的业务逻辑意外带入目标项目
- [ ] 没有直接修改原项目 `packages/` 下的代码（如需修改，应在本项目中改进后再移植）
- [ ] 主题、CSS 变量、Tailwind 配置在目标项目中正确生效

---

## 可移植性维护规则

为了确保本项目的资产长期保持良好的可移植性，所有开发者（包括 AI Agent）必须遵守以下规则：

### 对 `packages/shared` 的规则
- ❌ 禁止依赖任何本项目的其他业务包
- ❌ 禁止引入与具体平台相关的代码
- ✅ 必须提供完整的 TypeScript 类型定义
- ✅ 每个工具函数必须有 JSDoc 注释

### 对 `packages/ui` 的规则
- ❌ 禁止依赖业务服务（`packages/services`）
- ❌ 禁止依赖平台实现（`packages/platform-implementations`）
- ❌ 组件中禁止硬编码业务文案（使用 props 传入）
- ✅ 必须通过 CSS 变量实现主题，禁止在组件中硬编码颜色值
- ✅ 所有组件必须提供 Storybook 示例

### 对 `packages/features` 的规则
- ⚠️ 可以依赖 `packages/ui`、`packages/services`、`packages/core`
- ❌ 禁止依赖具体平台实现
- ✅ 模块必须通过统一的模块接口注册，提供明确的依赖声明
