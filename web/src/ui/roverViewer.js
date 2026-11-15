import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { createRoverModel } from '../rover/roverModel.js';

/**
 * RoverViewer
 * Dedicated interactive Three.js 3D viewport embedded in the Robot Detail Card.
 * Allows 360° inspection, zoom, pan, and view reset for the active rover.
 */
export class RoverViewer {
  /**
   * @param {HTMLElement} containerEl DOM element container for the viewer canvas
   */
  constructor(containerEl) {
    this.container = containerEl;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.currentModel = null;
    this.currentRole = null;
    this.autoRotate = false;
    this.isDisposed = false;

    this.defaultCamPos = new THREE.Vector3(3.2, 1.8, 3.4);
    this.defaultTarget = new THREE.Vector3(0, 0.75, 0);

    this.#initViewer();
  }

  #initViewer() {
    if (!this.container) return;

    try {
      const width = this.container.clientWidth || 356;
      const height = this.container.clientHeight || 220;

      // 1. Dedicated Lightweight WebGL Renderer
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      this.renderer.domElement.style.width = '100%';
      this.renderer.domElement.style.height = '100%';
      this.renderer.domElement.style.display = 'block';
      this.container.appendChild(this.renderer.domElement);

      // 2. Inspection Scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0c1015);

      // 3. Technical Turntable Grid Floor
      const grid = new THREE.GridHelper(6, 12, 0x334155, 0x1e293b);
      grid.position.y = 0;
      this.scene.add(grid);

      // Circular degree marking ring
      const ringGeo = new THREE.RingGeometry(2.35, 2.38, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x475569, side: THREE.DoubleSide });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.01;
      this.scene.add(ringMesh);

      // 4. Studio Lighting Rig
      const hemiLight = new THREE.HemisphereLight(0xf8fafc, 0x1e293b, 0.9);
      this.scene.add(hemiLight);

      // Primary Key Light (Front-Right Key)
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
      keyLight.position.set(4, 7, 5);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
      this.scene.add(keyLight);

      // Fill Light (Left Rim)
      const fillLight = new THREE.DirectionalLight(0x00d4ff, 0.85);
      fillLight.position.set(-5, 4, -3);
      this.scene.add(fillLight);

      // Back Rim Light (Warm separation)
      const rimLight = new THREE.DirectionalLight(0xffb98a, 0.7);
      rimLight.position.set(2, 3, -6);
      this.scene.add(rimLight);

      // 5. Camera & OrbitControls
      this.camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
      this.camera.position.copy(this.defaultCamPos);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.target.copy(this.defaultTarget);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.minDistance = 1.4;
      this.controls.maxDistance = 8.5;
      this.controls.maxPolarAngle = Math.PI / 2 + 0.05; // Don't flip under the floor
      this.controls.update();

      // Handle Resize
      window.addEventListener('resize', () => this.handleResize());

      // Start local render loop
      this.#animate();
    } catch (err) {
      console.error('[RoverViewer] WebGL initialization failed:', err);
      this.#showFallback('Interactive 3D Viewer Unavailable (WebGL fallback active)');
    }
  }

  #animate = () => {
    if (this.isDisposed) return;
    requestAnimationFrame(this.#animate);

    if (this.controls) {
      if (this.autoRotate) {
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 2.0;
      } else {
        this.controls.autoRotate = false;
      }
      this.controls.update();
    }

    if (this.currentModel?.userData?.animationController) {
      this.currentModel.userData.animationController.update(0.016, { forwardVelocity: 0, angularVelocity: 0 });
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  /**
   * Sets the active rover model shown in the 3D viewer.
   * @param {Object} cfg Rover configuration { role, accent, name, callsign, missionTitle }
   */
  setRover(cfg) {
    if (!this.scene) return;
    if (this.currentRole === cfg.role && this.currentModel) return;

    // Remove old model
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.currentModel = null;
    }

    try {
      // Create new realistic 3D model
      const model = createRoverModel({
        role: cfg.role,
        accent: cfg.accent,
        name: cfg.name,
        callsign: cfg.callsign,
        missionTitle: cfg.missionTitle,
      });

      // Ground the model on the turntable floor
      model.position.set(0, 0, 0);
      model.rotation.set(0, 0, 0);
      model.scale.set(1, 1, 1);

      this.scene.add(model);
      this.currentModel = model;
      this.currentRole = cfg.role;

      // Hide loading spinner if present
      const loaderEl = document.getElementById('roverViewerLoading');
      if (loaderEl) loaderEl.style.display = 'none';
    } catch (e) {
      console.error('[RoverViewer] Error building rover model:', e);
      this.#showFallback(`Model load error: ${e.message}`);
    }
  }

  /**
   * Resets camera to default isometric inspection angle.
   */
  resetView() {
    if (!this.camera || !this.controls) return;
    this.camera.position.copy(this.defaultCamPos);
    this.controls.target.copy(this.defaultTarget);
    this.controls.update();
  }

  /**
   * Incremental Zoom In
   */
  zoomIn() {
    if (!this.camera || !this.controls) return;
    const dir = new THREE.Vector3().subVectors(this.controls.target, this.camera.position);
    if (dir.length() > this.controls.minDistance + 0.3) {
      this.camera.position.addScaledVector(dir.normalize(), 0.5);
      this.controls.update();
    }
  }

  /**
   * Incremental Zoom Out
   */
  zoomOut() {
    if (!this.camera || !this.controls) return;
    const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    if (dir.length() < this.controls.maxDistance - 0.5) {
      this.camera.position.addScaledVector(dir.normalize(), 0.5);
      this.controls.update();
    }
  }

  /**
   * Toggles turntable auto-rotation
   */
  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    return this.autoRotate;
  }

  handleResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  #showFallback(msg) {
    if (!this.container) return;
    this.container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:#0f172a;color:#94a3b8;font-size:11px;padding:16px;text-align:center;">
        <div style="font-weight:bold;color:#f59e0b;margin-bottom:6px;">⚠️ 3D INSPECTION FALLBACK</div>
        <div>${msg}</div>
        <div style="margin-top:8px;font-family:monospace;font-size:10px;color:#64748b;">NASA / JPL Rocker-Bogie Multi-Mission Explorer</div>
      </div>
    `;
  }

  dispose() {
    this.isDisposed = true;
    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
