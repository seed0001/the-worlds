// Voice and captions.
//
// The narrator's voice is Microsoft Andrew (a neural voice). Only Edge exposes
// Andrew through the browser's speechSynthesis API, so instead of relying on
// that, each line is fetched as MP3 from the dev server's /api/tts endpoint,
// which synthesises it with Andrew directly (see vite.config.js). If that
// fails (offline, endpoint missing), the browser's own speech synthesis is the
// fallback. Either way, audio is flaky by nature and a documentary cannot just
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
    this._audio = null; // the <audio> currently playing an /api/tts line
    this._ttsDown = false; // stop hitting the endpoint after it fails once
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

      // Resolve on the LATER of speech-end and the reading budget, so a very
      // fast voice can't outrun the caption. The timer handles the budget; if
      // speech runs long, onSpeechEnd extends past it.
      const onSpeechEnd = () => setTimeout(done, 250);

      if (this.muted) return; // the timer still paces the caption

      this._speakAndrew(text, onSpeechEnd).then((started) => {
        if (!started && !settled && !this._cancelled) {
          this._speakFallback(text, onSpeechEnd);
        }
      });
    });
  }

  /**
   * Play this line in the Andrew voice, fetched from the dev server's
   * /api/tts endpoint. Resolves true if playback was started (or the line
   * became moot), false if the endpoint is unavailable and the browser's own
   * speech synthesis should take over.
   */
  async _speakAndrew(text, onEnded) {
    if (this._ttsDown) return false;
    let blob;
    try {
      const r = await fetch('/api/tts?text=' + encodeURIComponent(text));
      if (!r.ok) throw new Error(`tts endpoint: ${r.status}`);
      blob = await r.blob();
    } catch (err) {
      this._ttsDown = true;
      console.warn('[narrator] Andrew TTS unavailable, using browser voice:', err);
      return false;
    }
    if (this._cancelled || this.muted) return true;
    const audio = new Audio(URL.createObjectURL(blob));
    this._audio = audio;
    const cleanup = () => {
      URL.revokeObjectURL(audio.src);
      if (this._audio === audio) this._audio = null;
    };
    audio.onended = () => {
      cleanup();
      onEnded();
    };
    audio.onerror = cleanup; // the timer still guarantees progress
    try {
      await audio.play();
    } catch {
      cleanup(); // e.g. autoplay policy; the fallback would be blocked too
    }
    return true;
  }

  /** The browser's built-in speech synthesis, with whatever voice it has. */
  _speakFallback(text, onEnded) {
    if (!this.synth || !this.enabled || !this.voice) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = this.voice;
      u.rate = 0.94;
      u.pitch = 1.0;
      u.onend = onEnded;
      u.onerror = () => {}; // the timer still guarantees progress
      this.synth.cancel();
      this.synth.speak(u);
    } catch {
      /* timer covers it */
    }
  }

  /** A silent, timed gap (scene breathing room between spoken beats). */
  pause(seconds) {
    return new Promise((r) => setTimeout(r, seconds * 1000));
  }

  _stopAudio() {
    if (this._audio) {
      this._audio.pause();
      URL.revokeObjectURL(this._audio.src);
      this._audio = null;
    }
  }

  cancel() {
    this._cancelled = true;
    this._stopAudio();
    this.synth?.cancel();
  }

  setMuted(muted) {
    this.muted = muted;
    if (muted) {
      this._stopAudio();
      this.synth?.cancel();
    }
  }
}
