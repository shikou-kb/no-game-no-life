// Retain the art, quick-strip nodes, scroll and focus when only committed timer data changed.
export function patchTimerHome(root,before,after){
 if(!before)return false;const parse=text=>{const t=document.createElement('template');t.innerHTML=text;return t.content;},old=parse(before),next=parse(after),selectors=['.r-timer','.r-day-facts','.r-footer-actions'];
 const signature=fragment=>{const copy=fragment.cloneNode(true);for(const selector of selectors)copy.querySelector(selector)?.remove();for(const el of copy.querySelectorAll('[data-action=quick-start]'))el.removeAttribute('aria-current');const box=document.createElement('div');box.append(copy);return box.innerHTML;};
 if(!old.querySelector('.r-record')||signature(old)!==signature(next))return false;
 const focused=document.activeElement?.closest('[data-action]'),focus=focused&&root.contains(focused)?{action:focused.dataset.action,id:focused.dataset.id}:null;
 for(const selector of selectors){const current=root.querySelector(selector),replacement=next.querySelector(selector);if(current&&replacement)current.replaceWith(replacement);else if(current)current.remove();else if(replacement)root.querySelector('.r-quick-section')?.after(replacement);}
 for(const el of root.querySelectorAll('[data-action=quick-start]')){const selected=next.querySelector(`[data-action=quick-start][data-id="${CSS.escape(el.dataset.id)}"]`)?.hasAttribute('aria-current');if(selected)el.setAttribute('aria-current','true');else el.removeAttribute('aria-current');}
 if(focus&&!focused.isConnected)(root.querySelector(`[data-action="${focus.action}"][data-id="${CSS.escape(focus.id??'')}"]`)??root.querySelector('[data-action=choose-activity]'))?.focus({preventScroll:true});return true;
}
