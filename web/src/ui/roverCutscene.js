import * as THREE from 'three';

/**
 * RoverCutscene
 * Plays a cinematic intro sequence when the player accepts the tutorial.
 * Shows each rover up close with the camera slowly orbiting it,
 * and an intro card describing its role. Click "Next" to advance.
 *
 * Usage:
 *   const cs = new RoverCutscene({ camera, rig, swarm, onComplete });
 *   cs.play();
 *   // call cs.tick(dt) every frame while cs.active is true
 */

const SLIDES = [
  {
    roverIndex: 0,
    callsign: '01',
    name: 'Ares Mapper',
    role: 'Surface Mapping & Exploration',
    accentHex: '#00d4ff',
    icon: '🗺️',
    description: 'Ares Mapper leads the swarm into uncharted Martian terrain. Equipped with a 360° LiDAR dome and phased radar arrays, it surveys topography, identifies safe routes, and marks geological sample sites for the team.',
    equipment: ['LiDAR 360° Dome', 'Phased Terrain Radar', 'Dual Solar Arrays'],
    orbitRadius: 160,
    orbitHeight: 110,
    orbitSpeed: 0.30,
    orbitStartAngle: Math.PI * 0.25,
  },
  {
    roverIndex: 1,
    callsign: '02',
    name: 'Curiosity GeoLab',
    role: 'Geological Investigation',
    accentHex: '#ff3b5c',
    icon: '🔬',
    description: 'GeoLab is the science core of the mission. Its robotic drill arm cores rock samples up to 7 cm deep, while the SuperCam Raman laser identifies mineral composition from a distance — searching for biosignatures in ancient Martian sediment.',
    equipment: ['Heavy Core Drill Arm', 'SuperCam Raman Laser', 'Sample Carousel Drum'],
    orbitRadius: 160,
    orbitHeight: 110,
    orbitSpeed: 0.28,
    orbitStartAngle: Math.PI * 0.65,
  },
  {
    roverIndex: 2,
    callsign: '03',
    name: 'Hermes Transport',
    role: 'Mission Transport & Support',
    accentHex: '#00ff88',
    icon: '🚛',
    description: 'Hermes is the backbone of sample logistics. Its radar auto-detects collected specimens, loads them into the sealed cargo container, and delivers them at high speed to the Science Lab — while maintaining a continuous orbital relay uplink to MRO.',
    equipment: ['10-Slot Specimen Cache Rack', 'Orbital High-Gain Relay', 'Twin Rocket Boosters'],
    orbitRadius: 180,
    orbitHeight: 120,
    orbitSpeed: 0.25,
    orbitStartAngle: Math.PI * 1.1,
  },
];

export class RoverCutscene {
  /**
   * @param {{ camera: THREE.PerspectiveCamera, rig: object, swarm: object, onComplete: () => void }} opts
   */
  constructor({ camera, rig, swarm, onComplete }) {
    this.camera = camera;
    this.rig = rig;
    this.swarm = swarm;
    this.onComplete = onComplete || (() => {});

    this.active = false;
    this._slideIndex = 0;
    this._orbitAngle = 0;
    this._camPos = new THREE.Vector3();
    this._camTarget = new THREE.Vector3();
    this._lerpPos = new THREE.Vector3();
    this._lerpTarget = new THREE.Vector3();
    this._transitioning = false;
    this._transitionProgress = 0;
    this._transitionFrom = new THREE.Vector3();
    this._transitionFromTarget = new THREE.Vector3();

    this._buildStyles();
    this._buildDOM();
  }

