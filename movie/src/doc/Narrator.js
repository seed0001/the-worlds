// Voice and captions.
//
// The narrator's voice is Microsoft Andrew (a neural voice). Only Edge exposes
// Andrew through the browser's speechSynthesis API, so instead of relying on
// that, each line is fetched as MP3 from the dev server's /api/tts endpoint,
// which synthesises it with Andrew directly (see vite.config.js). If that
// fails (offline, endpoint missing), the browser's own speech synthesis is the
// fallback.
//
// Timing: a line is over when its voice actually finishes. The next line never
// starts while the previous one is still speaking — and as a backstop, every
// new line silences whatever might somehow still be playing. A cue's `hold` is
// a minimum dwell on top of that. The word-count reading estimate now serves
// only two purposes: pacing the captions when there is no voice at all (muted,
// or every voice failed), and sizing a generous safety cap so a hung audio
// element can never freeze the documentary.

const WORDS_PER_SECOND = 2.6; // unhurried documentary read
const BREATH = 0.25; // small gap after a voice finishes, before the next line
const FETCH_GRACE = 4; // cap allowance while the MP3 is still being fetched
const CAP_SLACK = 5; // how far past the known audio length the cap sits

export class Narrator {
  /**
   * @param {(text: string) => void} onCaption - render a caption line
   * @param {{ voice?: string, prefer?: RegExp }} [opts]
   *   voice  - the /api/tts neural voice id (e.g. 'en-GB-SoniaNeural'); the
   *            server validates it against an allowlist. Omit for Episode 1's
   *            Andrew. `prefer` biases the browser-speech fallback toward a
   *            matching voice (e.g. a female British one) when the endpoint is
   *            unavailable.
   */
  constructor(onCaption, { voice = null, prefer = null } = {}) {
    this.onCaption = onCaption;
    this.ttsVoice = voice; // neural voice requested from /api/tts
    this._prefer = prefer; // fallback-voice bias
    this.synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
    this.voice = null;
    this.enabled = !!this.synth;
    this.muted = false;
    this._cancelled = false;
    this._audio = null; // the <audio> currently playing an /api/tts line
    this._ttsDown = false; // stop hitting the endpoint after it fails once
    this._onLineDone = null; // lets cancel() release a line that is mid-speak
    if (this.synth) this._pickVoice();
  }

  _pickVoice() {
    const choose = () => {
      const voices = this.synth.getVoices();
      if (!voices.length) return;
      // Prefer Microsoft's Andrew voice; fall back to an English
      // natural/neural voice, then the first English one, then whatever exists.
      const prefer = this._prefer;
      const score = (v) => {
        let s = 0;
        // When a specific register is asked for (e.g. Episode 2's female British
        // voice), bias hardest toward it; otherwise prefer Andrew.
        if (prefer && prefer.test(v.name)) s += 12;
        if (prefer && prefer.test(v.lang)) s += 6;
        if (!prefer && /andrew/i.test(v.name)) s += 10;
        if (/en[-_]/i.test(v.lang)) s += 4;
        if (/natural|neural|online/i.test(v.name)) s += 3;
        if (!prefer && /^en-US/i.test(v.lang)) s += 1;
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
   * Speak one line and resolve when the voice has actually finished — never
   * earlier (except via cancel), so lines can never talk over each other.
   * Always shows the caption immediately.
   * @param {string} text
   * @param {number} holdSeconds - minimum dwell even if speech ends early
   */
  speak(text, holdSeconds = 0) {
    this._cancelled = false;
    // Backstop: a new line always silences anything still speaking.
    this._stopAudio();
    this.synth?.cancel();
    this.onCaption?.(text);

    const words = text.trim().split(/\s+/).length;
    const readingEstimate = words / WORDS_PER_SECOND + 0.8;
    const silentBudget = Math.max(holdSeconds, readingEstimate);
    const startedAt = Date.now();

    return new Promise((resolve) => {
      let settled = false;
      let capTimer = null;
      const done = (skipDwell = false) => {
        if (settled) return;
        settled = true;
        clearTimeout(capTimer);
        this._onLineDone = null;
        // Honour the cue's minimum dwell even if the voice finished early.
        const dwellLeft = skipDwell
          ? 0
          : Math.max(0, holdSeconds * 1000 - (Date.now() - startedAt));
        setTimeout(resolve, dwellLeft);
      };
      const setCap = (seconds) => {
        clearTimeout(capTimer);
        capTimer = setTimeout(done, seconds * 1000);
      };
      this._onLineDone = () => done(true);

      // No voice at all: the reading estimate paces the captions.
      if (this.muted) {
        setCap(silentBudget);
        return;
      }

      const onSpeechEnd = () => setTimeout(() => done(), BREATH * 1000);

      // Until real audio starts, the cap covers the fetch plus a full silent
      // read, so a dead endpoint can never stall the film.
      setCap(silentBudget + FETCH_GRACE);

      this._speakAndrew(text, onSpeechEnd, (duration) => {
        // Audio is genuinely playing: the line now ends when the audio does.
        // The cap only exists so a hung element can't freeze the documentary.
        const known = Number.isFinite(duration) && duration > 0 ? duration : readingEstimate;
        setCap(Math.max(known, readingEstimate) + CAP_SLACK);
      }).then((started) => {
        if (settled || this._cancelled) return;
        if (!started) {
          setCap(silentBudget + CAP_SLACK);
          this._speakFallback(text, onSpeechEnd);
        }
      });
    });
  }

  /**
   * Play this line in the Andrew voice, fetched from the dev server's
   * /api/tts endpoint. Resolves true if playback was started (or the line
   * became moot), false if the endpoint is unavailable and the browser's own
   * speech synthesis should take over. Calls onStarted(durationSeconds) the
   * moment real playback begins.
   */
  async _speakAndrew(text, onEnded, onStarted) {
    if (this._ttsDown) return false;
    let blob;
    try {
      const q = '/api/tts?text=' + encodeURIComponent(text) +
        (this.ttsVoice ? '&voice=' + encodeURIComponent(this.ttsVoice) : '');
      const r = await fetch(q);
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
    audio.onerror = () => {
      cleanup();
      onEnded(); // a broken mid-line stream shouldn't wait out the safety cap
    };
    try {
      await audio.play();
      onStarted?.(audio.duration);
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
    this._onLineDone?.(); // release the pending speak() immediately
  }

  setMuted(muted) {
    this.muted = muted;
    if (muted) {
      this._stopAudio();
      this.synth?.cancel();
    }
  }
}
