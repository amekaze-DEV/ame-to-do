# Phase 1 代码验证与 Debug 方案

> 本方案覆盖 Task-01 ~ Task-04，目标是在进入 Phase 2 之前确认：项目能启动、目录结构正确、基础显示适配可用、SQLite 能连接。

---

## 1. Phase 1 范围与验收标准

| 任务 | 关键交付物 | 验收标准 |
|---|---|---|
| Task-01 项目初始化 | `src-tauri/`、`src/`、Vite + React + TS 配置 | `npx tauri dev` 可启动；窗口标题为 `AME to do`；TypeScript strict 模式无错误 |
| Task-02 Tailwind 与全局样式 | `tailwind.config.js`、`src/styles/globals.css`、显示工具函数 | 断点正常切换；DPI 适配后 root font-size 正确；CSS 变量可用 |
| Task-02.5 横竖屏与移动适配 | `useOrientation()`、`NavigationLayout`、安全区域/触控变量 | 基于宽高比判断方向；导航栏横屏在左/竖屏在下；最小窗口提示正常 |
| Task-03 Monorepo 目录结构 | `apps/*`、`packages/*`、`pnpm-workspace.yaml`、边界检查脚本占位 | 目录树符合 design.md；包名与路径映射正确 |
| Task-04 SQLite 连接 | `packages/data/src/sqlite/Database.ts` | Tauri 环境下可连接、建表、读写、`user_version` 可读写 |

---

## 2. 自动化验证（必须在真机/非沙盒环境执行）

### 2.1 类型与构建检查

```powershell
# 1. TypeScript 严格模式检查
npx tsc --noEmit

# 2. Vite 生产构建
npx vite build

# 3. Tauri 生产构建（验证 Rust 侧与前端集成）
npx tauri build
```

| 命令 | 期望结果 | 失败时排查 |
|---|---|---|
| `npx tsc --noEmit` | 0 errors，exit code 0 | 检查 `tsconfig.json` 是否继承 `tsconfig.base.json` 且 `strict: true`；检查路径别名是否解析 |
| `npx vite build` | 生成 `dist/` 且无 red error | 检查 Tailwind content 配置、CSS 变量、图片资源路径 |
| `npx tauri build` | 生成安装包/可执行文件 | 检查 Rust toolchain、Tauri CLI、图标资源完整性 |

### 2.2 依赖边界与架构合规检查

```powershell
# 占位脚本，当前版本输出目录扫描结果；后续 Task-11.5 实现后应返回非零 exit code
node scripts/check-boundaries.js
node scripts/check-platform-matrix.js
```

| 检查项 | 当前状态 | 说明 |
|---|---|---|
| `scripts/check-boundaries.js` | 占位 | Task-11.5 完成后实现真实扫描；Phase 1 只需确认脚本可运行 |
| `scripts/check-platform-matrix.js` | 占位 | Task-11.6 完成后实现真实扫描；Phase 1 只需确认脚本可运行 |

### 2.3 包管理器与工作区检查

```powershell
# 确认 pnpm workspace 配置正确
pnpm install
pnpm -r exec echo "workspace ok"
```

| 检查项 | 期望结果 |
|---|---|
| `pnpm-workspace.yaml` 包含 `apps/*`、`packages/*`、`packages/platform-implementations/*` | 所有子包被识别 |
| 各 `packages/*/package.json` 存在 | 子包可独立引用 |

---

## 3. 人工验证清单（必须在 Tauri 桌面窗口中执行）

### 3.1 Task-01 基础窗口与通信

| 验证项 | 操作步骤 | 期望结果 |
|---|---|---|
| 窗口标题 | 启动 `npx tauri dev` | 窗口标题显示 `AME to do` |
| Greet 功能 | 在输入框输入名字，点击 Greet | 下方显示 `Hello, {name}!` |
| 热重载 | 修改 `src/App.tsx` 保存 | 窗口内容自动刷新 |
| 关闭与重启 | 关闭窗口后重新运行 | 可正常重新启动 |

### 3.2 Task-02 Tailwind 与 DPI 适配

| 验证项 | 操作步骤 | 期望结果 |
|---|---|---|
| 标题颜色 | 观察页面标题 | `Welcome to AME to do` 为蓝色（`text-primary-600`） |
| 断点切换 | 拖动窗口宽度至 768px / 1024px / 1440px | 验证面板显示 `medium` / `expanded` / `wide`，且不重叠 |
| DPI 适配 | 在验证面板查看 DPR 与 root font-size | `root font-size` ≈ `16 × DPR`；标准 96 DPI 下 DPR=1、font-size=16px 为正常 |
| CSS 变量 | 检查主题色、surface、text、spacing 是否正常 | 页面无大面积样式丢失或默认浏览器样式 |

