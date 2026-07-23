# AME to do 开发任务清单

> 基于 requirements.md 和 design.md 拆分，每个任务控制在 **1-2 小时**内完成，按依赖关系排序。建议按阶段顺序执行，每完成一个阶段进行一次验证。

---

## 进度管理规则

`todo.md` 是项目唯一任务来源。`progress.md` 记录每日执行情况，`risk.md` 记录阻塞和风险。任务状态发生变化时，只更新状态和必要说明，不随意改动任务范围；如果任务范围变化，先同步 `requirements.md` 和 `design.md`。

### 任务状态

| 状态 | 使用条件 |
|---|---|
| 未开始 | 尚未执行 |
| 进行中 | TRAE 正在实施或调试 |
| 待验收 | TRAE 已完成实现，需要人工验证 |
| 已完成 | 人工确认通过 |
| 阻塞 | 缺少环境、权限、账号、外部服务或技术决策 |
| 返工 | 实现不符合需求、设计或体验预期 |

### 单任务执行闭环

每个任务按以下顺序推进：

1. 从 `todo.md` 选择当前任务。
2. 让 TRAE 读取 `requirements.md`、`design.md`、`todo.md` 中相关章节。
3. TRAE 修改文件并运行可自动验证的命令。
4. 人工验证真实体验或关键结果。
5. 将结果写入 `progress.md`。
6. 如果出现阻塞或风险，写入 `risk.md`。
7. 如果需求或设计有变化，先更新文档，再继续开发。

### 阶段验收

每个 Phase 结束后必须进行阶段验收。验收通过后，再进入下一阶段。

| 阶段 | 验收重点 |
|---|---|
| Phase 1 | 项目能启动，目录结构正确，数据库能连接 |
| Phase 2 | 核心框架、模块系统、配置、日志、事件总线可用 |
| Phase 3 | Windows 平台能力可用，包括通知、托盘、开机启动、WebDAV 连接 |
| Phase 4 | 万年历、倒班助手、事项管理、WebDAV 同步主流程可用 |
| Phase 5 | 模块开关、系统设置、Windows 小部件可用 |
| Phase 6 | 单文件 exe 可运行，核心场景全部通过 |

### 文档一致性检查

每完成一个 Phase，让 TRAE 执行一次文档一致性检查：

```text
请检查 requirements.md、design.md、todo.md、GUIDE.md、progress.md、risk.md 是否与当前实现一致。
如果发现不一致，请列出差异，并先修改文档。
不要新增功能。
```

---

## Phase 1：项目初始化与基础设施（0 依赖）

### Task-01：初始化 Tauri + React + TypeScript 项目
- **目标**：创建可运行的基础项目骨架
- **输入**：design.md 技术选型章节
- **输出**：`npm run tauri dev` 可正常启动空白窗口
- **步骤**：
  1. 使用 `npm create tauri-app@latest` 创建项目（选择 React + TypeScript）
  2. 验证开发模式可正常启动
  3. 配置 `tsconfig.json` 严格模式
  4. 提交初始 commit
- **耗时**：1h
- **阻塞**：无

### Task-02：配置 Tailwind CSS 与全局样式
- **目标**：搭建样式系统，配置 DPI 响应式基础
- **输入**：design.md 显示适配设计章节
- **输出**：Tailwind 正常工作，root font-size 支持动态调整
- **步骤**：
  1. 安装并配置 Tailwind CSS
  2. 配置 `tailwind.config.js` 响应式断点（compact / medium / expanded / wide）
  3. 创建全局样式文件，设置 CSS 变量（主题色、字号、间距）
  4. 编写 DPI 检测工具函数 `getBaseFontSize(scaleFactor)`
  5. 在应用入口动态设置 `document.documentElement.style.fontSize`
- **耗时**：1h
- **阻塞**：Task-01

