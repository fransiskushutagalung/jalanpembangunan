import * as THREE from 'three';

/**
 * MissionSystem — Mengelola alur kerja misi:
 * 1. Setiap wilayah geologi memiliki Benda Unik 3D (Unique Artifact / Specimen) di tanah.
 * 2. Radar Hermes Transport secara otomatis mendeteksi benda unik dalam jangkauan.
 * 3. Benda unik otomatis diambil dan dimasukkan ke dalam Kontainer Kargo Hermes.
 * 4. Hermes melaju kencang mengantar kargo ke Stasiun Lab Sains buatan GeoLab untuk diteliti.
 * 5. Checklist pencapaian riset & skor sains bertambah.
 */

/**
 * Forces all sprites (labels/billboards) inside a group to always render on top
 * of terrain and other opaque geometry, regardless of depth.
 */
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

export const REGION_SCIENCE_DATA = {
  elysium: {
    id: 'elysium',
    name: 'Elysium',
    stateOfMatter: 'solid', // Benda Padat -> Diambil dengan CAPIT (Claw)
    artifactName: 'Kristal Inti Magma (Magma Core Crystal)',
    rockType: 'Lava Basaltik & Kaldera Vulkanik',
    mineral: 'Olivin Basaltik & Silikat Magmatik',
    color: 0xff5500,
    offsetX: -8000,
    offsetY: 6000,
    significance: 'Bukti aktivitas vulkanisme termuda di Mars.',
    analysisResult: 'Komposisi: 52% Basalt, 28% Piroksen, 14% Olivin, 6% Magnetit. Suhu pendinginan magma terkonfirmasi!',
  },
  syrtis: {
    id: 'syrtis',
    name: 'Syrtis Major Planum',
    stateOfMatter: 'solid', // Benda Padat -> Diambil dengan CAPIT (Claw)
    artifactName: 'Permata Mantel Olivin (Mantle Peridotite Gem)',
    rockType: 'Perisai Lava Basalt Gelap',
    mineral: 'Plagioklas Kalsik & Piroksen Besi',
    color: 0x00ff88,
    offsetX: -6000,
    offsetY: -7000,
    significance: 'Stratigrafi evolusi mantel purba Mars.',
    analysisResult: 'Komposisi: 60% Plagioklas, 24% Klinopiroksen, 11% Ilmenit. Albedo gelap berasal dari kristalisasi lava murni!',
  },
  acidalia: {
    id: 'acidalia',
    name: 'Acidalia Planitia',
    stateOfMatter: 'liquid', // Benda Cair -> Diambil dengan SEROK (Liquid Scoop)
    artifactName: 'Fluida Akuifer Hidrotermal (Hydrothermal Brine Liquid)',
    rockType: 'Reservoir Fluida Danau & Mata Air Hidrotermal',
    mineral: 'Larutan Garam Sulfat, Smektit & Air Purba',
    color: 0x00d4ff,
    offsetX: -8000,
    offsetY: 6000,
    significance: 'Bukti cairan fluida hidrotermal bawah permukaan masa lampau.',
    analysisResult: 'Komposisi: 74% Air Larutan Garam Mg-Sulfat, 18% Asam Silikat Terlarut, 8% Klorida. Fluida cair purba terbukti!',
  },
  arabia: {
    id: 'arabia',
    name: 'Arabia Terra',
    stateOfMatter: 'solid', // Benda Padat -> Diambil dengan CAPIT (Claw)
    artifactName: 'Meteorit Logam Chondrite (Metallic Chondrite)',
    rockType: 'Breksia Kawah Tumbukan Kuno',
    mineral: 'Kerak Noachian Primitif & Logam Asteroid',
    color: 0xffb74d,
    offsetX: 6000,
    offsetY: 8000,
    significance: 'Lapisan kerak tertua Mars berusia > 4,1 miliar tahun.',
    analysisResult: 'Komposisi: 68% Breksia Impak, 19% Felsik, 10% Zirkon, 3% Nikel Murni. Berusia 4,12 miliar tahun!',
  },
  isidis: {
    id: 'isidis',
    name: 'Isidis Planitia',
    stateOfMatter: 'solid', // Benda Padat -> Diambil dengan CAPIT (Claw)
    artifactName: 'Kaca Benturan Kosmik (Impactite Tektite Glass)',
    rockType: 'Ejecta Tumbukan Asteroid Raksasa',
    mineral: 'Impactite & Magnesit Karbonat',
    color: 0xef5350,
    offsetX: 10000,
    offsetY: -2000,
    significance: 'Material lontaran mantel dalam akibat benturan kosmik.',
    analysisResult: 'Komposisi: 48% Karbonat Magnesit, 35% Shocked Quartz, 12% Nikel-Besi. Terbentuk dari impak asteroid 1.500 km!',
  },
  hesperia: {
    id: 'hesperia',
    name: 'Hesperia Planum',
    stateOfMatter: 'liquid', // Benda Cair -> Diambil dengan SEROK (Liquid Scoop)
    artifactName: 'Fluida Geotermal Celah Pematang (Liquid Geothermal Brine)',
    rockType: 'Kolam Fluida Mineral Geotermal Celah Tektonik',
    mineral: 'Fluida Kaya Besi, Sulfida & Zeolit Terlarut',
    color: 0x66bb6a,
    offsetX: 3000,
    offsetY: -10000,
    significance: 'Penanda sirkulasi fluida geotermal pasca-kompresi tektonik global.',
    analysisResult: 'Komposisi: 62% Larutan Besi-Sulfat, 22% Zeolit Koloid, 16% Senyawa Karbonat. Sumber geotermal aktif!',
  },
};

