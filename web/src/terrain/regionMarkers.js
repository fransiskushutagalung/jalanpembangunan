import * as THREE from 'three';
import { OLYMPUS_REGIONS } from './olympusMonsTerrain.js';

/** Forces all sprites inside a group to always render on top of terrain. */
function forceSpritesOnTop(group, renderOrder = 999) {
  group.traverse(obj => {
    if (obj.isSprite) {
      obj.renderOrder = renderOrder;
      if (obj.material) {
        obj.material.depthTest = false;
        obj.material.depthWrite = false;
      }
    }
  });
}

/**
 * RegionMarkers — 6 wilayah geologi dengan relief 3D prosedural yang MENEMPEL pada terrain.
 *
 * Tiap wilayah = satu "patch" mesh yang mengikuti heightfield asli lalu diberi relief
 * (kawah, cekungan, pematang, gunung api + lautan lava) dan shader material khusus.
 * Tepi patch memudar halus ke terrain asli, jadi tidak terlihat seperti objek tempelan.
 *
 * Penggunaan:
 *   const terrain = new TerrainRenderer(scene, hf, frame, texture);
 *   const regions = new RegionMarkers(scene, hf, frame, { terrain });
 *   // di animation loop: regions.update(roverProjX, roverProjY);
 */

/* ------------------------------------------------------------------ */
/*  Noise & util (CPU)                                                 */
/* ------------------------------------------------------------------ */
const TAU = Math.PI * 2;
const hash2 = (x, y, s) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
};
const vnoise = (x, y, s) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x, y, s, oct = 4) => {
  let a = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) { sum += a * vnoise(x * f, y * f, s + i * 17); norm += a; a *= 0.5; f *= 2.03; }
  return sum / norm;
};
const ridged = (x, y, s, oct = 3) => 1 - Math.abs(2 * fbm(x, y, s, oct) - 1);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const gauss = (x, w) => Math.exp(-(x / w) * (x / w));
const rng = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* ------------------------------------------------------------------ */
/*  Profil relief tiap jenis wilayah. Satuan: meter.                   */
/*  (dx, dy) = offset dari pusat patch, d = jarak ternormalisasi 0..1  */
/* ------------------------------------------------------------------ */
function craterProfile(x, y, r, depth, seed) {
  const d = Math.hypot(x, y) / r;
  if (d > 2.6) return 0;
  const dd = d * (1 + 0.10 * (fbm((x / r) * 2.5, (y / r) * 2.5, seed) - 0.5));
  const floor = -depth * (1 - sstep(0.4, 1.0, dd));                 // lantai datar -> dinding curam
  const rim = depth * 0.38 * gauss(dd - 1.0, 0.15);                  // bibir kawah
  const ejecta = depth * 0.16 * Math.exp(-Math.max(dd - 1.0, 0) * 2.4) * sstep(1.0, 1.12, dd); // selimut ejecta
  return floor + rim + ejecta;
}

