export function captureModalPosition(){
 const dialog=document.querySelector('#dialog');if(!dialog?.open)return null;
 const el=document.activeElement;
 return {scroll:dialog.scrollTop,body:dialog.querySelector('.dialog-body')?.scrollTop??0,focus:dialog.contains(el)?{action:el.dataset.action,id:el.dataset.id,name:el.name}:null,details:[...dialog.querySelectorAll('details')].map(d=>d.open)};
}
export function restoreModalPosition(position){
 if(!position)return;const dialog=document.querySelector('#dialog'),form=dialog?.querySelector('form');
 requestAnimationFrame(()=>{if(!dialog.open||dialog.querySelector('form')!==form)return;
  [...dialog.querySelectorAll('details')].forEach((d,i)=>{if(position.details[i]!==undefined)d.open=position.details[i];});
  const {action,id,name}=position.focus??{},selector=action?`[data-action="${CSS.escape(action)}"]${id!==undefined?`[data-id="${CSS.escape(id)}"]`:''}`:name?`[name="${CSS.escape(name)}"]`:null;
  let el=selector?dialog.querySelector(selector):null;if(!el?.getClientRects().length)el=[...dialog.querySelectorAll('.catalog-row,.choose-option,button')].find(v=>v.getClientRects().length);
  el?.focus({preventScroll:true});dialog.scrollTop=position.scroll;const body=dialog.querySelector('.dialog-body');if(body)body.scrollTop=position.body;
 });
}
