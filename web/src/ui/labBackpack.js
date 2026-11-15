import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { REGION_SCIENCE_DATA } from '../mission/missionSystem.js';
import { ICONS } from './icons.js';

/**
 * LabBackpackWorkbench — Fasilitas Riset Meja Laboratorium & Backpack Spesimen Mars
 * 
 * Alur Kerja:
 * 1. Pengguna membuka "🎒 BACKPACK LABORATORIUM" melalui tombol HUD di bar atas.
 * 2. Laboratorium Sains mengeluarkan Meja Riset Interaktif (Laboratory 3D Examination Desk).
 * 3. Di atas meja diletakkan Model 3D Benda Menonjol yang dipilih (dapat di-rotate 360°, zoom in/out).
 * 4. Di samping meja terdapat Panel Deskripsi Lengkap: komposisi geologi, data wilayah, 
 *    foto snapshot kamera depan Rover, dan scan depth camera.
 * 5. Pengguna dapat memilih benda dari inventori backpack untuk ditaruh di atas meja riset.
 */
export class LabBackpackWorkbench {
  /**
   * @param {Object} missionSystem - instance MissionSystem
   * @param {Object} vpms - instance VisualPerceptionSystem (opsional untuk snapshot/depth)
   */
  constructor(missionSystem, vpms = null) {
    this.mission = missionSystem;
    this.vpms = vpms;

    this.isOpen = false;
    this.selectedSpecimenId = 'elysium'; // Default selected
    this.customDataset = null; // Dataset khusus map aktif (mis. Jezero Crater)
    
    // 3D Scene Meja Riset
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.animFrameId = null;

    // Objek di atas meja
    this.workbenchGroup = null;
    this.currentArtifactMesh = null;
    this.scannerRing = null;

    this.#buildDOM();
    this.#init3DScene();
  }

  /**
   * Mengganti isi inventori & model 3D meja riset sesuai map aktif.
   * Kirim null untuk kembali ke dataset bawaan map teman (REGION_SCIENCE_DATA).
   */
  setCustomDataset(datasetMap, defaultId = null) {
    this.customDataset = datasetMap || null;
    const activeMap = this.#getActiveDataset();
    const keys = Object.keys(activeMap);
    if (keys.length > 0) {
      this.selectedSpecimenId = defaultId && activeMap[defaultId] ? defaultId : keys[0];
    }
    this.#refreshSidebarList();
    if (this.isOpen && this.selectedSpecimenId) {
      this.placeArtifactOnDesk(this.selectedSpecimenId);
    }
  }