### Task-03：搭建项目目录结构
- **目标**：按 design.md 迁移友好目录规范创建 Monorepo 结构
- **输入**：design.md 项目目录结构章节
- **输出**：完整 Monorepo 目录树，每个目录包含 `.gitkeep`、空 `index.ts` 或 `README.md`
- **步骤**：
  1. 创建 `apps/desktop-tauri/`，包含桌面端前端入口、`app-shell/` 和 `src-tauri/`
  2. 创建预留入口 `apps/mobile-capacitor/`、`apps/web-preview/`
  3. 创建 `packages/core/`，包含 app、module、event、config、log、errors
  4. 创建 `packages/domain/`，包含 calendar、item、sync、shared
  5. 创建 `packages/services/`，包含 calendar、item-manager、sync、module-settings、widget-data
  6. 创建 `packages/data/`，包含 repositories、sqlite、migrations、schemas、backup
  7. 创建 `packages/platform-contracts/`，放置所有平台能力接口
  8. 创建 `packages/platform-implementations/`，包含 windows-tauri、macos-tauri、linux-tauri、mobile-capacitor、mock
  9. 创建 `packages/ui/`、`packages/features/`、`packages/widget-kit/`、`packages/sync-webdav/`、`packages/shared/`
  10. 创建 `docs/PORTING_GUIDE.md`、`docs/PLATFORM_MATRIX.md`
  11. 创建 `pnpm-workspace.yaml` 和 `tsconfig.base.json`
- **耗时**：1.5h
- **阻塞**：Task-01

### Task-04：配置 SQLite 与数据库连接
- **目标**：集成 Tauri SQL 插件，实现数据库连接管理
- **输入**：design.md 数据库设计章节
- **输出**：数据库可连接，支持执行 SQL
- **步骤**：
  1. 安装 `@tauri-apps/plugin-sql`
  2. 配置 `apps/desktop-tauri/src-tauri/tauri.conf.json` 允许 SQL 插件
  3. 在 `packages/data/src/sqlite/` 实现 `Database.ts` 连接管理类
  4. 实现 `getUserVersion()` / `setUserVersion()` 方法
  5. 验证可执行基础 SQL 语句
- **耗时**：1.5h
- **阻塞**：Task-01

---

## Phase 2：核心框架层（依赖 Phase 1）

### Task-05：实现事件总线 EventBus
- **目标**：模块间通信基础设施
- **输入**：design.md 事件总线设计章节
- **输出**：EventBus 可订阅、发布、取消订阅
- **步骤**：
  1. 定义 `AppEvent` 类型枚举
  2. 实现 `EventBus` 类（on / emit / off）
  3. 添加错误处理：handler 异常不中断其他 handler
  4. 编写单元测试验证
- **耗时**：1h
- **阻塞**：Task-03

### Task-06：实现日志系统 Logger
- **目标**：统一日志输出，支持文件日志
- **输入**：design.md 日志相关章节
- **输出**：日志可输出到控制台和数据目录
- **步骤**：
  1. 安装 `tauri-plugin-log`
  2. 配置日志级别和文件输出路径（`${dataDir}/logs/`）
  3. 封装 `Logger` 类（debug / info / warn / error）
  4. 实现日志文件按日期轮转
  5. 验证日志文件正常生成
- **耗时**：1.5h
- **阻塞**：Task-04（需要数据目录路径）

### Task-07：实现配置管理 ConfigStore
- **目标**：本地配置的读写管理
- **输入**：design.md 配置相关章节
- **输出**：配置可持久化到 JSON 文件
- **步骤**：
  1. 定义配置类型接口（主题、通知、WebDAV、模块开关等）
  2. 实现 `ConfigStore` 类，读写 `${dataDir}/config.json`
  3. 配置变更时触发 `config:changed` 事件
  4. 添加配置默认值和验证
- **耗时**：1h
- **阻塞**：Task-05, Task-06

