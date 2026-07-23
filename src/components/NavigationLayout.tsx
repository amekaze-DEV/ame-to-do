import { ReactNode, useMemo } from "react";
import { useOrientation, Orientation } from "../utils/display";

export type LayoutMode = "auto" | "portrait" | "landscape";

export interface NavItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

export interface NavigationLayoutProps {
  children: ReactNode;
  navItems?: NavItem[];
  activeNavId?: string;
  onNavChange?: (id: string) => void;
  mode?: LayoutMode;
}

function resolveOrientation(mode: LayoutMode, autoOrientation: Orientation): Orientation {
  if (mode === "portrait") return "portrait";
  if (mode === "landscape") return "landscape";
  return autoOrientation;
}

export function NavigationLayout({
  children,
  navItems = [],
  activeNavId,
  onNavChange,
  mode = "auto",
}: NavigationLayoutProps) {
  const { orientation: autoOrientation } = useOrientation();
  const orientation = useMemo(
    () => resolveOrientation(mode, autoOrientation),
    [mode, autoOrientation],
  );
  const isPortrait = orientation === "portrait";

  return (
    <div
      className={`flex w-full h-screen overflow-hidden bg-surface text-text-primary ${
        isPortrait ? "flex-col" : "flex-row"
      }`}
      style={{
        paddingTop: "var(--safe-area-inset-top)",
        paddingRight: "var(--safe-area-inset-right)",
        paddingBottom: "var(--safe-area-inset-bottom)",
        paddingLeft: "var(--safe-area-inset-left)",
      }}
    >
      {!isPortrait && navItems.length > 0 && (
        <nav
          className="w-56 shrink-0 bg-surface-elevated border-r border-surface-border flex flex-col overflow-hidden"
          aria-label="主导航"
        >
          <div className="p-md border-b border-surface-border shrink-0">
            <span className="text-xl font-bold text-primary-600">AME to do</span>
          </div>
          <ul className="flex-1 py-sm overflow-y-auto min-h-0">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onNavChange?.(item.id)}
                  className={`w-full text-left px-md py-sm flex items-center gap-sm transition-colors ${
                    activeNavId === item.id
                      ? "bg-primary-100 text-primary-700 font-medium"
                      : "hover:bg-surface-border/30 text-text-primary"
                  }`}
                  style={{ minHeight: "var(--touch-target-min)" }}
                >
                  {item.icon && <span className="w-5 h-5">{item.icon}</span>}
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <main className="flex-1 overflow-auto min-w-0 min-h-0">{children}</main>

      {isPortrait && navItems.length > 0 && (
        <nav
          className="shrink-0 bg-surface-elevated border-t border-surface-border overflow-hidden"
          aria-label="底部导航"
        >
          <ul className="flex justify-around">
            {navItems.map((item) => (
              <li key={item.id} className="flex-1">
                <button
                  onClick={() => onNavChange?.(item.id)}
                  className={`w-full flex flex-col items-center justify-center gap-xs transition-colors ${
                    activeNavId === item.id
                      ? "text-primary-600 font-medium"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                  style={{ minHeight: "var(--touch-target-min)" }}
                >
                  {item.icon && <span className="w-5 h-5">{item.icon}</span>}
                  <span className="text-xs">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