const builders = {
  // Acidalia: kawah besar + bekas aliran sungai purba (alur berkelok)
  crater(R, seed) {
    const r = R * 0.34, depth = R * 0.07, cx = R * 0.10, cy = -R * 0.05;
    return (dx, dy, d, o) => {
      let h = craterProfile(dx - cx, dy - cy, r, depth, seed);
      const mid = -R * 0.58 + 0.12 * R * Math.sin(dy / (R * 0.22) + seed) + 40 * (fbm(dy / 300, 0.5, seed + 3) - 0.5);
      const lat = dx - mid;
      h += (-16 * gauss(lat, 45) + 4 * gauss(Math.abs(lat) - 75, 25)) * (1 - sstep(0.7, 1.0, d));
      h += 6 * (fbm(dx / 380, dy / 380, seed + 5) - 0.5) + 1.6 * fbm(dx / 40, dy / 40, seed + 7);
      o.h = h; o.heat = 0;
    };
  },

  // Arabia Terra: dataran tinggi tua dipenuhi banyak kawah berbagai ukuran
  craters(R, seed) {
    const rnd = rng(seed), list = [];
    for (let i = 0; i < 11; i++) {
      const a = rnd() * TAU, rr = Math.sqrt(rnd()) * R * 0.72;
      const r = 70 + Math.pow(rnd(), 2.2) * R * 0.26;
      list.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, r, depth: r * (0.12 + rnd() * 0.10), seed: seed + i * 13 });
    }
    return (dx, dy, d, o) => {
      let h = 0;
      for (const c of list) h += craterProfile(dx - c.x, dy - c.y, c.r, c.depth, c.seed);
      h += 9 * (fbm(dx / 160, dy / 160, seed + 1) - 0.5) + 3 * (ridged(dx / 48, dy / 48, seed + 2) - 0.5);
      o.h = h; o.heat = 0;
    };
  },

  // Isidis: cekungan tumbukan raksasa (lantai, cincin dalam, puncak tengah, bibir, ejecta)
  basin(R, seed) {
    const D = R * 0.034;
    return (dx, dy, d, o) => {
      const w = d * (1 + 0.05 * (fbm((dx / R) * 2, (dy / R) * 2, seed) - 0.5));
      let h = -D * (1 - sstep(0.05, 0.80, w));
      h += D * 0.55 * gauss(w - 0.84, 0.07);
      h += D * 0.22 * gauss(w - 0.36, 0.05);
      h += D * 0.50 * gauss(w, 0.06);
      h += D * 0.14 * Math.exp(-Math.max(w - 0.84, 0) * 6) * sstep(0.84, 0.92, w) * (0.4 + fbm(dx / 50, dy / 50, seed + 2));
      h += 5 * (fbm(dx / 110, dy / 110, seed + 3) - 0.5) + 1.5 * fbm(dx / 18, dy / 18, seed + 4);
      o.h = h; o.heat = 0;
    };
  },

  // Syrtis / Elysium: gunung api perisai + kaldera berisi danau lava + sungai lava + LAUTAN lava di sekelilingnya
  volcano(R, seed, { H, seaHeat, flows }) {
    const rnd = rng(seed);
    const flowAng = Array.from({ length: flows }, (_, i) => (i / flows) * TAU + (rnd() - 0.5) * 0.5);
    return (dx, dy, d, o) => {
      const r = d * R;
      const cone = H * Math.pow(Math.max(0, 1 - d / 0.6), 1.8);          // profil perisai (cekung)
      let h = cone - Math.max(cone - H * 0.6, 0) * (1 - sstep(0.035, 0.085, d)); // kaldera
      h += H * 0.03 * gauss(d - 0.085, 0.02);                              // bibir kaldera

      const ang = Math.atan2(dy, dx);
      let heat = 0.08, flowH = 0;
      const along = sstep(0.09, 0.17, d) * (1 - sstep(0.72, 0.98, d));
      for (let i = 0; i < flows; i++) {
        let da = ang - (flowAng[i] + (fbm(d * 3.0, i * 1.7, seed) - 0.5) * 0.8);
        da = Math.atan2(Math.sin(da), Math.cos(da));
        const g = gauss(da * r, 50 + 150 * d);                              // makin lebar ke arah bawah
        flowH += 10 * g * along;
        heat = Math.max(heat, g * along * (0.7 + 0.3 * fbm(dx / 90, dy / 90, seed + 9)));
      }
      h += flowH;

      const sea = seaHeat * sstep(0.12, 0.5, d) * (1 - sstep(0.8, 1.0, d)) * (0.4 + fbm(dx / 260, dy / 260, seed + 4));
      heat = Math.max(heat, sea, 1 - sstep(0.04, 0.075, d));               // lautan lava + danau kaldera
      // kerutan permukaan lava (pahoehoe)
      h += (7 * (fbm(dx / 130, dy / 130, seed + 1) - 0.5) + 3 * (ridged(dx / 34, dy / 34, seed + 2) - 0.5)) * (0.35 + 0.65 * sstep(0.05, 0.3, d));
      o.h = h; o.heat = Math.min(heat, 1);
    };
  },

  // Hesperia: pematang (wrinkle ridges) sejajar, asimetris, dengan krenulasi di puncak
  ridges(R, seed) {
    const a = 0.35, ca = Math.cos(a), sa = Math.sin(a), n = 5, rnd = rng(seed);
    const hts = Array.from({ length: n }, () => 30 + rnd() * 22);
    const gap = R * 0.17;
    return (dx, dy, d, o) => {
      const u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      let h = 0;
      for (let i = 0; i < n; i++) {
        const ui = (i - (n - 1) / 2) * gap + 55 * Math.sin(v / 210 + i * 1.9) + 40 * (fbm(v / 260, i * 3.1, seed) - 0.5);
        const s = u - ui, w = s < 0 ? 75 : 150;
        h += hts[i] * (0.55 + 0.45 * fbm(v / 300 + i * 5, 1.5, seed + 2)) * gauss(s, w);
        h += 3.2 * ridged(v / 40, s / 40 + i, seed + 6) * gauss(s, w * 0.8);
      }
      h += 7 * (fbm(dx / 300, dy / 300, seed + 8) - 0.5) + 1.8 * fbm(dx / 36, dy / 36, seed + 9);
      o.h = h; o.heat = 0;
    };
  },
};
builders.volcano_large = builders.volcano;

