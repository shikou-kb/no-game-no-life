import * as D from './domain-27ca4e179461.mjs';
import {resolveActivitySnapshot} from './activity-policy-27ca4e179461.mjs';
const fail=message=>{throw new Error(message);};
function clipAway(rows,start,end){const result=[];for(const row of rows){const stop=row.end??Infinity;if(stop<=start||row.start>=end){result.push({...row});continue;}if(row.start<start)result.push({...row,end:start});if(stop>end)result.push({...row,id:D.uid(),start:end});}return result;}
export function setContextRange(state,name,start,end){
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||end<=start||end>Date.now()+1000)fail('请填写已经发生且先后正确的情境范围');
  name=String(name||'').trim();if(name.length>80)fail('情境名称最多80字');const out=D.copy(state);out.contextSpans=clipAway(out.contextSpans,start,end);if(name)out.contextSpans.push({id:D.uid(),name,start,end});return D.validateState(out);
}
export function changeCurrentContext(state,name,now=Date.now()){
  if(!state.running)fail('先开始一项活动，再选择当前情境');let out=D.confirmRunning(state,now);
  for(const c of out.contextSpans)if(c.end===null)c.end=now;out.contextSpans=out.contextSpans.filter(c=>c.end===null||c.end>c.start);
  name=String(name||'').trim();if(name)out.contextSpans.push({id:D.uid(),name,start:now,end:null});return D.validateState(out);
}
export function contextTotals(state,startDate,endDate){
  const result=Object.create(null),rows=D.sessionsInRange(state,startDate,endDate);for(const c of state.contextSpans??[]){const end=c.end??state.running?.confirmedUntil??c.start;let ms=0;for(const row of rows)ms+=Math.max(0,Math.min(end,row.end)-Math.max(c.start,row.start));if(ms>0)result[c.name]=(result[c.name]??0)+ms/60000;}return result;
}
export function replaceRange(state,command,now=Date.now()){
  const {start,end,segments,recoverRunningId,nextActivityId=null,expectedRevision,operationId}=command;
  if(operationId&&state.operations.includes(operationId))return D.copy(state);
  if(state.revision!==expectedRevision)fail('记录已在其他页面变化，请重新预览；草稿保留');
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>now)fail('整理范围须已发生且结束晚于开始');
  if(!Array.isArray(segments)||segments.length>100)fail('一次最多整理100段');
  if(recoverRunningId&&state.running?.id!==recoverRunningId)fail('当前计时已变化，请重新核对');
  if(!recoverRunningId&&state.running&&end>state.running.start)fail('范围涉及当前计时，请从返回核对入口整理');
  const out=D.copy(state),base=recoverRunningId?[...state.sessions,...(state.running.confirmedUntil>state.running.start?[{...state.running,end:state.running.confirmedUntil}]:[])]:state.sessions,kept=[],piecesById=new Map();
  for(const row of base){if(row.end<=start||row.start>=end){kept.push(D.copy(row));continue;}const pieces=[];
    if(row.start<start)pieces.push({...row,end:start,version:row.version+1});
    if(row.end>end)pieces.push({...row,id:pieces.length?D.uid():row.id,start:end,version:row.version+1});
    kept.push(...pieces);piecesById.set(row.id,pieces);
  }
  if(recoverRunningId&&!piecesById.has(recoverRunningId))piecesById.set(recoverRunningId,kept.filter(r=>r.id===recoverRunningId));
  let boundary=start;const additions=[];
  for(const segment of [...segments].sort((a,b)=>a.start-b.start)){
    const activity=state.activities.find(a=>a.id===segment.activityId);if(!activity)fail('活动不存在');
    if(!Number.isSafeInteger(segment.start)||!Number.isSafeInteger(segment.end)||segment.start<start||segment.end>end||segment.end<=segment.start)fail('每段须在整理范围内且结束晚于开始');
    if(segment.start<boundary)fail('片段有重叠，请先调整');boundary=segment.end;
    const originals=[...state.sessions,...(state.running?[{...state.running,end}]:[])],bounds=[...new Set([segment.start,segment.end,...originals.flatMap(r=>[r.start,r.end]).filter(t=>t>segment.start&&t<segment.end),...state.activityConfigHistory.filter(h=>h.activityId===activity.id&&h.effectiveAt>segment.start&&h.effectiveAt<segment.end).map(h=>h.effectiveAt)])].sort((a,b)=>a-b);
    for(let i=0;i<bounds.length-1;i++){const a=bounds[i],b=bounds[i+1],original=originals.find(r=>r.activityId===activity.id&&r.start<=a&&r.end>=b),snapshot=original??resolveActivitySnapshot(state,activity.id,a);additions.push({...D.copy(snapshot),id:i?D.uid():segment.id||D.uid(),activityId:activity.id,temporaryName:segment.temporaryName??snapshot.temporaryName??'',start:a,end:b,confirmation:'confirmed',needsReview:false,version:1,source:'manual',precision:'minute'});}
  }
  out.sessions=[...kept,...additions].sort((a,b)=>a.start-b.start);
  for(const m of out.moments){if(!piecesById.has(m.sessionId))continue;const original=m.sessionId,piece=piecesById.get(original).find(r=>m.at>=r.start&&m.at<r.end);if(piece)m.sessionId=piece.id;else{m.sessionId=null;m.originalSessionId=original;m.title=m.title||base.find(r=>r.id===original)?.name||state.running?.name||'';}}
  let contexts=out.contextSpans;if(recoverRunningId)contexts=contexts.map(c=>c.end===null?{...c,end:Math.max(c.start,end)}:c).filter(c=>c.end>c.start);
  out.contextSpans=contexts;
  for(const segment of segments)if(segment.context?.trim()||segment.contextMode==='clear'){out.contextSpans=clipAway(out.contextSpans,segment.start,segment.end);if(segment.context?.trim())out.contextSpans.push({id:D.uid(),name:segment.context.trim(),start:segment.start,end:segment.end});}
  if(recoverRunningId){out.running=null;if(nextActivityId){const activity=state.activities.find(a=>a.id===nextActivityId&&!a.archived);if(!activity)fail('请选择可继续记录的活动');out.running={...resolveActivitySnapshot(state,activity.id,now,{current:true}),id:command.nextRunningId||D.uid(),activityId:activity.id,start:now,end:null,confirmedUntil:now,version:1,source:'timer',precision:'second',needsReview:false,runtimeId:state.running?.runtimeId??null};}}
  if(operationId)out.operations=[...out.operations.slice(-499),operationId];return D.validateState(recoverRunningId?D.resetPhoneObservation(out,now):out);
}
