import * as D from './domain.mjs';
export function enablePhone(state,options={},now=Date.now()){
 const continuing=!!state.settings.phone?.enabled&&!!state.phone&&!state.phone.needsReview;
 const out=D.copy(state);out.settings.phone={...out.settings.phone,enabled:true,interruptPackages:[...new Set(options.interruptPackages??out.settings.phone?.interruptPackages??[])],notifications:out.settings.phone?.notifications??true};
 let activity=out.activities.find(a=>a.isPhoneActivity);if(!activity){activity={id:D.uid(),name:'手机使用',category:'娱乐',color:'#8a91a8',favorite:false,mainline:false,mainSkillId:null,relatedSkillIds:[],investmentKind:null,phoneMode:'parallel',isPhoneActivity:true};out.activities.push(activity);}
 // Rechecking permission must not discard confirmed usage or the interrupted activity.
 if(continuing)return D.validateState(out);
 if(out.phone)closeSpan(out,out.phone.confirmedUntil);
 out.phone={spans:out.phone?.spans??[],seen:[],cursor:now,confirmedUntil:now,enabledAt:now,active:null,automation:null,locked:false,needsReview:false,reviewReason:null,phoneActivityId:activity.id,lastHeartbeat:now};return D.validateState(out);
}
function closeSpan(out,end){const p=out.phone;if(p.active&&end>p.active.start)p.spans.push({...p.active,id:D.uid(),end,precision:'system-event'});p.active=null;}
function restorePrimary(out,at){const auto=out.phone.automation;if(!auto)return out;out.phone.automation=null;if(out.running?.id!==auto.phoneRunningId)return out;
 if(at<out.running.confirmedUntil){out.phone.needsReview=true;out.phone.reviewReason='系统事件到达较晚，请核对主活动边界';return out;}
 const restored=D.switchTimer(out,auto.base.activityId,at);restored.running={...auto.base,id:restored.running.id,start:at,end:null,confirmedUntil:at,version:1};return restored;
}
function interruptPrimary(out,event){
 if(!out.running||out.phone.needsReview)return out;
 if(out.phone.automation&&out.running.id!==out.phone.automation.phoneRunningId)out.phone.automation=null;
 if(out.phone.automation)return out;
 if(out.running.phoneMode!=='focus'||!out.settings.phone.interruptPackages.includes(event.packageName))return out;
 if(event.at<out.running.confirmedUntil){out.phone.needsReview=true;out.phone.reviewReason='较晚收到的App事件与已确认主活动交叉，请核对';return out;}
 const base={...D.copy(out.running),trackingId:out.running.trackingId||out.running.id},next=D.switchTimer(out,out.phone.phoneActivityId,event.at);next.running.trackingId=base.trackingId||base.id;next.phone.automation={base,phoneRunningId:next.running.id};return next;
}
function freeze(out,reason){const p=out.phone;closeSpan(out,p.confirmedUntil);p.needsReview=true;p.reviewReason=reason;return D.validateState(out);}
export function applyPhoneBatch(state,batch){
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
 if(!p.needsReview){p.confirmedUntil=batch.until;if(out.running&&batch.until>=out.running.start)out=D.confirmRunning(out,batch.until);}else closeSpan(out,p.confirmedUntil);
 return D.validateState(out);
}
export function stopPhone(state,now=Date.now()){
 let out=D.copy(state);if(!out.phone){out.settings.phone={...out.settings.phone,enabled:false};return out;}
 if(!out.phone.needsReview){out=applyPhoneBatch(out,{available:true,events:[],until:now});closeSpan(out,now);out=restorePrimary(out,now);}else closeSpan(out,out.phone.confirmedUntil);
 out.settings.phone.enabled=false;return D.validateState(out);
}
export function phoneSummary(state,start=0,end=Infinity){
 const p=state.phone,rows=[...(p?.spans??[]),...(p?.active&&p.confirmedUntil>p.active.start?[{...p.active,end:p.confirmedUntil}]:[])],byPackage=Object.create(null);let totalMinutes=0;
 for(const row of rows){const minutes=Math.max(0,Math.min(end,row.end)-Math.max(start,row.start))/60000;if(!minutes)continue;totalMinutes+=minutes;byPackage[row.packageName]??={label:row.label,minutes:0};byPackage[row.packageName].minutes+=minutes;}
 return {totalMinutes,byPackage};
}
