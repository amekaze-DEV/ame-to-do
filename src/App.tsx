import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import { getBaseFontSize, useOrientation } from "./utils/display";
import { NavigationLayout, NavItem, LayoutMode } from "./components/NavigationLayout";
import { Database } from "../packages/data/src";

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

      // 验证 user_version 可读写，但不污染迁移版本状态
      const originalVersion = await db.getUserVersion();
      const testVersion = originalVersion === 0 ? 1 : originalVersion;
      await db.setUserVersion(testVersion);
      const confirmedVersion = await db.getUserVersion();

      await db.close();

      setDbVersion(confirmedVersion);
      setDbMessage(`连接成功，测试数据: ${row?.name ?? "null"}`);
      setDbStatus("ok");
    } catch (err) {
      setDbStatus("error");
      setDbMessage(err instanceof Error ? err.message : String(err));
    }
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