  play() {
    this.active = true;
    this._slideIndex = 0;
    this._transitioning = false;

    // Hide simulator UI panels during cutscene
    const panels = ['topControlBar', 'robotDetailPanel', 'help'];
    panels.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.dataset.csHidden = el.style.display;
      if (el) el.style.display = 'none';
    });

    // Spread rovers apart so each is clearly isolated when focused
    const rovers = this.swarm.rovers;
    if (rovers.length >= 3) {
      const base = rovers[0].mesh.position.clone();
      rovers[0].mesh.position.set(base.x - 400, base.y, base.z);
      rovers[1].mesh.position.set(base.x,        base.y, base.z - 300);
      rovers[2].mesh.position.set(base.x + 400,  base.y, base.z);
      this._roverBasePos = base; // remember so we can restore
    }

    // Disable rig controls during cutscene
    if (this.rig.controls) this.rig.controls.enabled = false;

    this._showSlide(0, true);
    this._overlayEl.style.display = 'block';
    this._letterboxTop.style.transform = 'translateY(0)';
    this._letterboxBot.style.transform = 'translateY(0)';
  }

  /** Call every frame while active. dt in seconds. */
  tick(dt) {
    if (!this.active) return;

    const slide = SLIDES[this._slideIndex];
    const rover = this.swarm.rovers[slide.roverIndex];
    if (!rover) return;

    const target = rover.mesh.position;

    if (this._transitioning) {
      // Smooth camera transition between rovers
      this._transitionProgress = Math.min(1, this._transitionProgress + dt * 1.4);
      const t = _easeInOut(_easeInOut(this._transitionProgress));

      const nextSlide = SLIDES[this._slideIndex];
      const nextRover = this.swarm.rovers[nextSlide.roverIndex];
      const nextTarget = nextRover.mesh.position;

      this._computeOrbitPos(nextSlide, nextTarget, this._orbitAngle, this._camPos);

      this._lerpPos.lerpVectors(this._transitionFrom, this._camPos, t);
      this._lerpTarget.lerpVectors(this._transitionFromTarget, nextTarget, t);

      this.camera.position.copy(this._lerpPos);
      // Keep the upward offset during transitions too
      const transLook = this._lerpTarget.clone();
      transLook.y += nextSlide.orbitHeight * 0.35;
      this.camera.lookAt(transLook);

      if (this._transitionProgress >= 1) {
        this._transitioning = false;
        this._showCard();
      }
      return;
    }

    // Orbit around current rover
    this._orbitAngle += slide.orbitSpeed * dt;
    this._computeOrbitPos(slide, target, this._orbitAngle, this._camPos);

    // Look slightly above rover center for a more cinematic upward tilt
    const lookTarget = target.clone();
    lookTarget.y += slide.orbitHeight * 0.35;

    this.camera.position.lerp(this._camPos, 1 - Math.exp(-6 * dt));
    this.camera.lookAt(lookTarget);
  }

  _computeOrbitPos(slide, target, angle, out) {
    out.set(
      target.x + Math.cos(angle) * slide.orbitRadius,
      target.y + slide.orbitHeight,
      target.z + Math.sin(angle) * slide.orbitRadius,
    );
  }

  _advance() {
    if (this._slideIndex >= SLIDES.length - 1) {
      this._finish();
      return;
    }

    // Store current camera position for transition
    this._transitionFrom.copy(this.camera.position);
    this._transitionFromTarget.copy(
      this.swarm.rovers[SLIDES[this._slideIndex].roverIndex].mesh.position
    );

    this._slideIndex++;
    this._transitionProgress = 0;
    this._transitioning = true;
    this._orbitAngle = SLIDES[this._slideIndex].orbitStartAngle;

    // Hide card during transition, show again when transition completes
    this._hideCard();
  }

  _finish() {
    this.active = false;

    // Hide the intro card immediately
    this._cardEl.style.display = 'none';
    this._cardEl.style.opacity = '0';

    // Restore rover positions back together
    const rovers = this.swarm.rovers;
    if (this._roverBasePos && rovers.length >= 3) {
      const base = this._roverBasePos;
      rovers[0].mesh.position.set(base.x, base.y, base.z);
      rovers[1].mesh.position.set(base.x, base.y, base.z);
      rovers[2].mesh.position.set(base.x, base.y, base.z);
      this._roverBasePos = null;
    }

    // Animate letterbox out
    this._letterboxTop.style.transform = 'translateY(-100%)';
    this._letterboxBot.style.transform = 'translateY(100%)';

    // Fade out overlay
    this._overlayEl.style.opacity = '0';
    setTimeout(() => {
      this._overlayEl.style.display = 'none';
      this._overlayEl.style.opacity = '1';
    }, 500);

    // Restore simulator UI panels
    const panels = ['topControlBar', 'robotDetailPanel', 'help'];
    panels.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = el.dataset.csHidden ?? '';
        delete el.dataset.csHidden;
      }
    });

    // Re-enable rig
    if (this.rig.controls) this.rig.controls.enabled = true;

    this.onComplete();
  }

  _showSlide(index, instant = false) {
    this._slideIndex = index;
    this._orbitAngle = SLIDES[index].orbitStartAngle;

    if (instant) {
      const slide = SLIDES[index];
      const rover = this.swarm.rovers[slide.roverIndex];
      this._computeOrbitPos(slide, rover.mesh.position, this._orbitAngle, this._camPos);
      this.camera.position.copy(this._camPos);
      this.camera.lookAt(rover.mesh.position);
    }

    this._showCard();
  }

  _showCard() {
    const slide = SLIDES[this._slideIndex];
    const isLast = this._slideIndex === SLIDES.length - 1;
    const accent = slide.accentHex;

    this._cardEl.style.borderColor = accent + '66';
    this._cardEl.style.boxShadow = `0 4px 32px ${accent}22, 0 2px 8px rgba(0,0,0,0.6)`;

    this._cardEl.innerHTML = `
      <div class="cs-card-header" style="border-bottom-color:${accent}33">
        <div class="cs-callsign" style="color:${accent};border-color:${accent}44">ROV-${slide.callsign}</div>
        <div class="cs-step-dots">
          ${SLIDES.map((_, i) => `<span class="cs-dot ${i === this._slideIndex ? 'active' : i < this._slideIndex ? 'done' : ''}" style="${i === this._slideIndex ? `background:${accent}` : ''}"></span>`).join('')}
        </div>
      </div>
      <div class="cs-card-body">
        <div class="cs-rover-name">
          <span class="cs-rover-icon">${slide.icon}</span>
          <span>${slide.name}</span>
        </div>
        <div class="cs-rover-role" style="color:${accent}">${slide.role}</div>
        <p class="cs-rover-desc">${slide.description}</p>
        <div class="cs-equipment">
          <div class="cs-equip-label">EQUIPMENT</div>
          <div class="cs-equip-list">
            ${slide.equipment.map(e => `<span class="cs-equip-item" style="border-color:${accent}44;color:${accent}cc">${e}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="cs-card-footer">
        <span class="cs-hint">Camera orbiting rover automatically</span>
        <button class="cs-next-btn" id="csNextBtn" style="background:${accent}22;border-color:${accent}66;color:${accent}">
          ${isLast ? 'Start Mission →' : 'Next →'}
        </button>
      </div>
    `;

    document.getElementById('csNextBtn').onclick = () => this._advance();

    // Fade in
    this._cardEl.style.opacity = '0';
    this._cardEl.style.transform = 'translateY(12px)';
    this._cardEl.style.display = 'block';
    requestAnimationFrame(() => {
      this._cardEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      this._cardEl.style.opacity = '1';
      this._cardEl.style.transform = 'translateY(0)';
    });
  }

  _hideCard() {
    this._cardEl.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    this._cardEl.style.opacity = '0';
    this._cardEl.style.transform = 'translateY(-8px)';
  }

  // ─── DOM ─────────────────────────────────────────────────────────────────

  _buildDOM() {
    // Letterbox bars
    this._letterboxTop = document.createElement('div');
    this._letterboxTop.className = 'cs-letterbox cs-letterbox-top';
    document.body.appendChild(this._letterboxTop);

    this._letterboxBot = document.createElement('div');
    this._letterboxBot.className = 'cs-letterbox cs-letterbox-bot';
    document.body.appendChild(this._letterboxBot);

    // Overlay container (holds the card, skip button, and mission label)
    this._overlayEl = document.createElement('div');
    this._overlayEl.id = 'cutsceneOverlay';
    this._overlayEl.style.display = 'none';
    this._overlayEl.innerHTML = `
      <div id="csMissionLabel" class="cs-mission-label">
        <span class="cs-mission-dot"></span>
        MARS GEOLOGICAL EXPLORATION — ROVER BRIEFING
      </div>
      <button id="csSkipBtn" class="cs-skip-btn">Skip intro ×</button>
    `;
    document.body.appendChild(this._overlayEl);

    // Intro card (positioned bottom-left)
    this._cardEl = document.createElement('div');
    this._cardEl.id = 'csCard';
    this._cardEl.className = 'cs-card';
    this._cardEl.style.display = 'none';
    document.body.appendChild(this._cardEl);

    document.getElementById('csSkipBtn').onclick = () => this._finish();
  }

  _buildStyles() {
    if (document.getElementById('cutscene-styles')) return;
    const s = document.createElement('style');
    s.id = 'cutscene-styles';
    s.textContent = `
      /* ── Letterbox ── */
      .cs-letterbox {
        position: fixed;
        left: 0; right: 0;
        height: 72px;
        background: #07090d;
        z-index: 1800;
        transition: transform 0.6s cubic-bezier(0.4,0,0.2,1);
        pointer-events: none;
      }
      .cs-letterbox-top { top: 0; transform: translateY(-100%); }
      .cs-letterbox-bot { bottom: 0; transform: translateY(100%); }

      /* ── Overlay ── */
      #cutsceneOverlay {
        position: fixed;
        inset: 0;
        z-index: 1700;
        pointer-events: none;
        transition: opacity 0.5s ease;
      }

      /* ── Mission label (top center) ── */
      .cs-mission-label {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        font-family: 'IBM Plex Mono', monospace;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1.5px;
        color: #475569;
        display: flex;
        align-items: center;
        gap: 7px;
        white-space: nowrap;
      }
      .cs-mission-dot {
        width: 6px; height: 6px;
        border-radius: 50%;
        background: #ef4444;
        animation: cs-blink 1.2s ease-in-out infinite;
      }
      @keyframes cs-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }

      /* ── Skip button (top right) ── */
      .cs-skip-btn {
        position: absolute;
        top: 20px;
        right: 24px;
        background: transparent;
        border: 1px solid #1f2937;
        color: #374151;
        font-size: 10px;
        font-family: 'IBM Plex Mono', monospace;
        padding: 5px 12px;
        border-radius: 3px;
        cursor: pointer;
        pointer-events: all;
        transition: all 0.15s;
        letter-spacing: 0.5px;
      }
      .cs-skip-btn:hover { border-color: #6b7280; color: #9ca3af; }

      /* ── Intro Card ── */
      .cs-card {
        position: fixed;
        bottom: 90px;
        left: 48px;
        width: 360px;
        background: rgba(10, 13, 18, 0.96);
        border: 1px solid #1f2937;
        border-radius: 8px;
        z-index: 1900;
        font-family: 'IBM Plex Mono', monospace;
        overflow: hidden;
        pointer-events: all;
      }
      .cs-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border-bottom: 1px solid #1f2937;
      }
      .cs-callsign {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1.2px;
        border: 1px solid #1f2937;
        padding: 2px 8px;
        border-radius: 2px;
      }
      .cs-step-dots {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .cs-dot {
        width: 7px; height: 7px;
        border-radius: 50%;
        background: #1f2937;
        display: inline-block;
        transition: background 0.3s;
      }
      .cs-dot.done { background: #374151; }

      .cs-card-body { padding: 14px 14px 10px; }

      .cs-rover-name {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 18px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 3px;
        font-family: 'Space Grotesk', 'IBM Plex Mono', monospace;
      }
      .cs-rover-icon { font-size: 20px; }
      .cs-rover-role {
        font-size: 9.5px;
        font-weight: 700;
        letter-spacing: 1px;
        text-transform: uppercase;
        margin-bottom: 10px;
      }
      .cs-rover-desc {
        font-size: 10.5px;
        color: #94a3b8;
        line-height: 1.65;
        margin: 0 0 12px;
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
      .cs-equipment { margin-bottom: 4px; }
      .cs-equip-label {
        font-size: 8.5px;
        font-weight: 700;
        letter-spacing: 1px;
        color: #374151;
        margin-bottom: 5px;
      }
      .cs-equip-list { display: flex; flex-wrap: wrap; gap: 4px; }
      .cs-equip-item {
        font-size: 9px;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: 2px;
        border: 1px solid #1f2937;
        background: rgba(255,255,255,0.03);
        letter-spacing: 0.3px;
      }

      .cs-card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 14px 10px;
        border-top: 1px solid #0f1623;
      }
      .cs-hint {
        font-size: 9px;
        color: #2d3748;
        font-style: italic;
      }
      .cs-next-btn {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
        padding: 7px 18px;
        border-radius: 4px;
        border: 1px solid #1f2937;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .cs-next-btn:hover { filter: brightness(1.3); }
    `;
    document.head.appendChild(s);
  }
}

/** Smooth ease-in-out (cubic) */
function _easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
