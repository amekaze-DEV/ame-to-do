import type {
  ModuleDefinition,
  ModuleContext,
  ModuleInstance,
} from '../../core/src/module/types';

export const createTestModuleA = (): ModuleDefinition => ({
  id: 'test-module-a',
  name: '测试模块 A',
  version: '1.0.0',
  description: '基础测试模块，无依赖',
  dependencies: [],
  permissions: [],
  dataSchemaVersion: 1,
  entry: (context: ModuleContext): ModuleInstance => {
    let initialized = false;
    const logs: string[] = [];

    return {
      async init(): Promise<void> {
        if (initialized) return;
        initialized = true;
        logs.push('module-a:init');
        context.logger.info('测试模块 A 初始化完成');
        context.eventBus.on('module:enabled', (data) => {
          logs.push(`module-a:received-enabled:${data.moduleId}`);
        });
      },
      async dispose(): Promise<void> {
        if (!initialized) return;
        initialized = false;
        logs.push('module-a:dispose');
      },
    };
  },
});

export const createTestModuleB = (): ModuleDefinition => ({
  id: 'test-module-b',
  name: '测试模块 B',
  version: '1.0.0',
  description: '依赖模块 A 的测试模块',
  dependencies: ['test-module-a'],
  permissions: ['notification'],
  dataSchemaVersion: 1,
  entry: (context: ModuleContext): ModuleInstance => {
    let initialized = false;
    return {
      async init(): Promise<void> {
        if (initialized) return;
        initialized = true;
        context.logger.info('测试模块 B 初始化完成（依赖 A）');
      },
      async dispose(): Promise<void> {
        initialized = false;
      },
    };
  },
});

export const createFailingModule = (): ModuleDefinition => ({
  id: 'failing-module',
  name: '失败测试模块',
  version: '0.1.0',
  description: 'init 会抛出错误的模块，用于异常处理测试',
  dependencies: [],
  permissions: [],
  dataSchemaVersion: 1,
  entry: (): ModuleInstance => ({
    async init(): Promise<void> {
      throw new Error('模块初始化故意失败');
    },
    async dispose(): Promise<void> {},
  }),
});

export const testModuleDefinitions = [
  createTestModuleA(),
  createTestModuleB(),
];