### Task-08：定义平台适配器接口
- **目标**：抽象所有平台能力接口
- **输入**：design.md 平台适配层设计章节
- **输出**：`packages/platform-contracts/src/` 完整接口定义
- **步骤**：
  1. 定义 `PlatformAdapter` 总接口
  2. 定义 9 个子适配器接口：FileSystem、Notification、SecureStorage、Network、TaskScheduler、AutoLaunch、Widget、Tray、Display
  3. 明确 `WidgetAdapter` 只表示平台小部件承载能力，初始版本仅要求 Windows 实现
  4. 在 `packages/widget-kit/` 定义平台无关 `WidgetExtension`、`WidgetCardModel`、`WidgetAction`、`WidgetRefreshPolicy`
  5. 定义各接口的参数和返回类型
  6. 为每个接口添加 TRAE 后续维护注释说明
  7. 确认 `packages/domain`、`packages/services` 不直接依赖具体平台实现
- **耗时**：1.5h
- **阻塞**：Task-03

### Task-09：实现数据库迁移系统
- **目标**：数据库版本管理和自动迁移
- **输入**：design.md 数据库设计章节
- **输出**：支持从 v0 迁移到当前版本
- **步骤**：
  1. 在 `packages/data/src/migrations/` 创建 `v1_init.sql`（建表：items、calendar_cache、shift_templates、shift_schedules、shift_overrides、sync_metadata、module_states）
  2. 在 `packages/data/src/migrations/` 创建 `v2_add_widget_config.sql`
  3. 实现 `Database.migrate()` 方法
  4. 实现迁移脚本加载和执行
  5. 验证迁移流程：删除 db 文件后重启可自动重建
- **耗时**：1.5h
- **阻塞**：Task-04

### Task-10：实现模块注册与加载系统
- **目标**：模块可注册、加载、卸载
- **输入**：design.md 模块系统设计章节
- **输出**：模块系统可管理模块生命周期
- **步骤**：
  1. 定义 `ModuleDefinition`、`ModuleInstance`、`ModuleContext` 接口
  2. 实现 `ModuleRegistry`：注册、查询、列出所有模块
  3. 实现 `ModuleLoader`：加载模块、检查依赖、调用 entry
  4. 实现模块生命周期管理（registered → inactive → loading → active → unloading）
  5. 在 `packages/features/` 中编写测试模块验证加载流程
- **耗时**：1.5h
- **阻塞**：Task-05, Task-07, Task-08

### Task-11：实现模块开关管理 ModuleManager
- **目标**：支持启用/禁用模块，处理依赖关系
- **输入**：design.md 模块系统设计 + requirements.md 模块开关管理
- **输出**：可在代码层面启用/禁用模块
- **步骤**：
  1. 实现 `ModuleManager` 类
  2. 实现依赖检测 `checkDependencies()`
  3. 实现反向依赖检测（禁用某模块时检测受影响模块）
  4. 实现模块数据保留逻辑（禁用时不删除数据）
  5. 将模块状态持久化到 `module_states` 表
- **耗时**：1.5h
- **阻塞**：Task-10, Task-09

---

## Phase 3：Windows 平台适配实现（依赖 Phase 2）

### Task-12：实现 Windows 文件系统适配
- **目标**：数据目录读写、便携模式支持
- **输入**：design.md 单文件封装方案 + 平台适配层
- **输出**：数据目录自动创建，文件可读写
- **步骤**：
  1. 在 `packages/platform-implementations/windows-tauri/` 实现 `WindowsFileSystemAdapter`
  2. 在 `apps/desktop-tauri/src-tauri/src/commands/fs.rs` 实现 `getExeDirectory()` 获取可执行文件目录
  3. 实现数据目录自动创建逻辑（`./ame-to-do-data/{db,logs,cache,backups}`）
  4. 集成到 `packages/core/src/app/bootstrap.ts` 启动流程
  5. 验证：删除数据目录后重启可自动重建
- **耗时**：1.5h
- **阻塞**：Task-08