const KIND = { crater: 0, craters: 1, basin: 2, volcano: 3, volcano_large: 3, ridges: 4 };

// 6 wilayah (nama, deskripsi, warna, dan offset sama seperti sebelumnya)
const REGIONS = [
  { id: 'acidalia', name: 'Acidalia Planitia', desc: 'Dataran rendah utara — endapan sedimen & jejak air purba',
    color: 0x4fc3f7, offsetX: -8000, offsetY: 6000, feature: 'crater', radius: 1500, beaconH: 450, seed: 11 },
  { id: 'arabia', name: 'Arabia Terra', desc: 'Dataran tinggi tua — kawah tumbukan & erosi permukaan',
    color: 0xffb74d, offsetX: 6000, offsetY: 8000, feature: 'craters', radius: 1700, beaconH: 450, seed: 23 },
  { id: 'isidis', name: 'Isidis Planitia', desc: 'Cekungan tumbukan raksasa — material ejecta asteroid',
    color: 0xef5350, offsetX: 10000, offsetY: -2000, feature: 'basin', radius: 2300, beaconH: 480, seed: 37 },
  { id: 'syrtis', name: 'Syrtis Major Planum', desc: 'Perisai vulkanik — jejak aliran lava basaltik',
    color: 0xab47bc, offsetX: -6000, offsetY: -7000, feature: 'volcano', radius: 2000, beaconH: 520, seed: 41,
    params: { H: 230, seaHeat: 0.28, flows: 5 } },
  { id: 'elysium', name: 'Elysium', desc: 'Provinsi vulkanik — dataran lava & gunung api raksasa',
    color: 0xff7043, offsetX: -12000, offsetY: -1000, feature: 'volcano_large', radius: 2800, beaconH: 680, seed: 53,
    params: { H: 480, seaHeat: 0.46, flows: 8 } },
  { id: 'hesperia', name: 'Hesperia Planum', desc: 'Dataran berpematang — transisi geologi Hesperian',
    color: 0x66bb6a, offsetX: 3000, offsetY: -10000, feature: 'ridges', radius: 1800, beaconH: 420, seed: 67 },
];

