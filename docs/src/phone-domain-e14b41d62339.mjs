import {observePhone,usageSummary,reconstructUsage,phoneRows,mergeWindows,initializeLegacyProtection} from './phone-observation-e14b41d62339.mjs';
import * as D from './domain-e14b41d62339.mjs';
import {groupIdForCategory} from './activity-policy-e14b41d62339.mjs';
export function enablePhone(state,options={},now=Date.now()){
 const continuing=!!state.settings.phone?.enabled&&!!state.phone&&!state.phone.needsReview;
 const out=D.copy(state);out.settings.phone={...out.settings.phone,enabled:true,interruptPackages:[...new Set(options.interruptPackages??out.settings.phone?.interruptPackages??[])],notifications:out.settings.phone?.notifications??true};
 let activity=out.activities.find(a=>a.isPhoneActivity);if(!activity){activity={id:D.uid(),name:'手机使用',category:out.schemaVersion>=4?'其他':'娱乐',color:'#596c80',favorite:false,mainline:false,mainSkillId:null,relatedSkillIds:[],investmentKind:null,phoneMode:'parallel',isPhoneActivity:true,groupId:out.schemaVersion>=4?'category-other':groupIdForCategory('娱乐'),growthMode:'none',configVersion:1};out.activities.push(activity);}
 // Rechecking permission must not discard confirmed usage or the interrupted activity.
 if(out.phone)initializeLegacyProtection(out.phone,now);
 if(continuing){out.phone.historyRequest=now;return D.validateState(out);}
 if(out.phone)closeSpan(out,out.phone.confirmedUntil);
 out.phone={...out.phone,legacyProtection:out.phone?.legacyProtection??[],legacyProtectionPolicy:2,spans:out.phone?.spans??[],seen:[],cursor:now,confirmedUntil:now,enabledAt:now,active:null,autoActive:null,autoConfirmedUntil:now,automation:null,locked:false,needsReview:false,reviewReason:null,phoneActivityId:activity.id,lastHeartbeat:now,historyRequest:now};return D.validateState(out);
}
function closeSpan(out,end){const p=out.phone;if(p.active&&end>p.active.start)p.spans.push({...p.active,id:p.active.id??D.uid(),end,ongoing:false,precision:'system-event'});p.active=null;}
function restorePrimary(out,at){const auto=out.phone.automation;if(!auto)return out;out.phone.automation=null;if(out.running?.id!==auto.phoneRunningId)return out;
 if(at<out.running.confirmedUntil){out.phone.needsReview=true;out.phone.reviewReason='系统事件到达较晚，请核对主活动边界';return out;}
 const restored=D.switchTimer(out,auto.base.activityId,at,D.uid(),{countStart:false});restored.running={...auto.base,id:restored.running.id,start:at,end:null,confirmedUntil:at,version:1};return restored;
}
function interruptPrimary(out,event){
 if(!out.running||out.running.needsReview||out.phone.needsReview)return out;
 if(out.phone.automation&&out.running.id!==out.phone.automation.phoneRunningId)out.phone.automation=null;
 if(out.phone.automation)return out;
 if(out.running.phoneMode!=='focus'||!out.settings.phone.interruptPackages.includes(event.packageName))return out;
 if(event.at<out.running.confirmedUntil){out.phone.needsReview=true;out.phone.reviewReason='较晚收到的App事件与已确认主活动交叉，请核对';return out;}
 const base={...D.copy(out.running),trackingId:out.running.trackingId||out.running.id},next=D.switchTimer(out,out.phone.phoneActivityId,event.at,D.uid(),{countStart:false});next.running.trackingId=base.trackingId||base.id;next.phone.automation={base,phoneRunningId:next.running.id};return next;
}
function freeze(out,reason){const p=out.phone;closeSpan(out,p.confirmedUntil);p.needsReview=true;p.reviewReason=reason;if(out.running?.phoneMode==='focus')out=D.markRunningReview(out,reason);return D.validateState(out);}
function applyLegacyBatch(state,batch){
 if(!state.settings.phone?.enabled||!state.phone)return state;
 let out=D.copy(state),p=out.phone;
 if(!batch.available)return freeze(out,'手机使用权限不可用，自动记录已暂停，请核对未确认尾段');
 if(batch.gap)return freeze(out,'后台运行出现缺口，自动结算暂停；已确认记录保留');
 if(p.needsReview)return out;
 if(!Number.isSafeInteger(batch.until)||batch.until<p.cursor)return out;
 const seen=new Set(p.seen),events=(batch.events??[]).filter(event=>Number.isSafeInteger(event.at)&&event.at>=p.enabledAt&&event.at<=batch.until&&!seen.has(event.id)).sort((a,b)=>a.at-b.at);
 for(const event of events){
  if(typeof event.id!=='string'||event.id.length>600||!['resume','pause','lock','unlock'].includes(event.type)||typeof event.packageName!=='string'||event.packageName.length>200)throw new Error('手机事件格式无效，未更改记录');
  if(seen.has(event.id))continue;seen.add(event.id);
  if(event.at<p.cursor){p.needsReview=true;p.reviewReason='收到较早的系统事件，请核对自动记录边界';continue;}
  if(event.type==='resume'){
   closeSpan(out,event.at);p.locked=false;
   if(!out.settings.phone.interruptPackages.includes(event.packageName))out=restorePrimary(out,event.at);
   p=out.phone;if(event.packageName&&event.packageName!=='com.ngnl.local'){p.active={packageName:event.packageName,label:String(event.label||event.packageName).slice(0,200),start:event.at};out=interruptPrimary(out,event);p=out.phone;}
  }else if(event.type==='pause'){
   if(p.active?.packageName===event.packageName){closeSpan(out,event.at);out=restorePrimary(out,event.at);p=out.phone;}
  }else if(event.type==='lock'){closeSpan(out,event.at);p.locked=true;out=restorePrimary(out,event.at);p=out.phone;}
  else p.locked=false;
  p.cursor=event.at;
 }
 p.seen=[...seen].slice(-2000);p.cursor=batch.until;p.lastHeartbeat=batch.until;
 if(!p.needsReview){p.confirmedUntil=batch.until;if(out.running&&batch.until>=out.running.start)out=D.checkpointRunning(out,batch.until);}else closeSpan(out,p.confirmedUntil);
 return D.validateState(out);
}
export function applyPhoneBatch(state,batch){
 if(!batch.observation)return applyLegacyBatch(state,batch);
 if(!state.settings.phone?.enabled||!state.phone)return state;
 if(state.phone.observation?.until>batch.observation.until)return state;
 const observed=observePhone(state.phone,batch.observation,state.timeZone);
 let automated=D.copy(state);
 if(!batch.historyOnly&&!batch.editing){
  const scratch=D.copy(state);scratch.phone.spans=[];scratch.phone.active=state.phone.autoActive??null;scratch.phone.confirmedUntil=state.phone.autoConfirmedUntil??state.phone.cursor;
  const o=observed.observation,rows=o?reconstructUsage(o.eventLog,o.windows,o.until??state.phone.cursor,null,{...o.barriers}).rows:[];
  const events=(o?.eventLog??[]).filter(e=>e.type==='lock'||e.type==='unlock').map(e=>({...e,id:'auto-'+e.type+':'+e.at}));for(const row of rows){events.push({id:'auto-resume:'+row.start+':'+row.packageName,at:row.start,type:'resume',packageName:row.packageName,label:row.label});if(row.endKnown&&!row.ongoing)events.push({id:'auto-pause:'+row.end+':'+row.packageName,at:row.end,type:'pause',packageName:row.packageName,label:row.label});}
  automated=applyLegacyBatch(scratch,{...batch,events:events.filter(e=>e.at>=Math.max(state.phone.enabledAt,state.phone.autoFrom??0)&&e.at<=batch.until&&(e.at>=state.phone.cursor||!state.phone.seen.includes(e.id))),available:batch.available&&batch.observation.available,gap:batch.gap||!batch.observation.complete||!!(batch.observation.locked&&o?.unknown?.some(w=>w.reason==='锁屏边界未返回'&&w.end===batch.until))});
  automated.phone.autoActive=automated.phone.active;automated.phone.autoConfirmedUntil=automated.phone.confirmedUntil;
 }
 automated.phone={...automated.phone,spans:observed.spans,active:observed.active,confirmedUntil:observed.confirmedUntil,observation:observed.observation,corrections:observed.corrections,legacyProtection:observed.legacyProtection,legacyProtectionPolicy:observed.legacyProtectionPolicy};
 return D.validateState(automated);
}
export function correctPhoneSpan(state,id,{start,end,remove=false}){
 const out=D.copy(state),p=out.phone,index=p?.spans.findIndex(r=>r.id===id),original=p?.spans[index];if(!original)throw Error('这条手机记录已变化，请重新核对');
 const replacement=remove?null:{...original,start,end,ongoing:false,continuous:false,correctedAt:Date.now(),precision:'manual'};
 if(replacement&&(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start))throw Error('请填写先后正确的手机时段');
 if(replacement&&p.spans.some((r,i)=>i!==index&&start<r.end&&end>r.start))throw Error('手机使用时段重叠，请先核对相邻记录');
 p.corrections??=[];p.corrections.push({id:D.uid(),start:Math.min(original.start,start??original.start),end:Math.max(original.end,end??original.end),replacement});p.spans.splice(index,1,...(replacement?[replacement]:[]));p.spans.sort((a,b)=>a.start-b.start);
 return D.validateState(out);
}
export function requestPhoneHistory(state,replaceLegacy=false,now=Date.now()){
 const out=D.copy(state),p=out.phone;if(!p||!out.settings.phone?.enabled)throw Error('请先启用手机使用记录');
 initializeLegacyProtection(p,now);
 const from=D.dayStart(D.dateKey(now,out.timeZone),out.timeZone);
 if(replaceLegacy){
  p.rebuildUndo={from,until:now,rows:phoneRows(p).filter(r=>r.start<now&&r.end>from).map(r=>({...r,id:r.start<from?D.uid():r.id,start:Math.max(from,r.start),end:Math.min(now,r.end),ongoing:false,...(r.start<from||r.end>now?{continuous:false,startKnown:false}:{})}))};
  p.legacyProtection=(p.legacyProtection??[]).flatMap(w=>w.end<=from||w.start>=now?[w]:[...(w.start<from?[{start:w.start,end:from}]:[]),...(w.end>now?[{start:now,end:w.end}]:[])]);
 }
 p.historyRequest=now;return D.validateState(out);
}
export function undoPhoneRebuild(state){
 const out=D.copy(state),p=out.phone,b=p?.rebuildUndo;if(!b)throw Error('没有可恢复的重建前手机记录');
 const rows=phoneRows(p).flatMap(r=>r.end<=b.from||r.start>=b.until?[r]:[...(r.start<b.from?[{...r,end:b.from,ongoing:false,continuous:false}]:[]),...(r.end>b.until?[{...r,id:D.uid(),start:b.until,startKnown:false,continuous:false}]:[])]);
 rows.push(...b.rows);rows.sort((a,c)=>a.start-c.start);const last=rows.at(-1);p.active=last?.ongoing?{...last}:null;if(p.active){delete p.active.end;rows.pop();}p.spans=rows;p.legacyProtection=mergeWindows([...(p.legacyProtection??[]),{start:b.from,end:b.until}]);p.rebuildUndo=null;
 return D.validateState(out);
}
export function stopPhone(state,now=Date.now()){
 let out=D.copy(state);if(!out.phone){out.settings.phone={...out.settings.phone,enabled:false};return out;}
 if(out.phone.observation){closeSpan(out,out.phone.confirmedUntil);out.phone.autoActive=null;if(!out.phone.needsReview)out=restorePrimary(out,now);}
 else if(!out.phone.needsReview){out=applyPhoneBatch(out,{available:true,events:[],until:now});closeSpan(out,now);out=restorePrimary(out,now);}else closeSpan(out,out.phone.confirmedUntil);
 out.settings.phone.enabled=false;return D.validateState(out);
}
export function phoneSummary(state,start=0,end=Infinity){return usageSummary(state.phone,start,end);}
