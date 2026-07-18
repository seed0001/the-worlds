/** @type {import('vite').UserConfig} */
export default {
  server: { port: 5180 },
  // ez-tree ships its lib as a prebuilt ES bundle with `three` left external,
  // so the alias below is only needed if we switch to consuming its source.
  optimizeDeps: { exclude: ['@dgreenheck/ez-tree'] },
};