/* ------------------------------------------------------------------ */
/*  GLSL material patch                                                */
/* ------------------------------------------------------------------ */
const PATCH_COMMON = /* glsl */`
uniform float uKind;
uniform float uTime;
uniform vec3  uTint;
uniform float uTintOn;
varying vec2  vLocal;
varying float vFade;
varying float vHeat;
varying float vRelief;
varying vec3  vWN;

float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  vec2 i0 = mod(i, 256.0); vec2 i1 = mod(i + 1.0, 256.0);
  float a = h21(i0), b = h21(vec2(i1.x, i0.y)), c = h21(vec2(i0.x, i1.y)), d = h21(i1);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return s;
}
vec2 vor(vec2 x){
  vec2 n = floor(x), f = fract(x);
  float F1 = 8.0, F2 = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 cell = mod(n + g, 256.0);
    vec2 o = vec2(h21(cell), h21(cell + vec2(41.7, 17.3)));
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < F1) { F2 = F1; F1 = d; } else if (d < F2) { F2 = d; }
  }
  return sqrt(vec2(F1, F2));
}
vec3 dustPalette(float l, float steep, float n){
  vec3 rock = pow(vec3(0.30, 0.20, 0.15), vec3(2.2));
  vec3 dust = pow(vec3(0.80, 0.47, 0.28), vec3(2.2));
  vec3 sand = pow(vec3(0.92, 0.66, 0.45), vec3(2.2));
  vec3 c = mix(rock, dust, smoothstep(0.12, 0.55, l));
  c = mix(c, sand, smoothstep(0.55, 0.95, l));
  float rm = smoothstep(0.10, 0.45, steep * 2.5 + (n - 0.5) * 0.4);
  return mix(c, rock * 0.9, rm * 0.7);
}
vec3 hot(float t){
  vec3 a = vec3(0.55, 0.04, 0.0), b = vec3(1.0, 0.32, 0.02), c = vec3(1.0, 0.78, 0.30);
  return mix(mix(a, b, smoothstep(0.0, 0.55, t)), c, smoothstep(0.6, 1.0, t));
}
`;

const PATCH_COLOR = /* glsl */`
vec3 lavaEmit = vec3(0.0);
{
  vec2 P = vLocal;
  float n1 = fbm(P / 160.0);
  float n2 = fbm(P / 26.0);
  float n3 = fbm(P / 5.0);
  float steep = 1.0 - clamp(vWN.y, 0.0, 1.0);

  if (uKind < 2.5 || uKind > 3.5) {
    // ---- tanah / batuan (memakai citra asli bila tersedia) ----
    #ifdef USE_MAP
      float lum = pow(clamp(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)), 0.0, 1.0), 0.4545);
      vec3 c = uTintOn > 0.5 ? dustPalette(clamp(lum * 1.25, 0.0, 1.0), steep, n1) : diffuseColor.rgb;
    #else
      vec3 c = dustPalette(0.5 + (n1 - 0.5) * 0.5, steep, n1);
    #endif
    c *= 1.0 + (n2 - 0.5) * 0.35 + (n3 - 0.5) * 0.25;
    c = mix(c, c * uTint * 1.8, 0.16);                                   // semburat warna wilayah
    if (uKind < 0.5) c *= 1.0 + 0.10 * sin(vRelief * 0.45 + n1 * 7.0);  // lapisan sedimen
    diffuseColor.rgb = c;
  } else {
    // ---- lautan lava: kerak basal gelap + retakan menyala ----
    vec2 W = P + 25.0 * vec2(fbm(P / 90.0), fbm(P / 90.0 + 7.3));
    vec2 v1 = vor(W / 70.0);
    vec2 v2 = vor(W / 16.0);
    float heat = vHeat;
    float w1 = mix(0.05, 0.22, heat);
    float crack = max(1.0 - smoothstep(0.0, w1, v1.y - v1.x),
                      (1.0 - smoothstep(0.0, w1 * 0.8, v2.y - v2.x)) * 0.55);

    vec3 crust = mix(vec3(0.012, 0.010, 0.010), vec3(0.055, 0.040, 0.034), n2);
    crust += vec3(0.05, 0.022, 0.010) * smoothstep(0.62, 0.85, n3) * (1.0 - heat);

    float molten = smoothstep(0.80, 0.97, heat);                          // danau kaldera & sungai lava
    float plate = smoothstep(0.42, 0.58, fbm(W / 48.0 + vec2(uTime * 0.012, 0.0)));
    float cover = mix(1.0, plate, molten);                                // lempeng kerak mengambang
    float pulse = 0.85 + 0.25 * sin(uTime * 0.7 + n1 * 12.0 + v1.x * 6.0);

    vec3 emit = hot(clamp(0.35 + heat * 0.65, 0.0, 1.0)) * crack * (0.10 + 2.4 * heat * heat) * pulse;
    emit += hot(0.6 + 0.4 * n2) * molten * (1.0 - cover) * (1.1 + 0.4 * sin(uTime * 0.5 + n1 * 9.0)) * 3.0;

    diffuseColor.rgb = crust;
    lavaEmit = emit;
  }
  diffuseColor.a *= vFade;
  lavaEmit *= vFade;
}
`;

