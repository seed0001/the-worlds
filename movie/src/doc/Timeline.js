// Plays a generated script: speak a cue, tell the director what to show, wait,
// advance. It owns sequence and timing; it knows nothing about three.js. The
// director callback is the seam — it receives each cue's `scene` and `direct`
// and is responsible for making the right thing appear.

export class Timeline {
  /**
   * @param {object} script - from buildEpisode1Script
   * @param {import('./Narrator.js').Narrator} narrator
   * @param {(cue: object, index: number) => (void|Promise)} director - stages visuals
   */
  constructor(script, narrator, director) {
    this.script = script;
    this.narrator = narrator;
    this.director = director;
    this.index = -1;
    this.playing = false;
    this._paused = false;
    this._resumeSignal = null;
    this.onAdvance = null; // (index, cue) -> void, for progress UI
  }

  async play() {
    if (this.playing) return;
    this.playing = true;

    for (let i = 0; i < this.script.cues.length; i++) {
      if (!this.playing) break;
      this.index = i;
      const cue = this.script.cues[i];

      // Stage the visuals for this beat before the words land on them.
      await this.director?.(cue, i);
      this.onAdvance?.(i, cue);

      await this.narrator.speak(cue.text, cue.hold ?? 0);
      await this._waitIfPaused();
    }

    this.playing = false;
    this.onComplete?.();
  }

  _waitIfPaused() {
    if (!this._paused) return Promise.resolve();
    return new Promise((resolve) => { this._resumeSignal = resolve; });
  }

  pause() {
    this._paused = true;
    this.narrator.cancel();
  }

  resume() {
    this._paused = false;
    this._resumeSignal?.();
    this._resumeSignal = null;
  }

  stop() {
    this.playing = false;
    this._paused = false;
    this.narrator.cancel();
    this._resumeSignal?.();
  }
}
