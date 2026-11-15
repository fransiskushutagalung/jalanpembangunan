import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { ICONS } from './icons.js';

/**
 * VisualPerceptionPanel
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the full "VISUAL PERCEPTION & MISSION DOCUMENTATION" UI panel.
 * Integrates:
 *   Tab 1 – LIVE CAMERA   (live 3D scene snapshot)
 *   Tab 2 – DEPTH VIEW    (synthesized depth map)
 *   Tab 3 – 3D POINT CLOUD (interactive Three.js reconstruction)
 *   Tab 4 – MISSION GALLERY (all past mission docs with filter)
 *
 * Also renders a full-screen detail MODAL when user clicks "VIEW DOCUMENTATION".
 */
export class VisualPerceptionPanel {
  /**
   * @param {VisualPerceptionSystem} vpms
   */
  constructor(vpms) {
    this.vpms = vpms;
    this.panelEl = null;
    this.activeTab = 'camera';
    this.pcRenderer = null;
    this.pcControls = null;
    this.pcAnimFrame = null;
    this.currentDocId = null;
    this.modalOpen = false;

    this.#buildPanel();
    this.#injectStyles();
    this.#bindVpmsCallback();
  }

  /* ──────────────────────────────────────────────────────────────────────────
     BUILD PANEL DOM
     ────────────────────────────────────────────────────────────────────────── */

  #buildPanel() {
    const el = document.createElement('div');
    el.id = 'vpPanel';
    el.className = 'vp-panel';
    el.innerHTML = this.#panelHTML();
    document.body.appendChild(el);
    this.panelEl = el;

