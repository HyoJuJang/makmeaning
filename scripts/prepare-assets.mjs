import { mkdir, copyFile, readdir, cp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGameAssets } from './build-game-assets.mjs';

// Keep the existing room and tested ES modules as the single implementation.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const includeLocalGameAssets = process.argv.includes('--include-local-game-assets');
await buildGameAssets({ repositoryRoot: root, quiet: true, validateNativeFiles: includeLocalGameAssets });
const app = path.join(root, 'app');
const destination = path.join(root, 'public', 'prototype');
await mkdir(destination, { recursive: true });
for (const file of await readdir(app)) {
  if (file.endsWith('.js')) await copyFile(path.join(app, file), path.join(destination, file));
}
// Native generated PNGs live in external storage, not in a normal app bundle.
// Retain an explicit local-preview mode for generation and visual QA.
if (!includeLocalGameAssets) await rm(path.join(root, 'public', 'assets', 'game-items'), { recursive: true, force: true });
await cp(path.join(app, 'assets'), path.join(root, 'public', 'assets'), {
  recursive: true,
  filter: source => includeLocalGameAssets || source !== path.join(app, 'assets', 'game-items'),
});
const html = await readFile(path.join(app, 'index.html'), 'utf8');
const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1];
if (!body) throw new Error('Room HTML has no body');
const markup = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
await mkdir(path.join(root, 'src', 'generated'), { recursive: true });
await writeFile(path.join(root, 'src', 'generated', 'room-markup.json'), JSON.stringify(markup));
console.log('Prepared existing room modules, artwork, and shell for Next.js.');