### Task-13：实现 Windows 安全存储适配
- **目标**：WebDAV 凭据安全保存
- **输入**：design.md 安全设计章节
- **输出**：凭据可加密保存和读取
- **步骤**：
  1. 在 `apps/desktop-tauri/src-tauri/src/commands/` 实现凭据管理命令（`set_credential` / `get_credential` / `delete_credential`）
  2. Windows 下使用 Credential Manager API
  3. 在 `packages/platform-implementations/windows-tauri/` 封装 `WindowsSecureStorageAdapter`
  4. 验证凭据不暴露在应用层内存中
- **耗时**：1.5h
- **阻塞**：Task-08

### Task-14：实现 Windows 通知适配
- **目标**：系统原生通知能力
- **输入**：design.md 通知适配器接口 + requirements.md 通知需求
- **输出**：可发送即时通知和定时通知
- **步骤**：
  1. 安装 `tauri-plugin-notification`
  2. 在 `apps/desktop-tauri/src-tauri/src/commands/notification.rs` 实现通知命令
  3. 在 `packages/platform-implementations/windows-tauri/` 实现 `WindowsNotificationAdapter`
  4. 实现 `showNotification`、`scheduleNotification`、`cancelNotification`
  5. 验证通知正常显示
- **耗时**：1.5h
- **阻塞**：Task-08

### Task-15：实现 Windows 托盘适配
- **目标**：系统托盘图标和右键菜单
- **输入**：design.md 托盘适配器接口 + requirements.md 系统托盘需求
- **输出**：最小化到托盘，托盘菜单可交互
- **步骤**：
  1. 安装 `tauri-plugin-tray-icon`（或 Tauri 内置 tray）
  2. 在 `apps/desktop-tauri/src-tauri/src/commands/tray.rs` 实现托盘命令
  3. 在 `packages/platform-implementations/windows-tauri/` 实现 `WindowsTrayAdapter`
  4. 配置托盘图标、tooltip、右键菜单（显示主窗口、退出）
  5. 验证最小化到托盘功能
- **耗时**：1.5h
- **阻塞**：Task-08

### Task-16：实现 Windows 开机启动适配
- **目标**：注册表开机启动配置
- **输入**：design.md 开机启动设计 + requirements.md 开机启动需求
- **输出**：可设置/取消开机启动
- **步骤**：
  1. 安装 `tauri-plugin-autostart`
  2. 在 `apps/desktop-tauri/src-tauri/src/commands/autolaunch.rs` 实现 `set_auto_launch` 命令
  3. 在 `packages/platform-implementations/windows-tauri/` 实现 `WindowsAutoLaunchAdapter`
  4. 传递 `--minimized` 启动参数
  5. 验证注册表中存在/移除启动项
- **耗时**：1h
- **阻塞**：Task-08

### Task-17：实现 Windows 显示适配
- **目标**：DPI 检测和多显示器支持
- **输入**：design.md 显示适配设计 + requirements.md 显示适配需求
- **输出**：可获取 DPI 缩放比例和显示器信息
- **步骤**：
  1. 在 `packages/platform-implementations/windows-tauri/` 实现 `WindowsDisplayAdapter`
  2. 实现 `getScaleFactor()`（通过 Tauri window API）
  3. 实现 `getDisplays()` 获取多显示器信息
  4. 实现 `onDisplayChanged()` 监听分辨率/DPI 变化
  5. 验证 DPI 变化时 root font-size 自动调整
- **耗时**：1.5h
- **阻塞**：Task-08, Task-02

### Task-18：实现网络适配与 WebDAV 客户端
- **目标**：HTTP 请求和 WebDAV 协议支持
- **输入**：design.md 网络适配器 + WebDAV 同步设计
- **输出**：可连接 WebDAV 服务器，执行 PROPFIND/GET/PUT/DELETE
- **步骤**：
  1. 在 `packages/platform-implementations/windows-tauri/` 实现 `NetworkAdapter`（基于 Tauri HTTP API）
  2. 在 `packages/sync-webdav/` 实现 `WebDAVClient` 类（封装 WebDAV 方法，保持平台无关）
  3. 支持基本认证（Basic Auth）
  4. 实现连接测试方法
  5. 用坚果云/自建 WebDAV 验证连接
