import {uid} from './domain-27ca4e179461.mjs';
import {sha256} from './integrity-27ca4e179461.mjs';
import {downloadBytes} from './native-27ca4e179461.mjs';
export async function readAttachment(file){
 if(file.size>10000000)throw Error('单个文件最多10MB，请选择较小文件');
 const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=24576)binary+=String.fromCharCode(...bytes.subarray(i,i+24576));
 const data='data:application/octet-stream;base64,'+btoa(binary);
 return {id:uid(),name:file.name.slice(0,200)||'附件',type:file.type.slice(0,100)||'application/octet-stream',size:bytes.length,data,sha256:sha256(bytes)};
}
export function attachmentBytes(file){const binary=atob(file.data.split(',')[1]);return Uint8Array.from(binary,c=>c.charCodeAt(0));}
export function exportAttachment(file){return downloadBytes(file.name.replace(/[\\/\u0000-\u001f]/g,'_'),attachmentBytes(file),'application/octet-stream');}
