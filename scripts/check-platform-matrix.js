#!/usr/bin/env node
/**
 * 平台能力矩阵检查脚本
 *
 * 对比 packages/platform-implementations/* 中的实际实现与
 * docs/PLATFORM_MATRIX.md 中的状态标记，检查是否存在不一致。
 *
 * 例如：PLATFORM_MATRIX.md 中标记某能力为 ✅，但实际实现中
 * 该方法抛出了 NotSupportedError，则报告不一致。
 *
 * 用法：
 *   node scripts/check-platform-matrix.js
 */

// TODO: 在平台实现完成后使用
console.log('[check-platform-matrix] 平台能力矩阵检查脚本（占位符）');
console.log('[check-platform-matrix] 待平台适配层实现后启用');
process.exit(0);
