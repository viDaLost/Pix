import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const project = fileURLToPath(new URL('../',import.meta.url));
const root = path.resolve(project,process.argv.includes('--dist') ? 'dist' : '.');
const port = Number(process.env.PORT || 4173);
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png' };
const server = http.createServer(async (req,res) => {
  try {
    let route = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    // /Pix/ exercises the exact path layout of a GitHub project page.
    if (route === '/Pix') { res.writeHead(301,{Location:'/Pix/'}); return res.end(); }
    if (route.startsWith('/Pix/')) route = route.slice(4);
    let file = path.resolve(root,'.'+route);
    if (!file.startsWith(root+path.sep) && file !== root) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = path.join(file,'index.html');
    if (!['.html','.js','.css','.json','.webmanifest','.svg','.png'].includes(path.extname(file))) throw new Error('Not a public asset');
    const data = await readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'}); res.end(data);
  } catch { res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}); res.end('Not found'); }
});
server.listen(port,'0.0.0.0',() => console.log(`Game: http://localhost:${port}/Pix/`));
