import * as THREE from 'three';
import { CONFIG } from './config.js';
import { loadDataset } from './data/loader.js';
import { Heightfield } from './terrain/heightfield.js';
import { GeoFrame } from './geo/coords.js';
import { TerrainRenderer } from './terrain/terrainRenderer.js';
import { pickTerrain } from './terrain/picking.js';
import { RoverSwarm } from './rover/roverSwarm.js';
import { RoverInput } from './rover/roverInput.js';
import { CameraRig } from './camera/cameraRig.js';
import { Hud } from './ui/hud.js';
import { MapPortal } from './ui/mapPortal.js';
import { RegionMarkers } from './terrain/regionMarkers.js';
import { MissionSystem } from './mission/missionSystem.js';
import { VisualPerceptionSystem } from './mission/visualPerception.js';
import { VisualPerceptionPanel } from './ui/visualPerceptionPanel.js';
import { HistoryTracker } from './rover/historyTracker.js';
import { LabBackpackWorkbench } from './ui/labBackpack.js';
import { Minimap } from './ui/minimap.js';
import { MarsGlobe3D } from './marsGlobe.js';
import { DashboardController } from './ui/dashboardController.js';
import { Tutorial } from './ui/tutorial.js';
import { RoverCutscene } from './ui/roverCutscene.js';
import { getOlympusMonsCalderaHeights } from './terrain/olympusMonsTerrain.js';
import { JezeroCraterExploration } from './terrain/jezeroCraterExploration.js';

let frame, hf, terrain, rig, swarm, sun, input, marker, meta, mapPortal, regionMarkers, missionSystem, jezeroExploration;
let vpms, vpPanel, historyTracker, labBackpack, minimap;
let marsGlobe, dashboardController;
let tutorial, cutscene;
let originalHeights = null;
let currentSimMapId = 'usgs-i-1802-a';
let pendingSimMap = null;

// Helper to safely display toast notification
function safeToast(msg) {
  if (hud && typeof hud.showToast === 'function') {
    hud.showToast(msg);
  } else {
    console.log('[Toast]', msg);
  }
}

try {
  marsGlobe = new MarsGlobe3D('marsGlobeCanvasContainer', {
    onHotspotClick: (hs) => {
      if (dashboardController) {
        dashboardController.selectMap(hs.id);
      }
      safeToast(`📍 Selected ${hs.name} (${hs.code})`);
    },
  });
  window.marsGlobe = marsGlobe;
} catch (err) {
  console.error('[MarsGlobe3D] Failed to initialize:', err);
}

// 2. Initialize Dashboard Controller (Independent try-catch so launch button ALWAYS works!)
try {
  dashboardController = new DashboardController({
    marsGlobe: window.marsGlobe,
    onLaunchSimulation: (mapData) => {
      // Dashboard fade-out is handled by DashboardController.hide()
      // Hud & simulator panels below appear after the fade-out delay
      setTimeout(() => {
        // Display all simulator panels
        const simPanels = ['topControlBar', 'simSettingsModal', 'robotDetailPanel', 'help'];
        simPanels.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.style.display = '';
        });
        switchSimulationTerrain(mapData);
        if (tutorial) tutorial.showPrompt();
      }, 500);
    },
    onToast: (msg) => safeToast(msg),
  });
  window.dashboardController = dashboardController;
} catch (err) {
  console.error('[DashboardController] Failed to initialize:', err);
}

