import {renderDatePicker} from './date-picker-27ca4e179461.mjs';
import {dateKey,addDays,isDate,localInput,parseLocal,dayStart} from './calendar-27ca4e179461.mjs';
import {openChoicePanel} from './choices-27ca4e179461.mjs';
// Resolve a wall-clock value in the ledger zone, retaining untouched millisecond timestamps.
export function diaryTimestamp(input,zone,original=null){
 if(Number.isSafeInteger(original)&&localInput(original,zone,true)===normalize(input))return original;
 const desired=normalize(input);let at=parseLocal(desired,zone);
 for(let i=0;i<4;i++){const actual=localInput(at,zone,true);if(actual===desired)return at;at+=Date.parse(desired+'Z')-Date.parse(actual+'Z');}
 throw Error('这个日期时间在账本时区不存在，请调整钟点');
}
function normalize(input){const value=String(input);return value.length===16?value+':00':value;}
export function initialDiaryAt(state,{original=null,sessionId=null,date=null,now=Date.now()}={}){
 if(original)return original.at;const session=state.sessions.find(s=>s.id===sessionId);if(session)return session.start;
 return isDate(date)?dayStart(date,state.timeZone)+12*3600000:now;
}
export function bindDiaryDate({form,getState,changed}){
 const trigger=form.querySelector('#diary-date'),field=form.elements.at;
 const selected=()=>isDate(field.value.slice(0,10))?field.value.slice(0,10):null;
 function refresh(){const date=selected(),today=dateKey(Date.now(),getState().timeZone);trigger.querySelector('span').textContent=date?'回顾日期 · '+(date.slice(0,4)===today.slice(0,4)?'':date.slice(0,4)+'年')+date.slice(5).replace('-','月')+'日':'选择日期';trigger.setAttribute('aria-label','回顾日期：'+(date??'未填写'));trigger.dataset.date=date??'';}
 function apply(date){if(!isDate(date))throw Error('请选择完整日期');const time=normalize(field.value).split('T')[1]||'12:00:00',value=date+'T'+time;let resolved=value;try{diaryTimestamp(value,getState().timeZone);}catch{resolved=date+'T12:00:00';diaryTimestamp(resolved,getState().timeZone);}field.value=resolved;field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));refresh();changed?.();}
 trigger.onclick=()=>{const today=dateKey(Date.now(),getState().timeZone),previous=selected();openChoicePanel({trigger,title:'回顾日期',description:'这篇闪回与时间概览使用同一天。',render:({body,footer,node,close})=>{
  const list=node('div','choice-options');list.setAttribute('role','listbox');list.setAttribute('aria-label','回顾日期');body.append(list);let dispose=()=>{};
  const error=node('p','form-error');error.hidden=true;error.setAttribute('role','alert');const commit=date=>{try{apply(date);close();}catch(err){error.textContent=err.message;error.hidden=false;}};
  for(const [label,date]of [['今天',today],['昨天',addDays(today,-1)]]){const button=node('button','choice-option');button.type='button';button.setAttribute('role','option');button.setAttribute('aria-selected',String(date===previous));button.dataset.reviewDate=date;button.append(node('span','choice-option-label',label+' · '+date),node('span','choice-check',date===previous?'✓':''));button.onclick=()=>commit(date);list.append(button);}
  const custom=node('button','choice-option','选择日期');custom.type='button';custom.onclick=()=>{body.replaceChildren();footer.replaceChildren();dispose=renderDatePicker({body,footer,node,value:previous,today,onPick:commit,close});body.append(error);};list.append(custom);body.append(error);return ()=>dispose();
 }});};
 field.addEventListener('input',refresh);field.addEventListener('change',refresh);refresh();return refresh;
}
