import * as THREE from 'three';
import { createRoverModel } from './roverModel.js';
import { RoverPhysics } from './roverPhysics.js';
import {
  SurfaceMappingAgent,
  GeologicalInvestigationAgent,
  TransportSupportAgent,
  ROVER_ROLES,
} from '../ai/agentInterface.js';

export const SWARM_ROBOTS = [
  {
    id: 'mapper',
    callsign: '01',
    name: 'Ares Mapper',
    role: ROVER_ROLES.SURFACE_MAPPING,
    missionTitle: 'Surface Mapping & Exploration',
    icon: 'map',
    accent: 0x00d4ff, // Cyan
    accentHex: '#00d4ff',
    startOffset: [0, 0],
    description: 'Eksplorasi awal, pemetaan topografi medan, pencarian wilayah baru & rute aman.',
    equipment: 'LiDAR 360°, Phased Radar, Solar Arrays',
  },
  {
    id: 'geologist',
    callsign: '02',
    name: 'Curiosity GeoLab',
    role: ROVER_ROLES.GEOLOGICAL_INVESTIGATION,
    missionTitle: 'Geological Investigation',
    icon: 'microscope',
    accent: 0xff3b5c, // Crimson
    accentHex: '#ff3b5c',
    startOffset: [32, -22],
    description: 'Investigasi geologi, analisis mineral batuan, pengeboran sampel inti & laser Raman.',
    equipment: 'Heavy Core Drill, SuperCam Raman Laser, Sample Drum',
  },
  {
    id: 'transport',
    callsign: '03',
    name: 'Hermes Transport',
    role: ROVER_ROLES.TRANSPORT_SUPPORT,
    missionTitle: 'Mission Transport & Support',
    icon: 'truck',
    accent: 0x00ff88, // Emerald Green
    accentHex: '#00ff88',
    startOffset: [-32, -32],
    description: 'Spesialis transportasi misi, penampungan tabung sampel (caching) & relay komunikasi orbiter.',
    equipment: '10-Slot Cache Rack, Orbital High-Gain Relay, Heavy Chassis',
  },
];

export class RoverSwarm {
  constructor(scene, hf, frame, roverOpts, visualScale = 15) {
    this.scene = scene;
    this.hf = hf;
    this.frame = frame;
    this.roverOpts = roverOpts;
    this.visualScale = visualScale;

    this.rovers = [];
    this.activeIndex = 0;
    this.swarmMode = 'hold'; // 'hold' (default manual) | 'formation' | 'autonomous'

    // Notification callback for HUD toasts
    this.onMissionLog = () => {};

    // Internal math helpers
    this._up = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._tempPos = new THREE.Vector3();
    this._wFront = { x: 0, y: 0, z: 0 };
    this._wRear  = { x: 0, y: 0, z: 0 };
    this._wLeft  = { x: 0, y: 0, z: 0 };
    this._wRight = { x: 0, y: 0, z: 0 };
    this._m4 = new THREE.Matrix4();
    this._animTime = 0;

    this.#initRobots();
  }

  setReliefSampler(fn) {
    this.reliefSampler = fn;
    for (const r of this.rovers) {
      r.physics.setReliefSampler(fn);
    }
  }

