import * as THREE from 'three';
import { Cosmos } from '../cosmos/Cosmos.js';
import { World } from '../world/World.js';
import { BigBangScene } from './BigBangScene.js';
import { SystemScene } from './SystemScene.js';
import { OrbitScene } from '../scenes/OrbitScene.js';
import { SurfaceScene } from '../scenes/SurfaceScene.js';
import { Timeline } from './Timeline.js';

// The trailer. ~90 seconds that explain what this place is: a documentary
// generated live from a seed, real physics narrated as it happens, worlds,
// weather, wildlife — and where it is going: personal, character-driven series.
//
// It runs on one fixed showcase seed (chosen for having land, trees, a herd
// and a flock) so the trailer is always gorgeous — while the narration makes
// the real point: refresh, and none of this happens the same way twice.

const SHOWCASE_SEED = 'verdant'; // temperate, landable, trees, two herds and a flock

const ss = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function buildTeaserScript() {
  const cues = [];
  const say = (text, opts = {}) => cues.push({ text, ...opts });

  say('Nothing you are about to see was filmed, drawn, or recorded. All of it is generated — right now, in front of you — from a single seed.',
    { scene: 'tz-big', direct: { phase: 'point' }, hold: 7 });

  say('This is that seed’s universe, being born.',
    { direct: { phase: 'bang' }, hold: 6 });

  say('Every universe starts with the same two ingredients. What happens next is real physics — fusion, supernovae, the forging of the periodic table — computed, and narrated, as it happens.',
    { direct: { phase: 'nucleosynthesis' }, hold: 8 });

  say('Gravity gathers the wreckage — and a star ignites.',
    { direct: { phase: 'firststars' }, hold: 12 });

  say('Around it, worlds condense. And chemistry decides — honestly — which of them can hold life.',
    { scene: 'tz-sys', direct: { phase: 'condense' }, hold: 8 });

  say('Refresh the page, and none of this happens the same way twice. A different star. Different elements. Different worlds. A new documentary, every time.',
    { scene: 'tz-orbit', hold: 10 });

  say('And where the chemistry allows it — land. Air. Water.',
    { scene: 'tz-surface', direct: { shot: 'descend' }, hold: 10 });

  say('Life — its bodies shaped by this world’s own gravity, its air, and its cold.',
    { direct: { shot: 'creatures' }, hold: 10 });

  say('And this is where it is going: your seed becomes your universe. Its creatures become its characters. Their lives become your series — friendships, days at the shore, stories that generate while you are away, and are waiting when you come back.',
    { direct: { shot: 'creatures2' }, hold: 12 });

  say('The Worlds. Enter a seed. Begin yours.',
    { direct: { card: true }, hold: 7 });

  return { cues };
}

export class Teaser {
  /**
   * @param {import('../core/Stage.js').Stage} stage
   * @param {import('./Narrator.js').Narrator} narrator
   * @param {{ onCard?: (show: boolean) => void }} hooks
   */
  constructor(stage, narrator, hooks = {}) {
    this.stage = stage;
    this.narrator = narrator;
    this.hooks = hooks;
    this.built = false;
    this.timeline = null;
    this._t = 0;
    this._shot = null;
    this._shotT = 0;
  }

  /** Construct the showcase universe and its four stages. Slow — call behind a loading state. */
  build() {
    if (this.built) return;
    const cosmos = new Cosmos(SHOWCASE_SEED);
    this.world = new World(SHOWCASE_SEED);

    this.scenes = {
      'tz-big': new BigBangScene(cosmos),
      'tz-sys': new SystemScene(cosmos),
      'tz-orbit': new OrbitScene(this.world, { interactive: false }),
      'tz-surface': new SurfaceScene(this.world, { cinematic: true }),
    };
    for (const [name, scene] of Object.entries(this.scenes)) this.stage.register(name, scene);

    // The surface takes seconds to mesh and grow trees. Warm it now, while the
    // trailer's opening minutes are still in space, so the cut to ground is a
    // cut and not a stall.
    this._prewarm = this.scenes['tz-surface'].enter().catch((err) => {
      console.warn('[teaser] surface prewarm failed:', err);
      this._surfaceDead = true;
    });

    const script = buildTeaserScript();
    this.timeline = new Timeline(script, this.narrator, (cue) => this._direct(cue));
    this.built = true;
  }

