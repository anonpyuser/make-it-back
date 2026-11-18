// Decode base64 assets (and icons) so local `python3 -m http.server` can serve them.
// The GitHub Pages workflow does the same step when publishing.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function decodeDir(rel, destRel = rel) {
  const src = join(root, rel, 'b64');
  let names;
  try { names = readdirSync(src).filter((n) => n.endsWith('.b64')); }
  catch { return; }
  const dest = join(root, destRel);
  mkdirSync(dest, { recursive: true });
  for (const name of names) {
    const out = join(dest, name.slice(0, -4));
    writeFileSync(out, Buffer.from(readFileSync(join(src, name), 'utf8'), 'base64'));
    console.log('decoded', `${destRel}/${name.slice(0, -4)}`);
  }
}

decodeDir('icons');
decodeDir('assets');
