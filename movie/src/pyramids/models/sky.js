import * as THREE from 'three';

// A desert sky with a sun that can be driven around the clock — the engine's
// time-lapse depends on it. setTime(t) takes a time of day in [0,1): 0 is dawn,
// 0.25 noon, 0.5 dusk, 0.75 midnight. It moves the sun, recolours the dome from
// pale desert blue through sunset orange to a starred night, and drives a
// directional light the scenes light everything with. Spin t fast and days blur
// past; that blur is the years going by as the pyramids rise.

const SKY_VERT = /* glsl */`
varying vec3 vDir;
void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const SKY_FRAG = /* glsl */`
uniform vec3 top; uniform vec3 horizon; uniform vec3 sunColor; uniform vec3 sunDir; uniform float night;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y*0.5+0.5, 0.0, 1.0);
  vec3 col = mix(horizon, top, pow(h, 0.65));
  float sun = max(0.0, dot(d, normalize(sunDir)));
  col += sunColor * (pow(sun, 350.0)*8.0 + pow(sun, 6.0)*0.35*(1.0-night));
  gl_FragColor = vec4(col, 1.0);
}`;

const DAY_TOP = new THREE.Color(0x5b93cf), DAY_HZ = new THREE.Color(0xe6d3ac);
const DUSK_TOP = new THREE.Color(0x2a2f63), DUSK_HZ = new THREE.Color(0xe58a3c);
const NIGHT_TOP = new THREE.Color(0x04060f), NIGHT_HZ = new THREE.Color(0x0b1630);

export class DesertSky {
  constructor(radius = 6000) {
    this.group = new THREE.Group();
    this.sunDir = new THREE.Vector3(1, 0.2, 0.3).normalize();

    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: {
          top: { value: DAY_TOP.clone() }, horizon: { value: DAY_HZ.clone() },
          sunColor: { value: new THREE.Color(0xfff2d0) }, sunDir: { value: this.sunDir },
          night: { value: 0 },
        },
        vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
      }),
    );
    this.group.add(this.sky);

    this.stars = starField(1400, radius * 0.9);
    this.stars.material.opacity = 0;
    this.group.add(this.stars);

    this.sun = new THREE.DirectionalLight(0xfff0d0, 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.near = 1; sc.far = 900; sc.left = -260; sc.right = 260; sc.top = 260; sc.bottom = -260;
    this.group.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xbcd0ee, 0x6b5a3c, 0.55);
    this.group.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0x3a3320, 0.5);
    this.group.add(this.ambient);

    this.setTime(0.15);
  }

  setTime(t) {
    const ang = (t % 1) * Math.PI * 2;
    const e = Math.sin(ang);                 // elevation: +1 noon, 0 horizon, -1 midnight
    const az = Math.cos(ang);
    this.sunDir.set(az, e, 0.3).normalize();

    const u = this.sky.material.uniforms;
    if (e >= 0.32) {                          // full day
      u.top.value.copy(DAY_TOP); u.horizon.value.copy(DAY_HZ);
      u.night.value = 0;
    } else if (e >= 0) {                       // sunrise / sunset
      const k = e / 0.32;
      u.top.value.copy(DUSK_TOP).lerp(DAY_TOP, k);
      u.horizon.value.copy(DUSK_HZ).lerp(DAY_HZ, k);
      u.night.value = (1 - k) * 0.4;
    } else {                                   // night
      const k = THREE.MathUtils.clamp(-e / 0.3, 0, 1);
      u.top.value.copy(DUSK_TOP).lerp(NIGHT_TOP, k);
      u.horizon.value.copy(DUSK_HZ).lerp(NIGHT_HZ, k);
      u.night.value = 0.4 + k * 0.6;
    }

    // Sun colour warms toward the horizon; light fades out at night.
    const warm = new THREE.Color(0xfff2d0).lerp(new THREE.Color(0xff8a3a), THREE.MathUtils.clamp(1 - e / 0.4, 0, 1));
    u.sunColor.value.copy(warm);
    this.sun.color.copy(warm);
    this.sun.intensity = Math.max(0, e) * 2.8 + 0.05;
    this.sun.position.copy(this.sunDir).multiplyScalar(500);
    this.sun.target.position.set(0, 0, 0);

    this.hemi.intensity = 0.2 + Math.max(0, e) * 0.6;
    this.ambient.intensity = 0.25 + Math.max(0, e) * 0.35;
    this.stars.material.opacity = THREE.MathUtils.clamp(-e * 2.2, 0, 0.95);
  }

  // Keep the dome centred on the camera so it reads as infinitely far.
  follow(cam) {
    this.sky.position.copy(cam.position);
    this.stars.position.copy(cam.position);
  }

  dispose() {
    this.sky.geometry.dispose(); this.sky.material.dispose();
    this.stars.geometry.dispose(); this.stars.material.dispose();
  }
}

function starField(count, radius) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(th) * r * radius;
    pos[i * 3 + 1] = Math.abs(u) * radius;
    pos[i * 3 + 2] = Math.sin(th) * r * radius;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xdfe8ff, size: radius * 0.0014, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false,
  }));
}
