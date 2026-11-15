import * as THREE from 'three';
import { getNasaWormTexture, getNasaMeatballTexture, getNasaContainerTexture } from './nasaDecals.js';

/* =========================================================
 * CENTRALIZED CONFIG — single source of truth for geometry
 * ========================================================= */
const ROVER = {
  chassis: { w: 1.55, h: 0.5, l: 2.25, y: 0.88 },
  wheel: { radius: 0.42, width: 0.4, y: 0.42, cleatCount: 16 },
  wheelX: { front: 1.22, middle: 1.32, rear: 1.22 },
  wheelZ: { front: -1.25, middle: 0.1, rear: 1.35 },
  bogiePivot: { x: 1.1, y: 0.62, z: 0.55 },
  rockerPivot: { x: 0.85, y: 0.95, z: -0.2 },
};

/* =========================================================
 * HELIX CURVE FOR 3D PHYSICAL COILED SUSPENSION SPRINGS ("PER")
 * ========================================================= */
class HelixCurve extends THREE.Curve {
  constructor(radius = 0.055, height = 0.26, turns = 4.5) {
    super();
    this.radius = radius;
    this.height = height;
    this.turns = turns;
  }
  getPoint(t) {
    const angle = t * Math.PI * 2 * this.turns;
    const x = Math.cos(angle) * this.radius;
    const y = t * this.height;
    const z = Math.sin(angle) * this.radius;
    return new THREE.Vector3(x, y, z);
  }
}

