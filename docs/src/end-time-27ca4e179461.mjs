import * as D from './domain-27ca4e179461.mjs';
import {rememberRecordChange} from './rebuild-model-27ca4e179461.mjs';

const stableRunning=row=>{const {confirmedUntil,persistedThrough,runtimeId,reviewReason,...stable}=row;return D.copy({...stable,...(row.needsReview?{reviewReason:reviewReason??''}:{})});};
function endedParts(state,id){
 const row=state.sessions.find(r=>r.id===id);if(!row)return [];
 if(!row.trackingId||row.source!=='timer')return [row];
 const compatible=r=>r.trackingId===row.trackingId&&r.source==='timer'&&['activityId','temporaryName','name','category','color','mainSkillId','relatedBasis'].every(k=>(r[k]??null)===(row[k]??null))&&JSON.stringify(r.relatedSkillIds)===JSON.stringify(row.relatedSkillIds);
 const rows=state.sessions.filter(compatible).sort((a,b)=>a.start-b.start);let a=rows.findIndex(r=>r.id===id),b=a;
 while(a>0&&rows[a-1].end===rows[a].start)a--;while(b+1<rows.length&&rows[b].end===rows[b+1].start)b++;
 return rows.slice(a,b+1);
}
export function endTimeBasis(state,kind,id){
 if(kind==='running')return state.running?.id===id?{kind,generation:state.dataGeneration,row:stableRunning(state.running)}:null;
 const parts=endedParts(state,id);if(!parts.length)return null;
 return {kind:'session',generation:state.dataGeneration,row:{...D.copy(parts[0]),end:parts.at(-1).end,confirmation:parts.some(r=>r.confirmation==='pending')?'pending':'confirmed'},segments:D.copy(parts)};
}
export function latestEndedTimer(state){
 const row=state.sessions.filter(r=>r.source==='timer').reduce((latest,r)=>!latest||r.end>latest.end?r:latest,null);
 return row?endTimeBasis(state,'session',row.id).row:null;
}
export function adjustEndTime(state,basis,end,{now=Date.now(),operationId=D.uid()}={}){
 if(state.operations.includes(operationId))return state;
 if(!basis||state.dataGeneration!==basis.generation)throw Error('数据空间已变化，填写仍保留，请重新核对原记录');
 const current=endTimeBasis(state,basis.kind,basis.row.id);
 if(!current||JSON.stringify(current)!==JSON.stringify(basis))throw Error('这段记录已在别处变化，填写仍保留，请重新打开原记录核对');
 if(!Number.isSafeInteger(end)||end<=basis.row.start)throw Error('实际结束时间须晚于本段开始时间');
 if(end>now)throw Error('实际结束时间不能晚于现在');
 let next;
 if(basis.kind==='running'){
  // Explicit manual correction: confirm only the chosen range. Ordinary clock-rollback guards stay unchanged.
  const prepared=D.copy(state);prepared.running.needsReview=false;
  prepared.running.confirmedUntil=Math.min(prepared.running.confirmedUntil,now);
  const closed=D.switchTimer(prepared,null,now,operationId);
  next=D.editSession(closed,basis.row.id,{end},basis.row.version,now);
  const openContexts=new Set(state.contextSpans.filter(c=>c.end===null).map(c=>c.id));
  next.contextSpans=next.contextSpans.map(c=>openContexts.has(c.id)?{...c,end:Math.max(c.start,end)}:c).filter(c=>c.end===null||c.end>c.start);
  next=D.resetPhoneObservation(next,now);
 }else{
  const ids=new Set(basis.segments.map(r=>r.id)),prepared=D.copy(state);
  prepared.sessions=prepared.sessions.filter(r=>!ids.has(r.id)||r.id===basis.row.id);
  next=D.editSession(prepared,basis.row.id,{end,confirmation:'confirmed',reviewReason:''},basis.row.version,now);
  for(const moment of next.moments)if(ids.has(moment.sessionId))moment.sessionId=basis.row.id;
 }
 return D.validateState(rememberRecordChange(state,next));
}
