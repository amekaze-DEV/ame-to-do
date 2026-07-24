#!/usr/bin/env node
/**
 * 架构边界检查脚本
 *
 * 扫描项目中所有 TypeScript/JavaScript 文件的 import 语句，
 * 检查是否有违反架构分层依赖规则的引用。
 *
 * 规则来源：design.md "迁移边界规则" 章节
 *
 * 用法：
 *   node scripts/check-boundaries.js
 *   node scripts/check-boundaries.js --json   (输出 JSON 格式)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(PROJECT_ROOT, 'packages');

const BOUNDARY_RULES = {
  'packages/domain': {
    allow: ['packages/shared'],
    deny: [
      'packages/ui',
      'packages/services',
      'packages/core',
      'packages/data',
      'packages/features',
      'packages/platform-implementations',
      'packages/platform-contracts',
      '@tauri-apps',
      'react',
    ],
    reason: '领域模型必须完全平台无关，禁止依赖 UI、框架或任何平台 API',
  },
  'packages/services': {
    allow: [
      'packages/domain',
      'packages/data',
      'packages/platform-contracts',
      'packages/shared',
      'packages/core',
    ],
    deny: [
      'packages/platform-implementations',
      'packages/ui',
      'packages/features',
      '@tauri-apps/plugin-',
    ],
    reason: '业务服务只依赖抽象接口，不得直接依赖平台实现或 UI',
  },
  'packages/data': {
    allow: [
      'packages/domain',
      'packages/shared',
    ],
    deny: [
      'packages/ui',
      'packages/services',
      'packages/features',
      'packages/platform-implementations',
      '@tauri-apps/api/window',
      '@tauri-apps/api/notification',
    ],
    reason: '数据层只关心持久化，不得依赖 UI 或平台特定能力',
  },
  'packages/platform-contracts': {
    allow: ['packages/shared'],
    deny: [
      'packages/platform-implementations',
      'packages/domain',
      'packages/services',
      'packages/ui',
      'packages/features',
      '@tauri-apps',
    ],
    reason: '平台契约层只定义接口，不得依赖任何具体实现',
  },
  'packages/platform-implementations': {
    allow: [
      'packages/platform-contracts',
      'packages/shared',
      'packages/core',
    ],
    deny: [
      'packages/ui',
      'packages/features',
      'packages/domain',
      'packages/services',
    ],
    reason: '平台实现只关注能力实现，不得包含业务 UI 或领域规则',
  },
  'packages/ui': {
    allow: ['packages/shared'],
    deny: [
      'packages/services',
      'packages/platform-implementations',
      'packages/domain',
      'packages/features',
      '@tauri-apps',
    ],
    reason: '基础 UI 组件必须与业务解耦，不得依赖业务服务或平台实现',
  },
  'packages/features': {
    allow: [
      'packages/ui',
      'packages/services',
      'packages/core',
      'packages/domain',
      'packages/shared',
      'packages/platform-contracts',
    ],
    deny: [
      'packages/platform-implementations',
    ],
    reason: '功能模块通过抽象接口使用平台能力，不得直接依赖具体实现',
  },
};

function getPackageDir(filePath) {
  const relative = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
  const parts = relative.split('/');
  if (parts[0] === 'packages' && parts.length >= 2) {
    return `packages/${parts[1]}`;
  }
  return null;
}

function isAllowedImport(packageDir, importPath) {
  const rules = BOUNDARY_RULES[packageDir];
  if (!rules) return { allowed: true };

  for (const denyPattern of rules.deny) {
    if (importPath.startsWith(denyPattern) || importPath.includes(denyPattern)) {
      return {
        allowed: false,
        reason: rules.reason,
        denyPattern,
      };
    }
  }

  return { allowed: true };
}

function parseImports(content) {
  const imports = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const importMatch = line.match(/^import\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      imports.push({ path: importMatch[1], line: i + 1 });
      continue;
    }

    const typeImportMatch = line.match(/^import\s+type\s+['"]([^'"]+)['"]/);
    if (typeImportMatch) {
      imports.push({ path: typeImportMatch[1], line: i + 1 });
      continue;
    }

    const requireMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (requireMatch) {
      imports.push({ path: requireMatch[1], line: i + 1 });
    }
  }

  return imports;
}

function findTsFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      files.push(...findTsFiles(fullPath));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

const outputJson = process.argv.includes('--json');

const allFiles = findTsFiles(PACKAGES_DIR);
const violations = [];
let checkedFiles = 0;

for (const file of allFiles) {
  const packageDir = getPackageDir(file);
  if (!packageDir || !BOUNDARY_RULES[packageDir]) continue;

  const content = fs.readFileSync(file, 'utf-8');
  const imports = parseImports(content);
  checkedFiles++;

  for (const imp of imports) {
    const check = isAllowedImport(packageDir, imp.path);
    if (!check.allowed) {
      const relativePath = path.relative(PROJECT_ROOT, file).replace(/\\/g, '/');
      violations.push({
        file: relativePath,
        line: imp.line,
        import: imp.path,
        packageDir,
        denyPattern: check.denyPattern,
        reason: check.reason,
      });
    }
  }
}

if (outputJson) {
  console.log(JSON.stringify({
    checkedFiles,
    violationCount: violations.length,
    violations,
  }, null, 2));
} else {
  console.log('=== 架构边界检查 ===');
  console.log(`检查文件数: ${checkedFiles}`);
  console.log(`违规数: ${violations.length}`);
  console.log('');

  if (violations.length === 0) {
    console.log('✓ 所有文件均符合架构边界规则');
  } else {
    for (const v of violations) {
      console.log(`✗ ${v.file}:${v.line}`);
      console.log(`  import: "${v.import}"`);
      console.log(`  违规: ${v.packageDir} 禁止依赖 ${v.denyPattern}`);
      console.log(`  原因: ${v.reason}`);
      console.log('');
    }
  }
}

process.exit(violations.length > 0 ? 1 : 0);
