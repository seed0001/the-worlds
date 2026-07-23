import * as THREE from 'three';

// The sky over the road. Same driveable sun as the Pyramids' sky — setTime(t)
// with 0 dawn, 0.25 noon, 0.5 dusk — plus two things this film needs:
//   setTint(color)    a per-state cast on the horizon (corn haze, red dirt,
//                     painted desert), lerped as the states change;
//   setPresent(bool)  the flash-forward light: washed, hazy, shadowless —
//                     the past is golden, the present is overcast documentary.

const SKY_VERT = /* glsl */`
varying vec3 vDir;
void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const SKY_FRAG = /* glsl */`
uniform vec3 top; uniform vec3 horizon; uniform vec3 sunColor; uniform vec3 sunDir; uniform float night; uniform float haze;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y*0.5+0.5, 0.0, 1.0);
  vec3 col = mix(horizon, top, pow(h, 0.6));
  float sun = max(0.0, dot(d, normalize(sunDir)));
  col += sunColor * (pow(sun, 320.0)*8.0*(1.0-haze*0.85) + pow(sun, 5.0)*0.4*(1.0-night)*(1.0-haze*0.6));
  col = mix(col, vec3(dot(col, vec3(0.299,0.587,0.114))), haze*0.35); // present: desaturate
  gl_FragColor = vec4(col, 1.0);
}`;

const DAY_TOP = new THREE.Color(0x4d8ccc), DAY_HZ = new THREE.Color(0xdcd2b4);
const DUSK_TOP = new THREE.Color(0x2c2a5e), DUSK_HZ = new THREE.Color(0xe8823e);
const NIGHT_TOP = new THREE.Color(0x04060f), NIGHT_HZ = new THREE.Color(0x0c1530);
const NOW_TOP = new THREE.Color(0x9fb0bd), NOW_HZ = new THREE.Color(0xd8dcda);

export class RoadSky {
  constructor(radius = 7000) {
    this.group = new THREE.Group();
    this.sunDir = new THREE.Vector3(1, 0.4, 0.3).normalize();
    this.present = 0;              // 0 = 1957, 1 = today; snaps on flash
    this.tint = new THREE.Color(0xdcd2b4);

    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: {
          top: { value: DAY_TOP.clone() }, horizon: { value: DAY_HZ.clone() },
          sunColor: { value: new THREE.Color(0xfff2d0) }, sunDir: { value: this.sunDir },
          night: { value: 0 }, haze: { value: 0 },
        },
        vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
      }),
    );
    this.group.add(this.sky);

    this.sun = new THREE.DirectionalLight(0xfff0d0, 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.near = 1; sc.far = 600; sc.left = -120; sc.right = 120; sc.top = 120; sc.bottom = -120;
    this.group.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xbcd0ee, 0x7a6a4c, 0.55);
    this.group.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0x3a3628, 0.5);
    this.group.add(this.ambient);

    this._time = 0.18;
    this.setTime(this._time);
  }

  setTint(color) { this.tint.set(color); this.setTime(this._time); }

  setPresent(on) {
    this.present = on ? 1 : 0;
    this.sky.material.uniforms.haze.value = this.present;
    this.sun.castShadow = !on;   // the present is flat: no golden shadows
    this.setTime(on ? 0.22 : this._time); // today is always a high, blank noon
    if (!on) this.setTime(this._time);
  }

  setTime(t) {
    if (!this.present) this._time = t;
    const ang = (t % 1) * Math.PI * 2;
    const e = Math.sin(ang);
    const az = Math.cos(ang);
    this.sunDir.set(az, e, 0.35).normalize();

    const u = this.sky.material.uniforms;
    const hzDay = DAY_HZ.clone().lerp(this.tint, 0.55);
    if (this.present) {
      u.top.value.copy(NOW_TOP); u.horizon.value.copy(NOW_HZ);
      u.night.value = 0;
    } else if (e >= 0.5) {
      // The warm band is wide on purpose: this film spends its first and last
      // chapters in low sun, and morning should LOOK like morning.
      u.top.value.copy(DAY_TOP); u.horizon.value.copy(hzDay);
      u.night.value = 0;
    } else if (e >= 0) {
      const k = e / 0.5;
      u.top.value.copy(DUSK_TOP).lerp(DAY_TOP, k);
      u.horizon.value.copy(DUSK_HZ).lerp(hzDay, k);
      u.night.value = (1 - k) * 0.45;
    } else {
      const k = THREE.MathUtils.clamp(-e / 0.3, 0, 1);
      u.top.value.copy(DUSK_TOP).lerp(NIGHT_TOP, k);
      u.horizon.value.copy(DUSK_HZ).lerp(NIGHT_HZ, k);
      u.night.value = 0.45 + k * 0.55;
    }

    const warm = new THREE.Color(0xfff2d0).lerp(new THREE.Color(0xff8438), THREE.MathUtils.clamp(1 - e / 0.4, 0, 1));
    u.sunColor.value.copy(this.present ? new THREE.Color(0xeef0ee) : warm);
    this.sun.color.copy(this.present ? new THREE.Color(0xdfe4e6) : warm);
    // Keep a floor under the low-sun intensity: dusk should glow, not gutter.
    this.sun.intensity = this.present ? 1.3 : Math.max(0, e) * 2.2 + (e > 0 ? 0.5 : 0.05);
    this.sun.position.copy(this.sunDir).multiplyScalar(400);
    this.sun.target.position.set(0, 0, 0);

    this.hemi.intensity = this.present ? 1.15 : 0.38 + Math.max(0, e) * 0.45;
    this.ambient.intensity = this.present ? 0.75 : 0.34 + Math.max(0, e) * 0.24;
  }

  follow(cam) { this.sky.position.copy(cam.position); }

  dispose() {
    this.sky.geometry.dispose(); this.sky.material.dispose();
  }
}
