import {orderedGroups,orderedLabels,shadeColor} from './catalog-order-27ca4e179461.mjs';
import {dateKey,addDays,dayStart,isDate} from './calendar-27ca4e179461.mjs';
import {effectiveActivity,emptyPolicy} from './activity-policy-27ca4e179461.mjs';
const copy=x=>structuredClone(x),id=()=>globalThis.crypto?.randomUUID?.()??'r4-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const assert=(v,m)=>{if(!v)throw Error(m);};
export const DEFAULT_GROUPS=[['life','生活','#187C72'],['rest','休息','#7757AB'],['invest','投入','#285FC8'],['phase','阶段','#936100'],['other','其他','#596C80']];
const builtins={sleep:'rest',rest:'rest',meal:'life',wash:'life',commute:'life',chores:'life',study:'invest',work:'invest',exercise:'invest',social:'other',play:'other'};
export function initializeRebuild(input,{fresh=false,at=Date.now()}={}){
 const s=copy(input);if(s.schemaVersion===4)return s;s.schemaVersion=4;
 const oldGroups=new Set(s.activityGroups.map(g=>g.id));
 for(const [key,name,color] of DEFAULT_GROUPS)s.activityGroups.push({id:'category-'+key,name,color,order:s.activityGroups.length,archived:false,growthPolicy:emptyPolicy(),version:1});
 for(const a of s.activities){
  // Only recognized bundled leaves move. Custom groups and their leaves remain intact.
  const categoryKey=builtins[a.id]??(a.isPhoneActivity?'other':null);
  if(categoryKey&&/^group-(life|study|work|exercise|social|play|chores|commute)$/.test(a.groupId)){
   const effective=effectiveActivity(s,a),key=categoryKey,group=s.activityGroups.find(g=>g.id==='category-'+key);
   a.legacyGroupId=a.groupId;a.mainSkillId=effective.mainSkillId;a.relatedSkillIds=effective.relatedSkillIds;a.growthMode=effective.mainSkillId?'override':'none';a.groupId=group.id;a.category=group.name;a.color=group.color;
  }
 }
 for(const g of s.activityGroups)if(oldGroups.has(g.id)&&!s.activities.some(a=>a.groupId===g.id))g.archived=true;
 if(fresh){
  s.appearance.cover={mode:'default',assetId:null};
  s.activities=s.activities.filter(a=>!['chores','social','play'].includes(a.id));
  for(const [key,name,groupKey] of [['phase-default','阶段投入','phase'],['other-default','其他','other']]){const g=s.activityGroups.find(g=>g.id==='category-'+groupKey);s.activities.push({id:key,name,groupId:g.id,category:g.name,color:g.color,growthMode:'none',mainSkillId:null,relatedSkillIds:[],favorite:false,mainline:false,archived:false,phoneMode:'parallel'});}
  const work=s.activities.find(a=>a.id==='work'),skill={id:id(),kind:'investment',name:'工作积累',composition:'领域技能',templateId:null,stages:[],status:'active',createdAt:at,baselineAt:at,baselinePoints:0};
  s.skills.push(skill);work.mainSkillId=skill.id;work.growthMode='override';s.defaultPack.investmentIds.work=skill.id;
  s.activityConfigHistory=s.activities.map(a=>({id:id(),activityId:a.id,effectiveAt:at,snapshot:effectiveActivity(s,a)}));
 }else for(const a of s.activities)s.activityConfigHistory.push({id:id(),activityId:a.id,effectiveAt:at,snapshot:effectiveActivity(s,a)});
 s.phases=s.plans.map(p=>({id:p.id,title:p.title,startDate:p.startDate,endDate:p.endDate,skillIds:[...p.skillIds],note:'',archived:false,createdAt:at}));
 for(const p of s.plans)p.phaseId=p.id;
 s.habits=[];s.habitChecks=[];s.iterationNodes=[];s.iterationEntries=[];
 for(const [key,name]of [['class','上课'],['work','工作'],['vacation','假期']]){
  const root='cycle:'+key;s.iterationNodes.push({id:root,branch:'time',parentId:null,kind:'category',title:name,archived:false,createdAt:at});
  for(const [suffix,title]of [['weekday','周内'],['weekend','周末']])s.iterationNodes.push({id:root+':'+suffix,branch:'time',parentId:root,kind:'category',title,archived:false,createdAt:at});
 }
 s.rebuild={version:1,guideStep:0,guideDone:false,includeDiaryTime:true,quickOrder:fresh?['study','meal','sleep']:null};s.recordUndo=null;
 return s;
}
export function displayGroup(s,row){
 const g=s.activityGroups.find(g=>g.id===row.groupId);
 if(g&&!g.archived)return g;
 if(builtins[row.activityId??row.id]&&/^group-/.test(row.groupId??''))return s.activityGroups.find(g=>g.id==='category-'+builtins[row.activityId??row.id])??g;
 return g??{id:row.groupId??row.category,name:row.category,color:row.color??'#7b929e'};
}
export function activeGroups(s){return orderedGroups(s).filter(g=>!g.archived);}
export function labelColor(s,row){if(row.activityId&&row.color&&s.activities.find(a=>a.id===row.activityId)?.groupId!==row.groupId)return row.color;const g=displayGroup(s,row),members=orderedLabels(s,g.id),a=members.find(a=>a.id===(row.activityId??row.id)),i=Math.max(0,members.indexOf(a));return shadeColor(g?.color??row.color,a?.colorShade??Math.min(.4,i*.065));}
export function inStatisticsScope(s,row,{groupId=null,activityId=null,temporaryName=null}={}){return (!groupId||displayGroup(s,row).id===groupId)&&(!activityId||row.activityId===activityId)&&(temporaryName===null||row.temporaryName===temporaryName);}
export function statisticsRange(date,mode='day'){
 assert(isDate(date),'请选择有效日期');
 if(mode==='week'){const weekday=new Date(date+'T12:00:00Z').getUTCDay(),start=addDays(date,-((weekday+6)%7));return {start,end:addDays(start,6)};}
 if(mode==='month'){const d=new Date(date+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1,1);return {start:date.slice(0,7)+'-01',end:addDays(d.toISOString().slice(0,10),-1)};}
 return {start:date,end:date};
}
export function shiftStatisticsDate(date,mode,step){
 assert([-1,1].includes(step),'范围切换无效');
 if(mode!=='month')return addDays(date,step*(mode==='week'?7:1));
 const d=new Date(date.slice(0,7)+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+step);const first=d.toISOString().slice(0,10),last=statisticsRange(first,'month').end;
 return first.slice(0,8)+String(Math.min(Number(date.slice(-2)),Number(last.slice(-2)))).padStart(2,'0');
}
export function rangeStatistics(s,startDate,endDate,{now=Date.now(),groupId=null,activityId=null,temporaryName=null}={}){
 assert(isDate(startDate)&&isDate(endDate)&&endDate>=startDate,'请选择有效日期范围');
 const start=dayStart(startDate,s.timeZone),end=dayStart(addDays(endDate,1),s.timeZone);assert(end-start<=367*86400000,'一次最多查看366天');
 const until=Math.max(start,Math.min(end,now)),rows=s.sessions.filter(r=>r.confirmation!=='pending').map(r=>({...r,live:false}));
 if(s.running){const r=s.running;if(r.confirmedUntil>r.start)rows.push({...r,end:r.confirmedUntil,live:false});if(!r.needsReview&&now>r.confirmedUntil)rows.push({...r,start:r.confirmedUntil,end:now,live:true});}
 const clipped=rows.filter(r=>r.end>start&&r.start<until).map(r=>({...r,start:Math.max(r.start,start),end:Math.min(r.end,until)}));
 const groups=new Map(),labels=new Map(),temporaries=new Map();let confirmed=0,live=0;
 for(const r of clipped){const ms=r.end-r.start;if(r.live){live+=ms;continue;}const g=displayGroup(s,r),key=r.activityId;const add=(map,key,item)=>{const x=map.get(key)??{...item,ms:0,confirmedMs:0,liveMs:0};x.ms+=ms;x[r.live?'liveMs':'confirmedMs']+=ms;map.set(key,x);};
  add(groups,g.id,{id:g.id,name:g.name,color:g.color??r.color});add(labels,JSON.stringify([g.id,key]),{id:key,groupId:g.id,name:s.activities.find(a=>a.id===key)?.name??r.name,color:labelColor(s,r)});if(r.temporaryName)add(temporaries,JSON.stringify([g.id,key,r.temporaryName]),{groupId:g.id,activityId:key,name:r.temporaryName});confirmed+=ms;
 }
 const total=confirmed,pct=x=>({...x,percent:total?x.ms/total*100:0});
 const trend=[];for(let d=startDate;d<=endDate;d=addDays(d,1)){const a=dayStart(d,s.timeZone),b=Math.min(dayStart(addDays(d,1),s.timeZone),now);trend.push({date:d,status:d>dateKey(now,s.timeZone)?'future':d===dateKey(now,s.timeZone)?'current':'past',ms:a>now?null:clipped.filter(r=>!r.live&&inStatisticsScope(s,r,{groupId,activityId,temporaryName})).reduce((n,r)=>n+Math.max(0,Math.min(b,r.end)-Math.max(a,r.start)),0)});}
 return {start,end,until,rows:clipped,totalMs:total,confirmedMs:confirmed,liveMs:live,elapsedMs:Math.max(0,until-start),blankMs:Math.max(0,until-start-total),groups:[...groups.values()].map(pct),labels:[...labels.values()].map(pct),temporaries:[...temporaries.values()].map(pct),trend};
}
export function sleepRecords(s){return s.sessions.filter(r=>r.activityId==='sleep'&&r.confirmation!=='pending').map(r=>({id:r.id,bedAt:r.start,wakeAt:r.end,ms:r.end-r.start,date:dateKey(r.end,s.timeZone),source:'record-boundaries'})).sort((a,b)=>b.wakeAt-a.wakeAt);}
export function savePhase(state,value){const s=copy(state),p={id:value.id??id(),title:String(value.title??'').trim(),startDate:value.startDate,endDate:value.endDate,skillIds:[...new Set(value.skillIds??[])],note:String(value.note??''),archived:!!value.archived,createdAt:value.createdAt??Date.now()};assert(p.title&&isDate(p.startDate)&&isDate(p.endDate)&&p.startDate<=p.endDate,'请填写阶段名称及有效日期');const old=s.phases.findIndex(x=>x.id===p.id);if(old<0)s.phases.push(p);else s.phases[old]={...s.phases[old],...p};return s;}
export function setHabitCheck(state,habitId,date,checked,at=Date.now()){
 const s=copy(state),habit=s.habits.find(h=>h.id===habitId);assert(habit,'习惯不存在');assert(isDate(date)&&date<=dateKey(at,habit.timeZone??s.timeZone),'不能打卡未来日期');assert(!habit.startDate||date>=habit.startDate,'该日期早于习惯开始日期');s.habitChecks=s.habitChecks.filter(c=>!(c.habitId===habitId&&c.date===date));if(checked)s.habitChecks.push({id:habitId+':'+date,habitId,date,at,timeZone:habit.timeZone??s.timeZone});return s;
}
export function habitSummary(s,habitId,today=dateKey(Date.now(),s.timeZone)){const dates=new Set(s.habitChecks.filter(c=>c.habitId===habitId&&c.date<=today).map(c=>c.date));let current=0,d=dates.has(today)?today:addDays(today,-1);while(dates.has(d)){current++;d=addDays(d,-1);}let best=0,streak=0,prev=null;for(const date of [...dates].sort()){streak=prev&&addDays(prev,1)===date?streak+1:1;best=Math.max(best,streak);prev=date;}return {total:dates.size,current,best,checked:dates.has(today),dates};}
export function saveIterationNode(state,value){const s=copy(state),node={id:value.id??id(),branch:value.branch,parentId:value.parentId||null,kind:value.kind??'project',title:String(value.title??'').trim(),archived:!!value.archived,createdAt:value.createdAt??Date.now()};assert(['time','event'].includes(node.branch)&&node.title,'请选择分支并填写名称');let parent=node.parentId,depth=0;while(parent){assert(parent!==node.id,'不能将项目放到自己的子项里');const p=s.iterationNodes.find(n=>n.id===parent);assert(p&&p.branch===node.branch,'上级项目失联或分支不一致');parent=p.parentId;assert(++depth<12,'最多支持12层，请减少层级');}const i=s.iterationNodes.findIndex(n=>n.id===node.id);if(i<0)s.iterationNodes.push(node);else s.iterationNodes[i]=node;return s;}
export const ITERATION_FIELDS=[['environment','外部环境'],['emotion','情绪状态'],['execution','执行时间'],['efficiency','效率自评'],['extra','其他补充']];
export function saveIterationEntry(state,value){const s=copy(state),node=s.iterationNodes.find(n=>n.id===value.nodeId);assert(node,'项目不存在');const old=s.iterationEntries.find(x=>x.id===value.id),entry={id:value.id??id(),nodeId:node.id,at:value.at,sequence:old?.sequence??Math.max(0,...s.iterationEntries.filter(x=>x.nodeId===node.id).map(x=>x.sequence))+1,reference:!!value.reference,method:String(value.method??''),createdAt:old?.createdAt??Date.now(),updatedAt:Date.now()};for(const [key] of ITERATION_FIELDS)entry[key]=String(value[key]??'').trim();assert(ITERATION_FIELDS.some(([k])=>entry[k])||entry.method.trim(),'写一项即可，其余可以留空');assert(Number.isSafeInteger(entry.at)&&entry.at>=0,'记录日期无效');const i=s.iterationEntries.findIndex(x=>x.id===entry.id);if(i<0)s.iterationEntries.push(entry);else s.iterationEntries[i]=entry;return s;}
export function iterationPath(s,nodeId){const path=[],seen=new Set();let n=s.iterationNodes.find(n=>n.id===nodeId);while(n&&!seen.has(n.id)){seen.add(n.id);path.unshift(n.title);n=s.iterationNodes.find(p=>p.id===n.parentId);}return path.join(' / ');}
export function recordSnapshot(s){return copy({sessions:s.sessions,running:s.running,plans:s.plans,contextSpans:s.contextSpans,eventExamples:s.eventExamples,momentLinks:s.moments.map(m=>({id:m.id,sessionId:m.sessionId,originalSessionId:m.originalSessionId,title:m.title}))});}
export function rememberRecordChange(before,after){const s=copy(after);s.recordUndo={before:recordSnapshot(before),after:recordSnapshot(after),at:Date.now()};return s;}
export function undoRecordChange(state){const s=copy(state),u=s.recordUndo;assert(u,'没有可撤回的时间修改');assert(JSON.stringify(recordSnapshot(s))===JSON.stringify(u.after),'记录在修改后又有变化，请从概览重新调整');const {momentLinks,...fields}=copy(u.before);Object.assign(s,fields);for(const link of momentLinks){const m=s.moments.find(m=>m.id===link.id);if(m){m.sessionId=link.sessionId;m.originalSessionId=link.originalSessionId;m.title=link.title;}}s.recordUndo=null;return s;}

export function iterationNumber(s,entry){return s.iterationEntries.filter(v=>v.nodeId===entry.nodeId).sort((a,b)=>a.at-b.at||a.createdAt-b.createdAt||a.id.localeCompare(b.id)).findIndex(v=>v.id===entry.id)+1;}
export function iterationArchived(s,node){const seen=new Set();let n=node;while(n&&!seen.has(n.id)){if(n.archived)return true;seen.add(n.id);n=s.iterationNodes.find(p=>p.id===n.parentId);}return false;}

export function ensurePlanFrames(s){for(const p of s.plans)if(!p.phaseId){p.phaseId=p.id;if(!s.phases.some(f=>f.id===p.id))s.phases.push({id:p.id,title:p.title,startDate:p.startDate,endDate:p.endDate,skillIds:[...p.skillIds],note:'',archived:false,createdAt:Date.now()});}return s;}