- **耗时**：1.5h
- **阻塞**：Task-08

---

## Phase 4：业务模块开发（依赖 Phase 2, Phase 3）

### Task-19：实现万年历模块（数据层 + 服务层）
- **目标**：节假日数据缓存、日期查询和倒班助手推算
- **输入**：requirements.md 万年历模块 + design.md 数据库设计
- **输出**：可查询公历、农历、节假日、调休信息和当日班次
- **步骤**：
  1. 集成 `lunar-javascript` 库计算农历
  2. 实现 `CalendarService`：日期查询、农历转换、节气计算
  3. 实现节假日数据本地缓存（写入 calendar_cache 表）
  4. 准备初始节假日数据（内置中国大陆节假日 JSON）
  5. 实现 `ShiftAssistantService`：班次模板、轮班周期、起始日期、临时调整
  6. 实现班次推算逻辑：临时调整优先于周期规则
  7. 实现跨天班次处理和班前提醒数据生成
  8. 编写单元测试验证日期计算、轮班周期推算和临时调整优先级
- **耗时**：2h
- **阻塞**：Task-09

### Task-20：实现万年历模块（UI 层）
- **目标**：月视图、日期详情、节假日展示和倒班助手界面
- **输入**：requirements.md 万年历页面布局
- **输出**：可视化的万年历界面，支持班次叠加显示和倒班助手配置
- **步骤**：
  1. 实现月视图组件（按周展示日期格）
  2. 实现日期详情弹窗/面板
  3. 展示农历、节气、节假日、调休标记和班次标记
  4. 实现班次模板管理界面（新增、编辑、删除、颜色选择）
  5. 实现轮班周期配置界面（周期步骤、天数、起始日期）
  6. 实现临时班次调整入口
  7. 实现月份切换、年份跳转、返回今日
  8. 适配响应式布局（compact / expanded）
- **耗时**：2h
- **阻塞**：Task-19, Task-02

### Task-21：实现事项管理模块（数据层 + 服务层）
- **目标**：事项的增删改查和提醒调度
- **输入**：requirements.md 事项管理模块 + design.md 数据库设计
- **输出**：事项数据可持久化，提醒可触发
- **步骤**：
  1. 实现 `ItemService`：CRUD、筛选、排序
  2. 实现优先级排序逻辑
  3. 实现重复规则解析器（daily/weekly/monthly/custom）
  4. 实现提醒调度器（检测到期事项并触发事件）
  5. 实现错过提醒补偿逻辑（启动时检测）
- **耗时**：1.5h
- **阻塞**：Task-09, Task-05

### Task-22：实现事项管理模块（UI 层）
- **目标**：事项列表、新增/编辑、筛选
- **输入**：requirements.md 事项管理页面布局
- **输出**：完整的事项管理界面
- **步骤**：
  1. 实现事项列表组件（支持筛选、排序）
  2. 实现新增/编辑事项表单
  3. 实现优先级标记和完成状态切换
  4. 实现待办事项和定时事项的区分展示
  5. 同步状态视觉标识（已同步/未同步/冲突）
- **耗时**：1.5h
- **阻塞**：Task-21, Task-02

### Task-23：实现 WebDAV 同步模块
- **目标**：数据可同步到 WebDAV，支持冲突处理
- **输入**：requirements.md WebDAV 同步 + design.md 同步设计
- **输出**：手动同步成功，冲突可检测
- **步骤**：
  1. 实现 `SyncService`：同步流程编排
  2. 实现远程索引下载和上传
  3. 实现三向合并逻辑（基于 lastSyncIndex）
  4. 实现冲突检测和标记
  5. 实现同步状态展示和错误重试
  6. 用测试 WebDAV 服务器验证端到端同步
- **耗时**：2h
- **阻塞**：Task-18, Task-21

---

## Phase 5：高级功能模块（依赖 Phase 4）