  #getActiveDataset() {
    return this.customDataset || REGION_SCIENCE_DATA;
  }
  /* ---------------------------------------------------------
   * 1. MEMBANGUN STRUKTUR DOM DI LAYAR
   * --------------------------------------------------------- */
  #buildDOM() {
    const overlay = document.createElement('div');
    overlay.id = 'labBackpackOverlay';
    overlay.className = 'lab-bp-overlay';
    overlay.style.display = 'none';

    overlay.innerHTML = `
      <div class="lab-bp-window">
        <!-- Window Top Header -->
        <div class="lab-bp-header">
          <div class="lab-bp-title-box">
            <span class="lab-bp-badge">NASA / JPL SCIENCE STATION</span>
            <h2 class="lab-bp-title" style="display:flex;align-items:center;gap:8px;">
              ${ICONS.backpack(16)}
              <span>BACKPACK LABORATORIUM — MEJA RISET SPESIMEN MARS</span>
            </h2>
          </div>
          <button class="lab-bp-close-btn" id="labBpCloseBtn" title="Tutup Meja Riset" style="display:inline-flex;align-items:center;gap:6px;">
            ${ICONS.x(12)}
            <span>TUTUP</span>
          </button>
        </div>

        <!-- Window Main Content -->
        <div class="lab-bp-body">
          <!-- SISI KIRI: DAFTAR INVENTORI BACKPACK LABORATORIUM -->
          <div class="lab-bp-sidebar">
            <div class="lab-bp-sidebar-header">
              <span>DAFTAR SPESIMEN &amp; INVENTORI</span>
              <span class="lab-bp-count" id="labBpCountBadge">0 / 6 DIAMBIL</span>
            </div>
            <div class="lab-bp-list" id="labBpItemList">
              <!-- Item kartu spesimen dirender dinamis -->
            </div>
            <div class="lab-bp-sidebar-footer">
              <small>Klik salah satu item untuk meletakkannya di atas meja riset laboratorium</small>
            </div>
          </div>

          <!-- TENGAH: MEJA RISET 3D INTERAKTIF (EXAMINATION DESK) -->
          <div class="lab-bp-center">
            <div class="lab-bp-viewport-header">
              <span id="labBpDeskLabel" style="display:flex;align-items:center;gap:6px;">
                ${ICONS.microscope(14)}
                <span>MEJA RISET PEMERIKSAAN SPESIMEN 3D</span>
              </span>
              <div class="lab-bp-view-tools">
                <button id="labBpResetViewBtn" class="lab-bp-btn-sm btn-with-icon" title="Kembalikan Sudut Pandang">
                  ${ICONS.rotateCcw(11)}
                  <span>Reset View</span>
                </button>
                <span class="lab-bp-drag-hint">Orbit 360° • Zoom • Pan</span>
              </div>
            </div>

            <!-- Canvas Container Three.js Meja Riset -->
            <div class="lab-bp-canvas-wrap" id="labBpCanvasContainer">
              <!-- Three.js Canvas di-mount di sini -->
              <div class="lab-bp-table-glow"></div>
            </div>

            <div class="lab-bp-viewport-footer">
              <span class="lab-bp-status-led" id="labBpLedStatus">● MEJA RISET AKTIF — PEMINDAIAN LASER STEREO ON</span>
            </div>
          </div>

          <!-- SISI KANAN: DESKRIPSI LENGKAP & PERSEPSI VISUAL (DEPTH & SNAPSHOT) -->
          <div class="lab-bp-detail-panel">
            <div class="lab-bp-detail-header">
              <span class="lab-bp-tag" id="labBpMatterTag" style="display:inline-flex;align-items:center;gap:4px;">
                ${ICONS.gem(11)}
                <span>BATUAN PADAT</span>
              </span>
              <h3 class="lab-bp-item-name" id="labBpItemName">Kristal Inti Magma</h3>
              <div class="lab-bp-item-region" id="labBpItemRegion">Wilayah: Elysium Planitia</div>
            </div>

            <!-- Tab Pilihan: Analisis Geologi vs Persepsi Visual Depth -->
            <div class="lab-bp-detail-tabs">
              <button class="lab-bp-tab-btn active" data-tab="analysis" style="display:inline-flex;align-items:center;gap:6px;">
                ${ICONS.microscope(13)}
                <span>ANALISIS LAB</span>
              </button>
              <button class="lab-bp-tab-btn" data-tab="perception" style="display:inline-flex;align-items:center;gap:6px;">
                ${ICONS.camera(13)}
                <span>PERSEPSI KAMERA &amp; DEPTH</span>
              </button>
            </div>

            <!-- TAB 1: HASIL ANALISIS SAINS -->
            <div class="lab-bp-tab-content active" id="labBpTabAnalysis">
              <div class="lab-bp-section">
                <label>METODE PENGAMBILAN HERMES</label>
                <div class="lab-bp-pickup-status" id="labBpPickupMethod" style="display:flex;align-items:center;gap:6px;">
                  ${ICONS.claw(13)}
                  <span>Dicapit menggunakan Hydraulic Claw Gripper</span>
                </div>
              </div>

              <div class="lab-bp-section">
                <label>TIPE BATUAN &amp; STRATIGRAFI</label>
                <p id="labBpRockType" class="lab-bp-text">—</p>
              </div>

              <div class="lab-bp-section">
                <label>KOMPOSISI MINERAL TERKONFIRMASI</label>
                <p id="labBpMineral" class="lab-bp-text-highlight">—</p>
              </div>

              <div class="lab-bp-section">
                <label>HASIL SPEKTROMETRI &amp; ANALISIS LABORATORIUM</label>
                <div class="lab-bp-analysis-box" id="labBpAnalysisResult">—</div>
              </div>

              <div class="lab-bp-section">
                <label>SIGNIFIKANSI ILMIAH MARS</label>
                <p id="labBpSignificance" class="lab-bp-text-dim">—</p>
              </div>
            </div>

            <!-- TAB 2: PERSEPSI VISUAL SNAPSHOT & SIMULASI DEPTH CAMERA -->
            <div class="lab-bp-tab-content" id="labBpTabPerception">
              <div class="lab-bp-visual-grid">
                <!-- Foto Snapshot Kamera Depan -->
                <div class="lab-bp-visual-col">
                  <div class="lab-bp-vis-title">FOTO KAMERA DEPAN ROVER</div>
                  <div class="lab-bp-vis-frame">
                    <img id="labBpRgbImage" class="lab-bp-vis-img" alt="Kamera Depan Rover" style="display:none;">
                    <div id="labBpRgbFallback" class="lab-bp-vis-fallback">
                      <span style="display:flex;align-items:center;justify-content:center;gap:6px;">
                        ${ICONS.camera(13)}
                        <span>FRONT HAZCAM</span>
                      </span>
                      <small>Snapshot medan terverifikasi</small>
                    </div>
                  </div>
                </div>

                <!-- Simulasi Depth Camera Map -->
                <div class="lab-bp-visual-col">
                  <div class="lab-bp-vis-title">SIMULASI DEPTH CAMERA (JARAK METRIK)</div>
                  <div class="lab-bp-vis-frame">
                    <img id="labBpDepthImage" class="lab-bp-vis-img" alt="Depth Camera Map" style="display:none;">
                    <div id="labBpDepthFallback" class="lab-bp-vis-fallback">
                      <span style="display:flex;align-items:center;justify-content:center;gap:6px;">
                        ${ICONS.slope(13)}
                        <span>DEPTH MAP STEREO</span>
                      </span>
                      <small>Turbo Color Ramp Sensor</small>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Depth Metrics & Telemetri -->
              <div class="lab-bp-section" style="margin-top:12px;">
                <label>TELEMETRI SENSOR &amp; KOORDINAT</label>
                <table class="lab-bp-meta-tbl">
                  <tr><td>Koordinat Mars</td><td id="labBpCoord">18.4° N, 147.2° E</td></tr>
                  <tr><td>Mode Sensor</td><td>DEPTH SENSOR STEREO SIM</td></tr>
                  <tr><td>Status Muatan</td><td id="labBpStorageLocation" style="color:#00e5ff;">DI DALAM BACKPACK LAB</td></tr>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlayEl = overlay;

    this.#injectStyles();
    this.#bindDOMEvents();
  }

  /* ---------------------------------------------------------
   * 2. INISIALISASI SCENE 3D MEJA LABORATORIUM
   * --------------------------------------------------------- */
  #init3DScene() {
    const container = document.getElementById('labBpCanvasContainer');
    if (!container) return;

    const width = container.clientWidth || 540;
    const height = container.clientHeight || 460;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 1.8, 3.4);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 6.0;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1; // Jangan tembus ke bawah meja
    this.controls.target.set(0, 0.45, 0);
    this.controls.update();

    // Lighting Ruang Riset Laboratorium
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(3, 5, 4);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const cyanSpot = new THREE.SpotLight(0x00e5ff, 2.5, 8, Math.PI / 4, 0.4);
    cyanSpot.position.set(0, 3.5, 0);
    cyanSpot.target.position.set(0, 0.4, 0);
    this.scene.add(cyanSpot);
    this.scene.add(cyanSpot.target);

    // Meja Riset Laboratorium (Workbench Geometry)
    this.#buildWorkbenchModel();

    // Handle Window Resize
    window.addEventListener('resize', () => {
      if (!this.isOpen || !this.renderer || !this.camera) return;
      const c = document.getElementById('labBpCanvasContainer');
      if (!c) return;
      const w = c.clientWidth;
      const h = c.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  /* ---------------------------------------------------------
   * 3. MODEL 3D MEJA LABORATORIUM (SCIENCE WORKBENCH)
   * --------------------------------------------------------- */
  #buildWorkbenchModel() {
    this.workbenchGroup = new THREE.Group();

    // 1. Meja Bundar Logam Laboratorium
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x1a212d,
      roughness: 0.35,
      metalness: 0.85,
    });
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.35, 0.1, 48), tableMat);
    tableTop.position.y = 0;
    tableTop.receiveShadow = true;
    this.workbenchGroup.add(tableTop);

    // Ring Pendar Cyan di Meja Riset
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.32, 48), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.052;
    this.workbenchGroup.add(ring);

    // Piringan Dudukan Spesimen di Tengah Meja
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x0b1017,
      roughness: 0.2,
      metalness: 0.9,
    });
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.78, 0.08, 32), standMat);
    stand.position.y = 0.08;
    stand.receiveShadow = true;
    this.workbenchGroup.add(stand);

    // Cincin Laser Pemindai Spektrometer (Scanner Ring Melayang)
    const scannerMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.65,
    });
    this.scannerRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.015, 12, 36), scannerMat);
    this.scannerRing.rotation.x = Math.PI / 2;
    this.scannerRing.position.y = 0.35;
    this.workbenchGroup.add(this.scannerRing);

    // Kaki Penopang Meja Baja
    const legMat = new THREE.MeshStandardMaterial({ color: 0x111620, metalness: 0.9, roughness: 0.4 });
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.2, 24), legMat);
    leg.position.y = -0.65;
    this.workbenchGroup.add(leg);

    this.scene.add(this.workbenchGroup);
  }

  /* ---------------------------------------------------------
   * 4. MELETAKKAN BENDA 3D MENONJOL DI ATAS MEJA RISET
   * --------------------------------------------------------- */
  placeArtifactOnDesk(specimenId) {
    this.selectedSpecimenId = specimenId;

    // Bersihkan objek sebelumnya di atas meja
    if (this.currentArtifactMesh) {
      this.workbenchGroup.remove(this.currentArtifactMesh);
      this.currentArtifactMesh = null;
    }

    const dataset = this.#getActiveDataset();
    const data = dataset[specimenId];
    if (!data) return;

    const group = new THREE.Group();
    group.position.set(0, 0.45, 0); // Di atas dudukan meja

    // Buat model 3D benda menonjol yang tajam, realistis & detail
    const mesh = this.#createSpecimen3D(specimenId, data);
    group.add(mesh);

    // Cahaya pendar lembut dari spesimen itu sendiri
    const glowLight = new THREE.PointLight(data.color || 0x00e5ff, 2.0, 3.5);
    glowLight.position.set(0, 0.3, 0);
    group.add(glowLight);

    this.currentArtifactMesh = group;
    this.workbenchGroup.add(group);

    // Perbarui teks detail di panel kanan
    this.#updateDetailPanel(specimenId, data);

    // Perbarui status seleksi di daftar kiri
    this.#refreshSidebarList();
  }

  #createSpecimen3D(id, data) {
    // --- MODEL 3D KHUSUS SPESIMEN JEZERO CRATER ---
    if (data && data.meshKind) {
      const isResearched = !!data.researched;

      // Sebelum diteliti Robot B: tampilkan kapsul sampel misterius bersegel
      if (!isResearched) {
        const mysteryGroup = new THREE.Group();
        const capsule = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.24, 0.48, 20),
          new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            emissive: 0x38bdf8,
            emissiveIntensity: 0.35,
            metalness: 0.85,
            roughness: 0.25
          })
        );
        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(0.32, 0.015, 10, 32),
          new THREE.MeshBasicMaterial({ color: 0xf59e0b })
        );
        halo.rotation.x = Math.PI / 2;
        mysteryGroup.add(capsule, halo);
        return mysteryGroup;
      }

      // Setelah diteliti Robot B: tampilkan model 3D geologi asli yang tajam & jelas
      if (data.meshKind === 'olivine_crystal') {
        const g = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({
          color: 0x65a30d,
          emissive: 0x84cc16,
          emissiveIntensity: 1.4,
          roughness: 0.15,
          metalness: 0.75
        });
        [
          { r: 0.2, h: 0.62, x: 0, z: 0, rx: 0.08, rz: -0.05 },
          { r: 0.13, h: 0.44, x: 0.2, z: 0.1, rx: 0.3, rz: -0.22 },
          { r: 0.12, h: 0.4, x: -0.18, z: 0.12, rx: -0.25, rz: 0.2 }
        ].forEach(s => {
          const m = new THREE.Mesh(new THREE.ConeGeometry(s.r, s.h, 6), mat);
          m.position.set(s.x, s.h * 0.35 - 0.18, s.z);
          m.rotation.set(s.rx, 0.4, s.rz);
          g.add(m);
        });
        return g;
      }

      if (data.meshKind === 'layered_butte' || data.meshKind === 'carbonate_terrace') {
        const g = new THREE.Group();
        const cols =
          data.meshKind === 'carbonate_terrace'
            ? [0xd6d3d1, 0xf5f5f4, 0xffffff]
            : [0x9a3412, 0xd97706, 0xfacc15];
        cols.forEach((col, i) => {
          const slab = new THREE.Mesh(
            new THREE.BoxGeometry(0.65 - i * 0.13, 0.12, 0.5 - i * 0.1),
            new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.2 })
          );
          slab.position.set(i * 0.03, -0.16 + i * 0.12, -i * 0.02);
          slab.rotation.y = 0.35;
          g.add(slab);
        });
        return g;
      }

      // Default batuan berurat mineral / megabreksi Jezero
      const rockGroup = new THREE.Group();
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.34, 1),
        new THREE.MeshStandardMaterial({
          color: 0x475569,
          emissive: data.color || 0x00e5ff,
          emissiveIntensity: 0.55,
          roughness: 0.35,
          metalness: 0.6
        })
      );
      const vein = new THREE.Mesh(
        new THREE.TorusGeometry(0.33, 0.02, 10, 32),
        new THREE.MeshBasicMaterial({ color: data.color || 0x38bdf8 })
      );
      vein.rotation.set(0.6, 0.3, 0);
      rockGroup.add(rock, vein);
      return rockGroup;
    }

    if (id === 'elysium') {
      // BATUAN MAGMA MENONJOL: Kristal Obsidian Berurat Lava Pijar
      const group = new THREE.Group();
      // Kristal inti besar
      const crystalGeo = new THREE.OctahedronGeometry(0.38, 0);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: 0x1a0500,
        emissive: 0xff3b00,
        emissiveIntensity: 2.5,
        roughness: 0.15,
        metalness: 0.9,
      });
      group.add(new THREE.Mesh(crystalGeo, crystalMat));

      // Pecahan kristal basaltik padat di bawahnya
      for (let i = 0; i < 5; i++) {
        const mini = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), crystalMat);
        mini.position.set(Math.sin(i * 1.25) * 0.32, -0.2, Math.cos(i * 1.25) * 0.32);
        group.add(mini);
      }
      return group;
    } else if (id === 'acidalia') {
      // FLUIDA CAIR MENONJOL: Wadah Spesimen Akuifer Hidrotermal Berpendar Cyan
      const group = new THREE.Group();
      // Bejana cawan kaca kristal laboratorium
      const beakerMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.05,
        metalness: 0.1,
        transparent: true,
        opacity: 0.35,
      });
      const beaker = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.3, 0.45, 24), beakerMat);
      group.add(beaker);

      // Cairan fluida hidrotermal di dalam bejana
      const fluidMat = new THREE.MeshStandardMaterial({
        color: 0x00d4ff,
        emissive: 0x0088cc,
        emissiveIntensity: 1.8,
        roughness: 0.08,
        metalness: 0.8,
        transparent: true,
        opacity: 0.85,
      });
      const fluid = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.28, 0.38, 24), fluidMat);
      fluid.position.y = -0.02;
      group.add(fluid);
      return group;
    } else if (id === 'arabia') {
      // BATUAN METEORIT MENONJOL: Meteorit Logam Kromium Chondrite Padat
      const geo = new THREE.DodecahedronGeometry(0.35, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x2d2b33,
        emissive: 0xffaa33,
        emissiveIntensity: 0.8,
        roughness: 0.3,
        metalness: 0.95,
      });
      return new THREE.Mesh(geo, mat);
    } else if (id === 'isidis') {
      // KACA KOSMIK MENONJOL: Tektite Kaca Impak Kosmik
      const geo = new THREE.TorusKnotGeometry(0.24, 0.08, 48, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff3311,
        emissive: 0xff7700,
        emissiveIntensity: 1.8,
        roughness: 0.15,
        metalness: 0.8,
      });
      return new THREE.Mesh(geo, mat);
    } else if (id === 'syrtis') {
      // PERMATA MANTEL MENONJOL: Permata Olivin Peridotite Hijau Zamrud
      const geo = new THREE.OctahedronGeometry(0.36, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x008844,
        emissive: 0x00ff88,
        emissiveIntensity: 2.0,
        roughness: 0.12,
        metalness: 0.85,
      });
      return new THREE.Mesh(geo, mat);
    } else if (id === 'zeus_patera') {
      // PADAT: Breksia Sesar Graben Zeus
      const group = new THREE.Group();
      const boxGeo = new THREE.BoxGeometry(0.38, 0.28, 0.32);
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x2b2416, roughness: 0.8, metalness: 0.3 });
      group.add(new THREE.Mesh(boxGeo, boxMat));
      const veinGeo = new THREE.BoxGeometry(0.39, 0.06, 0.1);
      const veinMat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xff8800,
        emissiveIntensity: 2.2,
        metalness: 0.85,
        roughness: 0.15,
      });
      group.add(new THREE.Mesh(veinGeo, veinMat));
      return group;
    } else if (id === 'hera_patera') {
      // PADAT: Fragmen Basal Tebing Busur Hera
      const geo = new THREE.CylinderGeometry(0.32, 0.42, 0.22, 6);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x331c12,
        emissive: 0xff5522,
        emissiveIntensity: 1.4,
        roughness: 0.5,
        metalness: 0.6,
      });
      return new THREE.Mesh(geo, mat);
    } else if (id === 'hermes_patera') {
      // PADAT: Pahoehoe Pematang Busur Hermes
      const geo = new THREE.TorusKnotGeometry(0.26, 0.075, 48, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x35103b,
        emissive: 0xab47bc,
        emissiveIntensity: 1.8,
        roughness: 0.2,
        metalness: 0.75,
      });
      return new THREE.Mesh(geo, mat);
    } else if (id === 'dionysus_patera') {
      // CAIR: Bejana Fumarol Gas & Belerang Dionysus
      const group = new THREE.Group();
      const beakerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35 });
      const beaker = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.3, 0.45, 24), beakerMat);
      group.add(beaker);
      const fluidMat = new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        emissive: 0x00aacc,
        emissiveIntensity: 1.8,
        roughness: 0.08,
        metalness: 0.8,
        transparent: true,
        opacity: 0.85,
      });
      const fluid = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.28, 0.38, 24), fluidMat);
      fluid.position.y = -0.02;
      group.add(fluid);
      return group;
    } else if (id === 'athena_patera') {
      // PADAT: Basal Pikrit Kaldera Bulat Athena
      const geo = new THREE.OctahedronGeometry(0.36, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x082b14,
        emissive: 0x38ef7d,
        emissiveIntensity: 2.2,
        roughness: 0.12,
        metalness: 0.85,
      });
      return new THREE.Mesh(geo, mat);
    } else if (id === 'apollo_patera') {
      // PADAT: Vitrofir Danau Lava Apollo
      const geo = new THREE.DodecahedronGeometry(0.34, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x260307,
        emissive: 0xef4444,
        emissiveIntensity: 1.8,
        roughness: 0.08,
        metalness: 0.9,
      });
      return new THREE.Mesh(geo, mat);
    } else if (id === 'pangboche_crater') {
      // PADAT: Kaca Impak Ejecta Pangboche
      const group = new THREE.Group();
      const coreGeo = new THREE.IcosahedronGeometry(0.3, 0);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x222630,
        emissive: 0xffffff,
        emissiveIntensity: 2.4,
        roughness: 0.12,
        metalness: 0.95,
      });
      group.add(new THREE.Mesh(coreGeo, coreMat));
      const flangeGeo = new THREE.TorusGeometry(0.34, 0.05, 16, 32);
      const flangeMat = new THREE.MeshStandardMaterial({
        color: 0x556677,
        emissive: 0x88ccff,
        emissiveIntensity: 1.5,
        roughness: 0.2,
        metalness: 0.9,
      });
      const flange = new THREE.Mesh(flangeGeo, flangeMat);
      flange.rotation.x = Math.PI / 3;
      group.add(flange);
      return group;
    } else {
      // MONOLIT FLUIDA GEOTERMAL HESPERIA
      const group = new THREE.Group();
      const basinMat = new THREE.MeshStandardMaterial({ color: 0x222a36, roughness: 0.6, metalness: 0.4 });
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.32, 0.2, 24), basinMat);
      group.add(basin);

      const fluidMat = new THREE.MeshStandardMaterial({
        color: 0x66bb6a,
        emissive: 0x33aa44,
        emissiveIntensity: 1.5,
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.88,
      });
      const fluid = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.3, 0.15, 24), fluidMat);
      fluid.position.y = 0.04;
      group.add(fluid);
      return group;
    }
  }

  /* ---------------------------------------------------------
   * 5. PERBARUI DATA DESKRIPSI & PERSEPSI VISUAL
   * --------------------------------------------------------- */
  #updateDetailPanel(id, data) {
    const isSolid = data.stateOfMatter === 'solid';

    // Badge Wujud Materi
    const matterTag = document.getElementById('labBpMatterTag');
    if (matterTag) {
      matterTag.innerHTML = isSolid
        ? `<span style="display:inline-flex;align-items:center;gap:4px;">${ICONS.gem(11)} <span>BATUAN PADAT</span></span>`
        : `<span style="display:inline-flex;align-items:center;gap:4px;">${ICONS.layers(11)} <span>FLUIDA CAIR</span></span>`;
      matterTag.className = isSolid ? 'lab-bp-tag solid' : 'lab-bp-tag liquid';
    }

    // Nama & Wilayah
    const nameEl = document.getElementById('labBpItemName');
    if (nameEl) nameEl.textContent = data.artifactName;

    const regEl = document.getElementById('labBpItemRegion');
    if (regEl) regEl.textContent = `Wilayah Mars: ${data.name}`;

    // Cara Pengambilan Hermes
    const pickupEl = document.getElementById('labBpPickupMethod');
    if (pickupEl) {
      pickupEl.innerHTML = isSolid
        ? `<span style="display:inline-flex;align-items:center;gap:6px;">${ICONS.claw(14)} <span>DICAPIT menggunakan Hydraulic Claw Gripper (Benda Padat)</span></span>`
        : `<span style="display:inline-flex;align-items:center;gap:6px;">${ICONS.drill(14)} <span>DISEROK menggunakan Suction Dipper Scoop (Benda Cair)</span></span>`;
    }

    // Informasi Geologi
    const rockEl = document.getElementById('labBpRockType');
    if (rockEl) rockEl.textContent = data.rockType || 'Batuan Martis';

    const minEl = document.getElementById('labBpMineral');
    if (minEl) minEl.textContent = data.mineral || 'Silikat & Logam Terkompresi';

    const analEl = document.getElementById('labBpAnalysisResult');
    if (analEl) analEl.textContent = data.analysisResult || 'Hasil spektrometri Raman terverifikasi.';

    const sigEl = document.getElementById('labBpSignificance');
    if (sigEl) sigEl.textContent = data.significance || 'Signifikansi eksplorasi tinggi.';

    // Status penyimpanan di backpack
    const isCollected = this.isSpecimenCollected(id);
    const storeEl = document.getElementById('labBpStorageLocation');
    if (storeEl) {
      storeEl.textContent = isCollected ? 'DI DALAM BACKPACK LABORATORIUM' : 'TERDETEKSI DI MEDAN (SIAP DIAMBIL HERMES)';
      storeEl.style.color = isCollected ? '#00e5ff' : '#f59e0b';
    }

    // Persepsi Visual: Gambar Snapshot & Depth Map
    this.#updatePerceptionVisuals(id, data);
  }

  #updatePerceptionVisuals(id, data) {
    const rgbImg = document.getElementById('labBpRgbImage');
    const rgbFb = document.getElementById('labBpRgbFallback');
    const depthImg = document.getElementById('labBpDepthImage');
    const depthFb = document.getElementById('labBpDepthFallback');

    // Cari dokumen snapshot dari VPMS jika ada
    let doc = null;
    if (this.vpms && typeof this.vpms.getDocs === 'function') {
      const docs = this.vpms.getDocs();
      doc = docs.find(d => d.regionId === id || (d.taskId && d.taskId.toLowerCase().includes(id))) || docs[0] || null;
    }

    if (doc && doc.rgbDataUrl) {
      if (rgbImg) { rgbImg.src = doc.rgbDataUrl; rgbImg.style.display = 'block'; }
      if (rgbFb) rgbFb.style.display = 'none';
    } else {
      if (rgbImg) rgbImg.style.display = 'none';
      if (rgbFb) rgbFb.style.display = 'flex';
    }

    if (doc && doc.depthDataUrl) {
      if (depthImg) { depthImg.src = doc.depthDataUrl; depthImg.style.display = 'block'; }
      if (depthFb) depthFb.style.display = 'none';
    } else {
      if (depthImg) depthImg.style.display = 'none';
      if (depthFb) depthFb.style.display = 'flex';
    }
  }

  /* ---------------------------------------------------------
   * 6. RENDER DAFTAR SPESIMEN DI SIDEBAR KIRI
   * --------------------------------------------------------- */
  getScienceDataDict() {
    return (this.mission && typeof this.mission.getScienceDataDict === 'function')
      ? this.mission.getScienceDataDict()
      : REGION_SCIENCE_DATA;
  }

  #refreshSidebarList() {
    const listEl = document.getElementById('labBpItemList');
    const countBadge = document.getElementById('labBpCountBadge');
    if (!listEl) return;

    const dataset = this.#getActiveDataset();
    let collectedCount = 0;
    const totalCount = Object.keys(dataset).length;

    const html = Object.keys(dataset).map(key => {
      const item = dataset[key];
      const isCollected = this.isSpecimenCollected(key);
      if (isCollected) collectedCount++;

      const isSelected = this.selectedSpecimenId === key;
      const matterIcon = item.stateOfMatter === 'solid' ? ICONS.gem(13) : ICONS.layers(13);
      const matterLabel = item.stateOfMatter === 'solid' ? 'Capit (Padat)' : 'Serok (Cair)';

      return `
        <div class="lab-bp-item-card ${isSelected ? 'selected' : ''}" data-id="${key}">
          <div class="lab-bp-ic-header" style="display:flex;align-items:center;gap:6px;">
            <span class="lab-bp-ic-icon" style="display:inline-flex;align-items:center;">${matterIcon}</span>
            <span class="lab-bp-ic-title">${item.artifactName}</span>
          </div>
          <div class="lab-bp-ic-meta" style="display:flex;justify-content:space-between;align-items:center;">
            <span style="display:inline-flex;align-items:center;gap:4px;">${ICONS.pin(11)} ${item.name}</span>
            <span class="lab-bp-ic-tool">${matterLabel}</span>
          </div>
          <div class="lab-bp-ic-status ${isCollected ? 'collected' : 'pending'}" style="display:inline-flex;align-items:center;gap:4px;">
            ${isCollected ? `${ICONS.checkCircle(10)} <span>DI BACKPACK LAB</span>` : `${ICONS.circle(10)} <span>TERDETEKSI DI MEDAN</span>`}
          </div>
        </div>
      `;
    }).join('');

    listEl.innerHTML = html;

    if (countBadge) {
      countBadge.textContent = `${collectedCount} / ${totalCount} DIAMBIL`;
    }

    listEl.querySelectorAll('.lab-bp-item-card').forEach(card => {
      card.addEventListener('click', () => {
        this.placeArtifactOnDesk(card.dataset.id);
      });
    });
  }

  isSpecimenCollected(id) {
    const dataset = this.#getActiveDataset();
    if (dataset[id] && typeof dataset[id].collected === 'boolean') {
      return dataset[id].collected;
    }
    if (!this.mission) return false;
    if (this.mission.transportCargo && this.mission.transportCargo.id === id) return true;
    if (this.mission.artifacts) {
      const art = this.mission.artifacts.find(a => a.id === id);
      if (art && art.collected) return true;
    }
    return false;
  }

  /* ---------------------------------------------------------
   * 7. EVENT BINDING & INTERAKSI DOM
   * --------------------------------------------------------- */
  #bindDOMEvents() {
    // Tombol Tutup Window
    const closeBtn = document.getElementById('labBpCloseBtn');
    if (closeBtn) closeBtn.onclick = () => this.close();

    // Tutup saat klik latar belakang overlay
    this.overlayEl.addEventListener('click', (e) => {
      if (e.target === this.overlayEl) this.close();
    });

    // Tombol Reset Sudut Pandang Kamera 3D
    const resetBtn = document.getElementById('labBpResetViewBtn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (this.camera && this.controls) {
          this.camera.position.set(0, 1.8, 3.4);
          this.controls.target.set(0, 0.45, 0);
          this.controls.update();
        }
      };
    }

    // Tab Pilihan: Analisis Lab vs Persepsi Kamera & Depth
    this.overlayEl.querySelectorAll('.lab-bp-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.overlayEl.querySelectorAll('.lab-bp-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        const tabAnalysis = document.getElementById('labBpTabAnalysis');
        const tabPerception = document.getElementById('labBpTabPerception');
        if (tabAnalysis) tabAnalysis.classList.toggle('active', tab === 'analysis');
        if (tabPerception) tabPerception.classList.toggle('active', tab === 'perception');
      });
    });
  }

  /* ---------------------------------------------------------
   * 8. KONTROL BUKA & TUTUP WINDOW MEJA RISET
   * --------------------------------------------------------- */
  open(specimenId = null) {
    this.isOpen = true;
    this.overlayEl.style.display = 'flex';

    const dataset = this.#getActiveDataset();
    const firstKey = Object.keys(dataset)[0] || 'elysium';
    const targetId = specimenId && dataset[specimenId] ? specimenId : (dataset[this.selectedSpecimenId] ? this.selectedSpecimenId : firstKey);
    this.placeArtifactOnDesk(targetId);

    this.#startAnimation();
  }

  close() {
    this.isOpen = false;
    this.overlayEl.style.display = 'none';
    this.#stopAnimation();
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  #startAnimation() {
    if (this.animFrameId) return;

    const animate = () => {
      if (!this.isOpen) return;
      this.animFrameId = requestAnimationFrame(animate);

      // Rotasi lembut objek 3D di atas meja
      if (this.currentArtifactMesh) {
        this.currentArtifactMesh.rotation.y += 0.008;
      }

      // Rotasi cincin pemindai laser spektrometer
      if (this.scannerRing) {
        this.scannerRing.rotation.z += 0.015;
        this.scannerRing.position.y = 0.35 + Math.sin(Date.now() * 0.003) * 0.05;
      }

      if (this.controls) this.controls.update();
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();
  }

  #stopAnimation() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /* ---------------------------------------------------------
   * 9. INJEKSI STYLING CSS WORKSTATION BACKPACK LAB
   * --------------------------------------------------------- */
  #injectStyles() {
    if (document.getElementById('lab-bp-styles')) return;

    const s = document.createElement('style');
    s.id = 'lab-bp-styles';
    s.textContent = `
      .lab-bp-overlay {
        position: fixed;
        inset: 0;
        background: rgba(4, 7, 12, 0.88);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        font-family: var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif);
        color: #f1f5f9;
        user-select: none;
      }

      .lab-bp-window {
        background: rgba(9, 14, 22, 0.94);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        box-shadow: 0 24px 60px -8px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        width: 100%;
        max-width: 1280px;
        height: 85vh;
        max-height: 820px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .lab-bp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px;
        background: rgba(14, 20, 32, 0.8);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .lab-bp-badge {
        font-family: var(--font-mono, 'JetBrains Mono', monospace);
        font-size: 9.5px;
        font-weight: 700;
        color: #00e5ff;
        background: rgba(0, 229, 255, 0.1);
        border: 1px solid rgba(0, 229, 255, 0.25);
        padding: 2px 8px;
        border-radius: 4px;
        letter-spacing: 0.6px;
      }
      .lab-bp-title {
        margin: 4px 0 0;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.3px;
        color: #fff;
        font-family: var(--font-sans, 'Plus Jakarta Sans', 'Inter', sans-serif);
      }
      .lab-bp-close-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
        padding: 6px 14px;
        border-radius: 6px;
        cursor: pointer;
        font-family: var(--font-sans, inherit);
        font-size: 11px;
        font-weight: 600;
        transition: all 0.15s;
      }
      .lab-bp-close-btn:hover {
        background: #e03c31;
        color: #fff;
        border-color: #ff5242;
      }

      .lab-bp-body {
        flex: 1;
        display: grid;
        grid-template-columns: 280px 1fr 360px;
        overflow: hidden;
      }

      /* SIDEBAR INVENTORI KIRI */
      .lab-bp-sidebar {
        background: rgba(7, 11, 18, 0.95);
        border-right: 1px solid rgba(255, 255, 255, 0.06);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .lab-bp-sidebar-header {
        padding: 10px 14px;
        background: rgba(13, 21, 34, 0.6);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        font-size: 9.5px;
        font-weight: 700;
        font-family: var(--font-mono, 'JetBrains Mono', monospace);
        letter-spacing: 0.05em;
        color: #94a3b8;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .lab-bp-count {
        color: #00e5ff;
        background: rgba(0, 229, 255, 0.1);
        border: 1px solid rgba(0, 229, 255, 0.25);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 9.5px;
      }
      .lab-bp-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .lab-bp-sidebar-footer {
        padding: 10px 14px;
        background: rgba(9, 14, 23, 0.8);
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        color: #64748b;
        font-size: 10px;
        line-height: 1.4;
      }

      .lab-bp-item-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 6px;
        padding: 9px 10px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .lab-bp-item-card:hover {
        border-color: rgba(0, 229, 255, 0.4);
        background: rgba(255, 255, 255, 0.06);
      }
      .lab-bp-item-card.selected {
        background: rgba(0, 229, 255, 0.08);
        border-color: #00e5ff;
        box-shadow: 0 0 12px rgba(0, 229, 255, 0.2);
      }
      .lab-bp-ic-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
      }
      .lab-bp-ic-icon { font-size: 14px; }
      .lab-bp-ic-title {
        font-size: 11px;
        font-weight: 700;
        color: #f1f5f9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .lab-bp-ic-meta {
        font-size: 9.5px;
        color: #64748b;
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      .lab-bp-ic-tool { color: #94a3b8; }
      .lab-bp-ic-status {
        font-size: 9px;
        font-weight: 700;
        padding: 2px 5px;
        border-radius: 2px;
        display: inline-block;
      }
      .lab-bp-ic-status.collected {
        background: rgba(0, 229, 255, 0.15);
        color: #00e5ff;
        border: 1px solid rgba(0, 229, 255, 0.35);
      }
      .lab-bp-ic-status.pending {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
        border: 1px solid rgba(245, 158, 11, 0.25);
      }

      /* TENGAH: MEJA RISET THREE.JS */
      .lab-bp-center {
        background: #05080e;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
        border-right: 1px solid #172433;
      }
      .lab-bp-viewport-header {
        padding: 10px 16px;
        background: rgba(11, 18, 30, 0.9);
        border-bottom: 1px solid #192738;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 10.5px;
        font-weight: 700;
        color: #cbd5e1;
        z-index: 2;
      }
      .lab-bp-view-tools { display: flex; align-items: center; gap: 10px; }
      .lab-bp-btn-sm {
        background: #141f2e;
        border: 1px solid #24364e;
        color: #94a3b8;
        padding: 3px 8px;
        border-radius: 3px;
        font-family: inherit;
        font-size: 10px;
        cursor: pointer;
      }
      .lab-bp-btn-sm:hover { color: #00e5ff; border-color: #00e5ff; }
      .lab-bp-drag-hint { font-size: 9px; color: #475569; }

      .lab-bp-canvas-wrap {
        flex: 1;
        position: relative;
        cursor: grab;
      }
      .lab-bp-canvas-wrap:active { cursor: grabbing; }

      .lab-bp-viewport-footer {
        padding: 6px 14px;
        background: #080d16;
        border-top: 1px solid #152230;
        font-size: 9.5px;
        z-index: 2;
      }
      .lab-bp-status-led { color: #10b981; }

      /* SISI KANAN: DETAIL & PERSEPSI VISUAL */
      .lab-bp-detail-panel {
        background: #070c14;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
      }
      .lab-bp-detail-header {
        padding: 14px 16px;
        background: #0c1421;
        border-bottom: 1px solid #1a283b;
      }
      .lab-bp-tag {
        display: inline-block;
        font-size: 9.5px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 3px;
        margin-bottom: 6px;
      }
      .lab-bp-tag.solid {
        background: rgba(255, 85, 0, 0.15);
        color: #ff7733;
        border: 1px solid rgba(255, 85, 0, 0.35);
      }
      .lab-bp-tag.liquid {
        background: rgba(0, 212, 255, 0.15);
        color: #00d4ff;
        border: 1px solid rgba(0, 212, 255, 0.35);
      }
      .lab-bp-item-name {
        margin: 0;
        font-size: 15px;
        font-weight: 800;
        color: #fff;
      }
      .lab-bp-item-region {
        margin-top: 4px;
        font-size: 10.5px;
        color: #64748b;
      }

      .lab-bp-detail-tabs {
        display: flex;
        background: #0a101a;
        border-bottom: 1px solid #192638;
      }
      .lab-bp-tab-btn {
        flex: 1;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: #64748b;
        padding: 9px 6px;
        font-family: inherit;
        font-size: 10px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s;
      }
      .lab-bp-tab-btn.active {
        color: #00e5ff;
        border-bottom-color: #00e5ff;
        background: rgba(0, 229, 255, 0.05);
      }

      .lab-bp-tab-content {
        padding: 14px 16px;
        display: none;
        flex-direction: column;
        gap: 12px;
      }
      .lab-bp-tab-content.active { display: flex; }

      .lab-bp-section label {
        display: block;
        font-size: 9px;
        font-weight: 800;
        color: #64748b;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .lab-bp-pickup-status {
        background: #0f1826;
        border: 1px solid #1e314a;
        padding: 6px 10px;
        border-radius: 4px;
        color: #38bdf8;
        font-size: 10.5px;
        font-weight: 600;
      }
      .lab-bp-text { margin: 0; font-size: 11px; color: #cbd5e1; line-height: 1.4; }
      .lab-bp-text-highlight { margin: 0; font-size: 11px; color: #00ff88; font-weight: 700; }
      .lab-bp-text-dim { margin: 0; font-size: 10.5px; color: #94a3b8; line-height: 1.4; }
      .lab-bp-analysis-box {
        background: #08111c;
        border: 1px solid #193147;
        padding: 8px 10px;
        border-radius: 4px;
        color: #e2e8f0;
        font-size: 10.5px;
        line-height: 1.45;
      }

      /* Grid Visual Persepsi */
      .lab-bp-visual-grid {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .lab-bp-visual-col {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .lab-bp-vis-title {
        font-size: 9px;
        font-weight: 800;
        color: #64748b;
      }
      .lab-bp-vis-frame {
        width: 100%;
        height: 125px;
        background: #090e16;
        border: 1px solid #1c2b3d;
        border-radius: 4px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }
      .lab-bp-vis-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .lab-bp-vis-fallback {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        color: #475569;
        font-size: 10.5px;
        font-weight: 700;
      }
      .lab-bp-vis-fallback small { font-size: 8.5px; color: #334155; }

      .lab-bp-meta-tbl {
        width: 100%;
        border-collapse: collapse;
        font-size: 10px;
      }
      .lab-bp-meta-tbl td {
        padding: 4px 0;
        border-bottom: 1px solid #141e2b;
      }
      .lab-bp-meta-tbl td:first-child { color: #64748b; width: 110px; }
      .lab-bp-meta-tbl td:last-child { color: #f1f5f9; font-weight: 600; text-align: right; }
    `;
    document.head.appendChild(s);
  }
}
