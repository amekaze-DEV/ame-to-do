import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import { getBaseFontSize } from "./utils/display";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [dpr, setDpr] = useState(window.devicePixelRatio);
  const [rootFontSize, setRootFontSize] = useState(
    parseInt(getComputedStyle(document.documentElement).fontSize, 10),
  );

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      setDpr(window.devicePixelRatio);
      setRootFontSize(parseInt(getComputedStyle(document.documentElement).fontSize, 10));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="min-h-screen bg-surface p-md text-text-primary">
      <div className="max-w-2xl mx-auto">
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
          >
            Greet
          </button>
        </form>

        <p className="text-lg text-primary-700 font-medium">{greetMsg}</p>

        <div className="mt-xl p-md rounded-lg bg-surface-elevated border border-surface-border">
          <h2 className="text-xl font-semibold mb-sm">Tailwind CSS 验证</h2>
          <div className="grid grid-cols-1 gap-sm text-sm sm:grid-cols-2">
            <div>
              <span className="text-text-secondary">视口宽度:</span>{" "}
              <span className="text-primary-600 font-mono">{viewportWidth}px</span>
            </div>
            <div>
              <span className="text-text-secondary">当前断点:</span>{" "}
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
              <span className="text-text-secondary">DPR (devicePixelRatio):</span>{" "}
              <span className="text-primary-600 font-mono">{dpr}</span>
            </div>
            <div>
              <span className="text-text-secondary">root font-size:</span>{" "}
              <span className="text-primary-600 font-mono">{rootFontSize}px</span>
              <span className="text-text-secondary text-xs ml-1">
                (预期: {getBaseFontSize(dpr)}px)
              </span>
            </div>
          </div>
          <div className="mt-sm text-xs text-text-secondary">
            验证说明: 拖动窗口边缘改变宽度，跨越 768/1024/1440 临界点时断点应切换。
            DPR=1 表示标准 DPI 显示器，root font-size 应等于 16×DPR。
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
