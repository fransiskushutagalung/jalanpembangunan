import * as THREE from 'three';

export class MarsGlobe3D {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    this.options = options;

    this.onHotspotClick = options.onHotspotClick || (() => {});
    this.onRotationChange = options.onRotationChange || (() => {});

    // Scene & Camera
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animFrameId = null;

    // Groups & Meshes
    this.globeGroup = null;
    this.marsMesh = null;
    this.marsMaterial = null;
    this.innerAtmosphere = null;
    this.outerAtmosphere = null;
    this.starfield = null;
    this.orbitLine = null;
    this.satelliteGroup = null;
    this.hotspotPin = null;

    // Multiple Hotspots Configuration
    this.hotspots = {
      'usgs-i-1802-a': {
        id: 'usgs-i-1802-a',
        lat: -8.00,
        lon: 285.00,
        name: 'Valles Marineris & Tharsis',
        code: 'USGS I-1802A',
        rotY: -0.58,
        rotX: 0.08,
      },
      'usgs-sim-3470': {
        id: 'usgs-sim-3470',
        lat: 18.65,
        lon: 226.20,
        name: 'Olympus Mons Caldera',
        code: 'USGS SIM 3470',
        rotY: 0.45,
        rotX: -0.22,
      },
    };
    this.activeHotspotId = 'usgs-i-1802-a';
    this.targetRotY = undefined;
    this.targetRotX = undefined;
    this.hotspotGroups = {};
    this.hotspotPickTargets = {};
    this.pinPingRings = {};

    this.marsRadius = 1.48;

    // Interaction & Camera parameters
    this.targetZoom = 5.4;
    this.currentZoom = 5.4;
    this.minZoom = 4.3;
    this.maxZoom = 7.6;

    this.isDragging = false;
    this.pointerDownX = 0;
    this.pointerDownY = 0;
    this.prevPointerX = 0;
    this.prevPointerY = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.autoRotate = true;
    this.autoRotateSpeed = 0.00065;

    // Time & Orbit state
    this.orbitProgress = 0;
    this.clock = new THREE.Clock();

    // DOM Overlays
    this.calloutCard = document.getElementById('calloutCard');
    this.bracketPath = document.getElementById('calloutBracketPath');
    this.startDot = document.getElementById('calloutStartDot');
    this.endDot = document.getElementById('calloutEndDot');
    this.orbitDot = document.getElementById('orbitDot');