export class MissionSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {import('../geo/coords.js').GeoFrame} frame
   * @param {import('../terrain/heightfield.js').Heightfield} hf
   * @param {Function} getReliefAt
   */
  constructor(scene, frame, hf, getReliefAt) {
    this.scene = scene;
    this.frame = frame;
    this.hf = hf;
    this.getReliefAt = getReliefAt;

    // State Alur Misi
    this.activeWaypoint = null;    // Waypoint yang ditandai Ares Mapper
    this.labStation = null;        // Stasiun Lab Sains buatan GeoLab
    this.transportCargo = null;    // Muatan kontainer Hermes: { name, mineral, regionId, ... }
    this.transportState = 'idle';  // 'idle' | 'moving_to_target' | 'loading' | 'carrying_to_lab' | 'delivered'

    // Radar Scanning System
    this.radarRadius = 140; // meter (jangkauan deteksi radar Hermes)
    this.radarMesh = null;
    this._radarTime = 0;

    // Koleksi Benda Unik 3D di Medan
    this.artifacts = [];

    // Statistik & Poin Sains
    this.researchScore = 0;
    this.samplesAnalyzedCount = 0;

    // Quest Checklist
    this.quests = [
      { id: 'build_lab', title: 'Bangun Stasiun Lab Sains (GeoLab)', completed: false },
      { id: 'radar_pickup', title: 'Radar Hermes Deteksi & Ambil Benda Unik', completed: false },
      { id: 'deliver_lab', title: 'Hermes Kirim Kontainer ke Stasiun Lab', completed: false },
      { id: 'elysium_sample', title: 'Riset Kristal Magma Elysium', completed: false },
      { id: 'acidalia_sample', title: 'Riset Es Hidrotermal Acidalia', completed: false },
      { id: 'arabia_sample', title: 'Riset Meteorit Logam Arabia', completed: false },
      { id: 'isidis_sample', title: 'Riset Kaca Tektite Isidis', completed: false },
    ];

    // Notification callbacks
    this.onNotify = () => {};
    this.onStateChange = () => {};
    this.onTaskComplete = () => {};  // Visual Perception callback

    this.#initUniqueArtifacts();
    this.#initTransportRadar();
  }

  getElevation(X, Y) {
    let el = this.hf.sample(X, Y);
    if (this.getReliefAt) el += this.getReliefAt(X, Y);
    return el;
  }

  /* ---------------------------------------------------------
   * 1. MEMBUAT BENDA UNIK 3D DI SETIAP TITIK WILAYAH GEOLOGI
   * --------------------------------------------------------- */
  #initUniqueArtifacts() {
    const centerX = (this.hf.left + this.hf.left + this.hf.cols * this.hf.cell) / 2;
    const centerY = (this.hf.top + this.hf.top - this.hf.rows * this.hf.cell) / 2;

    for (const key of Object.keys(REGION_SCIENCE_DATA)) {
      const data = REGION_SCIENCE_DATA[key];
      const projX = Math.max(this.hf.minX + 800, Math.min(this.hf.maxX - 800, centerX + data.offsetX));
      const projY = Math.max(this.hf.minY + 800, Math.min(this.hf.maxY - 800, centerY + data.offsetY));
      const elev = this.getElevation(projX, projY);
      const w = this.frame.toWorld(projX, projY, elev);

      const group = new THREE.Group();
      group.position.set(w.x, w.y, w.z);

      // Model 3D Khusus untuk Benda Unik berdasarkan jenisnya
      const artifactMesh = this.#createArtifactMesh(data.id, data.color);
      artifactMesh.position.y = 15;
      group.add(artifactMesh);

      // Cincin pendar dasar di tanah
      const ringMat = new THREE.MeshBasicMaterial({ color: data.color, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
      const ring = new THREE.Mesh(new THREE.RingGeometry(18, 22, 24), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 1.5;
      group.add(ring);

      // Suar pilar cahaya vertikal lembut
      const beamMat = new THREE.MeshBasicMaterial({ color: data.color, transparent: true, opacity: 0.35 });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 3, 180, 8), beamMat);
      beam.position.y = 90;
      group.add(beam);

      // Label Billboard Melayang
      const matterTag = data.stateOfMatter === 'solid' ? '💎 [PADAT]' : '🌊 [CAIR]';
      const label = this.#createFloatingLabel(`${matterTag} ${data.artifactName}`, '#' + new THREE.Color(data.color).getHexString());
      label.position.y = 195;
      group.add(label);

      forceSpritesOnTop(group);
      this.scene.add(group);

      this.artifacts.push({
        id: data.id,
        name: data.artifactName,
        regionName: data.name,
        stateOfMatter: data.stateOfMatter || 'solid', // 'solid' | 'liquid'
        mineral: data.mineral,
        rockType: data.rockType,
        color: data.color,
        analysisResult: data.analysisResult,
        X: projX,
        Y: projY,
        group,
        artifactMesh,
        collected: false,
      });
    }
  }

  #createArtifactMesh(regionId, color) {
    const hexColor = new THREE.Color(color);

    if (regionId === 'elysium') {
      // PADAT: Kristal Inti Magma (Octahedron kristal obsidian menyala lava)
      const group = new THREE.Group();
      const geo = new THREE.OctahedronGeometry(15, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x220500,
        emissive: 0xff3300,
        emissiveIntensity: 2.2,
        roughness: 0.2,
        metalness: 0.9,
      });
      group.add(new THREE.Mesh(geo, mat));
      // Kerikil kristal basal padat di sekelilingnya
      for (let i = 0; i < 4; i++) {
        const mini = new THREE.Mesh(new THREE.DodecahedronGeometry(4, 0), mat);
        mini.position.set(Math.sin(i * 1.57) * 12, -4, Math.cos(i * 1.57) * 12);
        group.add(mini);
      }
      return group;
    } else if (regionId === 'acidalia') {
      // CAIR: Akuifer Fluida Hidrotermal (Kolam Fluida Danau Berpendar Cyan Bergelombang)
      const group = new THREE.Group();
      // Bak/kawah penampung fluida purba
      const basinMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8, metalness: 0.2 });
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(18, 14, 6, 24), basinMat);
      basin.position.y = -3;
      group.add(basin);

      // Permukaan fluida cair cyan bergelombang (rippling brine pool)
      const fluidMat = new THREE.MeshStandardMaterial({
        color: 0x00d4ff,
        emissive: 0x0088cc,
        emissiveIntensity: 1.6,
        roughness: 0.05,
        metalness: 0.9,
        transparent: true,
        opacity: 0.88,
      });
      const fluidSurface = new THREE.Mesh(new THREE.CylinderGeometry(16.5, 16.5, 1.2, 24), fluidMat);
      fluidSurface.position.y = 0.5;
      group.add(fluidSurface);

      // Gelembung fluida hidrotermal meletup ke atas
      for (let i = 0; i < 3; i++) {
        const bubble = new THREE.Mesh(
          new THREE.SphereGeometry(2.5, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0x88eeff, transparent: true, opacity: 0.75 })
        );
        bubble.position.set((i - 1) * 6, 4 + i * 2, (i % 2 === 0 ? 3 : -3));
        group.add(bubble);
      }
      return group;
    } else if (regionId === 'arabia') {
      // PADAT: Fragmen Meteorit Logam (Dodecahedron kromium gelap berkilau)
      const geo = new THREE.DodecahedronGeometry(14, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x3d3a44,
        emissive: 0xffb74d,
        emissiveIntensity: 0.8,
        roughness: 0.25,
        metalness: 0.95,
      });
      return new THREE.Mesh(geo, mat);
    } else if (regionId === 'isidis') {
      // PADAT: Kaca Tektite Kosmik (TorusKnot emas-merah)
      const geo = new THREE.TorusKnotGeometry(10, 3.2, 48, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff4422,
        emissive: 0xff8800,
        emissiveIntensity: 1.8,
        roughness: 0.2,
        metalness: 0.7,
      });
      return new THREE.Mesh(geo, mat);
    } else if (regionId === 'syrtis') {
      // PADAT: Permata Mantel Olivin (Octahedron zamrud hijau berkilau)
      const geo = new THREE.OctahedronGeometry(15, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x00aa55,
        emissive: 0x00ff88,
        emissiveIntensity: 2.0,
        roughness: 0.15,
        metalness: 0.85,
      });
      return new THREE.Mesh(geo, mat);
    } else {
      // CAIR: Kolam Fluida Geotermal Celah Pematang Hesperia
      const group = new THREE.Group();
      const basinMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.7 });
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(17, 13, 5, 20), basinMat);
      basin.position.y = -2.5;
      group.add(basin);

      const fluidMat = new THREE.MeshStandardMaterial({
        color: 0x66bb6a,
        emissive: 0x33aa44,
        emissiveIntensity: 1.5,
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.85,
      });
      const fluid = new THREE.Mesh(new THREE.CylinderGeometry(15.5, 15.5, 1.0, 20), fluidMat);
      fluid.position.y = 0.2;
      group.add(fluid);
      return group;
    }
  }

  /* ---------------------------------------------------------
   * 2. VISUAL RADAR RANGE PADA HERMES TRANSPORT
   * --------------------------------------------------------- */
  #initTransportRadar() {
    // Visual Cincin Gelombang Radar Scanner di sekeliling Hermes
    const radarGeo = new THREE.RingGeometry(this.radarRadius * 0.92, this.radarRadius, 48);
    const radarMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.radarMesh = new THREE.Mesh(radarGeo, radarMat);
    this.radarMesh.rotation.x = -Math.PI / 2;
    this.radarMesh.position.y = 2;
    this.radarMesh.visible = true;
    this.scene.add(this.radarMesh);
  }

  /* ---------------------------------------------------------
   * 3. ARES MAPPER: TANDAI WAYPOINT SAMPEL (BENDA BATUAN MENONJOL)
   * --------------------------------------------------------- */
  markSampleWaypoint(roverPhysics, currentRegionId = null) {
    if (this.activeWaypoint && this.activeWaypoint.mesh) {
      this.scene.remove(this.activeWaypoint.mesh);
    }

    // Tempatkan benda menonjol sedikit di depan haluan Mapper agar langsung terlihat
    const forwardDist = 32;
    const X = roverPhysics.X + Math.sin(roverPhysics.heading) * forwardDist;
    const Y = roverPhysics.Y + Math.cos(roverPhysics.heading) * forwardDist;
    const elev = this.getElevation(X, Y);
    const w = this.frame.toWorld(X, Y, elev);

    const regionInfo = REGION_SCIENCE_DATA[currentRegionId] || {
      name: 'Singkapan Kawah Jezero',
      mineral: 'Batuan Sedimen Karbonat & Lempung Smektit',
      artifactName: 'Batuan Sedimen Karbonat Delta (Benda Menonjol)',
      analysisResult: 'Kaya akan lempung smektit berpotensi mengawetkan biosignature purba Mars!',
      color: 0x00d4ff,
    };

    const group = new THREE.Group();
    group.position.set(w.x, w.y, w.z);

    // 1. FORMATION BATUAN MENONJOL DI TANAH (Prominent Outcrop Rocks)
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x3d271d,
      roughness: 0.9,
      metalness: 0.1,
    });
    // Batuan dasar menonjol
    const baseRock = new THREE.Mesh(new THREE.DodecahedronGeometry(12, 1), rockMat);
    baseRock.scale.set(1.4, 0.8, 1.2);
    baseRock.position.y = 4;
    group.add(baseRock);

    // 2. KRISTAL / SPESIMEN MENONJOL YANG SIAP DICAPIT HERMES
    const crystalGeo = new THREE.OctahedronGeometry(9, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x00aacc,
      emissive: 0x00e5ff,
      emissiveIntensity: 2.2,
      roughness: 0.15,
      metalness: 0.85,
    });
    const prominentRock = new THREE.Mesh(crystalGeo, crystalMat);
    prominentRock.position.set(0, 14, 0);
    group.add(prominentRock);

    // 3. Cincin Pendar Penanda di Tanah
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(18, 22, 24), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 1.5;
    group.add(ring);

    // 4. Suar Pilar Cahaya Vertikal
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.45 });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 3, 220, 8), beamMat);
    beam.position.y = 110;
    group.add(beam);

    // 5. Label Billboard Melayang
    const label = this.#createFloatingLabel(`💎 BATUAN MENONJOL: ${regionInfo.artifactName}`, '#00e5ff');
    label.position.y = 230;
    group.add(label);

    forceSpritesOnTop(group);
    this.scene.add(group);

    this.activeWaypoint = {
      id: currentRegionId || 'jezero_waypoint',
      X,
      Y,
      worldPos: w,
      mesh: group,
      prominentRock,
      regionId: currentRegionId || 'jezero_delta',
      regionName: regionInfo.name,
      artifactName: regionInfo.artifactName,
      stateOfMatter: 'solid',
      mineral: regionInfo.mineral,
      analysisResult: regionInfo.analysisResult,
      isWaypoint: true,
    };

    this.onNotify(`💎 [Ares Mapper] Benda Batuan Menonjol ditemukan di ${regionInfo.name}! Siap diambil Hermes.`);
    this.onStateChange();

    // Dokumentasi Visual Snapshot & Depth Camera untuk Task Pemetaan Ares Mapper
    if (typeof this.onTaskComplete === 'function') {
      this.onTaskComplete({
        taskId: `MAP-WP-${Date.now()}`,
        roverId: '01',
        roverName: 'Ares Mapper',
        roverRole: 'surface-mapping',
        description: `Pemetaan & Penemuan Batuan Menonjol: ${regionInfo.artifactName}`,
        regionId: currentRegionId || 'jezero_delta',
        regionName: regionInfo.name,
        roverPhysics: { ...roverPhysics },
        mineral: regionInfo.mineral,
        analysisResult: regionInfo.analysisResult,
      });
    }

    return this.activeWaypoint;
  }

  /* ---------------------------------------------------------
   * 4. PANGGIL HERMES TRANSPORT MENUJU TARGET TERDEKAT
   * Mendukung Pendorong Supersonik (atau Sub-Orbital Drop bila jarak > 10 km)
   * --------------------------------------------------------- */
  callTransportToWaypoint(instantDrop = false) {
    if (this.activeWaypoint) {
      if (instantDrop && this.rovers?.[2]) {
        this.rovers[2].physics.setPosition(this.activeWaypoint.X - 35, this.activeWaypoint.Y - 35);
        this.onNotify(`🚀 [Sub-Orbital Drop] Hermes Container mendarat tepat di samping Waypoint!`);
      }
      this.transportState = 'moving_to_target';
      this.targetDestination = { X: this.activeWaypoint.X, Y: this.activeWaypoint.Y, type: 'waypoint' };
      this.onNotify(`🚀 [Hermes Transport] Pendorong Roket Menyala! Meluncur supersonik menuju waypoint...`);
      this.onStateChange();
      return true;
    }

    // Jika belum ada waypoint, cari Benda Unik terdekat yang belum diambil
    const uncollected = this.artifacts.filter(a => !a.collected);
    if (uncollected.length > 0) {
      const target = uncollected[0];
      if (instantDrop && this.rovers?.[2]) {
        this.rovers[2].physics.setPosition(target.X - 35, target.Y - 35);
        this.onNotify(`🚀 [Sub-Orbital Drop] Hermes Container mendarat tepat di dekat ${target.name}!`);
      }
      this.transportState = 'moving_to_target';
      this.targetDestination = { X: target.X, Y: target.Y, type: 'artifact', artifact: target };
      this.onNotify(`🚀 [Hermes Transport] Pendorong Roket Menyala! Mengunci ${target.name}...`);
      this.onStateChange();
      return true;
    }

    this.onNotify(`[Info] Semua benda unik sudah diambil atau tandai waypoint baru dengan Ares Mapper!`);
    return false;
  }

  /* ---------------------------------------------------------
   * 5. CURIOSITY GEOLAB: MEMBANGUN STASIUN LAB SAINS 3D
   * --------------------------------------------------------- */
  buildScienceLab(roverPhysics) {
    if (this.labStation) {
      this.onNotify(`[GeoLab] Stasiun Lab Sains sudah aktif berdiri!`);
      return this.labStation;
    }

    const X = roverPhysics.X;
    const Y = roverPhysics.Y;
    const elev = this.getElevation(X, Y);
    const w = this.frame.toWorld(X, Y, elev);

    const labGroup = new THREE.Group();
    labGroup.position.set(w.x, w.y, w.z);

    // 1. Kubah Bio-Dome Riset Sains
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xeeece6,
      emissive: 0x112233,
      emissiveIntensity: 0.5,
      roughness: 0.25,
      metalness: 0.6,
      transparent: true,
      opacity: 0.94,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(65, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    labGroup.add(dome);

    // Kaca Cincin Heksagonal
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00aacc, emissiveIntensity: 1.4 });
    const winRing = new THREE.Mesh(new THREE.TorusGeometry(52, 4, 8, 24), glassMat);
    winRing.rotation.x = -Math.PI / 2;
    winRing.position.y = 35;
    labGroup.add(winRing);

    // Modul Airlock Masuk
    const airlockMat = new THREE.MeshStandardMaterial({ color: 0x33333b, roughness: 0.5, metalness: 0.8 });
    const airlock = new THREE.Mesh(new THREE.BoxGeometry(35, 25, 45), airlockMat);
    airlock.position.set(0, 12, 60);
    labGroup.add(airlock);

    // 2. Docking Cargo Pad (Platform Pembongkaran Kargo Hermes)
    const padMat = new THREE.MeshStandardMaterial({ color: 0x242428, roughness: 0.8, metalness: 0.5 });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(42, 44, 6, 24), padMat);
    pad.position.set(75, 3, 20);
    labGroup.add(pad);

    const padRingMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide });
    const padRing = new THREE.Mesh(new THREE.RingGeometry(32, 36, 24), padRingMat);
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.set(75, 6.2, 20);
    labGroup.add(padRing);

    // Menara Pemancar Komunikasi
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(2, 4, 140, 8), airlockMat);
    mast.position.set(-45, 70, -35);
    labGroup.add(mast);

    const beaconLight = new THREE.PointLight(0x00d4ff, 4, 800);
    beaconLight.position.set(0, 100, 0);
    labGroup.add(beaconLight);

    const labLabel = this.#createFloatingLabel('🔬 MARS SCIENCE LAB ALPHA (READY)', '#00ff88');
    labLabel.position.y = 135;
    labGroup.add(labLabel);

    forceSpritesOnTop(labGroup);
    this.scene.add(labGroup);

    this.labStation = {
      X,
      Y,
      worldPos: w,
      mesh: labGroup,
      name: 'Mars Science Lab Alpha',
      dockX: X + 75,
      dockY: Y + 20,
    };

    this.completeQuest('build_lab');
    this.onNotify(`🎉 [GeoLab] Stasiun Lab Sains Alpha berhasil didirikan! Siap meneliti spesimen.`);
    this.onStateChange();

    // Dokumentasi Visual Snapshot & Depth Camera untuk Pembangunan Lab Sains oleh GeoLab
    if (typeof this.onTaskComplete === 'function') {
      this.onTaskComplete({
        taskId: `BUILD-LAB-${Date.now()}`,
        roverId: '02',
        roverName: 'Curiosity GeoLab',
        roverRole: 'geological-investigation',
        description: `Pembangunan Stasiun Lab Sains Lapangan di Mars`,
        regionId: 'science-base',
        regionName: 'Stasiun Lab Sains Alpha',
        roverPhysics: { ...roverPhysics },
        mineral: 'Struktur Komposit Modular & Reaktor Nuklir RTG',
        analysisResult: 'Laboratorium Sains beroperasi penuh dengan inkubator batuan & spektrometer laser!',
      });
    }

    // Jika Hermes sudah memegang kargo di kontainernya, langsung perintahkan Hermes ke Lab!
    if (this.transportCargo) {
      this.transportState = 'carrying_to_lab';
      this.onNotify(`[Hermes Transport] Stasiun Lab terdeteksi! Meluncur kencang mengantar kargo ke Lab...`);
    }

    return this.labStation;
  }

  /* ---------------------------------------------------------
   * 6. UPDATE SIMULASI RADAR & ALUR KERJA (DIPANGGIL TIAP FRAME)
   * --------------------------------------------------------- */
  update(dt, rovers) {
    this._radarTime += dt;
    const transportRover = rovers[2]; // Hermes Transport
    if (!transportRover) return;

    const tPhys = transportRover.physics;
    const hooks = transportRover.mesh?.userData?.roleHooks;

    // A. Update Visual Cincin Radar di sekeliling Hermes
    if (this.radarMesh) {
      const w = this.frame.toWorld(tPhys.X, tPhys.Y, tPhys.elevation);
      this.radarMesh.position.set(w.x, w.y + 3, w.z);
      // Denyut radar berirama
      const scalePulse = 1.0 + 0.12 * Math.sin(this._radarTime * 3.5);
      this.radarMesh.scale.set(scalePulse, scalePulse, scalePulse);
      this.radarMesh.material.opacity = 0.25 + 0.15 * Math.sin(this._radarTime * 3.5);
    }

    // B. Animasi Benda Unik di Tanah (Berputar & Melayang)
    for (const art of this.artifacts) {
      if (!art.collected && art.artifactMesh) {
        art.artifactMesh.rotation.y += dt * 1.5;
        art.artifactMesh.rotation.x = Math.sin(this._radarTime * 2.0) * 0.2;
        art.artifactMesh.position.y = 15 + Math.sin(this._radarTime * 2.5 + art.color) * 5;
      }
    }

    // C. PROSES SAMPLING OTOMATIS: Capit (Benda Padat) atau Serok (Benda Cair)
    if (this.samplingProcess) {
      this.samplingProcess.timer += dt;
      const art = this.samplingProcess.artifact;
      const isSolid = art.stateOfMatter === 'solid';
      const progress = Math.min(1.0, this.samplingProcess.timer / this.samplingProcess.duration);

      // Kemudikan haluan Hermes menghadap tepat ke benda yang diambil
      if (art) {
        const dx = art.X - tPhys.X;
        const dy = art.Y - tPhys.Y;
        const targetHeading = Math.atan2(dx, dy);
        let diff = targetHeading - tPhys.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        tPhys.heading += diff * Math.min(1.0, 6 * dt);
      }

      // Rem halus Hermes selama mengambil sampel
      tPhys.speed *= Math.exp(-5 * dt);

      if (hooks) {
        hooks.samplingMode = isSolid ? 'claw' : 'scoop';
        hooks.samplingProgress = progress;
      }

      // Animasi getar/angkat objek saat dicapit/diserok
      if (art.artifactMesh) {
        if (progress > 0.45 && progress < 0.85) {
          art.artifactMesh.position.y = 15 + (progress - 0.45) * 55;
        }
      } else if (art.prominentRock) {
        if (progress > 0.45 && progress < 0.85) {
          art.prominentRock.position.y = 14 + (progress - 0.45) * 55;
        }
      }

      if (this.samplingProcess.timer >= this.samplingProcess.duration) {
        // PROSES PENGAMBILAN SELESAI -> Masuk ke kontainer!
        if (art.collected !== undefined) art.collected = true;
        if (art.group) this.scene.remove(art.group);
        if (art.mesh) this.scene.remove(art.mesh);
        if (this.activeWaypoint && this.activeWaypoint === art) {
          this.activeWaypoint = null;
        }

        this.transportCargo = {
          id: art.id || 'jezero_delta',
          name: art.artifactName || art.name,
          stateOfMatter: art.stateOfMatter || 'solid',
          regionName: art.regionName,
          mineral: art.mineral,
          rockType: art.rockType || 'Batuan Sedimen Delta',
          analysisResult: art.analysisResult,
        };

        if (hooks) {
          hooks.samplingMode = 'idle';
          hooks.samplingProgress = 0;
          if (hooks.cargoSpecimen) hooks.cargoSpecimen.visible = true;
        }

        this.completeQuest('radar_pickup');

        const actionText = isSolid ? 'MENCAPIT BATUAN MENONJOL' : 'MENYEROK BENDA CAIR';
        this.onNotify(`🦾 [${actionText} SUKSES] ${art.artifactName || art.name} terangkat & masuk ke Kontainer Hermes!`);

        // Dokumentasi Visual Snapshot & Depth Camera untuk Task Pengambilan
        if (typeof this.onTaskComplete === 'function') {
          this.onTaskComplete({
            taskId: `SAMPLE-${(art.id || 'SP').toUpperCase()}-${Date.now()}`,
            roverId: '03',
            roverName: 'Hermes Transport',
            roverRole: 'transport-support',
            description: isSolid
              ? `Pengambilan Batuan Menonjol via Capit Hidrolik: ${art.artifactName || art.name}`
              : `Pengambilan Benda Cair via Serok Suction: ${art.name}`,
            regionId: art.id || 'jezero_delta',
            regionName: art.regionName,
            roverPhysics: { ...tPhys },
            mineral: art.mineral,
            analysisResult: art.analysisResult,
          });
        }

        this.samplingProcess = null;

        // SETELAH DIAMBIL -> LANGSUNG MELUNCUR KE STASIUN LAB!
        if (this.labStation) {
          this.transportState = 'carrying_to_lab';
          this.onNotify(`🚀 [Hermes Container] Membawa spesimen ke Lab! Tekan B pada GeoLab jika belum ada Lab.`);
        } else {
          this.transportState = 'idle';
          this.onNotify(`⚠️ [Perhatian] Spesimen aman di Kontainer! Gunakan Robot 02 (GeoLab) tekan B untuk mendirikan Lab Sains.`);
        }
        this.onStateChange();
      }
    } else if (!this.transportCargo) {
      // 1. Deteksi Waypoint Batuan Menonjol Ares Mapper jika didekati
      if (this.activeWaypoint && !this.samplingProcess) {
        const distW = Math.hypot(tPhys.X - this.activeWaypoint.X, tPhys.Y - this.activeWaypoint.Y);
        if (distW < 75.0) {
          // MEMULAI ANIMASI PENCAPITAN BATUAN MENONJOL DI WAYPOINT
          this.samplingProcess = {
            artifact: this.activeWaypoint,
            timer: 0,
            duration: 2.2, // 2.2 detik animasi pencapitan nyata
          };

          if (hooks) {
            hooks.samplingMode = 'claw';
            hooks.samplingProgress = 0;
          }

          this.onNotify(`🦾 [ROBOTIC CLAW] Mengunci Batuan Menonjol! Lengan capit Hermes menjulur mencapit batuan...`);
        }
      }

      // 2. Deteksi Benda Unik Wilayah jika didekati
      if (!this.samplingProcess) {
        for (const art of this.artifacts) {
          if (art.collected) continue;

          const dist = Math.hypot(tPhys.X - art.X, tPhys.Y - art.Y);
          // Jika terpantau dalam jangkauan radar Hermes (< radarRadius)
          if (dist < 75.0) {
            // MEMULAI PROSEDUR PENGAMBILAN DENGAN CAPIT ATAU SEROK
            const isSolid = art.stateOfMatter === 'solid';
            this.samplingProcess = {
              artifact: art,
              timer: 0,
              duration: 2.2, // 2.2 detik animasi pencapitan / penyerokan realistis
            };

            if (hooks) {
              hooks.samplingMode = isSolid ? 'claw' : 'scoop';
              hooks.samplingProgress = 0;
            }

            if (isSolid) {
              this.onNotify(`🦾 [ROBOTIC CLAW] Mengunci ${art.name} (Benda Padat)! Lengan hidrolik menjulur mencapit...`);
            } else {
              this.onNotify(`🥄 [SUCTION SCOOP] Mengunci ${art.name} (Benda Cair)! Lengan serok menjulur menciduk fluida...`);
            }
            break;
          }
        }
      }
    }

    // D. NAVIGASI OTOMATIS SUPER-CEPAT HERMES: MENUJU TARGET (Bila sedang dipanggil)
    if (this.transportState === 'moving_to_target' && this.targetDestination) {
      const dx = this.targetDestination.X - tPhys.X;
      const dy = this.targetDestination.Y - tPhys.Y;
      const dist = Math.hypot(dx, dy);

      // Kemudikan Hermes melaju hiper-cepat dengan pendorong roket kargo
      this.#driveHermesFast(tPhys, this.targetDestination.X, this.targetDestination.Y, dt);

      if (dist < 40.0) {
        this.targetDestination = null;
      }
    }

    // E. NAVIGASI OTOMATIS SUPER-CEPAT HERMES: MENGANTAR KE STASIUN LAB
    else if (this.transportState === 'carrying_to_lab') {
      if (!this.labStation) {
        tPhys.speed *= Math.exp(-3 * dt);
        return;
      }

      const dx = this.labStation.dockX - tPhys.X;
      const dy = this.labStation.dockY - tPhys.Y;
      const dist = Math.hypot(dx, dy);

      // Kemudikan Hermes melaju hiper-cepat ke Docking Pad Lab
      this.#driveHermesFast(tPhys, this.labStation.dockX, this.labStation.dockY, dt);

      // Begitu sampai di Docking Pad Lab (< 42m)
      if (dist < 42.0) {
        tPhys.speed = 0;
        this.#deliverCargoToLab(hooks);
      }
    }
  }

  /* ---------------------------------------------------------
   * 7. LOGIKA KEMUDI SUPERSONIK & GESIT UNTUK HERMES TRANSPORT
   * Menggunakan pendorong jet roket adaptif:
   * Jarak jauh (> 1500m): melesat hingga 500-600 m/s (~1.800 km/jam)
   * Jarak menengah (400-1500m): 320 m/s
   * Jarak dekat (80-400m): 160 m/s
   * Jarak docking (< 80m): 55 m/s
   * --------------------------------------------------------- */
  #driveHermesFast(physics, targetX, targetY, dt) {
    const dx = targetX - physics.X;
    const dy = targetY - physics.Y;
    const dist = Math.hypot(dx, dy);

    const desiredHeading = Math.atan2(dx, dy);
    let diff = desiredHeading - physics.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    // Arah kemudi terkunci presisi tanpa goyang
    physics.heading += diff * Math.min(1.0, 7.5 * dt);

    // Kecepatan adaptif supersonik
    let targetSpeed = 55;
    if (dist > 2500) targetSpeed = 580;
    else if (dist > 1000) targetSpeed = 420;
    else if (dist > 350) targetSpeed = 240;
    else if (dist > 80) targetSpeed = 120;

    // Tarikan akselerasi pendorong roket kontainer super cepat (260 m/s²)
    const accelRate = 260;
    const dv = Math.sign(targetSpeed - physics.speed) * Math.min(Math.abs(targetSpeed - physics.speed), accelRate * dt);
    physics.speed += dv;

    // Perbarui koordinat seketika mengikuti kecepatan tinggi
    const s = Math.sin(physics.heading), c = Math.cos(physics.heading);
    physics.X += s * physics.speed * dt;
    physics.Y += c * physics.speed * dt;
    physics.elevation = this.getElevation(physics.X, physics.Y);
    physics.status = `🚀 HYPER-DRIVE (${physics.speed.toFixed(0)} m/s)`;
  }

  /* ---------------------------------------------------------
   * 8. PENYERAHAN & ANALISIS SPESIMEN DI STASIUN LAB
   * --------------------------------------------------------- */
  #deliverCargoToLab(hooks) {
    const cargo = this.transportCargo;
    if (!cargo) return;

    this.samplesAnalyzedCount++;
    this.researchScore += 350;

    this.completeQuest('deliver_lab');
    if (cargo.id === 'elysium') this.completeQuest('elysium_sample');
    if (cargo.id === 'acidalia') this.completeQuest('acidalia_sample');
    if (cargo.id === 'arabia') this.completeQuest('arabia_sample');
    if (cargo.id === 'isidis') this.completeQuest('isidis_sample');

    // Fire Visual Perception task-complete event BEFORE clearing cargo
    this.onTaskComplete({
      taskId: `TASK-${Date.now()}-${(cargo.id || 'UNK').toUpperCase()}`,
      roverId: '03',
      roverName: 'Hermes Transport',
      roverRole: 'transport-support',
      description: `Cargo Delivered: ${cargo.name} to ${this.labStation?.name || 'Science Lab'}`,
      regionId: cargo.id || 'unknown',
      regionName: cargo.regionName || cargo.name || 'Unknown',
      roverPhysics: this.rovers?.[2]?.physics || {},
      mineral: cargo.mineral || '—',
      analysisResult: cargo.analysisResult || '—',
    });

    // Kosongkan kargo di kontainer Hermes
    this.transportCargo = null;
    this.transportState = 'delivered';
    if (hooks && hooks.cargoSpecimen) {
      hooks.cargoSpecimen.visible = false;
    }

    this.onNotify(`🔬 [ANALISIS LAB SELESAI] ${cargo.name} diteliti! ${cargo.analysisResult} (+350 Poin Sains)`);
    this.onStateChange();

    setTimeout(() => {
      this.transportState = 'idle';
      this.onStateChange();
    }, 4500);
  }

  completeQuest(questId) {
    const q = this.quests.find(item => item.id === questId);
    if (q && !q.completed) {
      q.completed = true;
      this.researchScore += 150;
      this.onNotify(`✓ TARGET TERCAPAI: ${q.title} (+150 Poin)`);
      this.onStateChange();
    }
  }

  #createFloatingLabel(text, colorHex = '#00d4ff') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(15, 10, 8, 0.90)';
    const r = 24, w = 1024, h = 192;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r); ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h); ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.fill();

    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = colorHex;
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false }));
    sprite.renderOrder = 999;
    sprite.scale.set(160, 30, 1);
    return sprite;
  }
}
