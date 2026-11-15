/**
 * Tutorial — Step-by-step guide for first-time players.
 * Covers the first two "Target & Riset Sains" objectives:
 *   Step 1: Switch to GeoLab (Robot 02) and build the Science Lab
 *   Step 2: Switch to Mapper (Robot 01), place a waypoint, then call Hermes
 */

const STEPS = [
  {
    id: 'build_lab',
    robot: '02',
    robotName: 'Curiosity GeoLab',
    icon: '🔬',
    title: 'Build the Science Lab Station',
    body: 'Switch to <b>Robot 02 — GeoLab</b> by pressing <kbd>2</kbd>, then press <kbd>Space</kbd> or <kbd>B</kbd> to construct the Science Lab Station at GeoLab\'s current position.',
    completeWhen: (ms) => !!ms.labStation,
    hint: 'Press 2 → then Space or B',
  },
  {
    id: 'mark_waypoint',
    robot: '01',
    robotName: 'Ares Mapper',
    icon: '📍',
    title: 'Mark a Sample Waypoint',
    body: 'Switch to <b>Robot 01 — Ares Mapper</b> by pressing <kbd>1</kbd>, drive to an interesting area using <kbd>W A S D</kbd>, then press <kbd>Space</kbd> to mark a geological sample point.',
    completeWhen: (ms) => !!ms.activeWaypoint || !!ms.transportCargo,
    hint: 'Press 1 → WASD to move → Space to mark',
  },
  {
    id: 'call_hermes',
    robot: '01',
    robotName: 'Ares Mapper',
    icon: '🚛',
    title: 'Call Hermes Transport',
    body: 'Waypoint marked! Now dispatch <b>Hermes Transport</b> to collect the specimen by pressing <kbd>C</kbd>. Hermes will automatically launch toward the waypoint.',
    completeWhen: (ms) => ms.transportState === 'moving_to_target' || ms.transportState === 'carrying_to_lab' || !!ms.transportCargo,
    hint: 'Press C to call Hermes',
  },
];

export class Tutorial {
  /**
   * @param {{ onDone?: () => void, onAccepted?: () => void }} [opts]
   */
  constructor(opts = {}) {
    this.onDone = opts.onDone || (() => {});
    this.onAccepted = opts.onAccepted || null; // called when player clicks Yes — set by main.js
    this.currentStep = 0;
    this.active = false;
    this._missionSystem = null;
    this._checkInterval = null;

    this._buildStyles();
    this._buildPrompt();
  }

  /** Call once after the scene is ready. Shows the "Would you like a tutorial?" prompt. */
  showPrompt() {
    this._promptEl.style.display = 'flex';
  }

  /** Feed the MissionSystem reference so we can poll completion. */
  setMissionSystem(ms) {
    this._missionSystem = ms;
  }

  // ─── DOM Construction ────────────────────────────────────────────────────

