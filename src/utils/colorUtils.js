// ─── Color Utilities ──────────────────────────────────────────────────────────
// Hex ↔ HSL conversion + theme-driven hue shift for era scene colors.
// Used by InteractiveResume to apply resumeThemes[x].hueShift / saturationScale
// to each era's primaryHex / secondaryHex before passing to the canvas.

/**
 * Convert a hex color string (#rrggbb or #rgb) to HSL components.
 * Returns [h, s, l] where h is 0–360, s and l are 0–100.
 */
export function hexToHsl(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];

  const r = Number.parseInt(h.slice(0, 2), 16) / 255;
  const g = Number.parseInt(h.slice(2, 4), 16) / 255;
  const b = Number.parseInt(h.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l * 100];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let hue;
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) hue = ((b - r) / d + 2) / 6;
  else hue = ((r - g) / d + 4) / 6;

  return [hue * 360, s * 100, l * 100];
}

/**
 * Convert HSL components to a hex color string.
 * h is 0–360, s and l are 0–100.
 */
export function hslToHex(h, s, l) {
  const hNorm = (((h % 360) + 360) % 360) / 360;
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;

  if (sNorm === 0) {
    const val = Math.round(lNorm * 255);
    const ch = val.toString(16).padStart(2, '0');
    return `#${ch}${ch}${ch}`;
  }

  const hue2rgb = (p, q, t) => {
    let tNorm = t;
    if (tNorm < 0) tNorm += 1;
    if (tNorm > 1) tNorm -= 1;
    if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
    if (tNorm < 1 / 2) return q;
    if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
    return p;
  };

  const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
  const p = 2 * lNorm - q;

  const r = Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, hNorm) * 255);
  const b = Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Rotate the hue of a hex color by `hueDegrees` and scale its saturation.
 * Returns the modified hex string.
 * A shift of 0 and scale of 1 returns the original color unchanged.
 */
export function applyHueShift(hex, hueDegrees = 0, saturationScale = 1) {
  if (!hex) return hex;
  if (hueDegrees === 0 && saturationScale === 1) return hex;
  const [h, s, l] = hexToHsl(hex);
  const newH = (h + hueDegrees + 360) % 360;
  const newS = Math.max(0, Math.min(100, s * saturationScale));
  return hslToHex(newH, newS, l);
}

/**
 * Apply the active theme's hueShift + saturationScale to an era's scene colors.
 * Returns a new scene object with tinted primaryHex and secondaryHex.
 * If the theme has no shift (midnight defaults to 0 / 1), returns the scene unchanged.
 *
 * @param {object} scene  - era.scene config object
 * @param {object} theme  - hydrated resumeThemes entry (has .hueShift, .saturationScale)
 * @returns {object} scene with possibly-tinted primaryHex / secondaryHex
 */
export function tintEraScene(scene, theme) {
  const hueShift = theme?.hueShift ?? 0;
  const saturationScale = theme?.saturationScale ?? 1;
  if (hueShift === 0 && saturationScale === 1) return scene;
  return {
    ...scene,
    primaryHex: applyHueShift(scene.primaryHex, hueShift, saturationScale),
    secondaryHex: applyHueShift(scene.secondaryHex, hueShift, saturationScale),
  };
}
