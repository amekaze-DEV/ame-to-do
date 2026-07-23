# 模块开发指南

> 本文档说明如何为 AME to do 开发一个新的功能模块。所有模块必须遵循本文档的规范，确保模块系统的一致性和可维护性。

## 什么是模块

模块（Module）是 AME to do 中一个独立的功能单元，具有以下特点：

- ✅ 可以独立启用/禁用
- ✅ 可以独立配置
- ✅ 明确声明依赖的平台能力
- ✅ 通过事件总线与其他模块通信
- ❌ 不直接依赖其他模块的内部实现
- ❌ 不直接操作平台 API（必须通过 PlatformAdapter）

## 模块目录结构

一个完整的功能模块位于 `packages/features/` 目录下：

```
packages/features/
└── your-feature/                  # 你的模块名（kebab-case）
    ├── src/
    │   ├── index.ts               # ⭐ 模块入口，导出 ModuleDefinition
    │   ├── module.ts              # 模块定义（ModuleDefinition）
    │   ├── services/              # 模块特有服务（如模块业务逻辑复杂）
    │   │   └── YourFeatureService.ts
    │   ├── store/                 # 模块状态管理（Zustand）
    │   │   └── useYourFeatureStore.ts
    │   ├── hooks/                 # 模块特有 React Hooks
    │   │   └── useYourFeature.ts
    │   ├── types/                 # 模块类型定义
    │   │   └── index.ts
    │   ├── ui/                    # 模块 UI 组件
    │   │   ├── components/
    │   │   ├── pages/             # 页面级组件（注册到路由）
    │   │   └── widgets/           # 小部件（可选）
    │   └── events/                # 模块发布的事件定义
    │       └── index.ts
    ├── package.json
    └── tsconfig.json
```

## 最简模块示例

以下是一个"倒班助手"模块的最小实现：

### 1. 模块类型定义

```typescript
// packages/features/shift-assistant/src/types/index.ts

export interface ShiftTemplate {
  id: string;
  name: string;
  color: string;
  startTime: string;
  endTime: string;
}

export interface ShiftSchedule {
  date: string;
  templateId: string | null;
  note?: string;
}
```

### 2. 模块事件定义

```typescript
// packages/features/shift-assistant/src/events/index.ts
import { createEventDefinition } from '@ame-todo/core';

export const ShiftTemplateCreated = createEventDefinition<{
  templateId: string;
  templateName: string;
}>('shift-assistant:template-created');

export const ShiftScheduleUpdated = createEventDefinition<{
  date: string;
}>('shift-assistant:schedule-updated');
```

### 3. 模块定义

```typescript
// packages/features/shift-assistant/src/module.ts
import type { ModuleDefinition } from '@ame-todo/core';
import { ShiftAssistantPage } from './ui/pages/ShiftAssistantPage';
import { ShiftTemplateCreated, ShiftScheduleUpdated } from './events';

export const shiftAssistantModule: ModuleDefinition = {
  // 模块唯一标识（必须全局唯一）
  id: 'shift-assistant',

  // 模块显示名称
  name: '倒班助手',

  // 模块描述
  description: '管理倒班模板、轮班周期、临时调整班次',

  // 模块版本
  version: '1.0.0',

  // 模块作者
  author: 'AME Team',

  // 模块图标（lucide-react icon name）
  icon: 'Clock',

  // 模块分类
  category: 'productivity',

  // 是否默认启用
  defaultEnabled: true,

  // 依赖声明
  dependencies: {
    // 依赖的平台能力
    platform: {
      // 通知是可选依赖：没有也能用，但提醒功能不可用
      notification: 'optional',
      // 文件系统是必需依赖
      filesystem: 'required',
    },
    // 依赖的其他模块（通过模块 ID）
    modules: {
      // 依赖日历模块的数据
      calendar: 'required',
    },
  },

  // 路由注册
  routes: [
    {
      path: '/shift-assistant',
      element: ShiftAssistantPage,
      // 导航菜单配置
      nav: {
        label: '倒班助手',
        order: 30,
        icon: 'Clock',
      },
    },
  ],

  // 小部件注册（可选）
  widgets: [
    {
      id: 'today-shift',
      name: '今日班次',
      description: '显示今天和明天的班次安排',
      defaultSize: { width: 240, height: 160 },
    },
  ],

  // 模块配置项（会显示在设置页面）
  settings: [
    {
      key: 'defaultCycleLength',
      name: '默认轮班周期',
      type: 'number',
      defaultValue: 7,
      min: 1,
      max: 60,
    },
    {
      key: 'reminderMinutes',
      name: '班次提醒提前时间（分钟）',
      type: 'number',
      defaultValue: 30,
      min: 0,
      max: 1440,
    },
  ],

  // 模块生命周期钩子
  lifecycle: {
    // 模块启用时调用
    onEnable: async (context) => {
      const { eventBus, platformAdapter, settings } = context;

      // 订阅其他模块的事件
      eventBus.subscribe('calendar:date-changed', (payload) => {
        console.log('日期变化:', payload.date);
      });

      // 发布模块自己的事件
      eventBus.publish(ShiftTemplateCreated, {
        templateId: 'demo-1',
        templateName: '白班',
      });
    },

    // 模块禁用时调用
    onDisable: async (context) => {
      const { eventBus } = context;
      // 清理事件订阅等
    },

    // 设置变更时调用
    onSettingsChange: async (settings, context) => {
      console.log('设置更新:', settings);
    },
  },
};
```