    // Tab buttons
    el.querySelectorAll('.vp-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.#switchTab(btn.dataset.tab));
    });

    // Live Capture button
    const captureBtn = el.querySelector('#vpCaptureBtn');
    if (captureBtn) {
      captureBtn.addEventListener('click', () => {
        if (this.vpms._rovers) {
          const doc = this.vpms.captureManual(this.vpms._rovers, this.vpms._activeIdx);
          if (doc) {
            this.showCameraTab(doc);
            this.showToast('Manual snapshot captured');
          }
        }
      });
    }

    // Gallery filter
    const roverFilter = el.querySelector('#vpGalleryRover');
    if (roverFilter) roverFilter.addEventListener('change', () => this.#renderGallery());
    const regionFilter = el.querySelector('#vpGalleryRegion');
    if (regionFilter) regionFilter.addEventListener('change', () => this.#renderGallery());

    // Minimize / close panel toggle
    const toggleBtn = el.querySelector('#vpMinimize');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const body = el.querySelector('.vp-panel-body');
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'flex' : 'none';
        toggleBtn.textContent = isHidden ? '−' : '+';
      });
    }

    // Build the modal overlay
    this.#buildModal();
  }

  #panelHTML() {
    return `
      <div class="vp-panel-header">
        <div class="vp-agency-tag">NASA/JPL <span class="vp-mode-badge" id="vpModeBadge">SIM</span></div>
        <div class="vp-panel-title">VISUAL PERCEPTION &amp; DOCUMENTATION</div>
        <button class="vp-ctrl-btn" id="vpMinimize">−</button>
      </div>
      <div class="vp-panel-body">
        <!-- Tab Bar -->
        <div class="vp-tabs">
          <button class="vp-tab-btn active btn-with-icon" data-tab="camera">
            ${ICONS.camera(12)}
            <span>LIVE CAM</span>
          </button>
          <button class="vp-tab-btn btn-with-icon" data-tab="depth">
            ${ICONS.slope(12)}
            <span>DEPTH</span>
          </button>
          <button class="vp-tab-btn btn-with-icon" data-tab="pointcloud">
            ${ICONS.layers(12)}
            <span>3D CLOUD</span>
          </button>
          <button class="vp-tab-btn btn-with-icon" data-tab="gallery">
            ${ICONS.fileText(12)}
            <span>GALLERY</span>
          </button>
        </div>

        <!-- ═══════════════ TAB: LIVE CAMERA ═══════════════ -->
        <div class="vp-tab-pane active" id="vpTab-camera">
          <div class="vp-cam-header">
            <div>
              <span class="vp-status-dot" id="vpCamStatusDot"></span>
              <span id="vpCamStatus" class="vp-label-mono">CAMERA IDLE</span>
            </div>
            <div class="vp-cam-meta" id="vpCamMeta">—</div>
          </div>
          <div class="vp-cam-viewport" id="vpCamViewport">
            <div class="vp-no-data" id="vpCamNoData">
              <div class="vp-nd-icon" style="color:var(--data-cyan)">${ICONS.camera(32)}</div>
              <div class="vp-nd-title">NO SNAPSHOT AVAILABLE</div>
              <div class="vp-nd-sub">Complete a mission task or press the capture button<br>to take a manual snapshot.</div>
            </div>
            <img id="vpCamImage" class="vp-cam-image" style="display:none" alt="Rover Front Camera">
            <div class="vp-cam-overlay" id="vpCamOverlay"></div>
          </div>
          <div class="vp-cam-controls">
            <button class="vp-action-btn btn-with-icon" id="vpCaptureBtn">
              ${ICONS.camera(13)}
              <span>CAPTURE SNAPSHOT</span>
            </button>
            <div class="vp-cam-spec">
              <span>CAM: <b id="vpCamId">FRONT_CAMERA_SIM</b></span>
              <span>RES: <b>1920×1080</b></span>
              <span>MODE: <b id="vpCamMode">SIMULATION</b></span>
            </div>
          </div>
        </div>

        <!-- ═══════════════ TAB: DEPTH VIEW ═══════════════ -->
        <div class="vp-tab-pane" id="vpTab-depth">
          <div class="vp-cam-header">
            <div>
              <span class="vp-status-dot" id="vpDepthStatusDot" style="background:#f59e0b"></span>
              <span class="vp-label-mono">DEPTH MAP</span>
            </div>
            <span class="vp-label-mono" style="color:#94a3b8;font-size:9px;">⚠ RELATIVE MONOCULAR ESTIMATION · NOT ABSOLUTE METRIC</span>
          </div>
          <div class="vp-cam-viewport" id="vpDepthViewport">
            <div class="vp-no-data" id="vpDepthNoData">
              <div class="vp-nd-icon" style="color:#f59e0b">${ICONS.slope(32)}</div>
              <div class="vp-nd-title">NO DEPTH DATA</div>
              <div class="vp-nd-sub">Complete a task to generate a depth estimation from terrain heightfield.</div>
            </div>
            <img id="vpDepthImage" class="vp-cam-image" style="display:none" alt="Depth Map">
          </div>
          <div class="vp-cam-controls">
            <div class="vp-depth-legend">
              <span class="vp-legend-label" style="color:#dc2626">■ Near</span>
              <div class="vp-legend-bar" id="vpDepthLegendBar"></div>
              <span class="vp-legend-label" style="color:#2563eb">■ Far</span>
            </div>
            <div class="vp-cam-spec" id="vpDepthMeta">Source: Terrain heightfield elevation delta · FOV 108° H × 72° V</div>
          </div>
        </div>

        <!-- ═══════════════ TAB: 3D POINT CLOUD ═══════════════ -->
        <div class="vp-tab-pane" id="vpTab-pointcloud">
          <div class="vp-cam-header">
            <div>
              <span class="vp-status-dot" id="vpPcStatusDot" style="background:#94a3b8"></span>
              <span class="vp-label-mono" id="vpPcStatus">3D RECONSTRUCTION — IDLE</span>
            </div>
            <button class="vp-ctrl-btn btn-with-icon" id="vpPcResetBtn" title="Reset Camera">
              ${ICONS.rotateCcw(11)}
              <span>Reset</span>
            </button>
          </div>
          <div id="vpPointCloud" class="vp-cam-viewport" style="background:#050810;">
            <div class="vp-no-data" id="vpPcNoData">
              <div class="vp-nd-icon" style="color:#a855f7">${ICONS.layers(32)}</div>
              <div class="vp-nd-title">NO POINT CLOUD DATA</div>
              <div class="vp-nd-sub">Complete a mission task to build a 3D terrain reconstruction.</div>
            </div>
          </div>
          <div class="vp-cam-controls">
            <div class="vp-cam-spec">Drag: Rotate · Right-drag: Pan · Scroll: Zoom · Terrain radius: 2.2 km</div>
          </div>
        </div>

        <!-- ═══════════════ TAB: MISSION GALLERY ═══════════════ -->
        <div class="vp-tab-pane" id="vpTab-gallery">
          <div class="vp-gallery-filters">
            <select id="vpGalleryRover" class="vp-select">
              <option value="ALL">All Rovers</option>
              <option value="01">ROV-01 Ares Mapper</option>
              <option value="02">ROV-02 GeoLab</option>
              <option value="03">ROV-03 Hermes</option>
            </select>
            <select id="vpGalleryRegion" class="vp-select">
              <option value="ALL">All Regions</option>
              <option value="elysium">Elysium</option>
              <option value="syrtis">Syrtis Major</option>
              <option value="acidalia">Acidalia</option>
              <option value="arabia">Arabia Terra</option>
              <option value="isidis">Isidis</option>
              <option value="hesperia">Hesperia</option>
              <option value="manual">Manual</option>
            </select>
            <span id="vpGalleryCount" class="vp-label-mono" style="color:#64748b;align-self:center;font-size:9px;">0 RECORDS</span>
          </div>
          <div class="vp-gallery-list" id="vpGalleryList">
            <div class="vp-no-data" style="height:100%">
              <div class="vp-nd-icon" style="color:#64748b">${ICONS.fileText(32)}</div>
              <div class="vp-nd-title">MISSION GALLERY EMPTY</div>
              <div class="vp-nd-sub">Documentation will appear here as mission tasks are completed.</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  #buildModal() {
    const m = document.createElement('div');
    m.id = 'vpModal';
    m.className = 'vp-modal';
    m.innerHTML = `
      <div class="vp-modal-content">
        <div class="vp-modal-header">
          <div>
            <div class="vp-modal-title" id="vpModalTitle">MISSION DOCUMENTATION</div>
            <div class="vp-label-mono" id="vpModalSubtitle" style="color:#94a3b8;margin-top:2px;"></div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="vp-action-btn btn-with-icon" id="vpModalDownloadBtn">
              ${ICONS.fileText(12)}
              <span>Download</span>
            </button>
            <button class="vp-ctrl-btn" id="vpModalClose" style="display:inline-flex;align-items:center;justify-content:center;">${ICONS.x(12)}</button>
          </div>
        </div>
        <div class="vp-modal-body" id="vpModalBody">
          <!-- Populated dynamically -->
        </div>
      </div>
    `;
    document.body.appendChild(m);

    m.querySelector('#vpModalClose').addEventListener('click', () => this.closeModal());
    m.addEventListener('click', (e) => { if (e.target === m) this.closeModal(); });
    m.querySelector('#vpModalDownloadBtn').addEventListener('click', () => this.#downloadCurrentDoc());

    this.modalEl = m;
  }

  /* ──────────────────────────────────────────────────────────────────────────
     TAB SWITCHING
     ────────────────────────────────────────────────────────────────────────── */

  #switchTab(tab) {
    this.activeTab = tab;
    this.panelEl.querySelectorAll('.vp-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    this.panelEl.querySelectorAll('.vp-tab-pane').forEach(p => p.classList.toggle('active', p.id === `vpTab-${tab}`));

    if (tab === 'gallery') {
      this.#renderGallery();
    } else if (tab === 'pointcloud' && this.pcScene) {
      // Resume point cloud animation
      this.#startPcAnimation();
    } else {
      this.#stopPcAnimation();
    }
  }

  /* ──────────────────────────────────────────────────────────────────────────
     CAMERA TAB
     ────────────────────────────────────────────────────────────────────────── */

  showCameraTab(doc) {
    const img = document.getElementById('vpCamImage');
    const noData = document.getElementById('vpCamNoData');
    const status = document.getElementById('vpCamStatus');
    const dot = document.getElementById('vpCamStatusDot');
    const overlay = document.getElementById('vpCamOverlay');
    const meta = document.getElementById('vpCamMeta');
    const modeEl = document.getElementById('vpCamMode');
    const camIdEl = document.getElementById('vpCamId');

    if (!doc || !doc.rgbDataUrl) {
      status.textContent = 'CAMERA UNAVAILABLE';
      dot.style.background = '#ef4444';
      img.style.display = 'none';
      noData.style.display = 'flex';
      return;
    }

    img.src = doc.rgbDataUrl;
    img.style.display = 'block';
    noData.style.display = 'none';
    dot.style.background = '#10b981';
    status.textContent = `SNAPSHOT CAPTURED · ${doc.shortTimestamp}`;
    meta.textContent = `LON ${doc.roverPosition.lon}° E  LAT ${doc.roverPosition.lat}° N  ELEV ${doc.roverElevation} m  HDG ${doc.roverHeading}°`;
    overlay.textContent = `ROV-${doc.roverId} · ${doc.cameraId} · ${doc.captureMode}`;
    if (modeEl) modeEl.textContent = doc.captureMode;
    if (camIdEl) camIdEl.textContent = doc.cameraId;
    this.currentDocId = doc.docId;
  }

  /* ──────────────────────────────────────────────────────────────────────────
     DEPTH TAB
     ────────────────────────────────────────────────────────────────────────── */

  showDepthTab(doc) {
    const img = document.getElementById('vpDepthImage');
    const noData = document.getElementById('vpDepthNoData');
    const dot = document.getElementById('vpDepthStatusDot');
    const meta = document.getElementById('vpDepthMeta');

    if (!doc || !doc.depthDataUrl) {
      dot.style.background = '#ef4444';
      img.style.display = 'none';
      noData.style.display = 'flex';
      return;
    }

    img.src = doc.depthDataUrl;
    img.style.display = 'block';
    noData.style.display = 'none';
    dot.style.background = '#f59e0b';
    meta.textContent = `Heightfield delta depth · ${doc.roverName} at ${doc.regionName} · ${doc.shortTimestamp}`;
  }

  /* ──────────────────────────────────────────────────────────────────────────
     POINT CLOUD TAB
     ────────────────────────────────────────────────────────────────────────── */

  showPointCloud(doc) {
    const container = document.getElementById('vpPointCloud');
    const noData = document.getElementById('vpPcNoData');
    const status = document.getElementById('vpPcStatus');
    const dot = document.getElementById('vpPcStatusDot');

    if (!doc || !doc.pointCloudData || doc.pointCloudData.length === 0) {
      status.textContent = 'INSUFFICIENT DEPTH DATA';
      dot.style.background = '#ef4444';
      noData.style.display = 'flex';
      return;
    }

    noData.style.display = 'none';
    dot.style.background = '#10b981';
    status.textContent = `${doc.pointCloudData.length} POINTS · ${doc.regionName}`;

    // Destroy existing renderer
    this.#disposePcRenderer();

    const W = container.clientWidth || 390;
    const H = container.clientHeight || 200;

    this.pcRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.pcRenderer.setSize(W, H);
    this.pcRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.pcRenderer.domElement.style.width = '100%';
    this.pcRenderer.domElement.style.height = '100%';
    container.appendChild(this.pcRenderer.domElement);

    this.pcScene = new THREE.Scene();
    this.pcScene.background = new THREE.Color(0x060a12);

    // Grid floor
    const grid = new THREE.GridHelper(5, 20, 0x1e293b, 0x0f172a);
    this.pcScene.add(grid);

    // Build point cloud geometry
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(doc.pointCloudData.length * 3);
    const colors = new Float32Array(doc.pointCloudData.length * 3);

    for (let i = 0; i < doc.pointCloudData.length; i++) {
      const p = doc.pointCloudData[i];
      positions[i * 3]     = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      const r = ((p.color >> 16) & 0xff) / 255;
      const g = ((p.color >> 8)  & 0xff) / 255;
      const b = (p.color         & 0xff) / 255;
      colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({ size: 0.028, vertexColors: true, sizeAttenuation: true });
    const cloud = new THREE.Points(geo, mat);
    this.pcScene.add(cloud);

    // Rover marker at centre
    const roverMarker = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.08),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff }),
    );
    this.pcScene.add(roverMarker);

    this.pcCamera = new THREE.PerspectiveCamera(55, W / H, 0.01, 50);
    this.pcCamera.position.set(2.5, 1.5, 2.5);

    this.pcControls = new OrbitControls(this.pcCamera, this.pcRenderer.domElement);
    this.pcControls.target.set(0, 0, 0);
    this.pcControls.enableDamping = true;
    this.pcControls.dampingFactor = 0.08;
    this.pcControls.minDistance = 0.5;
    this.pcControls.maxDistance = 8;
    this.pcControls.update();

    // Reset view button
    const resetBtn = document.getElementById('vpPcResetBtn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        this.pcCamera.position.set(2.5, 1.5, 2.5);
        this.pcControls.target.set(0, 0, 0);
        this.pcControls.update();
      };
    }

    this.#startPcAnimation();
    this.currentDocId = doc.docId;
  }

  #startPcAnimation() {
    if (this.pcAnimRunning) return;
    this.pcAnimRunning = true;
    const animate = () => {
      if (!this.pcAnimRunning) return;
      this.pcAnimFrame = requestAnimationFrame(animate);
      if (this.pcControls) this.pcControls.update();
      if (this.pcRenderer && this.pcScene && this.pcCamera) {
        this.pcRenderer.render(this.pcScene, this.pcCamera);
      }
    };
    animate();
  }

  #stopPcAnimation() {
    this.pcAnimRunning = false;
    if (this.pcAnimFrame) {
      cancelAnimationFrame(this.pcAnimFrame);
      this.pcAnimFrame = null;
    }
  }

  #disposePcRenderer() {
    this.#stopPcAnimation();
    if (this.pcRenderer) {
      const el = this.pcRenderer.domElement;
      if (el.parentNode) el.parentNode.removeChild(el);
      this.pcRenderer.dispose();
      this.pcRenderer = null;
    }
    this.pcScene = null;
    this.pcCamera = null;
    this.pcControls = null;
  }

  /* ──────────────────────────────────────────────────────────────────────────
     MISSION GALLERY
     ────────────────────────────────────────────────────────────────────────── */

  #renderGallery() {
    const list = document.getElementById('vpGalleryList');
    const countEl = document.getElementById('vpGalleryCount');
    if (!list) return;

    const roverFilter = document.getElementById('vpGalleryRover')?.value || 'ALL';
    const regionFilter = document.getElementById('vpGalleryRegion')?.value || 'ALL';

    const docs = this.vpms.getDocs({ roverId: roverFilter, regionId: regionFilter });

    if (countEl) countEl.textContent = `${docs.length} RECORD${docs.length !== 1 ? 'S' : ''}`;

    if (!docs.length) {
      list.innerHTML = `
        <div class="vp-no-data" style="height:100%">
          <div class="vp-nd-icon" style="color:#64748b">${ICONS.fileText(32)}</div>
          <div class="vp-nd-title">NO RECORDS MATCH FILTER</div>
          <div class="vp-nd-sub">Adjust the filters or complete mission tasks to generate documentation.</div>
        </div>`;
      return;
    }

    list.innerHTML = docs.map(d => this.#galleryCardHTML(d)).join('');

    // Bind view buttons
    list.querySelectorAll('.vp-view-doc-btn').forEach(btn => {
      btn.addEventListener('click', () => this.openModal(btn.dataset.docid));
    });
  }

  #galleryCardHTML(doc) {
    const hasRgb   = !!doc.rgbDataUrl;
    const hasDepth = !!doc.depthDataUrl;
    const hasPc    = doc.pointCloudData?.length > 0;

    const thumb = hasRgb
      ? `<img class="vp-thumb" src="${doc.rgbDataUrl}" alt="snapshot">`
      : `<div class="vp-thumb vp-thumb-na">NO<br>IMAGE</div>`;

    return `
      <div class="vp-gallery-card">
        <div class="vp-gc-thumb">${thumb}</div>
        <div class="vp-gc-info">
          <div class="vp-gc-taskid">${doc.taskId}</div>
          <div class="vp-gc-rover">ROV-${doc.roverId} · ${doc.roverName}</div>
          <div class="vp-gc-region">${doc.regionName}</div>
          <div class="vp-gc-desc">${doc.description}</div>
          <div class="vp-gc-badges">
            <span class="vp-badge ${hasRgb ? 'ok' : 'na'}">RGB</span>
            <span class="vp-badge ${hasDepth ? 'ok' : 'na'}">DEPTH</span>
            <span class="vp-badge ${hasPc ? 'ok' : 'na'}">3D-PC</span>
            <span class="vp-badge ${doc.captureMode === 'REAL_ROVER' ? 'real' : 'sim'}">${doc.captureMode}</span>
          </div>
          <div class="vp-gc-ts">${doc.shortTimestamp}</div>
        </div>
        <button class="vp-view-doc-btn" data-docid="${doc.docId}">VIEW DOCUMENTATION ›</button>
      </div>
    `;
  }

  /* ──────────────────────────────────────────────────────────────────────────
     DETAIL MODAL & WORKSTATION VIEW
     ────────────────────────────────────────────────────────────────────────── */

  /**
   * Opens the full Visual Perception Workstation modal view.
   * If no docs exist yet, triggers an instant live snapshot of the active rover.
   */
  openWorkstationView() {
    // 1. Ensure the bottom-left panel is visible and expanded
    if (this.panelEl) {
      this.panelEl.style.display = 'flex';
      const body = this.panelEl.querySelector('.vp-panel-body');
      if (body) body.style.display = 'flex';
      const minBtn = this.panelEl.querySelector('#vpMinimize');
      if (minBtn) minBtn.textContent = '−';
    }

    // 2. Fetch latest doc, or perform instant live capture if none exists
    const docs = this.vpms.getDocs();
    let targetDoc = docs[0] || null;

    if (!targetDoc && this.vpms._rovers) {
      const activeIdx = this.vpms._activeIdx || 0;
      targetDoc = this.vpms.captureManual(this.vpms._rovers, activeIdx);
    }

    if (targetDoc) {
      this.showCameraTab(targetDoc);
      this.showDepthTab(targetDoc);
      this.showPointCloud(targetDoc);
      this.openModal(targetDoc.docId);
      this.showToast(`[VPMS] Dokumentasi Visual Aktif · ${targetDoc.taskId}`);
    } else {
      this.#switchTab('camera');
      this.showToast('[VPMS] Panel Persepsi Visual Terbuka');
    }
  }

  openModal(docId) {
    const doc = this.vpms.getDocById(docId);
    if (!doc) return;
    this.currentDocId = docId;
    this.modalOpen = true;

    document.getElementById('vpModalTitle').textContent = `MISSION DOCUMENTATION · ${doc.taskId}`;
    document.getElementById('vpModalSubtitle').textContent =
      `ROV-${doc.roverId} ${doc.roverName} · ${doc.regionName} · ${doc.shortTimestamp}`;

    document.getElementById('vpModalBody').innerHTML = this.#modalBodyHTML(doc);
    this.modalEl.classList.add('open');

    // Comparison slider (simple side-by-side)
    const pcBtn = document.getElementById('vpModalPcBtn');
    if (pcBtn) {
      pcBtn.addEventListener('click', () => {
        this.#switchTab('pointcloud');
        this.showPointCloud(doc);
        this.closeModal();
      });
    }

    // Zoom toggle on images
    this.modalEl.querySelectorAll('.vp-modal-img').forEach(img => {
      img.addEventListener('click', () => img.classList.toggle('vp-modal-img-zoomed'));
    });
  }

  #modalBodyHTML(doc) {
    const hasRgb   = !!doc.rgbDataUrl;
    const hasDepth = !!doc.depthDataUrl;
    const hasPc    = doc.pointCloudData?.length > 0;

    const rgbHTML = hasRgb
      ? `<img class="vp-modal-img" src="${doc.rgbDataUrl}" alt="RGB Snapshot" title="Click to zoom">`
      : `<div class="vp-modal-na" style="display:flex;flex-direction:column;align-items:center;gap:6px;">${ICONS.camera(20)}<span>RGB CAMERA UNAVAILABLE</span></div>`;

    const depthHTML = hasDepth
      ? `<img class="vp-modal-img" src="${doc.depthDataUrl}" alt="Depth Map" title="Click to zoom">`
      : `<div class="vp-modal-na" style="display:flex;flex-direction:column;align-items:center;gap:6px;">${ICONS.slope(20)}<span>DEPTH DATA UNAVAILABLE</span></div>`;

    return `
      <div class="vp-modal-images">
        <div class="vp-modal-img-col">
          <div class="vp-modal-img-label">RGB CAMERA SNAPSHOT</div>
          ${rgbHTML}
        </div>
        <div class="vp-modal-img-col">
          <div class="vp-modal-img-label">DEPTH MAP <small style="color:#94a3b8">(relative estimation)</small></div>
          ${depthHTML}
        </div>
      </div>

      <div class="vp-modal-meta">
        <table class="vp-meta-table">
          <tr><td>Task ID</td><td>${doc.taskId}</td><td>Rover ID</td><td>ROV-${doc.roverId} · ${doc.roverName}</td></tr>
          <tr><td>Description</td><td colspan="3">${doc.description}</td></tr>
          <tr><td>Region</td><td>${doc.regionName}</td><td>Camera ID</td><td>${doc.cameraId}</td></tr>
          <tr><td>Longitude</td><td>${doc.roverPosition.lon}° E</td><td>Latitude</td><td>${doc.roverPosition.lat}° N</td></tr>
          <tr><td>Elevation</td><td>${doc.roverElevation} m</td><td>Heading</td><td>${doc.roverHeading}°</td></tr>
          <tr><td>Capture Time</td><td>${doc.shortTimestamp}</td><td>Mode</td><td><b>${doc.captureMode}</b></td></tr>
          <tr><td>RGB Status</td><td>${doc.rgbStatus}</td><td>Depth Status</td><td>${doc.depthStatus}</td></tr>
          <tr><td>Point Cloud</td><td>${doc.pointCloudStatus} (${doc.pointCloudData?.length || 0} pts)</td><td>Analysis</td><td>${doc.mineral}</td></tr>
          <tr><td colspan="4" style="color:#94a3b8;font-size:9.5px;padding-top:4px;">${doc.analysisResult}</td></tr>
        </table>
        <button class="vp-action-btn btn-with-icon" id="vpModalPcBtn" ${hasPc ? '' : 'disabled'}>
          ${ICONS.layers(12)}
          <span>Open 3D Point Cloud Viewer</span>
        </button>
      </div>
    `;
  }

  closeModal() {
    this.modalOpen = false;
    this.modalEl.classList.remove('open');
  }

  /* ──────────────────────────────────────────────────────────────────────────
     DOWNLOAD
     ────────────────────────────────────────────────────────────────────────── */

  #downloadCurrentDoc() {
    const doc = this.vpms.getDocById(this.currentDocId);
    if (!doc) return;

    const data = JSON.stringify(doc, (k, v) => {
      if (k === 'rgbDataUrl' || k === 'depthDataUrl') return '[base64 image — stripped for JSON download]';
      if (k === 'pointCloudData') return `[${v.length} points]`;
      return v;
    }, 2);

    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${doc.taskId}_${doc.roverId}_documentation.json`;
    a.click();
    URL.revokeObjectURL(url);

    // Also offer RGB image download
    if (doc.rgbDataUrl) {
      const a2    = document.createElement('a');
      a2.href     = doc.rgbDataUrl;
      a2.download = `${doc.taskId}_rgb.png`;
      a2.click();
    }
  }

  /* ──────────────────────────────────────────────────────────────────────────
     TOAST
     ────────────────────────────────────────────────────────────────────────── */

  showToast(msg) {
    const existing = document.getElementById('toast');
    if (existing) {
      existing.textContent = msg;
      existing.style.display = 'block';
      setTimeout(() => { existing.style.display = 'none'; }, 3500);
    }
  }

  /* ──────────────────────────────────────────────────────────────────────────
     VPMS CALLBACK — auto-update UI on new doc
     ────────────────────────────────────────────────────────────────────────── */

  #bindVpmsCallback() {
    this.vpms.onDocAdded = (doc) => {
      // Update mode badge
      const badge = document.getElementById('vpModeBadge');
      if (badge) badge.textContent = this.vpms.mode === 'REAL_ROVER' ? 'REAL' : 'SIM';

      // Auto-populate camera and depth tabs with latest doc
      this.showCameraTab(doc);
      this.showDepthTab(doc);
      this.showPointCloud(doc);

      // If gallery tab is active, refresh it
      if (this.activeTab === 'gallery') this.#renderGallery();

      this.showToast(`[VPMS] Documentation captured: ${doc.taskId} · ${doc.regionName}`);
    };
  }

  /* ──────────────────────────────────────────────────────────────────────────
     STYLES
     ────────────────────────────────────────────────────────────────────────── */

  #injectStyles() {
    if (document.getElementById('vp-styles')) return;
    const s = document.createElement('style');
    s.id = 'vp-styles';
    s.textContent = `
      /* ═══ VISUAL PERCEPTION PANEL ═══ */
      .vp-panel {
        position: fixed;
        bottom: 44px;
        left: 12px;
        width: 420px;
        background: rgba(10, 14, 22, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        z-index: 950;
        font-family: var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif);
        font-size: 11px;
        color: #e2e8f0;
        box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        max-height: calc(100vh - 100px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .vp-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: rgba(14, 20, 32, 0.7);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        flex-shrink: 0;
      }

      .vp-agency-tag {
        font-size: 11px;
        font-weight: 800;
        font-family: var(--font-mono, 'JetBrains Mono', monospace);
        color: #e03c31;
        letter-spacing: 0.8px;
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .vp-mode-badge {
        background: #1e3a52;
        color: #38bdf8;
        font-size: 9px;
        padding: 1px 4px;
        border-radius: 2px;
        font-weight: 700;
        letter-spacing: 0.5px;
      }

      .vp-panel-title {
        font-size: 10px;
        font-weight: 700;
        color: #94a3b8;
        letter-spacing: 0.5px;
      }

      .vp-ctrl-btn {
        background: transparent;
        border: 1px solid #334155;
        color: #64748b;
        border-radius: 2px;
        padding: 2px 6px;
        cursor: pointer;
        font-family: inherit;
        font-size: 11px;
      }
      .vp-ctrl-btn:hover { background: #1e293b; color: #fff; border-color: #00e5ff; }

      .vp-panel-body {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        flex: 1;
      }

      /* Tabs */
      .vp-tabs {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        border-bottom: 1px solid #1e293b;
        flex-shrink: 0;
      }

      .vp-tab-btn {
        background: #0c131f;
        border: 0;
        border-right: 1px solid #1e293b;
        color: #64748b;
        padding: 6px 2px;
        cursor: pointer;
        font-family: inherit;
        font-size: 9.5px;
        font-weight: 700;
        letter-spacing: 0.3px;
        transition: color 0.12s, background 0.12s;
      }
      .vp-tab-btn:last-child { border-right: 0; }
      .vp-tab-btn:hover { background: #161f2c; color: #94a3b8; }
      .vp-tab-btn.active { color: #00e5ff; background: #101822; border-bottom: 2px solid #00e5ff; }

      /* Panes */
      .vp-tab-pane { display: none; flex-direction: column; flex: 1; overflow: hidden; }
      .vp-tab-pane.active { display: flex; }

      /* Camera header row */
      .vp-cam-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 8px;
        background: #0a0f17;
        border-bottom: 1px solid #1e293b;
        flex-shrink: 0;
        gap: 8px;
      }

      .vp-status-dot {
        display: inline-block;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #64748b;
        margin-right: 5px;
      }

      .vp-label-mono {
        font-family: inherit;
        font-size: 9.5px;
        color: #94a3b8;
      }

      .vp-cam-meta {
        font-size: 8.5px;
        color: #64748b;
      }

      /* Viewport */
      .vp-cam-viewport {
        flex: 1;
        position: relative;
        background: #07090d;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        min-height: 180px;
      }

      .vp-cam-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .vp-cam-overlay {
        position: absolute;
        bottom: 5px;
        left: 8px;
        font-size: 8.5px;
        color: rgba(0, 229, 255, 0.75);
        pointer-events: none;
        font-family: inherit;
      }

      /* No data placeholder */
      .vp-no-data {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        text-align: center;
        color: #334155;
        gap: 8px;
      }
      .vp-nd-icon { font-size: 32px; opacity: 0.5; }
      .vp-nd-title { font-weight: 700; font-size: 11px; color: #475569; }
      .vp-nd-sub { font-size: 10px; color: #334155; line-height: 1.4; }

      /* Controls bar */
      .vp-cam-controls {
        padding: 5px 8px;
        background: #0a0f17;
        border-top: 1px solid #1e293b;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .vp-action-btn {
        background: #0b3d91;
        border: 1px solid #1e4fa3;
        color: #fff;
        border-radius: 2px;
        padding: 4px 10px;
        cursor: pointer;
        font-family: inherit;
        font-size: 10px;
        font-weight: 700;
        white-space: nowrap;
      }
      .vp-action-btn:hover { background: #1251b8; }
      .vp-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

      .vp-cam-spec {
        font-size: 8.5px;
        color: #475569;
        display: flex;
        gap: 10px;
      }
      .vp-cam-spec b { color: #94a3b8; }

      /* Depth legend */
      .vp-depth-legend {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 9px;
        font-weight: 700;
      }
      .vp-legend-bar {
        width: 100px;
        height: 8px;
        background: linear-gradient(to right, #dc2626, #f97316, #facc15, #22c55e, #38bdf8, #2563eb);
        border-radius: 1px;
      }
      .vp-legend-label { font-size: 9px; }

      /* Gallery */
      .vp-gallery-filters {
        display: flex;
        gap: 6px;
        padding: 6px 8px;
        background: #0a0f17;
        border-bottom: 1px solid #1e293b;
        flex-shrink: 0;
      }
      .vp-select {
        background: #111722;
        border: 1px solid #1e293b;
        color: #94a3b8;
        border-radius: 2px;
        padding: 3px 5px;
        font-family: inherit;
        font-size: 9.5px;
        flex: 1;
      }

      .vp-gallery-list {
        flex: 1;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: #1e293b transparent;
      }

      .vp-gallery-card {
        display: grid;
        grid-template-columns: 90px 1fr;
        grid-template-rows: auto auto;
        border-bottom: 1px solid #0f172a;
        padding: 6px 8px;
        gap: 0 8px;
        background: #0a0d14;
      }
      .vp-gallery-card:hover { background: #0d1420; }

      .vp-gc-thumb {
        grid-row: 1 / 3;
        display: flex;
        align-items: center;
      }
      .vp-thumb {
        width: 86px;
        height: 56px;
        object-fit: cover;
        border-radius: 2px;
        border: 1px solid #1e293b;
        display: block;
      }
      .vp-thumb-na {
        width: 86px;
        height: 56px;
        background: #111;
        border: 1px solid #1e293b;
        border-radius: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        color: #334155;
        text-align: center;
        line-height: 1.3;
      }

      .vp-gc-info { display: flex; flex-direction: column; gap: 2px; }
      .vp-gc-taskid { font-weight: 700; color: #00e5ff; font-size: 10px; }
      .vp-gc-rover { font-size: 9px; color: #94a3b8; }
      .vp-gc-region { font-size: 9px; color: #64748b; }
      .vp-gc-desc { font-size: 8.5px; color: #475569; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 230px; }
      .vp-gc-ts { font-size: 8.5px; color: #334155; }

      .vp-gc-badges { display: flex; gap: 3px; flex-wrap: wrap; }
      .vp-badge {
        font-size: 8px;
        font-weight: 700;
        padding: 1px 4px;
        border-radius: 2px;
      }
      .vp-badge.ok { background: #064e3b; color: #34d399; border: 1px solid #065f46; }
      .vp-badge.na { background: #1f2937; color: #4b5563; border: 1px solid #374151; }
      .vp-badge.real { background: #1e3a63; color: #60a5fa; border: 1px solid #1e40af; }
      .vp-badge.sim { background: #1c1f2a; color: #64748b; border: 1px solid #334155; }

      .vp-view-doc-btn {
        grid-column: 2;
        background: transparent;
        border: 1px solid #1e293b;
        color: #64748b;
        border-radius: 2px;
        padding: 3px 6px;
        cursor: pointer;
        font-family: inherit;
        font-size: 9px;
        font-weight: 700;
        text-align: left;
        margin-top: 4px;
        transition: all 0.1s;
      }
      .vp-view-doc-btn:hover { background: #0b3d91; color: #fff; border-color: #1e4fa3; }

      /* ═══ DETAIL MODAL ═══ */
      .vp-modal {
        position: fixed;
        inset: 0;
        background: rgba(5, 8, 15, 0.92);
        z-index: 10000;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        backdrop-filter: blur(8px);
      }
      .vp-modal.open { display: flex; }

      .vp-modal-content {
        background: #0a0f17;
        border: 1px solid #1e293b;
        border-radius: 4px;
        width: 100%;
        max-width: 900px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .vp-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: #0c131f;
        border-bottom: 1px solid #1e293b;
        flex-shrink: 0;
      }

      .vp-modal-title {
        font-size: 12.5px;
        font-weight: 700;
        color: #e2e8f0;
        font-family: ui-monospace, monospace;
        letter-spacing: 0.3px;
      }

      .vp-modal-body {
        flex: 1;
        overflow-y: auto;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .vp-modal-images {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .vp-modal-img-col { display: flex; flex-direction: column; gap: 4px; }
      .vp-modal-img-label {
        font-size: 9px;
        font-family: ui-monospace, monospace;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .vp-modal-img {
        width: 100%;
        border: 1px solid #1e293b;
        border-radius: 2px;
        cursor: zoom-in;
        transition: transform 0.2s;
      }
      .vp-modal-img:hover { border-color: #334155; }
      .vp-modal-img.vp-modal-img-zoomed {
        position: fixed;
        inset: 20px;
        width: auto;
        height: auto;
        max-height: calc(100vh - 40px);
        z-index: 2000;
        object-fit: contain;
        cursor: zoom-out;
        background: #000;
      }

      .vp-modal-na {
        background: #07090d;
        border: 1px solid #1e293b;
        border-radius: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        font-size: 11px;
        color: #334155;
        text-align: center;
        font-family: ui-monospace, monospace;
        font-weight: 700;
      }

      .vp-modal-meta { display: flex; flex-direction: column; gap: 8px; }

      .vp-meta-table {
        width: 100%;
        border-collapse: collapse;
        font-family: ui-monospace, monospace;
        font-size: 10px;
      }
      .vp-meta-table td {
        padding: 4px 6px;
        border-bottom: 1px solid #0f172a;
        vertical-align: top;
      }
      .vp-meta-table td:nth-child(odd) { color: #475569; width: 100px; }
      .vp-meta-table td:nth-child(even) { color: #e2e8f0; }
    `;
    document.head.appendChild(s);
  }
}
