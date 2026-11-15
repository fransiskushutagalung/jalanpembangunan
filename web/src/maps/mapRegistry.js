/**
 * MARS GEOLOGICAL MAP REGISTRY
 *
 * PANDUAN UNTUK MENAMBAHKAN MAP BARU (UNTUK TIM / TEMAN):
 * -------------------------------------------------------------
 * Untuk menambahkan peta baru, cukup tambahkan objek peta baru ke dalam array `MARS_MAPS` di bawah ini.
 * Setiap objek peta memiliki struktur berikut:
 * - id: String unik (contoh: 'usgs-i-1802-b', 'usgs-i-2766-gale')
 * - code: Kode resmi katalog (misal: 'USGS I-1802-B')
 * - title: Judul lengkap peta
 * - author: Penyusun / peneliti (misal: 'Ronald Greeley dan J. E. Guest')
 * - year: Tahun rilis
 * - scale: Skala peta (misal: '1:15.000.000')
 * - coverage: Cakupan geografis (misal: '57° LU hingga 57° LS')
 * - description: Deskripsi ringkas geologi wilayah
 * - keyRegions: Array daftar lokasi/fitur geologi penting
 * - materialGroups: Kelompok material pada legenda peta
 * - epochs: Kronologi era geologi (Noachian, Hesperian, Amazonian)
 * - phenomena: 6 topik fenomena geologi utama
 * - has3DSimulation: Boolean (true jika terhubung ke simulator 3D medan)
 * - simulationConfig: Konfigurasi start simulator jika has3DSimulation = true
 */