function switchSimulationTerrain(mapData) {
  const mapId = typeof mapData === 'string' ? mapData : mapData.id;
  currentSimMapId = mapId;

  if (!hf || !terrain) {
    pendingSimMap = mapData;
    console.log('[MarsDashboard] Simulation terrain not ready yet, queued launch for:', mapId);
    return;
  }

  if (mapId === 'usgs-sim-3470') {
    // 1. Build and apply real Olympus Mons Caldera DEM heights
    const olympusHeights = getOlympusMonsCalderaHeights(meta);
    hf.data = olympusHeights;
    terrain.build(CONFIG.meshStride);

    // 2. Spawn rovers on the flat basaltic caldera floor (+18,100 m) near center
    const centerX = (meta.extent.left + meta.extent.right) * 0.5;
    const centerY = (meta.extent.bottom + meta.extent.top) * 0.5;
    if (swarm) {
      swarm.spawnAt(centerX, centerY, 0);
      const active = swarm.getActiveRover();
      if (rig && active) {
        rig.setMode('follow');
        const w = frame.toWorld(active.physics.X, active.physics.Y, active.physics.elevation);
        rig.placeBehind(new THREE.Vector3(w.x, w.y, w.z), active.physics.heading);
      }
    }

    // Keep only markers relevant to the selected map.
    if (regionMarkers) {
      regionMarkers.setMapMode('usgs-sim-3470');
    }
    if (missionSystem && typeof missionSystem.setMapMode === 'function') {
      missionSystem.setMapMode('usgs-sim-3470');
    }
    safeToast('🌋 Landed at Olympus Mons Caldera (USGS SIM 3470, Summit Elevation +18,100 m)');
    if (jezeroExploration) {
      jezeroExploration.setVisible(false);
    }
  } else if (mapId === 'usgs-sim-3464') {
    if (originalHeights) {
      hf.data = originalHeights;
      terrain.build(CONFIG.meshStride);
    }
    startRovers();
    if (regionMarkers) {
      regionMarkers.setVisible(false);
    }
    if (jezeroExploration) {
      jezeroExploration.setVisible(true);
    }
    safeToast('🛸 Landed at Jezero Crater (USGS SIM 3464 — 6 Geological Zones Active)');
  } else {
    // 1. Restore original Valles Marineris / Jezero heights
    if (originalHeights) {
      hf.data = originalHeights;
      terrain.build(CONFIG.meshStride);
    }

    // 2. Spawn rovers at default start coordinates
    startRovers();

    // 3. Enable regional markers
    if (regionMarkers) {
      regionMarkers.setMapMode('usgs-i-1802-a');
    }
    if (missionSystem && typeof missionSystem.setMapMode === 'function') {
      missionSystem.setMapMode('usgs-i-1802-a');
    }
    safeToast('🚀 Landed at Valles Marineris & Tharsis (USGS I-1802A)');
    if (jezeroExploration) {
      jezeroExploration.setVisible(false);
    }
  }
}

const hud = new Hud({
  onExaggeration: v => {
    frame.setExaggeration(v);
    terrain.build();
    if (jezeroExploration) jezeroExploration.rebuildHeights();
  },
  onStride: v => hud.setMeshInfo(terrain.build(v)),
  onSlope: on => terrain.setSlopeMode(on),
  onTint: on => terrain.setTint(on),
  onRoverScale: v => swarm.setVisualScale(v),
  onSun: () => updateSun(),
  onCamera: m => rig.setMode(m),
  onReset: () => startRovers(),
  onSelectRover: idx => selectRover(idx),
  onSwarmMode: mode => swarm.setSwarmMode(mode),
  onTriggerTask: () => triggerMainTask(),
  onSecondaryAction: () => triggerSecondaryTask(),
  onOpenMapPortal: () => {
    if (dashboardController) {
      // Sembunyikan panel simulator dulu, lalu buka dashboard
      const simPanels = ['topControlBar', 'simSettingsModal', 'robotDetailPanel', 'help'];
      simPanels.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
      dashboardController.show();
      if (marsGlobe) marsGlobe.resize();
    } else if (mapPortal) {
      mapPortal.show();
    }
  },
  onToggleHistory: (visible) => {
    if (historyTracker) historyTracker.setShowHistory(visible);
  },
  onOpenBackpack: () => {
    if (labBackpack) {
      labBackpack.toggle();
    } else {
      hud.showToast('Laboratorium sedang menyiapkan Meja Riset...');
    }
  },
});

function selectRover(idx) {
  if (!swarm) return;
  const rover = swarm.setActiveRover(idx);
  hud.updateRoverSelection(idx, rover);
  if (rig && rig.mode === 'follow') {
    rig.controls.target.copy(rover.mesh.position);
  }
  if (missionSystem) {
    hud.updateWorkflow(missionSystem, rover);
  }
  if (vpms) vpms._activeIdx = idx;
}

