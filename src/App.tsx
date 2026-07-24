import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import { getBaseFontSize, useOrientation } from "./utils/display";
import { NavigationLayout, NavItem, LayoutMode } from "./components/NavigationLayout";
import { Database, MIGRATIONS, CURRENT_SCHEMA_VERSION } from "../packages/data/src";
import { logger, EventBus, AppEvents, ConfigStore } from "../packages/core/src";

const navItems: NavItem[] = [
  { id: "home", label: "首页" },
  { id: "calendar", label: "万年历" },
  { id: "items", label: "事项" },
  { id: "settings", label: "设置" },
];

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [activeNav, setActiveNav] = useState("home");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("auto");
  const [rootFontSize, setRootFontSize] = useState(
    parseInt(getComputedStyle(document.documentElement).fontSize, 10),
  );
  const [isTooSmall, setIsTooSmall] = useState(false);
  const [dbStatus, setDbStatus] = useState<"idle" | "connecting" | "ok" | "error">("idle");
  const [dbVersion, setDbVersion] = useState<number | null>(null);
  const [dbMessage, setDbMessage] = useState("");
  const [migrateResult, setMigrateResult] = useState<string>("");

  const [eventLog, setEventLog] = useState<string[]>([]);
  const [eventBus] = useState(() => new EventBus());

  const [configLog, setConfigLog] = useState<string[]>([]);
  const [configStore] = useState(() => {
    const eb = new EventBus();
    return new ConfigStore('./test-config.json', { eventBus: eb });
  });
  const [configTheme, setConfigTheme] = useState<string>(configStore.get('theme') as string);

  useEffect(() => {
    const unsub = configStore.onChange((event) => {
      if (event.key === 'theme') {
        const value = event.value as string;
        setConfigTheme(value);
        document.documentElement.classList.remove('theme-light', 'theme-dark');
        if (value === 'light' || value === 'dark') {
          document.documentElement.classList.add(`theme-${value}`);
        }
      }
    });
    return unsub;
  }, [configStore]);

  const { orientation, width, height } = useOrientation();
  const dpr = window.devicePixelRatio;

  useEffect(() => {
    const handleResize = () => {
      setRootFontSize(parseInt(getComputedStyle(document.documentElement).fontSize, 10));
      setIsTooSmall(window.innerWidth < 360 || window.innerHeight < 480);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  async function testDatabase() {
    setDbStatus("connecting");
    setDbMessage("");
    setDbVersion(null);

    try {
      const db = new Database();
      await db.connect();

      await db.execute("CREATE TABLE IF NOT EXISTS task04_test (id INTEGER PRIMARY KEY, name TEXT)");
      await db.execute("INSERT OR REPLACE INTO task04_test (id, name) VALUES (1, ?)", ["AME to do"]);

      const row = await db.selectOne<{ name: string }>(
        "SELECT name FROM task04_test WHERE id = 1",
      );

      // 只读取当前 user_version，不再修改，避免污染迁移状态
      const currentVersion = await db.getUserVersion();

      await db.close();

      setDbVersion(currentVersion);
      setDbMessage(`连接成功，测试数据: ${row?.name ?? "null"}`);
      setDbStatus("ok");
    } catch (err) {
      setDbStatus("error");
      setDbMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function testMigration() {
    setMigrateResult("测试中...");
    try {
      const db = new Database();
      await db.connect();
      const currentVer = await db.getUserVersion();

      let result: string;
      if (currentVer > CURRENT_SCHEMA_VERSION) {
        result = `警告：数据库实际版本(v${currentVer})高于代码定义版本(v${CURRENT_SCHEMA_VERSION})，可能由历史测试污染。建议删除数据库文件后重新启动。`;
      } else if (currentVer < CURRENT_SCHEMA_VERSION) {
        result = `迁移执行中：数据库从 v${currentVer} 升级到 v${CURRENT_SCHEMA_VERSION}。`;
      } else {
        result = `迁移状态正常：数据库版本 v${currentVer}，与代码定义版本一致。`;
      }

      setMigrateResult(result);
    } catch (err) {
      setMigrateResult(`迁移失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function testEventBus() {
    const logs: string[] = [];
    const unsub1 = eventBus.on(AppEvents.CONFIG_CHANGED, (data) => {
      logs.push(`✓ 收到 CONFIG_CHANGED: key=${data.key}, value=${JSON.stringify(data.value)}`);
    });
    const unsub2 = eventBus.on(AppEvents.ITEM_CREATED, (data) => {
      logs.push(`✓ 收到 ITEM_CREATED: itemId=${data.itemId}`);
    });

    eventBus.emit(AppEvents.CONFIG_CHANGED, { key: 'theme', value: 'dark' });
    eventBus.emit(AppEvents.ITEM_CREATED, { itemId: 'test-123' });

    unsub1();
    unsub2();
    eventBus.emit(AppEvents.CONFIG_CHANGED, { key: 'language', value: 'en' });
    logs.push('✓ 取消订阅后不再接收事件');

    let onceCount = 0;
    eventBus.once(AppEvents.APP_STARTED, () => { onceCount++; });
    eventBus.emit(AppEvents.APP_STARTED);
    eventBus.emit(AppEvents.APP_STARTED);
    logs.push(`✓ once 仅触发一次 (实际: ${onceCount})`);

    let errorIsolated = true;
    eventBus.on(AppEvents.APP_MINIMIZED, () => { throw new Error('故意报错'); });
    eventBus.on(AppEvents.APP_MINIMIZED, () => { errorIsolated = true; });
    eventBus.emit(AppEvents.APP_MINIMIZED);
    logs.push(`✓ 错误隔离生效: ${errorIsolated ? '是' : '否'}`);

    setEventLog(logs);
  }

  function testConfigStore() {
    const logs: string[] = [];
    const unsub = configStore.onChange((event) => {
      logs.push(`✓ 配置变更事件: ${event.key} = ${JSON.stringify(event.value)}`);
    });

    const theme = configStore.get('theme');
    logs.push(`✓ 默认 theme: ${theme}`);

    configStore.set('theme', 'dark');
    const newTheme = configStore.get('theme');
    logs.push(`✓ 设置后 theme: ${newTheme}`);
    setConfigTheme(newTheme as string);

    configStore.set('webdav.enabled', true);
    const webdav = configStore.get('webdav.enabled');
    logs.push(`✓ 嵌套配置 webdav.enabled: ${webdav}`);

    configStore.set('log.level', 'debug');
    const logLevel = configStore.get('log.level');
    logs.push(`✓ 日志级别: ${logLevel}`);

    configStore.patch({ theme: 'light', language: 'en' });
    logs.push(`✓ patch 批量更新后 theme: ${configStore.get('theme')}, language: ${configStore.get('language')}`);

    configStore.reset();
    logs.push(`✓ reset 后 theme: ${configStore.get('theme')}`);

    unsub();
    setConfigLog(logs);
  }

  const aspectRatio = (width / height).toFixed(2);
  const safeTop = getComputedStyle(document.documentElement).getPropertyValue(
    "--safe-area-inset-top",
  );
  const safeBottom = getComputedStyle(document.documentElement).getPropertyValue(
    "--safe-area-inset-bottom",
  );
  const touchTarget = getComputedStyle(document.documentElement).getPropertyValue(
    "--touch-target-min",
  );

  return (
    <NavigationLayout
      navItems={navItems}
      activeNavId={activeNav}
      onNavChange={setActiveNav}
      mode={layoutMode}
    >
      <div className="p-md min-w-app min-h-app">
        {isTooSmall && (
          <div className="mb-md p-sm rounded-md bg-primary-100 text-primary-700 text-sm border border-primary-200">
            ⚠️ 窗口尺寸过小（{width}×{height}），建议不小于 360×480 以获得最佳体验
          </div>
        )}

        <h1 className="text-3xl font-bold text-primary-600 mb-md">
          Welcome to AME to do
        </h1>

        <div className="flex flex-wrap gap-md mb-md">
          <a
            href="https://vite.dev"
            target="_blank"
            className="p-sm rounded-md bg-surface-elevated border border-surface-border hover:border-primary-400 transition-colors"
          >
            <img src="/vite.svg" className="w-12 h-12" alt="Vite logo" />
          </a>
          <a
            href="https://tauri.app"
            target="_blank"
            className="p-sm rounded-md bg-surface-elevated border border-surface-border hover:border-primary-400 transition-colors"
          >
            <img src="/tauri.svg" className="w-12 h-12" alt="Tauri logo" />
          </a>
          <a
            href="https://react.dev"
            target="_blank"
            className="p-sm rounded-md bg-surface-elevated border border-surface-border hover:border-primary-400 transition-colors"
          >
            <img src={reactLogo} className="w-12 h-12" alt="React logo" />
          </a>
        </div>

        <p className="text-text-secondary mb-lg">
          Click on the Tauri, Vite, and React logos to learn more.
        </p>

        <form
          className="flex gap-sm mb-md"
          onSubmit={(e) => {
            e.preventDefault();
            greet();
          }}
        >
          <input
            id="greet-input"
            className="flex-1 px-sm py-sm rounded-md border border-surface-border bg-surface-elevated focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Enter a name..."
          />
          <button
            type="submit"
            className="px-md py-sm rounded-md bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 transition-colors font-medium"
            style={{ minHeight: "var(--touch-target-min)" }}
          >
            Greet
          </button>
        </form>

        <p className="text-lg text-primary-700 font-medium mb-xl">{greetMsg}</p>

        <div className="p-md rounded-lg bg-surface-elevated border border-surface-border">
          <h2 className="text-xl font-semibold mb-sm">
            Task-02 + Task-02.5 验证面板
          </h2>

          <div className="grid grid-cols-1 gap-sm text-sm compact:grid-cols-1 medium:grid-cols-2">
            <div className="medium:col-span-2 mb-xs">
              <span className="text-text-secondary mr-sm">布局模式:</span>
              {(["auto", "portrait", "landscape"] as LayoutMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setLayoutMode(m)}
                  className={`px-sm py-xs mr-xs rounded-md text-xs font-medium transition-colors ${
                    layoutMode === m
                      ? "bg-primary-500 text-white"
                      : "bg-surface border border-surface-border hover:bg-surface-elevated text-text-secondary"
                  }`}
                >
                  {m === "auto" ? "自动" : m === "portrait" ? "强制竖屏" : "强制横屏"}
                </button>
              ))}
            </div>
            <div>
              <span className="text-text-secondary">当前导航:</span>{" "}
              <span className="text-primary-600 font-semibold">{activeNav}</span>
            </div>
            <div>
              <span className="text-text-secondary">视口尺寸:</span>{" "}
              <span className="text-primary-600 font-mono">
                {width} × {height}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">宽高比:</span>{" "}
              <span className="text-primary-600 font-mono">{aspectRatio}</span>
            </div>
            <div>
              <span className="text-text-secondary">方向(宽高比):</span>{" "}
              <span className="text-primary-600 font-semibold">
                {orientation === "portrait" ? "竖屏 portrait" : "横屏 landscape"}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">方向(Tailwind):</span>{" "}
              <span className="portrait:inline landscape:hidden text-primary-600 font-semibold">
                portrait
              </span>
              <span className="landscape:inline portrait:hidden text-primary-600 font-semibold">
                landscape
              </span>
            </div>
            <div>
              <span className="text-text-secondary">响应断点:</span>{" "}
              <span className="hidden compact:inline medium:hidden text-primary-600 font-semibold">
                compact
              </span>
              <span className="hidden medium:inline expanded:hidden text-primary-600 font-semibold">
                medium
              </span>
              <span className="hidden expanded:inline wide:hidden text-primary-600 font-semibold">
                expanded
              </span>
              <span className="hidden wide:inline text-primary-600 font-semibold">wide</span>
            </div>
            <div>
              <span className="text-text-secondary">DPR:</span>{" "}
              <span className="text-primary-600 font-mono">{dpr}</span>
            </div>
            <div>
              <span className="text-text-secondary">root font-size:</span>{" "}
              <span className="text-primary-600 font-mono">{rootFontSize}px</span>
              <span className="text-text-secondary text-xs ml-1">
                (预期: {getBaseFontSize(dpr)}px)
              </span>
            </div>
            <div>
              <span className="text-text-secondary">安全区域(上/下):</span>{" "}
              <span className="text-primary-600 font-mono text-xs">
                {safeTop.trim() || "0"} / {safeBottom.trim() || "0"}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">最小触控目标:</span>{" "}
              <span className="text-primary-600 font-mono">{touchTarget.trim() || "44px"}</span>
            </div>
          </div>

          <div className="mt-md p-md rounded-lg bg-surface-elevated border border-surface-border">
            <h2 className="text-xl font-semibold mb-sm">Task-04 验证面板</h2>
            <div className="flex flex-wrap items-center gap-sm mb-sm">
              <button
                onClick={testDatabase}
                disabled={dbStatus === "connecting"}
                className="px-md py-sm rounded-md bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 disabled:bg-primary-300 transition-colors font-medium"
                style={{ minHeight: "var(--touch-target-min)" }}
              >
                {dbStatus === "connecting" ? "测试中..." : "测试 SQLite 连接"}
              </button>
              {dbStatus !== "idle" && dbStatus !== "connecting" && (
                <span
                  className={`text-sm font-medium ${
                    dbStatus === "ok" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {dbStatus === "ok" ? "✓ 数据库连接正常" : "✗ 数据库连接失败"}
                </span>
              )}
            </div>
            {dbMessage && (
              <p className="text-sm text-text-secondary mb-xs">
                {dbMessage}
                {dbVersion !== null && (
                  <span className="ml-sm text-primary-600 font-mono">
                    user_version: {dbVersion}
                  </span>
                )}
              </p>
            )}
            <p className="text-xs text-text-secondary">
              点击按钮验证 SQLite 连接、建表、读写、user_version 管理。此功能需要在 Tauri 桌面环境中运行。
            </p>
          </div>

          <div className="mt-md p-md rounded-lg bg-surface-elevated border border-surface-border">
            <h2 className="text-xl font-semibold mb-sm">Task-06 验证面板</h2>
            <div className="flex flex-wrap items-center gap-sm mb-sm">
              <button
                onClick={() => {
                  logger.info('真实环境日志测试');
                  logger.warn('测试警告日志', { source: 'test' });
                  logger.error('测试错误日志', new Error('测试错误对象'));
                }}
                className="px-md py-sm rounded-md bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 transition-colors font-medium"
                style={{ minHeight: "var(--touch-target-min)" }}
              >
                测试日志输出
              </button>
            </div>
            <p className="text-xs text-text-secondary">
              点击按钮触发 info/warn/error 三条日志，然后在 Console 和本地日志文件中检查是否生成。
            </p>
          </div>

          <div className="mt-md p-md rounded-lg bg-surface-elevated border border-surface-border">
            <h2 className="text-xl font-semibold mb-sm">Task-05 验证面板 (EventBus)</h2>
            <div className="flex flex-wrap items-center gap-sm mb-sm">
              <button
                onClick={testEventBus}
                className="px-md py-sm rounded-md bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 transition-colors font-medium"
                style={{ minHeight: "var(--touch-target-min)" }}
              >
                测试事件总线
              </button>
            </div>
            {eventLog.length > 0 && (
              <div className="mt-sm p-sm rounded-md bg-surface text-xs font-mono space-y-xs max-h-48 overflow-y-auto">
                {eventLog.map((log, i) => (
                  <div key={i} className="text-green-700">{log}</div>
                ))}
              </div>
            )}
            <p className="text-xs text-text-secondary mt-sm">
              验证：订阅/发布、取消订阅、once 单次触发、错误隔离。
            </p>
          </div>

          <div className="mt-md p-md rounded-lg bg-surface-elevated border border-surface-border">
            <h2 className="text-xl font-semibold mb-sm">Task-07 验证面板 (ConfigStore)</h2>
            <div className="flex flex-wrap items-center gap-sm mb-sm">
              <button
                onClick={testConfigStore}
                className="px-md py-sm rounded-md bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 transition-colors font-medium"
                style={{ minHeight: "var(--touch-target-min)" }}
              >
                测试配置管理
              </button>
              <span className="text-sm text-text-secondary">
                当前 theme: <span className="font-mono text-primary-600">{configTheme}</span>
              </span>
            </div>
            {configLog.length > 0 && (
              <div className="mt-sm p-sm rounded-md bg-surface text-xs font-mono space-y-xs max-h-48 overflow-y-auto">
                {configLog.map((log, i) => (
                  <div key={i} className="text-green-700">{log}</div>
                ))}
              </div>
            )}
            <p className="text-xs text-text-secondary mt-sm">
              验证：路径访问、嵌套配置、patch 批量更新、reset 重置、变更事件通知。
              设置 theme=dark/light 时，页面会同步切换主题 class。
            </p>
          </div>

          <div className="mt-md p-md rounded-lg bg-surface-elevated border border-surface-border">
            <h2 className="text-xl font-semibold mb-sm">Task-09 验证面板 (数据库迁移)</h2>
            <div className="flex flex-wrap items-center gap-sm mb-sm">
              <button
                onClick={testMigration}
                className="px-md py-sm rounded-md bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 transition-colors font-medium"
                style={{ minHeight: "var(--touch-target-min)" }}
              >
                测试数据库迁移
              </button>
            </div>
            <div className="mb-sm text-xs text-text-secondary">
              <p>已注册迁移脚本: <span className="font-mono text-primary-600">{MIGRATIONS.length} 个</span></p>
              <p>代码定义最新版本: <span className="font-mono text-primary-600">v{CURRENT_SCHEMA_VERSION}</span></p>
              <ul className="mt-xs ml-md list-disc">
                {MIGRATIONS.map((m) => (
                  <li key={m.version}>v{m.version}: {m.description}</li>
                ))}
              </ul>
            </div>
            {migrateResult && (
              <p className={`text-sm font-medium ${migrateResult.includes('正常') ? 'text-green-600' : migrateResult.includes('警告') ? 'text-amber-600' : 'text-red-600'}`}>
                {migrateResult}
              </p>
            )}
            <p className="text-xs text-text-secondary mt-sm">
              验证：连接数据库时自动执行迁移，版本号正确更新。需要 Tauri 桌面环境。
            </p>
          </div>

          <div className="mt-md p-md rounded-lg bg-surface-elevated border border-surface-border">
            <h2 className="text-xl font-semibold mb-sm">Task-08 验证面板 (PlatformAdapter)</h2>
            <div className="text-xs text-text-secondary">
              <p className="mb-xs">已定义 9 个子适配器接口：</p>
              <div className="grid grid-cols-1 compact:grid-cols-1 medium:grid-cols-3 gap-xs">
                <div className="p-xs rounded bg-surface"><span className="text-green-600">✓</span> FileSystemAdapter</div>
                <div className="p-xs rounded bg-surface"><span className="text-green-600">✓</span> NotificationAdapter</div>
                <div className="p-xs rounded bg-surface"><span className="text-green-600">✓</span> SecureStorageAdapter</div>
                <div className="p-xs rounded bg-surface"><span className="text-green-600">✓</span> NetworkAdapter</div>
                <div className="p-xs rounded bg-surface"><span className="text-green-600">✓</span> TaskSchedulerAdapter</div>
                <div className="p-xs rounded bg-surface"><span className="text-green-600">✓</span> AutoLaunchAdapter</div>
                <div className="p-xs rounded bg-surface"><span className="text-green-600">✓</span> WidgetAdapter</div>
                <div className="p-xs rounded bg-surface"><span className="text-green-600">✓</span> TrayAdapter</div>
                <div className="p-xs rounded bg-surface"><span className="text-green-600">✓</span> DisplayAdapter</div>
              </div>
            </div>
            <p className="text-xs text-text-secondary mt-sm">
              接口已在 packages/platform-contracts/src/ 中完整定义。具体实现将在 Phase 3 各平台适配中完成。
            </p>
          </div>

          <div className="mt-sm pt-sm border-t border-surface-border text-xs text-text-secondary">
            <p className="mb-xs">
              <strong className="text-text-primary">Task-02 验证项:</strong> Tailwind
              工作(标题为蓝色)、断点切换(拖窗口到768/1024/1440)、DPI适配(root
              font-size等于16乘DPR)。
            </p>
            <p className="mb-xs">
              <strong className="text-text-primary">Task-02.5 验证项:</strong>{" "}
              横竖屏判断(高大于宽显示portrait)、导航位置(竖屏在底部/横屏在左侧)、安全区域变量、触控目标、最小窗口(缩到360*480以下会提示)。
            </p>
            <p className="mb-xs">
              <strong className="text-text-primary">Task-04 验证项:</strong>{" "}
              点击"测试 SQLite 连接"，验证数据库可连接、可执行 SQL、user_version 可读写。
            </p>
            <p className="mb-xs">
              <strong className="text-text-primary">Task-06 验证项:</strong>{" "}
              点击"测试日志输出"，验证 Console 输出和日志文件生成。
            </p>
            <p>
              <strong className="text-text-primary">Greet 功能:</strong>{" "}
              输入名字点Greet，验证Tauri前后端通信链路。
            </p>
          </div>
        </div>
      </div>
    </NavigationLayout>
  );
}

export default App;
