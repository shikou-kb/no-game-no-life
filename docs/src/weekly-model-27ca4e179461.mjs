import * as D from './domain-27ca4e179461.mjs';
export function weekStart(date){const day=new Date(date+'T12:00:00Z').getUTCDay();return D.addDays(date,-((day+6)%7));}
const parts=(at,zone)=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(at).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
export function wallClockCandidates(date,clock,zone){
 if(!D.isDate(date)||!/^\d{2}:\d{2}$/.test(clock)||Number(clock.slice(0,2))>23||Number(clock.slice(3))>59)return [];
 const target=Date.parse(date+'T'+clock+':00Z'),offsets=new Set(),result=[];
 for(let hours=-36;hours<=36;hours+=6){const t=target+hours*3600000,p=parts(t,zone);offsets.add(Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)-t);}
 for(const offset of offsets){const at=target-offset,p=parts(at,zone);if(p.year+'-'+p.month+'-'+p.day===date&&p.hour+':'+p.minute===clock)result.push(at);}
 return [...new Set(result)].sort((a,b)=>a-b);
}
export function occurrence(state,rule,week,{fallbackVersion=null}={}){
 const version=rule.versions.filter(v=>v.effectiveFrom<=week).at(-1)??fallbackVersion;
 if(!version)return {key:rule.id+':'+week,ruleId:rule.id,week,state:'not-scheduled'};
 const date=D.addDays(week,version.weekday),minute=Number(version.localStart.slice(0,2))*60+Number(version.localStart.slice(3)),endMinute=minute+version.durationMinutes,endDate=D.addDays(date,Math.floor(endMinute/1440)),endClock=String(Math.floor(endMinute%1440/60)).padStart(2,'0')+':'+String(endMinute%60).padStart(2,'0'),zone=version.timeZone??state.timeZone;
 const starts=wallClockCandidates(date,version.localStart,zone),ends=wallClockCandidates(endDate,endClock,zone),common={key:rule.id+':'+week,ruleId:rule.id,week,versionId:version.id,activityId:version.activityId,localStart:version.localStart,durationMinutes:version.durationMinutes,date,endDate,endClock,timeZone:zone,fallback:!!fallbackVersion};
 if(version.paused)return {...common,state:'paused'};
 if(starts.length!==1||ends.length!==1)return {...common,state:'ambiguous'};
 if(!fallbackVersion&&starts[0]<(version.createdAt??0))return {...common,state:'not-scheduled'};
 return {...common,state:'scheduled',start:starts[0],end:ends[0]};
}
export function weeklyCompletion(state,o){return (state.weeklyChecks??[]).find(c=>c.ruleId===o.ruleId&&c.versionId===o.versionId&&c.date===o.date)??null;}
export function setWeeklyCompletion(state,{ruleId,week,versionId,completed},now=Date.now()){
 const s=D.copy(state),rule=s.weeklyRules.find(r=>r.id===ruleId);if(!rule)throw Error('安排已不存在');
 const o=occurrence(s,rule,week);if(!D.isDate(week)||weekStart(week)!==week||o.versionId!==versionId||!['scheduled','ambiguous'].includes(o.state))throw Error('安排已经变化，请重新查看这周');
 if(o.date>D.dateKey(now,s.timeZone))throw Error('未来日期不能提前标记完成');
 const existing=weeklyCompletion(s,o);s.weeklyChecks??=[];
 if(completed&&!existing)s.weeklyChecks.push({id:D.uid(),ruleId,versionId,date:o.date,week,at:now});
 if(!completed&&existing)s.weeklyChecks=s.weeklyChecks.filter(c=>c.id!==existing.id);
 return D.validateState(s);
}
// Browsing a historical week must not choose a future version as its plan.
// The next occurrence is a separate, read-only projection from the real present.
export function nextWeeklyOccurrence(state,rule,now=Date.now()){
 const currentWeek=weekStart(D.dateKey(now,state.timeZone));
 for(let i=0;i<rule.versions.length;i++){
  const version=rule.versions[i],until=rule.versions[i+1]?.effectiveFrom;
  if(version.paused||until&&until<=currentWeek)continue;
  const createdWeek=weekStart(D.dateKey(version.createdAt??now,state.timeZone));
  let week=[currentWeek,version.effectiveFrom,createdWeek].sort().at(-1);
  // If this week's occurrence has started, the following week is the next one,
  // unless another version takes effect first. DST uncertainty stays visible.
  for(let offset=0;offset<2;offset++,week=D.addDays(week,7)){
   if(until&&week>=until)break;
   const o=occurrence(state,rule,week);
   if(o.state==='scheduled'&&o.start>=now)return o;
   if(o.state==='ambiguous'){
    const p=parts(now,o.timeZone),localNow=p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute+':'+p.second;
    if(o.date+'T'+o.localStart+':00'>=localNow)return o;
   }
  }
 }
 return null;
}
export function weeklyPlanSummary(state,rule,week,now=Date.now()){
 const currentWeek=weekStart(D.dateKey(now,state.timeZone)),selected=occurrence(state,rule,week);
 return {currentWeek,selected,selectedVersion:rule.versions.find(v=>v.id===selected.versionId)??null,
  currentVersion:rule.versions.filter(v=>v.effectiveFrom<=currentWeek).at(-1)??null,
  upcoming:rule.versions.flatMap((version,index)=>version.effectiveFrom>currentWeek?[{version,previous:rule.versions[index-1]??null}]:[]),
  next:nextWeeklyOccurrence(state,rule,now)};
}
export function occurrenceActual(state,o,now=Date.now()){
 if(o.state!=='scheduled')return {...o,status:o.state,minutes:null,rows:[]};
 const rows=D.confirmedSessions(state).filter(r=>r.activityId===o.activityId&&D.inRange(r,o.start,o.end)>0),minutes=rows.reduce((n,r)=>n+D.inRange(r,o.start,o.end),0)/60000;
 const pending=[...state.sessions.filter(r=>r.confirmation==='pending'),...(state.running&&state.running.confirmedUntil<now?[{...state.running,start:state.running.confirmedUntil,end:now}]:[])].some(r=>r.activityId===o.activityId&&D.inRange(r,o.start,o.end)>0);
 const notDone=!weeklyCompletion(state,o)&&state.weeklyReviews.some(r=>r.slotId===o.ruleId&&r.weekStart===o.week&&r.notDone);
 const status=now<o.start?'future':pending?'pending':now<o.end?'in-progress':rows.length?'recorded':notDone?'not-done':'unknown';
 return {...o,status,minutes:rows.length?minutes:notDone?0:null,rows,notDone};
}
export function compareWeek(state,rule,week,now=Date.now()){
 const current=occurrenceActual(state,occurrence(state,rule,week),now),priorWeek=D.addDays(week,-7),prior=occurrence(state,rule,priorWeek),v=rule.versions.find(v=>v.id===current.versionId);
 const previous=occurrenceActual(state,prior.state==='not-scheduled'&&v?occurrence(state,rule,priorWeek,{fallbackVersion:v}):prior,now);
 const comparable=['recorded','not-done'].includes(current.status)&&['recorded','not-done'].includes(previous.status)&&current.activityId===previous.activityId&&current.durationMinutes===previous.durationMinutes;
 return {current,previous,comparable,difference:comparable?current.minutes-previous.minutes:null};
}
export function saveWeeklyRule(state,{id=null,title,activityId,weekday,localStart,durationMinutes,effectiveFrom,paused=false},now=Date.now()){
 const s=D.copy(state),week=weekStart(D.dateKey(now,s.timeZone));
 if(!D.isDate(effectiveFrom)||weekStart(effectiveFrom)!==effectiveFrom||effectiveFrom<week)throw Error('只能从本周尚未发生的一次或未来周开始');
 const existing=s.weeklyRules.find(r=>r.id===id),rule=existing??{id:D.uid(),title:String(title).trim(),versions:[]};
 const v={id:D.uid(),effectiveFrom,activityId,weekday:Number(weekday),localStart,durationMinutes:Number(durationMinutes),paused:!!paused,timeZone:s.timeZone,createdAt:now};
 if(!s.activities.some(a=>a.id===activityId&&!a.archived))throw Error('请选择未归档的活动');
 if(!v.paused&&occurrence(s,{...rule,versions:[v]},effectiveFrom).state==='not-scheduled')throw Error('本周这次已开始或结束，请从下周生效');
 const oldVersion=rule.versions.find(x=>x.effectiveFrom===effectiveFrom);if(oldVersion&&effectiveFrom<=week)throw Error('本周已存在生效版本，请从下周修改');
 rule.title=String(title).trim();rule.versions=rule.versions.filter(x=>x.effectiveFrom!==effectiveFrom).concat(v).sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom));if(!existing)s.weeklyRules.push(rule);
 D.validateState(s);
 // Include adjacent weeks so Sunday overnight windows cannot overlap Monday.
 const weeks=new Set([effectiveFrom,...s.weeklyRules.flatMap(r=>r.versions.filter(v=>v.effectiveFrom>=effectiveFrom).map(v=>v.effectiveFrom))].flatMap(w=>[-1,0,1,2].map(i=>D.addDays(w,i*7))));const windows=[];for(const week of weeks)for(const r of s.weeklyRules){const o=occurrence(s,r,week);if(o.state==='scheduled')windows.push(o);}
 windows.sort((a,b)=>a.start-b.start);for(let i=1;i<windows.length;i++)if(windows[i].start<windows[i-1].end)throw Error('每周安排存在重叠，请调整起止；原安排保留');
 return s;
}
export function saveWeeklyReview(state,{id=null,slotId,week,adjustment='',expectation='',notDone=false},now=Date.now()){
 const s=D.copy(state),rule=s.weeklyRules.find(r=>r.id===slotId);if(!rule)throw Error('安排已不存在');
 const current=compareWeek(s,rule,week,now);if(notDone&&!['unknown','not-done'].includes(current.current.status))throw Error('只有已经结束且没有实录的安排可明确标记未做');
 const old=s.weeklyReviews.find(r=>r.id===id),next={...(old??{}),id:old?.id??D.uid(),slotId,weekStart:week,at:now,adjustment:String(adjustment).trim(),expectation:String(expectation).trim(),notDone,status:old?.status??'pending',conclusion:old?.conclusion??'',snapshot:{current:current.current.minutes,previous:current.previous.minutes,revision:s.revision,versionId:current.current.versionId,sourceIds:current.current.rows.map(r=>r.id)},decisions:old?.decisions??[]};
 if(old)s.weeklyReviews[s.weeklyReviews.indexOf(old)]=next;else s.weeklyReviews.push(next);return D.validateState(s);
}
export function reviewAdjustment(state,id,status,conclusion='',now=Date.now()){
 const s=D.copy(state),r=s.weeklyReviews.find(r=>r.id===id);if(!r)throw Error('调整记录已不存在');if(D.dateKey(now,s.timeZone)<D.addDays(r.weekStart,7))throw Error('下一周再复看，原调整已保留');r.status=status;r.conclusion=String(conclusion);r.reviewedAt=now;r.decisions??=[];r.decisions.push({at:now,status,conclusion:r.conclusion});return D.validateState(s);
}
const sourceOf=r=>({start:r.start,end:r.end,activityId:r.activityId,version:r.version,mainSkillId:r.mainSkillId,relatedSkillIds:r.relatedSkillIds,groupId:r.groupId,configVersion:r.configVersion,source:r.source,precision:r.precision});
export function saveExample(state,{id=null,sessionId,kind,unit='',standard='',quantity=null,note=''},now=Date.now()){
 const s=D.copy(state),r=s.sessions.find(r=>r.id===sessionId&&r.confirmation!=='pending');if(!r)throw Error('请从已结束、已确认的完整活动留存表现');
 if(kind==='quantitative'&&(!unit.trim()||!standard.trim()||quantity!==null&&(!Number.isFinite(quantity)||quantity<0)))throw Error('量化表现需要单位、完成标准和非负完成量；空量保持未知');
 if(kind==='subjective'&&!note.trim())throw Error('请留一句自己的体验');
 const existing=s.eventExamples.find(x=>x.id===id)??s.eventExamples.find(x=>x.sessionId===sessionId&&x.kind===kind&&x.unit===unit.trim()&&x.standard===standard.trim());
 const next={id:existing?.id??D.uid(),sessionId,activityId:r.activityId,kind,unit:kind==='quantitative'?unit.trim():'',standard:kind==='quantitative'?standard.trim():'',quantity:kind==='quantitative'?quantity:null,note,at:existing?.at??now,updatedAt:now,source:sourceOf(r),needsReview:false};
 if(existing)s.eventExamples[s.eventExamples.indexOf(existing)]=next;else s.eventExamples.push(next);return D.validateState(s);
}
export function reconcileExamples(before,next){
 for(const e of next.eventExamples){const previous=before.eventExamples.find(x=>x.id===e.id);if(!previous)continue;const old=before.sessions.find(r=>r.id===e.sessionId),row=next.sessions.find(r=>r.id===e.sessionId);
  if(!row||row.confirmation==='pending'||old&&JSON.stringify(sourceOf(row))!==JSON.stringify(sourceOf(old))){e.needsReview=true;e.reviewReason='原记录已更正，请确认仍是同一次完整事件';}
 }return next;
}
export function exampleValue(state,e){const row=state.sessions.find(r=>r.id===e.sessionId),valid=!!row&&row.confirmation!=='pending'&&!e.needsReview&&row.activityId===e.activityId&&JSON.stringify(sourceOf(row))===JSON.stringify(e.source),duration=valid?row.end-row.start:null;return {example:e,row,valid,duration,rate:valid&&e.kind==='quantitative'&&e.quantity!==null&&duration>0?e.quantity*3600000/duration:null};}
export function personalBests(state){const groups=new Map();for(const e of state.eventExamples){if(e.kind!=='quantitative')continue;const key=JSON.stringify([e.activityId,e.unit,e.standard]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(exampleValue(state,e));}return [...groups.entries()].map(([key,all])=>{const values=all.filter(v=>v.rate!==null),max=values.length?Math.max(...values.map(v=>v.rate)):null;return {key,all,values,highest:values.length>=2&&max>0?values.filter(v=>v.rate===max):[],sampleCount:values.length};});}
