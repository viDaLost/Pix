import { cp, mkdir, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const files = ['index.html', 'styles.css', 'manifest.webmanifest', 'sw.js', '.nojekyll', 'src', 'assets'];
for (const file of files) await cp(path.join(root,file), path.join(dist,file), { recursive: true });
// Change the cache on every content change, including graphics and icons.
const hash = createHash('sha256');
async function fingerprint(dir) {
  for (const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b) => a.name.localeCompare(b.name))) {
    const file = path.join(dir,entry.name);
    if (entry.isDirectory()) await fingerprint(file);
    else { hash.update(path.relative(dist,file)); hash.update(await readFile(file)); }
  }
}
await fingerprint(dist);
const swPath = path.join(dist,'sw.js');
await writeFile(swPath,(await readFile(swPath,'utf8')).replace(/'pix-forge-v\d+'/, `'pix-forge-${hash.digest('hex').slice(0,12)}'`));
console.log('Built dist/ — static mobile game, ready for GitHub Pages.');
