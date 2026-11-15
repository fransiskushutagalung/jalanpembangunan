import { MARS_MAPS, getMapById } from '../maps/mapRegistry.js';

export class DashboardController {
  constructor(options = {}) {
    this.onLaunchSimulation = options.onLaunchSimulation || (() => {});
    this.onHelpClick = options.onHelpClick || (() => {});
    this.onToast = options.onToast || ((msg) => console.log(msg));

    this.root = document.getElementById('dashboard-root');
    this.initOverlay = document.getElementById('dash-init-overlay');
    this.progressBar = document.getElementById('dashInitProgressBar');
    this.statusText = document.getElementById('dashInitStatusText');
    this.logsContainer = document.getElementById('dashInitLogs');
    this.helpModal = document.getElementById('dashHelpModal');

    this.activeMapId = 'usgs-i-1802-a';
    this.isLaunching = false;
    this.isVisible = true;

    this.#renderMapList();
    this.#initEvents();
  }

  show() {
    this.isVisible = true;
    if (this.root) {
      this.root.classList.remove('dash-hidden');
      this.root.style.display = 'block';
    }
  }

  hide() {
    this.isVisible = false;
    if (this.root) {
      this.root.classList.add('dash-hidden');
      setTimeout(() => {
        if (!this.isVisible && this.root) {
          this.root.style.display = 'none';
        }
      }, 500);
    }
  }

  #initEvents() {
    // 1. Launch Button
    const btnLaunch = document.getElementById('btnCalloutLaunch');
    if (btnLaunch) {
      btnLaunch.addEventListener('click', () => {
        this.triggerLaunchSequence();
      });
    }

    // 2. Help Button & Modal
    const helpBtn = document.getElementById('dashHelpBtn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        this.showHelpModal();
      });
    }

    const helpCloseBtn = document.getElementById('dashHelpCloseBtn');
    if (helpCloseBtn) {
      helpCloseBtn.addEventListener('click', () => {
        this.hideHelpModal();
      });
    }

    const helpBackdrop = document.querySelector('.dash-help-backdrop');
    if (helpBackdrop) {
      helpBackdrop.addEventListener('click', () => {
        this.hideHelpModal();
      });
    }
  }

  #renderMapList() {
    const list = document.querySelector('.dashboard-map-list-items');
    if (!list) return;

    MARS_MAPS.filter(map => map.has3DSimulation).forEach(map => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `dashboard-map-btn${map.id === this.activeMapId ? ' active' : ''}`;
      button.dataset.mapId = map.id;
      button.setAttribute('aria-pressed', String(map.id === this.activeMapId));

      const code = document.createElement('span');
      code.className = 'dashboard-map-code';
      code.textContent = map.code;

      const location = document.createElement('span');
      location.className = 'dashboard-map-location';
      location.textContent = map.location || map.title;

      const option = document.createElement('span');
      option.className = 'dashboard-map-option';
      option.append(location);

      const arrow = document.createElement('span');
      arrow.className = 'dashboard-map-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      option.append(arrow);

      button.append(code, option);
      button.addEventListener('click', () => this.selectMap(map.id));
      list.appendChild(button);
    });
  }

  selectMap(mapId) {
    const map = getMapById(mapId);
    if (!map) return;
    this.activeMapId = mapId;

    document.querySelectorAll('.dashboard-map-btn').forEach(button => {
      const isActive = button.dataset.mapId === mapId;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    const locEl = document.getElementById('calloutLocation');
    if (locEl) locEl.textContent = map.location || map.title;

    const codeEl = document.getElementById('calloutCodeTitle');
    if (codeEl) codeEl.textContent = `${map.code} · ${map.title}`;

    const authorEl = document.getElementById('calloutAuthor');
    if (authorEl) authorEl.textContent = map.author;

    const scaleEl = document.getElementById('calloutScale');
    if (scaleEl) scaleEl.textContent = map.scale;

    const coordsEl = document.getElementById('calloutCoords');
    if (coordsEl) coordsEl.textContent = map.coverage;

    const elevEl = document.getElementById('calloutElevation');
    if (elevEl) elevEl.textContent = map.elevationRange;

    const eraEl = document.getElementById('calloutEra');
    if (eraEl) eraEl.textContent = map.epoch;

    const stratEl = document.getElementById('calloutStratigraphy');
    if (stratEl) stratEl.textContent = map.materialUnit;

    const descEl = document.getElementById('calloutDesc');
    if (descEl) descEl.textContent = map.description;

    if (window.marsGlobe && typeof window.marsGlobe.setActiveHotspot === 'function') {
      window.marsGlobe.setActiveHotspot(mapId);
    }
  }

  showHelpModal() {
    if (this.helpModal) {
      this.helpModal.style.display = 'flex';
    }
  }

  hideHelpModal() {
    if (this.helpModal) {
      this.helpModal.style.display = 'none';
    }
  }

  triggerLaunchSequence() {
    if (this.isLaunching) return;
    this.isLaunching = true;

    if (this.initOverlay) {
      this.initOverlay.style.display = 'flex';
      // Force layout for transition
      void this.initOverlay.offsetWidth;
      this.initOverlay.classList.add('active');
    }

    const steps = [
      {
        progress: 25,
        status: 'CONNECTING DEEP SPACE NETWORK TO MRO SATELLITE...',
        log: '[UPLINK] Mars Reconnaissance Orbiter telemetry: LINKED',
      },
      {
        progress: 55,
        status: 'LOADING DIGITAL ELEVATION MODEL (DEM) & MOLA DATA...',
        log: '[MOLA-DEM] 40m/px Jezero & Valles Marineris Grid: BUFFER READY',
      },
      {
        progress: 85,
        status: 'CALIBRATING AUTONOMOUS 3D ROVER SWARM (ARES, GEOLAB, HERMES)...',
        log: '[SWARM] Rocker-Bogie Kinematics & Subsystems: ONLINE',
      },
      {
        progress: 100,
        status: 'TELEMETRY SYNCHRONIZED. ENTERING MARTIAN SURFACE...',
        log: '[MISSION] Touchdown confirmed at target coordinates!',
      },
    ];

    let currentStep = 0;
    const runNextStep = () => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        if (this.progressBar) this.progressBar.style.width = `${step.progress}%`;
        if (this.statusText) this.statusText.textContent = step.status;
        if (this.logsContainer) {
          const logDiv = document.createElement('div');
          logDiv.textContent = step.log;
          this.logsContainer.appendChild(logDiv);
          this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
        }

        currentStep++;
        const delay = currentStep === steps.length ? 700 : 550;
        setTimeout(runNextStep, delay);
      } else {
        // Complete transition to simulator
        setTimeout(() => {
          if (this.initOverlay) {
            this.initOverlay.classList.remove('active');
            setTimeout(() => {
              if (this.initOverlay) this.initOverlay.style.display = 'none';
            }, 400);
          }
          this.hide();
          this.isLaunching = false;
          this.onLaunchSimulation(getMapById(this.activeMapId));
        }, 400);
      }
    };

    setTimeout(runNextStep, 200);
  }
}
