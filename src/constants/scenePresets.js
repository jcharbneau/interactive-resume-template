// ─── Scene Presets ────────────────────────────────────────────────────────────
// Named presets that bundle 3D scene rendering parameters.
// Each preset controls: bloom, lerp speed, mouse force, and optional features.
//
// Users pick a default preset in ThemeStep (applied to all eras).
// Individual eras can override via era.scene.presetId in EraEditor.
//
// The canvas reads these params from SCENE_PRESETS[presetId] and applies them
// to: EffectComposer Bloom, particle lerp speed, and mouse force field uniforms.

export const SCENE_PRESETS = {
  particles: {
    id: 'particles',
    label: 'Particles',
    emoji: '✦',
    description: 'Classic floating particles — clean and versatile',
    bloom: { threshold: 0.45, intensity: 0.5 },
    lerpSpeed: 2.2,
    mouseForce: { radius: 2.5, strength: 0.45 },
    showConnections: false,
    connectionThreshold: 0,
  },

  nebula: {
    id: 'nebula',
    label: 'Nebula',
    emoji: '🌌',
    description: 'Dense cloud with soft luminous glow',
    bloom: { threshold: 0.2, intensity: 1.4 },
    lerpSpeed: 1.0,
    mouseForce: { radius: 3.5, strength: 0.25 },
    showConnections: false,
    connectionThreshold: 0,
  },

  constellation: {
    id: 'constellation',
    label: 'Constellation',
    emoji: '✧',
    description: 'Sparse stars with connecting lines between nearby nodes',
    bloom: { threshold: 0.55, intensity: 0.3 },
    lerpSpeed: 1.5,
    mouseForce: { radius: 2.0, strength: 0.3 },
    showConnections: true,
    connectionThreshold: 1.4, // world-space distance for drawing a line
  },

  crystalline: {
    id: 'crystalline',
    label: 'Crystalline',
    emoji: '💎',
    description: 'Precise geometric clusters, minimal bloom',
    bloom: { threshold: 0.7, intensity: 0.2 },
    lerpSpeed: 3.5,
    mouseForce: { radius: 1.5, strength: 0.6 },
    showConnections: false,
    connectionThreshold: 0,
  },

  aurora: {
    id: 'aurora',
    label: 'Aurora',
    emoji: '🌠',
    description: 'Wide spread with wave-like motion and soft glow',
    bloom: { threshold: 0.3, intensity: 1.0 },
    lerpSpeed: 0.8,
    mouseForce: { radius: 4.0, strength: 0.2 },
    showConnections: false,
    connectionThreshold: 0,
  },

  void: {
    id: 'void',
    label: 'Void',
    emoji: '◉',
    description: 'Ultra-sparse particles with maximum bloom glow',
    bloom: { threshold: 0.1, intensity: 2.0 },
    lerpSpeed: 0.5,
    mouseForce: { radius: 5.0, strength: 0.15 },
    showConnections: false,
    connectionThreshold: 0,
  },
};

export const SCENE_PRESET_ORDER = [
  'particles',
  'nebula',
  'constellation',
  'crystalline',
  'aurora',
  'void',
];

export const DEFAULT_PRESET_ID = 'particles';
