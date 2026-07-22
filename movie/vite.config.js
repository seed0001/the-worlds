import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const root = dirname(fileURLToPath(import.meta.url));

// /api/tts?text=... — narration audio in the Microsoft Andrew neural voice.
//
// Browsers other than Edge never expose Andrew through speechSynthesis, so the
// dev server synthesises each line itself against the same online service Edge
// uses (no key needed) and streams back MP3. The Narrator falls back to the
// browser's own voices if this endpoint fails (e.g. offline).
// Mirrors server.js exactly (see there for why the allowlist exists), so the
// film sounds identical in dev and deployed. Episode 1 → Andrew, Episode 2 →
// Sonia; anything off the list falls back to Andrew.
const VOICE_ALLOW = new Set([
  'en-US-AndrewMultilingualNeural',
  'en-GB-SoniaNeural',
  'en-GB-LibbyNeural',
  'en-IE-EmilyNeural',
]);
const DEFAULT_VOICE = 'en-US-AndrewMultilingualNeural';
const pickVoice = (v) => (VOICE_ALLOW.has(v) ? v : DEFAULT_VOICE);

function ttsPlugin() {
  return {
    name: 'neural-tts',
    configureServer(server) {
      server.middlewares.use('/api/tts', async (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const text = (url.searchParams.get('text') ?? '').slice(0, 1000).trim();
        if (!text) {
          res.statusCode = 400;
          res.end('missing ?text=');
          return;
        }
        const voice = pickVoice(url.searchParams.get('voice') ?? '');
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
          res.statusCode = 502;
          res.end(String(err?.message ?? err));
        }
      });
    },
  };
}

/** @type {import('vite').UserConfig} */
export default {
  server: { port: 5180 },
  plugins: [ttsPlugin()],
  // ez-tree is a file: dependency whose bundle imports `three` and expects the
  // app to supply it. npm links file: deps, and from the linked real path the
  // resolver can't walk back into movie/node_modules — dedupe pins `three` to
  // this project's copy no matter where the import comes from.
  resolve: { dedupe: ['three'] },
  build: {
    target: 'es2022', // the entry modules use top-level await
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),       // the hub — front door, lists every engine
        worlds: resolve(root, 'worlds.html'),     // The Worlds: splash, trailer, episodes
        apollo: resolve(root, 'apollo.html'),     // Apollo — the mission (moon landing recreation)
        chernobyl: resolve(root, 'chernobyl.html'), // Chernobyl — the reactor (1986 disaster recreation)
        episode1: resolve(root, 'episode1.html'), // legacy deep links, redirects to /worlds.html
        episode2: resolve(root, 'episode2.html'), // Episode 2 — the living world
        set: resolve(root, 'set.html'),           // the set browser (dev tool)
        soup: resolve(root, 'soup.html'),         // Episode 2, Act 2 — the soup (dev set-piece)
      },
    },
  },
  // ez-tree ships its lib as a prebuilt ES bundle with `three` left external,
  // so the alias below is only needed if we switch to consuming its source.
  optimizeDeps: { exclude: ['@dgreenheck/ez-tree'] },
};
