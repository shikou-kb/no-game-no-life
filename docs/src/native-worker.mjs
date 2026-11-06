import {Repository} from './storage.mjs';
import * as D from './domain.mjs';
import {applyPhoneBatch} from './phone-domain.mjs';
const bridge=globalThis.NGNLWorker,repo=new Repository();let active=false;
export function notificationSnapshot(s){return {revision:s.revision,running:s.running?{id:s.running.id,scope:s.running.trackingId||s.running.id,name:s.running.name,start:s.running.start,confirmedUntil:s.running.confirmedUntil,phoneMode:s.running.phoneMode??'parallel'}:null,context:s.contextSpans.find(c=>c.end===null)?.name??'',phoneEnabled:!!s.settings.phone?.enabled,notifications:!!s.settings.phone?.notifications,liveUpdates:!!s.settings.phone?.liveUpdates,cursor:s.phone?.cursor??Date.now(),needsReview:!!s.phone?.needsReview,reviewReason:s.phone?.reviewReason??'',currentApp:s.phone?.active?.label??''};}
async function pump(batch){
 if(active)return;active=true;const acknowledged=[];
 try{
  let state=await repo.read();
  const fresh=(batch.events??[]).some(ev=>!state.phone?.seen.includes(ev.id));
  const gap=batch.gap||!!(batch.first&&state.phone&&Math.max(state.phone.lastHeartbeat,state.running?.confirmedUntil??0)<batch.startedAt-30000);
  // Apply persisted user commands before newer observation checkpoints. Otherwise
  // a delayed pump can confirm beyond a stop tap and silently reject that tap.
  for(const command of batch.editing?[]:batch.commands??[]){
   if(command.type!=='stop')continue;
   state=await repo.update(s=>{if(s.running?.id!==command.runningId||s.phone?.needsReview||command.at<s.running.confirmedUntil)return s;return D.switchTimer(s,null,Math.min(command.at,Date.now()),command.id);},{operationId:command.id});acknowledged.push(command.id);
  }
  if(!batch.editing&&batch.consent&&state.settings.phone?.enabled&&(!batch.foreground||fresh||!batch.available||gap))state=await repo.update(s=>applyPhoneBatch(s,{...batch,gap}),{operationId:batch.id});
  bridge.complete(JSON.stringify({id:batch.id,acknowledged,snapshot:notificationSnapshot(state)}));
 }catch(error){bridge.failed(String(error.message||error));}finally{active=false;}
}
if(bridge){try{await repo.open();globalThis.ngnlWorkerPump=pump;bridge.ready();}catch(error){bridge.failed(String(error.message||error));}}
