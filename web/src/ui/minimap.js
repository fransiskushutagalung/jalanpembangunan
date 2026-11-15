/**
 * NASA / JPL Mars Jezero Tactical Minimap & Maximized Surface Reconnaissance Station
 * 
 * Provides:
 * 1. Compact HUD Minimap (bottom-left docked widget, real-time tracking, heading cone, history trails, POIs)
 * 2. Maximized Tactical Reconnaissance Station (full-screen high-res mapping, pan & zoom, layer switcher:
 *    Ortho CTX, Topographic DEM Hypsometric tint, Slope Hazard heatmap, hover coordinates/elevation inspector,
 *    region fast-travel, rover swarm telemetry).
 */

import { ICONS } from './icons.js';

export class Minimap {
  /**
   * @param {Object} options
   * @param {Object} options.meta - Metadata from metadata.json
   * @param {Float32Array} options.heights - DEM elevation array
   * @param {import('../terrain/heightfield.js').Heightfield} options.hf
   * @param {import('../geo/coords.js').GeoFrame} options.frame
   * @param {THREE.Texture} options.texture - Three.js texture with .image
   * @param {import('../rover/roverSwarm.js').RoverSwarm} options.swarm
   * @param {import('../rover/historyTracker.js').HistoryTracker} options.historyTracker
   * @param {import('../terrain/regionMarkers.js').RegionMarkers} [options.regionMarkers]
   * @param {import('../mission/missionSystem.js').MissionSystem} [options.missionSystem]
   * @param {import('../camera/cameraRig.js').CameraRig} [options.rig]
   * @param {import('./hud.js').Hud} [options.hud]
   * @param {Function} [options.onNavigate]
   */
  constructor(options) {
    this.meta = options.meta;
    this.heights = options.heights;
    this.hf = options.hf;
    this.frame = options.frame;
    this.texture = options.texture;
    this.swarm = options.swarm;
    this.historyTracker = options.historyTracker;
    this.regionMarkers = options.regionMarkers;
    this.missionSystem = options.missionSystem;
    this.rig = options.rig;
    this.hud = options.hud;
    this.onNavigate = options.onNavigate || (() => {});

    // State
    this.layer = 'ortho'; // 'ortho' | 'dem' | 'slope' | 'hybrid'
    this.marsTint = true;
    this.showTrails = true;
    this.showRegions = true;
    this.showWaypoints = true;
    this.showGrid = true;
    this.isMaximized = false;
    this.isCollapsed = false;

    // Minimap view parameters (meters)
    this.miniRadius = 3500; // Radius visible in meters
    const ext = this.meta.extent;
    const activeRov = this.swarm?.getActiveRover ? this.swarm.getActiveRover() : null;
    this.miniCenter = activeRov?.physics ? { X: activeRov.physics.X, Y: activeRov.physics.Y } : { X: (ext.left + ext.right) / 2, Y: (ext.bottom + ext.top) / 2 };

    // Maximized view parameters
    this.maxView = {
      centerX: (ext.left + ext.right) / 2,
      centerY: (ext.bottom + ext.top) / 2,
      widthMeters: ext.width,
      heightMeters: ext.height,
      targetCenterX: (ext.left + ext.right) / 2,
      targetCenterY: (ext.bottom + ext.top) / 2,
      targetWidthMeters: ext.width,
      targetHeightMeters: ext.height,
      minWidth: 400, // Max zoom in (400m window)
      maxWidth: ext.width * 1.2, // Max zoom out
    };

    // Interaction states
    this.isDraggingMini = false;
    this.dragStartMini = { x: 0, y: 0 };
    this.isDraggingMax = false;
    this.dragStartMax = { x: 0, y: 0 };
    this.hoverPos = null;
    this.selectedTarget = null;
    this.radarAngle = 0;

    // Cached offscreen canvases
    this.demCanvas = null;
    this.slopeCanvas = null;
    this.orthoImage = options.texture?.image || null;

    this.#initOffscreenCanvases();
    this.#injectDOM();
    this.#attachListeners();
  }

