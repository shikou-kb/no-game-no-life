import * as D from './domain-27ca4e179461.mjs';
import {endTimeBasis,adjustEndTime} from './end-time-27ca4e179461.mjs';
import {e,duration} from './views-27ca4e179461.mjs';

export function createEndTimeUI({getState,getUI,tasks,timerQueue,toast}){
 let opening=false;
 async function open(kind,id,expectedVersion=null,draft=null){
  if(opening)return;opening=true;
  try{
   await timerQueue.settled();
   const state=getState(),current=endTimeBasis(state,kind,id),basis=draft?.payload.original??current;
   if(!basis)throw Error('原记录已变化，请从计时区重新选择要调整的一段');
   if(!draft&&expectedVersion!==null&&current?.row.version!==Number(expectedVersion))throw Error('原记录已更新，请核对后重新打开');
   const confirmedThrough=kind==='running'?state.running?.confirmedUntil:current?.segments?.filter(r=>r.confirmation!=='pending').at(-1)?.end;
   const zone=state.timeZone,initialEnd=basis.kind==='running'?Date.now():basis.row.end;
   await tasks.open({id:'end-time:'+basis.kind+':'+basis.row.id,kind:'time-edit',title:'调整结束时间',original:current,
    extra:{endAdjustment:true},initial:{end:D.localInput(initialEnd,zone,true)},submit:basis.kind==='running'?'按此时间结束':'保存调整',
    body:(_values,original)=>{const b=original??basis,row=b.row,start=D.localInput(row.start,zone,true).replace('T',' '),end=b.kind==='running'?'正在记录':D.localInput(row.end,zone,true).replace('T',' ');return `<section class="end-time-basis" data-record-id="${e(row.id)}" data-record-version="${row.version}"><strong>${e(row.temporaryName||row.name)}</strong><p>${e(start)} → ${e(end)}</p></section><label>实际结束时间<input name="end" type="datetime-local" step="1" required></label><p class="quiet-note">按账本时区 ${e(zone)}。只修改这一段，多计的尾部留白；图文与独立成果保留。</p>${row.needsReview||row.confirmation==='pending'?`<p class="end-time-review">这段含待核对时间。${confirmedThrough?'原已确认到 '+e(D.localInput(confirmedThrough,zone,true).replace('T',' '))+'。':''}保存将确认本段开始至所选结束时刻，其后未知时间不会自动确认。</p>`:''}<p class="quiet-note" data-end-duration></p>`;},
    bind(form){const update=()=>{try{const end=D.parseEditedLocal(form.elements.end.value,initialEnd,zone);form.querySelector('[data-end-duration]').textContent=end>basis.row.start?(end<initialEnd?'提前结束 '+duration((initialEnd-end)/60000)+'，之后留白。':'')+'调整后时长：'+duration((end-basis.row.start)/60000):'';}catch{form.querySelector('[data-end-duration]').textContent='';}};form.elements.end.addEventListener('input',update);update();},
    onSave:async(f,{commit,original,payload})=>{
     if(!original)throw Error('原记录已变化，填写仍保留，请重新核对');
     const end=D.parseEditedLocal(f.get('end'),initialEnd,zone);
     await timerQueue.run('adjust-end:'+original.row.id,now=>commit(s=>adjustEndTime(s,original,end,{now,operationId:payload.operationId}),{timerOnly:true,onCommitted:()=>{getUI().lastStoppedId=original.row.id;}}));
    },onSaved:()=>toast('结束时间已调整，记录与统计已同步')
   });
  }finally{opening=false;}
 }
 return {open,resume:draft=>open(draft.payload.original?.kind,draft.payload.original?.row.id,null,draft)};
}