  _buildStyles() {
    if (document.getElementById('tutorial-styles')) return;
    const style = document.createElement('style');
    style.id = 'tutorial-styles';
    style.textContent = `
      /* ── Tutorial Prompt Overlay ── */
      #tutorialPrompt {
        position: fixed;
        inset: 0;
        z-index: 2000;
        display: none;
        align-items: center;
        justify-content: center;
        background: rgba(7, 9, 13, 0.82);
        backdrop-filter: blur(6px);
      }
      #tutorialPromptBox {
        background: rgba(13, 17, 23, 0.97);
        border: 1px solid #1f2937;
        border-radius: 6px;
        padding: 32px 36px;
        max-width: 420px;
        width: 90%;
        box-shadow: 0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,229,255,0.08);
        text-align: center;
        font-family: 'IBM Plex Mono', monospace;
      }
      #tutorialPromptBox .tut-icon { font-size: 36px; margin-bottom: 10px; }
      #tutorialPromptBox .tut-title {
        font-size: 15px;
        font-weight: 700;
        color: #fff;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }
      #tutorialPromptBox .tut-sub {
        font-size: 11px;
        color: #94a3b8;
        line-height: 1.6;
        margin-bottom: 24px;
      }      .tut-prompt-btns { display: flex; gap: 10px; justify-content: center; }
      .tut-btn-yes {
        background: #0b3d91;
        border: 1px solid #1e4fa3;
        color: #fff;
        border-radius: 4px;
        padding: 9px 22px;
        font-size: 11px;
        font-weight: 700;
        font-family: 'IBM Plex Mono', monospace;
        cursor: pointer;
        transition: background 0.15s;
        letter-spacing: 0.5px;
      }
      .tut-btn-yes:hover { background: #1251b8; }
      .tut-btn-no {
        background: transparent;
        border: 1px solid #374151;
        color: #6b7280;
        border-radius: 4px;
        padding: 9px 22px;
        font-size: 11px;
        font-family: 'IBM Plex Mono', monospace;
        cursor: pointer;
        transition: all 0.15s;
        letter-spacing: 0.5px;
      }
      .tut-btn-no:hover { border-color: #6b7280; color: #9ca3af; }

      /* ── Step Card ── */
      #tutorialStep {
        position: fixed;
        bottom: 52px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1500;
        display: none;
        min-width: 340px;
        max-width: 480px;
        width: 90%;
      }
      #tutorialStepBox {
        background: rgba(13, 17, 23, 0.97);
        border: 1px solid #00e5ff44;
        border-radius: 6px;
        padding: 14px 18px 12px;
        box-shadow: 0 4px 24px rgba(0,229,255,0.12), 0 2px 8px rgba(0,0,0,0.6);
        font-family: 'IBM Plex Mono', monospace;
      }
      .tut-step-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .tut-step-badge {
        background: #00e5ff18;
        border: 1px solid #00e5ff44;
        color: #00e5ff;
        font-size: 9px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 2px;
        letter-spacing: 0.8px;
        white-space: nowrap;
      }      .tut-step-title {
        font-size: 12px;
        font-weight: 700;
        color: #fff;
        flex: 1;
      }
      .tut-step-body {
        font-size: 11px;
        color: #cbd5e1;
        line-height: 1.65;
        margin-bottom: 10px;
      }
      .tut-step-body kbd {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 3px;
        padding: 1px 5px;
        font-weight: 700;
        color: #00e5ff;
        font-size: 10px;
      }
      .tut-step-body b { color: #fff; }
      .tut-step-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid #1e293b;
        padding-top: 8px;
        margin-top: 4px;
      }
      .tut-step-hint {
        font-size: 9.5px;
        color: #00e5ff;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .tut-step-hint::before {
        content: '▶';
        font-size: 7px;
      }
      .tut-step-progress {
        font-size: 9px;
        color: #4b5563;
        letter-spacing: 0.5px;
      }
      .tut-skip-btn {
        background: transparent;
        border: none;
        color: #374151;
        font-size: 9.5px;
        font-family: 'IBM Plex Mono', monospace;
        cursor: pointer;
        padding: 0;
        margin-left: 12px;
        transition: color 0.15s;
      }
      .tut-skip-btn:hover { color: #6b7280; }

      /* ── Completion Banner ── */
      #tutorialComplete {
        position: fixed;
        bottom: 52px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1500;
        display: none;
        min-width: 340px;
        max-width: 480px;
        width: 90%;
      }
      #tutorialCompleteBox {
        background: rgba(16, 185, 129, 0.12);
        border: 1px solid #10b98166;
        border-radius: 6px;
        padding: 14px 18px;
        font-family: 'IBM Plex Mono', monospace;
        text-align: center;
        box-shadow: 0 4px 24px rgba(16,185,129,0.15);
      }
      .tut-complete-title {
        font-size: 13px;
        font-weight: 700;
        color: #10b981;
        margin-bottom: 4px;
      }
      .tut-complete-sub {
        font-size: 10.5px;
        color: #6ee7b7;
      }
    `;
    document.head.appendChild(style);
  }

