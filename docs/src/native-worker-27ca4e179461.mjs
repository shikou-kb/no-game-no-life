import {Repository} from './storage-27ca4e179461.mjs';
import * as D from './domain-27ca4e179461.mjs';
import {applyPhoneBatch} from './phone-domain-27ca4e179461.mjs';
import {reminderProjection} from './reminders-27ca4e179461.mjs';
const bridge=globalThis.NGNLWorker;let active=false;
export function notificationSnapshot(s){return {revision:s.revision,generation:s.dataGeneration,privacy:s.settings.phone?.privacy??'activity',reminder:reminderProjection(s),running:s.running?{id:s.running.id,scope:(s.running.trackingId||s.running.id)+':'+s.dataGeneration,name:s.running.name+(s.running.temporaryName?' · '+s.running.temporaryName:''),start:s.running.start,confirmedUntil:s.running.confirmedUntil,phoneMode:s.running.phoneMode??'parallel'}:null,context:'',phoneEnabled:!!s.settings.phone?.enabled,notifications:!!s.settings.phone?.notifications,liveUpdates:!!s.settings.phone?.liveUpdates,cursor:s.phone?.cursor??Date.now(),observationCursor:s.phone?.observation?.until??s.phone?.confirmedUntil??Date.now(),historyRequest:s.phone?.historyRequest??0,historyFrom:D.dayStart(D.addDays(D.dateKey(Date.now(),s.timeZone),-1),s.timeZone),historyDayStart:D.dayStart(D.dateKey(Date.now(),s.timeZone),s.timeZone),needsReview:!!s.running?.needsReview,reviewReason:s.running?.reviewReason??'',currentApp:s.phone?.active?.label??''};}
export function nativeCommand(state,command,now=Date.now()){
 if(state.operations.includes(command.id))return {state,status:'already-applied'};
 if(command.generation!==state.dataGeneration||command.runningId!==state.running?.id)return {state,status:'stale'};
 if(command.type!=='stop'||!Number.isSafeInteger(command.at)||command.at>now+1000||command.at<state.running.confirmedUntil)return {state,status:'invalid'};
 return {state:D.switchTimer(state,null,Math.min(command.at,now),command.id),status:state.running.needsReview?'stopped-pending':'stopped'};
}
export async function processBatch(repo,batch){
 let state=await repo.read();const acknowledged=[],results=[];
 if(!batch.editing&&state.running&&batch.runtimeId&&state.running.runtimeId!==batch.runtimeId&&!state.running.needsReview)state=await repo.update(s=>D.markRunningReview(s));
 for(const command of batch.editing?[]:batch.commands??[]){let status;state=await repo.update(s=>{const result=nativeCommand(s,command);status=result.status;return result.state;},{operationId:'receipt:'+command.id});acknowledged.push(command.id);results.push({id:command.id,status:status??'already-received'});}
 if(!batch.editing&&batch.deliveredReminderId&&state.reminders.some(r=>r.id===batch.deliveredReminderId&&r.status==='scheduled'))state=await repo.update(s=>{const r=s.reminders.find(r=>r.id===batch.deliveredReminderId);if(r)r.status='delivered';return s;});
 const known=new Set((state.phone?.observation?.eventLog??[]).map(e=>e.id)),fresh=(batch.events??[]).some(ev=>!known.has(ev.id));
 const gap=batch.gap||!!(batch.first&&state.phone&&state.phone.lastHeartbeat<batch.startedAt-30000);
 if(!batch.editing&&batch.consent&&state.settings.phone?.enabled&&(batch.observation||!batch.foreground||fresh||!batch.available||gap))state=await repo.update(s=>applyPhoneBatch(s,{...batch,gap,historyOnly:!!batch.observation&&batch.foreground&&!fresh&&batch.available&&!gap}),{operationId:batch.id});
 return {id:batch.id,acknowledged,results,snapshot:notificationSnapshot(state)};
}
if(bridge){const repo=new Repository();try{await repo.open();globalThis.ngnlWorkerPump=async batch=>{if(active)return;active=true;try{bridge.complete(JSON.stringify(await processBatch(repo,batch)));}catch(error){bridge.failed(String(error.message||error));}finally{active=false;}};bridge.ready(JSON.stringify(notificationSnapshot(await repo.read())));}catch(error){bridge.failed(String(error.message||error));}}
