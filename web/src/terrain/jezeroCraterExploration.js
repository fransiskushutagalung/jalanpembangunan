// src/terrain/jezeroCraterExploration.js
import * as THREE from 'three';

export const JEZERO_ZONES = [
  {
    id: 'JZ-03',
    order: 1,
    name: 'Crater Floor — Máaz & Séítah',
    color: '#a78bfa',
    centerLonLat: [77.445, 18.428],
    radiusM: 4200,
    scienceFact:
      'Formasi Séítah adalah batuan kumulat kaya olivin hasil pendinginan magma lambat, sedangkan Máaz di atasnya adalah aliran lava basal.',
    mission: {
      id: 'MSN-03',
      title: 'Jangkar Geokronologi Dasar Kawah',
      status: 'IN_PROGRESS',
      nextZoneId: 'JZ-01'
    }
  },
  {
    id: 'JZ-01',
    order: 2,
    name: 'Western Fan-Delta Complex',
    color: '#facc15',
    centerLonLat: [77.385, 18.435],
    radiusM: 4500,
    scienceFact:
      'Lapisan foreset miring dan topset horizontal di Kodiak Butte membuktikan delta terbentuk saat sungai bermuara ke danau purba.',
    mission: {
      id: 'MSN-01',
      title: 'Stratigrafi Delta & Biosignature Organik',
      status: 'NOT_STARTED',
      nextZoneId: 'JZ-02'
    }
  },
  {
    id: 'JZ-02',
    order: 3,
    name: 'Marginal Carbonate Terraces',
    color: '#2dd4bf',
    centerLonLat: [77.375, 18.525],
    radiusM: 5000,
    scienceFact:
      'Sabuk batuan ini menunjukkan pita serapan spektral Mg-karbonat terkuat di Mars dari data MRO CRISM pada elevasi -2.395 m.',
    mission: {
      id: 'MSN-02',
      title: 'Triangulasi Garis Pantai Karbonat',
      status: 'NOT_STARTED',
      nextZoneId: 'JZ-04'
    }
  },
  {
    id: 'JZ-04',
    order: 4,
    name: 'Neretva & Sava Valles Inlets',
    color: '#38bdf8',
    centerLonLat: [77.305, 18.485],
    radiusM: 4800,
    scienceFact:
      'Neretva Vallis membelah dinding barat kawah untuk mengalirkan air dan sedimen dari Nili Planum.',
    mission: {
      id: 'MSN-04',
      title: 'Jalur Transportasi Sedimen Sungai Purba',
      status: 'NOT_STARTED',
      nextZoneId: 'JZ-05'
    }
  },
  {
    id: 'JZ-05',
    order: 5,
    name: 'Pliva Vallis Outlet Breach',
    color: '#22d3ee',
    centerLonLat: [77.880, 18.395],
    radiusM: 5200,
    scienceFact:
      'Elevasi ambang celah timur (~ -2.395 m) sejajar dengan transisi topset-foreset pada Western Delta.',
    mission: {
      id: 'MSN-05',
      title: 'Verifikasi Sistem Danau Open-Basin',
      status: 'NOT_STARTED',
      nextZoneId: 'JZ-06'
    }
  },
  {
    id: 'JZ-06',
    order: 6,
    name: 'Nili Planum & Rim Megabreccia',
    color: '#f59e0b',
    centerLonLat: [77.255, 18.435],
    radiusM: 5500,
    scienceFact:
      'Tumbukan Kawah Jezero mengangkat blok megabreksi kerak Noachian berumur >3,9 miliar tahun.',
    mission: {
      id: 'MSN-06',
      title: 'Ekspedisi Kerak Purba Noachian',
      status: 'NOT_STARTED',
      nextZoneId: null
    }
  }
];

