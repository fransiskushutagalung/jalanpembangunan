/**
 * src/exploration/jezeroExplorationData.js
 * Dataset Zona Geologi, Objek Eksplorasi (POI), dan Misi Kawah Jezero
 */

export const EXPLORATION_ZONES = [
  {
    id: 'JZ-03',
    sequenceOrder: 1,
    name: 'Crater Floor — Máaz & Séítah',
    subtitle: 'Kompleks Batuan Beku Dasar Kawah (Unit HNf)',
    color: '#a78bfa',
    center: { lon: 77.445, lat: 18.428 },
    radiusMeters: 4200,
    minerals: ['Olivin (Fo55-68)', 'Piroksen Augit', 'Plagioklas', 'Oksida Fe-Ti'],
    scientificFact:
      'Formasi Séítah merupakan batuan kumulat kaya olivin hasil pendinginan magma lambat, sedangkan Formasi Máaz di atasnya adalah aliran lava basal.',
    mission: {
      id: 'MSN-03',
      title: 'Jangkar Geokronologi & Kalibrasi Depot',
      activityLabel: 'Pengeboran Inti & Kalibrasi Suar',
      instruction:
        'Dekati singkapan olivin South Séítah untuk analisis mineral, lalu kunjungi Three Forks untuk mengkalibrasi suar referensi.',
      gameElementNote: 'Membuka kalibrasi navigasi lintasan menuju delta barat (JZ-01).',
      scientificReward:
        'Batuan beku lantai kawah memberikan jangkar umur radiometrik mutlak untuk kronologi geologi Mars.',
      status: 'IN_PROGRESS',
      nextZoneId: 'JZ-01'
    }
  },
  {
    id: 'JZ-01',
    sequenceOrder: 2,
    name: 'Western Fan-Delta Complex',
    subtitle: 'Mulut Neretva Vallis (Unit HNlfd)',
    color: '#facc15',
    center: { lon: 77.385, lat: 18.435 },
    radiusMeters: 4500,
    minerals: ['Fe/Mg-Smektit', 'Ca/Mg-Sulfat', 'Mg-Karbonat', 'Silika Terhidrasi'],
    scientificFact:
      'Lapisan foreset miring dan topset horizontal di Kodiak Butte membuktikan delta terbentuk saat sungai bermuara ke danau purba yang tenang.',
    mission: {
      id: 'MSN-01',
      title: 'Rekonstruksi Stratigrafi & Pemindaian Organik',
      activityLabel: 'Observasi Stratigrafi & Spektroskopi',
      instruction:
        'Amati tebing lapisan sedimen Kodiak Butte dan pindai batulumpur Wildcat Ridge untuk mendeteksi jejak molekul organik.',
      gameElementNote: 'Mengkalibrasi indeks biosignature pada HUD rover.',
      scientificReward:
        'Batulumpur berbutir halus pada delta bagian bawah sangat ideal dalam mengawetkan molekul organik purba.',
      status: 'NOT_STARTED',
      nextZoneId: 'JZ-02'
    }
  },
  {
    id: 'JZ-02',
    sequenceOrder: 3,
    name: 'Marginal Carbonate Terraces',
    subtitle: 'Teras Garis Pantai Purba (Unit HNm)',
    color: '#2dd4bf',
    center: { lon: 77.375, lat: 18.525 },
    radiusMeters: 5000,
    minerals: ['Magnesit (MgCO3)', 'Hidromagnesit', 'Olivin Teralterasi', 'Filosilikat Fe/Mg'],
    scientificFact:
      'Sabuk batuan ini menunjukkan pita serapan spektral Mg-karbonat terkuat di Mars dari data orbital MRO CRISM di sekitar elevasi -2.395 m.',
    mission: {
      id: 'MSN-02',
      title: 'Triangulasi Kontur Garis Pantai Purba',
      activityLabel: 'Pemetaan Elevasi & Mineral Karbonat',
      instruction:
        'Periksa singkapan teras karbonat dan urat Bright Angel untuk memverifikasi batas elevasi tepi danau purba.',
      gameElementNote: 'Memetakan elevasi kontur batas muka air maksimum Paleolake Jezero.',
      scientificReward:
        'Karbonat marginal merekam presipitasi mineral di tepi danau sekaligus penyerapan CO2 atmosfer purba.',
      status: 'NOT_STARTED',
      nextZoneId: 'JZ-04'
    }
  },
  {
    id: 'JZ-04',
    sequenceOrder: 4,
    name: 'Neretva & Sava Valles Inlets',
    subtitle: 'Jaringan Lembah Sungai Masuk (Fluvial)',
    color: '#38bdf8',
    center: { lon: 77.305, lat: 18.485 },
    radiusMeters: 4800,
    minerals: ['Olivin Detrital', 'Piroksen Rendah-Ca', 'Smektit Fe/Mg Terangkut'],
    scientificFact:
      'Neretva Vallis membelah dinding barat kawah untuk mengalirkan air dan sedimen dari daerah tangkapan air Nili Planum.',
    mission: {
      id: 'MSN-04',
      title: 'Rekonstruksi Jalur Transportasi Sedimen',
      activityLabel: 'Pengukuran Morfologi Saluran Purba',
      instruction:
        'Capai mulut ngarai Neretva Vallis untuk mengukur profil saluran banjir purba dan arah suplai sedimen.',
      gameElementNote: 'Membuka jalur pemetaan koridor bibir kawah barat (JZ-06).',
      scientificReward:
        'Aliran sungai berkelanjutan mengikis batuan kaya olivin dan lempung dari dataran tinggi lalu mengendapkannya di Jezero.',
      status: 'NOT_STARTED',
      nextZoneId: 'JZ-05'
    }
  },
  {
    id: 'JZ-05',
    sequenceOrder: 5,
    name: 'Pliva Vallis Outlet Breach',
    subtitle: 'Ngarai Pelimpah Timur (Spillway)',
    color: '#22d3ee',
    center: { lon: 77.930, lat: 18.395 },
    radiusMeters: 5200,
    minerals: ['Breksi Bibir Kawah', 'Batuan Dinding Basaltik', 'Kerikil Lag Fluvial'],
    scientificFact:
      'Elevasi ambang celah timur (~ -2.395 m) sejajar dengan transisi topset-foreset pada Western Delta, menandakan danau meluap ke Isidis Planitia.',
    mission: {
      id: 'MSN-05',
      title: 'Verifikasi Sistem Danau Open-Basin',
      activityLabel: 'Komparasi Altimetri Cekungan',
      instruction:
        'Periksa titik ambang pelimpah Pliva Vallis (atau lakukan telemetri lintas-cekungan) untuk membandingkan elevasinya dengan garis pantai JZ-02.',
      gameElementNote: 'Dapat diselesaikan dengan mendekati target timur atau pemindaian jarak jauh.',
      scientificReward:
        'Jezero merupakan cekungan danau terbuka (open-basin) yang membuang kelebihan airnya menuju Isidis Planitia.',
      status: 'NOT_STARTED',
      nextZoneId: 'JZ-06'
    }
  },
  {
    id: 'JZ-06',
    sequenceOrder: 6,
    name: 'Nili Planum & Crater Rim Megabreccia',
    subtitle: 'Kerak Purba Noachian & Dataran Olivin (Nnb / Nnp2)',
    color: '#f59e0b',
    center: { lon: 77.245, lat: 18.435 },
    radiusMeters: 5500,
    minerals: ['Piroksen Rendah-Ca', 'Klorit', 'Serpentin', 'Olivin Forsteritik'],
    scientificFact:
      'Tumbukan pembentuk Kawah Jezero mengangkat blok megabreksi kerak Noachian berumur >3,9 miliar tahun dari bawah permukaan.',
    mission: {
      id: 'MSN-06',
      title: 'Ekspedisi Kerak Purba & Blok Megabreksi',
      activityLabel: 'Pemindaian Radar Bawah Permukaan',
      instruction:
        'Daki koridor bibir kawah barat untuk memeriksa singkapan blok megabreksi kerak Noachian tertua.',
      gameElementNote: 'Misi puncak yang melengkapi seluruh garis waktu geologi Jezero.',
      scientificReward:
        'Batuan bibir kawah merekam aktivitas hidrotermal purba sebelum cekungan Jezero terbentuk.',
      status: 'NOT_STARTED',
      nextZoneId: null
    }
  }
];