  /* ------------------------------------------------------------------ */
  /*  1. Offscreen High-Performance Canvas Generation                   */
  /* ------------------------------------------------------------------ */
  #initOffscreenCanvases() {
    try {
      const cols = this.meta?.grid?.cols || 2221;
      const rows = this.meta?.grid?.rows || 2530;
      const stride = 4; // Stride 4 gives 555 x 632 resolution (fast ~1-2ms, crisp & memory safe)
      const w = Math.floor(cols / stride);
      const h = Math.floor(rows / stride);

      // 1. DEM Topography Hypsometric Hillshaded Canvas
      this.demCanvas = document.createElement('canvas');
      this.demCanvas.width = w;
      this.demCanvas.height = h;
      const demCtx = this.demCanvas.getContext('2d');
      const demImg = demCtx.createImageData(w, h);
      const demData = demImg.data;

      const minE = this.meta?.elevation?.min ?? -3500;
      const maxE = this.meta?.elevation?.max ?? -476;
      const rangeE = (maxE - minE) || 3000;
      const heights = this.heights;

      // Hypsometric elevation stops (authentic planetary geology ramp)
      const stops = [
        { t: 0.00, c: [10, 25, 47] },     // Deep crater depression: deep abyssal blue
        { t: 0.16, c: [26, 82, 118] },    // Jezero lakebed sedimentary floor: marine cyan
        { t: 0.30, c: [46, 134, 193] },   // River delta fan silt: bright delta blue
        { t: 0.44, c: [39, 174, 96] },    // Low crater margin / terraces: emerald green
        { t: 0.58, c: [241, 196, 15] },   // Crater rim & mid plains: ochre gold
        { t: 0.72, c: [230, 126, 34] },   // Hesperian plateau & highlands: martian rust
        { t: 0.86, c: [192, 57, 43] },    // Shield volcanoes & elevated bedrock: deep crimson
        { t: 1.00, c: [245, 238, 230] }   // Peaks & mountain summits: pale chalk white
      ];

      function sampleColor(val) {
        val = Math.max(0, Math.min(1, val));
        for (let i = 0; i < stops.length - 1; i++) {
          const s0 = stops[i], s1 = stops[i + 1];
          if (val >= s0.t && val <= s1.t) {
            const f = (val - s0.t) / (s1.t - s0.t);
            return [
              s0.c[0] + (s1.c[0] - s0.c[0]) * f,
              s0.c[1] + (s1.c[1] - s0.c[1]) * f,
              s0.c[2] + (s1.c[2] - s0.c[2]) * f,
            ];
          }
        }
        return stops[stops.length - 1].c;
      }

      // 2. Slope Hazard Canvas
      this.slopeCanvas = document.createElement('canvas');
      this.slopeCanvas.width = w;
      this.slopeCanvas.height = h;
      const slopeCtx = this.slopeCanvas.getContext('2d');
      const slopeImg = slopeCtx.createImageData(w, h);
      const slopeData = slopeImg.data;

      const cell = (this.meta?.grid?.cell_size_m || 40) * stride;

      if (heights && heights.length >= cols * rows) {
        for (let y = 0; y < h; y++) {
          const row = y * stride;
          for (let x = 0; x < w; x++) {
            const col = x * stride;
            const idxGrid = row * cols + col;
            const e = heights[idxGrid];
            const t = Math.max(0, Math.min(1, (e - minE) / rangeE));

            // Shaded relief calculation
            const eRight = heights[row * cols + Math.min(col + stride, cols - 1)];
            const eLeft = heights[row * cols + Math.max(col - stride, 0)];
            const eDown = heights[Math.min(row + stride, rows - 1) * cols + col];
            const eUp = heights[Math.max(row - stride, 0) * cols + col];

            const dh_dx = (eRight - eLeft) / (2 * cell);
            const dh_dy = (eDown - eUp) / (2 * cell);

            // NW illumination (315 deg)
            const shade = Math.max(0.65, Math.min(1.4, 1.0 + (-dh_dx * 0.7 - dh_dy * 0.7) * 2.5));

            const baseC = sampleColor(t);
            const idxPixel = (y * w + x) * 4;

            demData[idxPixel] = Math.max(0, Math.min(255, Math.round(baseC[0] * shade)));
            demData[idxPixel + 1] = Math.max(0, Math.min(255, Math.round(baseC[1] * shade)));
            demData[idxPixel + 2] = Math.max(0, Math.min(255, Math.round(baseC[2] * shade)));
            demData[idxPixel + 3] = 255;

            // Slope Hazard
            const slopeRad = Math.atan(Math.hypot(dh_dx, dh_dy));
            const slopeDeg = (slopeRad * 180) / Math.PI;

            let sc;
            if (slopeDeg < 6) {
              sc = [39, 174, 96]; // Safe plain (green)
            } else if (slopeDeg < 12) {
              sc = [130, 201, 30]; // Mild slope (lime)
            } else if (slopeDeg < 18) {
              sc = [241, 196, 15]; // Caution (yellow)
            } else if (slopeDeg < 25) {
              sc = [230, 126, 34]; // Steep warning (orange)
            } else {
              sc = [231, 76, 60]; // Severe cliff hazard (red)
            }

            slopeData[idxPixel] = sc[0];
            slopeData[idxPixel + 1] = sc[1];
            slopeData[idxPixel + 2] = sc[2];
            slopeData[idxPixel + 3] = 255;
          }
        }

        demCtx.putImageData(demImg, 0, 0);
        slopeCtx.putImageData(slopeImg, 0, 0);
      }
    } catch (err) {
      console.warn('[Minimap] Offscreen canvas build error (safe fallback):', err);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  2. DOM & Aerospace CSS Injection                                  */
  /* ------------------------------------------------------------------ */
  #injectDOM() {
    if (document.getElementById('minimapWidget') && document.getElementById('maximizedMapModal')) {
      return; // Already present in index.html!
    }
    const style = document.createElement('style');
    style.id = 'minimapStyles';
    style.textContent = `
      /* =========================================================================
         NASA JPL TACTICAL MINIMAP & MAXIMIZED SURFACE RECONNAISSANCE STATION
         ========================================================================= */
      
      /* 1. COMPACT HUD MINIMAP (Kanan Atas, Sebelah Robot Detail Panel) */
      .minimap-widget {
        position: fixed;
        top: 12px;
        right: 404px;
        width: 320px;
        background: rgba(11, 15, 23, 0.95);
        border: 1px solid #1f2a3c;
        border-radius: 4px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.85), 0 0 1px rgba(0, 229, 255, 0.3);
        backdrop-filter: blur(12px);
        z-index: 25;
        user-select: none;
        font-family: var(--font-mono, monospace);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @media (max-width: 1280px) {
        .minimap-widget {
          right: 396px;
          width: 270px;
        }
      }
      @media (max-width: 960px) {
        .minimap-widget {
          top: auto;
          bottom: 12px;
          right: 12px;
          width: 260px;
        }
      }
      .minimap-widget::before {
        content: "";
        position: absolute;
        top: 0; left: 0; width: 6px; height: 6px;
        border-top: 2px solid var(--data-cyan, #00e5ff);
        border-left: 2px solid var(--data-cyan, #00e5ff);
        pointer-events: none;
        z-index: 2;
      }
      .minimap-widget::after {
        content: "";
        position: absolute;
        bottom: 0; right: 0; width: 6px; height: 6px;
        border-bottom: 2px solid var(--data-cyan, #00e5ff);
        border-right: 2px solid var(--data-cyan, #00e5ff);
        pointer-events: none;
        z-index: 2;
      }
      .minimap-widget.collapsed {
        height: 34px !important;
        width: 220px;
      }
      .minimap-widget.collapsed .minimap-body,
      .minimap-widget.collapsed .minimap-footer {
        display: none !important;
      }

      .minimap-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 5px 8px;
        background: #0d141e;
        border-bottom: 1px solid #1c2636;
        height: 32px;
      }
      .minimap-title-group {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .minimap-badge {
        font-size: 10px;
        font-weight: 800;
        color: var(--data-cyan, #00e5ff);
        letter-spacing: 0.5px;
      }
      .minimap-rover-tag {
        font-size: 9.5px;
        background: #141f2e;
        border: 1px solid #23354c;
        color: #e2e8f0;
        padding: 1px 5px;
        border-radius: 2px;
        font-weight: 700;
      }
      .minimap-controls {
        display: flex;
        align-items: center;
        gap: 3px;
      }
      .mini-icon-btn {
        background: #131b26;
        border: 1px solid #243346;
        color: #94a3b8;
        border-radius: 2px;
        width: 22px;
        height: 20px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 10px;
        font-family: inherit;
        transition: all 0.15s ease;
      }
      .mini-icon-btn:hover {
        background: #1d2a3c;
        color: #fff;
        border-color: var(--data-cyan, #00e5ff);
      }
      .mini-icon-btn.max-btn {
        color: var(--data-cyan, #00e5ff);
        font-weight: 800;
      }

      .minimap-body {
        position: relative;
        width: 100%;
        height: 200px;
        background: #07090d;
        overflow: hidden;
        cursor: grab;
      }
      .minimap-body:active { cursor: grabbing; }
      #minimapCanvas {
        display: block;
        width: 100%;
        height: 100%;
      }

      .minimap-compass {
        position: absolute;
        top: 6px;
        right: 8px;
        font-size: 9px;
        font-weight: 800;
        color: var(--data-cyan, #00e5ff);
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        line-height: 1;
        opacity: 0.85;
      }
      .minimap-compass::before {
        content: "▲";
        font-size: 8px;
        color: var(--nasa-red, #e03c31);
      }
      .minimap-scale-bar {
        position: absolute;
        bottom: 5px;
        left: 8px;
        font-size: 8.5px;
        color: #94a3b8;
        pointer-events: none;
        border-bottom: 2px solid #00e5ff;
        padding-bottom: 1px;
        line-height: 1;
      }

      .minimap-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 8px;
        background: #090e15;
        border-top: 1px solid #16202c;
        font-size: 9.5px;
        color: #64748b;
      }
      .mini-hint {
        color: var(--data-cyan, #00e5ff);
        font-weight: 700;
        cursor: pointer;
      }

      /* 2. MAXIMIZED TACTICAL MAPPING STATION (Full-screen Modal) */
      .max-map-modal {
        position: fixed;
        inset: 0;
        z-index: 2000;
        background: rgba(7, 10, 15, 0.98);
        backdrop-filter: blur(14px);
        display: flex;
        flex-direction: column;
        font-family: var(--font-sans, sans-serif);
        color: #f1f5f9;
        user-select: none;
        overflow: hidden;
      }

      .max-map-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        background: #0a0f17;
        border-bottom: 1px solid #1f2c3e;
        flex-shrink: 0;
        gap: 12px;
      }
      .max-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .agency-badge {
        font-family: var(--font-mono, monospace);
        font-size: 13px;
        font-weight: 900;
        color: var(--nasa-red, #e03c31);
        letter-spacing: 1.2px;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .agency-badge span {
        background: var(--nasa-red, #e03c31);
        color: #fff;
        padding: 1px 4px;
        border-radius: 2px;
        font-size: 9px;
      }
      .max-map-title {
        margin: 0;
        font-size: 13px;
        font-weight: 800;
        color: #f8fafc;
        letter-spacing: 0.5px;
        font-family: var(--font-mono, monospace);
      }
      .max-map-sub {
        font-size: 10px;
        color: #64748b;
        font-family: var(--font-mono, monospace);
        margin-top: 1px;
      }

      .max-header-center {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .layer-pill-group {
        display: flex;
        background: #111823;
        border: 1px solid #1e2c3e;
        border-radius: 4px;
        padding: 2px;
        gap: 2px;
      }
      .layer-btn {
        background: transparent;
        border: 0;
        color: #94a3b8;
        padding: 5px 10px;
        border-radius: 3px;
        font-size: 10.5px;
        cursor: pointer;
        font-family: var(--font-mono, monospace);
        font-weight: 600;
        transition: all 0.15s ease;
      }
      .layer-btn:hover { color: #fff; background: #1a2536; }
      .layer-btn.active {
        background: var(--nasa-blue, #0b3d91);
        color: #fff;
        font-weight: 700;
        box-shadow: 0 0 10px rgba(11, 61, 145, 0.5);
      }
      .tint-toggle-label {
        font-size: 10px;
        font-family: var(--font-mono, monospace);
        color: #94a3b8;
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
      }

      .max-header-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .overlay-toggles {
        display: flex;
        gap: 8px;
        font-size: 10px;
        font-family: var(--font-mono, monospace);
        color: #94a3b8;
      }
      .overlay-toggles label {
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
      }
      .max-action-btn {
        background: #141e2c;
        border: 1px solid #24354c;
        color: #e2e8f0;
        border-radius: 3px;
        padding: 5px 10px;
        font-size: 10.5px;
        font-family: var(--font-mono, monospace);
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .max-action-btn:hover { background: #1f3047; border-color: var(--data-cyan, #00e5ff); color: #fff; }
      .max-close-btn {
        background: #1c2738;
        border: 1px solid #324660;
        color: #fff;
        border-radius: 3px;
        padding: 5px 12px;
        font-size: 11px;
        font-family: var(--font-mono, monospace);
        font-weight: 800;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .max-close-btn:hover {
        background: var(--nasa-red, #e03c31);
        border-color: var(--nasa-red, #e03c31);
      }

      /* Body Layout: Center Interactive Canvas + Right Sidebar */
      .max-map-body {
        flex: 1;
        display: flex;
        position: relative;
        overflow: hidden;
      }
      .max-map-canvas-container {
        flex: 1;
        position: relative;
        background: #05070a;
        overflow: hidden;
        cursor: crosshair;
      }
      #maxMapCanvas {
        display: block;
        width: 100%;
        height: 100%;
      }

      /* Hover HUD Inspector Pill */
      .max-hover-hud {
        position: absolute;
        top: 14px;
        left: 14px;
        background: rgba(10, 15, 23, 0.92);
        border: 1px solid #1f2c3e;
        border-radius: 4px;
        padding: 8px 12px;
        font-family: var(--font-mono, monospace);
        font-size: 10px;
        color: #cbd5e1;
        pointer-events: none;
        box-shadow: 0 4px 16px rgba(0,0,0,0.7);
        backdrop-filter: blur(8px);
        display: flex;
        flex-direction: column;
        gap: 3px;
        z-index: 5;
      }
      .max-hover-hud .hud-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .max-hover-hud .hud-row b { color: #64748b; }

      /* Floating Zoom & Reset Buttons */
      .canvas-floating-controls {
        position: absolute;
        bottom: 24px;
        right: 24px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        z-index: 5;
      }
      .float-btn {
        width: 32px;
        height: 32px;
        background: rgba(16, 23, 35, 0.9);
        border: 1px solid #28394f;
        color: #f1f5f9;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-mono, monospace);
        transition: all 0.15s ease;
      }
      .float-btn:hover {
        background: #223249;
        border-color: var(--data-cyan, #00e5ff);
        color: var(--data-cyan, #00e5ff);
      }

      /* Dynamic Scale Bar */
      .canvas-scale-bar-container {
        position: absolute;
        bottom: 16px;
        left: 16px;
        font-family: var(--font-mono, monospace);
        font-size: 10px;
        color: #cbd5e1;
        pointer-events: none;
        z-index: 5;
      }
      #dynamicScaleLine {
        width: 120px;
        height: 3px;
        background: #00e5ff;
        margin-top: 2px;
        border-left: 2px solid #fff;
        border-right: 2px solid #fff;
        box-shadow: 0 0 8px rgba(0, 229, 255, 0.5);
      }

      /* Compass Rose */
      .canvas-compass-indicator {
        position: absolute;
        top: 16px;
        right: 16px;
        font-family: var(--font-mono, monospace);
        font-size: 12px;
        font-weight: 900;
        color: var(--data-cyan, #00e5ff);
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        line-height: 1;
        z-index: 5;
      }
      .compass-arrow {
        color: var(--nasa-red, #e03c31);
        font-size: 14px;
        margin-bottom: 2px;
      }

      /* Clicked Target Action Pill */
      .target-action-pill {
        position: absolute;
        background: rgba(14, 21, 31, 0.96);
        border: 1px solid var(--data-cyan, #00e5ff);
        border-radius: 4px;
        padding: 8px 12px;
        font-family: var(--font-mono, monospace);
        font-size: 10px;
        box-shadow: 0 4px 20px rgba(0, 229, 255, 0.25);
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 10;
        transform: translate(-50%, -120%);
      }
      .pill-act-btn {
        background: #0b3d91;
        border: 1px solid #1b53b8;
        color: #fff;
        border-radius: 3px;
        padding: 4px 8px;
        font-size: 9.5px;
        cursor: pointer;
        font-family: inherit;
        font-weight: 700;
      }
      .pill-act-btn:hover { background: #134db3; }
      .pill-close-btn {
        background: transparent;
        border: 0;
        color: #64748b;
        cursor: pointer;
        font-size: 11px;
      }
      .pill-close-btn:hover { color: #fff; }

      /* Right Tactical Sidebar */
      .max-map-sidebar {
        width: 330px;
        background: #090e15;
        border-left: 1px solid #1d293a;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        flex-shrink: 0;
      }
      .side-card {
        background: #0e141e;
        border: 1px solid #1e2a3c;
        border-radius: 4px;
        padding: 10px;
      }
      .side-card-title {
        font-family: var(--font-mono, monospace);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.8px;
        color: #64748b;
        text-transform: uppercase;
        margin-bottom: 8px;
        border-bottom: 1px solid #1a2534;
        padding-bottom: 4px;
      }

      /* Sidebar Rover List Cards */
      .sidebar-rover-list { display: flex; flex-direction: column; gap: 6px; }
      .side-rover-card {
        background: #121a26;
        border: 1px solid #202d3e;
        border-radius: 3px;
        padding: 6px 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: var(--font-mono, monospace);
        font-size: 10px;
      }
      .side-rover-card.active { border-color: var(--data-cyan, #00e5ff); background: #142232; }
      .src-meta { display: flex; flex-direction: column; gap: 2px; }
      .src-callsign { font-weight: 800; }
      .src-coords { font-size: 9px; color: #64748b; }
      .src-btn {
        background: #1a2738;
        border: 1px solid #283b52;
        color: #94a3b8;
        border-radius: 2px;
        padding: 3px 6px;
        font-size: 9px;
        cursor: pointer;
        font-family: inherit;
      }
      .src-btn:hover { background: #26384f; color: #fff; }

      /* Sidebar Regions List */
      .sidebar-regions-list { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
      .region-tag-btn {
        background: #111822;
        border: 1px solid #1f2b3b;
        border-radius: 3px;
        padding: 6px 4px;
        text-align: center;
        font-size: 9.5px;
        font-family: var(--font-mono, monospace);
        color: #cbd5e1;
        cursor: pointer;
        transition: all 0.15s ease;
        line-height: 1.25;
      }
      .region-tag-btn:hover {
        background: #192434;
        border-color: var(--data-cyan, #00e5ff);
        color: #fff;
      }

      /* Elevation Legend Bar */
      .elevation-legend-bar {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 4px;
      }
      .legend-gradient {
        height: 12px;
        border-radius: 2px;
        background: linear-gradient(to right, #0a192f, #1a5276, #2e86c1, #27ae60, #f1c40f, #e67e22, #c0392b, #f5eee6);
        border: 1px solid #24354c;
      }
      .legend-labels {
        display: flex;
        justify-content: space-between;
        font-family: var(--font-mono, monospace);
        font-size: 8.5px;
        color: #64748b;
      }

      /* Slope Hazard Scale */
      .slope-legend-scale {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px;
        margin-top: 8px;
        font-family: var(--font-mono, monospace);
        font-size: 9px;
      }
      .slope-pill {
        padding: 3px 5px;
        border-radius: 2px;
        background: #121924;
      }
      .slope-pill.safe { color: #2ecc71; border-left: 2px solid #2ecc71; }
      .slope-pill.mild { color: #82c91e; border-left: 2px solid #82c91e; }
      .slope-pill.caution { color: #f1c40f; border-left: 2px solid #f1c40f; }
      .slope-pill.hazard { color: #e74c3c; border-left: 2px solid #e74c3c; }

      /* Mission Objects List */
      .mission-objects-box {
        font-family: var(--font-mono, monospace);
        font-size: 9.5px;
        color: #94a3b8;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .m-obj-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 3px 5px;
        background: #111722;
        border-radius: 2px;
      }
    `;
    document.head.appendChild(style);

    // 1. Injeksi Compact HUD Minimap
    const miniEl = document.createElement('div');
    miniEl.id = 'minimapWidget';
    miniEl.className = 'minimap-widget';
    miniEl.innerHTML = `
      <div class="minimap-header">
        <div class="minimap-title-group">
          <span class="minimap-badge" style="display:flex;align-items:center;gap:5px;">${ICONS.satellite(12)} MINIMAP TAKTIS</span>
          <span id="miniActiveRoverName" class="minimap-rover-tag">ROV-01</span>
        </div>
        <div class="minimap-controls">
          <button id="miniLayerBtn" class="mini-icon-btn" title="Ganti Lapisan Peta (Orto / Topo / Lereng / Hybrid)">${ICONS.layers(11)}</button>
          <button id="miniCenterBtn" class="mini-icon-btn" title="Pusatkan ke Rover">${ICONS.crosshair(11)}</button>
          <button id="miniZoomInBtn" class="mini-icon-btn" title="Perbesar (Zoom In)">${ICONS.plus(11)}</button>
          <button id="miniZoomOutBtn" class="mini-icon-btn" title="Perkecil (Zoom Out)">${ICONS.minus(11)}</button>
          <button id="miniMaximizeBtn" class="mini-icon-btn max-btn" title="Maksimalkan Peta (M)">${ICONS.maximize(11)}</button>
          <button id="miniCollapseBtn" class="mini-icon-btn" title="Sembunyikan / Buka">${ICONS.minus(11)}</button>
        </div>
      </div>
      <div id="minimapBody" class="minimap-body">
        <canvas id="minimapCanvas"></canvas>
        <div class="minimap-compass">N</div>
        <div id="miniScaleBar" class="minimap-scale-bar">1 km ──</div>
      </div>
      <div id="minimapFooter" class="minimap-footer">
        <span id="miniCoords">77.4509°E, 18.4446°N · -2514m</span>
        <span class="mini-hint" id="miniExpandHint">[M] MAX</span>
      </div>
    `;
    document.body.appendChild(miniEl);

    // 2. Injeksi Maximized Tactical Surface Reconnaissance Modal
    const maxEl = document.createElement('div');
    maxEl.id = 'maximizedMapModal';
    maxEl.className = 'max-map-modal';
    maxEl.style.display = 'none';
    maxEl.innerHTML = `
      <header class="max-map-header">
        <div class="max-header-left">
          <div class="agency-badge">NASA <span>JPL</span></div>
          <div class="map-title-box">
            <h2 class="max-map-title">JEZERO CRATER TACTICAL SURFACE RECONNAISSANCE &amp; MAPPING STATION</h2>
            <div class="max-map-sub">Cakupan Geografis: 17.6°–19.3° LU, 76.6°–78.3° BT · Resolusi: 40m DEM &amp; 20m CTX Orthomosaic</div>
          </div>
        </div>

        <div class="max-header-center">
          <div class="layer-pill-group">
            <button class="layer-btn active" data-layer="ortho">${ICONS.satellite(12)} Citra Orto CTX</button>
            <button class="layer-btn" data-layer="dem">${ICONS.mountain(12)} DEM Topografi</button>
            <button class="layer-btn" data-layer="slope">${ICONS.slope(12)} Kemiringan Lereng</button>
            <button class="layer-btn" data-layer="hybrid">${ICONS.layers(12)} Orto + Kontur</button>
          </div>
          <label class="tint-toggle-label">
            <input type="checkbox" id="maxTintCheck" checked> Mars Tone
          </label>
        </div>

        <div class="max-header-right">
          <div class="overlay-toggles">
            <label><input type="checkbox" id="chkShowTrails" checked> Jejak Lintasan</label>
            <label><input type="checkbox" id="chkShowRegions" checked> Wilayah Geologi</label>
            <label><input type="checkbox" id="chkShowWaypoints" checked> Waypoint Misi</label>
            <label><input type="checkbox" id="chkShowGrid" checked> Grid Koordinat</label>
          </div>
          <button id="maxMapFitBtn" class="max-action-btn" title="Lihat Seluruh Area Kawah Jezero (88×101 km)">${ICONS.search(12)} Seluruh Peta</button>
          <button id="maxMapCenterRoverBtn" class="max-action-btn" title="Pusatkan ke Rover Aktif">${ICONS.crosshair(12)} Pusatkan Rover</button>
          <button id="maxMapCloseBtn" class="max-close-btn" title="Perkecil / Tutup Peta (M / Esc)">${ICONS.minimize(12)} Perkecil (M)</button>
        </div>
      </header>

      <div class="max-map-body">
        <div class="max-map-canvas-container" id="maxCanvasContainer">
          <canvas id="maxMapCanvas"></canvas>

          <!-- Hover HUD Inspector -->
          <div id="maxHoverHUD" class="max-hover-hud" style="display:none;">
            <div class="hud-row"><b>KOORDINAT:</b> <span id="hoverLonLat">--</span></div>
            <div class="hud-row"><b>PROJEKSI X/Y:</b> <span id="hoverProj">--</span></div>
            <div class="hud-row"><b>ELEVASI REAL DEM:</b> <span id="hoverElev" style="color:var(--data-cyan)">--</span></div>
            <div class="hud-row"><b>KEMIRINGAN LERENG:</b> <span id="hoverSlope">--</span></div>
            <div class="hud-row"><b>ZONA GEOLOGI:</b> <span id="hoverRegion" style="color:#ffd166">--</span></div>
          </div>

          <!-- Floating Zoom Controls -->
          <div class="canvas-floating-controls">
            <button id="maxZoomInBtn" class="float-btn" title="Zoom In">${ICONS.plus(13)}</button>
            <button id="maxZoomOutBtn" class="float-btn" title="Zoom Out">${ICONS.minus(13)}</button>
            <button id="maxZoomResetBtn" class="float-btn" title="Reset Zoom">${ICONS.rotateCcw(13)}</button>
          </div>

          <!-- Dynamic Scale Bar & North Indicator -->
          <div class="canvas-scale-bar-container">
            <div id="dynamicScaleLabel">5 km</div>
            <div id="dynamicScaleLine"></div>
          </div>
          <div class="canvas-compass-indicator">
            <div class="compass-arrow">▲</div>
            <div>N</div>
          </div>

          <!-- Click Target Action Pill -->
          <div id="mapTargetActionPill" class="target-action-pill" style="display:none;">
            <span id="targetPillTitle">Target: 77.45°E, 18.44°N</span>
            <button id="targetSetWaypointBtn" class="pill-act-btn">${ICONS.pin(11)} Tandai Waypoint</button>
            <button id="targetTeleportCamBtn" class="pill-act-btn">${ICONS.telescope(11)} Lihat di 3D</button>
            <button id="targetClosePillBtn" class="pill-close-btn">${ICONS.x(11)}</button>
          </div>
        </div>

        <!-- Right Tactical Sidebar -->
        <aside class="max-map-sidebar">
          <!-- Section 1: Rover Swarm Telemetry -->
          <div class="side-card">
            <div class="side-card-title">SWARM ROVER TELEMETRI (3 UNIT)</div>
            <div id="sidebarRoverCards" class="sidebar-rover-list"></div>
          </div>

          <!-- Section 2: 6 Geological Regions Fast-Travel -->
          <div class="side-card">
            <div class="side-card-title">6 FORMASI &amp; WILAYAH GEOLOGI</div>
            <div class="sidebar-regions-list" id="sidebarRegionList"></div>
          </div>

          <!-- Section 3: Legend & Hazards -->
          <div class="side-card">
            <div class="side-card-title">LEGENDA ELEVASI &amp; BAHAYA LERENG</div>
            <div class="elevation-legend-bar">
              <div class="legend-gradient"></div>
              <div class="legend-labels">
                <span>-3500m</span>
                <span>-2500m</span>
                <span>-1500m</span>
                <span>-476m</span>
              </div>
            </div>
            <div class="slope-legend-scale">
              <div class="slope-pill safe">■ &lt;6° Aman</div>
              <div class="slope-pill mild">■ 6°-12° Landai</div>
              <div class="slope-pill caution">■ 12°-18° Waspada</div>
              <div class="slope-pill hazard">■ &gt;18° Bahaya</div>
            </div>
          </div>

          <!-- Section 4: Mission Objects -->
          <div class="side-card">
            <div class="side-card-title">OBJEK &amp; STASIUN MISI</div>
            <div id="sidebarMissionObjects" class="mission-objects-box">
              <div class="m-obj-item">
                <span style="display:flex;align-items:center;gap:5px;">${ICONS.pin(11)} Sampel Geologi Terkini</span>
                <span id="sideSampleStatus" style="color:#64748b">Belum Ada</span>
              </div>
              <div class="m-obj-item">
                <span style="display:flex;align-items:center;gap:5px;">${ICONS.microscope(11)} Stasiun Lab Sains</span>
                <span id="sideLabStatus" style="color:#64748b">Belum Dibangun</span>
              </div>
              <div class="m-obj-item">
                <span style="display:flex;align-items:center;gap:5px;">${ICONS.truck(11)} Status Kargo Hermes</span>
                <span id="sideCargoStatus" style="color:#64748b">Kosong</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    `;
    document.body.appendChild(maxEl);
  }

