import { useEffect, useState } from "react";

export function getBaseFontSize(scaleFactor: number): number {
  return Math.round(16 * scaleFactor);
}

export function applyBaseFontSize(scaleFactor: number): void {
  const fontSize = getBaseFontSize(scaleFactor);
  document.documentElement.style.fontSize = `${fontSize}px`;
}

export function getDevicePixelRatio(): number {
  return window.devicePixelRatio || 1;
}

export type Orientation = "portrait" | "landscape";

export function getOrientation(width: number, height: number): Orientation {
  return width >= height ? "landscape" : "portrait";
}

export interface OrientationState {
  orientation: Orientation;
  width: number;
  height: number;
}

export function useOrientation(): OrientationState {
  const [state, setState] = useState<OrientationState>(() => ({
    orientation: getOrientation(window.innerWidth, window.innerHeight),
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setState({
        orientation: getOrientation(width, height),
        width,
        height,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return state;
}
