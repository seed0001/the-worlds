import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Production server (Railway). Two jobs:
//   1. serve the built site out of dist/
//   2. serve /api/tts — narration in the Microsoft Andrew neural voice, the
//      same online service Edge uses (no key needed), streamed back as MP3.
// This mirrors the dev-server plugin in vite.config.js exactly, so the film
// sounds identical locally and deployed.

// Episode 1 narrates in Andrew (male, US-multilingual); Episode 2 in Sonia
// (female, British). Any voice the client asks for is validated against this
// allowlist so the endpoint can't be turned into an open TTS proxy.
const VOICE_ALLOW = new Set([
  'en-US-AndrewMultilingualNeural',
  'en-GB-SoniaNeural',
  'en-GB-LibbyNeural',
  'en-IE-EmilyNeural',
]);
const DEFAULT_VOICE = 'en-US-AndrewMultilingualNeural';
const pickVoice = (v) => (VOICE_ALLOW.has(v) ? v : DEFAULT_VOICE);
const dist = join(dirname(fileURLToPath(import.meta.url)), 'dist');

const app = express();

app.get('/api/tts', async (req, res) => {
  const text = String(req.query.text ?? '').slice(0, 1000).trim();
  if (!text) {
    res.status(400).send('missing ?text=');
    return;
  }
  const voice = pickVoice(String(req.query.voice ?? ''));
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text, { rate: '-6%' });
    res.setHeader('Content-Type', 'audio/mpeg');
    audioStream.on('data', (chunk) => res.write(chunk));
    audioStream.on('end', () => {
      res.end();
      tts.close();
    });
    audioStream.on('error', () => {
      res.destroy();
      tts.close();
    });
  } catch (err) {
    tts.close();
    res.status(502).send(String(err?.message ?? err));
  }
});

app.use(express.static(dist));

// Anything else lands on the app (queries like ?seed= ride along untouched).
app.use((req, res) => {
  res.sendFile(join(dist, 'index.html'));
});

const port = process.env.PORT ?? 8080;
app.listen(port, () => {
  console.log(`The Worlds serving on :${port}`);
});