### 3.3 Task-02.5 横竖屏与布局

| 验证项 | 操作步骤 | 期望结果 |
|---|---|---|
| 方向判断 | 拖动窗口使高 > 宽 | 方向显示 `竖屏 portrait` |
| 方向判断 | 拖动窗口使宽 ≥ 高 | 方向显示 `横屏 landscape` |
| 导航位置 | 竖屏状态 | 导航栏位于底部 |
| 导航位置 | 横屏状态 | 导航栏位于左侧，宽度约 14rem (224px) |
| 布局模式切换 | 点击 `自动/强制竖屏/强制横屏` | 导航位置按所选模式切换，不受实际窗口比例影响 |
| 最小窗口提示 | 将窗口缩至 360×480 以下 | 顶部出现黄色警告条，提示窗口尺寸过小 |
| 触控目标 | 检查 Greet 按钮、导航按钮高度 | 不小于 44px（逻辑像素），即 `var(--touch-target-min)` |

### 3.4 Task-03 目录结构

| 验证项 | 操作步骤 | 期望结果 |
|---|---|---|
| 目录存在 | 检查 `apps/`、`packages/`、`docs/`、`scripts/` | 与 design.md 目录树一致 |
| 入口占位 | 检查 `apps/desktop-tauri/`、`apps/mobile-capacitor/`、`apps/web-preview/` | 均存在 `README.md` 或基础文件 |
| 包映射 | 检查 `tsconfig.json` paths | `@ame-todo/*` 别名指向正确目录 |

### 3.5 Task-04 SQLite 连接

| 验证项 | 操作步骤 | 期望结果 |
|---|---|---|
| 连接测试 | 点击 `测试 SQLite 连接` | 显示 `✓ 数据库连接正常` 与测试数据 `AME to do` |
| user_version | 点击连接测试 | 验证面板显示 `user_version` 递增 |
| 错误提示 | 在异常情况下（如未安装 Tauri 插件） | 显示具体错误信息，应用不崩溃 |

---

## 4. Debug 指南

### 4.1 类型检查失败

| 现象 | 可能原因 | 修复方法 |
|---|---|---|
| `Cannot find module '@ame-todo/data'` | TypeScript paths 未生效或文件不存在 | 确认 `tsconfig.json` 中 paths 配置；确认 `packages/data/src/index.ts` 存在 |
| `TS7006: Parameter implicitly has an 'any' type` | strict 模式未启用 | 确认 `tsconfig.base.json` 中 `strict: true` |
| `Cannot find module '@tauri-apps/plugin-sql'` | 依赖未安装 | 执行 `pnpm install` |

### 4.2 Tauri 窗口无法弹出

| 现象 | 可能原因 | 修复方法 |
|---|---|---|
| 命令执行后无窗口 | TRAE 沙盒目录访问限制 | 在 TRAE 设置中将命令运行方式从 `沙箱运行` 改为 `直接运行`；或在真机 PowerShell 中运行 |
| `error while running tauri application` | Rust 后端 panic | 查看 `src-tauri/src/main.rs` 与 `lib.rs` 日志 |
| 端口 1420 被占用 | Vite server 端口冲突 | 关闭占用端口的进程，或修改 `vite.config.ts` |

### 4.3 Tailwind 断点显示异常

| 现象 | 可能原因 | 修复方法 |
|---|---|---|
| 同时显示多个断点名（如 `mediumexpandedwide`） | 断点 span 未加默认 `hidden` | 参考 `src/App.tsx` 中每个断点 span 添加 `hidden` 与 `*:inline` |
| 样式完全未生效 | Tailwind content 配置遗漏文件 | 检查 `tailwind.config.js` content 是否包含 `./src/**/*.{js,ts,jsx,tsx}` |
| 主题色显示为黑色/默认色 | CSS 变量未定义 | 检查 `src/styles/globals.css` 中变量名与 Tailwind 配置一致 |

### 4.4 DPI / root font-size 异常

| 现象 | 可能原因 | 修复方法 |
|---|---|---|
| DPR 始终为 1 | 显示器为标准 96 DPI | 正常现象；若需验证高 DPI，可在系统显示设置中调整缩放比例 |
| root font-size 未随 DPR 变化 | `applyBaseFontSize` 未被调用 | 检查 `src/main.tsx` 是否引入并调用；resize 事件监听器是否注册 |
| 高 DPI 下文字模糊 | 未使用 rem/em 或 CSS 变量 | 统一使用 Tailwind 工具类与 CSS 变量，避免硬编码 px |