  #initRobots() {
    for (let i = 0; i < SWARM_ROBOTS.length; i++) {
      const cfg = SWARM_ROBOTS[i];

      const mesh = createRoverModel({
        role: cfg.role,
        accent: cfg.accent,
        name: cfg.name,
        callsign: cfg.callsign,
        missionTitle: cfg.missionTitle,
      });
      mesh.scale.setScalar(this.visualScale);
      this.scene.add(mesh);

      const physics = new RoverPhysics(this.hf, this.roverOpts);

      let agent;
      if (cfg.role === ROVER_ROLES.SURFACE_MAPPING) {
        agent = new SurfaceMappingAgent(this.hf, { x: 0, y: 0 });
      } else if (cfg.role === ROVER_ROLES.GEOLOGICAL_INVESTIGATION) {
        agent = new GeologicalInvestigationAgent(this.hf, { x: 0, y: 0 });
      } else {
        agent = new TransportSupportAgent(this.hf);
      }

      this.rovers.push({
        ...cfg,
        index: i,
        mesh,
        physics,
        agent,
      });
    }
  }

  setVisualScale(scale) {
    this.visualScale = scale;
    for (const r of this.rovers) {
      r.mesh.scale.setScalar(scale);
    }
  }

  spawnAt(startX, startY, heading = 0) {
    for (let i = 0; i < this.rovers.length; i++) {
      const r = this.rovers[i];
      const [offX, offY] = r.startOffset;

      const cosH = Math.cos(heading);
      const sinH = Math.sin(heading);
      const posX = startX + sinH * offY + cosH * offX;
      const posY = startY + cosH * offY - sinH * offX;

      r.physics.setPosition(posX, posY, heading);
      if (r.agent.base) r.agent.base = { x: posX, y: posY };
      this.#updatePose(r);
    }
  }

  getActiveRover() {
    return this.rovers[this.activeIndex];
  }

  setActiveRover(index) {
    if (index >= 0 && index < this.rovers.length) {
      this.activeIndex = index;
    }
    return this.getActiveRover();
  }

  setSwarmMode(mode) {
    if (['autonomous', 'formation', 'hold'].includes(mode)) {
      this.swarmMode = mode;
      this.onMissionLog(`Mode Swarm diubah ke: ${mode.toUpperCase()}`);
    }
  }

  /**
   * Triggers the active rover's specialized mission task manually.
   */
  triggerActiveTask() {
    const active = this.getActiveRover();
    if (active.role === ROVER_ROLES.SURFACE_MAPPING) {
      active.agent.mappedKm2 += 0.25;
      active.agent.waypointsFound++;
      this.onMissionLog(`[Ares Mapper] Memetakan sektor: ${active.agent.targetFeature} (+0.25 km²)!`);
    } else if (active.role === ROVER_ROLES.GEOLOGICAL_INVESTIGATION) {
      active.agent.startManualDrill();
      this.onMissionLog(`[GeoLab] Pengeboran dimulai pada: ${active.agent.currentRock.name} (Laser Raman aktif)`);
    } else if (active.role === ROVER_ROLES.TRANSPORT_SUPPORT) {
      const geoRover = this.rovers[1];
      if (geoRover && geoRover.agent.samplesSealed > active.agent.tubesCached) {
        active.agent.cacheSample();
        this.#updateTubeVisuals();
        this.onMissionLog(`[Hermes Transport] Sampel baru berhasil diambil & disimpan! Slot: ${active.agent.tubesCached}/10`);
      } else {
        active.agent.cacheSample();
        this.#updateTubeVisuals();
        this.onMissionLog(`[Hermes Transport] Menyimpan tabung cadangan ke rak logistik! Slot: ${active.agent.tubesCached}/10`);
      }
    }
  }

  #updateTubeVisuals() {
    const transportRover = this.rovers[2];
    if (!transportRover) return;
    const hooks = transportRover.mesh.userData.roleHooks;
    if (hooks && hooks.sampleTubes) {
      const stored = transportRover.agent.tubesCached;
      for (let i = 0; i < hooks.sampleTubes.length; i++) {
        hooks.sampleTubes[i].material = i < stored ? hooks.tubeActiveMat : hooks.tubeEmptyMat;
      }
    }
  }

  update(dt, playerInput) {
    this._animTime += dt;
    const leader = this.getActiveRover();

    // 1. Process active rover - ALWAYS strictly controlled by player input (never moves on its own)
    leader.physics.step(dt, playerInput);
    if (leader.role === ROVER_ROLES.SURFACE_MAPPING && Math.abs(leader.physics.speed) > 0.5) {
      leader.agent.mappedKm2 += (Math.abs(leader.physics.speed) * dt * 0.1) / 1000;
    }
    this.#updatePose(leader);
    this.#updateWheelAnimation(leader, dt);

    // 2. Process companion rovers
    for (let i = 0; i < this.rovers.length; i++) {
      if (i === this.activeIndex) continue;
      const companion = this.rovers[i];

      let input = { throttle: 0, steer: 0 };
      if (this.swarmMode === 'autonomous') {
        input = this.#stepAgent(companion, dt);
      } else if (this.swarmMode === 'formation') {
        // Delta formation: companions only reposition if needed
        const [offX, offY] = companion.startOffset;
        const cosH = Math.cos(leader.physics.heading);
        const sinH = Math.sin(leader.physics.heading);
        const targetX = leader.physics.X + sinH * offY + cosH * offX;
        const targetY = leader.physics.Y + cosH * offY - sinH * offX;

        const dx = targetX - companion.physics.X;
        const dy = targetY - companion.physics.Y;
        const dist = Math.hypot(dx, dy);

        // Only move if leader is moving or if companion is far away from its formation spot
        const leaderIsMoving = Math.abs(leader.physics.speed) > 0.5;
        if (dist > (leaderIsMoving ? 4.5 : 8.0)) {
          const desiredHeading = Math.atan2(dx, dy);
          let diff = desiredHeading - companion.physics.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          input = {
            steer: Math.max(-1, Math.min(1, diff * 1.8)),
            throttle: Math.abs(diff) > 1.2 ? 0.2 : Math.min(0.9, Math.max(0.25, dist / 22)),
          };
        }
      } else {
        // 'hold' mode: park completely
        input = { throttle: 0, steer: 0 };
      }
      companion.physics.step(dt, input);
      this.#updatePose(companion);
      this.#updateWheelAnimation(companion, dt);
    }

    // 3. Update dynamic visual animations
    this.#animateEffects(dt);
  }

  #stepAgent(rover, dt) {
    if (rover.role === ROVER_ROLES.SURFACE_MAPPING) {
      return rover.agent.act(rover.physics, dt);
    } else if (rover.role === ROVER_ROLES.GEOLOGICAL_INVESTIGATION) {
      return rover.agent.act(rover.physics, dt);
    } else if (rover.role === ROVER_ROLES.TRANSPORT_SUPPORT) {
      // Hermes transport follows GeoLab (rover 1)
      const geoRover = this.rovers[1] || this.rovers[0];
      return rover.agent.act(rover.physics, geoRover.physics, dt);
    }
    return { throttle: 0, steer: 0 };
  }

  #animateEffects(dt) {
    // 0. Spin wheels on all rovers based on their physics speed
    // Wheel radius = 0.4 model units * visualScale metres → circumference = 2π * 0.4 * S
    // rad/s = speed_m_s / wheel_radius_m
    for (const rover of this.rovers) {
      const wheels = rover.mesh.userData.wheelGroups;
      if (!wheels) continue;
      const wheelRadiusM = 0.4 * this.visualScale;
      const spinRate = rover.physics.speed / wheelRadiusM; // rad/s
      const delta = spinRate * dt;
      for (const w of wheels) {
        w.rotation.x -= delta;
      }
    }

    // 1. Mapper: Rotate LiDAR dome & pulse scanning ring
    const mapper = this.rovers[0];
    if (mapper && mapper.mesh.userData.roleHooks) {
      const h = mapper.mesh.userData.roleHooks;
      if (h.lidarDome) h.lidarDome.rotation.y += dt * 3.5;
      if (h.scanRing) {
        const s = 1.0 + Math.sin(this._animTime * 4) * 0.15;
        h.scanRing.scale.set(s, s, s);
        h.scanRing.material.opacity = 0.4 + Math.sin(this._animTime * 4) * 0.2;
      }
    }

    // 2. GeoLab: Laser beam visibility & drill pulsation
    const geo = this.rovers[1];
    if (geo && geo.mesh.userData.roleHooks) {
      const h = geo.mesh.userData.roleHooks;
      const isDrilling = geo.agent.state === 'drilling' || geo.agent.state === 'analyzing';
      if (h.laserBeam) {
        h.laserBeam.visible = isDrilling;
        if (isDrilling) {
          h.laserBeam.material.opacity = 0.6 + Math.random() * 0.4;
        }
      }
      if (h.drillBit && isDrilling) {
        h.drillBit.rotation.y += dt * 25.0;
      }
    }

    // 3. Transport: Continuous Radar Scanner Rotation & Container Sync
    const transport = this.rovers[2];
    if (transport && transport.mesh.userData.roleHooks) {
      const h = transport.mesh.userData.roleHooks;
      if (h.radarDish) {
        h.radarDish.rotation.y += dt * 4.8;
      }
      if (h.boosterFlames) {
        const isBoosting = transport.physics.speed > 45;
        for (const flame of h.boosterFlames) {
          flame.visible = isBoosting;
          if (isBoosting) {
            const scaleZ = 0.8 + Math.random() * 0.5 + Math.min(2.5, transport.physics.speed / 180);
            flame.scale.set(1.0, scaleZ, 1.0);
          }
        }
      }
      if (h.relayGroup) {
        h.relayGroup.rotation.y = 0.6 + Math.sin(this._animTime * 0.4) * 0.15;
      }

      // Animasi Articulated Sampling Arm (Capit Padat & Serok Cair)
      if (h.samplingArmGroup && h.upperArm && h.forearmGroup) {
        if (h.samplingMode === 'claw') {
          // MODE CAPIT BENDA PADAT (Hydraulic Claw Gripper)
          if (h.clawGroup) h.clawGroup.visible = true;
          if (h.scoopGroup) h.scoopGroup.visible = false;

          const p = Math.max(0, Math.min(1, h.samplingProgress || 0));
          if (p < 0.45) {
            // Fase 1: Lengan turun menjangkau ke tanah, capit membuka lebar
            const t = p / 0.45;
            h.upperArm.rotation.x = -0.4 + (0.85 - (-0.4)) * t;
            h.forearmGroup.rotation.x = 0.7 * t;
            if (h.clawLeft) h.clawLeft.rotation.z = -0.15 - 0.4 * t;
            if (h.clawRight) h.clawRight.rotation.z = 0.15 + 0.4 * t;
          } else if (p < 0.75) {
            // Fase 2: Capit MENJEPIT RAPAT benda padat!
            const t = (p - 0.45) / 0.3;
            h.upperArm.rotation.x = 0.85;
            h.forearmGroup.rotation.x = 0.7;
            if (h.clawLeft) h.clawLeft.rotation.z = -0.55 + 0.7 * t;
            if (h.clawRight) h.clawRight.rotation.z = 0.55 - 0.7 * t;
          } else {
            // Fase 3: Lengan terangkat ke atas menuju pintu kontainer & memasukkan kargo
            const t = (p - 0.75) / 0.25;
            h.upperArm.rotation.x = 0.85 - (0.85 - (-0.9)) * t;
            h.forearmGroup.rotation.x = 0.7 - 0.9 * t;
            if (h.clawLeft) h.clawLeft.rotation.z = 0.15;
            if (h.clawRight) h.clawRight.rotation.z = -0.15;
          }
        } else if (h.samplingMode === 'scoop') {
          // MODE SEROK BENDA CAIR (Suction Dipper Scoop)
          if (h.clawGroup) h.clawGroup.visible = false;
          if (h.scoopGroup) h.scoopGroup.visible = true;

          const p = Math.max(0, Math.min(1, h.samplingProgress || 0));
          if (p < 0.4) {
            // Fase 1: Lengan menjulur turun ke kolam fluida
            const t = p / 0.4;
            h.upperArm.rotation.x = -0.4 + (0.8 - (-0.4)) * t;
            h.forearmGroup.rotation.x = 0.75 * t;
            if (h.scoopGroup) h.scoopGroup.rotation.x = -0.2 * t;
          } else if (p < 0.75) {
            // Fase 2: MENYEROK FLUIDA CAIR (Gerakan menciduk berayun)
            const t = (p - 0.4) / 0.35;
            h.upperArm.rotation.x = 0.8 + Math.sin(t * Math.PI) * 0.1;
            h.forearmGroup.rotation.x = 0.75;
            if (h.scoopGroup) h.scoopGroup.rotation.x = -0.2 + 0.8 * t;
          } else {
            // Fase 3: Lengan terangkat menuang cairan ke selang tangki kontainer
            const t = (p - 0.75) / 0.25;
            h.upperArm.rotation.x = 0.8 - (0.8 - (-0.9)) * t;
            h.forearmGroup.rotation.x = 0.75 - 0.9 * t;
            if (h.scoopGroup) h.scoopGroup.rotation.x = 0.6;
          }
        } else {
          // MODE IDLE: Lengan kembali ke posisi parkir terlipat
          if (h.clawGroup) h.clawGroup.visible = true;
          if (h.scoopGroup) h.scoopGroup.visible = true;
          h.upperArm.rotation.x += (-0.4 - h.upperArm.rotation.x) * dt * 5;
          h.forearmGroup.rotation.x += (0 - h.forearmGroup.rotation.x) * dt * 5;
          if (h.clawLeft) h.clawLeft.rotation.z += (0 - h.clawLeft.rotation.z) * dt * 5;
          if (h.clawRight) h.clawRight.rotation.z += (0 - h.clawRight.rotation.z) * dt * 5;
          if (h.scoopGroup) h.scoopGroup.rotation.x += (0 - h.scoopGroup.rotation.x) * dt * 5;
        }
      }
    }
  }

  #updatePose(rover) {
    const p = rover.physics;
    const S = this.visualScale;

    // Dimensi rover (meter) dari pusat ke roda sesuai skala visual
    // Rover model: panjang ~2.6m, lebar ~2.5m, radius ban 0.4m
    const halfL = 1.3 * S;
    const halfW = 1.25 * S;
    const sinH = Math.sin(p.heading);
    const cosH = Math.cos(p.heading);

    // 4 titik kontak roda dengan permukaan medan (koordinat projected East, North)
    const xFront = p.X + sinH * halfL;
    const yFront = p.Y + cosH * halfL;
    const xRear  = p.X - sinH * halfL;
    const yRear  = p.Y - cosH * halfL;

    const xRight = p.X + cosH * halfW;
    const yRight = p.Y - sinH * halfW;
    const xLeft  = p.X - cosH * halfW;
    const yLeft  = p.Y + sinH * halfW;

    // Sample elevasi di 4 titik roda dan di pusat
    const eFront  = p.sampleElevation(xFront, yFront);
    const eRear   = p.sampleElevation(xRear, yRear);
    const eRight  = p.sampleElevation(xRight, yRight);
    const eLeft   = p.sampleElevation(xLeft, yLeft);
    const eCenter = p.elevation;

    // Konversi ke koordinat world Three.js
    this.frame.toWorld(xFront, yFront, eFront, this._wFront);
    this.frame.toWorld(xRear,  yRear,  eRear,  this._wRear);
    this.frame.toWorld(xRight, yRight, eRight, this._wRight);
    this.frame.toWorld(xLeft,  yLeft,  eLeft,  this._wLeft);

    // Vektor Forward mengikuti kontur kemiringan longitudinal (Pitch)
    this._fwd.set(
      this._wFront.x - this._wRear.x,
      this._wFront.y - this._wRear.y,
      this._wFront.z - this._wRear.z
    ).normalize();

    // Vektor Right mengikuti kontur kemiringan lateral (Roll)
    this._right.set(
      this._wRight.x - this._wLeft.x,
      this._wRight.y - this._wLeft.y,
      this._wRight.z - this._wLeft.z
    ).normalize();

    // Vektor Normal tanah (Up) dari perkalian silang Right x Forward
    this._up.crossVectors(this._right, this._fwd).normalize();

    // Jaga agar sumbu orthogonal sempurna
    this._right.crossVectors(this._fwd, this._up).normalize();

    // Rotasi: kolom 0: right, kolom 1: up, kolom 2: -fwd (karena depan model menghadap -Z lokal)
    this._m4.makeBasis(this._right, this._up, this._fwd.clone().negate());
    rover.mesh.quaternion.setFromRotationMatrix(this._m4);

    // Elevasi kontak roda: gunakan elevasi maksimum kontak agar tidak pernah tenggelam
    const avgWheelElev = (eFront + eRear + eRight + eLeft) / 4;
    const finalElev = Math.max(eCenter, avgWheelElev);
    const w = this.frame.toWorld(p.X, p.Y, finalElev);

    // Naikkan rover sepanjang normal Up sebesar radius ban agar ban berdiri persis di atas permukaan
    const wheelOffset = 0.4 * S * 0.85;
    this._tempPos.set(w.x, w.y, w.z).addScaledVector(this._up, wheelOffset);
    rover.mesh.position.copy(this._tempPos);
  }

  #updateWheelAnimation(rover, dt) {
    const wheels = rover.mesh?.userData?.wheels;
    if (!wheels || !Array.isArray(wheels)) return;

    const p = rover.physics;
    const speed = p.speed || 0;
    const steer = p.steer || 0;
    const S = this.visualScale || 15;

    // Physical wheel radius on the 3D ground (rover is scaled by visualScale S)
    const effectiveRadius = 0.42 * S;

    // Rolling rotation: rolling forward towards -Z requires negative X rotation
    const dRoll = -(speed * dt) / effectiveRadius;

    // Corner-wheel Ackermann steering: max ~28 degrees (0.48 radians)
    // Negative steer turns front wheels to the right (+X)
    const targetSteerAngle = -steer * 0.48;

    const cosH = Math.cos(p.heading);
    const sinH = Math.sin(p.heading);

    for (let i = 0; i < wheels.length; i++) {
      const w = wheels[i];

      // 1. Roll spin group (all 6 wheels roll realistically based on speed & differential steering)
      const spinObj = w.spin || w.rotation;
      if (spinObj) {
        // Differential steering speed: outer wheels spin slightly faster on turns
        const diffMult = 1.0 + (steer * (w.side || 0) * 0.28);
        // Active pivot / skid steering roll when vehicle is turning in place
        const turnRoll = (Math.abs(speed) < 0.25 && Math.abs(steer) > 0.05)
          ? -(steer * (w.side || 1) * 2.2 * dt)
          : 0;
        spinObj.rotation.x = (spinObj.rotation.x + dRoll * diffMult + turnRoll) % (Math.PI * 2);
      }

      // 2. Corner wheels steering (Ackermann angle on front/rear, middle straight)
      const steerObj = w.steer || w.pivot;
      if (steerObj) {
        let steerTarget = 0;
        if (w.station === 'front') {
          steerTarget = targetSteerAngle;
        } else if (w.station === 'rear') {
          steerTarget = -targetSteerAngle;
        }
        steerObj.rotation.y += (steerTarget - steerObj.rotation.y) * Math.min(1, dt * 14);
      }

      // 3. Real Mars DEM Terrain Elevation Sampling & Physical Springs ("Per")
      // Calculate individual wheel location in projected terrain coordinates (East, North)
      const wEast = p.X + (cosH * w.x * S) - (sinH * w.z * S);
      const wNorth = p.Y - (sinH * w.x * S) - (cosH * w.z * S);

      const terrainH = p.sampleElevation(wEast, wNorth);
      const dx = wEast - p.X;
      const dy = wNorth - p.Y;
      const basePlaneH = p.elevation + (dx * (p.grad ? p.grad[0] : 0)) + (dy * (p.grad ? p.grad[1] : 0));
      const deltaH = terrainH - basePlaneH;

      // Convert terrain elevation delta to model units
      const rawDisp = THREE.MathUtils.clamp(deltaH / S, -0.14, 0.16);

      // High-frequency micro-rumble when rolling over Mars bedrock & regolith
      const isDriving = Math.abs(speed) > 0.08;
      const rumble = isDriving
        ? (Math.sin(this._animTime * 36 + i * 2.1) * 0.010 + Math.cos(this._animTime * 50 + i * 1.5) * 0.006) * Math.min(1, Math.abs(speed) / 4)
        : 0;

      const targetDisp = rawDisp + rumble;
      w.compression = (w.compression ?? 0) + (targetDisp - (w.compression ?? 0)) * Math.min(1, dt * 15);

      // Move wheel vertical suspension travel pivot
      if (w.pivot) {
        w.pivot.position.y = w.compression;
      }

      // Dynamic spring compression/rebound (3D coiled spring geometry)
      if (w.springCoil) {
        const restH = w.restSpringHeight || 0.22;
        const currentH = Math.max(0.06, Math.min(0.34, restH - w.compression));
        const scaleY = currentH / restH;
        w.springCoil.scale.set(1.0, scaleY, 1.0);
      }

      // Chrome shock damper piston sliding inside outer cylinder
      if (w.shockPiston) {
        w.shockPiston.position.y = 0.14 + w.compression * 0.35;
      }
    }

    // 4. Dynamic Rocker-Bogie Suspension Articulation
    const hooks = rover.mesh?.userData?.suspensionHooks;
    if (hooks && wheels.length >= 6) {
      // Wheels order: [FL, FR, ML, MR, RL, RR]
      const cFL = wheels[0].compression || 0;
      const cFR = wheels[1].compression || 0;
      const cML = wheels[2].compression || 0;
      const cMR = wheels[3].compression || 0;
      const cRL = wheels[4].compression || 0;
      const cRR = wheels[5].compression || 0;

      // Left side Rocker & Bogie pitch
      const leftRockerTarget = -((cFL - (cML + cRL) * 0.5) * 0.7);
      const leftBogieTarget = -((cML - cRL) * 0.65);

      // Right side Rocker & Bogie pitch
      const rightRockerTarget = -((cFR - (cMR + cRR) * 0.5) * 0.7);
      const rightBogieTarget = -((cMR - cRR) * 0.65);

      if (hooks.leftRocker) {
        hooks.leftRocker.rotation.x += (leftRockerTarget - hooks.leftRocker.rotation.x) * Math.min(1, dt * 8);
      }
      if (hooks.leftBogie) {
        hooks.leftBogie.rotation.x += (leftBogieTarget - hooks.leftBogie.rotation.x) * Math.min(1, dt * 8);
      }
      if (hooks.rightRocker) {
        hooks.rightRocker.rotation.x += (rightRockerTarget - hooks.rightRocker.rotation.x) * Math.min(1, dt * 8);
      }
      if (hooks.rightBogie) {
        hooks.rightBogie.rotation.x += (rightBogieTarget - hooks.rightBogie.rotation.x) * Math.min(1, dt * 8);
      }
      if (hooks.diffBar) {
        const diffTilt = (leftRockerTarget - rightRockerTarget) * 0.45;
        hooks.diffBar.rotation.z += (diffTilt - hooks.diffBar.rotation.z) * Math.min(1, dt * 8);
      }
    }
  }
}