    this.#init();
  }

  #init() {
    if (!this.container) return;

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera Setup (PerspectiveCamera 42°, pos Z = 5.4)
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 300);
    this.camera.position.set(0, 0, this.currentZoom);

    // 3. WebGLRenderer Setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting Setup (Cinematic Deep Space Lighting)
    this.#setupLighting();

    // 5. Starfield Background
    this.#setupStarfield();

    // 6. Mars Globe Group
    this.globeGroup = new THREE.Group();
    // Set initial rotation so Valles Marineris faces camera cinematically
    this.globeGroup.rotation.y = -0.58;
    this.globeGroup.rotation.x = 0.08;
    this.scene.add(this.globeGroup);

    // 7. Mars Sphere & Texture Loading with Dynamic Bump Relief
    this.#setupMarsSphere();

    // 8. Dual Atmospheric Shaders (Inner Peach Haze & Outer Exosphere Blue)
    this.#setupAtmospheres();

    // 9. MRO Satellite Orbit & Animated Telemetry Beacon
    this.#setupSatelliteOrbit();

    // 10. USGS I-1802A 3D Hotspot Pin at Valles Marineris
    this.#setupHotspotPin();

    // 11. Event Listeners (Drag, Wheel, Touch, Resize)
    this.#attachEvents();

    // 12. Animation Loop
    this.#animate();
  }

  #setupLighting() {
    // Ambient Light: 0xffedd8, intensitas 0.7
    const ambientLight = new THREE.AmbientLight(0xffedd8, 0.7);
    this.scene.add(ambientLight);

    // Sun Directional Light: 0xfff8ee, intensitas 2.9, posisi (6, 3, 5)
    const sunLight = new THREE.DirectionalLight(0xfff8ee, 2.9);
    sunLight.position.set(6, 3, 5);
    this.scene.add(sunLight);

    // Starlight Fill Light: 0x7890a8, intensitas 0.8, posisi (-6, 1, 3)
    const fillLight = new THREE.DirectionalLight(0x7890a8, 0.8);
    fillLight.position.set(-6, 1, 3);
    this.scene.add(fillLight);

    // Martian Rim Light: 0xff7744, intensitas 2.4, posisi (-5, -2, -6)
    const rimLight = new THREE.DirectionalLight(0xff7744, 2.4);
    rimLight.position.set(-5, -2, -6);
    this.scene.add(rimLight);
  }

  #setupStarfield() {
    // 2,200 particle stars on random radius 40 - 90 units
    const starCount = 2200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const colorPalette = [
      new THREE.Color('#ffffff'), // Pure white
      new THREE.Color('#c2e1ff'), // Subtle starlight blue
      new THREE.Color('#ffd8a8'), // Warm golden star
      new THREE.Color('#9ec5ff'), // Cyan/blue star
      new THREE.Color('#ffe4cc'), // Soft peach star
    ];

    for (let i = 0; i < starCount; i++) {
      const radius = 42 + Math.random() * 48; // 42 to 90
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const chosenColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      // Slight brightness variation
      const lum = 0.55 + Math.random() * 0.45;
      colors[i * 3]     = chosenColor.r * lum;
      colors[i * 3 + 1] = chosenColor.g * lum;
      colors[i * 3 + 2] = chosenColor.b * lum;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Create a soft glow sprite for stars
    const starCanvas = document.createElement('canvas');
    starCanvas.width = starCanvas.height = 64;
    const starCtx = starCanvas.getContext('2d');
    const grad = starCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.2, 'rgba(255,255,255,0.6)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.2)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    starCtx.fillStyle = grad;
    starCtx.fillRect(0, 0, 64, 64);
    const starTexture = new THREE.CanvasTexture(starCanvas);
    starTexture.needsUpdate = true;

    const starMaterial = new THREE.PointsMaterial({
      size: 3.0,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.85,
      sizeAttenuation: true,
    });

    this.starfield = new THREE.Points(geometry, starMaterial);
    this.scene.add(this.starfield);
  }

  #setupMarsSphere() {
    // Geometri Bola Mars: SphereGeometry(radius = 1.48, 64, 64)
    const geometry = new THREE.SphereGeometry(this.marsRadius, 64, 64);

    // Initial basic material while texture loads
    this.marsMaterial = new THREE.MeshStandardMaterial({
      color: 0xc86438,
      roughness: 0.76,
      metalness: 0.04,
    });

    this.marsMesh = new THREE.Mesh(geometry, this.marsMaterial);
    this.globeGroup.add(this.marsMesh);

    // Load texture equirectangular lokal ./data/mars_globe_texture.jpg
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      './data/mars_globe_texture.jpg',
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        this.marsMaterial.map = texture;

        // Dynamic Bump Relief: Canvas offscreen menghasilkan bump map monokrom
        // dari luminansi tekstur pengguna (bumpScale: 0.035)
        try {
          const bumpTexture = this.#generateLuminanceBumpMap(texture.image);
          if (bumpTexture) {
            this.marsMaterial.bumpMap = bumpTexture;
            this.marsMaterial.bumpScale = 0.035;
          }
        } catch (e) {
          console.warn('[MarsGlobe3D] Bump generation note:', e.message);
        }

        this.marsMaterial.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.warn('[MarsGlobe3D] Texture load note:', err);
      }
    );
  }

  #generateLuminanceBumpMap(image) {
    if (!image) return null;

    const canvas = document.createElement('canvas');
    canvas.width = Math.min(image.width || 1024, 1024);
    canvas.height = Math.min(image.height || 512, 512);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Convert RGB to luminance and enhance subtle Martian craters / canyon scarps
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Perceptual luminance formula
      let lum = r * 0.299 + g * 0.587 + b * 0.114;
      // High contrast curve for crisp topography relief
      lum = Math.min(255, Math.max(0, Math.pow(lum / 255.0, 1.25) * 255));
      data[i]     = lum;
      data[i + 1] = lum;
      data[i + 2] = lum;
    }

    ctx.putImageData(imgData, 0, 0);

    const bumpTexture = new THREE.CanvasTexture(canvas);
    bumpTexture.wrapS = THREE.RepeatWrapping;
    bumpTexture.wrapT = THREE.ClampToEdgeWrapping;
    return bumpTexture;
  }

  #setupAtmospheres() {
    // Atmosphere Fresnel Vertex Shader
    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    // Atmosphere Fresnel Fragment Shader
    const fragmentShader = `
      uniform vec3 color;
      uniform float power;
      uniform float intensity;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float fresnel = dot(vNormal, viewDir);
        // BackSide rendering: limb rim highlights
        fresnel = clamp(1.0 - abs(fresnel), 0.0, 1.0);
        float alpha = pow(fresnel, power) * intensity;
        gl_FragColor = vec4(color, alpha);
      }
    `;

    // 1. Lapisan Haze Dalam: SphereGeometry(1.55), warna warm peach (#FF753D)
    const innerGeo = new THREE.SphereGeometry(1.55, 64, 64);
    const innerMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        color: { value: new THREE.Color('#FF753D') },
        power: { value: 3.2 },
        intensity: { value: 1.25 },
      },
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    this.innerAtmosphere = new THREE.Mesh(innerGeo, innerMat);
    this.scene.add(this.innerAtmosphere);

    // 2. Lapisan Eksosfer Luar: SphereGeometry(1.63), warna exosphere blue (#8CB8FF)
    const outerGeo = new THREE.SphereGeometry(1.63, 64, 64);
    const outerMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        color: { value: new THREE.Color('#8CB8FF') },
        power: { value: 3.8 },
        intensity: { value: 0.95 },
      },
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    this.outerAtmosphere = new THREE.Mesh(outerGeo, outerMat);
    this.scene.add(this.outerAtmosphere);
  }

  #setupSatelliteOrbit() {
    // MRO Satellite Orbit Ellipse
    // Semi-major a = 2.45, semi-minor b = 2.18, real inclination ~28°
    const orbitGroup = new THREE.Group();
    orbitGroup.rotation.x = THREE.MathUtils.degToRad(32);
    orbitGroup.rotation.z = THREE.MathUtils.degToRad(-18);
    this.scene.add(orbitGroup);

    const segments = 160;
    const points = [];
    const a = 2.45;
    const b = 2.18;

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(a * Math.cos(theta), 0, b * Math.sin(theta)));
    }

    const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMat = new THREE.LineBasicMaterial({
      color: 0x5dd8d0,
      transparent: true,
      opacity: 0.32,
      linewidth: 1,
    });
    this.orbitLine = new THREE.Line(orbitGeo, orbitMat);
    orbitGroup.add(this.orbitLine);

    // MRO Satellite group & telemetry beacon flare
    this.satelliteGroup = new THREE.Group();

    // Satellite Main Core Body
    const satBodyGeo = new THREE.BoxGeometry(0.045, 0.045, 0.065);
    const satBodyMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.2,
    });
    const satMesh = new THREE.Mesh(satBodyGeo, satBodyMat);
    this.satelliteGroup.add(satMesh);

    // Gold foil solar arrays
    const solarGeo = new THREE.PlaneGeometry(0.18, 0.04);
    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x0055aa,
      metalness: 0.8,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
    const solarLeft = new THREE.Mesh(solarGeo, solarMat);
    solarLeft.position.x = -0.11;
    this.satelliteGroup.add(solarLeft);

    const solarRight = new THREE.Mesh(solarGeo, solarMat);
    solarRight.position.x = 0.11;
    this.satelliteGroup.add(solarRight);

    // Pulsing Telemetry Flare Sprite / Glow Ring
    const flareGeo = new THREE.RingGeometry(0.05, 0.075, 24);
    const flareMat = new THREE.MeshBasicMaterial({
      color: 0x5dd8d0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    this.telemetryRing = new THREE.Mesh(flareGeo, flareMat);
    this.telemetryRing.rotation.x = Math.PI / 2;
    this.satelliteGroup.add(this.telemetryRing);

    orbitGroup.add(this.satelliteGroup);
    this.mroA = a;
    this.mroB = b;
  }

  #setupHotspotPin() {
    this.hotspotGroups = {};
    this.hotspotPickTargets = {};
    this.pinPingRings = {};

    for (const [id, hs] of Object.entries(this.hotspots)) {
      const pos = this.#calcSpherePos(hs.lat, hs.lon);

      const group = new THREE.Group();
      group.position.copy(pos);
      group.name = `hotspot_${id}`;

      // Orient group along surface normal
      const normal = pos.clone().normalize();
      group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

      // 1. Central Core Pin Dot
      const dotGeo = new THREE.SphereGeometry(0.024, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.y = 0.02;
      group.add(dot);

      // 2. Martian Flare Outer Collar
      const collarGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.015, 24);
      const collarMat = new THREE.MeshBasicMaterial({ color: 0xff8955 });
      const collar = new THREE.Mesh(collarGeo, collarMat);
      collar.position.y = 0.01;
      group.add(collar);

      // 3. Pulsing Radar Concentric Target Ring
      const pingGeo = new THREE.RingGeometry(0.045, 0.065, 32);
      const pingMat = new THREE.MeshBasicMaterial({
        color: 0xff8955,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      });
      const pinPingRing = new THREE.Mesh(pingGeo, pingMat);
      pinPingRing.rotation.x = Math.PI / 2;
      pinPingRing.position.y = 0.015;
      group.add(pinPingRing);

      const pickTarget = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 12, 12),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      pickTarget.position.y = 0.045;
      pickTarget.userData.hotspotId = id;
      group.add(pickTarget);

      this.pinPingRings[id] = pinPingRing;
      this.hotspotGroups[id] = group;
      this.hotspotPickTargets[id] = pickTarget;

      // Add to globeGroup so it rotates with Mars!
      this.globeGroup.add(group);
    }
  }

  #calcSpherePos(lat, lon) {
    const lonStandard = lon >= 180 ? lon - 360 : lon;
    const u = (lonStandard + 180) / 360.0;
    const v = (90 - lat) / 180.0;

    const theta = u * Math.PI * 2;
    const phi = v * Math.PI;

    const R = this.marsRadius + 0.015;
    return new THREE.Vector3(
      -R * Math.cos(theta) * Math.sin(phi),
      R * Math.cos(phi),
      R * Math.sin(theta) * Math.sin(phi)
    );
  }

  setActiveHotspot(id, animate = true) {
    if (!this.hotspots[id]) return;
    this.activeHotspotId = id;
    const hs = this.hotspots[id];
    if (animate && this.globeGroup) {
      this.targetRotY = hs.rotY;
      this.targetRotX = hs.rotX;
      this.autoRotate = false;
      this.velocityX = 0;
      this.velocityY = 0;
    }
  }

  #attachEvents() {
    const el = this.renderer.domElement;

    // Pointer Drag (Inertial Rotation)
    const onPointerDown = (e) => {
      this.isDragging = true;
      this.autoRotate = false;
      this.pointerDownX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      this.pointerDownY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      this.prevPointerX = this.pointerDownX;
      this.prevPointerY = this.pointerDownY;
      this.velocityX = 0;
      this.velocityY = 0;
      el.style.cursor = 'grabbing';
    };

    const onPointerMove = (e) => {
      if (!this.isDragging) return;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

      const deltaX = clientX - this.prevPointerX;
      const deltaY = clientY - this.prevPointerY;

      this.prevPointerX = clientX;
      this.prevPointerY = clientY;

      this.velocityY = deltaX * 0.0055;
      this.velocityX = deltaY * 0.0045;

      this.globeGroup.rotation.y += this.velocityY;
      this.globeGroup.rotation.x = THREE.MathUtils.clamp(
        this.globeGroup.rotation.x + this.velocityX,
        -0.65,
        0.65
      );

      this.onRotationChange(this.globeGroup.rotation.y);
    };

    const onPointerUp = (e) => {
      const pointer = e.changedTouches && e.changedTouches.length ? e.changedTouches[0] : e;
      if (
        this.isDragging &&
        Math.hypot(pointer.clientX - this.pointerDownX, pointer.clientY - this.pointerDownY) <= 5
      ) {
        this.#pickHotspot(pointer.clientX, pointer.clientY);
      }
      this.isDragging = false;
      el.style.cursor = 'grab';
    };

    el.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    // Touch Support
    el.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // Zoom (Wheel) — Clamped minZoom: 4.3 (Anti-clipping), maxZoom: 7.6
    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const delta = e.deltaY * 0.0035;
        this.targetZoom = THREE.MathUtils.clamp(
          this.targetZoom + delta,
          this.minZoom,
          this.maxZoom
        );
      },
      { passive: false }
    );

    // Window Resize
    window.addEventListener('resize', () => this.resize());
    el.style.cursor = 'grab';
  }

  #pickHotspot(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.camera);

    const targets = Object.values(this.hotspotPickTargets);
    const hotspotHit = raycaster.intersectObjects(targets, false)[0];
    if (!hotspotHit) return;

    const globeHit = raycaster.intersectObject(this.marsMesh, false)[0];
    if (globeHit && hotspotHit.distance >= globeHit.distance) return;

    const hotspotId = hotspotHit.object.userData.hotspotId;
    this.setActiveHotspot(hotspotId);
    this.onHotspotClick(this.hotspots[hotspotId]);
  }

  resize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  #updateDynamicBracket() {
    const activeGroup = this.hotspotGroups[this.activeHotspotId];
    if (!activeGroup || !this.camera || !this.bracketPath || !this.calloutCard) return;

    // 1. Get Hotspot world position
    const worldPos = new THREE.Vector3();
    activeGroup.getWorldPosition(worldPos);

    // 2. Check if hotspot is facing the camera (hemisphere culling)
    const normal = worldPos.clone().normalize();
    const cameraDir = this.camera.position.clone().sub(worldPos).normalize();
    const dot = normal.dot(cameraDir);

    const svg = document.getElementById('globeCalloutSvg');

    // If occluded (on the far side of Mars), smoothly fade out or ghost
    if (dot < 0.05) {
      if (svg) svg.style.opacity = '0.08';
      return;
    }

    if (svg) svg.style.opacity = '1';

    // 3. Project 3D coordinate to screen 2D coordinates
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    const screenPos = worldPos.clone().project(this.camera);
    const startX = (screenPos.x * 0.5 + 0.5) * width;
    const startY = (-screenPos.y * 0.5 + 0.5) * height;

    // 4. Target callout card anchor point (left edge)
    const cardRect = this.calloutCard.getBoundingClientRect();
    const stageRect = this.container.getBoundingClientRect();

    const endX = cardRect.left - stageRect.left;
    const endY = cardRect.top - stageRect.top + 36; // Anchor near badge

    // 5. Construct smooth technical bracket SVG path
    const deltaX = endX - startX;
    if (deltaX > 20) {
      const midX = startX + deltaX * 0.42;
      // Path: from start dot, horizontal outward, smooth diagonal bend, horizontal into card
      const d = `M ${startX.toFixed(1)} ${startY.toFixed(1)} L ${midX.toFixed(1)} ${startY.toFixed(1)} L ${(midX + 28).toFixed(1)} ${endY.toFixed(1)} L ${endX.toFixed(1)} ${endY.toFixed(1)}`;
      this.bracketPath.setAttribute('d', d);

      if (this.startDot) {
        this.startDot.setAttribute('cx', startX.toFixed(1));
        this.startDot.setAttribute('cy', startY.toFixed(1));
      }
      if (this.endDot) {
        this.endDot.setAttribute('cx', endX.toFixed(1));
        this.endDot.setAttribute('cy', endY.toFixed(1));
      }
    } else {
      // Direct bezier if close
      const d = `M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${(startX + 30).toFixed(1)} ${endY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
      this.bracketPath.setAttribute('d', d);
      if (this.startDot) {
        this.startDot.setAttribute('cx', startX.toFixed(1));
        this.startDot.setAttribute('cy', startY.toFixed(1));
      }
      if (this.endDot) {
        this.endDot.setAttribute('cx', endX.toFixed(1));
        this.endDot.setAttribute('cy', endY.toFixed(1));
      }
    }
  }

  #updateOrbitGuide() {
    if (!this.orbitDot || !this.globeGroup) return;
    // Bottom Ellipse SVG: cx: 65, cy: 21, rx: 58, ry: 16
    const angle = -this.globeGroup.rotation.y + Math.PI * 0.5;
    const cx = 65 + 58 * Math.cos(angle);
    const cy = 21 + 16 * Math.sin(angle);
    this.orbitDot.setAttribute('cx', cx.toFixed(1));
    this.orbitDot.setAttribute('cy', cy.toFixed(1));
  }

  #animate() {
    this.animFrameId = requestAnimationFrame(() => this.#animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // 1. Smooth Camera Zoom (Lerp towards targetZoom with zero clipping)
    this.currentZoom = THREE.MathUtils.lerp(this.currentZoom, this.targetZoom, 0.08);
    this.camera.position.z = this.currentZoom;

    // 2. Damping Inertia or Smooth Focus Lerp on Mars Rotation
    if (!this.isDragging) {
      if (this.targetRotY !== undefined && this.targetRotX !== undefined) {
        this.globeGroup.rotation.y = THREE.MathUtils.lerp(this.globeGroup.rotation.y, this.targetRotY, 0.06);
        this.globeGroup.rotation.x = THREE.MathUtils.lerp(this.globeGroup.rotation.x, this.targetRotX, 0.06);
        if (Math.abs(this.globeGroup.rotation.y - this.targetRotY) < 0.001 && Math.abs(this.globeGroup.rotation.x - this.targetRotX) < 0.001) {
          this.targetRotY = undefined;
          this.targetRotX = undefined;
        }
        this.onRotationChange(this.globeGroup.rotation.y);
      } else if (Math.abs(this.velocityY) > 0.0001 || Math.abs(this.velocityX) > 0.0001) {
        this.globeGroup.rotation.y += this.velocityY;
        this.globeGroup.rotation.x = THREE.MathUtils.clamp(
          this.globeGroup.rotation.x + this.velocityX,
          -0.65,
          0.65
        );
        this.velocityY *= 0.94;
        this.velocityX *= 0.94;
        this.onRotationChange(this.globeGroup.rotation.y);
      } else if (this.autoRotate) {
        // Gentle cinematic rotation
        this.globeGroup.rotation.y += this.autoRotateSpeed;
        this.onRotationChange(this.globeGroup.rotation.y);
      }
    }

    // 3. Starfield subtle drift
    if (this.starfield) {
      this.starfield.rotation.y = time * 0.005;
    }

    // 4. MRO Satellite Orbit Traversal & Beacon Pulse
    if (this.satelliteGroup) {
      this.orbitProgress += delta * 0.28; // Orbit speed
      const t = this.orbitProgress;
      const satX = this.mroA * Math.cos(t);
      const satZ = this.mroB * Math.sin(t);
      this.satelliteGroup.position.set(satX, 0, satZ);

      // Tangent orientation
      this.satelliteGroup.rotation.y = -t + Math.PI / 2;

      // Pulse telemetry ring
      if (this.telemetryRing) {
        const pingScale = 1.0 + 0.35 * Math.sin(time * 5.0);
        this.telemetryRing.scale.set(pingScale, pingScale, pingScale);
      }
    }

    // 5. Hotspot Pins Radar Ring Pulse
    for (const id in this.pinPingRings) {
      const pingRing = this.pinPingRings[id];
      if (pingRing) {
        const pingPulse = (time * 2.2 + (id === 'usgs-sim-3470' ? 0.5 : 0)) % 1.0;
        const s = 1.0 + pingPulse * 1.8;
        pingRing.scale.set(s, s, s);
        pingRing.material.opacity = (1.0 - pingPulse) * 0.9;
      }
    }

    // 6. Dynamic Bracket Projection
    this.#updateDynamicBracket();

    // 7. Bottom Rotation Ellipse Indicator
    this.#updateOrbitGuide();

    // 8. Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