export const JEZERO_POIS = [
  {
    id: 'OBJ-03B',
    zoneId: 'JZ-03',
    meshKind: 'olivine_crystal',
    hiddenName: 'Anomali Spektral Séítah #1',
    hiddenHint: 'Sinyal kristal silikat mafik terdeteksi di dasar kawah',
    name: 'South Séítah Olivine Cumulate',
    material: 'Batuan Kumulat Olivin (Fo55–68)',
    formula: '(Mg,Fe)₂SiO₄ + Augit',
    spectrometry: 'Komposisi: 58% Olivin Forsteritik, 26% Piroksen Augit, 16% Karbonat Alterasi.',
    statusTag: 'TERVERIFIKASI (MARS 2020)',
    lonLat: [77.4320, 18.4120],
    isTarget: true,
    color: '#a3e635',
    desc: 'Singkapan kristal olivin hijau-keemasan yang terbentuk dari pendinginan dapur magma secara lambat di dasar kawah.',
    science: 'Menjadi jangkar umur radiometrik mutlak untuk menentukan kapan cekungan Jezero terbentuk dan terisi air.'
  },
  {
    id: 'OBJ-03C',
    zoneId: 'JZ-03',
    meshKind: 'sample_depot',
    hiddenName: 'Anomali Regolit Máaz #2',
    hiddenHint: 'Target permukaan datar dengan reflektansi oksida besi',
    name: 'Three Forks Basalt-Regolith Core',
    material: 'Inti Regolit & Basalt Formasi Máaz',
    formula: 'Plagioklas + Piroksen + Oksida Fe-Ti',
    spectrometry: 'Komposisi: 49% Plagioklas, 34% Piroksen, 17% Oksida Fe-Ti & Debu Sulfat.',
    statusTag: 'TERVERIFIKASI (MARS 2020)',
    lonLat: [77.4150, 18.4265],
    isTarget: true,
    color: '#a78bfa',
    desc: 'Material dataran basaltik datar tempat penyimpanan tabung sampel cadangan pertama di permukaan Mars.',
    science: 'Merekam interaksi antara aliran lava basaltik Formasi Máaz dan debu atmosfer Mars modern.'
  },
  {
    id: 'OBJ-01A',
    zoneId: 'JZ-01',
    meshKind: 'layered_butte',
    hiddenName: 'Anomali Stratigrafi Delta #1',
    hiddenHint: 'Struktur lapisan miring terdeteksi di tebing barat',
    name: 'Kodiak Butte Foreset Sandstone',
    material: 'Batupasir Berlapis Delta (Topset/Foreset)',
    formula: 'SiO₂ + Fe/Mg-Smektit',
    spectrometry: 'Komposisi: 54% Butir Basaltik, 31% Lempung Fe/Mg-Smektit, 15% Semen Karbonat.',
    statusTag: 'TERVERIFIKASI (MARS 2020)',
    lonLat: [77.3925, 18.4045],
    isTarget: true,
    color: '#facc15',
    desc: 'Fragmen tebing delta dengan perlapisan miring (foreset) yang menandai batas permukaan air danau purba.',
    science: 'Membuktikan keberadaan danau tenang berumur ~3,7 miliar tahun yang dialiri sungai dari Neretva Vallis.'
  },
  {
    id: 'OBJ-01B',
    zoneId: 'JZ-01',
    meshKind: 'mudstone_slab',
    hiddenName: 'Anomali Sedimen Halus #2',
    hiddenHint: 'Sinyal emisi fluoresensi organik lemah di kaki delta',
    name: 'Wildcat Ridge Sulfate Mudstone',
    material: 'Batulumpur Kaya Sulfat & Organik',
    formula: 'CaSO₄·2H₂O + Senyawa Aromatik',
    spectrometry: 'Komposisi: 46% Gipsum/Sulfat Terhidrasi, 38% Filosilikat, 16% Karbon Organik Aromatik.',
    statusTag: 'TERVERIFIKASI (MARS 2020)',
    lonLat: [77.3860, 18.4580],
    isTarget: true,
    color: '#fbbf24',
    desc: 'Batulumpur berbutir sangat halus di bagian depan kipas delta dengan konsentrasi molekul organik tertinggi.',
    science: 'Endapan evaporasi saat danau menyusut; matriks sulfat berbutir halus sangat efektif mengawetkan biosignature.'
  },
  {
    id: 'OBJ-02A',
    zoneId: 'JZ-02',
    meshKind: 'carbonate_terrace',
    hiddenName: 'Anomali Pita Tepi Kawah #1',
    hiddenHint: 'Teras batuan terang sepanjang kontur barat laut',
    name: 'CRISM Marginal Magnesite',
    material: 'Karbonat Magnesium Garis Pantai',
    formula: 'MgCO₃ · nH₂O',
    spectrometry: 'Komposisi: 64% Magnesit (MgCO₃), 22% Olivin Teralterasi, 14% Silika Amorf.',
    statusTag: 'DETEKSI ORBITAL (MRO CRISM)',
    lonLat: [77.3850, 18.5450],
    isTarget: true,
    color: '#2dd4bf',
    desc: 'Teras batuan terang kaya magnesit di tepi dalam kawah barat laut pada elevasi garis pantai purba.',
    science: 'Merekam presipitasi karbonat langsung di tepi danau sekaligus menyerap karbon dioksida atmosfer Mars purba.'
  },
  {
    id: 'OBJ-02B',
    zoneId: 'JZ-02',
    meshKind: 'vein_rock',
    hiddenName: 'Anomali Urat Terang #2',
    hiddenHint: 'Rekahan mineral putih memotong batulumpur',
    name: 'Bright Angel Sulfate-Silica Vein',
    material: 'Batulumpur Berurat Kalsium Sulfat',
    formula: 'CaSO₄ + SiO₂ Terhidrasi',
    spectrometry: 'Komposisi: 51% Kalsium Sulfat, 29% Silika Terhidrasi, 20% Lempung Ferik.',
    statusTag: 'TERVERIFIKASI (MARS 2020)',
    lonLat: [77.3380, 18.4980],
    isTarget: false,
    color: '#34d399',
    desc: 'Singkapan batuan terang berurat mineral putih di zona transisi margin kawah.',
    science: 'Urat mineral putih membuktikan fluida hidrotermal/air tanah kaya garam pernah mengalir melalui rekahan batuan.'
  },
  {
    id: 'OBJ-04A',
    zoneId: 'JZ-04',
    meshKind: 'fluvial_boulder',
    hiddenName: 'Anomali Ngarai Barat #1',
    hiddenHint: 'Endapan kerikil terbundarkan di mulut lembah masuk',
    name: 'Neretva Vallis Fluvial Conglomerate',
    material: 'Konglomerat Kerikil Sungai Purba',
    formula: 'Olivin Detrital + Smektit Fe/Mg',
    spectrometry: 'Komposisi: 44% Klastik Basaltik, 35% Smektit Terangkut, 21% Olivin Detrital.',
    statusTag: 'GEOMORFOLOGI (USGS SIM 3464)',
    lonLat: [77.3050, 18.4820],
    isTarget: true,
    color: '#38bdf8',
    desc: 'Endapan kerikil sungai terbundarkan di mulut ngarai Neretva Vallis yang memotong bibir barat kawah.',
    science: 'Bentuk kerikil yang membulat menunjukkan transportasi air berenergi tinggi dari dataran tinggi Nili Planum.'
  },
  {
    id: 'OBJ-05A',
    zoneId: 'JZ-05',
    meshKind: 'crater_boulder',
    hiddenName: 'Anomali Celah Timur #1',
    hiddenHint: 'Batuan dasar tergerus aliran di bibir timur',
    name: 'Pliva Vallis Spillway Breccia',
    material: 'Batuan Ambang Pelimpah Timur',
    formula: 'Basalt Tererosi + Kerikil Lag',
    spectrometry: 'Komposisi: 61% Basalt Bibir Kawah, 24% Breksi Tumbukan, 15% Kerikil Fluvial.',
    statusTag: 'INTERPRETASI ILMIAH (GOUDGE ET AL.)',
    lonLat: [77.8800, 18.3950],
    isTarget: true,
    color: '#22d3ee',
    desc: 'Material dasar ngarai pelimpah di bibir timur kawah tempat air danau meluap keluar menuju Isidis Planitia.',
    science: 'Elevasi ambang keluar (~ -2.395 m) mengunci batas tinggi maksimum permukaan air Paleolake Jezero.'
  },
  {
    id: 'OBJ-06A',
    zoneId: 'JZ-06',
    meshKind: 'megabreccia',
    hiddenName: 'Anomali Bibir Kawah #1',
    hiddenHint: 'Blok batuan masif terangkat di dinding barat',
    name: 'Noachian Rim Megabreccia Block',
    material: 'Megabreksi Kerak Purba (>3,9 Ga)',
    formula: 'Klorit + Serpentin + Piroksen',
    spectrometry: 'Komposisi: 42% Piroksen Rendah-Ca, 33% Klorit & Serpentin, 25% Plagioklas.',
    statusTag: 'RENCANA MISI (MARS 2020)',
    lonLat: [77.2650, 18.4620],
    isTarget: true,
    color: '#f59e0b',
    desc: 'Blok batuan kerak tertua yang terangkat dari kedalaman beberapa kilometer akibat tumbukan pembentuk Jezero.',
    science: 'Mengandung mineral serpentin dan klorit yang terbentuk oleh aktivitas hidrotermal bawah permukaan Mars purba.'
  }
];