function triggerMainTask() {
  if (!swarm || !missionSystem) return;
  const active = swarm.getActiveRover();

  if (active.role === 'surface-mapping') {
    // 1. Mapper menandai waypoint sampel geologi di posisinya
    const regId = regionMarkers ? regionMarkers.getCurrentRegionId() : null;
    missionSystem.markSampleWaypoint(active.physics, regId);
    if (jezeroExploration) {
      jezeroExploration.onAresMarkSample(active.physics);
    }
  } else if (active.role === 'geological-investigation') {
    // 2. GeoLab: Bangun lab sains jika belum ada, atau jalankan penelitian di Lab
    if (!missionSystem.labStation) {
      missionSystem.buildScienceLab(active.physics);
    } else {
      swarm.triggerActiveTask();
      if (jezeroExploration && jezeroExploration.onGeoLabResearch()) {
        // Popup penemuan ilmiah Jezero otomatis muncul!
      } else {
        hud.showToast(`[GeoLab] Laser Raman & Pengeboran aktif pada singkapan batuan!`);
      }if (vpms) {
        vpms.captureOnTaskComplete({
          taskId: `DRILL-LASER-${Date.now()}`,
          roverId: '02',
          roverName: 'Curiosity GeoLab',
          roverRole: 'geological-investigation',
          description: `Pengeboran Inti & Spektrometri Laser Raman Singkapan Batuan Mars`,
          regionId: 'rock-core',
          regionName: 'Field Outcrop Matrix',
          roverPhysics: { ...active.physics },
          mineral: 'Basaltik Martis Silikat & Logam Magnetik',
          analysisResult: 'Pola reflektansi laser terdeteksi: 62% Basalt, 24% Piroksen, 14% Olivin.',
        });
      }
    }
  } else if (active.role === 'transport-support') {
    // 3. Hermes Transport: Jika ada kargo -> antar ke lab, jika belum -> jemput ke waypoint
    if (missionSystem.transportCargo) {
      if (missionSystem.labStation) {
        missionSystem.transportState = 'carrying_to_lab';
        hud.showToast(`[Hermes Transport] Memulai rute pengantaran ke Stasiun Lab Sains...`);
      } else {
        hud.showToast(`[Perhatian] Bangun Stasiun Lab dahulu menggunakan Robot 02 (GeoLab)!`);
      }
    } else if (missionSystem.activeWaypoint) {
      missionSystem.callTransportToWaypoint();
    } else {
      swarm.triggerActiveTask();
    }
  }
  hud.updateWorkflow(missionSystem, active);
}

function triggerSecondaryTask() {
  if (!swarm || !missionSystem) return;
  const active = swarm.getActiveRover();

  if (active.role === 'surface-mapping') {
    // Mapper memanggil Hermes Transport menuju waypoint sampel
    missionSystem.callTransportToWaypoint();
  } else if (active.role === 'geological-investigation') {
    // GeoLab membangun Lab Sains
    missionSystem.buildScienceLab(active.physics);
  }
  hud.updateWorkflow(missionSystem, active);
}

