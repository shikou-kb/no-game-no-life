import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));
const files=[];
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isSymbolicLink())throw Error('Symlink not allowed');if(item.isDirectory())walk(p);else files.push(path.relative(path.join(root,'docs'),p).replaceAll('\\','/'));}}
walk(path.join(root,'docs'));
const expected=new Set([...release.files.map(f=>f.path),'.nojekyll']);
if(files.length!==expected.size||files.some(p=>!expected.has(p)))throw Error('Unexpected or missing publish file');
for(const file of release.files){if(file.path.includes('..')||path.isAbsolute(file.path))throw Error('Unsafe path');const data=fs.readFileSync(path.join(root,'docs',file.path));if(data.length!==file.bytes||crypto.createHash('sha256').update(data).digest('hex')!==file.sha256)throw Error('Release mismatch: '+file.path);}
const html=fs.readFileSync(path.join(root,'docs/index.html'),'utf8');
if(!html.includes('app-'+release.runtimeRevision+'.mjs'))throw Error('Wrong entrypoint');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8');
if(!workflow.includes('workflow_dispatch:')||/^  (push|pull_request|schedule):/m.test(workflow))throw Error('Publication must stay manual');
console.log(JSON.stringify({version:release.version,verifiedFiles:release.files.length,publication:'manual-only'}));
