// Serialize accepted intents, preserving the clock captured before any storage wait.
export function createTimerQueue({paint=()=>{}}={}){
 let tail=Promise.resolve(),pending=[];
 const emit=()=>paint(pending);
 return {get pending(){return pending.length>0;},paint:emit,settled:()=>tail.catch(()=>{}),
  run(key,work){const last=pending.at(-1);if(last?.key===key)return last.promise;
   const item={key,at:Date.now(),since:performance.now(),promise:null};pending.push(item);emit();
   item.promise=tail.catch(()=>{}).then(()=>work(item.at)).finally(()=>{pending=pending.filter(p=>p!==item);emit();});tail=item.promise;return item.promise;
  }
 };
}
export function paintTimerPending(pending){
 const current=pending[0],keys=new Set(pending.map(p=>p.key));
 for(const button of document.querySelectorAll('[data-action=quick-start],[data-action=stop]')){const key=button.dataset.action==='stop'?'stop':'start:'+button.dataset.id;button.setAttribute('aria-busy',String(keys.has(key)));}
 let status=document.querySelector('.timer-save-status');const timer=document.querySelector('.r-timer');if(!timer)return;
 if(!current){status?.remove();timer.removeAttribute('aria-busy');timer.querySelector('[data-pending-stop]')?.remove();return;}
 if(!timer.querySelector('[data-action=stop]')){const stop=document.createElement('button');stop.type='button';stop.className='secondary';stop.dataset.action='stop';stop.dataset.pendingStop='';stop.textContent='停止';timer.querySelector('.r-timer-actions')?.append(stop);}
 timer.setAttribute('aria-busy','true');if(!status){status=document.createElement('span');status.className='timer-save-status';status.setAttribute('role','status');timer.append(status);}
 status.textContent=performance.now()-current.since>=150?(current.key.startsWith('adjust-end:')?'保存中…':current.key==='stop'?'停止中…':document.querySelector('.r-timer.is-running')?'切换中…':'开始中…'):'';
}
