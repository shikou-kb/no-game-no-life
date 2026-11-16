import {dayStart,addDays} from './calendar-e14b41d62339.mjs';
import {groupIdForCategory} from './activity-policy-e14b41d62339.mjs';
const copy=x=>structuredClone(x),ok=(v,m)=>{if(!v)throw Error(m);};
export const matchesSource=(source,row)=>(source.activityIds??[]).includes(row.activityId)||(source.skillIds??[]).includes(row.mainSkillId)||(source.groupIds??[]).includes(row.groupId??groupIdForCategory(row.category))||(source.groupIds??[]).includes(row.legacyGroupId);
export function unionSlices(rows){const result=[];for(const row of [...rows].sort((a,b)=>a.start-b.start||a.end-b.end)){const prior=result.at(-1);if(prior&&prior.id===row.id&&row.start<=prior.end)prior.end=Math.max(prior.end,row.end);else result.push({...row});}return result;}
export function taskSlices(state,plan,rows){
 const phase=state.phases?.find(p=>p.id===plan.phaseId),start=dayStart(phase?.startDate??plan.startDate,state.timeZone),end=dayStart(addDays(phase?.endDate??plan.endDate,1),state.timeZone),versions=plan.sourceVersions??[{at:0,activityIds:plan.activityIds,skillIds:plan.skillIds,groupIds:plan.groupIds??[],active:true}],result=[];
 const phaseVersions=phase?.activeVersions??[{at:0,active:true}];
 for(const row of rows)for(let i=0;i<versions.length;i++){const v=versions[i];if(v.active===false||!matchesSource(v,row))continue;for(let j=0;j<phaseVersions.length;j++){const p=phaseVersions[j];if(!p.active)continue;const a=Math.max(start,row.start,v.at,p.at),b=Math.min(end,row.end,versions[i+1]?.at??Infinity,phaseVersions[j+1]?.at??Infinity);if(b>a)result.push({...row,start:a,end:b});}}
 return unionSlices(result);
}
export function phaseSlices(state,phaseId,rows){return unionSlices(state.plans.filter(p=>p.phaseId===phaseId).flatMap(p=>taskSlices(state,p,rows)));}
export function subtractSlices(rows,matched){const result=[];for(const row of rows){let pieces=[{...row}];for(const part of matched.filter(p=>p.id===row.id))pieces=pieces.flatMap(p=>part.end<=p.start||part.start>=p.end?[p]:[...(part.start>p.start?[{...p,end:part.start}]:[]),...(part.end<p.end?[{...p,start:part.end}]:[])]);result.push(...pieces);}return result;}
export function setTaskSources(state,taskId,activityIds,{at=Date.now(),active=true,expected=null,preserveLegacy=false}={}){
 const s=copy(state),task=s.plans.find(p=>p.id===taskId);ok(task,'任务已不存在');if(expected!==null)ok(JSON.stringify(task)===JSON.stringify(expected),'任务已在其他页面变化，填写已保留');
 const selected=[...new Set(activityIds)];ok(selected.every(id=>s.activities.some(a=>a.id===id)),'固定标签已不存在');
 const versions=task.sourceVersions??[{at:0,activityIds:[...task.activityIds],skillIds:[...task.skillIds],groupIds:[...(task.groupIds??[])],active:true}];
 ok(Number.isSafeInteger(at)&&at>=0&&at>=(versions.at(-1)?.at??0),'关系生效时间无效');
 const next={at,activityIds:selected,skillIds:preserveLegacy?[...task.skillIds]:[],groupIds:preserveLegacy?[...(task.groupIds??[])]:[],active};if(versions.at(-1)?.at===at)versions[versions.length-1]=next;else versions.push(next);
 task.sourceVersions=versions;task.activityIds=selected;task.skillIds=next.skillIds;task.groupIds=next.groupIds;task.archived=!active;return s;
}
export function setPhaseArchived(state,phaseId,archived,at=Date.now()){const s=copy(state),p=s.phases.find(p=>p.id===phaseId);ok(p,'阶段已不存在');p.activeVersions??=[{at:0,active:true}];ok(at>=(p.activeVersions.at(-1)?.at??0),'设备时间早于最近更改');if(p.activeVersions.at(-1).at===at)p.activeVersions.pop();p.activeVersions.push({at,active:!archived});p.archived=archived;return s;}