export const EXPLORATION_OBJECTS = [
  // JZ-03: Crater Floor
  {
    id: 'OBJ-03A',
    zoneId: 'JZ-03',
    name: 'Octavia E. Butler Landing Site',
    materialType: 'Basaltik Formasi Máaz (Titik Pendaratan)',
    category: 'LANDING_MARKER',
    evidenceStatus: 'TERVERIFIKASI (NASA MARS 2020)',
    lon: 77.4508,
    lat: 18.4447,
    isMissionTarget: false,
    color: '#38bdf8',
    shortDesc: 'Titik pendaratan Sol 0 pada unit lantai kawah basaltik Máaz.',
    researchGoal: 'Mengamati singkapan batuan beku kasar yang tersingkap akibat semburan roket pendaratan.',
    scienceDetail: 'Menjadi titik nol referensi geologi sebelum rover bergerak menuju Formasi Séítah.'
  },
  {
    id: 'OBJ-03B',
    zoneId: 'JZ-03',
    name: 'South Séítah Olivine Outcrop',
    materialType: 'Batuan Kumulat Kaya Olivin (Fo55–68)',
    category: 'MISSION_TARGET',
    evidenceStatus: 'TERVERIFIKASI (NASA MARS 2020)',
    lon: 77.4320,
    lat: 18.4120,
    isMissionTarget: true,
    color: '#f43f5e',
    shortDesc: 'Singkapan batuan beku kumulat kaya olivin di bawah lapisan Máaz.',
    researchGoal: 'Mengambil sampel inti batuan kumulat untuk penentuan umur radiometrik dasar kawah.',
    scienceDetail: 'Tekstur poikilitik menunjukkan kristal olivin terbentuk dari pendinginan dapur magma secara lambat.'
  },
  {
    id: 'OBJ-03C',
    zoneId: 'JZ-03',
    name: 'Three Forks Sample Depot',
    materialType: 'Dataran Sedimen-Basaltik (Depot Sampel)',
    category: 'MISSION_TARGET',
    evidenceStatus: 'TERVERIFIKASI (NASA MARS 2020)',
    lon: 77.4150,
    lat: 18.4265,
    isMissionTarget: true,
    color: '#f43f5e',
    shortDesc: 'Lokasi penyimpanan 10 tabung sampel cadangan pertama di Mars.',
    researchGoal: 'Mengkalibrasi titik suar depot cadangan sebelum mendaki lereng Western Delta.',
    scienceDetail: 'Area datar dengan risiko bahaya pasir minimal yang dipilih untuk operasi pendaratan sampel.'
  },

  // JZ-01: Western Delta
  {
    id: 'OBJ-01A',
    zoneId: 'JZ-01',
    name: 'Kodiak Butte Stratigraphic Cliff',
    materialType: 'Lapisan Sedimen Delta (Topset & Foreset)',
    category: 'MISSION_TARGET',
    evidenceStatus: 'TERVERIFIKASI (NASA MARS 2020)',
    lon: 77.3925,
    lat: 18.4045,
    isMissionTarget: true,
    color: '#f43f5e',
    shortDesc: 'Bukit sisa erosi delta dengan struktur lapisan miring (foreset) yang jelas.',
    researchGoal: 'Mengukur kemiringan lapisan foreset untuk memastikan tinggi muka air danau purba.',
    scienceDetail: 'Struktur stratigrafi klasik Gilbert-type delta yang membuktikan keberadaan danau stabil.'
  },
  {
    id: 'OBJ-01B',
    zoneId: 'JZ-01',
    name: 'Wildcat Ridge Mudstone',
    materialType: 'Batulumpur Kaya Sulfat & Senyawa Organik',
    category: 'MISSION_TARGET',
    evidenceStatus: 'TERVERIFIKASI (NASA MARS 2020)',
    lon: 77.3860,
    lat: 18.4580,
    isMissionTarget: true,
    color: '#f43f5e',
    shortDesc: 'Batulumpur berlaminasi halus di bagian depan delta dengan sinyal organik tinggi.',
    researchGoal: 'Melakukan pemindaian spektroskopi non-destruktif terhadap konsentrasi molekul organik aromatik.',
    scienceDetail: 'Endapan berenergi rendah saat danau mulai menyusut dan mengendapkan garam sulfat.'
  },
  {
    id: 'OBJ-01C',
    zoneId: 'JZ-01',
    name: 'Belva Crater Wall Exposure',
    materialType: 'Fragmen & Dinding Kawah Tumbukan Sekunder',
    category: 'GEOLOGICAL_FEATURE',
    evidenceStatus: 'TERVERIFIKASI (NASA MARS 2020)',
    lon: 77.3680,
    lat: 18.4810,
    isMissionTarget: false,
    color: '#38bdf8',
    shortDesc: 'Kawah tumbukan muda berdiameter ~0,9 km yang memotong lapisan dalam delta.',
    researchGoal: 'Mengobservasi penampang melintang internal lapisan sedimen delta tanpa pengeboran dalam.',
    scienceDetail: 'Tumbukan menyingkap perlapisan pasir kasar dan batu kerikil di bawah permukaan kipas delta.'
  },

  // JZ-02: Marginal Carbonate
  {
    id: 'OBJ-02A',
    zoneId: 'JZ-02',
    name: 'CRISM Mg-Carbonate Terrace',
    materialType: 'Batuan Karbonat Magnesium (Magnesit)',
    category: 'MISSION_TARGET',
    evidenceStatus: 'DETEKSI SPEKTRAL ORBITAL (MRO CRISM)',
    lon: 77.3850,
    lat: 18.5450,
    isMissionTarget: true,
    color: '#f43f5e',
    shortDesc: 'Teras batuan terang kaya magnesit di sepanjang tepi dalam kawah barat laut.',
    researchGoal: 'Memverifikasi pita serapan karbonat dan elevasi garis pantai purba (~ -2.395 m).',
    scienceDetail: 'Menunjukkan pita serapan inframerah 2,30 & 2,50 µm yang khas bagi mineral karbonat terhidrasi.'
  },
  {
    id: 'OBJ-02B',
    zoneId: 'JZ-02',
    name: 'Bright Angel Vein Outcrop',
    materialType: 'Batulumpur Terang Berurat Ca-Sulfat & Silika',
    category: 'GEOLOGICAL_FEATURE',
    evidenceStatus: 'TERVERIFIKASI (NASA MARS 2020)',
    lon: 77.3380,
    lat: 18.4980,
    isMissionTarget: false,
    color: '#10b981',
    shortDesc: 'Singkapan batuan terang berurat mineral putih di zona transisi margin kawah.',
    researchGoal: 'Menganalisis jejak sirkulasi air tanah purba dan reaksi redoks pada batulumpur.',
    scienceDetail: 'Urat kalsium sulfat menandakan fluida kaya mineral pernah mengalir melalui rekahan batuan.'
  },

  // JZ-04: Neretva & Sava Valles
  {
    id: 'OBJ-04A',
    zoneId: 'JZ-04',
    name: 'Neretva Vallis Gorge Entrance',
    materialType: 'Endapan Saluran Sungai Purba (Fluvial)',
    category: 'MISSION_TARGET',
    evidenceStatus: 'PERKIRAAN GEOMORFOLOGI (USGS SIM 3464)',
    lon: 77.3050,
    lat: 18.4820,
    isMissionTarget: true,
    color: '#f43f5e',
    shortDesc: 'Mulut ngarai sungai barat yang memotong bibir Kawah Jezero.',
    researchGoal: 'Mengukur lebar dan kedalaman saluran masuk untuk menghitung debit air purba.',
    scienceDetail: 'Menyalurkan sedimen kaya lempung smektit dan olivin dari dataran tinggi Nili Planum.'
  },
  {
    id: 'OBJ-04B',
    zoneId: 'JZ-04',
    name: 'Sava Vallis Northern Fan Remnant',
    materialType: 'Endapan Kipas Aluvial Utara (Smektit-Karbonat)',
    category: 'MINERAL_INDICATOR',
    evidenceStatus: 'DETEKSI SPEKTRAL ORBITAL',
    lon: 77.5200,
    lat: 18.6500,
    isMissionTarget: false,
    color: '#10b981',
    shortDesc: 'Sisa endapan kipas sedimen purba di muara lembah utara Sava Vallis.',
    researchGoal: 'Membandingkan komposisi sedimen kipas utara dengan Western Delta.',
    scienceDetail: 'Menunjukkan bahwa Jezero menerima suplai air dari lebih dari satu sistem sungai.'
  },

  // JZ-05: Pliva Vallis
  {
    id: 'OBJ-05A',
    zoneId: 'JZ-05',
    name: 'Pliva Vallis Spillway Threshold',
    materialType: 'Ambang Batuan Basaltik & Kerikil Fluvial',
    category: 'MISSION_TARGET',
    evidenceStatus: 'INTERPRETASI ILMIAH (GOUDGE ET AL.)',
    lon: 77.8800,
    lat: 18.3950,
    isMissionTarget: true,
    color: '#f43f5e',
    shortDesc: 'Celah keluar di bibir timur kawah pada elevasi ambang ~ -2.395 m.',
    researchGoal: 'Membandingkan elevasi ambang keluar timur dengan elevasi teras karbonat barat.',
    scienceDetail: 'Menjadi titik pelimpah air danau menuju cekungan raksasa Isidis Planitia.'
  },

  // JZ-06: Nili Planum & Rim Megabreccia
  {
    id: 'OBJ-06A',
    zoneId: 'JZ-06',
    name: 'Western Rim Megabreccia Corridor',
    materialType: 'Formasi Blok Megabreksi Kerak Noachian',
    category: 'MISSION_TARGET',
    evidenceStatus: 'PERKIRAAN RENCANA MISI (MARS 2020)',
    lon: 77.2650,
    lat: 18.4620,
    isMissionTarget: true,
    color: '#f43f5e',
    shortDesc: 'Singkapan blok batuan raksasa berumur >3,9 miliar tahun pada dinding bibir kawah.',
    researchGoal: 'Memindai struktur megabreksi kerak purba yang terangkat akibat tumbukan Jezero.',
    scienceDetail: 'Mengandung mineral alterasi hidrotermal seperti klorit, serpentin, dan piroksen rendah-Ca.'
  },
  {
    id: 'OBJ-06B',
    zoneId: 'JZ-06',
    name: 'Nili Planum Regional Olivine Scarp',
    materialType: 'Batuan Dasar Kaya Olivin Regional (Unit Nnp2)',
    category: 'MINERAL_INDICATOR',
    evidenceStatus: 'DETEKSI SPEKTRAL ORBITAL',
    lon: 77.2050,
    lat: 18.3550,
    isMissionTarget: false,
    color: '#10b981',
    shortDesc: 'Tebing unit regional kaya olivin di sisi barat daya luar bibir kawah.',
    researchGoal: 'Mengidentifikasi batuan sumber asal material olivin yang terendapkan di dalam kawah.',
    scienceDetail: 'Bagian dari lapisan regional kaya olivin seluas ~70.000 km2 di tepi cekungan Isidis.'
  }
];