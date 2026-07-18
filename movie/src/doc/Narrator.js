// Voice and captions.
//
// The browser's built-in speech synthesis does the talking — in Edge that means
// Microsoft's natural neural voices, at no cost and with nothing to install. But
// speech synthesis is famously flaky (voices load late, some environments have
// none, autoplay policies mute it until a click), and a documentary cannot just
// stop if the voice fails. So every spoken line is really a race:
//
//     finish speaking   OR   a time budget estimated from the word count
//
// whichever comes first. With a voice, the captions track real speech. Without
// one, the captions still march at a natural reading pace and the film plays on,
// silent but intact. The visuals never wait on the audio.

const WORDS_PER_SECOND = 2.6; // unhurried documentary read

export class Narrator {
  /** @param {(text: string) => void} onCaption - render a caption line */
  constructor(onCaption) {
    this.onCaption = onCaption;
    this.synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
    this.voice = null;
    this.enabled = !!this.synth;
    this.muted = false;
    this._cancelled = false;
    if (this.synth) this._pickVoice();
  }

  _pickVoice() {
    const choose = () => {
      const voices = this.synth.getVoices();
      if (!voices.length) return;
      // Prefer Microsoft's Andrew voice; fall back to an English
      // natural/neural voice, then the first English one, then whatever exists.
      const score = (v) => {
        let s = 0;
        if (/andrew/i.test(v.name)) s += 10;
        if (/en[-_]/i.test(v.lang)) s += 4;
        if (/natural|neural|online/i.test(v.name)) s += 3;
        if (/^en-US/i.test(v.lang)) s += 1;
        return s;
      };
      this.voice = [...voices].sort((a, b) => score(b) - score(a))[0] ?? null;
      if (this.voice) console.info(`[narrator] voice: ${this.voice.name}`);
    };
    choose();
    // Voices frequently aren't ready on first call.
    this.synth.onvoiceschanged = choose;
  }

  /**
   * Speak one line and resolve when it's done — or when the reading-time budget
   * elapses, whichever is longer. Always shows the caption immediately.
   * @param {string} text
   * @param {number} holdSeconds - minimum dwell even if speech ends early
   */
  speak(text, holdSeconds = 0) {
    this._cancelled = false;
    this.onCaption?.(text);

    const words = text.trim().split(/\s+/).length;
    const readingBudget = Math.max(holdSeconds, words / WORDS_PER_SECOND + 0.8);

    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      };

      // The hard floor: never advance before the caption has had time to be read
      // (and, if speaking, roughly time to be said). Cushioned past speech end.
      const timer = setTimeout(done, readingBudget * 1000);

      if (this.synth && this.enabled && !this.muted && this.voice) {
        try {
          const u = new SpeechSynthesisUtterance(text);
          u.voice = this.voice;
          u.rate = 0.94;
          u.pitch = 1.0;
          // Resolve on the LATER of speech-end and the reading budget, so a very
          // fast voice can't outrun the caption. The timer handles the budget;
          // if speech runs long, onend extends past it.
          u.onend = () => {
            if (readingBudget * 1000 <= 0) done();
            else setTimeout(done, 250);
          };
          u.onerror = () => {}; // the timer still guarantees progress
          this.synth.cancel();
          this.synth.speak(u);
        } catch {
          /* timer covers it */
        }
      }
    });
  }

  /** A silent, timed gap (scene breathing room between spoken beats). */
  pause(seconds) {
    return new Promise((r) => setTimeout(r, seconds * 1000));
  }

  cancel() {
    this._cancelled = true;
    this.synth?.cancel();
  }

  setMuted(muted) {
    this.muted = muted;
    if (muted) this.synth?.cancel();
  }
}
