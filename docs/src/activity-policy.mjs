import {CATEGORIES} from './catalog-e14b41d62339.mjs';
const ids=['life','study','work','exercise','social','play','chores','commute'];
const uid=()=>globalThis.crypto?.randomUUID?.()??'policy-'+Date.now()+'-'+Math.random().toString(36).slice(2);
export const groupIdForCategory=name=>{const i=CATEGORIES.indexOf(name);return i<0?'custom:'+name:'group-'+ids[i];};
const copy=x=>structuredClone(x);
export const emptyPolicy=()=>({mainSkillId:null,relatedSkillIds:[]});
export function effectiveActivity(state,activity){
 const a=copy(activity),g=state.activityGroups.find(g=>g.id===a.groupId);
 const p=a.growthMode==='inherit'?(g?.growthPolicy??emptyPolicy()):a.growthMode==='none'?emptyPolicy():a;
 return {...a,mainSkillId:p.mainSkillId??null,relatedSkillIds:[...new Set(p.relatedSkillIds??[])].filter(id=>id!==p.mainSkillId&&state.skills.find(s=>s.id===id)?.kind!=='investment'),groupId:a.groupId??groupIdForCategory(a.category)};
}
export function initializeUseLoop(input,{fresh=false,at=Date.now()}={}){
 const s=copy(input);s.schemaVersion=3;
 s.activityGroups??=[...new Set([...CATEGORIES,...s.activities.map(a=>a.category)])].map((name,i)=>({id:groupIdForCategory(name),name,order:i,archived:false,growthPolicy:emptyPolicy(),version:1}));
 s.defaultPack??={version:1,investmentIds:{},adoptedActivityIds:[]};
 for(const a of s.activities){a.groupId??=groupIdForCategory(a.category);a.growthMode??=a.mainSkillId?'override':'none';a.configVersion??=1;}
 s.activityConfigHistory??=[];s.weeklyRules??=[];s.weeklyReviews??=[];s.eventExamples??=[];s.reminders??=[];
 s.setupProgress??={step:0,confirmed:[],origin:fresh?'new':'legacy'};
 s.appearance??={global:{theme:s.settings.theme,message:'',backgroundMode:'none',assetId:null},pages:{}};
 s.dataGeneration??=uid();
 s.settings.phone??={enabled:false,notifications:false,liveUpdates:false,interruptPackages:[]};s.settings.phone.privacy??=fresh?'summary':'activity';
 if(fresh){ensureInvestments(s,at);for(const key of ['study','exercise'])s.activityGroups.find(g=>g.id==='group-'+key).growthPolicy={mainSkillId:s.defaultPack.investmentIds[key],relatedSkillIds:[]};for(const a of s.activities)if(['study','exercise'].includes(a.id))a.growthMode='inherit';s.settings.theme='blue';s.appearance.global.theme='blue';}
 if(!s.activityConfigHistory.length)for(const a of s.activities)s.activityConfigHistory.push({id:uid(),activityId:a.id,effectiveAt:at,snapshot:effectiveActivity(s,a)});
 return s;
}
export function ensureInvestments(s,at=Date.now(),keys=['study','exercise']){
 for(const [key,name,composition]of [['study','学习积累','知识与思维工具'],['exercise','运动积累','身体素质']]){
  if(!keys.includes(key))continue;
  let id=s.defaultPack.investmentIds[key],skill=s.skills.find(x=>x.id===id);
  if(!skill){id=uid();skill={id,kind:'investment',name,composition,templateId:null,stages:[],status:'active',createdAt:at,baselineAt:at,baselinePoints:0};s.skills.push(skill);s.defaultPack.investmentIds[key]=id;}
 }
 return s;
}
export function adoptDefaults(state,activityIds,at=Date.now()){
 const s=copy(state),eligible=s.activities.filter(a=>activityIds.includes(a.id)&&!a.archived&&!a.mainSkillId&&!a.explicitlyExcluded&&a.growthMode!=='inherit'&&['group-study','group-exercise'].includes(a.groupId));
 ensureInvestments(s,at,[...new Set(eligible.map(a=>a.groupId.slice(6)))]);
 for(const id of new Set(activityIds)){
  const a=eligible.find(a=>a.id===id);if(!a)continue;
  const skillId=s.defaultPack.investmentIds[a.groupId.slice(6)];if(s.skills.find(k=>k.id===skillId)?.status==='archived')continue;
  // Adopting one legacy leaf must not change a group or its other inheriting leaves.
  a.growthMode='override';a.mainSkillId=skillId;a.relatedSkillIds=[];s.defaultPack.adoptedActivityIds=[...new Set([...s.defaultPack.adoptedActivityIds,id])];
 }
 return recordConfigChanges(state,s,at);
}
const signature=a=>JSON.stringify({name:a.name,category:a.category,color:a.color,mainline:a.mainline,mainSkillId:a.mainSkillId,relatedSkillIds:a.relatedSkillIds,investmentKind:a.investmentKind,groupId:a.groupId,phoneMode:a.phoneMode,growthMode:a.growthMode,archived:a.archived});
export function recordConfigChanges(before,next,at=Date.now()){
 if(next.schemaVersion<3)return next;
 for(const a of next.activities){
  a.groupId??=groupIdForCategory(a.category);a.growthMode??=a.mainSkillId?'override':'none';a.configVersion??=1;
  if(!next.activityGroups.some(g=>g.id===a.groupId))next.activityGroups.push({id:a.groupId,name:a.category,order:next.activityGroups.length,archived:false,growthPolicy:emptyPolicy(),version:1});
  const current=effectiveActivity(next,a),old=before.activities.find(x=>x.id===a.id);
  if(old&&signature(current)===signature(effectiveActivity(before,old)))continue;
  a.configVersion=(old?.configVersion??0)+1;
  const snapshot={...current,configVersion:a.configVersion};
  const last=next.activityConfigHistory.filter(h=>h.activityId===a.id).at(-1);
  if(last&&signature(last.snapshot)===signature(snapshot))continue;
  next.activityConfigHistory.push({id:uid(),activityId:a.id,effectiveAt:at,snapshot});
 }
 return next;
}
export function resolveActivitySnapshot(state,activityId,at=Date.now(),{current=false}={}){
 const a=state.activities.find(a=>a.id===activityId);if(!a)throw Error('活动已不存在');
 if(current)return effectiveActivity(state,a);
 const versions=state.activityConfigHistory.filter(h=>h.activityId===activityId&&h.effectiveAt<=at).sort((a,b)=>a.effectiveAt-b.effectiveAt);
 return versions.length?copy(versions.at(-1).snapshot):{...copy(a),...emptyPolicy(),growthMode:'none',configVersion:0};
}
export function splitConfigurationRange(state,activityId,start,end){
 const points=[start,...state.activityConfigHistory.filter(h=>h.activityId===activityId&&h.effectiveAt>start&&h.effectiveAt<end).map(h=>h.effectiveAt),end];
 const bounds=[...new Set(points)].sort((a,b)=>a-b);
 return bounds.slice(0,-1).map((start,i)=>({...resolveActivitySnapshot(state,activityId,start),start,end:bounds[i+1]}));
}