export class JezeroCraterExploration {
  constructor(scene, hf, frame, options = {}) {
    this.scene = scene;
    this.hf = hf;
    this.frame = frame;
    this.getRovers = options.getRovers || (() => []);
    this.getActiveRover = options.getActiveRover || (() => null);
    this.getMissionSystem = options.getMissionSystem || (() => null);
    this.onToast = options.onToast || (() => {});
    this.onInspectComplete = options.onInspectComplete || (() => {});

    this.visible = false;
    this.activeZoneId = 'JZ-03';
    this.currentZone = null;
    this.selectedPoi = null;

    this.zones = JEZERO_ZONES.map(z => ({ ...z, mission: { ...z.mission } }));
    this.pois = JEZERO_POIS.map(p => ({
      ...p,
      stage: 'UNDISCOVERED', // 'UNDISCOVERED' -> 'MAPPED' -> 'AT_LAB' -> 'RESEARCHED'
      researchedTime: null,
      projX: 0,
      projY: 0,
      worldPos: new THREE.Vector3(),
      group: null,
      outerRadarRing: null,
      innerRing: null,
      skyBeam: null,
      diamondMarker: null,
      mysteryShell: null,
      specimenMesh: null,
      sprite: null
    }));

    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'JezeroCraterExplorationGroup';
    this.rootGroup.visible = false;
    this.scene.add(this.rootGroup);

    this.zoneLines = [];
    this.clickTargets = [];

    this._buildZones3D();
    this._buildPois3D();
    this._mountIntegratedSection();
    this._mountDiscoveryPopup();
  }

  /**
   * Nama yang tampil ke pemain:
   * - Sebelum diteliti Robot B: nama samaran ("Anomali Spektral Séítah #1")
   * - Setelah diteliti Robot B: nama ilmiah asli ("South Séítah Olivine Cumulate")
   */
  _getDisplayName(poi) {
    return poi.stage === 'RESEARCHED' ? poi.name : poi.hiddenName;
  }

  _clampProj(X, Y) {
    const ext = this.hf.meta.extent;
    const pad = 250;
    return [
      Math.max(ext.left + pad, Math.min(ext.right - pad, X)),
      Math.max(ext.bottom + pad, Math.min(ext.top - pad, Y))
    ];
  }

