# packages/core

应用核心框架，平台无关。负责应用启动流程、模块生命周期、事件总线、配置抽象、日志抽象和错误体系。

## 目录说明

- `src/app/` - 启动流程、生命周期、运行模式
- `src/module/` - 模块注册、加载、开关、依赖检测
- `src/event/` - 事件总线，模块间通信唯一入口
- `src/config/` - 配置读写抽象
- `src/log/` - 日志抽象
- `src/errors/` - 错误码和错误对象

## 依赖规则

可依赖 `packages/shared`，禁止依赖 UI、Tauri、具体平台实现。