### Task-24：实现模块开关管理 UI
- **目标**：用户可界面化启用/禁用模块
- **输入**：requirements.md 模块开关管理 + design.md 模块系统
- **输出**：模块管理页面可交互
- **步骤**：
  1. 实现模块列表展示页面
  2. 实现模块开关组件（带依赖提示）
  3. 禁用模块时检测并提示反向依赖
  4. 模块状态变更后动态加载/卸载 UI
  5. 模块状态持久化到数据库
- **耗时**：1.5h
- **阻塞**：Task-11, Task-20, Task-22

### Task-25：实现系统设置页面
- **目标**：整合所有配置项的设置界面
- **输入**：requirements.md 系统设置 + 信息架构
- **输出**：完整的设置页面
- **步骤**：
  1. 实现设置分类导航（本地数据、同步、开机启动、小部件、模块开关、日志）
  2. 实现 WebDAV 配置表单 + 连接测试按钮
  3. 实现开机启动开关
  4. 实现数据导入/导出功能（JSON 格式）
  5. 实现日志查看和清理功能
- **耗时**：1.5h
- **阻塞**：Task-07, Task-16, Task-24

### Task-26：实现 Windows 桌面小部件与标准扩展协议
- **目标**：实现 Windows 桌面小部件，并支持功能模块通过标准接口扩展小部件卡片
- **输入**：requirements.md 桌面小部件 + design.md 小部件设计
- **输出**：Windows 小部件窗口可显示、可拖动、可点击跳转；`widget-kit` 可注册和渲染标准卡片
- **步骤**：
  1. 在 `packages/widget-kit/` 实现 `WidgetExtension`、`WidgetRegistry`、`WidgetCardModel`、`WidgetAction`
  2. 实现初始内置扩展：`calendar.today`、`calendar.todayShift`、`item.todayTodo`、`item.upcomingReminder`
  3. 在 `packages/platform-implementations/windows-tauri/` 实现 `WindowsWidgetAdapter`
  4. 在 `apps/desktop-tauri` 创建小部件独立窗口（Tauri WebviewWindow）
  5. 实现 Windows 小部件 UI，渲染标准化卡片数据
  6. 实现窗口拖动、位置/大小/透明度设置
  7. 实现标准动作协议：打开日期、打开事项、打开模块页面
  8. 实现多显示器位置记忆和全屏自动隐藏
  9. 在文档中标注：其他平台同类功能需单独设计平台形态，但复用 `widget-kit`
- **耗时**：2h
- **阻塞**：Task-17, Task-20, Task-22

### Task-27：实现首页 Dashboard
- **目标**：整合今日信息的入口页面
- **输入**：requirements.md 首页信息架构
- **输出**：首页展示今日概览
- **步骤**：
  1. 实现今日日期/农历/节假日展示
  2. 实现今日待办列表（取前 N 条）
  3. 实现即将提醒列表
  4. 添加快捷入口（跳转到万年历/事项管理）
  5. 响应式布局适配
- **耗时**：1h
- **阻塞**：Task-20, Task-22

---

## Phase 6：集成测试与发布（依赖 Phase 5）

### Task-28：启动流程与参数处理集成
- **目标**：完整的应用启动流程
- **输入**：design.md 启动参数处理 + 单文件封装方案
- **输出**：各种启动场景正常
- **步骤**：
  1. 实现 `bootstrap.ts`：初始化数据目录 → 连接数据库 → 加载配置 → 注册模块 → 加载已启用模块
  2. 处理 `--minimized` 参数（开机启动场景）
  3. 处理 `--show-widget` 参数
  4. 正常启动显示首页
  5. 验证首次启动自动创建数据目录
- **耗时**：1.5h
- **阻塞**：Task-12, Task-27, Task-26

### Task-29：端到端场景测试
- **目标**：验证核心使用场景全部可用
- **输入**：requirements.md 六大核心场景
- **输出**：场景测试报告
- **步骤**：
  1. 场景一：查看节假日和调休（万年历）
  2. 场景二：记录个人待办（事项管理）
  3. 场景三：维护定时事项（提醒触发）
  4. 场景四：跨设备同步（WebDAV 上传/下载）
  5. 场景五：桌面小部件查看信息
  6. 场景六：开机启动 + 托盘运行
  7. 记录并修复发现的问题
