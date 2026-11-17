import {ensureAppearanceState} from './appearance-state-27ca4e179461.mjs';
import {recordSnapshot,ensurePlanFrames} from './rebuild-model-27ca4e179461.mjs';
import {reconcileReminders} from './reminders-27ca4e179461.mjs';
import {createState,validateState,copy,uid,makeBackup} from './domain-27ca4e179461.mjs';
import {migrateState,legacyCompatibleState} from './migration-27ca4e179461.mjs';
import {assertBackupCapacity,validateDrafts,makePriorBackup} from './backup-27ca4e179461.mjs';
import {recordConfigChanges} from './activity-policy-27ca4e179461.mjs';
import {sha256} from './integrity-27ca4e179461.mjs';
import {reconcileExamples} from './weekly-model-27ca4e179461.mjs';
export const STATE_KEY='current-v4';
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const draftPhotoKey=(draft,id)=>draft.photoKeyVersion===4?'draft-photo-v4:'+JSON.stringify([draft.id,id]):draft.photoKeyVersion===3?'draft-photo-v3:'+JSON.stringify([draft.id,id]):draft.photoKeyVersion===2?'draft-photo-v2:'+JSON.stringify([draft.id,id]):'draft-photo:'+draft.id+':'+id;
function finished(tx){return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error??new Error('确定未保存：事务已中止，原数据保留'));tx.onerror=()=>{};});}
export class Repository{
  constructor(name='ngnl-local-v1'){this.name=name;this.channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel(name):null;}
  async transaction(stores,mode,work){const tx=this.db.transaction(stores,mode),done=finished(tx);let result;try{result=await work(tx);}catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}await done;return result;}
  async open(){
    this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open(this.name,1);r.onupgradeneeded=()=>{r.result.createObjectStore('state');r.result.createObjectStore('recovery');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('请关闭其他旧页面后重试'));});this.db.onversionchange=()=>this.db.close();
    return this.transaction(['state','recovery'],'readwrite',async tx=>{
      const store=tx.objectStore('state'),recovery=tx.objectStore('recovery'),current=await request(store.get(STATE_KEY));
      if(current){validateState(current);const next=ensureAppearanceState(current);if(next!==current){recovery.put({at:Date.now(),state:current,drafts:await this.draftRecords(tx),assets:await this.assetRecords(tx)},'before-independent-cover');next.revision=current.revision+1;assertBackupCapacity(next,await this.draftRecords(tx),await this.assetRecords(tx));store.put(next,STATE_KEY);}return validateState(next);}
      const oldV3=await request(store.get('current-v3')),oldV2=await request(store.get('current-v2')),oldV1=await request(store.get('current')),legacy=oldV3??oldV2??oldV1;
      if(oldV3){const marker=await request(recovery.get('schema3-origin'));if(!marker||marker.fingerprint!==await this.legacyFingerprint(tx,2))throw Error('旧版分支存在不同修改，请先分别导出核对，未迁移');}
      if(oldV2){const marker=await request(recovery.get('schema2-origin'));if((oldV1?.revision??null)!==(marker?.legacyRevision??null))throw Error('旧版分支存在不同修改，请先分别导出核对，未迁移');}
      const drafts=await this.draftRecords(tx,oldV3?'draft-v3:':'draft:'),assets=oldV3?await this.assetRecords(tx,'asset-v3:'):[],next=legacy?migrateState(legacy):createState();
      if(legacy)recovery.put({at:Date.now(),state:legacy,drafts,assets,backup:makePriorBackup(legacy,drafts,assets)},'before-schema4');
      for(const draft of drafts)this.writeDraft(tx,draft);
      for(const asset of assets)recovery.put(copy(asset),'asset-v4:'+asset.id);
      recovery.put({fingerprint:await this.legacyFingerprint(tx)},'schema4-origin');
      assertBackupCapacity(next,drafts,assets);store.put(next,STATE_KEY);return next;
    });
  }
  async legacyFingerprint(tx,version=3){
    const store=tx.objectStore('state'),recovery=tx.objectStore('recovery'),entries=[];
    for(const key of (version===2?['current','current-v2']:['current','current-v2','current-v3']))entries.push([key,await request(store.get(key))??null]);
    for(const key of (await request(recovery.getAllKeys())).filter(k=>(version===2?/^draft:|^draft-photo:|^draft-photo-v2:/:/^draft:|^draft-photo:|^draft-photo-v2:|^draft-v3:|^draft-photo-v3:|^asset-v3:/).test(String(k))).sort())entries.push([key,await request(recovery.get(key))]);
    return sha256(JSON.stringify(entries));
  }
  async guard(tx){const origin=await request(tx.objectStore('recovery').get('schema4-origin'));if(!origin||origin.fingerprint!==await this.legacyFingerprint(tx))throw Error('旧版页面在升级后改动了记录或草稿。请先分别导出核对，当前未覆盖任何一份');}
  async assetRecords(tx,prefix='asset-v4:'){return request(tx.objectStore('recovery').getAll(IDBKeyRange.bound(prefix,prefix+'\uffff')));}
  async listAssets(){return this.transaction(['recovery'],'readonly',tx=>this.assetRecords(tx));}

  async read(){return this.transaction(['state'],'readonly',tx=>request(tx.objectStore('state').get(STATE_KEY)));}
  async update(mutator,{operationId=uid(),snapshot=false,expectedRevision=null,clearDraftId=null,importDrafts=null,importAssets=null,assets=[],checkDrafts=null}={}){
    if(importDrafts!==null)validateDrafts(importDrafts);
    const result=await this.transaction(['state','recovery'],'readwrite',async tx=>{
      const store=tx.objectStore('state'),recovery=tx.objectStore('recovery'),previous=await request(store.get(STATE_KEY));validateState(previous);
      if(previous.operations.includes(operationId))return previous;
      await this.guard(tx);
      if(expectedRevision!==null&&previous.revision!==expectedRevision)throw new Error('数据已在其他页面变化，请重新核对；草稿仍保留');
      let next=mutator(copy(previous));if(next instanceof Promise)throw new Error('保存内容须在事务前准备完成');
      if(importDrafts===null&&importAssets===null){next=recordConfigChanges(previous,next);next=reconcileExamples(previous,next);if(next.recordUndo&&JSON.stringify(previous.recordUndo)!==JSON.stringify(next.recordUndo))next.recordUndo.after=recordSnapshot(next);}
      next=ensurePlanFrames(reconcileReminders(next));next={...next,revision:previous.revision+1,operations:[...new Set([...previous.operations.slice(-499),operationId])]};validateState(next);
      if(snapshot){const drafts=await this.draftRecords(tx);recovery.put({at:Date.now(),state:previous,drafts,assets:await this.assetRecords(tx)},'before-replace-v4');}
      if(importDrafts!==null){await this.clearDraftRecords(tx);for(const d of importDrafts)this.writeDraft(tx,d);}
      if(importAssets!==null){for(const key of await request(recovery.getAllKeys()))if(String(key).startsWith('asset-v4:'))recovery.delete(key);}
      for(const asset of importAssets??assets)recovery.put(copy(asset),'asset-v4:'+asset.id);
      if(clearDraftId)await this.deleteDraftIn(tx,clearDraftId);
      const currentDrafts=await this.draftRecords(tx);checkDrafts?.(next,currentDrafts);assertBackupCapacity(next,currentDrafts,await this.assetRecords(tx));
      store.put(next,STATE_KEY);return next;
    });this.channel?.postMessage({revision:result.revision});return result;
  }
  async recoveryPoint(key='before-replace-v4'){return this.transaction(['recovery'],'readonly',tx=>request(tx.objectStore('recovery').get(key)));}
  async replace(next,expectedRevision,{drafts=null,assets=[]}={}){validateState(next);const restored=copy(next);restored.dataGeneration=uid();restored.reminders=restored.reminders.map(r=>({...r,status:'cancelled'}));if(restored.running)restored.running.needsReview=true;return this.update(()=>restored,{snapshot:true,expectedRevision,importDrafts:drafts,importAssets:assets});}
  async draftRecords(tx,prefix='draft-v4:'){const store=tx.objectStore('recovery'),drafts=await request(store.getAll(IDBKeyRange.bound(prefix,prefix+'\uffff')));return Promise.all(drafts.map(async d=>{const photos=await Promise.all((d.photoIds??[]).map(id=>request(store.get(draftPhotoKey(d,id)))));if(photos.some(p=>!p))throw Error('草稿照片失联，原数据保留');const {photoIds,photoKeyVersion,...metadata}=d;return {...metadata,photos};}));}
  writeDraft(tx,draft){const store=tx.objectStore('recovery'),d=copy(draft);d.photoKeyVersion=4;for(const photo of d.photos??[])store.put(photo,draftPhotoKey(d,photo.id));d.photoIds=(d.photos??[]).map(p=>p.id);delete d.photos;store.put(d,'draft-v4:'+d.id);}
  async saveDraft(draft,{photosChanged=false}={}){
    validateDrafts([draft]);
    return this.transaction(['state','recovery'],'readwrite',async tx=>{await this.guard(tx);const store=tx.objectStore('recovery'),previous=await request(store.get('draft-v4:'+draft.id));if(photosChanged||!previous){await this.deleteDraftIn(tx,draft.id);this.writeDraft(tx,draft);}else{const d=copy(draft);d.photoIds=previous.photoIds??[];d.photoKeyVersion=previous.photoKeyVersion??1;delete d.photos;store.put(d,'draft-v4:'+d.id);}assertBackupCapacity(await request(tx.objectStore('state').get(STATE_KEY)),await this.draftRecords(tx),await this.assetRecords(tx));});
  }
  async listDrafts(){return this.transaction(['recovery'],'readonly',tx=>this.draftRecords(tx));}
  async deleteDraftIn(tx,id){const store=tx.objectStore('recovery'),draft=await request(store.get('draft-v4:'+id));if(!draft)return;for(const photoId of draft.photoIds??[])store.delete(draftPhotoKey(draft,photoId));store.delete('draft-v4:'+id);}
  async deleteDraft(id){return this.transaction(['state','recovery'],'readwrite',async tx=>{await this.guard(tx);await this.deleteDraftIn(tx,id);});}
  async clearDraftRecords(tx){const store=tx.objectStore('recovery');for(const key of await request(store.getAllKeys()))if(/^draft-v4:|^draft-photo-v4:/.test(String(key)))store.delete(key);}
  async exportBackup(){return this.transaction(['state','recovery'],'readonly',async tx=>makeBackup(await request(tx.objectStore('state').get(STATE_KEY)),await this.draftRecords(tx),await this.assetRecords(tx)));}
  async legacyExport(){return legacyCompatibleState(await this.read());}
  close(){this.channel?.close();this.db?.close();}
}
