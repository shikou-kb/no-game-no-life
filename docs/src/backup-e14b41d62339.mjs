import {validateState as validateV3} from './schema-v3-e14b41d62339.mjs';
import {validateAttachments} from './schema-rebuild-e14b41d62339.mjs';
import {validateState} from './schema-e14b41d62339.mjs';
import {migrateState} from './migration-e14b41d62339.mjs';
import {validateState as validateV2,validateLegacyState} from './schema-v2-e14b41d62339.mjs';
const fail=message=>{throw new Error(message);};
const assert=(condition,message)=>{if(!condition)fail(message);};
export function checksum(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
export function validateDrafts(drafts){
 assert(Array.isArray(drafts)&&drafts.length<=500,'最多保留500份草稿，请先保存或整理已有草稿');const ids=new Set();
 for(const d of drafts){assert(d&&typeof d.id==='string'&&d.id.length>0&&d.id.length<=200&&!ids.has(d.id)&&['diary','records','setup','activity','plan','appearance','weekly','review','example','phase','habit','iteration-node','iteration-entry','relations','time-edit'].includes(d.kind)&&typeof d.text==='string'&&d.text.length<=200000&&Array.isArray(d.photos)&&d.photos.length<=30,'草稿内容无效');ids.add(d.id);validateAttachments(d.attachments);
 const photoIds=new Set();for(const p of d.photos){assert(p&&typeof p.id==='string'&&p.id.length>0&&p.id.length<=200&&!photoIds.has(p.id)&&typeof p.name==='string'&&p.name.length<=200&&typeof p.data==='string'&&p.data.length<=24000000&&/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(p.data),'草稿照片格式无效或标识重复');photoIds.add(p.id);}}
 return drafts;
}
export function validateAssets(state,drafts,assets=[]){
 assert(Array.isArray(assets)&&assets.length<=100,'背景资产列表无效');const ids=new Set();let total=0;
 for(const a of assets){assert(a&&typeof a.id==='string'&&a.id.length>0&&a.id.length<=200&&!ids.has(a.id)&&typeof a.name==='string'&&a.name.length<=200&&typeof a.data==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(a.data)&&a.data.length<=2800000,'背景图片无效或超过2MiB');ids.add(a.id);total+=a.data.length;}
 assert(total<=16800000,'背景图片合计超过12MiB，请保留旧数据并减少本次图片');
 for(const p of [state.appearance?.global,...Object.values(state.appearance?.pages??{})])if(p?.backgroundMode==='image')assert(ids.has(p.assetId),'背景图片引用失联，未保存');
 if(state.appearance?.cover?.mode==='image')assert(ids.has(state.appearance.cover.assetId),'封面图片引用失联，未保存');
 for(const d of drafts)for(const id of d.assetRefs??[])assert(ids.has(id)||(d.photos??[]).some(p=>p.id===id),'草稿背景引用失联');
 return assets;
}
function compact(state,drafts,assets=null){
 const media=[],indices=new Map(),pack=p=>{const {data,...metadata}=p;let index=indices.get(data);if(index===undefined){index=media.length;indices.set(data,index);media.push(data);}return {...metadata,dataRef:index};};
 const result={payload:{...state,moments:state.moments.map(m=>({...m,photos:m.photos.map(pack),...(m.attachments?{attachments:m.attachments.map(pack)}:{})}))},drafts:drafts.map(d=>({...d,photos:d.photos.map(pack),...(d.attachments?{attachments:d.attachments.map(pack)}:{})})),media};if(assets!==null)result.assets=assets.map(pack);return result;
}
export function assertBackupCapacity(state,drafts,assets=[]){
 validateDrafts(drafts);validateAssets(state,drafts,assets);const packed=compact(state,drafts,assets);
 const metadata=new TextEncoder().encode(JSON.stringify({...packed,media:[]})).byteLength;
 // Image data URLs are ASCII. Reserve 5MB for the envelope and future metadata.
 const bytes=metadata+packed.media.reduce((sum,data)=>sum+data.length+3,0);
 assert(bytes<=95000000,'记录与草稿合计超过95MB备份容量，本次未保存。请先导出备份，再保存或整理已有草稿/照片；原数据保留');return packed;
}
export function makeBackup(state,drafts=[],assets=[]){validateState(state);const content=assertBackupCapacity(state,drafts,assets);return {format:'ngnl-local-backup',version:5,exportedAt:Date.now(),checksum:checksum(JSON.stringify(content)),...content};}
export function makePriorBackup(state,drafts=[],assets=[]){(state.schemaVersion===1?validateLegacyState:state.schemaVersion===3?validateV3:validateV2)(state);validateDrafts(drafts);const content=compact(state,drafts,state.schemaVersion===3?assets:null);return {format:'ngnl-local-backup',version:state.schemaVersion===3?4:3,exportedAt:Date.now(),checksum:checksum(JSON.stringify(content)),...content};}
export function parseBackupBundle(text){
 assert(new TextEncoder().encode(text).byteLength<=100000000,'备份超过100MB');let parsed;try{parsed=JSON.parse(text);}catch{fail('不是有效的 JSON 备份');}
 assert(parsed?.format==='ngnl-local-backup'&&[1,2,3,4,5].includes(parsed.version),'不是本应用支持的完整备份版本');
 const content=parsed.version===1?parsed.payload:parsed.version===2?{payload:parsed.payload,drafts:parsed.drafts}:{payload:parsed.payload,drafts:parsed.drafts,media:parsed.media,...(parsed.version>=4?{assets:parsed.assets}:{})};
 assert(parsed.checksum===checksum(JSON.stringify(content)),'备份校验不一致，文件可能损坏，未导入');
 let payload=parsed.payload,drafts=parsed.version===1?[]:parsed.drafts,assets=[];
 if(parsed.version>=3){assert(Array.isArray(parsed.media)&&Array.isArray(payload?.moments)&&Array.isArray(drafts),'备份照片索引无效');
 const unpack=p=>{assert(p&&Number.isInteger(p.dataRef)&&p.dataRef>=0&&p.dataRef<parsed.media.length,'备份照片引用失联');const {dataRef,...metadata}=p;return {...metadata,data:parsed.media[dataRef]};};
 assert(payload.moments.every(m=>Array.isArray(m.photos))&&drafts.every(d=>Array.isArray(d.photos)),'备份照片列表无效');
 payload={...payload,moments:payload.moments.map(m=>({...m,photos:m.photos.map(unpack),...(m.attachments?{attachments:m.attachments.map(unpack)}:{})}))};drafts=drafts.map(d=>({...d,photos:d.photos.map(unpack),...(d.attachments?{attachments:d.attachments.map(unpack)}:{})}));if(parsed.version>=4){assert(Array.isArray(parsed.assets),'背景资产列表无效');assets=parsed.assets.map(unpack);}}
 const state=migrateState(payload);assertBackupCapacity(state,drafts,assets);return {state,drafts,assets};
}
export const parseBackup=text=>parseBackupBundle(text).state;
