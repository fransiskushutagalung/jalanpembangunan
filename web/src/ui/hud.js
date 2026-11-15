import { RoverViewer } from './roverViewer.js';
import { ICONS } from './icons.js';

const $ = id => document.getElementById(id);

export class Hud {
  /**
   * @param {Object} handlers
   */
  constructor(handlers) {
    const h = handlers;
    this.handlers = h;
    this.toastTimer = null;
    this.showDetails = false;
    this.showHistLog = false;
    this.historyTrackEnabled = true;

    // 1. Initialize Interactive 3D Rover Viewer
    const viewerContainer = $('roverViewerContainer');
    if (viewerContainer) {
      this.roverViewer = new RoverViewer(viewerContainer);
    }

    // Interactive 3D Viewer Toolbar Controls
    if ($('viewerResetBtn')) {
      $('viewerResetBtn').onclick = () => {
        if (this.roverViewer) this.roverViewer.resetView();
      };
    }
    if ($('viewerZoomInBtn')) {
      $('viewerZoomInBtn').onclick = () => {
        if (this.roverViewer) this.roverViewer.zoomIn();
      };
    }
    if ($('viewerZoomOutBtn')) {
      $('viewerZoomOutBtn').onclick = () => {
        if (this.roverViewer) this.roverViewer.zoomOut();
      };
    }
    if ($('viewerRotateBtn')) {
      $('viewerRotateBtn').onclick = () => {
        if (this.roverViewer) {
          const auto = this.roverViewer.toggleAutoRotate();
          $('viewerRotateBtn').classList.toggle('active', auto);
          $('viewerRotateBtn').textContent = auto ? '⟳ Auto: ON' : '⟳ Auto';
        }
      };
    }

    // 2. SHOW HISTORY TRACK Toggle Button
    if ($('historyToggleBtn')) {
      $('historyToggleBtn').onclick = () => {
        this.historyTrackEnabled = !this.historyTrackEnabled;
        const btn = $('historyToggleBtn');
        const stateTag = $('histToggleState');
        btn.classList.toggle('active', this.historyTrackEnabled);
        if (stateTag) {
          stateTag.textContent = this.historyTrackEnabled ? '[ ON ]' : '[ OFF ]';
          stateTag.style.color = this.historyTrackEnabled ? 'var(--data-cyan)' : 'var(--text-dim)';
        }
        if (h.onToggleHistory) {
          h.onToggleHistory(this.historyTrackEnabled);
        }
        this.showToast(this.historyTrackEnabled ? 'History Track: Ditampilkan di medan Mars' : 'History Track: Disembunyikan');
      };
    }

    // Toggle Collapsible Movement History Log
    if ($('toggleHistLogBtn')) {
      $('toggleHistLogBtn').onclick = () => {
        this.showHistLog = !this.showHistLog;
        const c = $('histLogContainer');
        if (c) c.style.display = this.showHistLog ? 'block' : 'none';
        $('toggleHistLogBtn').innerHTML = this.showHistLog
          ? `${ICONS.chevronUp(11)} Sembunyikan Riwayat Lintasan`
          : `${ICONS.fileText(12)} Buka Riwayat Lintasan (Log Telemetri) ${ICONS.chevronDown(10)}`;
      };
    }

    // Buka Meja Riset & Backpack Laboratorium Spesimen Mars
    if ($('toggleBackpackBtn')) {
      $('toggleBackpackBtn').onclick = () => {
        if (typeof h.onOpenBackpack === 'function') {
          h.onOpenBackpack();
        } else if (window.labBackpack && typeof window.labBackpack.toggle === 'function') {
          window.labBackpack.toggle();
        }
      };
    }

    // Toggle Details Data Sources
    if ($('toggleDetailsBtn')) {
      $('toggleDetailsBtn').onclick = () => {
        this.showDetails = !this.showDetails;
        const c = $('telemetryDetails');
        if (c) c.style.display = this.showDetails ? 'block' : 'none';
        $('toggleDetailsBtn').innerHTML = this.showDetails
          ? `${ICONS.chevronUp(11)} Sembunyikan Sumber Data`
          : `${ICONS.database(12)} Sumber Data NASA & USGS Geologi ${ICONS.chevronDown(10)}`;
      };
    }

    // 3. Top-Left Floating Action Button (FAB) Toolbar Toggle
    const fabBtn = $('topNavFab');
    const controlBar = $('topControlBar');
    if (fabBtn && controlBar) {
      fabBtn.onclick = () => {
        const isCollapsed = controlBar.classList.toggle('collapsed');
        fabBtn.classList.toggle('active', !isCollapsed);
        const icon = fabBtn.querySelector('.fab-icon-symbol');
        const text = fabBtn.querySelector('.fab-text');
        if (icon) icon.innerHTML = isCollapsed ? ICONS.sliders(13) : ICONS.x(13);
        if (text) text.textContent = isCollapsed ? 'KONTROL' : 'TUTUP';
        const simModal = $('simSettingsModal');
        if (isCollapsed && simModal) simModal.style.display = 'none';
      };
    }

    // Shortcut 'H' to toggle top control bar show/hide
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyH' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (document.activeElement && ['input', 'select', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;
        if (fabBtn) fabBtn.click();
      }
    });

    // 4. Top-Left Simulation Settings Modal Toggle
    if ($('toggleSettingsBtn')) {
      $('toggleSettingsBtn').onclick = () => {
        const modal = $('simSettingsModal');
        if (modal) {
          const isShown = modal.style.display === 'block';
          modal.style.display = isShown ? 'none' : 'block';
        }
      };
    }
    if ($('closeSettingsBtn')) {
      $('closeSettingsBtn').onclick = () => {
        const modal = $('simSettingsModal');
        if (modal) modal.style.display = 'none';
      };
    }

    // Simulation Sliders & Controls
    if ($('exag')) {
      $('exag').oninput = e => { $('exagV').textContent = (+e.target.value).toFixed(1) + '×'; };
      $('exag').onchange = e => h.onExaggeration(+e.target.value);
    }
    if ($('stride')) $('stride').onchange = e => h.onStride(+e.target.value);
    if ($('slope')) $('slope').onchange = e => h.onSlope(e.target.checked);
    if ($('tint')) $('tint').onchange = e => h.onTint(e.target.checked);
    if ($('rscale')) {
      $('rscale').oninput = e => { $('rscaleV').textContent = e.target.value + '×'; h.onRoverScale(+e.target.value); };
    }
    if ($('sunEl')) $('sunEl').oninput = () => h.onSun();
    if ($('sunAz')) $('sunAz').oninput = () => h.onSun();
    if ($('cam')) $('cam').onchange = e => h.onCamera(e.target.value);
    if ($('swarmMode')) $('swarmMode').onchange = e => h.onSwarmMode(e.target.value);
    if ($('resetRover')) $('resetRover').onclick = () => h.onReset();
    if ($('openMapPortalBtn')) $('openMapPortalBtn').onclick = () => h.onOpenMapPortal();

    // Contextual Action Buttons
    if ($('mainActionBtn')) $('mainActionBtn').onclick = () => h.onTriggerTask();
    if ($('secActionBtn')) $('secActionBtn').onclick = () => h.onSecondaryAction();

    // Robot selection tabs (0: Mapper, 1: GeoLab, 2: Transport)
    const btns = document.querySelectorAll('#robotSelector .r-btn');
    btns.forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index, 10);
        h.onSelectRover(idx);
      };
    });
  }

  showToast(message) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.display = 'block';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.style.display = 'none';
    }, 3800);
  }

  updateRoverSelection(index, rover) {
    const btns = document.querySelectorAll('#robotSelector .r-btn');
    btns.forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });

    if (rover) {
      const badge = $('activeCallsign');
      if (badge) {
        badge.textContent = `ROV-${rover.callsign}`;
        badge.style.color = rover.accentHex;
      }
      // Update interactive 3D viewer model
      if (this.roverViewer) {
        this.roverViewer.setRover(rover);
      }
    }
  }

  /**
   * Updates History Track statistics and movement log list
   * @param {Object} stats
   */
  updateHistory(stats) {
    if (!stats) return;

    if ($('histTotalDist')) $('histTotalDist').textContent = stats.totalDistanceFormatted;
    if ($('histElapsedTime')) $('histElapsedTime').textContent = stats.elapsedFormatted;

    if ($('histStartCoord')) {
      $('histStartCoord').textContent = stats.startPoint
        ? `${stats.startPoint.lon}°E, ${stats.startPoint.lat}°N (${stats.startPoint.elevation}m)`
        : 'Menunggu Posisi Awal...';
    }

    if ($('histCurrentCoord')) {
      $('histCurrentCoord').textContent = stats.currentPoint
        ? `${stats.currentPoint.lon}°E, ${stats.currentPoint.lat}°N (${stats.currentPoint.elevation}m)`
        : 'Standby';
    }

    if ($('histWaypointCount')) {
      $('histWaypointCount').textContent = `${stats.waypointCount} Titik`;
    }

    // Update log list if drawer is open
    const list = $('histLogList');
    if (list && this.showHistLog && stats.waypoints) {
      const recent = stats.waypoints.slice(-15).reverse();
      list.innerHTML = recent.map(w => `
        <div class="hist-log-row">
          <span>#${w.index}</span>
          <span>${w.timeStr}</span>
          <span>${w.lon.toFixed(4)}°E, ${w.lat.toFixed(4)}°N</span>
          <span>${w.speed.toFixed(1)}m/s</span>
        </div>
      `).join('');
    }
  }

  updateWorkflow(missionSystem, activeRover) {
    if (!missionSystem) return;

    // Update Step Indicator
    const step1 = $('step-map');
    const step2 = $('step-transport');
    const step3 = $('step-lab');
    const step4 = $('step-research');

    const hasWaypoint = !!missionSystem.activeWaypoint;
    const hasCargo = !!missionSystem.transportCargo;
    const hasLab = !!missionSystem.labStation;
    const isCarrying = missionSystem.transportState === 'carrying_to_lab';

    if (step1) step1.className = 'wf-step' + (hasWaypoint || hasCargo ? ' done' : ' current');
    if (step2) step2.className = 'wf-step' + (hasCargo ? ' done' : (hasWaypoint ? ' active' : ''));
    if (step3) step3.className = 'wf-step' + (hasLab ? ' done' : (activeRover?.role === 'geological-investigation' ? ' current' : ''));
    if (step4) step4.className = 'wf-step' + (missionSystem.samplesAnalyzedCount > 0 ? ' done' : (isCarrying ? ' active' : ''));

    // Update Contextual Action Buttons based on active rover role
    const mainBtn = $('mainActionBtn');
    const secBtn = $('secActionBtn');

    if (!mainBtn || !activeRover) return;

    if (activeRover.role === 'surface-mapping') {
      $('act-role-title').innerHTML = `${ICONS.map(13)} <span>Ares Mapper (Eksplorasi)</span>`;
      $('act-role-status').textContent = hasWaypoint ? 'Waypoint Ditandai — Siap Dijemput' : 'Siap Menandai Titik Sampel';
      $('act-role-status').style.color = 'var(--data-cyan)';

      mainBtn.innerHTML = `${ICONS.pin(13)} <span>Tandai Waypoint Sampel (Space)</span>`;
      mainBtn.style.display = 'flex';
      mainBtn.style.alignItems = 'center';
      mainBtn.style.justifyContent = 'center';
      mainBtn.style.gap = '7px';
      mainBtn.style.background = 'linear-gradient(180deg, #1652b0 0%, #0b3d91 100%)';
      mainBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';

      if (secBtn) {
        secBtn.innerHTML = `${ICONS.truck(13)} <span>Panggil Hermes Transport (C)</span>`;
        secBtn.style.display = hasWaypoint ? 'flex' : 'none';
        secBtn.style.alignItems = 'center';
        secBtn.style.justifyContent = 'center';
        secBtn.style.gap = '7px';
        secBtn.style.background = 'rgba(16, 185, 129, 0.15)';
        secBtn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        secBtn.style.color = '#34d399';
      }
    } else if (activeRover.role === 'geological-investigation') {
      $('act-role-title').innerHTML = `${ICONS.microscope(13)} <span>Curiosity GeoLab (Riset)</span>`;
      $('act-role-status').textContent = hasLab ? 'Stasiun Lab Sains Berdiri' : 'Siap Membangun Stasiun Lab';
      $('act-role-status').style.color = '#f43f5e';

      mainBtn.innerHTML = hasLab ? `${ICONS.drill(13)} <span>Laser Raman & Bor Sampel (Space)</span>` : `${ICONS.settings(13)} <span>Bangun Stasiun Lab Sains (Space / B)</span>`;
      mainBtn.style.display = 'flex';
      mainBtn.style.alignItems = 'center';
      mainBtn.style.justifyContent = 'center';
      mainBtn.style.gap = '7px';
      mainBtn.style.background = 'linear-gradient(180deg, #e11d48 0%, #be123c 100%)';
      mainBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';

      if (secBtn) {
        secBtn.innerHTML = `${ICONS.gem(13)} <span>Analisis Batuan Sekitar</span>`;
        secBtn.style.display = hasLab ? 'flex' : 'none';
        secBtn.style.alignItems = 'center';
        secBtn.style.justifyContent = 'center';
        secBtn.style.gap = '7px';
        secBtn.style.background = 'rgba(255, 255, 255, 0.06)';
        secBtn.style.borderColor = 'var(--panel-border)';
        secBtn.style.color = 'var(--text-muted)';
      }
    } else if (activeRover.role === 'transport-support') {
      $('act-role-title').innerHTML = `${ICONS.truck(13)} <span>Hermes Container Hauler (Logistik)</span>`;
      const cargoText = hasCargo ? `Kargo: ${missionSystem.transportCargo.name}` : 'Radar: Memindai Benda Unik Mars...';
      $('act-role-status').innerHTML = `${hasCargo ? ICONS.package(12) : ICONS.radar(12)} <span>${cargoText}</span>`;
      $('act-role-status').style.display = 'inline-flex';
      $('act-role-status').style.alignItems = 'center';
      $('act-role-status').style.gap = '4px';
      $('act-role-status').style.color = hasCargo ? 'var(--status-green)' : 'var(--status-amber)';

      if (hasCargo) {
        mainBtn.innerHTML = hasLab ? `${ICONS.package(13)} <span>Kirim Kontainer ke Stasiun Lab (Space)</span>` : `${ICONS.settings(13)} <span>Bangun Lab Dahulu (Pakai GeoLab)!</span>`;
        mainBtn.style.background = hasLab ? 'linear-gradient(180deg, #059669 0%, #047857 100%)' : 'rgba(245, 158, 11, 0.2)';
        mainBtn.style.borderColor = hasLab ? 'rgba(255, 255, 255, 0.2)' : 'rgba(245, 158, 11, 0.4)';
      } else {
        mainBtn.innerHTML = `${ICONS.radar(13)} <span>Kunci Target Radar / Jemput (Space)</span>`;
        mainBtn.style.background = 'linear-gradient(180deg, #059669 0%, #047857 100%)';
        mainBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      }
      mainBtn.style.display = 'flex';
      mainBtn.style.alignItems = 'center';
      mainBtn.style.justifyContent = 'center';
      mainBtn.style.gap = '7px';

      if (secBtn) {
        secBtn.style.display = 'none';
      }
    }

    // Update Quest Checklist
    const questList = $('questList');
    if (questList && missionSystem.quests) {
      questList.innerHTML = missionSystem.quests.map(q => `
        <div class="quest-item ${q.completed ? 'completed' : ''}" style="display:flex;align-items:center;gap:7px;">
          <span style="display:inline-flex;align-items:center;color:${q.completed ? 'var(--status-green)' : 'var(--text-dim)'};">${q.completed ? ICONS.checkCircle(13) : ICONS.circle(13)}</span>
          <span>${q.title}</span>
        </div>
      `).join('');
    }

    // Score display
    if ($('scienceScore')) {
      $('scienceScore').textContent = `${missionSystem.researchScore} Poin Riset`;
    }
  }

  setMeshInfo(i) {
    if ($('meshInfo')) {
      $('meshInfo').textContent = `${(i.vertices / 1e3).toFixed(0)}k vertices · ${(i.triangles / 1e3).toFixed(0)}k tris · ${i.meshCell} m`;
    }
  }

  update(s) {
    // Flight Dynamics Telemetry Card
    if ($('r-speed')) $('r-speed').textContent = `${s.speed.toFixed(1)} m/s`;
    if ($('r-el')) $('r-el').textContent = `${s.elev.toFixed(0)} m`;
    if ($('r-hd')) $('r-hd').textContent = `${((s.heading * 180 / Math.PI) % 360 + 360) % 360 | 0}°`;
    if ($('r-slope')) $('r-slope').textContent = `${s.slope.toFixed(1)}°`;
    if ($('r-status')) {
      $('r-status').textContent = s.status;
      $('r-status').style.color = s.status.startsWith('blocked') ? 'var(--status-amber)' : 'var(--data-cyan)';
    }

    // Fast top telemetry bar
    if ($('topSpeed')) $('topSpeed').textContent = `${s.speed.toFixed(1)} m/s`;
    if ($('topElev')) $('topElev').textContent = `${s.elev.toFixed(0)} m`;
    if ($('fps')) $('fps').textContent = `${s.fps.toFixed(0)}`;
  }

  setInspect(p) {
    const el = $('inspect');
    if (el) {
      if (p) {
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.gap = '6px';
        el.innerHTML = `${ICONS.pin(12)} <span>${p.lon.toFixed(5)}° E, ${p.lat.toFixed(5)}° N · Elev: ${p.elevation.toFixed(1)} m</span>`;
      } else {
        el.style.display = 'none';
      }
    }
  }

  showError(m) {
    $('loading').textContent = m;
    $('loading').classList.add('err');
  }

  hideLoading() {
    $('loading').style.display = 'none';
  }

  setLoading(m) {
    $('loading').textContent = m;
  }
}
