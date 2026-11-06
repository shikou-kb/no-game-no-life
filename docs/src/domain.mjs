import { TEMPLATES } from './templates.mjs';
export { TEMPLATES };
import {defaultActivities} from './catalog.mjs';
import {dateKey,addDays,isDate,dayStart,localInput,parseLocal} from './calendar.mjs';
import {validateState,validateLegacyState} from './schema.mjs';
export {dateKey,addDays,isDate,dayStart,localInput,parseLocal,validateState,validateLegacyState};
export const SCHEMA_VERSION = 2;
const assert=(v,message)=>{if(!v)throw new Error(message);};
export const uid = () => globalThis.crypto?.randomUUID?.() ?? 'id-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
export const copy = value => structuredClone(value);
const fail = message => { throw new Error(message); };
const gcd = (a,b) => b ? gcd(b,a%b) : a;
export class Fraction {
  constructor(n=0n,d=1n) { n=BigInt(n);d=BigInt(d);if(d<=0n)fail('无效比例');const g=gcd(n<0n?-n:n,d);this.n=n/g;this.d=d/g; }
  add(other) { return new Fraction(this.n*other.d+other.n*this.d,this.d*other.d); }
  sub(other) { return this.add(new Fraction(-other.n,other.d)); }
  compare(other) {const v=this.n*other.d-other.n*this.d;return v<0n?-1:v>0n?1:0;}
  toNumber() { return Number(this.n)/Number(this.d); }
  toString() { return `${this.n}/${this.d}`; }
}
const pointsFraction = n => new Fraction(BigInt(Math.round(n*60000)),60000n);
export function createState() {
  return {schemaVersion:SCHEMA_VERSION,revision:0,createdAt:Date.now(),timeZone:'Asia/Shanghai',activities:defaultActivities(),skills:[],sessions:[],running:null,moments:[],dailyNotes:{},plans:[],assessments:[],operations:[],contextSpans:[],settings:{theme:'green',reducedMotion:false,onboarding:'new'}};
}
export function confirmedSessions(state) {
  return state.running && state.running.confirmedUntil>state.running.start ? [...state.sessions,{...state.running,end:state.running.confirmedUntil}] : state.sessions;
}
export function inRange(session,start,end) { return Math.max(0,Math.min(session.end,end)-Math.max(session.start,start)); }
export function sessionsInRange(state,startDate,endDate) {
  const a=dayStart(startDate,state.timeZone),b=dayStart(addDays(endDate,1),state.timeZone);
  return confirmedSessions(state).filter(s=>inRange(s,a,b)>0).map(s=>({...s,start:Math.max(a,s.start),end:Math.min(b,s.end)}));
}
export function summarize(state,startDate,endDate) {
  const rows=sessionsInRange(state,startDate,endDate),byName=Object.create(null),byCategory=Object.create(null);let ms=0,mainline=0;
  for(const s of rows){const n=s.end-s.start;ms+=n;byName[s.name]=(byName[s.name]||0)+n/60000;byCategory[s.category]=(byCategory[s.category]||0)+n/60000;if(s.mainline)mainline+=n;}
  return {totalMinutes:ms/60000,mainlineMinutes:mainline/60000,byName,byCategory,rows};
}
export function contribution(sessions) {
  const totals=Object.create(null);const add=(id,f)=>{totals[id]=(totals[id]??new Fraction()).add(f);};
  for(const s of sessions){if(!s.mainSkillId)continue;const ms=BigInt(Math.max(0,s.end-s.start));add(s.mainSkillId,new Fraction(ms,60000n));
    const related=[...new Set(s.relatedSkillIds??[])].filter(id=>id!==s.mainSkillId);const n=related.length;
    for(const id of related)add(id,n<=2?new Fraction(ms,6000000n):new Fraction(ms*2n,BigInt(n)*6000000n));
  }
  return totals;
}
export function skillTotals(state,skillId) {
  const skill=state.skills.find(s=>s.id===skillId);if(!skill)fail('培养项不存在');
  const rows=confirmedSessions(state),baselineAt=skill.baselineAt??0;
  const old=rows.filter(s=>s.start<baselineAt).map(s=>({...s,end:Math.min(s.end,baselineAt)}));
  const recent=rows.filter(s=>s.end>baselineAt).map(s=>({...s,start:Math.max(s.start,baselineAt)}));
  const h=contribution(old)[skillId]??new Fraction(),n=contribution(recent)[skillId]??new Fraction();
  const base=pointsFraction(skill.baselinePoints??0),remaining=base.compare(h)>0?base.sub(h):new Fraction();
  const real=h.add(n),growth=real.add(remaining);
  const primary=rows.filter(s=>s.mainSkillId===skillId).reduce((n,s)=>n+s.end-s.start,0)/60000;
  return {realPoints:real.toNumber(),primaryMinutes:primary,relatedPoints:Math.max(0,real.toNumber()-primary),growthPoints:growth.toNumber(),oldPoints:h.toNumber(),newPoints:n.toNumber(),offsetRemaining:remaining.toNumber(),exactGrowth:growth};
}
export function growthProgress(state,skill) {
  const totals=skillTotals(state,skill.id);let used=0;
  let capabilityCount=0;for(let i=0;i<skill.stages.length;i++){if(state.assessments.some(a=>a.skillId===skill.id&&a.stageIndex===i&&!a.revoked))capabilityCount++;else break;}
  for(let i=0;i<skill.stages.length;i++){
    const stage=skill.stages[i],budget=stage.q*stage.levels,available=totals.exactGrowth.sub(pointsFraction(used));
    const full=available.compare(pointsFraction(budget))>=0;
    const passed=state.assessments.some(a=>a.skillId===skill.id&&a.stageIndex===i&&!a.revoked);
    if(!full||!passed||i===skill.stages.length-1){
      let level=full?stage.levels:Math.max(0,Math.floor(available.toNumber()/stage.q));
      // Verify against exact totals, including values extremely close to a boundary.
      while(level>0 && available.compare(pointsFraction(level*stage.q))<0)level--;
      while(level<stage.levels && available.compare(pointsFraction((level+1)*stage.q))>=0)level++;
      const intoLevel=full?0:Math.max(0,available.sub(pointsFraction(level*stage.q)).toNumber());
      return {...totals,stageIndex:i,stage,level,intoLevel,ratio:full?1:intoLevel/stage.q,full,passed,capabilityCount,banked:Math.max(0,available.toNumber()-budget),cumulativeThreshold:used+budget};
    }used+=budget;
  }
}
export function planProgress(state,plan) {
  const rows=sessionsInRange(state,plan.startDate,plan.endDate).filter(s=>plan.activityIds.includes(s.activityId)||plan.skillIds.includes(s.mainSkillId));
  const minutes=rows.reduce((n,s)=>n+(s.end-s.start)/60000,0);
  return {minutes,ratio:plan.targetMinutes?Math.min(1,minutes/plan.targetMinutes):0,outcomeComplete:!!plan.completedAt};
}
function checkInterval(state,session,excludeId=null,now=Date.now()) {
  if(!Number.isSafeInteger(session.start)||!Number.isSafeInteger(session.end)||session.end<=session.start)fail('结束时间必须晚于开始时间；短片段也可保存');
  if(session.end>now+1000)fail('不能把未来时间记成已发生');
  if(state.sessions.some(s=>s.id!==excludeId&&s.start<session.end&&s.end>session.start)||state.running&&state.running.id!==excludeId&&session.end>state.running.start)fail('时间与已有记录或当前计时重叠。请缩小范围，或先修正已有记录；不会自动覆盖。');
}
export function addSession(state,session,now=Date.now()) {
  if(state.sessions.some(s=>s.id===session.id))return state;
  checkInterval(state,session,null,now);const out=copy(state);out.sessions.push(copy(session));return out;
}
export function editSession(state,id,patch,expectedVersion,now=Date.now()) {
  const original=state.sessions.find(s=>s.id===id);if(!original)fail('原活动已不存在');
  if(original.version!==expectedVersion)fail('这条活动已变化，请重新打开核对；草稿未保存');
  const changed={...original,...patch,id:original.id,version:original.version+1,modifiedAt:now};
  checkInterval(state,changed,id,now);const out=copy(state);out.sessions[out.sessions.findIndex(s=>s.id===id)]=changed;return out;
}
export function removeSession(state,id,expectedVersion) {
  const row=state.sessions.find(s=>s.id===id);if(!row)fail('原活动已不存在');if(row.version!==expectedVersion)fail('这条活动已变化，请重新打开核对');
  const out=copy(state);out.sessions=out.sessions.filter(s=>s.id!==id);
  for(const m of out.moments.filter(m=>m.sessionId===id)){m.sessionId=null;m.originalSessionId=id;m.title=m.title||row.name;}
  return out;
}
export function confirmRunning(state,now) {
  if(!state.running)return state;if(now<state.running.start)fail('设备时钟早于计时起点，请核对时间');
  const out=copy(state);out.running.confirmedUntil=Math.max(now,out.running.confirmedUntil);return out;
}
export function switchTimer(state,activityId,now=Date.now(),operationId=uid()) {
  if(state.operations.includes(operationId))return state;
  if(state.running && now<state.running.start)fail('设备时间已回退，请先核对当前记录');
  const activity=activityId?state.activities.find(a=>a.id===activityId):null;if(activityId&&!activity)fail('活动不存在');
  const out=copy(state);
  if(out.running){const old={...out.running,end:now};delete old.confirmedUntil;if(now>old.start)out.sessions.push(old);out.running=null;}
  if(!activity)for(const c of out.contextSpans??[])if(c.end===null)c.end=Math.max(c.start,now);
  out.contextSpans=(out.contextSpans??[]).filter(c=>c.end===null||c.end>c.start);
  if(activity){const id=uid();out.running={...copy(activity),id,trackingId:id,activityId:activity.id,start:now,end:null,confirmedUntil:now,version:1,source:'timer',precision:'second'};}
  out.operations=[...out.operations.slice(-499),operationId];return out;
}
export function resolveRunning(state,boundary,mode,now=Date.now()) {
  if(!state.running)return state;
  if(mode==='keep')return resetPhoneObservation(confirmRunning(state,now),now);
  if(!Number.isSafeInteger(boundary)||boundary<state.running.start||boundary>now)fail('请填写计时起点到现在之间的结束时间');
  if(boundary<state.running.confirmedUntil)fail('结束时间不能早于已保存的确认时间。若需修正已确认记录，请用“整理这段记录”预览影响后保存');
  return resetPhoneObservation(switchTimer(state,null,boundary),now);
}
export function resetPhoneObservation(state,now=Date.now()){
 const out=copy(state),p=out.phone;if(!p)return out;
 if(p.active&&p.confirmedUntil>p.active.start)p.spans.push({...p.active,id:uid(),end:p.confirmedUntil,precision:'system-event'});
 p.active=null;p.automation=null;p.cursor=now;p.confirmedUntil=now;p.lastHeartbeat=now;p.needsReview=false;p.reviewReason=null;return out;
}
export {checksum,makeBackup,parseBackupBundle,parseBackup} from './backup.mjs';
