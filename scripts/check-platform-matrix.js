#!/usr/bin/env node
/**
 * 平台能力矩阵一致性检查脚本
 *
 * 对比 docs/PLATFORM_MATRIX.md 中的状态标记与
 * packages/platform-implementations/* 中的实际实现，检查是否存在不一致。
 *
 * 检测规则：
 *  - 标记为 ✅ 但实际方法抛出 NotSupportedError → 不一致
 *  - 标记为 ❌/⏳ 但实际方法已实现（不抛 NotSupportedError）→ 不一致
 *
 * 用法：
 *   node scripts/check-platform-matrix.js
 *   node scripts/check-platform-matrix.js --json   (输出 JSON 格式)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MATRIX_FILE = path.join(PROJECT_ROOT, 'docs', 'PLATFORM_MATRIX.md');
const IMPLEMENTATIONS_DIR = path.join(PROJECT_ROOT, 'packages', 'platform-implementations');

const PLATFORM_MAP = {
  'Windows (Tauri)': 'windows-tauri',
  'macOS (Tauri)': 'macos-tauri',
  'Linux (Tauri)': 'linux-tauri',
  'Android (Capacitor)': 'mobile-capacitor',
  'iOS (Capacitor)': 'mobile-capacitor',
  'Web 预览': null,
};

const STATUS_IMPLEMENTED = ['✅'];
const STATUS_NOT_IMPLEMENTED = ['⏳', '🔍', '❌', '🚧'];

function parsePlatformMatrix() {
  const content = fs.readFileSync(MATRIX_FILE, 'utf-8');
  const lines = content.split('\n');

  const rows = [];
  let inTable = false;
  let headers = [];

  for (const line of lines) {
    if (line.includes('能力分类') && line.includes('能力项')) {
      inTable = true;
      headers = line.split('|').map((h) => h.trim()).filter(Boolean);
      continue;
    }

    if (inTable && line.startsWith('|---')) {
      continue;
    }

    if (inTable && line.startsWith('|')) {
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 3) {
        const [category, capability, ...platformStatuses] = cells;

        for (let i = 0; i < platformStatuses.length && i + 2 < headers.length; i++) {
          const platformName = headers[i + 2];
          const status = platformStatuses[i];
          rows.push({
            category,
            capability,
            platformName,
            status,
          });
        }
      }
    }

    if (inTable && !line.startsWith('|') && line.trim().length > 0 && rows.length > 0) {
      break;
    }
  }

  return rows;
}

function getPlatformImplementations() {
  const impls = {};
  const dirs = fs.readdirSync(IMPLEMENTATIONS_DIR, { withFileTypes: true });

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const platformName = dir.name;
    const srcDir = path.join(IMPLEMENTATIONS_DIR, platformName, 'src');
    if (!fs.existsSync(srcDir)) continue;

    const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.ts'));
    const sources = {};

    for (const file of files) {
      const filePath = path.join(srcDir, file);
      sources[file] = fs.readFileSync(filePath, 'utf-8');
    }

    impls[platformName] = sources;
  }

  return impls;
}

function checkImplementationExists(sources, capabilityKeyword) {
  const allSource = Object.values(sources).join('\n');

  if (!allSource || allSource.trim().length === 0) {
    return false;
  }

  const hasStubOnly = allSource.includes('NotSupportedError') ||
    allSource.includes('not supported') ||
    allSource.includes('throw new Error');

  const hasRealImplementation = allSource.includes('return ') ||
    allSource.includes('await ') ||
    allSource.includes('console.');

  if (hasStubOnly && !hasRealImplementation) {
    return false;
  }

  return allSource.length > 100;
}

function detectInconsistencies() {
  const matrixRows = parsePlatformMatrix();
  const implementations = getPlatformImplementations();
  const inconsistencies = [];
  let checkedItems = 0;

  for (const row of matrixRows) {
    const platformDir = PLATFORM_MAP[row.platformName];
    if (!platformDir) continue;

    const impl = implementations[platformDir];
    if (!impl) continue;

    const matrixSaysImplemented = STATUS_IMPLEMENTED.some((s) => row.status.includes(s));
    const actuallyImplemented = checkImplementationExists(impl, row.capability);

    checkedItems++;

    if (matrixSaysImplemented && !actuallyImplemented) {
      inconsistencies.push({
        type: 'false_positive',
        category: row.category,
        capability: row.capability,
        platform: row.platformName,
        matrixStatus: row.status,
        message: `文档标记为已实现 (${row.status})，但实际实现中仅包含占位符`,
      });
    }

    if (!matrixSaysImplemented && actuallyImplemented) {
      inconsistencies.push({
        type: 'false_negative',
        category: row.category,
        capability: row.capability,
        platform: row.platformName,
        matrixStatus: row.status,
        message: `文档标记为 ${row.status}，但实际已有实现，建议更新文档`,
      });
    }
  }

  return { inconsistencies, checkedItems };
}

const outputJson = process.argv.includes('--json');
const { inconsistencies, checkedItems } = detectInconsistencies();

if (outputJson) {
  console.log(JSON.stringify({
    checkedItems,
    inconsistencyCount: inconsistencies.length,
    inconsistencies,
  }, null, 2));
} else {
  console.log('=== 平台能力矩阵一致性检查 ===');
  console.log(`检查项数: ${checkedItems}`);
  console.log(`不一致数: ${inconsistencies.length}`);
  console.log('');

  if (inconsistencies.length === 0) {
    console.log('✓ 文档与实际实现一致');
  } else {
    for (const inc of inconsistencies) {
      const icon = inc.type === 'false_positive' ? '✗' : '⚠';
      console.log(`${icon} [${inc.platform}] ${inc.category} / ${inc.capability}`);
      console.log(`  文档状态: ${inc.matrixStatus}`);
      console.log(`  ${inc.message}`);
      console.log('');
    }
  }
}

process.exit(inconsistencies.length > 0 ? 1 : 0);
