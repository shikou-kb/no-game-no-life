export function bindQuickStrip(root,{onIdle=()=>{}}={}){
 const strip=root.querySelector('[data-quick-strip]');if(!strip)return ()=>{};
 const viewport=strip.parentElement,hint=root.querySelector('[data-quick-hint]');let gesture=null,suppressUntil=0,busyUntil=0,idleTimer=null;
 const isInteracting=()=>!!gesture||performance.now()<busyUntil;
 const idle=()=>{clearTimeout(idleTimer);idleTimer=setTimeout(()=>{if(isInteracting())idle();else onIdle();},Math.max(30,busyUntil-performance.now()+10));};
 const events=new AbortController(),listen=(name,handler,options={})=>strip.addEventListener(name,handler,{...options,signal:events.signal});
 const update=()=>{const max=Math.max(0,strip.scrollWidth-strip.clientWidth);viewport.dataset.before=String(strip.scrollLeft>1);viewport.dataset.after=String(strip.scrollLeft<max-1);if(hint)hint.hidden=max<=1;};
 listen('pointerdown',event=>{if(!event.isPrimary||event.button!==0)return;suppressUntil=0;gesture={id:event.pointerId,x:event.clientX,y:event.clientY,left:strip.scrollLeft,moved:false};},{passive:true});
 const moved=event=>gesture&&(gesture.moved||Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>8||Math.abs(strip.scrollLeft-gesture.left)>1);
 listen('pointermove',event=>{if(gesture?.id===event.pointerId&&moved(event))gesture.moved=true;},{passive:true});
 listen('pointerup',event=>{if(gesture?.id!==event.pointerId)return;if(moved(event))suppressUntil=performance.now()+700;gesture=null;busyUntil=performance.now()+700;idle();},{passive:true});
 listen('pointercancel',event=>{if(gesture?.id!==event.pointerId)return;suppressUntil=performance.now()+700;gesture=null;busyUntil=performance.now()+700;idle();},{passive:true});
 listen('scroll',()=>{busyUntil=Math.max(busyUntil,performance.now()+180);idle();if(gesture&&Math.abs(strip.scrollLeft-gesture.left)>1)gesture.moved=true;update();},{passive:true});
 listen('click',event=>{if(event.detail>0&&(gesture?.moved||performance.now()<suppressUntil)){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
 const observer=new ResizeObserver(update);observer.observe(strip);for(const child of strip.children)observer.observe(child);update();
 const dispose=()=>{clearTimeout(idleTimer);events.abort();observer.disconnect();};dispose.isInteracting=isInteracting;return dispose;
}
