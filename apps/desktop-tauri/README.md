# apps/desktop-tauri

Windows 初始版本的 Tauri 桌面应用入口。负责装配平台适配器、初始化业务模块、组合页面路由。

## 目录说明

- `src/main.tsx` - React 应用挂载入口
- `src/App.tsx` - 桌面端根组件，只组合路由和布局
- `src/routes/` - 桌面端页面路由
- `src/app-shell/` - 桌面窗口、托盘、小部件窗口装配
- `src-tauri/` - Tauri Rust 后端，仅用于桌面平台能力桥接

## TRAE 维护注意

此目录只负责装配，禁止写入业务规则。业务规则应放在 `packages/services`、`packages/domain` 中。