  _buildZones3D() {
    this.zones.forEach(zone => {
      const [rawX, rawY] = this.frame.lonLatToProj(...zone.centerLonLat);
      const [cx, cy] = this._clampProj(rawX, rawY);
      zone.projX = cx;
      zone.projY = cy;

      const segments = 64;
      const pts = [];
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const [px, py] = this._clampProj(
          cx + Math.cos(a) * zone.radiusM,
          cy + Math.sin(a) * zone.radiusM
        );
        const elev = this.hf.sample(px, py);
        const w = this.frame.toWorld(px, py, elev);
        pts.push(new THREE.Vector3(w.x, w.y + 8, w.z));
      }

      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(zone.color),
        transparent: true,
        opacity: 0.42
      });
      const line = new THREE.Line(geo, mat);
      line.userData = { zone, cx, cy };
      this.rootGroup.add(line);
      this.zoneLines.push(line);
    });
  }

  _createGeologicalSpecimenMesh(poi) {
    const holder = new THREE.Group();

    if (poi.meshKind === 'olivine_crystal') {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x84cc16,
        emissive: 0x4d7c0f,
        emissiveIntensity: 0.65,
        roughness: 0.2,
        metalness: 0.15
      });
      [
        { r: 13, h: 46, x: 0, z: 0, rx: 0.08, rz: -0.05 },
        { r: 9, h: 34, x: 14, z: 7, rx: 0.28, rz: -0.22 },
        { r: 8.5, h: 31, x: -13, z: 9, rx: -0.25, rz: 0.2 },
        { r: 7, h: 26, x: 5, z: -14, rx: -0.18, rz: -0.28 }
      ].forEach(s => {
        const m = new THREE.Mesh(new THREE.ConeGeometry(s.r, s.h, 6), mat);
        m.position.set(s.x, s.h * 0.45, s.z);
        m.rotation.set(s.rx, 0.4, s.rz);
        holder.add(m);
      });
    } else if (poi.meshKind === 'layered_butte' || poi.meshKind === 'carbonate_terrace') {
      const colors =
        poi.meshKind === 'carbonate_terrace'
          ? [0xd6d3d1, 0xf5f5f4, 0xffffff]
          : [0x9a3412, 0xc2410c, 0xf59e0b];
      colors.forEach((col, i) => {
        const w = 46 - i * 9;
        const h = 9;
        const d = 36 - i * 7;
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 })
        );
        slab.position.set(i * 2.5, h * 0.5 + i * h, -i * 2);
        slab.rotation.y = 0.35;
        holder.add(slab);
      });
    } else if (poi.meshKind === 'sample_depot') {
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(20, 24, 5, 16),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 })
      );
      base.position.y = 2.5;
      holder.add(base);

      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.5,
        metalness: 0.85,
        roughness: 0.2
      });
      for (let i = -1; i <= 1; i++) {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 18, 10), tubeMat);
        tube.position.set(i * 7, 9, 0);
        tube.rotation.z = Math.PI / 2;
        holder.add(tube);
      }
    } else if (poi.meshKind === 'mudstone_slab' || poi.meshKind === 'vein_rock') {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(22, 1),
        new THREE.MeshStandardMaterial({
          color: poi.meshKind === 'vein_rock' ? 0xe2e8f0 : 0x78350f,
          roughness: 0.75
        })
      );
      rock.scale.set(1.5, 0.55, 1.2);
      rock.position.y = 10;
      holder.add(rock);

      const vein = new THREE.Mesh(
        new THREE.BoxGeometry(30, 3.5, 4),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.6
        })
      );
      vein.position.y = 16;
      vein.rotation.y = 0.5;
      holder.add(vein);
    } else {
      const mat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.8 });
      const b1 = new THREE.Mesh(new THREE.DodecahedronGeometry(22, 0), mat);
      b1.position.set(-5, 14, 2);
      const b2 = new THREE.Mesh(new THREE.DodecahedronGeometry(15, 0), mat);
      b2.position.set(14, 10, -6);
      holder.add(b1, b2);
    }

    return holder;
  }

  _buildPois3D() {
    const placed = [];

    this.pois.forEach(poi => {
      const [rawX, rawY] = this.frame.lonLatToProj(...poi.lonLat);
      let [px, py] = this._clampProj(rawX, rawY);

      for (const prev of placed) {
        if (Math.hypot(px - prev.x, py - prev.y) < 350) {
          px += 300;
          py -= 240;
        }
      }
      placed.push({ x: px, y: py });

      poi.projX = px;
      poi.projY = py;
      const elev = this.hf.sample(px, py);
      const w = this.frame.toWorld(px, py, elev);
      poi.worldPos.set(w.x, w.y, w.z);

      const group = new THREE.Group();
      group.position.copy(poi.worldPos);

      // 1. Cincin radar luas agar terlihat dari jauh
      const outerGeo = new THREE.RingGeometry(125, 142, 48);
      outerGeo.rotateX(-Math.PI / 2);
      const outerMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(poi.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55
      });
      const outerRadarRing = new THREE.Mesh(outerGeo, outerMat);
      outerRadarRing.position.y = 4;
      group.add(outerRadarRing);

      // 2. Cincin dalam
      const innerGeo = new THREE.RingGeometry(28, 38, 32);
      innerGeo.rotateX(-Math.PI / 2);
      const innerMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(poi.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });
      const innerRing = new THREE.Mesh(innerGeo, innerMat);
      innerRing.position.y = 3;
      group.add(innerRing);

      // 3. Spesimen geologi asli (awalnya kecil/samar sebelum diteliti, lalu membesar & jelas setelah diteliti)
      const specimenMesh = this._createGeologicalSpecimenMesh(poi);
      specimenMesh.scale.setScalar(0.55); // Sebelum diteliti masih tertutup debu/samar
      specimenMesh.traverse(child => {
        if (child.isMesh) {
          child.userData = { jezeroPoi: poi };
          this.clickTargets.push(child);
        }
      });
      group.add(specimenMesh);

      // 4. Selubung anomali misterius (hilang saat selesai diteliti Robot B)
      const shellGeo = new THREE.IcosahedronGeometry(26, 1);
      const shellMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(poi.color),
        wireframe: true,
        transparent: true,
        opacity: 0.65
      });
      const mysteryShell = new THREE.Mesh(shellGeo, shellMat);
      mysteryShell.position.y = 18;
      mysteryShell.userData = { jezeroPoi: poi };
      group.add(mysteryShell);
      this.clickTargets.push(mysteryShell);

      // 5. Tiang suar langit tinggi
      const beamGeo = new THREE.CylinderGeometry(2.5, 9, 420, 12);
      const beamMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(poi.color),
        transparent: true,
        opacity: 0.42
      });
      const skyBeam = new THREE.Mesh(beamGeo, beamMat);
      skyBeam.position.y = 210;
      skyBeam.userData = { jezeroPoi: poi };
      group.add(skyBeam);
      this.clickTargets.push(skyBeam);

      // 6. Berlian penanda di puncak tiang
      const diamondGeo = new THREE.OctahedronGeometry(24, 0);
      const diamondMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(poi.color) });
      const diamondMarker = new THREE.Mesh(diamondGeo, diamondMat);
      diamondMarker.position.y = 445;
      diamondMarker.userData = { jezeroPoi: poi };
      group.add(diamondMarker);
      this.clickTargets.push(diamondMarker);

      // 7. Label sprite (menampilkan nama samaran sebelum diteliti!)
      const sprite = this._makeLabelSprite(poi);
      sprite.position.y = 105;
      sprite.userData = { jezeroPoi: poi };
      group.add(sprite);
      this.clickTargets.push(sprite);

      poi.group = group;
      poi.outerRadarRing = outerRadarRing;
      poi.innerRing = innerRing;
      poi.skyBeam = skyBeam;
      poi.diamondMarker = diamondMarker;
      poi.mysteryShell = mysteryShell;
      poi.specimenMesh = specimenMesh;
      poi.sprite = sprite;
      this.rootGroup.add(group);
    });
  }

  _getStageColor(poi) {
    if (poi.stage === 'RESEARCHED') return '#10b981';
    if (poi.stage === 'AT_LAB') return '#f59e0b';
    if (poi.stage === 'MAPPED') return '#38bdf8';
    return poi.color;
  }

  _getStageBadgeText(poi) {
    if (poi.stage === 'RESEARCHED') return '✓ TERIDENTIFIKASI';
    if (poi.stage === 'AT_LAB') return '🧪 DI LAB (ROBOT B)';
    if (poi.stage === 'MAPPED') return '📦 SIAP ANGKUT (C)';
    return '? BELUM DIIDENTIFIKASI';
  }

  _updatePoiVisualColor(poi) {
    const col = this._getStageColor(poi);
    poi.outerRadarRing?.material.color.set(col);
    poi.innerRing?.material.color.set(col);
    poi.skyBeam?.material.color.set(col);
    poi.diamondMarker?.material.color.set(col);
    poi.mysteryShell?.material.color.set(col);

    // Jika sudah selesai diteliti Robot B: buka selubung anomali & perjelas/perbesar bentuk asli spesimen!
    if (poi.stage === 'RESEARCHED') {
      if (poi.mysteryShell) poi.mysteryShell.visible = false;
      if (poi.specimenMesh) poi.specimenMesh.scale.setScalar(1.35);
    }

    if (poi.sprite) {
      poi.group.remove(poi.sprite);
      const nextSprite = this._makeLabelSprite(poi);
      nextSprite.position.y = 105;
      nextSprite.userData = { jezeroPoi: poi };
      poi.group.add(nextSprite);
      poi.sprite = nextSprite;
      this.clickTargets.push(nextSprite);
    }
  }

  _makeLabelSprite(poi) {
    const canvas = document.createElement('canvas');
    canvas.width = 520;
    canvas.height = 108;
    const ctx = canvas.getContext('2d');
    const col = this._getStageColor(poi);

    ctx.fillStyle = 'rgba(13, 17, 23, 0.90)';
    ctx.strokeStyle = col;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(8, 10, 504, 88, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = poi.stage === 'RESEARCHED' ? '#10b981' : '#ffffff';
    ctx.font = 'bold 21px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this._getDisplayName(poi), 260, 46);

    ctx.fillStyle = col;
    ctx.font = 'bold 16px "IBM Plex Mono", monospace';
    ctx.fillText(`${poi.zoneId} · ${this._getStageBadgeText(poi)}`, 260, 78);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(240, 52, 1);
    return sprite;
  }

  /**
   * Sinkronisasi Meja Riset 3D (LabBackpackWorkbench) dengan status penemuan Jezero Crater
   */
  _syncWithLabWorkbench(highlightPoi = null) {
    const wb = typeof this.getLabBackpack === 'function' ? this.getLabBackpack() : window.labBackpack;
    if (!wb || typeof wb.setCustomDataset !== 'function') return;

    if (!this.visible) {
      wb.setCustomDataset(null);
      return;
    }

    const jezeroDataset = {};
    this.pois.forEach(p => {
      const isDone = p.stage === 'RESEARCHED';
      const isAtLab = p.stage === 'AT_LAB';
      jezeroDataset[p.id] = {
        artifactName: isDone ? p.name : `${p.hiddenName} (Belum Diteliti)`,
        name: `Jezero Crater · ${p.zoneId}`,
        stateOfMatter: 'solid',
        color: p.color,
        meshKind: p.meshKind,
        collected: isDone || isAtLab,
        researched: isDone,
        rockType: isDone ? p.material : 'Komposisi Belum Diketahui (Perlu Analisis Lab GeoLab)',
        mineral: isDone ? `${p.formula}` : 'Menunggu Spektrometri Laser GeoLab...',
        analysisResult: isDone ? p.spectrometry : p.hiddenHint,
        significance: isDone
          ? p.science
          : 'Tandai dengan Robot 01 (Ares), angkut dengan Robot 03 (Hermes) ke Stasiun Lab, lalu teliti dengan Robot 02 (GeoLab).'
      };
    });

    wb.setCustomDataset(jezeroDataset, highlightPoi ? highlightPoi.id : null);
  }
  _mountIntegratedSection() {
    const rightPanel = document.getElementById('robotDetailPanel');
    const questBox = rightPanel?.querySelector('.quest-box');
    if (!rightPanel || document.getElementById('jezeroIntegratedCard')) return;

    const card = document.createElement('div');
    card.id = 'jezeroIntegratedCard';
    card.className = 'quest-box';
    card.style.display = 'none';
    card.style.borderColor = '#1e3a5f';

    if (questBox) {
      rightPanel.insertBefore(card, questBox);
    } else {
      rightPanel.appendChild(card);
    }
  }

  _mountDiscoveryPopup() {
    if (document.getElementById('jezeroDiscoveryModal')) return;

    const modal = document.createElement('div');
    modal.id = 'jezeroDiscoveryModal';
    Object.assign(modal.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(5, 8, 14, 0.84)',
      backdropFilter: 'blur(6px)',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9998'
    });

    modal.innerHTML = `<div id="jezeroDiscoveryCard" style="
      width: 440px;
      max-width: 92vw;
      background: #0d1117;
      border: 1px solid #10b981;
      border-radius: 6px;
      padding: 16px;
      color: #fff;
      font-family: var(--font-sans);
      box-shadow: 0 12px 44px rgba(16, 185, 129, 0.28);
    "></div>`;

    document.body.appendChild(modal);
  }

  _getSpecimenIllustrationSVG(poi) {
    const c = poi.color;
    if (poi.meshKind === 'olivine_crystal') {
      return `<svg viewBox="0 0 220 115" width="100%" height="115" style="background:#070b12;border-radius:4px;border:1px solid #1e293b;">
        <polygon points="110,12 90,96 130,96" fill="#84cc16"/>
        <polygon points="110,12 110,96 130,96" fill="#4d7c0f"/>
        <polygon points="74,34 58,96 90,96" fill="#a3e635" opacity="0.9"/>
        <polygon points="146,36 130,96 162,96" fill="#65a30d" opacity="0.9"/>
        <circle cx="110" cy="56" r="48" fill="none" stroke="#10b981" stroke-dasharray="4 4" opacity="0.5"/>
      </svg>`;
    }
    if (poi.meshKind === 'layered_butte' || poi.meshKind === 'carbonate_terrace') {
      const topCol = poi.meshKind === 'carbonate_terrace' ? '#ffffff' : '#f59e0b';
      const midCol = poi.meshKind === 'carbonate_terrace' ? '#d6d3d1' : '#c2410c';
      return `<svg viewBox="0 0 220 115" width="100%" height="115" style="background:#070b12;border-radius:4px;border:1px solid #1e293b;">
        <polygon points="32,94 188,94 170,74 50,74" fill="#7c2d12"/>
        <polygon points="50,74 170,74 154,54 66,54" fill="${midCol}"/>
        <polygon points="66,54 154,54 140,32 80,32" fill="${topCol}"/>
        <line x1="58" y1="74" x2="152" y2="54" stroke="#00e5ff" stroke-width="1.4" stroke-dasharray="3 3"/>
      </svg>`;
    }
    return `<svg viewBox="0 0 220 115" width="100%" height="115" style="background:#070b12;border-radius:4px;border:1px solid #1e293b;">
      <polygon points="62,90 84,34 136,28 162,88" fill="#475569"/>
      <polygon points="84,34 136,28 122,90 62,90" fill="#64748b"/>
      <line x1="76" y1="56" x2="150" y2="66" stroke="#38bdf8" stroke-width="3.5"/>
      <circle cx="110" cy="58" r="44" fill="none" stroke="${c}" stroke-dasharray="3 3" opacity="0.6"/>
    </svg>`;
  }

  _showDiscoveryPopup(poi) {
    const modal = document.getElementById('jezeroDiscoveryModal');
    const card = document.getElementById('jezeroDiscoveryCard');
    if (!modal || !card) return;

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1f2937;padding-bottom:8px;margin-bottom:10px;">
        <span style="font-family:var(--font-mono);font-size:10.5px;color:#10b981;font-weight:800;">
          🔬 IDENTIFIKASI SPESIMEN GEOLAB BERHASIL
        </span>
        <span style="font-family:var(--font-mono);font-size:10px;color:#94a3b8;">${poi.zoneId}</span>
      </div>

      <div style="font-family:var(--font-mono);font-size:10px;color:#94a3b8;margin-bottom:6px;">
        Sinyal Awal: <span style="text-decoration:line-through;">${poi.hiddenName}</span> → <b style="color:#10b981;">TERIDENTIFIKASI</b>
      </div>

      ${this._getSpecimenIllustrationSVG(poi)}

      <div style="margin-top:10px;">
        <div style="font-size:15.5px;font-weight:800;color:#fff;">${poi.name}</div>
        <div style="font-family:var(--font-mono);font-size:10.5px;color:var(--data-cyan);margin:2px 0 6px;">
          ${poi.material} · [${poi.formula}]
        </div>
        <div style="font-size:11px;color:#cbd5e1;margin-bottom:6px;">${poi.spectrometry}</div>
        <div style="font-size:11.5px;color:#e2e8f0;line-height:1.45;margin-bottom:8px;">
          ${poi.desc}
        </div>
        <div style="background:#090d12;border-left:3px solid #10b981;padding:8px;border-radius:3px;font-size:11px;color:#a7f3d0;line-height:1.4;margin-bottom:12px;">
          <b>Signifikansi Ilmiah:</b> ${poi.science}
        </div>
        <div style="display:flex;gap:8px;">
          <button id="jzConfirmDiscoveryBtn" class="btn-main-action" style="flex:1;background:#059669;border-color:#10b981;">
            ✓ Simpan ke Meja Riset &amp; Update Misi
          </button>
          <button id="jzOpenWorkbenchBtn" class="btn-sec-action" style="width:auto;margin-top:0;padding:8px 10px;border-color:#00e5ff;color:#00e5ff;">
            🎒 Lihat di Meja Riset
          </button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';

    card.querySelector('#jzConfirmDiscoveryBtn').addEventListener('click', () => {
      modal.style.display = 'none';
      this._finalizeResearchAndAdvance(poi);
    });

    card.querySelector('#jzOpenWorkbenchBtn').addEventListener('click', () => {
      modal.style.display = 'none';
      this._finalizeResearchAndAdvance(poi);
      if (window.labBackpack && typeof window.labBackpack.open === 'function') {
        window.labBackpack.open();
      } else if (window.labBackpack && typeof window.labBackpack.toggle === 'function') {
        window.labBackpack.toggle();
      }
    });
  }

  _finalizeResearchAndAdvance(poi) {
    poi.stage = 'RESEARCHED';
    poi.researchedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this._updatePoiVisualColor(poi);
    this._syncWithLabWorkbench(poi);

    const zone = this.zones.find(z => z.id === poi.zoneId);
    if (zone) {
      const zoneTargets = this.pois.filter(p => p.zoneId === zone.id && p.isTarget);
      if (zoneTargets.every(t => t.stage === 'RESEARCHED')) {
        zone.mission.status = 'COMPLETED';
        if (zone.mission.nextZoneId) {
          const nextZone = this.zones.find(z => z.id === zone.mission.nextZoneId);
          if (nextZone && nextZone.mission.status === 'NOT_STARTED') {
            nextZone.mission.status = 'IN_PROGRESS';
            this.activeZoneId = nextZone.id;
          }
        }
      }
    }

    // Cek apakah SEMUA spesimen di Jezero Crater sudah berhasil diteliti!
    const allResearched = this.pois.every(p => p.stage === 'RESEARCHED');
    if (allResearched) {
      // Simpan status selesai ke localStorage
      localStorage.setItem('marsmind_map_usgs-sim-3464_completed', 'true');
      this._showVictoryDebriefModal();
    }

    const nextPoi =
      this.pois.find(p => p.zoneId === this.activeZoneId && p.stage !== 'RESEARCHED') ||
      this.pois.find(p => p.stage !== 'RESEARCHED');
    if (nextPoi) {
      this.selectedPoi = nextPoi;
      this.activeZoneId = nextPoi.zoneId;
    }

    this.onInspectComplete(poi);
    this.renderHUD();
  }

  _showVictoryDebriefModal() {
    if (document.getElementById('jezeroVictoryModal')) return;

    const modal = document.createElement('div');
    modal.id = 'jezeroVictoryModal';
    Object.assign(modal.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(3, 7, 13, 0.92)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9999'
    });

    modal.innerHTML = `
      <div style="
        width: 520px;
        max-width: 92vw;
        background: #0d1522;
        border: 2px solid #10b981;
        border-radius: 8px;
        padding: 24px;
        color: #fff;
        font-family: var(--font-sans);
        box-shadow: 0 16px 56px rgba(16, 185, 129, 0.35);
        text-align: center;
      ">
        <div style="font-size: 11px; font-weight: 800; color: #10b981; letter-spacing: 1px; margin-bottom: 8px;">
          NASA / JPL MARS 2020 MISSION CONTROL
        </div>
        <h2 style="font-size: 22px; font-weight: 900; margin: 0 0 8px; color: #f8fafc;">
          🏆 MISI JEZERO CRATER SELESAI!
        </h2>
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px;">
          Luar biasa! Seluruh 9 spesimen geologi purba di Kawah Jezero berhasil ditandai oleh Ares, diangkut oleh Hermes, dan diidentifikasi secara presisi oleh GeoLab.
        </p>

        <div style="background: #070b12; border: 1px solid #1e293b; border-radius: 6px; padding: 14px; margin-bottom: 20px; text-align: left; font-family: var(--font-mono); font-size: 11px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #cbd5e1;">
            <span>Spesimen Teranalisis:</span>
            <b style="color: #10b981;">9 / 9 (100%)</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #cbd5e1;">
            <span>Bonus Poin Sains:</span>
            <b style="color: #00e5ff;">+1,350 Poin</b>
          </div>
          <div style="display: flex; justify-content: space-between; color: #cbd5e1;">
            <span>Status Peta:</span>
            <b style="color: #10b981;">✓ SELESAI DIJELAJAHI</b>
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <button id="victoryDashboardBtn" style="
            flex: 1;
            background: #059669;
            border: 1px solid #10b981;
            color: #fff;
            padding: 10px 16px;
            border-radius: 4px;
            font-weight: 700;
            font-family: inherit;
            cursor: pointer;
            transition: background 0.15s;
          ">
            🚀 Kembali ke Dashboard Utama
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#victoryDashboardBtn').addEventListener('click', () => {
      modal.remove();
      // Buka kembali dashboard portal peta
      const dash = window.dashboardController;
      if (dash && typeof dash.show === 'function') {
        const simPanels = ['topControlBar', 'simSettingsModal', 'robotDetailPanel', 'help'];
        simPanels.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.style.display = 'none';
        });
        dash.show();
        if (window.marsGlobe) window.marsGlobe.resize();
      } else {
        window.location.reload();
      }
    });
  }

  onAresMarkSample(roverPhysics) {
    if (!this.visible || !roverPhysics) return false;

    const nearest = this._findNearestPoi(roverPhysics.X, roverPhysics.Y, 450);
    if (!nearest) {
      this.onToast('🧭 Dekati salah satu suar anomali Jezero (< 450 m) untuk menandai sampel!');
      return false;
    }

    if (nearest.stage !== 'UNDISCOVERED') {
      this.selectedPoi = nearest;
      this.renderHUD();
      return true;
    }

    nearest.stage = 'MAPPED';
    this.selectedPoi = nearest;
    this.activeZoneId = nearest.zoneId;
    this._updatePoiVisualColor(nearest);
    this.onToast(`📍 [Ares] ${nearest.hiddenName} ditandai! Tekan [C] untuk panggil Hermes mengambil sampel.`);
    this.renderHUD();
    return true;
  }

  onGeoLabResearch() {
    if (!this.visible) return false;

    const readyAtLab = this.pois.find(p => p.stage === 'AT_LAB');
    if (!readyAtLab) {
      const mapped = this.pois.find(p => p.stage === 'MAPPED');
      if (mapped) {
        this.onToast(`🚛 "${mapped.hiddenName}" belum tiba di Lab! Panggil Hermes [C] & bangun Lab [B].`);
      } else {
        this.onToast('🗺️ Belum ada sampel di Lab. Gunakan Robot 01 (Ares) untuk menandai anomali dulu!');
      }
      return false;
    }

    this._showDiscoveryPopup(readyAtLab);
    return true;
  }

  _findNearestPoi(X, Y, maxDist = Infinity) {
    let best = null;
    let minD = maxDist;
    this.pois.forEach(p => {
      const d = Math.hypot(X - p.projX, Y - p.projY);
      if (d <= minD) {
        minD = d;
        best = p;
      }
    });
    return best;
  }

  setVisible(vis) {
  this.visible = !!vis;
  this.rootGroup.visible = this.visible;
  const card = document.getElementById('jezeroIntegratedCard');
  if (card) card.style.display = this.visible ? 'block' : 'none';

  // SINKRONISASI BACKPACK
  this._syncWithLabWorkbench();

  if (this.visible) {
    this.rebuildHeights();
    this.renderHUD();
  }
}

  rebuildHeights() {
    this.pois.forEach(poi => {
      if (!poi.group) return;
      const elev = this.hf.sample(poi.projX, poi.projY);
      const w = this.frame.toWorld(poi.projX, poi.projY, elev);
      poi.worldPos.set(w.x, w.y, w.z);
      poi.group.position.copy(poi.worldPos);
    });

    this.zoneLines.forEach(line => {
      const { zone, cx, cy } = line.userData;
      const attr = line.geometry.attributes.position;
      const segments = attr.count - 1;
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const [px, py] = this._clampProj(
          cx + Math.cos(a) * zone.radiusM,
          cy + Math.sin(a) * zone.radiusM
        );
        const elev = this.hf.sample(px, py);
        const w = this.frame.toWorld(px, py, elev);
        attr.setXYZ(i, w.x, w.y + 8, w.z);
      }
      attr.needsUpdate = true;
    });
  }

  handleClick(raycaster) {
    if (!this.visible) return false;
    const hits = raycaster.intersectObjects(this.clickTargets, false);
    if (hits.length > 0) {
      const poi = hits[0].object.userData.jezeroPoi;
      if (poi) {
        this.selectedPoi = poi;
        this.activeZoneId = poi.zoneId;
        this.onToast(`🎯 Target dipilih: ${this._getDisplayName(poi)} (${poi.zoneId})`);
        this.renderHUD();
        return true;
      }
    }
    return false;
  }

  update(roverX, roverY, dt = 0.016) {
    if (!this.visible) return;

    this._pulse = (this._pulse || 0) + dt * 2.5;
    this.pois.forEach((p, idx) => {
      if (p.outerRadarRing) {
        const s = 1 + Math.sin(this._pulse + idx) * 0.14;
        p.outerRadarRing.scale.set(s, s, 1);
      }
      if (p.diamondMarker) {
        p.diamondMarker.rotation.y += dt * 1.8;
        p.diamondMarker.position.y = 445 + Math.sin(this._pulse * 1.5 + idx) * 14;
      }
      if (p.mysteryShell && p.mysteryShell.visible) {
        p.mysteryShell.rotation.y -= dt * 1.2;
        p.mysteryShell.rotation.x += dt * 0.6;
      }
    });

    const rovers = this.getRovers();
    const hermes = rovers[2];
    const ms = this.getMissionSystem();

    if (hermes) {
      this.pois.forEach(p => {
        if (p.stage === 'MAPPED') {
          const dHermes = Math.hypot(hermes.physics.X - p.projX, hermes.physics.Y - p.projY);
          if (dHermes <= 380 && ms?.labStation) {
            p.stage = 'AT_LAB';
            this._updatePoiVisualColor(p);
            this._syncWithLabWorkbench();
            this.onToast(`🚛→🧪 [Hermes] "${p.hiddenName}" tiba di Stasiun Lab! Pindah ke Robot 02 (GeoLab) & tekan [Space] untuk identifikasi.`);
            this.renderHUD();
          }
        }
      });
    }

    let closestZone = this.zones[0];
    let minZDist = Infinity;
    this.zones.forEach(z => {
      const d = Math.hypot(roverX - z.projX, roverY - z.projY);
      if (d < minZDist) {
        minZDist = d;
        closestZone = z;
      }
    });

    if (closestZone && this.currentZone?.id !== closestZone.id) {
      this.currentZone = closestZone;
      if (closestZone.mission.status === 'NOT_STARTED') {
        closestZone.mission.status = 'IN_PROGRESS';
      }
      this.renderHUD();
    }

    const target = this.selectedPoi || this.pois.find(p => p.zoneId === this.activeZoneId);
    const distEl = document.getElementById('jzTargetDistBadge');
    if (distEl && target) {
      const d = Math.hypot(roverX - target.projX, roverY - target.projY);
      distEl.textContent = d >= 1000 ? `${(d / 1000).toFixed(2)} km` : `${Math.round(d)} m`;
    }
  }

  renderHUD() {
    const card = document.getElementById('jezeroIntegratedCard');
    if (!card) return;

    const researchedList = this.pois.filter(p => p.stage === 'RESEARCHED');
    const zone =
      this.zones.find(z => z.id === this.activeZoneId) || this.currentZone || this.zones[0];
    const zonePois = this.pois.filter(p => p.zoneId === zone.id);
    const focusPoi = this.selectedPoi && this.selectedPoi.zoneId === zone.id ? this.selectedPoi : zonePois[0];

    const step1Done = focusPoi && focusPoi.stage !== 'UNDISCOVERED';
    const step2Done = focusPoi && (focusPoi.stage === 'AT_LAB' || focusPoi.stage === 'RESEARCHED');
    const step3Done = focusPoi && focusPoi.stage === 'RESEARCHED';

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span class="section-title" style="margin:0;color:var(--data-cyan);">🛸 EKSPEDISI JEZERO CRATER</span>
        <span style="font-family:var(--font-mono);font-size:10px;color:#10b981;font-weight:700;">
          ${researchedList.length}/${this.pois.length} TERIDENTIFIKASI
        </span>
      </div>

      <select id="jzZoneDropdown" style="margin-bottom:6px;">
        ${this.zones
          .map(
            z =>
              `<option value="${z.id}" ${z.id === zone.id ? 'selected' : ''}>${z.order}. ${z.id} — ${z.name} (${
                z.mission.status === 'COMPLETED' ? 'SELESAI' : 'AKTIF'
              })</option>`
          )
          .join('')}
      </select>

      <div style="font-size:10px;color:#7dd3fc;margin-bottom:6px;line-height:1.35;">
        ${zone.scienceFact}
      </div>

      <div style="display:flex;flex-direction:column;gap:3px;margin-bottom:7px;">
        ${zonePois
          .map(
            p => `
          <button data-jz-poi="${p.id}" style="text-align:left;padding:4px 6px;background:${
              focusPoi?.id === p.id ? '#151e2c' : '#111620'
            };border:1px solid ${
              focusPoi?.id === p.id ? 'var(--data-cyan)' : '#1f2937'
            };border-radius:3px;color:#fff;font-family:var(--font-mono);font-size:9.5px;cursor:pointer;display:flex;justify-content:space-between;">
            <span>${p.stage === 'RESEARCHED' ? '✓' : '?'} ${this._getDisplayName(p)}</span>
            <span style="color:${this._getStageColor(p)};">${this._getStageBadgeText(p)}</span>
          </button>`
          )
          .join('')}
      </div>

      ${
        focusPoi
          ? `<div style="background:#090d12;border:1px solid #1e293b;border-radius:4px;padding:6px;margin-bottom:6px;font-family:var(--font-mono);font-size:9.5px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                <b style="color:#fff;">${this._getDisplayName(focusPoi)}</b>
                <span id="jzTargetDistBadge" style="color:#f59e0b;font-weight:700;">-- m</span>
              </div>
              <div style="color:#94a3b8;font-size:9px;margin-bottom:4px;">
                ${focusPoi.stage === 'RESEARCHED' ? `${focusPoi.material} [${focusPoi.formula}]` : focusPoi.hiddenHint}
              </div>
              <div style="color:${step1Done ? '#10b981' : '#94a3b8'};">
                ${step1Done ? '✓' : '1.'} Robot A (Ares) Tandai di Lokasi [Space]
              </div>
              <div style="color:${step2Done ? '#10b981' : '#94a3b8'};">
                ${step2Done ? '✓' : '2.'} Robot C (Hermes) Angkut ke Lab GeoLab [C]
              </div>
              <div style="color:${step3Done ? '#10b981' : '#94a3b8'};">
                ${step3Done ? '✓' : '3.'} Robot B (GeoLab) Identifikasi di Lab [Space]
              </div>
            </div>`
          : ''
      }

      ${
        researchedList.length > 0
          ? `<div style="border-top:1px solid #1f2937;padding-top:5px;">
              <div style="font-family:var(--font-mono);font-size:9px;color:#10b981;font-weight:700;margin-bottom:3px;">
                SPESIMEN TERIDENTIFIKASI (MEJA RISET):
              </div>
              <div style="display:flex;flex-direction:column;gap:3px;max-height:85px;overflow-y:auto;">
                ${researchedList
                  .map(
                    item => `
                  <div style="font-family:var(--font-mono);font-size:9px;color:#cbd5e1;display:flex;justify-content:space-between;">
                    <span>✓ ${item.name}</span>
                    <span style="color:#10b981;">${item.researchedTime || ''}</span>
                  </div>`
                  )
                  .join('')}
              </div>
            </div>`
          : ''
      }
    `;

    const dd = card.querySelector('#jzZoneDropdown');
    if (dd) {
      dd.addEventListener('change', e => {
        this.activeZoneId = e.target.value;
        const first = this.pois.find(p => p.zoneId === this.activeZoneId);
        if (first) this.selectedPoi = first;
        this.renderHUD();
      });
    }

    card.querySelectorAll('[data-jz-poi]').forEach(btn => {
      btn.addEventListener('click', () => {
        const poi = this.pois.find(p => p.id === btn.getAttribute('data-jz-poi'));
        if (poi) {
          this.selectedPoi = poi;
          this.renderHUD();
        }
      });
    });
  }
}