  /* ------------------------------------------------------------------ */
  /*  3. Event Handlers & User Interactions                             */
  /* ------------------------------------------------------------------ */
  #attachListeners() {
    const $ = id => document.getElementById(id);
    const onClick = (id, fn) => {
      const el = $(id);
      if (el) el.onclick = fn;
    };

    // --- Minimap Controls ---
    onClick('miniMaximizeBtn', () => this.toggleMaximize());
    onClick('miniExpandHint', () => this.toggleMaximize());
    onClick('miniCollapseBtn', () => {
      this.isCollapsed = !this.isCollapsed;
      const w = $('minimapWidget');
      if (w) w.classList.toggle('collapsed', this.isCollapsed);
      const b = $('miniCollapseBtn');
      if (b) b.textContent = this.isCollapsed ? '+' : '−';
    });
    onClick('miniCenterBtn', () => {
      const active = this.swarm?.getActiveRover ? this.swarm.getActiveRover() : null;
      if (active?.physics) {
        this.miniCenter.X = active.physics.X;
        this.miniCenter.Y = active.physics.Y;
      }
    });
    onClick('miniZoomInBtn', () => {
      this.miniRadius = Math.max(1000, this.miniRadius * 0.7);
    });
    onClick('miniZoomOutBtn', () => {
      this.miniRadius = Math.min(25000, this.miniRadius * 1.4);
    });
    onClick('miniLayerBtn', () => {
      const layers = ['ortho', 'dem', 'slope', 'hybrid'];
      const nextIdx = (layers.indexOf(this.layer) + 1) % layers.length;
      this.setLayer(layers[nextIdx]);
    });

