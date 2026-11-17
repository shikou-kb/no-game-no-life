import {uid} from './domain-27ca4e179461.mjs';
export function formValues(form){const data={};for(const el of form.elements){if(!el.name||el.type==='file'||el.hasAttribute('data-task-navigation'))continue;if(el.type==='checkbox'){data[el.name]??=[];if(el.checked)data[el.name].push(el.value);}else if(el.type==='radio'){if(el.checked)data[el.name]=el.value;}else data[el.name]=el.value;}return data;}
function restore(form,values){for(const el of form.elements){if(!el.name||!(el.name in values)||el.type==='file'||el.hasAttribute('data-task-navigation'))continue;const v=values[el.name];if(el.type==='checkbox')el.checked=Array.isArray(v)?v.includes(el.value):!!v;else if(el.type==='radio')el.checked=v===el.value;else el.value=v??'';}}
export function createTaskEditor({getRepo,save,openModal,closeModal,showError}){
 let active=null;
 async function open({id,kind,title,initial={},original=null,body,bind,submit='保存',onSave,onSaved=null,onReturn=null,photos=[],assetRefs=[],extra={},normalizeOriginal=null}){
  if(active){await active.flush();active=null;}
  const prior=(await getRepo().listDrafts()).find(d=>d.id===id),payload=prior?.payload??{values:initial,initialValues:initial,original,operationId:uid(),...extra};
  if(normalizeOriginal&&payload.original)payload.original=normalizeOriginal(payload.original);
  let form,dirty=false,queue=Promise.resolve(),timer=null;
  let conflict=!!prior&&((original&&JSON.stringify(original)!==JSON.stringify(payload.original))||('focusId' in extra&&payload.focusId!==extra.focusId));
  const draft={id,kind,photos:prior?.photos??photos,assetRefs:prior?.assetRefs??assetRefs,payload,onReturn,
   flush:async()=>{clearTimeout(timer);if(dirty){dirty=false;const record={id,kind,text:'',photos:draft.photos,assetRefs:draft.assetRefs,payload:{...payload,values:formValues(form)},updatedAt:Date.now()};queue=queue.catch(()=>{}).then(()=>getRepo().saveDraft(record,{photosChanged:true})).catch(error=>{dirty=true;throw error;});}await queue;},
   changed:()=>{dirty=true;clearTimeout(timer);timer=setTimeout(()=>draft.flush().catch(error=>{dirty=true;showError(error);}),200);}
  };
  openModal(title,body(payload.values,payload.original)+`<section data-task-conflict ${conflict?'':'hidden'}><p class="form-error">保存后的内容已变化。填写仍保留，请读取最新配置并核对表单后保存。</p><button type="button" class="secondary" data-rebase-task>读取最新配置，保留我修改的字段</button><p class="quiet-note" data-rebase-summary></p></section><button type="button" class="text-button" data-action="discard-task-draft">放弃这次修改</button><p class="quiet-note">返回会保留草稿，下次可继续。</p>`,{submit,onSubmit:async f=>{
   if(conflict)throw Error('请先读取最新配置并核对；填写仍保留');
   await draft.flush();const commit=(mutator,opts={})=>save(mutator,{...opts,operationId:payload.operationId,clearDraftId:id});
   await onSave(f,{commit,original:payload.original,payload,draft});active=null;await closeModal();if(onSaved)await onSaved(payload);else await onReturn?.();
  }});
  active=draft;document.querySelector('#dialog').classList.add('task-edit');form=document.querySelector('#modal-form');restore(form,payload.values);form.querySelector('[data-rebase-task]').onclick=async()=>{const entered=formValues(form),baseline=payload.initialValues??{};const values={...initial};for(const [k,v] of Object.entries(entered))if(!(k in baseline)||JSON.stringify(Array.isArray(v)?v:String(v??''))!==JSON.stringify(Array.isArray(baseline[k])?baseline[k]:String(baseline[k]??'')))values[k]=v;payload.original=structuredClone(original);payload.initialValues=structuredClone(initial);if('focusId' in extra)payload.focusId=extra.focusId;restore(form,values);form.dispatchEvent(new Event('change',{bubbles:true}));conflict=false;form.querySelector('[data-rebase-task]').disabled=true;form.querySelector('[data-task-conflict] .form-error').textContent='已读取最新版本。请核对下面的保存结果，尤其是培养去向与所选来源。';form.querySelector('[data-rebase-summary]').textContent='未修改字段采用最新值；你改过的字段保持填写。返回仍会保留草稿。';draft.changed();await draft.flush();};form.addEventListener('input',draft.changed);form.addEventListener('change',draft.changed);await bind?.(form,draft);dirty=true;await draft.flush();
 }
 return {open,get active(){return active;},async leave(){if(!active)return null;const draft=active;await draft.flush();active=null;return draft.onReturn;},async discard(){if(!active)return;const draft=active;await draft.flush();await getRepo().deleteDraft(draft.id);active=null;await closeModal();await draft.onReturn?.();}};
}
