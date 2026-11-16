import {categoryImpact,impactKey,removeCategory} from './catalog-removal-e14b41d62339.mjs';
import {captureModalPosition,restoreModalPosition} from './modal-position-e14b41d62339.mjs';
import * as D from './domain-e14b41d62339.mjs';
import {orderedGroups,orderedLabels,positionItem,shadeColor} from './catalog-order-e14b41d62339.mjs';
import {e} from './views-e14b41d62339.mjs';
import {button} from './rebuild-views-e14b41d62339.mjs';

export function createCatalogManagement({getState,getRepo,tasks,openModal,closeModal,save,toast,catalog}){
 let context={groupId:null,onReturn:null},positions=new Map();
 function remember(){if(document.querySelector('#dialog[open] .catalog-manager'))positions.set(context.groupId,captureModalPosition());}
 function open(groupId=null,{onReturn=null}={}){positions=new Map();context={groupId,onReturn};show(groupId);}
 function show(groupId=context.groupId){
  remember();context.groupId=groupId;const s=getState(),g=s.activityGroups.find(g=>g.id===groupId);
  const row=(action,id,name,detail,color)=>button(action,`<i class="catalog-dot" style="background:${e(color??'#596c80')}"></i><span><strong>${e(name)}</strong><small>${e(detail)}</small></span><span aria-hidden="true">›</span>`,id,'catalog-row');
  const groupRow=g=>row('manage-catalog-group',g.id,g.name,g.archived?'已归档':orderedLabels(s,g.id).filter(a=>!a.archived).length+' 个固定标签',g.color);
  const labelRow=a=>row('edit-activity',a.id,a.name,a.archived?'已归档':'编辑标签与关联',shadeColor(g.color,a.colorShade));
  const content=g?`${button('catalog-manage-root','‹ 全部分类','','text-button')}<div class="catalog-section-heading"><p>${g.archived?'已归档 · 历史保留':'固定标签'}</p>${button('rename-group','分类设置',g.id,'text-button')}</div><div class="catalog-list">${orderedLabels(s,g.id).filter(a=>!a.archived).map(labelRow).join('')||'<p class="quiet-note">还没有固定标签。</p>'}</div>${button('catalog-create','＋ 固定标签',g.id,'secondary')}${orderedLabels(s,g.id).some(a=>a.archived)?`<details class="catalog-archived"><summary>已归档的标签</summary>${orderedLabels(s,g.id).filter(a=>a.archived).map(labelRow).join('')}</details>`:''}`:
   `<div class="catalog-list">${orderedGroups(s).filter(g=>!g.archived).map(groupRow).join('')}</div>${button('new-group','＋ 新分类','','secondary')}${s.activityGroups.some(g=>g.archived)?`<details class="catalog-archived"><summary>已归档的分类</summary>${orderedGroups(s).filter(g=>g.archived).map(groupRow).join('')}</details>`:''}`;
  openModal(g?g.name:'分类与固定标签',`<div class="catalog-manager">${content}</div>`,{context:{onClose:context.onReturn}});const dialog=document.querySelector('#dialog');dialog.classList.add('catalog-panel');const back=dialog.querySelector('.close-button');back.classList.add('catalog-back');back.textContent=context.onReturn?'‹ 返回选择':'‹ 返回';back.setAttribute('aria-label',context.onReturn?'返回原选择':'返回');dialog.querySelector('.dialog-header').prepend(back);restoreModalPosition(positions.get(groupId));
 }
 async function editGroup(id=null){
  remember();const s=getState(),old=s.activityGroups.find(g=>g.id===id),g=old??{id:D.uid(),name:'',color:'#596c80',order:s.activityGroups.length,archived:false,growthPolicy:{mainSkillId:null,relatedSkillIds:[]},version:1},items=orderedGroups(s),returnTo=context.groupId;
  await tasks.open({id:'category:'+(id??'new'),kind:'activity',title:old?'分类设置':'新分类',original:old,initial:{...g,position:old?items.findIndex(v=>v.id===id)+1:items.length+1,archived:g.archived?['on']:[]},extra:{entityId:g.id},onReturn:()=>show(returnTo),
   body:()=>`<label>分类名称<input name="name" maxlength="60" required autofocus></label><label>主颜色<input name="color" type="color"></label><label>显示位置<select name="position">${Array.from({length:items.length+(old?0:1)},(_,i)=>`<option value="${i+1}">第 ${i+1} 位</option>`).join('')}</select></label><label class="check"><input type="checkbox" name="archived">归档收起，历史保留</label><p class="quiet-note">归档会收起此分类下 ${s.activities.filter(a=>a.groupId===g.id&&!a.archived).length} 个在用标签，可在管理页恢复。当前计时及旧记录保持原样。</p>${old?button('catalog-group-policy','默认培养关联',id,'text-button')+'<hr>'+button('delete-category','删除分类',id,'text-button danger'):''}`,
   onSave:async(f,{commit,original,payload})=>{await commit(state=>{const index=state.activityGroups.findIndex(v=>v.id===payload.entityId),current=state.activityGroups[index];if(original&&JSON.stringify(current)!==JSON.stringify(original))throw Error('分类已变化，请核对后保存');const name=String(f.get('name')).trim();if(!name)throw Error('请填写分类名称');const next={...(original??g),id:payload.entityId,name,color:f.get('color'),archived:f.has('archived'),version:(original?.version??0)+1};if(index<0)state.activityGroups.push(next);else state.activityGroups[index]=next;positionItem(orderedGroups(state),next.id,f.get('position'));for(const a of state.activities.filter(a=>a.groupId===next.id)){a.category=next.name;a.color=shadeColor(next.color,a.colorShade);}return state;});},onSaved:()=>show(returnTo)});
 }
 async function remove(id){
  await tasks.leave();const before=getState(),drafts=await getRepo().listDrafts(),impact=categoryImpact(before,id,drafts),targets=orderedGroups(before).filter(g=>g.id!==id&&!g.archived);
  openModal('删除分类 · '+impact.group.name,`<p>${impact.labels.length} 个固定标签 · ${impact.history} 条历史记录 · ${impact.tasks} 项任务引用${impact.running?' · 有正在运行的计时':''}${impact.drafts?' · '+impact.drafts+' 份其他草稿引用':''}</p><p>历史、成长、阶段来源和当前计时保留。有引用的分类会保留可恢复的归档身份。</p><label>处理方式<select name="mode">${impact.canDelete?'<option value="delete">删除这个无引用的空分类</option>':''}<option value="archive">停止使用并保留历史</option>${impact.labels.length&&targets.length?'<option value="move">移动固定标签后移除分类</option>':''}</select></label>${impact.labels.length&&targets.length?`<label>移到分类<select name="targetId">${targets.map(g=>`<option value="${e(g.id)}">${e(g.name)}</option>`).join('')}</select></label>`:''}<p class="quiet-note">停止使用后，可在管理页的“已归档的分类”中恢复；移动标签不改原培养去向。</p>`,{submit:'确认处理分类',context:{onClose:()=>editGroup(id)},onSubmit:async f=>{
   const latestDrafts=await getRepo().listDrafts();await save(state=>removeCategory(state,id,{mode:f.get('mode'),targetId:f.get('targetId'),expectedGroup:impact.group,expectedImpact:impactKey(impact),drafts:latestDrafts}),{clearDraftId:'category:'+id,checkDrafts:(next,current)=>{if(!next.activityGroups.some(g=>g.id===id)&&categoryImpact({...next,activityGroups:[...next.activityGroups,impact.group]},id,current).drafts)throw Error('其他编辑已引用此分类，请重新查看影响');}});
   await closeModal({resume:false});context.groupId=null;show(null);toast('分类已处理，历史与当前计时保留');
  }});
 }
 const editLabel=id=>{remember();const groupId=context.groupId;return catalog.edit(id||null,{groupId,onReturn:()=>show(groupId),allowStart:false});};
 return {open,editGroup,editLabel,actions:{'delete-category':remove,'manage-activities':()=>open(),'manage-catalog-group':id=>show(id),'catalog-manage-root':()=>show(null),'new-group':()=>editGroup(),'rename-group':id=>editGroup(id),'edit-activity':id=>editLabel(id),'catalog-create':id=>{context.groupId=id;return editLabel(null);},'catalog-group-policy':async id=>{await tasks.leave();return catalog.editGroup(id,{onReturn:()=>editGroup(id)});}}};
}
