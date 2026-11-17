import {dateKey} from './calendar-27ca4e179461.mjs';
import {renderDatePicker,renderMonthPicker} from './date-picker-27ca4e179461.mjs';
// Native controls own values, validation and form submission. This layer owns presentation.
let installed=false,current=null,sequence=0,historyClosing=false;
let getTimeZone=()=>'Asia/Shanghai';
const bindings=new Map(),groups=new Map(),token='ngnlChoice',sources='select,input[type=date],input[type=month]',watched=sources+',.checkbox-list,input[type=checkbox]';
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const labelFor=select=>select.dataset.choiceLabel||select.getAttribute('aria-label')||[...(select.labels??[])].map(label=>{const copy=label.cloneNode(true);copy.querySelectorAll('select,input,textarea,button,details').forEach(el=>el.remove());return copy.textContent.trim();}).filter(Boolean).join(' · ')||'请选择';
const disabled=option=>option.disabled||option.parentElement?.disabled;
function focusBack(trigger){if(trigger?.isConnected&&!trigger.disabled&&!trigger.closest('[hidden]'))trigger.focus({preventScroll:true});else (document.querySelector('#dialog[open] .choice-trigger:not(:disabled),#dialog[open] input:not([type=hidden]):not(:disabled),#dialog[open] button:not(:disabled)')||document.querySelector('#main'))?.focus({preventScroll:true});}
export function closeChoicePanel({fromHistory=false,restoreFocus=true}={}){
 if(!current)return false;const active=current;current=null;active.cleanup?.();active.dialog.close();active.dialog.remove();active.trigger?.setAttribute('aria-expanded','false');
 if(!fromHistory&&history.state?.[token]===active.id){historyClosing=true;history.back();}
 if(restoreFocus)focusBack(active.trigger);active.onClose?.();return true;
}
export function openChoicePanel({trigger,title,description='',render,onClose}){
 if(historyClosing)return null;closeChoicePanel({restoreFocus:false});
 const dialog=node('dialog','choice-panel'),header=node('header','choice-header'),heading=node('h2','',title),back=node('button','choice-close','×'),body=node('div','choice-body'),footer=node('footer','choice-footer');
 const id='choice-'+(++sequence);dialog.id=id;heading.id=id+'-title';dialog.setAttribute('aria-labelledby',heading.id);back.type='button';back.setAttribute('aria-label','关闭选择');header.append(heading,back);dialog.append(header);if(description)dialog.append(node('p','choice-description',description));dialog.append(body,footer);document.body.append(dialog);
 const active={dialog,trigger,id,onClose,cleanup:null};current=active;trigger?.setAttribute('aria-expanded','true');trigger?.setAttribute('aria-controls',id);
 history.pushState({...history.state,[token]:id},'');
 back.onclick=()=>closeChoicePanel();dialog.addEventListener('cancel',event=>{event.preventDefault();closeChoicePanel();});
 let outsideDown=false;dialog.addEventListener('pointerdown',event=>{const r=dialog.getBoundingClientRect();outsideDown=event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom);});
 dialog.addEventListener('click',event=>{if(outsideDown&&event.target===dialog){event.preventDefault();event.stopImmediatePropagation();closeChoicePanel();}outsideDown=false;},{capture:true});
 active.cleanup=render({dialog,body,footer,close:()=>closeChoicePanel(),node})??null;dialog.showModal();const initial=dialog.querySelector('[role=option][aria-selected=true]:not(:disabled),.date-day[aria-pressed=true]:not(:disabled)')||dialog.querySelector('.choice-option:not(:disabled)')||dialog.querySelector('input:not([hidden])')||back;initial.focus({preventScroll:true});initial.scrollIntoView({block:'nearest'});if(innerWidth>=760&&trigger){const r=trigger.getBoundingClientRect(),h=dialog.getBoundingClientRect().height;dialog.style.setProperty('--choice-left',Math.max(16,Math.min(r.left,innerWidth-374))+'px');dialog.style.setProperty('--choice-top',Math.max(16,Math.min(r.bottom+6,innerHeight-h-16))+'px');}return active;
}
function sync(record){
 const {select,button}=record;if(!select.isConnected)return;
 if(select.tagName==='SELECT'){const signature=select.innerHTML;if(record.options!==undefined&&signature!==record.options&&record.lastValue&&!Array.from(select.options).some(o=>o.value===record.lastValue)){HTMLSelectElement.prototype.__lookupSetter__('selectedIndex').call(select,-1);select.setCustomValidity('原选项已失效，请重新选择');record.invalidated=true;}record.options=signature;record.lastValue=select.value;}
 const values=select.tagName==='SELECT'?[...select.selectedOptions].map(o=>o.label):[select.value],text=(record.invalidated?'原选项已失效，请重新选择':values.join('、'))||(select.tagName==='SELECT'?'请选择':'选择日期'),label=labelFor(select);
 if(record.text.textContent!==text)record.text.textContent=text;
 if(button.getAttribute('aria-label')!==label+'：'+text)button.setAttribute('aria-label',label+'：'+text);
 button.disabled=select.matches(':disabled');button.hidden=select.hidden;button.setAttribute('aria-required',String(select.required));
 button.setAttribute('aria-invalid',String(!select.validity.valid));record.label=label;
}
function enhance(select){
 if(bindings.has(select)||select.closest('.choice-panel')||select.dataset.nativeSelect!==undefined)return;
 const button=node('button','choice-trigger'),text=node('span','choice-value'),chevron=node('span','choice-chevron','⌄');button.type='button';button.setAttribute('role','combobox');button.setAttribute('aria-haspopup',select.tagName==='SELECT'?'listbox':'dialog');button.setAttribute('aria-expanded','false');chevron.setAttribute('aria-hidden','true');button.append(text,chevron);
 const record={select,button,text,label:''};bindings.set(select,record);select.classList.add('choice-source');select.setAttribute('aria-hidden','true');select.tabIndex=-1;select.after(button);button.dataset.choiceFor=select.id||select.name||'selection';sync(record);
 for(const property of (select.tagName==='SELECT'?['value','selectedIndex']:['value'])){const descriptor=Object.getOwnPropertyDescriptor(select.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,property);Object.defineProperty(select,property,{configurable:true,get(){return descriptor.get.call(this);},set(value){descriptor.set.call(this,value);if(record.invalidated&&this.selectedIndex>=0){this.setCustomValidity('');record.invalidated=false;}record.lastValue=this.value;sync(record);}});}
 button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openSelect(record);});button.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();openSelect(record);}});
 select.addEventListener('focus',()=>button.focus({preventScroll:true}));select.addEventListener('invalid',event=>{event.preventDefault();if(select.matches(':disabled'))return;select.closest('details')?.setAttribute('open','');sync(record);if(!current){focusBack(button);openSelect(record,true);}});
}
function scan(){for(const [select,record]of bindings){if(!select.isConnected){if(current?.trigger===record.button)closeChoicePanel();bindings.delete(select);}else sync(record);}document.querySelectorAll(sources).forEach(enhance);document.querySelectorAll('.checkbox-list').forEach(enhanceChecks);for(const [group,record]of groups){if(!group.isConnected){if(current?.trigger===record.button)closeChoicePanel();groups.delete(group);}else record.sync();}}
function enhanceChecks(group){
 if(groups.has(group)||group.closest('.choice-panel'))return;
 const inputs=()=>[...group.querySelectorAll('input[type=checkbox]')],key=input=>input.name+'\0'+input.value,label=input=>input.closest('label')?.textContent.trim()||input.value;
 if(inputs().length<8&&!group.classList.contains('phone-app-list'))return;
 const title=group.dataset.choiceLabel||(group.classList.contains('phone-app-list')?'专注 App':group.closest('fieldset')?.querySelector('legend')?.textContent||(['H3','H2','LABEL','LEGEND'].includes(group.previousElementSibling?.tagName)?group.previousElementSibling.textContent:'选择关联'));
 const button=node('button','choice-trigger');button.type='button';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');group.before(button);group.classList.add('choice-check-source');group.setAttribute('aria-hidden','true');
 const record={button,sync(){const all=inputs();for(const input of all){input.tabIndex=-1;input.onfocus=()=>button.focus({preventScroll:true});}const text=`${title} · 已选 ${all.filter(i=>i.checked).length} 项`;if(button.textContent!==text)button.textContent=text;button.disabled=!all.some(i=>!i.matches(':disabled'));button.hidden=group.hidden;}};groups.set(group,record);record.sync();
 button.onclick=()=>{const pending=new Map(inputs().filter(i=>i.checked).map(i=>[key(i),label(i)]));openChoicePanel({trigger:button,title,description:'完成后填入表单；保存表单才应用。',render:({body,footer,node,close})=>{
  const search=node('input','choice-search'),notice=node('p','choice-description'),list=node('div','choice-options');search.type='search';search.placeholder='搜索名称';search.setAttribute('aria-label','搜索'+title);notice.setAttribute('role','status');body.append(search,notice,list);let query='';
  const draw=()=>{const all=inputs(),valid=new Set(all.map(key)),lost=[...pending].filter(([id])=>!valid.has(id));notice.textContent=lost.length?'已失效：'+lost.map(([,name])=>name).join('、')+'。完成将保留仍可用的选择。':'';notice.hidden=!lost.length;list.replaceChildren();
   for(const input of all){const text=label(input),id=key(input);if(!text.toLocaleLowerCase().includes(query.toLocaleLowerCase()))continue;const row=node('button','choice-option');row.type='button';row.setAttribute('role','checkbox');row.setAttribute('aria-checked',String(pending.has(id)));row.disabled=input.matches(':disabled');row.append(node('span','choice-check',pending.has(id)?'✓':'□'),node('span','choice-option-label',text));row.onclick=()=>{pending.has(id)?pending.delete(id):pending.set(id,text);row.setAttribute('aria-checked',String(pending.has(id)));row.firstChild.textContent=pending.has(id)?'✓':'□';};list.append(row);}
   if(!list.childElementCount)list.append(node('p','choice-empty','没有找到选项。'));
  };
  search.oninput=()=>{query=search.value;draw();};draw();const cancel=node('button','secondary','取消'),done=node('button','primary','完成');cancel.type=done.type='button';cancel.onclick=close;done.onclick=()=>{const changed=[];for(const input of inputs()){if(input.matches(':disabled'))continue;const checked=pending.has(key(input));if(checked!==input.checked){input.checked=checked;changed.push(input);}}close();for(const input of changed){input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}record.sync();};footer.append(cancel,done);
  const observer=new MutationObserver(draw);observer.observe(group,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','value'],characterData:true});return ()=>observer.disconnect();
 }});};
}
function openSelect(record,invalid=false){
 const {select,button}=record;if(select.matches(':disabled')||!select.isConnected)return;sync(record);
 if(select.tagName!=='SELECT'){openChoicePanel({trigger:button,title:record.label,render:parts=>(select.type==='month'?renderMonthPicker:renderDatePicker)({...parts,today:dateKey(Date.now(),getTimeZone()),value:select.value,min:select.min,max:select.max,onPick:date=>{const prior=select.value;select.value=date;closeChoicePanel();if(prior!==date){select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));}}})});return;}
 const selected=new Set([...select.selectedOptions]),multiple=select.multiple;let query='',rows=[],list,search,optionsKey='';
 const apply=pending=>{if(!select.isConnected||select.matches(':disabled')){closeChoicePanel();return;}const options=[...select.options];if([...pending].some(o=>!options.includes(o)||disabled(o)&&!o.selected))return;
  const before=options.map(o=>o.selected);for(const option of options)if(!disabled(option))option.selected=pending.has(option);if(!multiple&&!pending.size)select.selectedIndex=-1;
  const changed=options.some((o,i)=>o.selected!==before[i]);if(record.invalidated){select.setCustomValidity('');record.invalidated=false;}record.lastValue=select.value;closeChoicePanel();sync(record);if(changed){select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));}queueMicrotask(scan);
 };
 openChoicePanel({trigger:button,title:record.label,description:invalid||record.invalidated?select.validationMessage:multiple?'选择后点完成；取消保留原选择。':'',render:({dialog,body,footer,node})=>{
  search=node('input','choice-search');search.type='search';search.placeholder='搜索选项';search.setAttribute('aria-label','搜索'+record.label);body.append(search);list=node('div','choice-options');list.setAttribute('role','listbox');list.setAttribute('aria-label',record.label);if(multiple)list.setAttribute('aria-multiselectable','true');body.append(list);
  const draw=()=>{const options=[...select.options];search.hidden=options.length<8;const focused=document.activeElement?.dataset.optionIndex;list.replaceChildren();rows=[];let group=null;options.forEach((option,index)=>{if(option.hidden||!(option.label+' '+(option.parentElement?.label??'')).toLocaleLowerCase().includes(query.toLocaleLowerCase()))return;const groupName=option.parentElement?.tagName==='OPTGROUP'?option.parentElement.label:'';if(groupName&&groupName!==group)list.append(node('p','choice-group',groupName));group=groupName;
    const row=node('button','choice-option');row.type='button';row.setAttribute('role','option');row.setAttribute('aria-selected',String(multiple?selected.has(option):option.selected));row.dataset.optionIndex=String(index);row.disabled=!!disabled(option);const label=node('span','choice-option-label',option.label||'未选择'),mark=node('span','choice-check',(multiple?selected.has(option):option.selected)?'✓':'');mark.setAttribute('aria-hidden','true');if(option.dataset.description)label.append(node('small','choice-option-description',option.dataset.description));row.append(label,mark);row.onclick=()=>{if(disabled(option))return;if(multiple){if(selected.has(option))selected.delete(option);else selected.add(option);draw();rows.find(r=>r.dataset.optionIndex===String(index))?.focus({preventScroll:true});}else apply(new Set([option]));};list.append(row);rows.push(row);
   });if(!rows.length)list.append(node('p','choice-empty',query?'没有找到选项。':'暂无可选项。'));if(focused)rows.find(r=>r.dataset.optionIndex===focused)?.focus({preventScroll:true});};
  search.oninput=()=>{query=search.value;draw();};draw();
  if(multiple){const cancel=node('button','secondary','取消');cancel.type='button';cancel.onclick=()=>closeChoicePanel();footer.append(cancel);const done=node('button','primary','完成');done.type='button';done.onclick=()=>apply(selected);footer.append(done);}
  dialog.addEventListener('keydown',event=>{if(event.target===search)return;const enabled=rows.filter(r=>!r.disabled);if(!enabled.length)return;let index=enabled.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();index=event.key==='Home'?0:event.key==='End'?enabled.length-1:(index+(event.key==='ArrowUp'?-1:1)+enabled.length)%enabled.length;enabled[index].focus();}else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&event.key!==' '){const match=enabled.find(r=>r.textContent.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()));match?.focus();}});
  const observer=new MutationObserver(()=>{if(!select.isConnected||select.matches(':disabled')){closeChoicePanel();return;}const key=select.innerHTML;if(key!==optionsKey){optionsKey=key;for(const option of selected)if(![...select.options].includes(option))selected.delete(option);draw();}});optionsKey=select.innerHTML;observer.observe(select,{subtree:true,childList:true,attributes:true,characterData:true});
  return ()=>observer.disconnect();
 }});
}
export function installChoices({timeZone}={}){
 if(timeZone)getTimeZone=timeZone;
 if(installed)return;installed=true;let scheduled=false;const schedule=()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;scan();});};
 const observer=new MutationObserver(records=>{if(records.some(r=>r.target.matches?.(watched)||r.type==='attributes'&&r.target.querySelector?.(watched)||r.target.closest?.('select')||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches(watched)||n.querySelector(watched)))))schedule();});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','required','multiple','hidden','selected','value','label','aria-label','type','min','max','checked'],characterData:true});
 for(const event of ['input','change'])document.addEventListener(event,schedule,true);document.addEventListener('reset',event=>setTimeout(()=>{for(const [select,r]of bindings)if(select.form===event.target&&r.invalidated){select.setCustomValidity('');r.invalidated=false;r.lastValue=select.value;}scan();},0),true);
 window.addEventListener('popstate',()=>{historyClosing=false;if(current&&history.state?.[token]!==current.id)closeChoicePanel({fromHistory:true});});
 document.addEventListener('click',event=>{const select=event.target.closest?.('.choice-source');if(select){event.preventDefault();event.stopImmediatePropagation();openSelect(bindings.get(select));}},{capture:true});scan();
}