### 4. 模块入口

```typescript
// packages/features/shift-assistant/src/index.ts
export { shiftAssistantModule } from './module';
export * from './types';
export * from './events';
```

### 5. package.json

```json
{
  "name": "@ame-todo/feature-shift-assistant",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "@ame-todo/core": "workspace:*",
    "@ame-todo/ui": "workspace:*",
    "zustand": "^4.5.0",
    "lucide-react": "^0.344.0"
  }
}
```

## 模块开发 Checklist

开发新模块时，请确认以下所有项：

- [ ] 模块 ID 全局唯一（在所有模块定义中搜索确认）
- [ ] 模块有明确的 name、description、icon
- [ ] 依赖声明完整：
  - [ ] 必需的平台能力标记为 `required`
  - [ ] 可选的平台能力标记为 `optional`
  - [ ] 依赖的其他模块已声明
- [ ] 没有直接 `import` 其他模块的内部实现（只能通过事件总线通信）
- [ ] 没有直接调用 Tauri API（必须通过 `PlatformAdapter`）
- [ ] 所有事件都有明确的类型定义
- [ ] 模块设置项有合理的默认值和范围限制
- [ ] 模块生命周期钩子正确处理了启用/禁用逻辑
- [ ] UI 组件使用 `packages/ui` 中的通用组件，没有重复造轮子
- [ ] 小部件（如有）遵循 `packages/widget-kit` 的标准协议

## 模块间通信

### 禁止：直接调用其他模块

```typescript
// ❌ 错误：直接引用其他模块的内部
import { SomeService } from '@ame-todo/feature-other';

const result = SomeService.doSomething();
```

### 正确：通过事件总线

```typescript
// ✅ 正确：通过事件总线通信
import { eventBus } from '@ame-todo/core';
import { SomethingHappened } from '@ame-todo/feature-other';

// 发布事件
eventBus.publish(SomethingHappened, { data: 'hello' });

// 订阅事件
eventBus.subscribe(SomethingHappened, (payload) => {
  console.log(payload.data);
});
```

### 正确：通过共享服务

如果两个模块确实需要共享数据，应将数据放到共享服务中：

```typescript
// ✅ 正确：通过共享服务
import { SharedCalendarService } from '@ame-todo/services';

const holidays = SharedCalendarService.getHolidays();
```

## 模块测试

每个模块应该包含以下测试：

| 测试类型 | 内容 |
|---|---|
| 单元测试 | 模块服务、Hooks、工具函数 |
| 集成测试 | 模块与事件总线的交互 |
| UI 测试 | 模块页面和组件的渲染 |

## 模块禁用的行为

当模块被用户禁用后，以下行为会自动生效：

1. 模块路由从导航菜单中移除
2. 模块的事件订阅被清理
3. 模块的小部件从可选列表中移除
4. 模块的设置项从设置页面中隐藏
5. 模块的 `onDisable` 生命周期钩子被调用

**注意**：模块被禁用时，其数据不会被删除。用户重新启用模块后，之前的数据仍然可用。
