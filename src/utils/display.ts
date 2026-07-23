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