### 4.5 横竖屏判断错误

| 现象 | 可能原因 | 修复方法 |
|---|---|---|
| 方向未随窗口变化 | `resize` 事件未触发或 hook 未使用 | 检查 `useOrientation` 是否监听 `resize`；检查 `NavigationLayout` 是否正确消费 |
| 方向与预期相反 | 宽高比阈值错误 | 确认 `getOrientation` 中 `width >= height ? 'landscape' : 'portrait'` |
| 使用了传感器 API | 违反设计约束 | 全局搜索 `DeviceOrientationEvent`、`window.orientation` 并移除 |

### 4.6 SQLite 连接失败

| 现象 | 可能原因 | 修复方法 |
|---|---|---|
| 点击测试后提示权限/ capability 错误 | `src-tauri/capabilities/default.json` 未声明 SQL 插件权限 | 添加 `"sql:default"`、`"sql:allow-load"`、`"sql:allow-execute"`、`"sql:allow-select"`、`"sql:allow-close"` |
| `Plugin not found` | `@tauri-apps/plugin-sql` 未在 Tauri 中注册 | 检查 `src-tauri/src/lib.rs` 是否 `.plugin(tauri_plugin_sql::Builder::new().build())`；`Cargo.toml` 是否依赖 `tauri-plugin-sql` |
| `invalid url: sqlite:ame-to-do.db` | 数据库路径格式错误 | 确认路径前缀为 `sqlite:` |
| 在浏览器中测试失败 | SQLite 插件仅能在 Tauri 运行时中使用 | 必须在 `npx tauri dev` 窗口中测试 |

---

## 5. 验证环境要求

| 环境 | 用途 | 备注 |
|---|---|---|
| Windows 真机 PowerShell | 自动化命令与 Tauri 窗口验证 | TRAE 沙盒可能限制窗口弹出，关键验证在真机执行 |
| Node.js >= 20 + pnpm >= 9 | 包管理与脚本执行 | 与 `package.json` engines 一致 |
| Rust + Tauri CLI | Tauri 构建与运行 | 参考 Tauri 官方安装文档 |
| 不同 DPI 显示器或系统缩放设置 | DPI 适配验证 | 标准 96 DPI 下 DPR=1 为正常；125%/150% 缩放可验证 DPR>1 |

---

## 6. 验证报告模板

```markdown
## Phase 1 验证报告

- 验证日期：YYYY-MM-DD
- 验证环境：Windows 11 / Node 20.x / pnpm 9.x / Tauri CLI 2.x
- 验证人：

### 自动化检查

| 检查项 | 命令 | 结果 |
|---|---|---|
| TypeScript 严格检查 | `npx tsc --noEmit` | ✅ / ❌ |
| Vite 生产构建 | `npx vite build` | ✅ / ❌ |
| Tauri 生产构建 | `npx tauri build` | ✅ / ❌ |
| 工作区检查 | `pnpm -r exec echo ok` | ✅ / ❌ |

### 人工验证

| 验证项 | 结果 | 备注 |
|---|---|---|
| 窗口标题 `AME to do` | ✅ / ❌ | |
| Greet 功能 | ✅ / ❌ | |
| 断点切换 compact/medium/expanded/wide | ✅ / ❌ | |
| DPI 适配 root font-size | ✅ / ❌ | DPR= |
| 横竖屏方向判断 | ✅ / ❌ | |
| 导航位置切换 | ✅ / ❌ | |
| 最小窗口提示 | ✅ / ❌ | |
| SQLite 连接测试 | ✅ / ❌ | |

### 问题与修复

1. 问题：...
   修复：...

### 结论

- [ ] Phase 1 验收通过，可进入 Phase 2
- [ ] 存在阻塞问题，需修复后重新验证
```

---

## 7. Phase 1 退出标准

必须同时满足以下条件，方可进入 Phase 2：

1. `npx tsc --noEmit` 返回 0 errors
2. `npx vite build` 成功生成 `dist/`
3. `npx tauri dev` 能在真机正常启动 `AME to do` 窗口
4. Greet 功能正常（前后端通信链路可用）
5. 断点、方向、导航、最小窗口提示均正常
6. SQLite 连接测试通过
7. 目录结构与 design.md 一致
8. 未发现 `DeviceOrientationEvent` 或 `window.orientation` 等禁用 API

---

## 8. 关联文档

- [design.md](../design.md)
- [requirements.md](../requirements.md)
- [todo.md](../todo.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [PLATFORM_MATRIX.md](./PLATFORM_MATRIX.md)
