import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// The stage owns the renderer, the composer and the clock. Scenes plug into it.
//
// The loop advances simulation on a FIXED timestep and renders whatever the
// accumulator lands on. That costs a little smoothness versus a variable step,
// and buys the thing that matters for a movie: the same seed plus the same frame
// number always produces the same image, whether it ran at 144 fps on this
// machine or one frame per second while writing PNGs to disk.

const FIXED_STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 5; // don't spiral after a tab-switch stall

export class Stage {
  constructor(container = document.body) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.2, // strength
      0.5, // radius
      0.0, // threshold
    );
    this.output = new OutputPass();

    this.scenes = new Map();
    this.active = null;

    this.frame = 0;
    this.elapsed = 0;
    this._accumulator = 0;
    this._lastTime = null;
    this._running = false;

    this._onResize = () => this.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', this._onResize);
  }

  /**
   * @param {string} name
   * @param {object} scene - must expose { scene, camera, update(dt, elapsed) }
   *   and may expose enter(), exit(), resize(w, h), dispose()
   */
  register(name, scene) {
    this.scenes.set(name, scene);
    return scene;
  }

  async activate(name) {
    const next = this.scenes.get(name);
    if (!next) throw new Error(`No scene registered as "${name}"`);
    if (this.active === next) return next;

    await this.active?.exit?.();
    this.active = next;
    await next.enter?.();

    this._rebuildPasses(next);
    this.resize(window.innerWidth, window.innerHeight);
    // A scene change is a cut: reset the clock so the new scene's first frame is
    // frame 0 of that shot rather than inheriting the previous scene's time.
    this.elapsed = 0;
    this.frame = 0;
    this._accumulator = 0;
    this._lastTime = null;
    return next;
  }

  _rebuildPasses(scene) {
    this.composer.passes.length = 0;
    this.composer.addPass(new RenderPass(scene.scene, scene.camera));
    const bloomSettings = scene.bloom;
    if (bloomSettings !== false) {
      if (bloomSettings) {
        this.bloom.strength = bloomSettings.strength ?? 0.2;
        this.bloom.radius = bloomSettings.radius ?? 0.5;
        this.bloom.threshold = bloomSettings.threshold ?? 0.0;
      }
      this.composer.addPass(this.bloom);
    }
    this.composer.addPass(this.output);
  }

  resize(width, height) {
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.bloom.setSize(width, height);

    const cam = this.active?.camera;
    if (cam?.isPerspectiveCamera) {
      cam.aspect = width / height;
      cam.updateProjectionMatrix();
    }
    this.active?.resize?.(width, height);
  }

  start() {
    if (this._running) return;
    this._running = true;

    const tick = (now) => {
      if (!this._running) return;
      this._raf = requestAnimationFrame(tick);
      this._lastTick = performance.now();
      this._step(now);
    };
    this._raf = requestAnimationFrame(tick);

    // rAF stops dead in a hidden or backgrounded tab. For a normal page that's
    // a battery feature; for a movie set that gets driven by tooling (offscreen
    // panes, headless capture) it means "the app hung". This watchdog notices
    // rAF going quiet and keeps the loop breathing at ~10 fps until visibility
    // returns — enough for automation to see a live scene, cheap enough to not
    // matter.
    this._lastTick = performance.now();
    this._watchdog = setInterval(() => {
      if (!this._running) return;
      const now = performance.now();
      if (now - this._lastTick > 250) this._step(now);
    }, 100);
  }

  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._watchdog) clearInterval(this._watchdog);
  }

  _step(now) {
    const seconds = now / 1000;
    if (this._lastTime === null) this._lastTime = seconds;
    const wallDelta = Math.min(seconds - this._lastTime, 0.25);
    this._lastTime = seconds;

    this._accumulator += wallDelta;
    let steps = 0;
    while (this._accumulator >= FIXED_STEP && steps < MAX_STEPS_PER_FRAME) {
      this.active?.update?.(FIXED_STEP, this.elapsed);
      this.elapsed += FIXED_STEP;
      this._accumulator -= FIXED_STEP;
      this.frame++;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) this._accumulator = 0; // drop the backlog

    this.composer.render();
  }

  /**
   * Advance exactly one fixed step and render. Used by the offline frame writer,
   * where wall-clock time is meaningless and every frame must be deterministic.
   */
  stepOnce() {
    this.active?.update?.(FIXED_STEP, this.elapsed);
    this.elapsed += FIXED_STEP;
    this.frame++;
    this.composer.render();
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    for (const scene of this.scenes.values()) scene.dispose?.();
    this.composer.dispose?.();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export { FIXED_STEP };
