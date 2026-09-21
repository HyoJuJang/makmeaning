import { mkdir, copyFile, readdir, cp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Keep the existing room and tested ES modules as the single implementation.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = path.join(root, 'app');
const destination = path.join(root, 'public', 'prototype');
await mkdir(destination, { recursive: true });
for (const file of await readdir(app)) {
  if (file.endsWith('.js')) await copyFile(path.join(app, file), path.join(destination, file));
}
await cp(path.join(app, 'assets'), path.join(root, 'public', 'assets'), { recursive: true });
const html = await readFile(path.join(app, 'index.html'), 'utf8');
const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1];
if (!body) throw new Error('Room HTML has no body');
const markup = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
await mkdir(path.join(root, 'src', 'generated'), { recursive: true });
await writeFile(path.join(root, 'src', 'generated', 'room-markup.json'), JSON.stringify(markup));
console.log('Prepared existing room modules, artwork, and shell for Next.js.');