async function main() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('app').appendChild(renderer.domElement);

  let data;
  try {
    data = await loadDataset(CONFIG.dataPath, renderer, hud.setLoading);
  } catch (e) {
    hud.showError('Could not load data/. Run preprocessing first and serve web/ over HTTP (see README). ' + e.message);
    throw e;
  }

  meta = data.meta;
  originalHeights = data.heights.slice();
  hf = new Heightfield(meta, data.heights);
  frame = new GeoFrame(meta, CONFIG.verticalExaggeration);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc8a37f);
  scene.fog = new THREE.FogExp2(0xc8a37f, 0.000006);
  scene.add(new THREE.HemisphereLight(0xffe2c8, 0x5a3a2a, 0.45));

  sun = new THREE.DirectionalLight(0xfff1e0, 2.6);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -1500, right: 1500, top: 1500, bottom: -1500, near: 1, far: 12000 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 3;
  scene.add(sun, sun.target);

  terrain = new TerrainRenderer(scene, hf, frame, data.texture);
  hud.setMeshInfo(terrain.build(CONFIG.meshStride));

  // Initialize the 3 specialized mission robots
  swarm = new RoverSwarm(scene, hf, frame, CONFIG.rover, CONFIG.roverVisualScale);
  swarm.onMissionLog = msg => hud.showToast(msg);

  // Initialize 6 geological region markers in the 3D world
  regionMarkers = new RegionMarkers(scene, hf, frame, { terrain });

  // Initialize Jezero Crater 6-Zone & 13-POI Exploration
  jezeroExploration = new JezeroCraterExploration(scene, hf, frame, {
    getRovers: () => (swarm ? swarm.rovers : []),
    getActiveRover: () => (swarm ? swarm.getActiveRover() : null),
    getMissionSystem: () => missionSystem,
    getLabBackpack: () => labBackpack,
    onToast: msg => hud.showToast(msg),
    onInspectComplete: () => {
      if (missionSystem && typeof missionSystem.sciencePoints === 'number') {
        missionSystem.sciencePoints += 150;
        if (missionSystem.onStateChange) missionSystem.onStateChange();
      }
    }
  });

  // Hubungkan elevasi wilayah prosedural ke swarm agar robot memanjat gunung api & kawah tanpa tenggelam
  swarm.setReliefSampler((X, Y) => regionMarkers.getReliefAt(X, Y));

  // Initialize Integrated Team Mission System
  missionSystem = new MissionSystem(scene, frame, hf, (X, Y) => regionMarkers.getReliefAt(X, Y));
  missionSystem.rovers = swarm.rovers;
  missionSystem.onNotify = msg => hud.showToast(msg);
  missionSystem.onStateChange = () => {
    hud.updateWorkflow(missionSystem, swarm.getActiveRover());
  };

  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 3, 600000);
  // Initialize tutorial (prompt shown later when user clicks Launch 3D Simulation)
  tutorial = new Tutorial();
  tutorial.setMissionSystem(missionSystem);

  // === Visual Perception & Mission Documentation System ===
  try {
    vpms = new VisualPerceptionSystem(
      renderer, scene, camera, frame, hf,
      (X, Y) => regionMarkers ? regionMarkers.getReliefAt(X, Y) : 0
    );
    vpms._rovers = swarm.rovers;
    vpms._activeIdx = 0;
    missionSystem.onTaskComplete = (taskMeta) => vpms.captureOnTaskComplete(taskMeta);
    vpPanel = new VisualPerceptionPanel(vpms);
    window.vpPanel = vpPanel;
    window.vpms = vpms;
  } catch (e) {
    console.warn('[VPMS] Visual Perception init failed (non-fatal):', e.message);
  }

  // === Lab Backpack & Interactive 3D Examination Workbench ===
  try {
    labBackpack = new LabBackpackWorkbench(missionSystem, vpms);
    window.labBackpack = labBackpack;
  } catch (e) {
    console.warn('[LabBackpack] Init failed:', e.message);
  }

  // === History Tracker ===
  try {
    historyTracker = new HistoryTracker(
      scene, frame,
      (X, Y) => {
        let e = hf.sample(X, Y);
        if (regionMarkers) e += regionMarkers.getReliefAt(X, Y);
        return e;
      }
    );
  } catch (e) {
    console.warn('[HistoryTracker] Init failed (non-fatal):', e.message);
  }

  marker = new THREE.Mesh(new THREE.ConeGeometry(25, 120, 12), new THREE.MeshBasicMaterial({ color: 0x00e0ff }));
  marker.visible = false;
  scene.add(marker);

  rig = new CameraRig(camera, renderer.domElement, hf, frame);
  // Initialize rover intro cutscene now that camera and rig are ready
  cutscene = new RoverCutscene({
    camera,
    rig,
    swarm,
    onComplete: () => tutorial._start(),
  });
  tutorial.onAccepted = () => cutscene.play();
  input = new RoverInput(
    () => rig.mode,
    () => dashboardController && dashboardController.isVisible
  );

  startRovers();
  updateSun();

  if (pendingSimMap) {
    const pMap = pendingSimMap;
    pendingSimMap = null;
    switchSimulationTerrain(pMap);
  }

  // === Tactical Minimap & Maximized Surface Reconnaissance Station ===
  try {
    minimap = new Minimap({
      meta,
      heights: data.heights,
      hf,
      frame,
      texture: data.texture,
      swarm,
      historyTracker,
      regionMarkers,
      missionSystem,
      rig,
      hud,
      onNavigate: (X, Y) => {},
    });
    window.minimap = minimap;
  } catch (e) {
    console.error('[Minimap] Init failed:', e);
  }

  const openMinimapBtn = document.getElementById('openMinimapBtn');
  if (openMinimapBtn) {
    openMinimapBtn.onclick = () => {
      if (minimap) minimap.toggleMaximize();
    };
  }

  document.getElementById('sources').innerHTML = meta.sources.map(s => `<li><b>${s.role}:</b> ${s.file}<br><span>${s.credit}</span></li>`).join('');
  hud.setInspect(null);
  hud.hideLoading();

  // Initialize simple Map Portal as secondary reference if needed
  mapPortal = new MapPortal({
    onLaunchSimulation: mapData => {
      hud.showToast(`Memasuki simulasi 3D — ${mapData.title}`);
      switchSimulationTerrain(mapData);
    },
  });

  // Keyboard shortcut switching between the 3 robots & mission triggers
  addEventListener('keydown', e => {
    // If dashboard is active, don't trigger rover controls
    if (dashboardController && dashboardController.isVisible) {
      if (e.code === 'Escape') {
        dashboardController.hideHelpModal();
      }
      return;
    }

    if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
      const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
      selectRover(idx);
    } else if (e.code === 'Tab') {
      e.preventDefault();
      selectRover((swarm.activeIndex + 1) % swarm.rovers.length);
    } else if (e.code === 'Space' && rig.mode !== 'fly') {
      e.preventDefault();
      triggerMainTask();
    } else if (e.code === 'KeyB') {
      // Shortcut B: Bangun Stasiun Lab
      const geoRover = swarm.rovers[1];
      if (geoRover) {
        missionSystem.buildScienceLab(geoRover.physics);
      }
    } else if (e.code === 'KeyC') {
      // Shortcut C: Panggil Hermes Transport (Shift+C untuk Pendaratan Ekspres Instan)
      missionSystem.callTransportToWaypoint(e.shiftKey);
    } else if (e.code === 'KeyE') {
      // Shortcut E: Buka / Tutup Backpack Laboratorium
      if (labBackpack) labBackpack.toggle();
    } else if (e.code === 'KeyM') {
      // Shortcut M: Maksimalkan / Perkecil Peta Taktis & Terrain Mars
      if (minimap) minimap.toggleMaximize();
    }
  });

  // Click to inspect (ignore drags)
  let down = null;
  const dom = renderer.domElement;
  dom.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  dom.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    if (jezeroExploration && jezeroExploration.handleClick(ray)) {
      return;
    }
    const p = pickTerrain(ray.ray, hf, frame);
    if (p) {
      const [lon, lat] = frame.projToLonLat(p.X, p.Y);
      hud.setInspect({ ...p, lon, lat });
      marker.position.set(p.world.x, p.world.y + 60, p.world.z);
      marker.rotation.x = Math.PI;
      marker.visible = true;
    }
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const clock = new THREE.Clock();
  let fps = 60;

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    fps += (1 / Math.max(dt, 1e-3) - fps) * 0.05;

    // Cutscene takes over camera when active — skip rig update
    if (cutscene && cutscene.active) {
      cutscene.tick(dt);
      renderer.render(scene, camera);
      return;
    }

    // Update the 3 specialized rovers and their autonomous mission routines
    swarm.update(dt, input.read());

    // Update mission workflow loop (Hermes navigation, sample loading & lab delivery)
    if (missionSystem) {
      missionSystem.update(dt, swarm.rovers);
    }

    const active = swarm.getActiveRover();
    const activeMeshPos = active.mesh.position;

    // Update region markers proximity check
    if (regionMarkers) {
      regionMarkers.update(active.physics.X, active.physics.Y);
    }

    if (jezeroExploration) {
      jezeroExploration.update(active.physics.X, active.physics.Y, dt);
    }

    // Directional shadow frustum follows active rover
    sun.position.copy(activeMeshPos).add(sunDir.clone().multiplyScalar(5000));
    sun.target.position.copy(activeMeshPos);

    rig.update(dt, activeMeshPos);
    renderer.render(scene, camera);

    // Update history tracker
    if (historyTracker) {
      historyTracker.update(swarm.activeIndex, swarm.rovers);
      if (typeof hud.updateHistory === 'function') {
        const stats = historyTracker.getTrackStats(swarm.activeIndex);
        hud.updateHistory(stats);
      }
    }

    // Update tactical minimap & maximized surface reconnaissance station
    if (minimap) {
      minimap.update();
    }

    const [lon, lat] = frame.projToLonLat(active.physics.X, active.physics.Y);
    hud.update({
      rover: active,
      lon,
      lat,
      X: active.physics.X,
      Y: active.physics.Y,
      elev: active.physics.elevation,
      slope: active.physics.slopeDeg,
      heading: active.physics.heading,
      speed: active.physics.speed,
      status: active.physics.status,
      fps,
    });
  });
}

const sunDir = new THREE.Vector3();
function updateSun() {
  const el = +document.getElementById('sunEl').value * Math.PI / 180;
  const az = +document.getElementById('sunAz').value * Math.PI / 180;
  sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}

function startRovers() {
  const [X, Y] = frame.lonLatToProj(...CONFIG.startLonLat);
  swarm.spawnAt(X, Y, 0);

  const active = swarm.getActiveRover();
  const w = frame.toWorld(active.physics.X, active.physics.Y, active.physics.elevation);
  rig.placeBehind(new THREE.Vector3(w.x, w.y, w.z), 0);
  hud.updateRoverSelection(swarm.activeIndex, active);
  if (missionSystem) {
    hud.updateWorkflow(missionSystem, active);
  }
}

main();