  _buildPrompt() {
    // Prompt overlay
    this._promptEl = document.createElement('div');
    this._promptEl.id = 'tutorialPrompt';
    this._promptEl.innerHTML = `
      <div id="tutorialPromptBox">
        <div class="tut-icon">🚀</div>
        <div class="tut-title">Welcome to Mars Geological Exploration</div>
        <div class="tut-sub">
          Would you like a quick tutorial?<br>
          We'll guide you through building the Science Lab,<br>
          marking a geological sample, and calling Hermes Transport.
        </div>
        <div class="tut-prompt-btns">
          <button class="tut-btn-yes" id="tutYesBtn">Yes, Start Tutorial</button>
          <button class="tut-btn-no" id="tutNoBtn">Skip</button>
        </div>
      </div>
    `;
    document.body.appendChild(this._promptEl);

    // Step card
    this._stepEl = document.createElement('div');
    this._stepEl.id = 'tutorialStep';
    this._stepEl.innerHTML = `<div id="tutorialStepBox"></div>`;
    document.body.appendChild(this._stepEl);

    // Completion banner
    this._completeEl = document.createElement('div');
    this._completeEl.id = 'tutorialComplete';
    this._completeEl.innerHTML = `
      <div id="tutorialCompleteBox">
        <div class="tut-complete-title">✓ Tutorial Complete!</div>
        <div class="tut-complete-sub">Great work! You're ready to explore Mars on your own. Good luck out there.</div>
      </div>
    `;
    document.body.appendChild(this._completeEl);

    // Button handlers
    document.getElementById('tutYesBtn').onclick = () => {
      this._promptEl.style.display = 'none';
      if (this.onAccepted) {
        // Let main.js play the cutscene first; cutscene calls _start() on complete
        this.onAccepted();
      } else {
        this._start();
      }
    };
    document.getElementById('tutNoBtn').onclick = () => this._dismiss();
  }

  // ─── Flow Control ────────────────────────────────────────────────────────

  _start() {
    this._promptEl.style.display = 'none';
    this.active = true;
    this.currentStep = 0;
    this._showStep(0);
    this._startPolling();
  }

  _dismiss() {
    this._promptEl.style.display = 'none';
    this.active = false;
    this.onDone();
  }
  _showStep(index) {
    const step = STEPS[index];
    if (!step) return;

    const box = document.getElementById('tutorialStepBox');
    box.innerHTML = `
      <div class="tut-step-header">
        <span class="tut-step-badge">TUTORIAL · STEP ${index + 1}/${STEPS.length}</span>
        <span class="tut-step-title">${step.icon} ${step.title}</span>
      </div>
      <div class="tut-step-body">${step.body}</div>
      <div class="tut-step-footer">
        <span class="tut-step-hint">${step.hint}</span>
        <span>
          <span class="tut-step-progress">${index + 1} / ${STEPS.length}</span>
          <button class="tut-skip-btn" id="tutSkipBtn">Skip tutorial ×</button>
        </span>
      </div>
    `;

    document.getElementById('tutSkipBtn').onclick = () => this._finish(true);
    this._stepEl.style.display = 'block';
  }

  _startPolling() {
    clearInterval(this._checkInterval);
    this._checkInterval = setInterval(() => {
      if (!this.active || !this._missionSystem) return;
      const step = STEPS[this.currentStep];
      if (step && step.completeWhen(this._missionSystem)) {
        this._advanceStep();
      }
    }, 500);
  }

  _advanceStep() {
    this.currentStep++;
    if (this.currentStep >= STEPS.length) {
      this._finish(false);
    } else {
      this._showStep(this.currentStep);
    }
  }

  _finish(skipped) {
    clearInterval(this._checkInterval);
    this._checkInterval = null;
    this.active = false;
    this._stepEl.style.display = 'none';

    if (!skipped) {
      this._completeEl.style.display = 'block';
      setTimeout(() => {
        this._completeEl.style.display = 'none';
      }, 4000);
    }

    this.onDone();
  }
}