  async _direct(cue) {
    if (cue.scene) {
      // An unlandable showcase world would have been caught when the seed was
      // chosen; if the surface still failed, stay in orbit rather than crash.
      const name = cue.scene === 'tz-surface' && this._surfaceDead ? 'tz-orbit' : cue.scene;
      if (name === 'tz-surface') await this._prewarm;
      await this.stage.activate(name);
      this._sceneName = name;
      this._t = 0;
      if (name === 'tz-orbit') this._driveOrbit();
    }
    const dir = cue.direct;
    if (!dir) return;
    if (dir.phase) this.stage.active.setPhase?.(dir.phase);
    if (dir.shot && !this._surfaceDead) this._driveSurface(dir.shot);
    if (dir.card) this.hooks.onCard?.(true);
  }

  /** A slow, wide drift around the living world. */
  _driveOrbit() {
    const scene = this.scenes['tz-orbit'];
    const r = this.world.radius;
    let t = 0;
    scene.cameraDriver = (camera, dt) => {
      t += dt;
      const az = 0.55 + t * 0.045;
      const dist = r * 3.4 - ss(0, 14, t) * r * 0.9; // slow push-in
      camera.position.set(Math.sin(az) * dist, r * 0.5 + Math.sin(t * 0.1) * r * 0.12, Math.cos(az) * dist);
      camera.lookAt(0, 0, 0);
    };
  }

  /** Scripted surface shots: the descent, then the creatures. */
  _driveSurface(shot) {
    const scene = this.scenes['tz-surface'];
    const ground = (x, z) => scene.surface.heightAt(x, z);
    this._shot = shot;
    let t = 0;

    if (shot === 'descend') {
      // Glide down out of the sky toward the landing site, ending at eye level
      // looking across the terrain toward the sun.
      const sunDir = scene.sunDirection;
      scene.cameraDriver = (camera, dt) => {
        t += dt;
        const k = ss(0, 12, t);
        const x = -650 * (1 - k);
        const z = -650 * (1 - k);
        const yPath = ground(x, z) + 3 + (1 - k) * 220;
        camera.position.set(x, Math.max(yPath, ground(x, z) + 2.2), z);
        const lx = x + sunDir.x * 400, lz = z + sunDir.z * 400;
        camera.lookAt(lx, ground(0, 0) + 24 + (1 - k) * 60, lz);
      };
      return;
    }

    // Creature shots: find something alive to film. Prefer a ground band (herd,
    // swarm, solitary); fall back to a flock; fall back to a slow pan.
    const pops = scene.fauna?.populations ?? [];
    const groundPop = pops.find((p) => p.genome.domain !== 'air');
    const airPop = pops.find((p) => p.genome.domain === 'air');
    const target = groundPop ?? airPop;

    if (!target) {
      scene.cameraDriver = (camera, dt) => {
        t += dt;
        const az = t * 0.03;
        const x = Math.sin(az) * 60, z = Math.cos(az) * 60;
        camera.position.set(x, ground(x, z) + 4, z);
        camera.lookAt(Math.sin(az + 0.5) * 400, ground(0, 0) + 30, Math.cos(az + 0.5) * 400);
      };
      return;
    }

    const centre = new THREE.Vector3();
    const second = shot === 'creatures2';
    scene.cameraDriver = (camera, dt) => {
      t += dt;
      // Follow the group's live centre — they amble, the camera ambles with them.
      centre.set(0, 0, 0);
      for (const a of target.agents) centre.add(a.pos);
      centre.divideScalar(Math.max(1, target.agents.length));

      const az = (second ? 2.2 : 0.4) + t * (second ? -0.05 : 0.06);
      const dist = second ? 20 : 34 - ss(0, 10, t) * 8;
      const x = centre.x + Math.sin(az) * dist;
      const z = centre.z + Math.cos(az) * dist;
      const eye = target.genome.domain === 'air'
        ? centre.y - 6 // look up at the flock
        : ground(x, z) + (second ? 2.2 : 5);
      camera.position.set(x, Math.max(eye, ground(x, z) + 2), z);
      camera.lookAt(centre.x, centre.y + (target.genome.domain === 'air' ? 0 : 1.2), centre.z);
    };
  }

  play() {
    return this.timeline.play();
  }

  stop() {
    this.timeline?.stop();
    this.hooks.onCard?.(false);
  }

  dispose() {
    if (!this.built) return;
    for (const [name, scene] of Object.entries(this.scenes)) {
      this.stage.scenes.delete(name);
      scene.dispose?.();
    }
    if (this.stage.active && Object.values(this.scenes).includes(this.stage.active)) {
      this.stage.active = null;
    }
    this.built = false;
  }
}
