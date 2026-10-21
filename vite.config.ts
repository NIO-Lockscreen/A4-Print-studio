import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

// pdf.js fetches CMaps, standard fonts, ICC profiles and WASM image decoders
// at runtime from plain directory URLs, so they are served unhashed under
// /pdfjs/ (see src/editor/pdf.ts).
const PDFJS_ASSET_DIRS = ['cmaps', 'iccs', 'standard_fonts', 'wasm'];

function pdfjsAssets(): Plugin {
  const root = path.resolve(__dirname, 'node_modules/pdfjs-dist');
  return {
    name: 'pdfjs-assets',
    configureServer(server) {
      server.middlewares.use('/pdfjs', (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? '').split('?')[0]);
        const dir = rel.split('/').filter(Boolean)[0];
        const file = path.join(root, rel);
        if (!PDFJS_ASSET_DIRS.includes(dir) || !file.startsWith(path.join(root, dir) + path.sep) ||
            !fs.existsSync(file) || !fs.statSync(file).isFile()) {
          return next();
        }
        const ext = path.extname(file);
        res.setHeader('Content-Type',
          ext === '.wasm' ? 'application/wasm' : ext === '.js' ? 'text/javascript' : 'application/octet-stream');
        fs.createReadStream(file).pipe(res);
      });
    },
    generateBundle() {
      for (const dir of PDFJS_ASSET_DIRS) {
        for (const name of fs.readdirSync(path.join(root, dir))) {
          this.emitFile({
            type: 'asset',
            fileName: `pdfjs/${dir}/${name}`,
            source: fs.readFileSync(path.join(root, dir, name)),
          });
        }
      }
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), pdfjsAssets()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
