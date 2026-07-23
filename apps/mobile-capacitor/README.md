# apps/mobile-capacitor

预留：Android / iOS / 鸿蒙移动端入口。

迁移时在此目录下创建 Capacitor 工程，复用 `packages/domain`、`packages/services`、`packages/data`、`packages/ui`、`packages/features`。

仅在平台入口中处理窗口、权限、系统通知、文件路径、安全存储等差异。
