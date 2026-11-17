import {effectiveActivity} from './activity-policy-27ca4e179461.mjs';
import {shadeColor} from './catalog-order-27ca4e179461.mjs';

const mentions=(value,id)=>value===id||Array.isArray(value)&&value.some(v=>mentions(v,id))||value&&typeof value==='object'&&Object.values(value).some(v=>mentions(v,id));
export function categoryImpact(state,id,drafts=[]){
 const group=state.activityGroups.find(g=>g.id===id);if(!group)throw Error('分类已不存在');
 const labels=state.activities.filter(a=>a.groupId===id),withoutCatalog={...state,activityGroups:undefined,activities:undefined};
 const referenced=!!mentions(withoutCatalog,id),otherDrafts=drafts.filter(d=>d.id!=='category:'+id&&mentions(d,id));
 return {group,labels,referenced,drafts:otherDrafts.length,running:state.running?.groupId===id,history:state.sessions.filter(r=>r.groupId===id).length,tasks:state.plans.filter(p=>mentions(p,id)).length,referenceKey:JSON.stringify({rows:state.sessions.filter(r=>r.groupId===id).map(r=>[r.id,r.version]),running:state.running?.groupId===id?state.running.id:null,plans:state.plans.filter(p=>mentions(p,id)),drafts:otherDrafts.map(d=>[d.id,d.updatedAt])}),canDelete:!labels.length&&!referenced&&!otherDrafts.length};
}
export function impactKey(impact){return JSON.stringify({group:impact.group,labels:impact.labels,referenced:impact.referenced,drafts:impact.drafts,running:impact.running,history:impact.history,tasks:impact.tasks,referenceKey:impact.referenceKey});}
export function removeCategory(state,id,{mode='archive',targetId=null,expectedGroup=null,expectedImpact=null,drafts=[]}={}){
 const impact=categoryImpact(state,id,drafts);
 if(expectedImpact&&impactKey(impact)!==expectedImpact)throw Error('分类引用已变化，请取消并重新查看删除预览');
 if(expectedGroup&&JSON.stringify(impact.group)!==JSON.stringify(expectedGroup))throw Error('分类已变化，请重新查看删除预览');
 const next=structuredClone(state),group=next.activityGroups.find(g=>g.id===id);
 if(mode==='delete'){
  if(!impact.canDelete)throw Error('分类已有标签、记录或草稿引用，请重新查看影响后移除');
  next.activityGroups=next.activityGroups.filter(g=>g.id!==id);return next;
 }
 if(mode==='move'){
  const target=next.activityGroups.find(g=>g.id===targetId&&g.id!==id&&!g.archived);if(!target)throw Error('请选择另一个在用分类');
  for(const a of next.activities.filter(a=>a.groupId===id)){
   const policy=effectiveActivity(next,a);
   if(a.growthMode==='inherit')Object.assign(a,{growthMode:policy.mainSkillId?'override':'none',mainSkillId:policy.mainSkillId,relatedSkillIds:policy.relatedSkillIds});
   Object.assign(a,{groupId:target.id,category:target.name,color:shadeColor(target.color,a.colorShade)});
  }
  // The old identity stays whenever snapshots, task sources or drafts still use it.
  if(categoryImpact(next,id,drafts).canDelete){next.activityGroups=next.activityGroups.filter(g=>g.id!==id);return next;}
 }else if(mode!=='archive')throw Error('移除方式无效');
 group.archived=true;group.version=(group.version??0)+1;return next;
}