    // Minimap drag to pan
    const miniBody = $('minimapBody');
    if (miniBody) {
      miniBody.addEventListener('mousedown', e => {
        this.isDraggingMini = true;
        this.dragStartMini = { x: e.clientX, y: e.clientY };
      });
      miniBody.addEventListener('wheel', e => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 1.2 : 0.8;
        this.miniRadius = Math.max(800, Math.min(30000, this.miniRadius * zoomFactor));
      }, { passive: false });
      miniBody.addEventListener('dblclick', () => {
        this.toggleMaximize();
      });
    }

    window.addEventListener('mousemove', e => {
      if (this.isDraggingMini && miniBody) {
        const dx = e.clientX - this.dragStartMini.x;
        const dy = e.clientY - this.dragStartMini.y;
        this.dragStartMini = { x: e.clientX, y: e.clientY };

        const metersPerPx = (this.miniRadius * 2) / (miniBody.clientWidth || 300);
        this.miniCenter.X -= dx * metersPerPx;
        this.miniCenter.Y += dy * metersPerPx;
      }
    });
    window.addEventListener('mouseup', () => {
      this.isDraggingMini = false;
    });

    // --- Maximized Map Controls ---
    onClick('maxMapCloseBtn', () => this.toggleMaximize(false));
    onClick('maxMapFitBtn', () => this.fitEntireJezeroMap());
    onClick('maxMapCenterRoverBtn', () => this.centerOnActiveRover());

    // Layer switch buttons
    document.querySelectorAll('.layer-btn').forEach(btn => {
      btn.onclick = () => {
        const l = btn.dataset.layer;
        this.setLayer(l);
      };
    });

    const tintCheck = $('maxTintCheck');
    if (tintCheck) tintCheck.onchange = e => { this.marsTint = e.target.checked; };
    const chkTrails = $('chkShowTrails');
    if (chkTrails) chkTrails.onchange = e => { this.showTrails = e.target.checked; };
    const chkRegions = $('chkShowRegions');
    if (chkRegions) chkRegions.onchange = e => { this.showRegions = e.target.checked; };
    const chkWaypoints = $('chkShowWaypoints');
    if (chkWaypoints) chkWaypoints.onchange = e => { this.showWaypoints = e.target.checked; };
    const chkGrid = $('chkShowGrid');
    if (chkGrid) chkGrid.onchange = e => { this.showGrid = e.target.checked; };

    // Floating zoom buttons on maximized canvas
    onClick('maxZoomInBtn', () => this.zoomMaximized(0.65));
    onClick('maxZoomOutBtn', () => this.zoomMaximized(1.5));
    onClick('maxZoomResetBtn', () => this.fitEntireJezeroMap());

    // Maximized Canvas Pan & Hover
    const maxContainer = $('maxCanvasContainer');
    const maxCanvas = $('maxMapCanvas');

    if (maxContainer && maxCanvas) {
      maxContainer.addEventListener('mousedown', e => {
        if (e.target !== maxCanvas) return;
        this.isDraggingMax = true;
        this.dragStartMax = { x: e.clientX, y: e.clientY };
      });

      maxContainer.addEventListener('wheel', e => {
        if (!this.isMaximized) return;
        e.preventDefault();
        const rect = maxCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const factor = e.deltaY > 0 ? 1.25 : 0.8;
        this.zoomMaximizedAroundPoint(factor, mouseX, mouseY, maxCanvas.clientWidth, maxCanvas.clientHeight);
      }, { passive: false });

      // Click on maximized map to place target / waypoint
      maxCanvas.addEventListener('click', e => {
        if (Math.hypot(e.clientX - this.dragStartMax.x, e.clientY - this.dragStartMax.y) > 6) return;
        const rect = maxCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        this.#handleMapClick(mouseX, mouseY, maxCanvas.clientWidth, maxCanvas.clientHeight);
      });
    }

    window.addEventListener('mousemove', e => {
      if (this.isDraggingMax && this.isMaximized && maxCanvas) {
        const dx = e.clientX - this.dragStartMax.x;
        const dy = e.clientY - this.dragStartMax.y;
        this.dragStartMax = { x: e.clientX, y: e.clientY };

        const metersPerPx = this.maxView.widthMeters / (maxCanvas.clientWidth || 1000);
        this.maxView.targetCenterX -= dx * metersPerPx;
        this.maxView.targetCenterY += dy * metersPerPx;
        this.maxView.centerX = this.maxView.targetCenterX;
        this.maxView.centerY = this.maxView.targetCenterY;
      }

      // Update hover HUD on maximized map
      if (this.isMaximized && maxCanvas) {
        const rect = maxCanvas.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          this.#updateHoverInspection(mouseX, mouseY, maxCanvas.clientWidth, maxCanvas.clientHeight);
        } else {
          const hud = $('maxHoverHUD');
          if (hud) hud.style.display = 'none';
        }
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDraggingMax = false;
    });

    onClick('targetClosePillBtn', () => {
      const p = $('mapTargetActionPill');
      if (p) p.style.display = 'none';
      this.selectedTarget = null;
    });
    onClick('targetSetWaypointBtn', () => {
      if (this.selectedTarget && this.missionSystem) {
        this.missionSystem.markSampleWaypoint(
          { X: this.selectedTarget.X, Y: this.selectedTarget.Y },
          this.selectedTarget.regionId
        );
        if (this.hud) this.hud.showToast(`Waypoint Misi Ditetapkan pada ${this.selectedTarget.lon.toFixed(4)}°E, ${this.selectedTarget.lat.toFixed(4)}°N`);
        const p = $('mapTargetActionPill');
        if (p) p.style.display = 'none';
      }
    });
    onClick('targetTeleportCamBtn', () => {
      if (this.selectedTarget && this.rig) {
        const w = this.frame.toWorld(this.selectedTarget.X, this.selectedTarget.Y, this.selectedTarget.elev);
        this.rig.controls.target.set(w.x, w.y, w.z);
        this.toggleMaximize(false);
        if (this.hud) this.hud.showToast(`Kamera 3D Diarahkan ke Titik Pilihan`);
      }
    });

    // Keyboard shortcut 'M' toggles maximize; 'Escape' closes
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyM' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (document.activeElement && ['input', 'select', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;
        this.toggleMaximize();
      } else if (e.code === 'Escape' && this.isMaximized) {
        this.toggleMaximize(false);
      }
    });

    // Populate Sidebar Regions List (6 Mars geological POIs)
    this.#populateSidebarRegions();
  }

  /* ------------------------------------------------------------------ */
  /*  4. Public Methods & View Navigation                               */
  /* ------------------------------------------------------------------ */
  setLayer(layerName) {
    this.layer = layerName;
    document.querySelectorAll('.layer-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.layer === layerName);
    });
    const miniBtn = document.getElementById('miniLayerBtn');
    if (miniBtn) {
      if (layerName === 'ortho') miniBtn.innerHTML = ICONS.satellite(11);
      else if (layerName === 'dem') miniBtn.innerHTML = ICONS.mountain(11);
      else if (layerName === 'slope') miniBtn.innerHTML = ICONS.slope(11);
      else miniBtn.innerHTML = ICONS.layers(11);
    }
  }

  toggleMaximize(forcedState = null) {
    this.isMaximized = forcedState !== null ? forcedState : !this.isMaximized;
    const modal = document.getElementById('maximizedMapModal');
    if (modal) {
      modal.style.display = this.isMaximized ? 'flex' : 'none';
      if (this.isMaximized) {
        this.centerOnActiveRover();
        if (this.hud) this.hud.showToast('Peta Taktis Kawah Jezero Dimaksimalkan');
      }
    }
  }

  centerOnActiveRover() {
    const active = this.swarm.getActiveRover();
    if (!active) return;
    this.maxView.targetCenterX = active.physics.X;
    this.maxView.targetCenterY = active.physics.Y;
    this.maxView.targetWidthMeters = Math.min(16000, this.meta.extent.width * 0.25);
    this.maxView.targetHeightMeters = this.maxView.targetWidthMeters;
    this.maxView.centerX = this.maxView.targetCenterX;
    this.maxView.centerY = this.maxView.targetCenterY;
    this.maxView.widthMeters = this.maxView.targetWidthMeters;
    this.maxView.heightMeters = this.maxView.targetHeightMeters;

    this.miniCenter.X = active.physics.X;
    this.miniCenter.Y = active.physics.Y;
  }

  fitEntireJezeroMap() {
    const ext = this.meta.extent;
    this.maxView.targetCenterX = (ext.left + ext.right) / 2;
    this.maxView.targetCenterY = (ext.bottom + ext.top) / 2;
    this.maxView.targetWidthMeters = ext.width;
    this.maxView.targetHeightMeters = ext.height;
    this.maxView.centerX = this.maxView.targetCenterX;
    this.maxView.centerY = this.maxView.targetCenterY;
    this.maxView.widthMeters = this.maxView.targetWidthMeters;
    this.maxView.heightMeters = this.maxView.targetHeightMeters;
  }

  zoomMaximized(factor) {
    const nw = Math.max(this.maxView.minWidth, Math.min(this.maxView.maxWidth, this.maxView.widthMeters * factor));
    this.maxView.targetWidthMeters = nw;
    this.maxView.targetHeightMeters = nw;
    this.maxView.widthMeters = nw;
    this.maxView.heightMeters = nw;
  }

  zoomMaximizedAroundPoint(factor, mouseX, mouseY, canvasW, canvasH) {
    const nw = Math.max(this.maxView.minWidth, Math.min(this.maxView.maxWidth, this.maxView.widthMeters * factor));
    const nh = nw;

    // Preserve the geographic point under cursor
    const mousePropX = mouseX / canvasW;
    const mousePropY = mouseY / canvasH;

    const minX = this.maxView.centerX - this.maxView.widthMeters / 2;
    const maxY = this.maxView.centerY + this.maxView.heightMeters / 2;
    const groundX = minX + mousePropX * this.maxView.widthMeters;
    const groundY = maxY - mousePropY * this.maxView.heightMeters;

    this.maxView.centerX = groundX - (mousePropX - 0.5) * nw;
    this.maxView.centerY = groundY + (mousePropY - 0.5) * nh;
    this.maxView.widthMeters = nw;
    this.maxView.heightMeters = nh;
    this.maxView.targetCenterX = this.maxView.centerX;
    this.maxView.targetCenterY = this.maxView.centerY;
    this.maxView.targetWidthMeters = nw;
    this.maxView.targetHeightMeters = nh;
  }

  flyToRegion(cx, cy, radius = 5000) {
    this.maxView.targetCenterX = cx;
    this.maxView.targetCenterY = cy;
    this.maxView.targetWidthMeters = radius * 2.8;
    this.maxView.targetHeightMeters = radius * 2.8;
    this.maxView.centerX = cx;
    this.maxView.centerY = cy;
    this.maxView.widthMeters = this.maxView.targetWidthMeters;
    this.maxView.heightMeters = this.maxView.targetHeightMeters;
  }

  #populateSidebarRegions() {
    const container = document.getElementById('sidebarRegionList');
    if (!container || !this.regionMarkers) return;

    container.innerHTML = this.regionMarkers.markers.map(m => `
      <button class="region-tag-btn" data-reg-id="${m.id}" data-cx="${m.projX}" data-cy="${m.projY}" title="${m.desc}">
        <span style="color:#00e5ff;font-weight:700;">●</span> ${m.name}
      </button>
    `).join('');

    container.querySelectorAll('.region-tag-btn').forEach(btn => {
      btn.onclick = () => {
        const cx = parseFloat(btn.dataset.cx);
        const cy = parseFloat(btn.dataset.cy);
        this.flyToRegion(cx, cy, 4500);
      };
    });
  }

  #updateHoverInspection(mouseX, mouseY, canvasW, canvasH) {
    const minX = this.maxView.centerX - this.maxView.widthMeters / 2;
    const maxX = this.maxView.centerX + this.maxView.widthMeters / 2;
    const minY = this.maxView.centerY - this.maxView.heightMeters / 2;
    const maxY = this.maxView.centerY + this.maxView.heightMeters / 2;

    const pX = minX + (mouseX / canvasW) * (maxX - minX);
    const pY = maxY - (mouseY / canvasH) * (maxY - minY);

    const [lon, lat] = this.frame.projToLonLat(pX, pY);
    let elev = this.hf.sample(pX, pY);
    if (this.regionMarkers) elev += this.regionMarkers.getReliefAt(pX, pY);
    const slope = this.hf.slopeDeg(pX, pY);

    // Identify Region
    let regName = 'Kawah Jezero (Delta & Basin)';
    if (this.regionMarkers && this.regionMarkers.markers) {
      for (const m of this.regionMarkers.markers) {
        const d = Math.hypot(pX - m.projX, pY - m.projY);
        if (d <= 3500) {
          regName = m.name;
          break;
        }
      }
    }

    const hud = document.getElementById('maxHoverHUD');
    hud.style.display = 'flex';
    document.getElementById('hoverLonLat').textContent = `${lon.toFixed(4)}°E, ${lat.toFixed(4)}°N`;
    document.getElementById('hoverProj').textContent = `X:${Math.round(pX)} Y:${Math.round(pY)}`;
    document.getElementById('hoverElev').textContent = `${elev.toFixed(1)} m`;
    document.getElementById('hoverSlope').textContent = `${slope.toFixed(1)}° (${slope < 12 ? 'Traversable' : 'Terjal'})`;
    document.getElementById('hoverRegion').textContent = regName;

    this.hoverPos = { pX, pY, mouseX, mouseY };
  }

  #handleMapClick(mouseX, mouseY, canvasW, canvasH) {
    const minX = this.maxView.centerX - this.maxView.widthMeters / 2;
    const maxX = this.maxView.centerX + this.maxView.widthMeters / 2;
    const minY = this.maxView.centerY - this.maxView.heightMeters / 2;
    const maxY = this.maxView.centerY + this.maxView.heightMeters / 2;

    const pX = minX + (mouseX / canvasW) * (maxX - minX);
    const pY = maxY - (mouseY / canvasH) * (maxY - minY);
    const [lon, lat] = this.frame.projToLonLat(pX, pY);
    const elev = this.hf.sample(pX, pY);

    this.selectedTarget = { X: pX, Y: pY, lon, lat, elev, mouseX, mouseY };

    const pill = document.getElementById('mapTargetActionPill');
    pill.style.display = 'flex';
    pill.style.left = `${mouseX}px`;
    pill.style.top = `${mouseY}px`;
    document.getElementById('targetPillTitle').textContent = `Koordinat: ${lon.toFixed(4)}°E, ${lat.toFixed(4)}°N`;
  }

  /* ------------------------------------------------------------------ */
  /*  5. Animation Frame Update & Rendering Loop                        */
  /* ------------------------------------------------------------------ */
  update() {
    this.radarAngle = (this.radarAngle + 0.04) % (Math.PI * 2);
    const active = this.swarm?.getActiveRover ? this.swarm.getActiveRover() : null;

    // 1. Render Compact HUD Minimap
    if (!this.isCollapsed) {
      if (!this.isDraggingMini && active?.physics) {
        // Smoothly follow active rover
        this.miniCenter.X += (active.physics.X - this.miniCenter.X) * 0.15;
        this.miniCenter.Y += (active.physics.Y - this.miniCenter.Y) * 0.15;
      }
      this.#renderMinimap();
    }

    // 2. Render Maximized Tactical Map & Sidebar
    if (this.isMaximized) {
      this.#renderMaximizedMap();
      this.#updateSidebarTelemetry();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  6. Rendering: Compact HUD Minimap                                 */
  /* ------------------------------------------------------------------ */
  #renderMinimap() {
    const canvas = document.getElementById('minimapCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle retina display
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 200;
    if (w <= 0 || h <= 0) return;

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const aspect = w / h;
    const radiusX = this.miniRadius * (aspect >= 1 ? aspect : 1);
    const radiusY = this.miniRadius / (aspect >= 1 ? 1 : 1 / aspect);
    const minX = this.miniCenter.X - radiusX;
    const maxX = this.miniCenter.X + radiusX;
    const minY = this.miniCenter.Y - radiusY;
    const maxY = this.miniCenter.Y + radiusY;

    // 1. Draw terrain slice (Ortho CTX / DEM Topo / Slope / Hybrid)
    try {
      this.#drawTerrainSlice(ctx, minX, maxX, minY, maxY, w, h);
    } catch (e) {
      console.warn('[Minimap] Terrain slice render error:', e);
    }

    // 2. Draw Grid Lines
    try {
      this.#drawMiniGrid(ctx, minX, maxX, minY, maxY, w, h);
    } catch (_) {}

    // 3. Draw Region Rings & Labels
    if (this.showRegions) {
      try {
        this.#drawRegionsOnCanvas(ctx, minX, maxX, minY, maxY, w, h, true);
      } catch (_) {}
    }

    // 4. Draw History Trails
    if (this.showTrails && this.historyTracker) {
      try {
        this.#drawTrailsOnCanvas(ctx, minX, maxX, minY, maxY, w, h, 1.8);
      } catch (_) {}
    }

    // 5. Draw Waypoints & Lab
    if (this.showWaypoints) {
      try {
        this.#drawMissionPointsOnCanvas(ctx, minX, maxX, minY, maxY, w, h, true);
      } catch (_) {}
    }

    // 6. Draw Swarm Rovers
    try {
      this.#drawRoversOnCanvas(ctx, minX, maxX, minY, maxY, w, h, true);
    } catch (e) {
      console.warn('[Minimap] Rover render error:', e);
    }

    // 7. Update Footer Readout
    try {
      const active = this.swarm?.getActiveRover ? this.swarm.getActiveRover() : null;
      if (active?.physics) {
        const [lon, lat] = this.frame.projToLonLat(active.physics.X, active.physics.Y);
        const elev = active.physics.elevation ?? 0;
        const coordsEl = document.getElementById('miniCoords');
        if (coordsEl) {
          coordsEl.textContent = `${lon.toFixed(4)}°E, ${lat.toFixed(4)}°N · ${Math.round(elev)}m`;
        }
        const tagEl = document.getElementById('miniActiveRoverName');
        if (tagEl) tagEl.textContent = active.callsign || 'ROV-01';
      }

      // Scale Bar Indicator
      const scaleBar = document.getElementById('miniScaleBar');
      if (scaleBar) {
        const groundWidth = this.miniRadius * 2;
        const scaleMeters = groundWidth > 8000 ? 2000 : (groundWidth > 3000 ? 1000 : 500);
        scaleBar.textContent = scaleMeters >= 1000 ? `${scaleMeters / 1000} km ──` : `${scaleMeters} m ──`;
      }
    } catch (_) {}
  }

  /* ------------------------------------------------------------------ */
  /*  7. Rendering: Maximized Tactical Command Map                      */
  /* ------------------------------------------------------------------ */
  #renderMaximizedMap() {
    const canvas = document.getElementById('maxMapCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 1000;
    const h = canvas.clientHeight || 700;
    if (w <= 0 || h <= 0) return;

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Smoothly animate towards target center & zoom if moving
    this.maxView.centerX += (this.maxView.targetCenterX - this.maxView.centerX) * 0.12;
    this.maxView.centerY += (this.maxView.targetCenterY - this.maxView.centerY) * 0.12;
    this.maxView.widthMeters += (this.maxView.targetWidthMeters - this.maxView.widthMeters) * 0.12;

    const aspect = w / h;
    const viewW = this.maxView.widthMeters;
    const viewH = viewW / aspect;

    const minX = this.maxView.centerX - viewW / 2;
    const maxX = this.maxView.centerX + viewW / 2;
    const minY = this.maxView.centerY - viewH / 2;
    const maxY = this.maxView.centerY + viewH / 2;

    // Draw Base Terrain Slice
    try {
      this.#drawTerrainSlice(ctx, minX, maxX, minY, maxY, w, h);
    } catch (_) {}

    // Coordinate Grid & Graticule
    if (this.showGrid) {
      try {
        this.#drawMaxGraticule(ctx, minX, maxX, minY, maxY, w, h);
      } catch (_) {}
    }

    // Geological Regions
    if (this.showRegions) {
      try {
        this.#drawRegionsOnCanvas(ctx, minX, maxX, minY, maxY, w, h, false);
      } catch (_) {}
    }

    // History Trails
    if (this.showTrails && this.historyTracker) {
      try {
        this.#drawTrailsOnCanvas(ctx, minX, maxX, minY, maxY, w, h, 2.5);
      } catch (_) {}
    }

    // Waypoints & Lab Station
    if (this.showWaypoints) {
      try {
        this.#drawMissionPointsOnCanvas(ctx, minX, maxX, minY, maxY, w, h, false);
      } catch (_) {}
    }

    // Swarm Rovers
    try {
      this.#drawRoversOnCanvas(ctx, minX, maxX, minY, maxY, w, h, false);
    } catch (_) {}

    // Clicked Target Pin
    if (this.selectedTarget) {
      const tx = ((this.selectedTarget.X - minX) / (maxX - minX)) * w;
      const ty = ((maxY - this.selectedTarget.Y) / (maxY - minY)) * h;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx, ty, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tx - 12, ty); ctx.lineTo(tx + 12, ty);
      ctx.moveTo(tx, ty - 12); ctx.lineTo(tx, ty + 12);
      ctx.stroke();
    }

    // Tactical Corner Brackets
    this.#drawTacticalBrackets(ctx, w, h);

    // Dynamic Scale Bar
    this.#updateDynamicScaleBar(viewW, w);
  }

  /* ------------------------------------------------------------------ */
  /*  8. Common Canvas Drawing Helpers                                  */
  /* ------------------------------------------------------------------ */
  #drawTerrainSlice(ctx, minX, maxX, minY, maxY, canvasW, canvasH) {
    const ext = this.meta?.extent;
    if (!ext) return;

    // Outside bounds fill
    ctx.fillStyle = '#06080c';
    ctx.fillRect(0, 0, canvasW, canvasH);

    if (maxX <= ext.left || minX >= ext.right || maxY <= ext.bottom || minY >= ext.top) {
      return;
    }

    const cMinX = Math.max(minX, ext.left);
    const cMaxX = Math.min(maxX, ext.right);
    const cMinY = Math.max(minY, ext.bottom);
    const cMaxY = Math.min(maxY, ext.top);

    // Normalized source texture coords
    const u0 = (cMinX - ext.left) / ext.width;
    const u1 = (cMaxX - ext.left) / ext.width;
    const v0 = (ext.top - cMaxY) / ext.height;
    const v1 = (ext.top - cMinY) / ext.height;

    // Destination coords on canvas
    const dx = ((cMinX - minX) / (maxX - minX)) * canvasW;
    const dw = ((cMaxX - cMinX) / (maxX - minX)) * canvasW;
    const dy = ((maxY - cMaxY) / (maxY - minY)) * canvasH;
    const dh = ((cMaxY - cMinY) / (maxY - minY)) * canvasH;

    if (!this.orthoImage && this.texture?.image) {
      this.orthoImage = this.texture.image;
    }

    const isImgReady = s => {
      if (!s) return false;
      if (typeof HTMLImageElement !== 'undefined' && s instanceof HTMLImageElement) {
        return s.complete && (s.naturalWidth > 0 || s.width > 0);
      }
      return true;
    };

    let source = null;
    let isOrtho = false;

    if (this.layer === 'ortho') {
      source = this.orthoImage;
      isOrtho = true;
      if (!source || !isImgReady(source)) {
        source = this.demCanvas;
        isOrtho = false;
      }
    } else if (this.layer === 'dem') {
      source = this.demCanvas;
    } else if (this.layer === 'slope') {
      source = this.slopeCanvas;
    } else if (this.layer === 'hybrid') {
      source = this.orthoImage;
      isOrtho = true;
      if (!source || !isImgReady(source)) {
        source = this.demCanvas;
        isOrtho = false;
      }
    }

    if (!source) source = this.demCanvas;
    if (!source || dw <= 0 || dh <= 0) return;

    try {
      const sw = source.naturalWidth || source.width || 4096;
      const sh = source.naturalHeight || source.height || 4666;
      const sx = u0 * sw;
      const sy = v0 * sh;
      const sW = (u1 - u0) * sw;
      const sH = (v1 - v0) * sh;

      if (sW > 0 && sH > 0) {
        ctx.drawImage(source, sx, sy, sW, sH, dx, dy, dw, dh);

        // Mars Tint for Ortho
        if (isOrtho && this.marsTint) {
          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = '#cf7a4b';
          ctx.fillRect(dx, dy, dw, dh);
          ctx.restore();
        }

        // Hybrid Layer: Blend DEM color on top of Orthomosaic
        if (this.layer === 'hybrid' && this.demCanvas && source !== this.demCanvas) {
          ctx.save();
          ctx.globalAlpha = 0.42;
          const dsw = this.demCanvas.width;
          const dsh = this.demCanvas.height;
          ctx.drawImage(this.demCanvas, u0 * dsw, v0 * dsh, (u1 - u0) * dsw, (v1 - v0) * dsh, dx, dy, dw, dh);
          ctx.restore();
        }
      }
    } catch (err) {
      if (this.demCanvas && source !== this.demCanvas) {
        try {
          const dsw = this.demCanvas.width;
          const dsh = this.demCanvas.height;
          ctx.drawImage(this.demCanvas, u0 * dsw, v0 * dsh, (u1 - u0) * dsw, (v1 - v0) * dsh, dx, dy, dw, dh);
        } catch (_) {}
      }
    }
  }

  #drawMiniGrid(ctx, minX, maxX, minY, maxY, w, h) {
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.lineWidth = 1;
    const step = 1000; // 1 km grid
    const startX = Math.floor(minX / step) * step;
    const startY = Math.floor(minY / step) * step;

    ctx.beginPath();
    for (let gx = startX; gx <= maxX; gx += step) {
      const x = ((gx - minX) / (maxX - minX)) * w;
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    }
    for (let gy = startY; gy <= maxY; gy += step) {
      const y = ((maxY - gy) / (maxY - minY)) * h;
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();
  }

  #drawMaxGraticule(ctx, minX, maxX, minY, maxY, w, h) {
    // 5 km coordinate grid with Lon / Lat labels
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '500 9.5px "JetBrains Mono", monospace';

    const step = this.maxView.widthMeters > 30000 ? 10000 : (this.maxView.widthMeters > 8000 ? 5000 : 1000);
    const startX = Math.floor(minX / step) * step;
    const startY = Math.floor(minY / step) * step;

    ctx.beginPath();
    for (let gx = startX; gx <= maxX; gx += step) {
      const x = ((gx - minX) / (maxX - minX)) * w;
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
      const [lon] = this.frame.projToLonLat(gx, (minY + maxY) / 2);
      ctx.fillText(`${lon.toFixed(2)}°E`, x + 3, h - 6);
    }
    for (let gy = startY; gy <= maxY; gy += step) {
      const y = ((maxY - gy) / (maxY - minY)) * h;
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      const [, lat] = this.frame.projToLonLat((minX + maxX) / 2, gy);
      ctx.fillText(`${lat.toFixed(2)}°N`, 6, y - 4);
    }
    ctx.stroke();
  }

  #drawRegionsOnCanvas(ctx, minX, maxX, minY, maxY, w, h, isMini) {
    if (!this.regionMarkers || !this.regionMarkers.markers) return;

    for (const m of this.regionMarkers.markers) {
      const rx = ((m.projX - minX) / (maxX - minX)) * w;
      const ry = ((maxY - m.projY) / (maxY - minY)) * h;
      const rPix = (1800 / (maxX - minX)) * w;

      if (rx < -100 || rx > w + 100 || ry < -100 || ry > h + 100) continue;

      ctx.save();
      // Outer zone dashed ring
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(rx, ry, Math.max(isMini ? 8 : 16, rPix), 0, Math.PI * 2);
      ctx.stroke();

      // Center Beacon Point
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(rx, ry, isMini ? 2.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Label
      if (!isMini || this.miniRadius > 6000) {
        ctx.font = isMini ? '600 8.5px "Plus Jakarta Sans", "Inter", sans-serif' : '600 11px "Plus Jakarta Sans", "Inter", sans-serif';
        ctx.fillStyle = '#f1f5f9';
        ctx.textAlign = 'center';
        ctx.fillText(m.name, rx, ry - (isMini ? 8 : 12));
      }
      ctx.restore();
    }
  }

  #drawTrailsOnCanvas(ctx, minX, maxX, minY, maxY, w, h, lineWidth) {
    const tracks = this.historyTracker?.tracks;
    if (!tracks || !Array.isArray(tracks)) return;

    for (const track of tracks) {
      if (!track || !track.waypoints || !Array.isArray(track.waypoints) || track.waypoints.length < 2) continue;
      const wps = track.waypoints;

      ctx.save();
      ctx.strokeStyle = track.hexStr || '#00e5ff';
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.beginPath();

      let started = false;
      for (let i = 0; i < wps.length; i++) {
        const wp = wps[i];
        if (!wp || typeof wp.X !== 'number' || typeof wp.Y !== 'number') continue;
        const x = ((wp.X - minX) / (maxX - minX)) * w;
        const y = ((maxY - wp.Y) / (maxY - minY)) * h;

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Start landing site ring
      const startWp = wps[0];
      if (startWp && typeof startWp.X === 'number' && typeof startWp.Y === 'number') {
        const sx = ((startWp.X - minX) / (maxX - minX)) * w;
        const sy = ((maxY - startWp.Y) / (maxY - minY)) * h;
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  #drawMissionPointsOnCanvas(ctx, minX, maxX, minY, maxY, w, h, isMini) {
    if (!this.missionSystem) return;

    // 1. Sample Waypoint
    if (this.missionSystem.activeWaypoint && typeof this.missionSystem.activeWaypoint.X === 'number') {
      const wp = this.missionSystem.activeWaypoint;
      const x = ((wp.X - minX) / (maxX - minX)) * w;
      const y = ((maxY - wp.Y) / (maxY - minY)) * h;

      ctx.save();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(x, y, isMini ? 4 : 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, isMini ? 8 : 12, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = '700 9.5px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffd166';
      ctx.textAlign = 'center';
      ctx.fillText('● SAMPEL', x, y - (isMini ? 8 : 12));
      ctx.restore();
    }

    // 2. Science Lab Station
    if (this.missionSystem.labStation && typeof this.missionSystem.labStation.X === 'number') {
      const lab = this.missionSystem.labStation;
      const x = ((lab.X - minX) / (maxX - minX)) * w;
      const y = ((maxY - lab.Y) / (maxY - minY)) * h;

      ctx.save();
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(x - (isMini ? 3 : 5), y - (isMini ? 3 : 5), isMini ? 6 : 10, isMini ? 6 : 10);
      ctx.font = '700 9.5px "JetBrains Mono", monospace';
      ctx.fillStyle = '#d8b4fe';
      ctx.textAlign = 'center';
      ctx.fillText('● LAB SAINS', x, y - (isMini ? 7 : 10));
      ctx.restore();
    }
  }

  #drawRoversOnCanvas(ctx, minX, maxX, minY, maxY, w, h, isMini) {
    const rovers = this.swarm?.rovers;
    if (!rovers || !Array.isArray(rovers)) return;
    const activeIdx = this.swarm.activeIndex ?? 0;

    for (let i = 0; i < rovers.length; i++) {
      const rov = rovers[i];
      const p = rov?.physics;
      if (!p || typeof p.X !== 'number' || typeof p.Y !== 'number') continue;

      const rx = ((p.X - minX) / (maxX - minX)) * w;
      const ry = ((maxY - p.Y) / (maxY - minY)) * h;
      const isActive = i === activeIdx;

      // Skip rovers far outside canvas bounds
      if (rx < -80 || rx > w + 80 || ry < -80 || ry > h + 80) continue;

      const color = rov.accentHex || '#00e5ff';
      const heading = p.heading || 0;

      ctx.save();
      ctx.translate(rx, ry);

      // Vision / Heading Sensor Cone (Active rover only)
      if (isActive) {
        ctx.save();
        ctx.rotate(heading);
        ctx.fillStyle = 'rgba(0, 229, 255, 0.16)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, isMini ? 38 : 70, -Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45);
        ctx.closePath();
        ctx.fill();

        // Pulsing Radar Ring
        const pulse = (this.radarAngle / (Math.PI * 2));
        ctx.strokeStyle = `rgba(0, 229, 255, ${Math.max(0, 0.85 - pulse * 0.85)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, pulse * (isMini ? 28 : 55), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Outer Ring for Active Rover
      if (isActive) {
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, isMini ? 12 : 16, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Rover Arrow Body pointing along physical heading
      ctx.save();
      ctx.rotate(heading);
      ctx.fillStyle = color;
      ctx.strokeStyle = '#060a12';
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      const sz = isActive ? (isMini ? 6.5 : 10) : (isMini ? 5 : 7.5);
      ctx.moveTo(0, -sz * 1.5);
      ctx.lineTo(-sz, sz);
      ctx.lineTo(0, sz * 0.4);
      ctx.lineTo(sz, sz);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Rover Label Pill
      ctx.font = isActive ? '700 10.5px "JetBrains Mono", monospace' : '600 9px "JetBrains Mono", monospace';
      ctx.fillStyle = isActive ? '#00e5ff' : '#cbd5e1';
      ctx.textAlign = 'center';
      const firstName = rov.name ? rov.name.split(' ')[0] : `ROV-0${i + 1}`;
      const callsign = rov.callsign || `0${i + 1}`;
      const label = `${callsign} ${firstName}`.trim();
      ctx.fillText(label, 0, - (isMini ? (isActive ? 16 : 12) : (isActive ? 22 : 16)));

      ctx.restore();
    }
  }

  #drawTacticalBrackets(ctx, w, h) {
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 2;
    const len = 16;
    // Top-left
    ctx.beginPath(); ctx.moveTo(8, 8 + len); ctx.lineTo(8, 8); ctx.lineTo(8 + len, 8); ctx.stroke();
    // Top-right
    ctx.beginPath(); ctx.moveTo(w - 8 - len, 8); ctx.lineTo(w - 8, 8); ctx.lineTo(w - 8, 8 + len); ctx.stroke();
    // Bottom-left
    ctx.beginPath(); ctx.moveTo(8, h - 8 - len); ctx.lineTo(8, h - 8); ctx.lineTo(8 + len, h - 8); ctx.stroke();
    // Bottom-right
    ctx.beginPath(); ctx.moveTo(w - 8 - len, h - 8); ctx.lineTo(w - 8, h - 8); ctx.lineTo(w - 8, h - 8 - len); ctx.stroke();
  }

  #updateDynamicScaleBar(viewWidthMeters, canvasWidthPx) {
    const scaleLine = document.getElementById('dynamicScaleLine');
    const scaleLabel = document.getElementById('dynamicScaleLabel');
    if (!scaleLine || !scaleLabel) return;

    const metersPerPx = viewWidthMeters / (canvasWidthPx || 1000);
    let targetMeters = 5000;
    if (viewWidthMeters < 3000) targetMeters = 500;
    else if (viewWidthMeters < 10000) targetMeters = 1000;
    else if (viewWidthMeters < 35000) targetMeters = 5000;
    else targetMeters = 20000;

    const barWidthPx = targetMeters / metersPerPx;
    scaleLine.style.width = `${Math.round(barWidthPx)}px`;
    scaleLabel.textContent = targetMeters >= 1000 ? `${targetMeters / 1000} km` : `${targetMeters} m`;
  }

  #updateSidebarTelemetry() {
    const container = document.getElementById('sidebarRoverCards');
    if (!container || !this.swarm?.rovers) return;

    const rovers = this.swarm.rovers;
    const activeIdx = this.swarm.activeIndex ?? 0;

    container.innerHTML = rovers.map((r, i) => {
      const p = r.physics || {};
      const [lon, lat] = (typeof p.X === 'number' && typeof p.Y === 'number')
        ? this.frame.projToLonLat(p.X, p.Y)
        : [0, 0];
      const track = this.historyTracker?.tracks?.[i];
      const dist = (track && typeof track.totalDistance === 'number') ? track.totalDistance.toFixed(1) : '0.0';
      const isActive = i === activeIdx;

      return `
        <div class="side-rover-card ${isActive ? 'active' : ''}">
          <div class="src-meta">
            <span class="src-callsign" style="color:${r.accentHex || '#00e5ff'}">${r.callsign || ('ROV-0' + (i+1))} · ${r.name || 'Rover'}</span>
            <span class="src-coords">${lon.toFixed(4)}°E, ${lat.toFixed(4)}°N · Elv: ${Math.round(p.elevation ?? 0)}m</span>
            <span style="font-size:8.5px;color:#64748b;">Spd: ${(p.speed ?? 0).toFixed(1)} m/s · Jarak: ${dist} m</span>
          </div>
          <button class="src-btn focus-rover-btn" data-idx="${i}" style="display:inline-flex;align-items:center;gap:4px;">
            <span>Fokus</span>
            ${ICONS.crosshair(11)}
          </button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.focus-rover-btn').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx, 10);
        this.swarm.setActiveRover(idx);
        if (this.hud) this.hud.updateRoverSelection(idx, this.swarm.getActiveRover());
        this.centerOnActiveRover();
      };
    });

    // Update Mission Objects Status
    if (this.missionSystem) {
      const sSample = document.getElementById('sideSampleStatus');
      if (sSample) {
        if (this.missionSystem.activeWaypoint) {
          sSample.innerHTML = `${ICONS.pin(11)} <span>Waypoint Ditetapkan</span>`;
          sSample.style.color = '#f59e0b';
        } else {
          sSample.textContent = 'Belum Ada';
          sSample.style.color = '#64748b';
        }
      }
      const sLab = document.getElementById('sideLabStatus');
      if (sLab) {
        if (this.missionSystem.labStation) {
          sLab.innerHTML = `${ICONS.microscope(11)} <span>Aktif Beroperasi</span>`;
          sLab.style.color = '#10b981';
        } else {
          sLab.textContent = 'Belum Dibangun';
          sLab.style.color = '#64748b';
        }
      }
      const sCargo = document.getElementById('sideCargoStatus');
      if (sCargo) {
        if (this.missionSystem.transportCargo) {
          sCargo.innerHTML = `${ICONS.package(11)} <span>Membawa Sampel</span>`;
          sCargo.style.color = '#00e5ff';
        } else {
          sCargo.textContent = 'Kosong';
          sCargo.style.color = '#64748b';
        }
      }
    }
  }
}