export const MARS_MAPS = [
  {
    id: 'usgs-i-1802-a',
    code: 'USGS I-1802A',
    title: 'Western Equatorial Region of Mars: Valles Marineris & Tharsis',
    location: 'Valles Marineris & Tharsis',
    author: 'David H. Scott & Kenneth L. Tanaka (USGS / NASA)',
    year: '1986',
    publisher: 'U.S. Geological Survey (USGS)',
    scale: '1:15,000,000',
    coverage: '8.00° S / 285.00° E (75° W) — Western Equatorial Mars',
    elevationRange: '-7,000 m to +21,287 m',
    epoch: 'Hesperian – Amazonian',
    materialUnit: 'Basaltic Strata & Tectonic Chasmata',
    has3DSimulation: true,
    activeSectorId: 'valles-marineris',
    lat: -8.00,
    lon: 285.00,
    description:
      'Official USGS geologic map covering the grand western Martian landscape: the immense Valles Marineris canyon system (>4,000 km), Olympus Mons volcano (21 km), and the volcanic plains of Tharsis. Directly synchronized with the 3D surface rover simulation.',
  },
  {
    id: 'usgs-sim-3470',
    code: 'USGS SIM 3470',
    title: 'Geologic Map of Olympus Mons Caldera, Mars',
    location: 'Olympus Mons Caldera',
    author: 'Jacob E. Bleacher, W. Brent Garry, et al. (USGS / NASA)',
    year: '2021',
    publisher: 'U.S. Geological Survey (USGS)',
    scale: '1:200,000',
    coverage: '18.65° N / 226.20° E (133.80° W) — Olympus Mons Summit Caldera',
    elevationRange: '+17,500 m to +21,287 m',
    epoch: 'Amazonian',
    materialUnit: 'Nested Caldera Basalts & Volcanic Shield Scarps',
    has3DSimulation: true,
    activeSectorId: 'olympus-mons-caldera',
    lat: 18.65,
    lon: 226.20,
    description:
      'High-resolution USGS Scientific Investigations Map (SIM 3470) detailing the summit caldera of Olympus Mons. Depicts 6 nested collapse craters, sheer ring-fault scarps up to 3.2 km high, lava ponds, rilles, and volcanic fissures at the summit of the solar system\'s highest shield volcano.',
    keyRegions: [
      {
        id: 'zeus_patera',
        name: 'Zeus Patera (Cekungan Utama & Graben)',
        coords: '18.72° N, 226.15° E',
        type: 'Cekungan Kaldera Tertua & Sesar Graben Tensi',
        epoch: 'Early Amazonian',
        description: 'Cekungan terbesar dan bagian penting dari struktur kaldera tua. Banyak ditemukan struktur graben memanjang dan punggungan busur (ridge arches).',
      },
      {
        id: 'hera_patera',
        name: 'Hera Patera (Fragmen Kolaps Barat)',
        coords: '18.68° N, 225.80° E',
        type: 'Fragmen Busur Melengkung & Tebing 2,7 km',
        epoch: 'Middle Amazonian',
        description: 'Cekungan berbentuk fragmen melengkung di sisi barat, membuktikan episode keruntuhan bertahap dinding kaldera.',
      },
      {
        id: 'hermes_patera',
        name: 'Hermes Patera (Ridge Arches & Danau Lava)',
        coords: '18.52° N, 226.32° E',
        type: 'Punggungan Busur & Deformasi Lava',
        epoch: 'Middle Amazonian',
        description: 'Memiliki struktur punggungan melengkung (ridge arches) dan kerutan kompresi (wrinkle ridges) pada permukaan lava membeku.',
      },
      {
        id: 'dionysus_patera',
        name: 'Dionysus Patera (Cekungan Penghubung)',
        coords: '18.45° N, 226.12° E',
        type: 'Lantai Lava Terhubung & Kontak Ejecta',
        epoch: 'Late Amazonian',
        description: 'Cekungan yang terhubung langsung dengan Hermes; lantainya tertutupi sebagian oleh selimut lontaran (ejecta) Kawah Pangboche.',
      },
      {
        id: 'athena_patera',
        name: 'Athena Patera (Kaldera Melingkar Timur Laut)',
        coords: '18.95° N, 226.55° E',
        type: 'Kaldera Melingkar Terisolasi',
        epoch: 'Middle Amazonian',
        description: 'Cekungan hampir melingkar sempurna di bagian timur laut dari episode erupsi independen magma chamber atas.',
      },
      {
        id: 'apollo_patera',
        name: 'Apollo Patera (Cekungan Barat Daya)',
        coords: '18.38° N, 225.88° E',
        type: 'Cekungan Lava Vitrofir & Struktur Menarik',
        epoch: 'Late Amazonian',
        description: 'Cekungan di bagian barat daya dengan struktur permukaan menarik dan pembekuan lava cepat sebelum tertimbun ejecta.',
      },
      {
        id: 'pangboche_crater',
        name: 'Kawah Pangboche (Kawah Impak 10,4 km)',
        coords: '18.41° N, 225.98° E',
        type: 'Kawah Tumbukan Asteroid & Selimut Ejecta',
        epoch: 'Late Amazonian (Termuda)',
        description: 'Kawah tumbukan berdiameter 10,4 km dengan dinding curam 1,35 km. Material lontaran ejectanya menutupi sebagian lantai Apollo dan Dionysus Paterae, membuktikan urutan kronologi bahwa kawah ini terbentuk setelah kaldera.',
      },
      {
        id: 'caldera-central-floor',
        name: 'Central Caldera Floor (Lava Lake Plain)',
        coords: '18.65° N, 226.20° E',
        type: 'Basaltic Lava Lake & Wrinkle Ridges',
        epoch: 'Late Amazonian',
        description: 'Smooth, solidified ponded basalt lava cut by compression wrinkle ridges and volcanic fissure vents.',
      },
      {
        id: 'north-rim-scarp',
        name: 'North Rim Ring-Fault Scarp',
        coords: '18.95° N, 226.15° E',
        type: 'Major Ring-Fault Precipice (3.2 km Scarp)',
        epoch: 'Amazonian',
        description: 'Towering near-vertical wall descending 3,200 m from summit rim (+21,200 m) to the primary collapse floor.',
      },
      {
        id: 'nested-caldera-east',
        name: 'Eastern Nested Collapse Terrace',
        coords: '18.60° N, 226.50° E',
        type: 'Stepped Collapse Bench',
        epoch: 'Middle Amazonian',
        description: 'Secondary subsidence terrace with graben systems and concentric collapse fractures.',
      },
      {
        id: 'south-flank-slopes',
        name: 'Upper Shield Flank & Lava Levees',
        coords: '18.30° N, 226.10° E',
        type: 'Effusive Basalt Flow Shield',
        epoch: 'Early Amazonian',
        description: 'Gently dipping upper volcanic flanks flanked by radiating leveed channels and collapsed lava tubes.',
      },
    ],
  },
  {
    id: 'usgs-sim-3464',
    code: 'USGS SIM 3464',
    title: 'Geologic Map of Jezero Crater & Nili Planum',
    location: 'Jezero Crater (Mars 2020)',
    author: 'Vivian Z. Sun & Kathryn M. Stack (USGS / NASA)',
    scale: '1:75,000',
    coverage: '18.44° N / 77.45° E',
    elevationRange: '-2,620 m to -2,200 m',
    epoch: 'Noachian – Hesperian',
    materialUnit: 'Lacustrine Delta, Mg-Carbonates & Olivine Cumulates',
    has3DSimulation: true,
    description:
      'Peta geologi resmi Kawah Jezero dan sekitarnya: lokasi pendaratan Perseverance, kompleks Western Fan-Delta, teras karbonat marginal, serta saluran purba Neretva & Pliva Valles.'
  },
  {
    id: 'usgs-i-1802-b',
    code: 'USGS I-1802B',
    title: 'Geologic Map of the Eastern Equatorial Region of Mars',
    location: 'Eastern Equatorial Region',
    author: 'Ronald Greeley & J. E. Guest (USGS / NASA)',
    year: '1987',
    publisher: 'U.S. Geological Survey (USGS)',
    scale: '1:15,000,000',
    coverage: '18.44° N / 77.45° E — Jezero Crater & Acidalia Planitia',
    elevationRange: '-4,200 m to +1,800 m',
    epoch: 'Noachian – Hesperian',
    materialUnit: 'Sedimentary Deposits & Delta Silts',
    has3DSimulation: false,
    isPlaceholder: true,
    lat: 18.44,
    lon: 77.45,
    description:
      'Official USGS geologic map covering the eastern equatorial Martian hemisphere, featuring ancient paleolake Jezero Crater, fluvial delta deposits, and impact highlands. Currently in preparation queue for autonomous 3D rover simulation.',

    // 1. Bagian-Bagian Utama yang Dieksplorasi
    keyRegions: [
      {
        id: 'jezero',
        name: 'Jezero Crater (Target Misi 3D Swarm)',
        coords: '18.44° LU, 77.45° BT',
        lat: 18.44,
        lon: 77.45,
        type: 'Danau Paleolake & Delta Kawah',
        epoch: 'Noachian – Hesperian',
        epochColor: '#e07a5f',
        materialGroup: 'Sedimentary Deposits & Delta Silts',
        description:
          'Kawah danau purba dengan sistem delta sungai terestrial yang mengawetkan endapan lempung smectite dan karbonat. Lokasi eksplorasi aktif swarm 3 robot.',
        phenomena: ['Fluvial Processes', 'Sedimentary Deposits', 'Impact Craters'],
        hasSimulation: true,
      },
      {
        id: 'acidalia',
        name: 'Acidalia Planitia',
        coords: '49.8° LU, 339.3° BT (-20.7° BB)',
        lat: 49.8,
        lon: 339.3,
        type: 'Dataran Rendah Utara',
        epoch: 'Hesperian – Amazonian',
        epochColor: '#81b29a',
        materialGroup: 'Lowland terrain materials',
        description:
          'Dataran rendah di belahan utara Mars. Sangat menarik untuk mempelajari endapan permukaan, material sedimen, dan kemungkinan proses purba yang berkaitan dengan air.',
        phenomena: ['Sedimentary Deposits', 'Fluvial Processes', 'Aeolian Processes'],
        hasSimulation: false,
      },
      {
        id: 'arabia',
        name: 'Arabia Terra',
        coords: '19.8° LU, 30.0° BT',
        lat: 19.8,
        lon: 30.0,
        type: 'Dataran Tinggi Tua Kawah',
        epoch: 'Noachian (Periode Tertua)',
        epochColor: '#e07a5f',
        materialGroup: 'Highland terrain materials',
        description:
          'Wilayah dataran tinggi tua yang dipenuhi kawah tumbukan. Sangat cocok untuk mempelajari sejarah awal pembentukan kerak Mars, erosi, dan stratifikasi lapisan permukaan.',
        phenomena: ['Impact Craters', 'Aeolian Processes', 'Tectonic Structures'],
        hasSimulation: false,
      },
      {
        id: 'isidis',
        name: 'Isidis Planitia',
        coords: '12.9° LU, 87.0° BT',
        lat: 12.9,
        lon: 87.0,
        type: 'Cekungan Tumbukan Raksasa (Impact Basin)',
        epoch: 'Noachian – Hesperian',
        epochColor: '#f2cc8f',
        materialGroup: 'Lowland terrain materials & Ejecta',
        description:
          'Cekungan tumbukan asteroid berdiameter ~1.500 km. Menarik untuk mempelajari dinamika benturan kosmik, material ejecta, dan evolusi struktural setelah tumbukan.',
        phenomena: ['Impact Craters', 'Sedimentary Deposits', 'Tectonic Structures'],
        hasSimulation: false,
      },
      {
        id: 'syrtis-major',
        name: 'Syrtis Major Planum',
        coords: '8.4° LU, 69.5° BT',
        lat: 8.4,
        lon: 69.5,
        type: 'Perisai Vulkanik Basaltik',
        epoch: 'Hesperian',
        epochColor: '#f2cc8f',
        materialGroup: 'Lowland & Volcanic plains',
        description:
          'Daerah vulkanik ber-albedo gelap yang memiliki jejak aktivitas aliran lava basaltik masif. Kunci untuk memahami evolusi mantel dan gunung api Mars.',
        phenomena: ['Volcanism', 'Tectonic Structures'],
        hasSimulation: false,
      },
      {
        id: 'elysium',
        name: 'Elysium',
        coords: '3.0° LU, 154.7° BT',
        lat: 3.0,
        lon: 154.7,
        type: 'Provinsi Vulkanik & Kaldera',
        epoch: 'Hesperian – Amazonian',
        epochColor: '#81b29a',
        materialGroup: 'Volcanic constructs & flood lava',
        description:
          'Kawasan vulkanik terbesar kedua di Mars yang memiliki dataran lava luas dan struktur gunung api raksasa (Elysium Mons).',
        phenomena: ['Volcanism', 'Tectonic Structures'],
        hasSimulation: false,
      },
      {
        id: 'hesperia',
        name: 'Hesperia Planum',
        coords: '22.3° LS, 110.0° BT',
        lat: -22.3,
        lon: 110.0,
        type: 'Dataran Berpematang (Wrinkle-ridged plains)',
        epoch: 'Hesperian',
        epochColor: '#f2cc8f',
        materialGroup: 'Materials occurring throughout map area',
        description:
          'Dataran lava luas yang menjadi acuan stratigrafi periode Hesperian. Kritis untuk memahami transisi geologi dari masa awal ke pertengahan sejarah Mars.',
        phenomena: ['Volcanism', 'Tectonic Structures'],
        hasSimulation: false,
      },
    ],

    // 2. Jenis Material Geologi (Description of Map Units)
    materialGroups: [
      {
        name: 'Surficial deposits',
        focus: 'Debu, pasir aeolian, bukit pasir, dan endapan permukaan muda.',
        color: '#f4a261',
      },
      {
        name: 'Lowland terrain materials',
        focus: 'Material dataran rendah Mars, sedimen cekungan, dan aliran lava halus.',
        color: '#2a9d8f',
      },
      {
        name: 'Highland terrain materials',
        focus: 'Material dataran tinggi kuno, kerak Noachian tebal, dan sisa benturan kawah purba.',
        color: '#e76f51',
      },
      {
        name: 'Materials throughout map area',
        focus: 'Material transisi yang ditemukan melintasi berbagai wilayah dan batas geologi.',
        color: '#e9c46a',
      },
    ],

    // 3. Pembagian Berdasarkan Umur Geologi (Kronologi)
    epochs: [
      {
        name: 'Noachian',
        period: 'Periode Tertua',
        age: 'Sekitar 4,1 – 3,7 miliar tahun lalu',
        characteristics:
          'Ditandai oleh intensitas tumbukan asteroid tertinggi (Late Heavy Bombardment), iklim yang lebih basah, dan aktivitas air purba.',
        badgeColor: '#e07a5f',
      },
      {
        name: 'Hesperian',
        period: 'Periode Menengah',
        age: 'Sekitar 3,7 – 3,0 miliar tahun lalu',
        characteristics:
          'Banyak berkaitan dengan aktivitas vulkanik global masif, pembentukan dataran lava, dan pelepasan banjir bandang (*catastrophic floods*).',
        badgeColor: '#f2cc8f',
      },
      {
        name: 'Amazonian',
        period: 'Periode Termuda',
        age: 'Sekitar 3,0 miliar tahun lalu hingga sekarang',
        characteristics:
          'Mencakup proses geologi dingin, kering, erosi angin (*aeolian*), akumulasi es kutub, dan vulkanisme sporadis.',
        badgeColor: '#81b29a',
      },
    ],

    // 4. Enam Fenomena Geologi yang Diteliti
    phenomena: [
      {
        id: 'impact',
        title: 'Impact Craters',
        icon: '💥',
        summary: 'Bagaimana asteroid membentuk kawah dan melontarkan material ejecta ke permukaan.',
      },
      {
        id: 'volcanism',
        title: 'Volcanism',
        icon: '🌋',
        summary: 'Bagaimana lava dan aktivitas gunung api membentuk dataran serta kaldera raksasa.',
      },
      {
        id: 'fluvial',
        title: 'Fluvial Processes',
        icon: '🌊',
        summary: 'Jejak aliran air purba, lembah sungai masuk (*inflow valleys*), dan danau kawah.',
      },
      {
        id: 'aeolian',
        title: 'Aeolian Processes',
        icon: '💨',
        summary: 'Bagaimana angin Mars memindahkan debu, pasir, dan membentuk pola gundukan bukit.',
      },
      {
        id: 'sedimentary',
        title: 'Sedimentary Deposits',
        icon: '🧱',
        summary: 'Bagaimana material sedimen mengendap membentuk stratifikasi lapisan batuan delta.',
      },
      {
        id: 'tectonic',
        title: 'Tectonic Structures',
        icon: '⚡',
        summary: 'Retakan graben, patahan sesar, dan pematang kerut (*wrinkle ridges*) pada kerak Mars.',
      },
    ],
  },

  /* --------------------------------------------------------------------------
   * CONTOH SLOT MAP BERIKUTNYA (TEMPLATE UNTUK DITAMBAHKAN OLEH TEMAN TIM):
   * Cukup ubah status 'coming_soon' menjadi peta geologi baru lainnya!
   * -------------------------------------------------------------------------- */
  {
    id: 'usgs-i-2766-gale',
    code: 'USGS I-2766 (Upcoming)',
    title: 'Geologic Map of the Gale Crater Region (Mt. Sharp / Aeolis Mons)',
    author: 'Slot Tambahan untuk Tim',
    year: '2024+',
    publisher: 'USGS / NASA Mars Exploration Program',
    scale: '1:500.000',
    coverage: '5.4° LS, 137.8° BT',
    has3DSimulation: false,
    isPlaceholder: true,
    description:
      'Slot peta geologi selanjutnya untuk ditambahkan oleh rekan tim. Menampilkan stratifikasi sedimentologi kawah Gale dan Aeolis Mons.',
    keyRegions: [
      {
        id: 'gale-floor',
        name: 'Gale Crater Floor (Aeolis Palus)',
        coords: '5.4° LS, 137.8° BT',
        type: 'Danau Sedimen Purba',
        epoch: 'Hesperian',
        description: 'Endapan mudstone dan danau dangkal purba.',
      },
    ],
  },
];

export function getMapById(id) {
  return MARS_MAPS.find(m => m.id === id) || MARS_MAPS[0];
}
