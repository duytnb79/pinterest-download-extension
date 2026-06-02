import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { build as esbuild } from 'esbuild';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const rootDir = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(rootDir, 'src');
const distDir = resolve(rootDir, 'dist');

function copyStaticAssets(): Plugin {
  return {
    name: 'copy-static-assets',
    async closeBundle() {
      mkdirSync(distDir, { recursive: true });
      copyFileSync(resolve(srcDir, 'manifest.json'), resolve(distDir, 'manifest.json'));
      moveAndFixHtml('popup.html');
      moveAndFixHtml('options.html');
      const assetsSrc = resolve(srcDir, 'assets');
      if (existsSync(assetsSrc)) {
        cpSync(assetsSrc, resolve(distDir, 'assets'), { recursive: true, force: true });
      }
      await buildContentScript();
    }
  };
}

async function buildContentScript(): Promise<void> {
  await esbuild({
    entryPoints: [resolve(srcDir, 'content-script.ts')],
    outfile: resolve(distDir, 'contentScript.js'),
    bundle: true,
    format: 'iife',
    target: 'es2022'
  });
}

function moveAndFixHtml(fileName: string): void {
  const nestedPath = resolve(distDir, 'src', fileName);
  const targetPath = resolve(distDir, fileName);

  if (!existsSync(nestedPath)) {
    return;
  }

  let html = readFileSync(nestedPath, 'utf-8');
  html = html.replaceAll('../', '');
  writeFileSync(targetPath, html);
  rmSync(nestedPath);
}

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(srcDir, 'background.ts'),
        popup: resolve(srcDir, 'popup.html'),
        options: resolve(srcDir, 'options.html')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'clean-dist-before-build',
      buildStart() {
        rmSync(distDir, { recursive: true, force: true });
      }
    },
    copyStaticAssets()
  ]
});