/* ------------------------------------------------------------------ */
export class RegionMarkers {
  /**
   * @param {THREE.Scene} scene
   * @param {import('./heightfield.js').Heightfield} hf
   * @param {import('../geo/coords.js').GeoFrame} frame
   * @param {{terrain?: import('./terrainRenderer.js').TerrainRenderer, texture?: THREE.Texture,
   *          lift?: number, cells?: number}} [options]
   *   terrain : (disarankan) berbagi citra & toggle tint dengan TerrainRenderer
   *   lift    : tinggi patch di atas terrain, meter (default 2.5) — naikkan bila ada bagian patch tertutup mesh terrain
   *   cells   : resolusi patch per sisi (default 192)
   */
  constructor(scene, hf, frame, options = {}) {
    this.scene = scene;
    this.hf = hf;
    this.frame = frame;
    this.texture = options.texture ?? options.terrain?.texture ?? null;
    this.tintOn = options.terrain?.uniforms?.uTint ?? { value: 1 };
    this.lift = options.lift ?? 2.5;
    this.cells = options.cells ?? 192;
    this.markers = [];
    this.olympusMarkers = [];
    this.activeMapId = 'usgs-i-1802-a';
    this.proximityRadius = 3200;
    this.activePopup = null;
    this.uTime = { value: 0 };
    this._glowTex = null;

    this.#createPopupDOM();
    this.#buildMarkers();
    this.#buildOlympusMarkers();
  }

  setMapMode(mapId) {
    this.activeMapId = mapId;
    this.setVisible(!this._disabled);
  }

