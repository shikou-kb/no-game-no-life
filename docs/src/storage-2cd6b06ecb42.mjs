import {createState,validateState,copy,uid,makeBackup} from './domain-2cd6b06ecb42.mjs';
import {migrateState,legacyCompatibleState} from './migration-2cd6b06ecb42.mjs';
import {assertBackupCapacity,validateDrafts} from './backup-2cd6b06ecb42.mjs';
export const STATE_KEY='current-v2';
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const draftPhotoKey=(draft,id)=>draft.photoKeyVersion===2?'draft-photo-v2:'+JSON.stringify([draft.id,id]):'draft-photo:'+draft.id+':'+id;
function finished(tx){return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error??new Error('确定未保存：事务已中止，原数据保留'));tx.onerror=()=>{};});}
export class Repository{
  constructor(name='ngnl-local-v1'){this.name=name;this.channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel(name):null;}
  async transaction(stores,mode,work){const tx=this.db.transaction(stores,mode),done=finished(tx);let result;try{result=await work(tx);}catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}await done;return result;}
  async open(){
    this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open(this.name,1);r.onupgradeneeded=()=>{r.result.createObjectStore('state');r.result.createObjectStore('recovery');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('请关闭其他旧页面后重试'));});this.db.onversionchange=()=>this.db.close();
    return this.transaction(['state','recovery'],'readwrite',async tx=>{const store=tx.objectStore('state'),recovery=tx.objectStore('recovery');const current=await request(store.get(STATE_KEY));if(current)return validateState(current);const legacy=await request(store.get('current')),next=legacy?migrateState(legacy):createState();
      if(legacy)recovery.put({at:Date.now(),state:legacy},'before-schema2');
      recovery.put({legacyRevision:legacy?.revision??null},'schema2-origin');store.put(next,STATE_KEY);return next;
    });
  }
  async read(){return this.transaction(['state'],'readonly',tx=>request(tx.objectStore('state').get(STATE_KEY)));}
  async update(mutator,{operationId=uid(),snapshot=false,expectedRevision=null,clearDraftId=null,importDrafts=null}={}){
    if(importDrafts!==null)validateDrafts(importDrafts);
    const result=await this.transaction(['state','recovery'],'readwrite',async tx=>{
      const store=tx.objectStore('state'),recovery=tx.objectStore('recovery'),previous=await request(store.get(STATE_KEY));validateState(previous);
      if(previous.operations.includes(operationId))return previous;
      const marker=await request(recovery.get('schema2-origin')),legacy=await request(store.get('current'));
      if((legacy?.revision??null)!==(marker?.legacyRevision??null))throw new Error('旧版页面在升级后改动了记录。请先分别导出新旧版备份再核对，当前未覆盖任何一份');
      if(expectedRevision!==null&&previous.revision!==expectedRevision)throw new Error('数据已在其他页面变化，请重新核对；草稿仍保留');
      let next=mutator(copy(previous));if(next instanceof Promise)throw new Error('保存内容须在事务前准备完成');
      next={...next,revision:previous.revision+1,operations:[...new Set([...previous.operations.slice(-499),operationId])]};validateState(next);
      if(snapshot){const drafts=await this.draftRecords(tx);recovery.put({at:Date.now(),state:previous,drafts},'before-replace');}
      if(importDrafts!==null){await this.clearDraftRecords(tx);for(const d of importDrafts)this.writeDraft(tx,d);}
      if(clearDraftId)await this.deleteDraftIn(tx,clearDraftId);
      assertBackupCapacity(next,await this.draftRecords(tx));
      store.put(next,STATE_KEY);return next;
    });this.channel?.postMessage({revision:result.revision});return result;
  }
  async recoveryPoint(key='before-replace'){return this.transaction(['recovery'],'readonly',tx=>request(tx.objectStore('recovery').get(key)));}
  async replace(next,expectedRevision,{drafts=null}={}){validateState(next);return this.update(()=>copy(next),{snapshot:true,expectedRevision,importDrafts:drafts});}
  async draftRecords(tx){const store=tx.objectStore('recovery'),keys=await request(store.getAllKeys()),rows=[];for(const key of keys)if(String(key).startsWith('draft:')){const d=await request(store.get(key)),photos=[];for(const id of d.photoIds??[]){const p=await request(store.get(draftPhotoKey(d,id)));if(p)photos.push(p);}const {photoIds,photoKeyVersion,...metadata}=d;rows.push({...metadata,photos});}return rows;}
  writeDraft(tx,draft){const store=tx.objectStore('recovery'),d=copy(draft);d.photoKeyVersion=2;for(const photo of d.photos??[])store.put(photo,draftPhotoKey(d,photo.id));d.photoIds=(d.photos??[]).map(p=>p.id);delete d.photos;store.put(d,'draft:'+d.id);}
  async saveDraft(draft,{photosChanged=false}={}){
    validateDrafts([draft]);
    return this.transaction(['state','recovery'],'readwrite',async tx=>{const store=tx.objectStore('recovery'),previous=await request(store.get('draft:'+draft.id));if(photosChanged||!previous){await this.deleteDraftIn(tx,draft.id);this.writeDraft(tx,draft);}else{const d=copy(draft);d.photoIds=previous.photoIds??[];d.photoKeyVersion=previous.photoKeyVersion??1;delete d.photos;store.put(d,'draft:'+d.id);}assertBackupCapacity(await request(tx.objectStore('state').get(STATE_KEY)),await this.draftRecords(tx));});
  }
  async listDrafts(){return this.transaction(['recovery'],'readonly',tx=>this.draftRecords(tx));}
  async deleteDraftIn(tx,id){const store=tx.objectStore('recovery'),draft=await request(store.get('draft:'+id));if(!draft)return;
    // Legacy compound keys may be shared after a malformed import. Keep a photo
    // while another draft references it; new keys encode the identifier pair.
    const referenced=new Set();if(draft.photoKeyVersion!==2){for(const key of await request(store.getAllKeys()))if(String(key).startsWith('draft:')&&key!=='draft:'+id){const other=await request(store.get(key));for(const photoId of other.photoIds??[])referenced.add(draftPhotoKey(other,photoId));}}
    for(const photoId of draft.photoIds??[]){const key=draftPhotoKey(draft,photoId);if(!referenced.has(key))store.delete(key);}store.delete('draft:'+id);
  }
  async deleteDraft(id){return this.transaction(['recovery'],'readwrite',tx=>this.deleteDraftIn(tx,id));}
  async clearDraftRecords(tx){const store=tx.objectStore('recovery'),keys=await request(store.getAllKeys());for(const key of keys)if(String(key).startsWith('draft:')||String(key).startsWith('draft-photo:')||String(key).startsWith('draft-photo-v2:'))store.delete(key);}
  async exportBackup(){return this.transaction(['state','recovery'],'readonly',async tx=>makeBackup(await request(tx.objectStore('state').get(STATE_KEY)),await this.draftRecords(tx)));}
  async legacyExport(){return legacyCompatibleState(await this.read());}
  close(){this.channel?.close();this.db?.close();}
}
