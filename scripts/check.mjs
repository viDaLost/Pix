import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
// The worker, every module of the game, the scripts of the bot and the build, and the tests.
const list=(dir,ext)=>readdirSync(new URL(`../${dir}/`,import.meta.url)).filter(f=>f.endsWith(ext)).map(f=>`${dir}/${f}`);
const files=['sw.js',...list('src','.js'),...list('scripts','.mjs'),...list('tests','.mjs')];
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{cwd:root,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
console.log(`Syntax checked: ${files.length} JavaScript files.`);
