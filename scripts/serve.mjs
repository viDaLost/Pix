import http from 'node:http';
import path from 'node:path';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const project = fileURLToPath(new URL('../',import.meta.url));
const root = path.resolve(project,process.argv.includes('--dist') ? 'dist' : '.');
const port = Number(process.env.PORT || 4173);
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2' };
// The worker serves its cache first, so in development its cache name follows every edit, as the build's content hash does.
async function stamp(dir) {
  let text = '';
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    if (['.git','node_modules','dist','tests','docs','scripts'].includes(entry.name)) continue;
    const file = path.join(dir,entry.name);
    if (entry.isDirectory()) text += await stamp(file);
    else { const info = await stat(file); text += `${file}:${info.size}:${info.mtimeMs};`; }
  }
  return text;
}
const server = http.createServer(async (req,res) => {
  try {
    let route = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    // /Pix/ exercises the exact path layout of a GitHub project page.
    if (route === '/Pix') { res.writeHead(301,{Location:'/Pix/'}); return res.end(); }
    if (route.startsWith('/Pix/')) route = route.slice(4);
    let file = path.resolve(root,'.'+route);
    if (!file.startsWith(root+path.sep) && file !== root) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = path.join(file,'index.html');
    if (!['.html','.js','.css','.json','.webmanifest','.svg','.png','.woff2'].includes(path.extname(file))) throw new Error('Not a public asset');
    let data = await readFile(file);
    if (file === path.join(root,'sw.js')) data = Buffer.from(data.toString('utf8').replace(/'pix-forge-v\d+'/, `'pix-forge-dev-${createHash('sha256').update(await stamp(root)).digest('hex').slice(0,12)}'`));
    res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'}); res.end(data);
  } catch { res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}); res.end('Not found'); }
});
server.listen(port,'0.0.0.0',() => console.log(`Game: http://localhost:${port}/Pix/`));