export function createRoverModel(opts = {}) {
  const {
    role = 'surface-mapping',
    accent = 0x00d4ff,
    name = 'Ares Mapper',
    callsign = '01',
    missionTitle = 'Surface Mapping & Exploration',
  } = opts;

  const group = new THREE.Group();
  group.name = `Rover_${callsign}_${role}`;

  /* ==================== MATERIAL LIBRARY ==================== */
  const M = {
    bodyWhite: new THREE.MeshStandardMaterial({ color: 0xeeece6, roughness: 0.35, metalness: 0.2 }),
    goldFoil: new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.85 }),
    darkTitanium: new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.65, metalness: 0.65 }),
    chromeStrut: new THREE.MeshStandardMaterial({ color: 0xd5d5de, roughness: 0.2, metalness: 0.9 }),
    tireDark: new THREE.MeshStandardMaterial({ color: 0x1b1b1e, roughness: 0.8, metalness: 0.35 }),
    wheelRim: new THREE.MeshStandardMaterial({ color: 0x484852, roughness: 0.3, metalness: 0.8 }),
    hub: new THREE.MeshStandardMaterial({ color: 0x5a5a64, roughness: 0.35, metalness: 0.85 }),
    cleat: new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.55, metalness: 0.7 }),
    bolt: new THREE.MeshStandardMaterial({ color: 0x8a8a94, roughness: 0.3, metalness: 0.9 }),
    lensGlass: new THREE.MeshStandardMaterial({ color: 0x06101c, roughness: 0.1, metalness: 0.95 }),
    accent: new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.8, roughness: 0.2 }),
    headlight: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4d0, emissiveIntensity: 1.5 }),
    solar: new THREE.MeshStandardMaterial({ color: 0x101f38, roughness: 0.15, metalness: 0.85 }),
    tubeActive: new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 2.2 }),
    springTitanium: new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.85 }),
    springCoilMat: new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.35, roughness: 0.25, metalness: 0.85 }),
    shockBody: new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.45, metalness: 0.75 }),
    shockPistonMat: new THREE.MeshStandardMaterial({ color: 0xf5f7fa, roughness: 0.1, metalness: 0.98 }),
  };

  /* ==================== HELPERS ==================== */
  const addMesh = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = group) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx || ry || rz) m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  const addDecal = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = group) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx || ry || rz) m.rotation.set(rx, ry, rz);
    m.castShadow = false;
    m.receiveShadow = false;
    parent.add(m);
    return m;
  };

  const addStrutBetween = (start, end, radius, material, parent) => {
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    if (len < 0.001) return null;
    const geo = new THREE.CylinderGeometry(radius, radius, len, 8);
    const m = new THREE.Mesh(geo, material);
    m.position.copy(start).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  /* ==================== CHASSIS ==================== */
  const chassis = new THREE.Group();
  chassis.name = 'ChassisAssembly';
  group.add(chassis);

  // Layered structural hull
  addMesh(new THREE.BoxGeometry(ROVER.chassis.w, ROVER.chassis.h, ROVER.chassis.l), M.bodyWhite, 0, ROVER.chassis.y, 0, 0, 0, 0, chassis);
  addMesh(new THREE.BoxGeometry(ROVER.chassis.w + 0.07, 0.08, ROVER.chassis.l + 0.07), M.bodyWhite, 0, 1.15, 0, 0, 0, 0, chassis); // Top lip
  addMesh(new THREE.BoxGeometry(ROVER.chassis.w - 0.1, 0.15, ROVER.chassis.l - 0.1), M.darkTitanium, 0, 0.61, 0, 0, 0, 0, chassis); // Underbelly armor

  // Corner reinforcement posts
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    addMesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), M.darkTitanium, sx * 0.79, 0.88, sz * 1.14, 0, 0, 0, chassis);
  }

  // NASA decals
  const wormTex = getNasaWormTexture();
  const meatballTex = getNasaMeatballTexture();

  const wormMat = new THREE.MeshStandardMaterial({
    map: wormTex, roughness: 0.35, metalness: 0.05,
    emissive: 0xffffff, emissiveMap: wormTex, emissiveIntensity: 0.45,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  const meatballMat = new THREE.MeshStandardMaterial({
    map: meatballTex, transparent: true, roughness: 0.25, metalness: 0.05,
    emissive: 0xffffff, emissiveMap: meatballTex, emissiveIntensity: 0.45,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });

  // Left & Right side NASA plaques with fastener borders
  for (const sign of [-1, 1]) {
    addMesh(new THREE.BoxGeometry(0.02, 0.28, 1.0), M.darkTitanium, sign * 0.785, 0.9, -0.05, 0, 0, 0, chassis);
    // Fastener corners
    for (const fz of [-0.5, 0.4]) for (const fy of [0.78, 1.02]) {
      addMesh(new THREE.CylinderGeometry(0.014, 0.014, 0.014, 6), M.bolt, sign * 0.795, fy, fz, 0, 0, Math.PI / 2, chassis);
    }
    // Worm logo — sign===1 is the RIGHT side (+X). Both sides marked.
    addDecal(new THREE.PlaneGeometry(0.92, 0.22), wormMat, sign * 0.80, 0.9, -0.05, 0, sign * Math.PI / 2, 0, chassis);
  }

  // Rear placard
  addMesh(new THREE.BoxGeometry(0.92, 0.24, 0.015), M.darkTitanium, 0, 0.92, 1.135, 0, 0, 0, chassis);
  addDecal(new THREE.PlaneGeometry(0.88, 0.22), wormMat, 0, 0.92, 1.147, 0, 0, 0, chassis);

  // Top deck placard
  addDecal(new THREE.PlaneGeometry(0.76, 0.19), wormMat, 0, 1.196, -0.25, -Math.PI / 2, 0, 0, chassis);

  // Front meatball
  addMesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24), M.darkTitanium, 0, 0.88, -1.43, Math.PI / 2, 0, 0, chassis);
  addDecal(new THREE.PlaneGeometry(0.36, 0.36), meatballMat, 0, 0.88, -1.444, 0, Math.PI, 0, chassis);

  // Front bumper + skid
  addMesh(new THREE.BoxGeometry(1.5, 0.42, 0.35), M.darkTitanium, 0, 0.84, -1.22, 0, 0, 0, chassis);
  addMesh(new THREE.BoxGeometry(1.4, 0.08, 0.4), M.chromeStrut, 0, 0.65, -1.24, 0, 0, 0, chassis);

  // Rear deck
  addMesh(new THREE.BoxGeometry(1.4, 0.25, 0.45), M.darkTitanium, 0, 0.95, 1.22, 0, 0, 0, chassis);

  // Gold MLI top deck
  addMesh(new THREE.BoxGeometry(1.45, 0.04, 1.9), M.goldFoil, 0, 1.19, -0.05, 0, 0, 0, chassis);

  // Avionics boxes
  addMesh(new THREE.BoxGeometry(0.45, 0.1, 0.65), M.darkTitanium, -0.35, 1.24, 0.2, 0, 0, 0, chassis);
  addMesh(new THREE.BoxGeometry(0.4, 0.08, 0.5), M.bodyWhite, 0.4, 1.23, 0.35, 0, 0, 0, chassis);

  // Hazcams + headlights
  for (const side of [-0.55, 0.55]) {
    addMesh(new THREE.BoxGeometry(0.2, 0.14, 0.14), M.darkTitanium, side, 0.8, -1.42, 0, 0, 0, chassis);
    addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12), M.lensGlass, side - 0.05, 0.8, -1.50, Math.PI / 2, 0, 0, chassis);
    addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12), M.lensGlass, side + 0.05, 0.8, -1.50, Math.PI / 2, 0, 0, chassis);
    addMesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), M.headlight, side, 0.92, -1.44, 0, 0, 0, chassis);
  }
  for (const side of [-0.45, 0.45]) {
    addMesh(new THREE.BoxGeometry(0.16, 0.12, 0.1), M.darkTitanium, side, 0.85, 1.45, 0, 0, 0, chassis);
    addMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 8), M.lensGlass, side, 0.85, 1.51, Math.PI / 2, 0, 0, chassis);
  }

  // Restrained panel fastener rows
  for (const sign of [-1, 1]) for (let i = 0; i < 4; i++) {
    const z = -0.9 + i * 0.55;
    addMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 6), M.bolt, sign * 0.785, 0.78, z, 0, 0, Math.PI / 2, chassis);
    addMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 6), M.bolt, sign * 0.785, 1.02, z, 0, 0, Math.PI / 2, chassis);
  }

  /* ==================== ROCKER-BOGIE SUSPENSION ==================== */
  const suspension = new THREE.Group();
  suspension.name = 'SuspensionAssembly';
  group.add(suspension);

  // Center differential pivot & crossbar
  const diffGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.28, 12); diffGeo.rotateZ(Math.PI / 2);
  const diff = new THREE.Mesh(diffGeo, M.chromeStrut);
  diff.position.set(0, 0.95, ROVER.rockerPivot.z);
  diff.castShadow = true; suspension.add(diff);

  const diffBar = new THREE.Group();
  diffBar.position.set(0, 0.95, ROVER.rockerPivot.z);
  suspension.add(diffBar);
  addStrutBetween(
    new THREE.Vector3(-ROVER.rockerPivot.x, 0, 0),
    new THREE.Vector3(ROVER.rockerPivot.x, 0, 0),
    0.035, M.darkTitanium, diffBar
  );

  const suspensionHooks = {
    diffBar,
    leftRocker: null,
    rightRocker: null,
    leftBogie: null,
    rightBogie: null,
  };

  const jointGeo = (r, len) => { const g = new THREE.CylinderGeometry(r, r, len, 12); g.rotateZ(Math.PI / 2); return g; };

  for (const side of [-1, 1]) {
    const isLeft = side < 0;
    const chassisPivotPos = new THREE.Vector3(side * ROVER.rockerPivot.x, ROVER.rockerPivot.y, ROVER.rockerPivot.z);
    const frontMountPos = new THREE.Vector3(side * ROVER.wheelX.front, ROVER.wheel.y + 0.28, ROVER.wheelZ.front);
    const middleMountPos = new THREE.Vector3(side * ROVER.wheelX.middle, ROVER.wheel.y + 0.28, ROVER.wheelZ.middle);
    const rearMountPos = new THREE.Vector3(side * ROVER.wheelX.rear, ROVER.wheel.y + 0.28, ROVER.wheelZ.rear);
    const bogiePivotPos = new THREE.Vector3(side * ROVER.bogiePivot.x, ROVER.bogiePivot.y, ROVER.bogiePivot.z);

    // Rocker arm group pivoting at chassisPivotPos
    const rocker = new THREE.Group();
    rocker.name = isLeft ? 'LeftRocker' : 'RightRocker';
    rocker.position.copy(chassisPivotPos);
    suspension.add(rocker);

    // Chassis pivot bearing
    const jChassis = new THREE.Mesh(jointGeo(0.065, 0.16), M.chromeStrut);
    jChassis.castShadow = true; rocker.add(jChassis);

    // Struts in rocker local space (chassis pivot is at 0, 0, 0)
    const localFront = frontMountPos.clone().sub(chassisPivotPos);
    const localBogie = bogiePivotPos.clone().sub(chassisPivotPos);
    addStrutBetween(new THREE.Vector3(0, 0, 0), localFront, 0.042, M.darkTitanium, rocker);
    addStrutBetween(new THREE.Vector3(0, 0, 0), localBogie, 0.042, M.darkTitanium, rocker);

    const jFront = new THREE.Mesh(jointGeo(0.045, 0.10), M.chromeStrut);
    jFront.position.copy(localFront); jFront.castShadow = true; rocker.add(jFront);

    // Bogie arm group pivoting at localBogie on the rocker
    const bogie = new THREE.Group();
    bogie.name = isLeft ? 'LeftBogie' : 'RightBogie';
    bogie.position.copy(localBogie);
    rocker.add(bogie);

    // Bogie pivot bearing
    const jBogie = new THREE.Mesh(jointGeo(0.055, 0.14), M.chromeStrut);
    jBogie.castShadow = true; bogie.add(jBogie);

    // Struts in bogie local space (bogie pivot is at 0, 0, 0)
    const localMiddle = middleMountPos.clone().sub(bogiePivotPos);
    const localRear = rearMountPos.clone().sub(bogiePivotPos);
    addStrutBetween(new THREE.Vector3(0, 0, 0), localMiddle, 0.038, M.darkTitanium, bogie);
    addStrutBetween(new THREE.Vector3(0, 0, 0), localRear, 0.038, M.darkTitanium, bogie);

    const jMid = new THREE.Mesh(jointGeo(0.045, 0.10), M.chromeStrut);
    jMid.position.copy(localMiddle); jMid.castShadow = true; bogie.add(jMid);

    const jRear = new THREE.Mesh(jointGeo(0.045, 0.10), M.chromeStrut);
    jRear.position.copy(localRear); jRear.castShadow = true; bogie.add(jRear);

    if (isLeft) {
      suspensionHooks.leftRocker = rocker;
      suspensionHooks.leftBogie = bogie;
    } else {
      suspensionHooks.rightRocker = rocker;
      suspensionHooks.rightBogie = bogie;
    }
  }

  /* ==================== WHEEL BUILDER & SUSPENSION SPRINGS ("PER") ==================== */
  const wheels = [];

  function buildWheel(def, radius, width, cleatCount) {
    // 1. Root group positioned at nominal wheel coordinates
    const root = new THREE.Group();
    root.name = `WheelMount_${def.name}`;
    root.position.set(def.x, ROVER.wheel.y, def.z);

    // 2. Upper Suspension Strut Assembly (fixed relative to mount)
    const upperMount = new THREE.Group();
    upperMount.name = `UpperMount_${def.name}`;
    upperMount.position.set(0, 0.28, 0);
    root.add(upperMount);

    // Upper titanium bracket
    const uBracket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.12), M.darkTitanium);
    uBracket.castShadow = true; upperMount.add(uBracket);

    // Upper spring perch collar
    const uPerch = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.02, 16), M.springTitanium);
    uPerch.position.y = -0.025;
    uPerch.castShadow = true; upperMount.add(uPerch);

    // Damper shock body (dark matte titanium cylinder hanging down)
    const damperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.15, 14), M.shockBody);
    damperBody.position.y = -0.10;
    damperBody.castShadow = true; upperMount.add(damperBody);

    // 3. Dynamic Suspension Travel Pivot (moves up & down along Y on terrain)
    const pivot = new THREE.Group();
    pivot.name = `SuspensionPivot_${def.name}`;
    root.add(pivot);

    // Lower spring perch collar
    const lPerch = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.02, 16), M.springTitanium);
    lPerch.position.y = 0.04;
    lPerch.castShadow = true; pivot.add(lPerch);

    // Chrome shock piston rod (extends upward inside damperBody)
    const shockPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.20, 12), M.shockPistonMat);
    shockPiston.position.y = 0.14;
    shockPiston.castShadow = true; pivot.add(shockPiston);

    // Knuckle carrier
    const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.10), M.darkTitanium);
    knuckle.position.y = 0;
    knuckle.castShadow = true; pivot.add(knuckle);

    // 3D PHYSICAL COILED SUSPENSION SPRING ("PER")
    // Built using parametric HelixCurve spiral tube geometry
    const restSpringHeight = 0.22;
    const springCurve = new HelixCurve(0.050, restSpringHeight, 5.0);
    const springGeo = new THREE.TubeGeometry(springCurve, 42, 0.009, 8, false);
    const springCoil = new THREE.Mesh(springGeo, M.springCoilMat);
    springCoil.position.y = 0.04; // sits on lower perch collar
    springCoil.castShadow = true;
    pivot.add(springCoil);

    // 4. Steering Group (rotates on Y for Ackermann steering)
    const steer = new THREE.Group();
    steer.name = `Steer_${def.name}`;
    pivot.add(steer);

    // 5. Axle Rolling Group (spins on X for 3D forward/reverse rolling)
    const spin = new THREE.Group();
    spin.name = `Spin_${def.name}`;
    steer.add(spin);

    // Tire
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width * 0.98, 32, 1, false);
    tireGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeo, M.tireDark);
    tire.castShadow = true; tire.receiveShadow = true; spin.add(tire);

    // Barrel Rim
    const barrelGeo = new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, width * 1.02, 24, 1, false);
    barrelGeo.rotateZ(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, M.wheelRim);
    barrel.castShadow = true; spin.add(barrel);

    // Sidewall rings
    for (const sx of [-1, 1]) {
      const ringGeo = new THREE.TorusGeometry(radius * 0.82, 0.022, 8, 32);
      const ring = new THREE.Mesh(ringGeo, M.wheelRim);
      ring.position.x = sx * width * 0.5;
      ring.rotation.y = Math.PI / 2;
      ring.castShadow = true; spin.add(ring);
    }

    // Hub
    const hubGeo = new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, width * 1.08, 16);
    hubGeo.rotateZ(Math.PI / 2);
    const hub = new THREE.Mesh(hubGeo, M.hub);
    hub.castShadow = true; spin.add(hub);

    // Radial spokes
    const spokeCount = 6;
    const spokeGeo = new THREE.BoxGeometry(width * 0.9, radius * 0.1, radius * 0.1);
    for (let i = 0; i < spokeCount; i++) {
      const a = (i / spokeCount) * Math.PI * 2;
      const spoke = new THREE.Mesh(spokeGeo, M.hub);
      const rMid = radius * 0.45;
      spoke.position.set(0, Math.cos(a) * rMid, Math.sin(a) * rMid);
      spoke.rotation.x = a;
      spoke.castShadow = true; spin.add(spoke);
    }

    // Chevron cleats around circumference (V-shaped true geometric cleats)
    const hw = width * 0.42;       // half V-width
    const tl = 0.06;               // tangent leg length
    const L = Math.sqrt(hw * hw + tl * tl);
    const arm1Phi = Math.atan2(-tl, -hw);
    const arm2Phi = Math.atan2(-tl, hw);
    const chevHeight = 0.03;
    const chevThick = 0.05;
    const rOuter = radius + 0.003;
    const cleatGeo = new THREE.BoxGeometry(L, chevHeight, chevThick);

    for (let i = 0; i < cleatCount; i++) {
      const a = (i / cleatCount) * Math.PI * 2;
      const cg = new THREE.Group();
      cg.position.set(0, Math.cos(a) * rOuter, Math.sin(a) * rOuter);
      cg.rotation.x = a;

      const arm1 = new THREE.Mesh(cleatGeo, M.cleat);
      arm1.position.set(-hw / 2, chevHeight / 2, tl / 2);
      arm1.rotation.y = arm1Phi;
      arm1.castShadow = true; cg.add(arm1);

      const arm2 = new THREE.Mesh(cleatGeo, M.cleat);
      arm2.position.set(hw / 2, chevHeight / 2, tl / 2);
      arm2.rotation.y = arm2Phi;
      arm2.castShadow = true; cg.add(arm2);

      spin.add(cg);
    }

    // Hub bolts
    const boltGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.01, 6); boltGeo.rotateZ(Math.PI / 2);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const br = radius * 0.3;
      const bolt = new THREE.Mesh(boltGeo, M.bolt);
      bolt.position.set(width * 0.55, Math.cos(a) * br, Math.sin(a) * br);
      spin.add(bolt);
    }

    return { root, pivot, steer, spin, springCoil, shockPiston, damperBody, upperMount, radius };
  }

  // Build 6 wheels at correct positions with station & side metadata
  const wheelDefs = [
    { x: -ROVER.wheelX.front,  z: ROVER.wheelZ.front,  station: 'front',  side: -1, name: 'FL' },
    { x:  ROVER.wheelX.front,  z: ROVER.wheelZ.front,  station: 'front',  side:  1, name: 'FR' },
    { x: -ROVER.wheelX.middle, z: ROVER.wheelZ.middle, station: 'middle', side: -1, name: 'ML' },
    { x:  ROVER.wheelX.middle, z: ROVER.wheelZ.middle, station: 'middle', side:  1, name: 'MR' },
    { x: -ROVER.wheelX.rear,   z: ROVER.wheelZ.rear,   station: 'rear',   side: -1, name: 'RL' },
    { x:  ROVER.wheelX.rear,   z: ROVER.wheelZ.rear,   station: 'rear',   side:  1, name: 'RR' },
  ];

  for (const def of wheelDefs) {
    const w = buildWheel(def, ROVER.wheel.radius, ROVER.wheel.width, ROVER.wheel.cleatCount);
    group.add(w.root);
    wheels.push({
      root: w.root,
      pivot: w.pivot,
      steer: w.steer,
      spin: w.spin,
      rotation: w.spin, // aliased for backward-compatibility with animationController
      springCoil: w.springCoil,
      shockPiston: w.shockPiston,
      damperBody: w.damperBody,
      upperMount: w.upperMount,
      restSpringHeight: 0.22,
      radius: w.radius,
      x: def.x,
      z: def.z,
      station: def.station,
      side: def.side,
      name: def.name,
      baseY: ROVER.wheel.y,
      compression: 0,
    });
  }

  /* ==================== MAST ==================== */
  const mast = new THREE.Group();
  mast.position.set(0.5, 1.15, -0.9);
  group.add(mast);

  addMesh(new THREE.BoxGeometry(0.25, 0.12, 0.25), M.darkTitanium, 0, 0.06, 0, 0, 0, 0, mast);
  addMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 10), M.bodyWhite, 0, 0.45, 0, 0, 0, 0, mast);
  addMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 10), M.chromeStrut, 0, 0.82, 0, 0, 0, 0, mast);
  addMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.65, 10), M.bodyWhite, 0, 1.18, 0, 0, 0, 0, mast);

  const sensorHead = new THREE.Group();
  sensorHead.position.set(0, 1.55, 0);
  mast.add(sensorHead);

  addMesh(new THREE.BoxGeometry(0.55, 0.22, 0.25), M.bodyWhite, 0, 0, 0, 0, 0, 0, sensorHead);
  addMesh(new THREE.BoxGeometry(0.57, 0.06, 0.27), M.darkTitanium, 0, 0.08, 0, 0, 0, 0, sensorHead);

  for (const xOff of [-0.18, 0.18]) {
    addMesh(new THREE.CylinderGeometry(0.065, 0.065, 0.16, 16), M.darkTitanium, xOff, 0, -0.16, Math.PI / 2, 0, 0, sensorHead);
    addMesh(new THREE.CylinderGeometry(0.048, 0.048, 0.04, 16), M.lensGlass, xOff, 0, -0.24, Math.PI / 2, 0, 0, sensorHead);
  }
  addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 12), M.chromeStrut, 0, 0.02, -0.16, Math.PI / 2, 0, 0, sensorHead);
  addMesh(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 12), M.accent, 0, 0.02, -0.25, Math.PI / 2, 0, 0, sensorHead);
  addMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 6), M.chromeStrut, -0.38, 0, 0, 0, 0, Math.PI / 2, sensorHead);
  addMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 6), M.chromeStrut, 0.38, 0, 0, 0, 0, Math.PI / 2, sensorHead);

  /* ==================== MMRTG ==================== */
  const mmrtg = new THREE.Group();
  mmrtg.position.set(0, 1.15, 1.25);
  mmrtg.rotation.x = 0.45;
  group.add(mmrtg);
  addMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.7, 16), M.darkTitanium, 0, 0.35, 0, 0, 0, 0, mmrtg);
  for (let f = 0; f < 8; f++) {
    addMesh(new THREE.BoxGeometry(0.02, 0.6, 0.65), M.darkTitanium, 0, 0.35, 0, 0, (f / 8) * Math.PI, 0, mmrtg);
  }
  addMesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 16), M.chromeStrut, 0, 0.72, 0, 0, 0, 0, mmrtg);

  /* ==================== ROLE-SPECIFIC EQUIPMENT ==================== */
  const roleHooks = {};

  if (role === 'surface-mapping') {
    addMesh(new THREE.BoxGeometry(1.0, 0.04, 1.5), M.solar, -1.2, 1.25, 0, 0, 0, 0.15);
    addMesh(new THREE.BoxGeometry(1.0, 0.04, 1.5), M.solar, 1.2, 1.25, 0, 0, 0, -0.15);

    const lidarDome = addMesh(new THREE.SphereGeometry(0.2, 16, 12), M.darkTitanium, 0.5, 2.9, -0.9);
    const lidarRing = addMesh(new THREE.TorusGeometry(0.26, 0.03, 8, 24), M.accent, 0.5, 2.9, -0.9, Math.PI / 2);

    addMesh(new THREE.BoxGeometry(0.8, 0.08, 0.12), M.darkTitanium, 0, 1.15, -1.42);
    addMesh(new THREE.BoxGeometry(0.7, 0.03, 0.05), M.accent, 0, 1.15, -1.49);

    const scanRing = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 3.2, 32),
      new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    scanRing.rotation.x = Math.PI / 2;
    scanRing.position.set(0, 0.05, -1.5);
    group.add(scanRing);

    roleHooks.scanRing = scanRing;
    roleHooks.lidarDome = lidarDome;
    roleHooks.lidarRing = lidarRing;

  } else if (role === 'geological-investigation') {
    // Carousel
    addMesh(new THREE.CylinderGeometry(0.32, 0.32, 0.38, 16), M.chromeStrut, 0.85, 0.95, -0.2, 0, 0, Math.PI / 2);
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2;
      addMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.39, 8), M.darkTitanium, 0.85, 0.95 + Math.cos(a) * 0.22, -0.2 + Math.sin(a) * 0.22, 0, 0, Math.PI / 2);
    }
    // Drill arm
    const armGroup = new THREE.Group();
    armGroup.position.set(-0.65, 0.95, -1.05);
    addMesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), M.darkTitanium, 0, 0, 0, 0, 0, 0, armGroup);
    addMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 8), M.bodyWhite, 0, 0.28, -0.25, -0.65, 0, 0, armGroup);
    addMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 10), M.chromeStrut, 0, 0.55, -0.5, 0, 0, Math.PI / 2, armGroup);
    addMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.7, 8), M.bodyWhite, 0, 0.32, -0.75, 0.55, 0, 0, armGroup);
    addMesh(new THREE.CylinderGeometry(0.14, 0.14, 0.28, 12), M.darkTitanium, 0, 0.12, -1.0, Math.PI / 2, 0, 0, armGroup);
    const drillBit = addMesh(new THREE.CylinderGeometry(0.025, 0.05, 0.32, 8), M.chromeStrut, 0, 0.12, -1.18, Math.PI / 2, 0, 0, armGroup);
    group.add(armGroup);

    const laserBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 3.0, 8),
      new THREE.MeshBasicMaterial({ color: 0xff1144, transparent: true, opacity: 0.85 })
    );
    laserBeam.position.set(0.5, 1.4, -2.4);
    laserBeam.rotation.x = Math.PI / 3;
    laserBeam.visible = false;
    group.add(laserBeam);

    roleHooks.laserBeam = laserBeam;
    roleHooks.armGroup = armGroup;
    roleHooks.drillBit = drillBit;

  } else if (role === 'transport-support') {
    const containerMat = new THREE.MeshStandardMaterial({ color: 0x2e353b, roughness: 0.4, metalness: 0.8 });
    const panelMat = new THREE.MeshStandardMaterial({ color: 0xeeece6, roughness: 0.3, metalness: 0.5 });
    const hazardMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x885500, emissiveIntensity: 0.4, roughness: 0.4 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 1.8, roughness: 0.2 });

    const containerTex = getNasaContainerTexture();
    const containerBrandMat = new THREE.MeshStandardMaterial({
      map: containerTex, roughness: 0.35, metalness: 0.1,
      emissive: 0xffffff, emissiveMap: containerTex, emissiveIntensity: 0.45,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    });

    addMesh(new THREE.BoxGeometry(1.75, 1.05, 2.3), containerMat, 0, 1.4, 0.2);

    for (const sign of [-1, 1]) {
      addMesh(new THREE.BoxGeometry(0.08, 0.85, 2.1), panelMat, sign * 0.9, 1.4, 0.2);
      addMesh(new THREE.BoxGeometry(0.09, 0.12, 2.1), hazardMat, sign * 0.91, 1.65, 0.2);
      addMesh(new THREE.BoxGeometry(0.09, 0.06, 1.9), glowMat, sign * 0.91, 1.1, 0.2);
      addDecal(new THREE.PlaneGeometry(1.6, 0.42), containerBrandMat, sign * 0.946, 1.38, 0.2, 0, sign * Math.PI / 2, 0);
    }

    addMesh(new THREE.BoxGeometry(1.6, 0.9, 0.1), M.darkTitanium, 0, 1.4, 1.36);
    addMesh(new THREE.BoxGeometry(1.4, 0.15, 0.14), M.chromeStrut, 0, 1.4, 1.38);
    addMesh(new THREE.SphereGeometry(0.08, 8, 8), glowMat, -0.6, 1.7, 1.4);

    addMesh(new THREE.BoxGeometry(1.5, 0.65, 0.8), M.darkTitanium, 0, 1.25, -1.15);
    addMesh(new THREE.BoxGeometry(1.2, 0.4, 0.2), M.lensGlass, 0, 1.35, -1.56);

    const radarGroup = new THREE.Group();
    radarGroup.position.set(0, 1.65, -1.1);
    addMesh(new THREE.CylinderGeometry(0.12, 0.16, 0.2, 12), M.darkTitanium, 0, 0.1, 0, 0, 0, 0, radarGroup);
    const radarDish = new THREE.Group();
    radarDish.position.set(0, 0.25, 0);
    addMesh(new THREE.CylinderGeometry(0.42, 0.18, 0.12, 20), M.bodyWhite, 0, 0.06, 0, 0, 0, 0, radarDish);
    addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8), M.chromeStrut, 0, 0.22, 0, 0, 0, 0, radarDish);
    addMesh(new THREE.SphereGeometry(0.08, 8, 8), M.accent, 0, 0.4, 0, 0, 0, 0, radarDish);
    radarGroup.add(radarDish);
    group.add(radarGroup);

    const cargoSpecimen = new THREE.Group();
    cargoSpecimen.position.set(0, 1.4, 0.2);
    addMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 16), glowMat, 0, 0, 0, Math.PI / 2, 0, 0, cargoSpecimen);
    addMesh(new THREE.TorusGeometry(0.32, 0.05, 8, 16), M.chromeStrut, 0, 0, 0, 0, 0, 0, cargoSpecimen);
    cargoSpecimen.visible = false;
    group.add(cargoSpecimen);

    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.85 });
    const boosterFlames = [];
    for (const sx of [-0.48, 0.48]) {
      addMesh(new THREE.CylinderGeometry(0.14, 0.18, 0.22, 12), M.darkTitanium, sx, 1.1, 1.42, Math.PI / 2);
      const flame = addMesh(new THREE.ConeGeometry(0.12, 0.8, 12), flameMat, sx, 1.1, 1.9, -Math.PI / 2);
      flame.visible = false;
      boosterFlames.push(flame);
    }

    addMesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 10), M.chromeStrut, 0, 0.75, -1.55, 0, 0, Math.PI / 2);
    addMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), M.darkTitanium, -0.75, 0.6, -1.5, 0.3, 0, 0);
    addMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), M.darkTitanium, 0.75, 0.6, -1.5, 0.3, 0, 0);

    // Sampling arm (dual tool: claw + scoop)
    const armGroup = new THREE.Group();
    armGroup.position.set(0.68, 0.95, -1.35);

    addMesh(new THREE.CylinderGeometry(0.12, 0.14, 0.2, 12), M.darkTitanium, 0, 0.05, 0, 0, 0, 0, armGroup);
    addMesh(new THREE.SphereGeometry(0.1, 10, 10), M.chromeStrut, 0, 0.16, 0, 0, 0, 0, armGroup);

    const upperArm = new THREE.Group();
    upperArm.position.set(0, 0.16, 0);
    addMesh(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 10), M.bodyWhite, 0, 0.42, 0, 0, 0, 0, upperArm);
    addMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), M.chromeStrut, 0.06, 0.42, 0.04, 0, 0, 0, upperArm);
    upperArm.rotation.x = -0.4;
    armGroup.add(upperArm);

    const forearmGroup = new THREE.Group();
    forearmGroup.position.set(0, 0.85, 0);
    addMesh(new THREE.SphereGeometry(0.08, 10, 10), M.darkTitanium, 0, 0, 0, 0, 0, 0, forearmGroup);
    addMesh(new THREE.CylinderGeometry(0.04, 0.045, 0.75, 10), M.darkTitanium, 0, 0.38, 0, 0, 0, 0, forearmGroup);
    upperArm.add(forearmGroup);

    const toolHead = new THREE.Group();
    toolHead.position.set(0, 0.75, 0);
    addMesh(new THREE.BoxGeometry(0.18, 0.12, 0.16), M.darkTitanium, 0, 0.06, 0, 0, 0, 0, toolHead);
    addMesh(new THREE.SphereGeometry(0.04, 8, 8), glowMat, 0, 0.14, 0, 0, 0, 0, toolHead);
    forearmGroup.add(toolHead);

    const clawGroup = new THREE.Group();
    clawGroup.position.set(0, 0.12, 0);
    const clawLeft = new THREE.Group(); clawLeft.position.set(-0.07, 0, 0);
    addMesh(new THREE.BoxGeometry(0.03, 0.22, 0.06), M.chromeStrut, 0, 0.1, 0, 0, 0, -0.2, clawLeft);
    addMesh(new THREE.ConeGeometry(0.035, 0.1, 4), M.accent, 0.02, 0.24, 0, 0, 0, Math.PI / 1.5, clawLeft);
    clawGroup.add(clawLeft);
    const clawRight = new THREE.Group(); clawRight.position.set(0.07, 0, 0);
    addMesh(new THREE.BoxGeometry(0.03, 0.22, 0.06), M.chromeStrut, 0, 0.1, 0, 0, 0, 0.2, clawRight);
    addMesh(new THREE.ConeGeometry(0.035, 0.1, 4), M.accent, -0.02, 0.24, 0, 0, 0, -Math.PI / 1.5, clawRight);
    clawGroup.add(clawRight);
    toolHead.add(clawGroup);

    const scoopGroup = new THREE.Group();
    scoopGroup.position.set(0, 0.1, 0.12);
    addMesh(new THREE.CylinderGeometry(0.12, 0.06, 0.16, 16, 1, false, 0, Math.PI), M.chromeStrut, 0, 0.08, 0, -Math.PI / 2, 0, 0, scoopGroup);
    addMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8), glowMat, 0, -0.08, -0.06, 0.4, 0, 0, scoopGroup);
    toolHead.add(scoopGroup);

    group.add(armGroup);

    roleHooks.radarDish = radarDish;
    roleHooks.containerGlow = glowMat;
    roleHooks.cargoSpecimen = cargoSpecimen;
    roleHooks.boosterFlames = boosterFlames;
    roleHooks.samplingArmGroup = armGroup;
    roleHooks.upperArm = upperArm;
    roleHooks.forearmGroup = forearmGroup;
    roleHooks.toolHead = toolHead;
    roleHooks.clawGroup = clawGroup;
    roleHooks.clawLeft = clawLeft;
    roleHooks.clawRight = clawRight;
    roleHooks.scoopGroup = scoopGroup;
    roleHooks.samplingMode = 'idle';
    roleHooks.samplingProgress = 0;
  }

  /* ==================== 8. HUD TAG ==================== */
  const sprite = createRoverTag(callsign, name, missionTitle, accent);
  sprite.position.set(0, 2.5, 0);
  sprite.scale.set(2.4, 0.9, 1);
  sprite.renderOrder = 999;
  group.add(sprite);

  /* ==================== ANIMATION CONTROLLER ==================== */
  let lastWorldPos = null;
  let animTime = 0;

  const animationController = {
    wheelRadius: ROVER.wheel.radius,
    wheels,
    /**
     * Call ONCE per frame from the existing animation loop.
     *
     * Kinematics: Δθ = (v · dt) / r   (frame-rate independent)
     *
     * If `forwardVelocity` is omitted, it is derived from the rover's
     * world-position delta projected onto the rover's local forward axis
     * (-Z). This means moving the rover ANY way (transform, physics,
     * controller) automatically spins the wheels correctly.
     *
     * @param {number} deltaTime seconds
     * @param {object} [opts]
     * @param {number} [opts.forwardVelocity] m/s (positive = forward, -Z)
     * @param {number} [opts.angularVelocity] rad/s (positive = CCW from above = turn left)
     */
    update(deltaTime, opts = {}) {
      const dt = Math.min(Math.max(deltaTime, 0), 0.1);
      animTime += dt;

      let fwdV = opts.forwardVelocity;
      const angV = opts.angularVelocity || 0;

      if (fwdV === undefined) {
        const wp = new THREE.Vector3();
        group.getWorldPosition(wp);
        if (lastWorldPos) {
          const q = group.getWorldQuaternion(new THREE.Quaternion());
          const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
          const disp = wp.clone().sub(lastWorldPos);
          fwdV = disp.dot(fwd) / dt;
        } else {
          fwdV = 0;
        }
        lastWorldPos = wp.clone();
      }

      // Differential wheel speed: outer wheels travel farther when turning
      for (const w of wheels) {
        const sideV = fwdV + angV * w.x;
        // Forward motion (-Z) ⇒ wheels spin around +X negatively.
        const spinObj = w.spin || w.rotation;
        if (spinObj) {
          spinObj.rotation.x = (spinObj.rotation.x + (-sideV / w.radius) * dt) % (Math.PI * 2);
        }
      }

      // Role-specific idle animations
      if (roleHooks.lidarDome) {
        roleHooks.lidarDome.rotation.y += dt * 1.2;
        if (roleHooks.lidarRing) roleHooks.lidarRing.material.emissiveIntensity = 1.5 + 0.8 * Math.sin(animTime * 4);
        if (roleHooks.scanRing) roleHooks.scanRing.material.opacity = 0.3 + 0.15 * Math.sin(animTime * 2);
      }
      if (roleHooks.radarDish) roleHooks.radarDish.rotation.y += dt * 1.0;
      if (roleHooks.containerGlow) roleHooks.containerGlow.emissiveIntensity = 1.5 + 0.5 * Math.sin(animTime * 3);
    },
  };

  // Optional: auto-drive via RAF for apps that don't already call update()
  let autoRAF = null;
  group.userData.enableAutoWheels = () => {
    if (autoRAF) return;
    let lastT = performance.now();
    const tick = (t) => {
      const dt = (t - lastT) / 1000;
      lastT = t;
      animationController.update(dt); // uses world-position delta
      autoRAF = requestAnimationFrame(tick);
    };
    autoRAF = requestAnimationFrame(tick);
  };
  group.userData.disableAutoWheels = () => {
    if (autoRAF) cancelAnimationFrame(autoRAF);
    autoRAF = null;
  };

  /* ==================== USERDATA ==================== */
  group.userData = Object.assign(group.userData, {
    groundOffset: 0,
    role, name, callsign, missionTitle,
    tagSprite: sprite,
    roleHooks,
    wheels,
    suspensionHooks,
    animationController,
  });

  return group;
}

