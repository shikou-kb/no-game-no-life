import {validateState} from './schema.mjs';
import {migrateState} from './migration.mjs';
const fail=message=>{throw new Error(message);};
const assert=(condition,message)=>{if(!condition)fail(message);};
export function checksum(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
export function validateDrafts(drafts){
 assert(Array.isArray(drafts)&&drafts.length<=500,'最多保留500份草稿，请先保存或整理已有草稿');const ids=new Set();
 for(const d of drafts){assert(d&&typeof d.id==='string'&&d.id.length>0&&d.id.length<=200&&!ids.has(d.id)&&['diary','records'].includes(d.kind)&&typeof d.text==='string'&&d.text.length<=200000&&Array.isArray(d.photos)&&d.photos.length<=30,'草稿内容无效');ids.add(d.id);
 const photoIds=new Set();for(const p of d.photos){assert(p&&typeof p.id==='string'&&p.id.length>0&&p.id.length<=200&&!photoIds.has(p.id)&&typeof p.name==='string'&&p.name.length<=200&&typeof p.data==='string'&&p.data.length<=24000000&&/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(p.data),'草稿照片格式无效或标识重复');photoIds.add(p.id);}}
 return drafts;
}
function compact(state,drafts){
 const media=[],indices=new Map(),pack=p=>{const {data,...metadata}=p;let index=indices.get(data);if(index===undefined){index=media.length;indices.set(data,index);media.push(data);}return {...metadata,dataRef:index};};
 return {payload:{...state,moments:state.moments.map(m=>({...m,photos:m.photos.map(pack)}))},drafts:drafts.map(d=>({...d,photos:d.photos.map(pack)})),media};
}
export function assertBackupCapacity(state,drafts){
 validateDrafts(drafts);const packed=compact(state,drafts);
 const metadata=new TextEncoder().encode(JSON.stringify({...packed,media:[]})).byteLength;
 // Image data URLs are ASCII. Reserve 5MB for the envelope and future metadata.
 const bytes=metadata+packed.media.reduce((sum,data)=>sum+data.length+3,0);
 assert(bytes<=95000000,'记录与草稿合计超过95MB备份容量，本次未保存。请先导出备份，再保存或整理已有草稿/照片；原数据保留');return packed;
}
export function makeBackup(state,drafts=[]){validateState(state);const content=assertBackupCapacity(state,drafts);return {format:'ngnl-local-backup',version:3,exportedAt:Date.now(),checksum:checksum(JSON.stringify(content)),...content};}
export function parseBackupBundle(text){
 assert(new TextEncoder().encode(text).byteLength<=100000000,'备份超过100MB');let parsed;try{parsed=JSON.parse(text);}catch{fail('不是有效的 JSON 备份');}
 assert(parsed?.format==='ngnl-local-backup'&&[1,2,3].includes(parsed.version),'不是本应用支持的完整备份版本');
 const content=parsed.version===1?parsed.payload:parsed.version===2?{payload:parsed.payload,drafts:parsed.drafts}:{payload:parsed.payload,drafts:parsed.drafts,media:parsed.media};
 assert(parsed.checksum===checksum(JSON.stringify(content)),'备份校验不一致，文件可能损坏，未导入');
 let payload=parsed.payload,drafts=parsed.version===1?[]:parsed.drafts;
 if(parsed.version===3){assert(Array.isArray(parsed.media)&&Array.isArray(payload?.moments)&&Array.isArray(drafts),'备份照片索引无效');
 const unpack=p=>{assert(p&&Number.isInteger(p.dataRef)&&p.dataRef>=0&&p.dataRef<parsed.media.length,'备份照片引用失联');const {dataRef,...metadata}=p;return {...metadata,data:parsed.media[dataRef]};};
 assert(payload.moments.every(m=>Array.isArray(m.photos))&&drafts.every(d=>Array.isArray(d.photos)),'备份照片列表无效');
 payload={...payload,moments:payload.moments.map(m=>({...m,photos:m.photos.map(unpack)}))};drafts=drafts.map(d=>({...d,photos:d.photos.map(unpack)}));}
 const state=migrateState(payload);assertBackupCapacity(state,drafts);return {state,drafts};
}
export const parseBackup=text=>parseBackupBundle(text).state;
