import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

/**
 * ESLint 配置
 *
 * 与 scripts/check-boundaries.js 保持一致的架构边界规则，
 * 在编码时实时提示依赖违规。
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/target/**',
      '**/src-tauri/**',
      '**/coverage/**',
      '**/ame-to-do-prd/**',
      '**/scripts/**',
      'packages/*/tests/**',
      'packages/features/test-modules/**',
      '**/*.config.*',
      '**/vite-env.d.ts',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './packages/domain',
              from: [
                './packages/ui',
                './packages/services',
                './packages/core',
                './packages/data',
                './packages/features',
                './packages/platform-implementations',
                './packages/platform-contracts',
              ],
              message: '领域模型禁止依赖 UI、框架或任何平台 API',
            },
            {
              target: './packages/services',
              from: [
                './packages/platform-implementations',
                './packages/ui',
                './packages/features',
              ],
              message: '业务服务禁止直接依赖平台实现或 UI',
            },
            {
              target: './packages/data',
              from: [
                './packages/ui',
                './packages/services',
                './packages/features',
                './packages/platform-implementations',
              ],
              message: '数据层禁止依赖 UI 或平台特定能力',
            },
            {
              target: './packages/platform-contracts',
              from: [
                './packages/platform-implementations',
                './packages/domain',
                './packages/services',
                './packages/ui',
                './packages/features',
              ],
              message: '平台契约层禁止依赖任何具体实现',
            },
            {
              target: './packages/platform-implementations',
              from: [
                './packages/ui',
                './packages/features',
                './packages/domain',
                './packages/services',
              ],
              message: '平台实现禁止包含业务 UI 或领域规则',
            },
            {
              target: './packages/ui',
              from: [
                './packages/services',
                './packages/platform-implementations',
                './packages/domain',
                './packages/features',
              ],
              message: '基础 UI 组件禁止依赖业务服务或平台实现',
            },
            {
              target: './packages/features',
              from: ['./packages/platform-implementations'],
              message: '功能模块禁止直接依赖具体平台实现',
            },
          ],
        },
      ],
    },
  },
);
