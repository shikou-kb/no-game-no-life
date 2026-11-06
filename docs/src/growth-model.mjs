import * as D from './domain-2cd6b06ecb42.mjs';
const zero=()=>new D.Fraction();
const points=(rows,id)=>D.contribution(rows)[id]??zero();
const clip=(rows,start,end)=>end<=start?[]:rows.filter(r=>r.start<end&&r.end>start).map(r=>({...r,start:Math.max(start,r.start),end:Math.min(end,r.end)}));
export const cumulativeLevel=(skill,progress)=>skill.stages.slice(0,progress.stageIndex).reduce((n,s)=>n+s.levels,0)+progress.level;
export function abilityState(state,skill){
 const reviews=state.assessments.filter(a=>a.skillId===skill.id&&!a.revoked),last=reviews.reduce((p,a)=>!p||a.at>p.at?a:p,null);
 return {reviews,last,highestStage:reviews.length?Math.max(...reviews.map(a=>a.stageIndex))+1:0};
}
// Both endpoints are recalculated from the same effective facts. They are not
// historical snapshots, and a later baseline is never projected into the past.
export function skillAt(state,skillId,at){
 const skill=state.skills.find(s=>s.id===skillId);if(!skill)throw new Error('培养项不存在');
 const rows=clip(D.confirmedSessions(state),0,at),totals=D.skillTotals({...state,sessions:rows,running:null},skillId),located=at>=Math.max(skill.createdAt??0,skill.baselineAt??0);
 return {...totals,at,located,growthPoints:located?totals.growthPoints:null,offsetRemaining:located?totals.offsetRemaining:null,exactGrowth:located?totals.exactGrowth:null};
}
export function periodContext(state,plan,now=Date.now()){
 const start=D.dayStart(plan.startDate,state.timeZone),end=D.dayStart(D.addDays(plan.endDate,1),state.timeZone),until=Math.min(end,now),status=now<start?'upcoming':now>=end?'past':'current';
 const rows=clip(D.confirmedSessions(state),start,until),matched=rows.filter(r=>D.planMatches(plan,r)),other=rows.filter(r=>!D.planMatches(plan,r));
 return {start,end,until,status,rows,matched,other};
}
export function sourceRows(state,plan,skillId,now=Date.now()){
 const {rows}=periodContext(state,plan,now);
 return rows.map(row=>{
  const value=points([row],skillId),primary=row.mainSkillId===skillId,activityMatch=plan.activityIds.includes(row.activityId),skillMatch=plan.skillIds.includes(row.mainSkillId);
  return {...row,points:value.toNumber(),exactPoints:value,primary,matched:activityMatch||skillMatch,matchReason:activityMatch&&skillMatch?'所选活动与记录主项':activityMatch?'所选活动':skillMatch?'记录主项':'同期其他',running:row.id===state.running?.id};
 }).filter(r=>r.points>0).sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));
}
export function stageOverview(state,plan,now=Date.now()){
 const context=periodContext(state,plan,now),{start,until,status,rows,matched,other}=context;
 const ids=new Set(plan.skillIds);
 for(const id of plan.activityIds){const activity=state.activities.find(a=>a.id===id);if(activity?.mainSkillId)ids.add(activity.mainSkillId);}
 for(const row of matched)for(const id of [row.mainSkillId,...(row.relatedSkillIds??[])])if(id)ids.add(id);
 const totals=D.contribution(rows),inside=D.contribution(matched),outside=D.contribution(other);
 const skills=state.skills.filter(skill=>ids.has(skill.id)).map(skill=>{
  const opening=skillAt(state,skill.id,Math.min(start,now)),closing=skillAt(state,skill.id,until),progress=D.growthProgress(state,skill);
  if(status==='upcoming'){opening.located=false;opening.growthPoints=null;opening.offsetRemaining=null;opening.exactGrowth=null;}
  return {skill,opening,closing,periodPoints:(totals[skill.id]??zero()).toNumber(),matchedPoints:(inside[skill.id]??zero()).toNumber(),otherPoints:(outside[skill.id]??zero()).toNumber(),progress,cumulativeLevel:cumulativeLevel(skill,progress),ability:abilityState(state,skill),currentStateAt:now};
 });
 const minutes=matched.reduce((n,r)=>n+(r.end-r.start)/60000,0),unassignedMinutes=matched.filter(r=>!r.mainSkillId).reduce((n,r)=>n+(r.end-r.start)/60000,0);
 return {plan,...context,skills,unassignedMinutes,progress:{minutes,ratio:plan.targetMinutes?Math.min(1,minutes/plan.targetMinutes):0,outcomeComplete:!!plan.completedAt}};
}
