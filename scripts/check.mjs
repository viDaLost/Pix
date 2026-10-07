import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const files=['sw.js',...readdirSync(new URL('../src/',import.meta.url)).filter(f=>f.endsWith('.js')).map(f=>'src/'+f)];
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{cwd:root,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
console.log(`Syntax checked: ${files.length} JavaScript files.`);