- **耗时**：2h
- **阻塞**：Task-28

### Task-30：构建单文件可执行程序
- **目标**：生产环境构建，验证单文件便携性
- **输入**：design.md 构建与发布章节
- **输出**：`AME-to-do.exe` 单文件
- **步骤**：
  1. 配置 `tauri.conf.json` 生产构建参数
  2. 执行 `npm run tauri build`
  3. 验证构建产物为单个可执行文件
  4. 复制到干净环境（无 Node.js）测试运行
  5. 验证数据目录自动创建
  6. 验证复制到新位置后数据目录重新创建
- **耗时**：1.5h
- **阻塞**：Task-29

### Task-31：完善文档与代码注释
- **目标**：确保 TRAE 可理解全部代码，并保证后续项目移植有明确边界
- **输入**：requirements.md AI Agent 维护规范 + design.md 注释规范 + design.md 迁移边界规则 + GUIDE.md TRAE 协作规范
- **输出**：文档和注释符合规范
- **步骤**：
  1. 检查所有公共 API 是否有 JSDoc 注释
  2. 检查复杂逻辑是否有"为什么"注释
  3. 完善每个模块的 `README.md`
  4. 更新 `docs/ARCHITECTURE.md`
  5. 新增或更新 `docs/PORTING_GUIDE.md`，说明新增平台入口和平台实现的步骤
  6. 新增或更新 `docs/PLATFORM_MATRIX.md`，列出 Windows、macOS、Linux、Android、iOS、鸿蒙的平台能力支持状态
  7. 检查错误码是否覆盖所有异常情况
  8. 运行 `scripts/check-boundaries.js`，检查业务层是否误依赖平台实现
  9. 最终代码审查
- **耗时**：1.5h
- **阻塞**：Task-30

---

## 任务依赖图

```text
Phase 1: 基础设施
  Task-01 → Task-02 → Task-03
  Task-01 → Task-04

Phase 2: 核心框架
  Task-03 + Task-04 → Task-05, Task-08, Task-09
  Task-05 + Task-06 + Task-07 → Task-10
  Task-10 + Task-09 → Task-11

Phase 3: 平台适配
  Task-08 → Task-12 ~ Task-18（可并行）

Phase 4: 业务模块
  Task-09 → Task-19, Task-21
  Task-19 + Task-02 → Task-20
  Task-21 + Task-02 → Task-22
  Task-18 + Task-21 → Task-23

Phase 5: 高级功能
  Task-11 + Task-20 + Task-22 → Task-24
  Task-07 + Task-16 + Task-24 → Task-25
  Task-17 + Task-20 + Task-22 → Task-26
  Task-20 + Task-22 → Task-27

Phase 6: 集成发布
  Task-12 + Task-27 + Task-26 → Task-28
  Task-28 → Task-29
  Task-29 → Task-30
  Task-30 → Task-31
```

## 预估总工时

| 阶段 | 任务数 | 预估工时 |
|---|---|---|
| Phase 1：基础设施 | 4 | 5h |
| Phase 2：核心框架 | 7 | 9h |
| Phase 3：平台适配 | 7 | 10h |
| Phase 4：业务模块 | 5 | 9h |
| Phase 5：高级功能 | 4 | 6h |
| Phase 6：集成发布 | 4 | 6.5h |
| **合计** | **31** | **约 45.5h** |

> 按每天 6 小时有效开发时间计算，**约 7-8 个工作日**完成初始版本。

## 执行建议

1. **每完成一个 Phase 进行集成验证**，不要累积到最后一刻
2. **Phase 3 的 7 个平台适配任务可并行开发**，适合分工协作
3. **Task-29（端到端测试）是质量关卡**，发现问题及时回溯修复
4. **Task-31 必须最后执行**，确保文档与代码同步
