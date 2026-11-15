// Rover kinematics on the real heightfield + procedural region relief.
// Independent of three.js rendering.
// heading: radians clockwise from north (east = sin, north = cos).
export class RoverPhysics {
  constructor(heightfield, opts, reliefSampler = null) {
    this.hf = heightfield;
    this.opts = opts;
    this.reliefSampler = reliefSampler;
    this.X = 0;
    this.Y = 0;
    this.heading = 0;
    this.speed = 0;
    this.throttle = 0;
    this.steer = 0;
    this.elevation = 0;
    this.slopeDeg = 0;
    this.grad = [0, 0];
    this.status = 'idle';
  }

  setReliefSampler(fn) {
    this.reliefSampler = fn;
    this.#sense();
  }

  /**
   * Samples total elevation at projected coordinates (X, Y)
   * combining base NASA Jezero DEM + procedural geological relief.
   */
  sampleElevation(X, Y) {
    let el = this.hf.sample(X, Y);
    if (this.reliefSampler) {
      el += this.reliefSampler(X, Y);
    }
    return el;
  }

  setPosition(X, Y, heading = this.heading) {
    this.X = X;
    this.Y = Y;
    this.heading = heading;
    this.speed = 0;
    this.#sense();
    this.status = 'idle';
  }

  #sense() {
    this.elevation = this.sampleElevation(this.X, this.Y);
    // Gradient calculated over a small 10m baseline for realistic local slope
    const e = 10;
    const gx = (this.sampleElevation(this.X + e, this.Y) - this.sampleElevation(this.X - e, this.Y)) / (2 * e);
    const gy = (this.sampleElevation(this.X, this.Y + e) - this.sampleElevation(this.X, this.Y - e)) / (2 * e);
    this.grad = [gx, gy];
    this.slopeDeg = Math.atan(Math.hypot(gx, gy)) * 180 / Math.PI;
  }

  /**
   * input: { throttle: -1..1, steer: -1..1 (+ = turn right), sprint: boolean }
   */
  step(dt, { throttle = 0, steer = 0, sprint = false } = {}) {
    this.throttle = throttle;
    this.steer = steer;
    const o = this.opts;
    const speedMult = sprint ? 1.5 : 1.0;
    const target = throttle * o.maxSpeed * speedMult;
    const accel = o.acceleration * (sprint ? 1.4 : 1.0);
    const dv = Math.max(-accel * dt, Math.min(accel * dt, target - this.speed));
    this.speed += dv;

    if (throttle === 0) this.speed *= Math.exp(-3.5 * dt);
    if (Math.abs(this.speed) < 0.01 && throttle === 0) this.speed = 0;
    this.heading += steer * o.turnRate * dt;

    let blocked = null;
    if (this.speed !== 0) {
      const s = Math.sin(this.heading), c = Math.cos(this.heading);
      const nx = this.X + s * this.speed * dt, ny = this.Y + c * this.speed * dt;
      if (!this.hf.inBounds(nx, ny)) {
        blocked = 'map edge';
      } else {
        const e = 10;
        const gx = (this.sampleElevation(nx + e, ny) - this.sampleElevation(nx - e, ny)) / (2 * e);
        const gy = (this.sampleElevation(nx, ny + e) - this.sampleElevation(nx, ny - e)) / (2 * e);
        const along = Math.atan(gx * s + gy * c) * 180 / Math.PI * Math.sign(this.speed);
        const effectiveLimit = sprint ? 85 : (o.maxSlopeDeg || 65);
        if (Math.abs(along) > effectiveLimit) {
          blocked = `slope ${Math.abs(along).toFixed(0)}° > ${effectiveLimit}° limit`;
        } else {
          this.X = nx;
          this.Y = ny;
        }
      }
      if (blocked) this.speed = 0;
    }
    this.#sense();
    this.status = blocked ? `blocked: ${blocked}` : (Math.abs(this.speed) > 0.05 ? 'driving' : 'idle');
  }
}