  #createPopupDOM() {
    this.popupEl = document.createElement('div');
    this.popupEl.id = 'regionPopup';
    this.popupEl.className = 'region-popup';
    this.popupEl.style.display = 'none';
    document.body.appendChild(this.popupEl);
  }

  /** Posisi permukaan terrain (relatif terhadap pusat patch) pada offset (dx,dy). */
  #ground(cx, cy, cw, dx, dy, p) {
    const hf = this.hf;
    const X = Math.min(hf.maxX - 1, Math.max(hf.minX + 1, cx + dx));
    const Y = Math.min(hf.maxY - 1, Math.max(hf.minY + 1, cy + dy));
    this.frame.toWorld(X, Y, hf.sample(X, Y), p);
    p.x -= cw.x; p.y -= cw.y; p.z -= cw.z;
  }

  #buildMarkers() {
    this.patchData = [];
    const hf = this.hf;
    const centerX = hf.left + (hf.cols * hf.cell) / 2;
    const centerY = hf.top - (hf.rows * hf.cell) / 2;

    for (const region of REGIONS) {
      const margin = Math.min(region.radius + 100, (hf.maxX - hf.minX) / 2 - 1, (hf.maxY - hf.minY) / 2 - 1);
      const cx = Math.max(hf.minX + margin, Math.min(hf.maxX - margin, centerX + region.offsetX));
      const cy = Math.max(hf.minY + margin, Math.min(hf.maxY - margin, centerY + region.offsetY));

      const cw = { x: 0, y: 0, z: 0 };
      this.frame.toWorld(cx, cy, hf.sample(cx, cy), cw);

      const group = new THREE.Group();
      group.position.set(cw.x, cw.y, cw.z);

      const patch = this.#buildPatch(region, cx, cy, cw);
      group.add(patch.mesh);

      // Simpan data patch untuk query elevasi & deteksi kontur tabrakan rover
      this.patchData.push({
        cx,
        cy,
        radius: region.radius,
        relief: builders[region.feature](region.radius, region.seed, region.params),
      });

      const beam = this.#addBeacon(group, region.color, patch.centerY, patch.centerY + region.beaconH);
      this.#addLabel(group, region.name, region.color, patch.centerY + region.beaconH + 130);
      this.#addZoneRing(group, region, cx, cy, cw);

      let light = null;
      if (KIND[region.feature] === 3) light = this.#addLavaGlow(group, region, patch.centerY);

      forceSpritesOnTop(group);
      this.scene.add(group);
      this.markers.push({
        id: region.id, name: region.name, desc: region.desc, color: region.color,
        projX: cx, projY: cy, group, beam, light, phase: Math.random() * TAU,
      });
    }
  }

  #buildOlympusMarkers() {
    this.olympusMarkers = [];
    const hf = this.hf;
    const centerX = hf.left + (hf.cols * hf.cell) / 2;
    const centerY = hf.top - (hf.rows * hf.cell) / 2;

    for (const region of OLYMPUS_REGIONS) {
      const cx = centerX + region.ox;
      const cy = centerY + region.oy;
      const cw = { x: 0, y: 0, z: 0 };
      this.frame.toWorld(cx, cy, hf.sample(cx, cy), cw);

      const group = new THREE.Group();
      group.position.set(cw.x, cw.y, cw.z);

      const beam = this.#addBeacon(group, region.color, 0, region.beaconH);
      this.#addLabel(group, region.name, region.color, region.beaconH + 130);
      this.#addZoneRing(group, region, cx, cy, cw);

      group.visible = (this.activeMapId === 'usgs-sim-3470');
      this.scene.add(group);

      this.olympusMarkers.push({
        id: region.id,
        name: region.title,
        desc: region.desc,
        color: region.color,
        projX: cx,
        projY: cy,
        group,
        beam,
        phase: Math.random() * TAU,
      });
    }
  }

  setVisible(visible) {
    this._disabled = !visible;
    const isOlympus = (this.activeMapId === 'usgs-sim-3470');
    for (const m of this.markers) {
      if (m.group) m.group.visible = visible && !isOlympus;
    }
    for (const om of this.olympusMarkers) {
      if (om.group) om.group.visible = visible && isOlympus;
    }
    if (this.popupEl) this.popupEl.style.display = 'none';
  }

  /**
   * Mengembalikan elevasi tambahan (meter) dari relief wilayah prosedural pada koordinat projected (X, Y).
   * Digunakan oleh RoverPhysics agar robot dapat memanjat gunung api, kawah, dan bukit tanpa tenggelam.
   */
  getReliefAt(X, Y) {
    if (this._disabled || !this.patchData) return 0;
    let extra = 0;
    const o = { h: 0, heat: 0 };
    for (let i = 0; i < this.patchData.length; i++) {
      const p = this.patchData[i];
      const dx = X - p.cx;
      const dy = Y - p.cy;
      const dist = Math.hypot(dx, dy);
      const d = dist / p.radius;
      if (d < 1.0) {
        p.relief(dx, dy, d, o);
        const edge = 1 - sstep(0.70, 0.98, d);
        extra += o.h * edge + this.lift;
      }
    }
    return extra;
  }

  #buildPatch(region, cx, cy, cw) {
    const N = this.cells, n1 = N + 1, R = region.radius, step = (2 * R) / N;
    const relief = builders[region.feature](R, region.seed, region.params);
    const ext = this.hf.meta?.extent;
    const useUV = !!(this.texture && ext);

    const count = n1 * n1;
    const pos = new Float32Array(count * 3), loc = new Float32Array(count * 2);
    const fade = new Float32Array(count), heat = new Float32Array(count), rel = new Float32Array(count);
    const uv = useUV ? new Float32Array(count * 2) : null;
    const p = { x: 0, y: 0, z: 0 }, o = { h: 0, heat: 0 };

    for (let j = 0; j < n1; j++) for (let i = 0; i < n1; i++) {
      const k = j * n1 + i, dx = -R + i * step, dy = -R + j * step, d = Math.hypot(dx, dy) / R;
      this.#ground(cx, cy, cw, dx, dy, p);
      if (d < 1.2) relief(dx, dy, d, o); else { o.h = 0; o.heat = 0; }
      const edge = 1 - sstep(0.70, 0.98, d);            // relief menyatu dengan terrain di tepi
      pos[k * 3] = p.x; pos[k * 3 + 1] = p.y + this.lift + o.h * edge; pos[k * 3 + 2] = p.z;
      loc[k * 2] = dx; loc[k * 2 + 1] = dy;
      fade[k] = 1 - sstep(0.80, 1.0, d);                // alpha memudar ke terrain asli
      heat[k] = o.heat; rel[k] = o.h * edge;
      if (uv) {
        uv[k * 2] = (cx + dx - ext.left) / ext.width;
        uv[k * 2 + 1] = 1 - (ext.top - (cy + dy)) / ext.height;
      }
    }

    // grid: i = timur, j = utara
    const idx = new Uint32Array(N * N * 6); let q = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = j * n1 + i, b = a + 1, c = a + n1, d = c + 1;
      idx[q++] = a; idx[q++] = b; idx[q++] = c; idx[q++] = b; idx[q++] = d; idx[q++] = c;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aLocal', new THREE.BufferAttribute(loc, 2));
    g.setAttribute('aFade', new THREE.BufferAttribute(fade, 1));
    g.setAttribute('aHeat', new THREE.BufferAttribute(heat, 1));
    g.setAttribute('aRelief', new THREE.BufferAttribute(rel, 1));
    if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();

    // jaga-jaga: bila arah winding terbalik terhadap frame, balik otomatis
    const centerK = (N / 2) * n1 + N / 2;
    if (g.attributes.normal.getY(centerK) < 0) {
      for (let t = 0; t < idx.length; t += 3) { const tmp = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = tmp; }
      g.index.needsUpdate = true;
      g.computeVertexNormals();
    }

    const mat = this.#makeMaterial(region, useUV);
    const mesh = new THREE.Mesh(g, mat);
    mesh.receiveShadow = true;
    mesh.renderOrder = 1;
    return { mesh, centerY: pos[centerK * 3 + 1] };
  }

  #makeMaterial(region, useMap) {
    const mat = new THREE.MeshStandardMaterial({
      map: useMap ? this.texture : null,
      roughness: 1, metalness: 0,
      transparent: true, alphaTest: 0.02,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const c = new THREE.Color(region.color);
    const kind = KIND[region.feature];
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uKind = { value: kind };
      shader.uniforms.uTime = this.uTime;
      shader.uniforms.uTint = { value: new THREE.Vector3(c.r, c.g, c.b) };
      shader.uniforms.uTintOn = this.tintOn;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
attribute vec2 aLocal; attribute float aFade; attribute float aHeat; attribute float aRelief;
varying vec2 vLocal; varying float vFade; varying float vHeat; varying float vRelief; varying vec3 vWN;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
vLocal = aLocal; vFade = aFade; vHeat = aHeat; vRelief = aRelief;
vWN = normalize(mat3(modelMatrix) * objectNormal);`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + PATCH_COMMON)
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + PATCH_COLOR)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += lavaEmit;');
    };
    mat.customProgramCacheKey = () => 'region-patch-v1';
    return mat;
  }

  #addBeacon(group, color, baseY, topY) {
    const h = topY - baseY;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 9, h, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending,
        depthWrite: false, fog: false, side: THREE.DoubleSide,
      })
    );
    beam.position.y = baseY + h / 2;
    group.add(beam);

    const orb = new THREE.Mesh(new THREE.SphereGeometry(18, 14, 14), new THREE.MeshBasicMaterial({ color, fog: false }));
    orb.position.y = topY;
    group.add(orb);
    return beam;
  }

  #addLabel(group, name, color, y) {
    const w = 1024, h = 256;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    const hexColor = '#' + new THREE.Color(color).getHexString();

    const r = 24;
    ctx.fillStyle = 'rgba(7, 11, 18, 0.92)';
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r); ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h); ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.fill();
    ctx.strokeStyle = hexColor; ctx.lineWidth = 4; ctx.stroke();

    // Top tag
    ctx.fillStyle = hexColor;
    ctx.font = '700 34px "JetBrains Mono", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SEKTOR GEOLOGI MARS', w / 2, 58);

    // Main Region Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 74px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillText(name, w / 2, 128);

    // Subtitle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.font = '600 36px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillText('ZONA RISET ILMIAH & SURVEY', w / 2, 196);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false }));
    sprite.renderOrder = 999;
    sprite.scale.set(1100, 275, 1);
    sprite.position.y = y;
    group.add(sprite);
  }

  /** Cincin batas wilayah yang mengikuti kontur terrain (bukan lingkaran datar). */
  #addZoneRing(group, region, cx, cy, cw) {
    const seg = 256, r0 = region.radius * 0.955, r1 = region.radius * 0.975;
    const pos = new Float32Array((seg + 1) * 2 * 3), idx = [];
    const p = { x: 0, y: 0, z: 0 };
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      this.#ground(cx, cy, cw, ca * r0, sa * r0, p);
      pos.set([p.x, p.y + this.lift + 3, p.z], i * 6);
      this.#ground(cx, cy, cw, ca * r1, sa * r1, p);
      pos.set([p.x, p.y + this.lift + 3, p.z], i * 6 + 3);
      if (i < seg) { const a0 = i * 2; idx.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    const ring = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      color: region.color, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    }));
    group.add(ring);
  }

  /** Cahaya oranye + glow di atas kaldera. */
  #addLavaGlow(group, region, centerY) {
    if (!this._glowTex) {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d');
      const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,190,90,1)'); gr.addColorStop(0.3, 'rgba(255,100,20,0.55)'); gr.addColorStop(1, 'rgba(255,60,0,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
      this._glowTex = new THREE.CanvasTexture(c);
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this._glowTex, blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false, fog: false,
    }));
    glow.renderOrder = 998;
    glow.scale.setScalar(region.radius * 0.32);
    glow.position.y = centerY + 40;
    group.add(glow);

    // decay = 0 supaya hasilnya konsisten di semua versi three.js
    const light = new THREE.PointLight(0xff6a2a, 4, region.radius * 0.9, 0);
    light.position.y = centerY + 120;
    group.add(light);
    return light;
  }

  /**
   * Dipanggil setiap frame dari main.js animation loop.
   * @param {number} roverProjX — posisi projected X robot aktif
   * @param {number} roverProjY — posisi projected Y robot aktif
   */
  update(roverProjX, roverProjY) {
    if (this._disabled) {
      if (this.popupEl) this.popupEl.style.display = 'none';
      return;
    }
    const t = performance.now() / 1000;
    this.uTime.value = t;

    const activeList = (this.activeMapId === 'usgs-sim-3470') ? this.olympusMarkers : this.markers;
    let closest = null, closestDist = Infinity;
    for (const m of activeList) {
      const dist = Math.hypot(roverProjX - m.projX, roverProjY - m.projY);
      m.beam.material.opacity = 0.28 + 0.08 * Math.sin(t * 1.5 + m.phase);
      if (m.light) m.light.intensity = 3.6 + 0.7 * Math.sin(t * 2.1 + m.phase) + 0.4 * Math.sin(t * 5.3 + m.phase * 2);
      if (dist < this.proximityRadius && dist < closestDist) { closest = m; closestDist = dist; }
    }

    if (closest && closest.id !== this.activePopup) {
      this.activePopup = closest.id;
      this.#showPopup(closest);
    } else if (!closest && this.activePopup) {
      this.activePopup = null;
      this.#hidePopup();
    }
  }

  getCurrentRegionId() {
    return this.activePopup;
  }

  #showPopup(marker) {
    const hexColor = '#' + new THREE.Color(marker.color).getHexString();
    this.popupEl.innerHTML = `
      <div class="popup-dot" style="background:${hexColor}"></div>
      <div class="popup-text">
        <div class="popup-name" style="color:${hexColor}">${marker.name}</div>
        <div class="popup-desc">${marker.desc}</div>
      </div>
    `;
    this.popupEl.style.borderColor = hexColor;
    this.popupEl.style.display = 'flex';
  }

  #hidePopup() { this.popupEl.style.display = 'none'; }

  dispose() {
    for (const m of this.markers) {
      this.scene.remove(m.group);
      m.group.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) { o.material.map?.dispose?.(); o.material.dispose(); }
      });
    }
    this.markers.length = 0;
    this._glowTex?.dispose();
    this.popupEl.remove();
  }
}
