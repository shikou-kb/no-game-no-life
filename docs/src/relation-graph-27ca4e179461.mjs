import {COMPOSITIONS} from './onboarding-27ca4e179461.mjs';
import {effectiveActivity} from './activity-policy-27ca4e179461.mjs';
import {orderedGroups,orderedLabels} from './catalog-order-27ca4e179461.mjs';

// This is a read-only projection. Layout, collapsed groups and selection never enter the ledger.
export function relationGraph(state,now=Date.now()){
 const nodes=[],edges=[],byId=new Map(),seen=new Set();
 const node=value=>{if(!byId.has(value.id)){nodes.push(value);byId.set(value.id,value);}return byId.get(value.id);};
 const edge=(from,to,kind,source='')=>{const id=JSON.stringify([from,to,kind]);if(seen.has(id))return;seen.add(id);edges.push({id,from,to,kind,source});};
 const missing=(id,kind)=>node({id,kind,label:'已失效 · '+id.split(':').slice(1).join(':'),archived:true,missing:true,lane:kind==='skill'?1:0,parent:null});
 for(const group of orderedGroups(state)){node({id:'group:'+group.id,entityId:group.id,kind:'group',label:group.name,lane:0,archived:!!group.archived,parent:null});for(const a of orderedLabels(state,group.id)){const p=effectiveActivity(state,a);node({id:'activity:'+a.id,entityId:a.id,kind:'activity',label:a.name,legacyGroupId:a.legacyGroupId,lane:0,parent:'group:'+group.id,archived:!!(a.archived||group.archived),policy:a.growthMode==='inherit'?'沿用类别':a.growthMode==='override'?'本活动自定':'仅记录时间',mainSkillId:p.mainSkillId});edge('group:'+group.id,'activity:'+a.id,'contains');}}
 for(const name of [...COMPOSITIONS,...(state.skills.some(k=>!COMPOSITIONS.includes(k.composition))?['未归入方向']:[])])node({id:'direction:'+name,entityId:name,kind:'direction',label:name,lane:1,parent:null,archived:false});
 for(const k of state.skills){const parent='direction:'+(COMPOSITIONS.includes(k.composition)?k.composition:'未归入方向');node({id:'skill:'+k.id,entityId:k.id,kind:'skill',label:k.name,lane:1,parent,archived:k.status==='archived',skillKind:k.kind});edge(parent,'skill:'+k.id,'contains');}
 for(const p of state.phases)node({id:'phase:'+p.id,entityId:p.id,kind:'phase',label:p.title,lane:2,parent:null,archived:!!p.archived});
 for(const t of state.plans){const parent='phase:'+(t.phaseId??t.id),phase=byId.get(parent);if(!phase)node({id:parent,entityId:t.phaseId??t.id,kind:'phase',label:t.phaseId?'已失效阶段':'旧阶段',lane:2,parent:null,archived:!!t.archived,missing:!!t.phaseId});const source=t;
  node({id:'task:'+t.id,entityId:t.id,kind:'task',label:t.title,lane:2,parent,archived:!!(t.archived||phase?.archived||source.active===false)});edge(parent,'task:'+t.id,'contains');
  for(const [key,prefix,kind,title]of [['activityIds','activity:','activity','固定标签'],['groupIds','group:','group','旧类别规则'],['skillIds','skill:','skill','培养来源规则']])for(const id of source[key]??[]){if(!byId.has(prefix+id))missing(prefix+id,kind);edge(prefix+id,'task:'+t.id,'task',title);}
 }
 for(const a of state.activities){if(!byId.has('activity:'+a.id)){node({id:'group:ungrouped',kind:'group',label:'未分组',lane:0,parent:null,archived:false});node({id:'activity:'+a.id,entityId:a.id,kind:'activity',label:a.name,lane:0,parent:'group:ungrouped',archived:!!a.archived,missing:true,policy:'分类已失效'});edge('group:ungrouped','activity:'+a.id,'contains');}const p=effectiveActivity(state,a);if(p.mainSkillId){if(!byId.has('skill:'+p.mainSkillId))missing('skill:'+p.mainSkillId,'skill');edge('activity:'+a.id,'skill:'+p.mainSkillId,'main',a.growthMode==='inherit'?'沿用类别':'本活动自定');for(const id of new Set(p.relatedSkillIds??[])){if(id===p.mainSkillId)continue;if(!byId.has('skill:'+id))missing('skill:'+id,'skill');edge('activity:'+a.id,'skill:'+id,'related',a.growthMode==='inherit'?'沿用类别':'本活动自定');}}}
 return {nodes,edges,byId};
}
export function visibleRelations(model,{expanded=new Set(),includeArchived=false}={}){
 const eligible=model.nodes.filter(n=>includeArchived||!n.archived&&!n.missing),allowed=new Set(eligible.map(n=>n.id)),visible=eligible.filter(n=>!n.parent||expanded.has(n.parent)),ids=new Set(visible.map(n=>n.id)),represent=id=>{const n=model.byId.get(id);return ids.has(id)?id:n?.parent&&ids.has(n.parent)?n.parent:null;},aggregate=new Map();
 for(const e of model.edges){if(!allowed.has(e.from)||!allowed.has(e.to))continue;const from=represent(e.from),to=represent(e.to);if(!from||!to||from===to)continue;const id=JSON.stringify([from,to,e.kind]);let row=aggregate.get(id);if(!row){row={id,from,to,kind:e.kind,edges:[],count:0};aggregate.set(id,row);}row.edges.push(e);row.count++;}
 const nodes=visible.map(n=>({...n,children:eligible.filter(c=>c.parent===n.id).length,hiddenChildren:eligible.filter(c=>c.parent===n.id&&!ids.has(c.id)).length,connections:model.edges.filter(e=>e.kind!=='contains'&&allowed.has(e.from)&&allowed.has(e.to)&&(e.from===n.id||e.to===n.id||model.byId.get(e.from)?.parent===n.id||model.byId.get(e.to)?.parent===n.id)).length}));
 return {nodes,edges:[...aggregate.values()],hiddenNodes:model.nodes.length-visible.length,filteredNodes:model.nodes.length-eligible.length,filteredEdges:model.edges.filter(e=>e.kind!=='contains'&&(!allowed.has(e.from)||!allowed.has(e.to))).length,actualEdges:model.edges.filter(e=>e.kind!=='contains'&&allowed.has(e.from)&&allowed.has(e.to)).length};
}
export function relationNeighborhood(model,id,{includeArchived=false}={}){
 const allowed=new Set(model.nodes.filter(n=>includeArchived||!n.archived&&!n.missing).map(n=>n.id));
 const members=new Set([id,...model.nodes.filter(n=>n.parent===id&&allowed.has(n.id)).map(n=>n.id)]),edges=model.edges.filter(e=>e.kind!=='contains'&&allowed.has(e.from)&&allowed.has(e.to)&&(members.has(e.from)||members.has(e.to))),neighbors=new Set([...members,...edges.flatMap(e=>[e.from,e.to])]);
 // For legacy category/skill task sources the graph retains that real rule edge.
 const rules=edges.filter(e=>e.kind==='task'&&members.has(e.to)),sourceLabels=model.nodes.filter(n=>n.kind==='activity'&&allowed.has(n.id)&&rules.some(e=>e.from===n.id||e.from===n.parent||e.from==='group:'+n.legacyGroupId||model.edges.some(m=>m.kind==='main'&&m.from===n.id&&m.to===e.from)));
 return {members,edges,neighbors,sourceLabels};
}
export function focusedRelations(model,id,{includeArchived=false}={}){
 const all=visibleRelations(model,{expanded:new Set(model.nodes.map(n=>n.id)),includeArchived}),hood=relationNeighborhood(model,id,{includeArchived});
 const ids=hood.neighbors,edgeIds=new Set(hood.edges.map(e=>e.id));
 const nodes=all.nodes.filter(n=>ids.has(n.id)),edges=all.edges.filter(e=>edgeIds.has(e.id)||e.kind==='contains'&&ids.has(e.from)&&ids.has(e.to));
 return {...all,nodes,edges,hiddenNodes:0,outsideNodes:all.nodes.length-nodes.length,actualEdges:hood.edges.length,totalEdges:all.actualEdges,focused:true};
}
export function overviewRelations(model,{includeArchived=false,slots=7,expandedRegions=new Set()}={}){
 const base=visibleRelations(model,{includeArchived}),mapped=new Map(),buckets=[];
 function region(rows,limit,key,label){
  if(expandedRegions.has(key)||rows.length<=limit)return rows;
  const keep=rows.slice(0,Math.max(0,limit-1)),rest=rows.slice(keep.length),id='overview:'+key;
  for(const row of rest)mapped.set(row.id,id);
  const bucket={id,kind:'summary',region:key,lane:rest[0].lane,parent:null,label,archived:false,children:rest.length,memberRoots:rest.map(r=>r.id),connections:0,
   overviewDescription:`${rest.length} ${key==='phases'?'阶段':key==='growth'?'方向':'分类'} · ${rest.reduce((n,r)=>n+r.children,0)} ${key==='phases'?'任务':key==='growth'?'培养项':'标签'}`};buckets.push(bucket);return [...keep,bucket];
 }
 const left=region(base.nodes.filter(n=>n.lane===0),slots,'groups','其他分类'),growthRows=base.nodes.filter(n=>n.lane===1),phaseRows=base.nodes.filter(n=>n.lane===2);
 const growth=region(growthRows,Math.max(1,slots-1),'growth','其他成长方向'),phases=region(phaseRows,Math.max(1,slots-growth.length),'phases','阶段与任务');
 if(!phaseRows.length)phases.push({id:'overview:empty-phases',kind:'summary',lane:2,parent:null,label:'阶段与任务',children:0,connections:0,overviewDescription:'尚无阶段',empty:true});
 const edges=new Map();for(const edge of base.edges){const from=mapped.get(edge.from)??edge.from,to=mapped.get(edge.to)??edge.to,id=JSON.stringify([from,to,edge.kind]);let row=edges.get(id);if(!row){row={...edge,id,from,to,edges:[],count:0};edges.set(id,row);}row.edges.push(...edge.edges);row.count+=edge.count;}
 for(const b of buckets)b.connections=[...edges.values()].filter(e=>e.from===b.id||e.to===b.id).reduce((n,e)=>n+e.count,0);
 return {...base,nodes:[...left,...growth,...phases],edges:[...edges.values()],hiddenNodes:base.hiddenNodes+mapped.size-buckets.length,overviewGrouping:true,expandedRegions:[...expandedRegions]};
}
