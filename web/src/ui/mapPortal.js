import { MARS_MAPS, getMapById } from '../maps/mapRegistry.js';
import { ICONS } from './icons.js';

export class MapPortal {
  constructor(options = {}) {
    this.onLaunchSimulation = options.onLaunchSimulation || (() => {});
    this.container = null;
    this.#initDOM();
  }

  #initDOM() {
    this.container = document.createElement('div');
    this.container.id = 'mapPortal';
    this.container.className = 'map-portal-overlay';
    // Hidden by default — only shown manually via show()
    this.container.style.display = 'none';
    document.body.appendChild(this.container);
    this.render();
  }

  show() {
    if (this.container) this.container.style.display = 'flex';
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
  }

  render() {
    const maps = MARS_MAPS;

    this.container.innerHTML = `
      <div class="portal-landing">
        <!-- Header -->
        <div class="portal-brand">
          <div class="brand-icon" style="color:var(--data-cyan);">${ICONS.planet(46)}</div>
          <h1 class="brand-title">Mars Geological Maps</h1>
          <p class="brand-sub">Pilih peta geologi untuk memulai eksplorasi 3D</p>
        </div>

        <!-- Map Cards Grid -->
        <div class="map-cards-grid">
          ${maps.map(m => this.#renderMapCard(m)).join('')}
        </div>

        <!-- Footer -->
        <div class="portal-footer">
          <span>Data: NASA / USGS Astrogeology Science Center</span>
          <span>·</span>
          <span>Tambah peta baru di <code>web/src/maps/mapRegistry.js</code></span>
        </div>
      </div>
    `;

    this.#attachListeners();
  }

  #renderMapCard(map) {
    const isPlaceholder = map.isPlaceholder;
    const regionCount = map.keyRegions ? map.keyRegions.length : 0;
    const hasSimulation = map.has3DSimulation;

    if (isPlaceholder) {
      return `
        <div class="map-card placeholder" data-map-id="${map.id}">
          <div class="card-top-badge placeholder-badge">SLOT TERSEDIA</div>
          <div class="card-code">+ Tambah Peta</div>
          <div class="card-title">${map.title}</div>
          <div class="card-hint">Edit mapRegistry.js untuk menambahkan peta baru</div>
        </div>
      `;
    }

    return `
      <div class="map-card ${hasSimulation ? 'active-map' : 'locked-map'}" data-map-id="${map.id}">
        ${hasSimulation 
          ? `<div class="card-top-badge ready-badge" style="display:inline-flex;align-items:center;gap:4px;">${ICONS.satellite(11)} <span>3D READY</span></div>` 
          : '<div class="card-top-badge coming-badge">COMING SOON</div>'
        }
        <div class="card-code">${map.code}</div>
        <div class="card-title">${map.title}</div>
        <div class="card-meta">
          <span>${map.scale}</span>
          <span>·</span>
          <span>${map.author}, ${map.year}</span>
        </div>
        <div class="card-regions">
          <span class="region-count">${regionCount} Wilayah</span>
          ${hasSimulation ? '<span class="enter-hint">Klik untuk masuk →</span>' : ''}
        </div>
      </div>
    `;
  }

  #attachListeners() {
    this.container.querySelectorAll('.map-card').forEach(card => {
      card.onclick = () => {
        const mapId = card.dataset.mapId;
        const targetMap = getMapById(mapId);

        if (targetMap.isPlaceholder) {
          return; // Do nothing for placeholder cards
        }

        if (targetMap.has3DSimulation) {
          this.hide();
          this.onLaunchSimulation(targetMap);
        }
      };
    });
  }
}