/* ------------------------- HUD Pin Tag (Aerospace Callout) ------------------------- */
function createRoverTag(callsign, name, missionTitle, accentColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  const hex = '#' + accentColor.toString(16).padStart(6, '0');

  // Background panel with dark aerospace glassmorphism
  ctx.fillStyle = 'rgba(7, 11, 18, 0.94)';
  ctx.strokeStyle = hex;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(8, 8, 464, 130, 10);
  ctx.fill();
  ctx.stroke();

  // Top header accent strip
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.roundRect(8, 8, 464, 30, [10, 10, 0, 0]);
  ctx.fill();

  // Header: Callsign & Mission Role
  ctx.fillStyle = '#060a10';
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`ROV-${callsign} · ${missionTitle.toUpperCase()}`, 240, 28);

  // Main Rover Name
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 28px "Plus Jakarta Sans", "Inter", sans-serif';
  ctx.fillText(name, 240, 80);

  // Clean Single Subtitle with tabular / monospace telemetry styling
  ctx.fillStyle = hex;
  ctx.font = '600 13px "JetBrains Mono", monospace';
  ctx.fillText('● AUTONOMOUS EXPLORATION SYSTEM', 240, 118);

  // Downward pointer arrow notch (pointing to rover mast)
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.moveTo(226, 138);
  ctx.lineTo(254, 138);
  ctx.lineTo(240, 162);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 999;
  return sprite;
}