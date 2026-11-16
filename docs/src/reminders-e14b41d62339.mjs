import * as D from './domain-e14b41d62339.mjs';
import {occurrence,weekStart} from './weekly-model-e14b41d62339.mjs';
export function reminderSuggestions(state,now=Date.now()){
 if(!state.running)return [];const week=weekStart(D.dateKey(now,state.timeZone));
 return state.weeklyRules.flatMap(rule=>[week,D.addDays(week,-7)].map(w=>({...occurrence(state,rule,w),title:rule.title}))).filter(o=>o.state==='scheduled'&&o.activityId===state.running.activityId&&o.start<=now&&o.end>now);
}
export function scheduleReminder(state,at,{now=Date.now(),occurrenceKey=null}={}){
 if(!state.running)throw Error('先开始一项活动');if(!Number.isSafeInteger(at)||at<=now||at>now+7*86400000)throw Error('预计结束须在未来七天内');
 const s=D.copy(state);for(const r of s.reminders)if(r.status==='scheduled')r.status='cancelled';
 s.reminders.push({id:D.uid(),runningId:s.running.id,generation:s.dataGeneration,at,createdAt:now,status:'scheduled',occurrenceKey});return s;
}
export function cancelReminders(state){const s=D.copy(state);for(const r of s.reminders)if(r.status==='scheduled')r.status='cancelled';return s;}
export function reconcileReminders(state){for(const r of state.reminders)if(r.status==='scheduled'&&(r.runningId!==state.running?.id||r.generation!==state.dataGeneration))r.status='cancelled';return state;}
export function reminderProjection(state){return state.reminders.findLast(r=>r.status==='scheduled'&&r.runningId===state.running?.id&&r.generation===state.dataGeneration)??null;}
export function createReminderUI({getState,save,openModal,closeModal,e,toast}){
 function open(){const state=getState(),r=state.running;if(!r)return;const current=reminderProjection(state),suggestions=reminderSuggestions(state);
  openModal('这一次，预计何时结束',`<p>只提醒一次，不会自动停止、切换或确认你在做什么。系统可能延迟；网页关闭后无法保证提醒。</p><label>预计结束<input type="datetime-local" name="at" required value="${current?D.localInput(current.at,state.timeZone):''}"></label>${suggestions.map(o=>`<button type="button" class="secondary" data-action="adopt-reminder" data-id="${e(o.key)}">采用“${e(o.title)}”的结束 ${D.localInput(o.end,state.timeZone).replace('T',' ')}</button>`).join('')}${current?'<button type="button" class="text-button" data-action="cancel-reminder">取消本次提醒</button>':''}`,{submit:'保存这一次提醒',onSubmit:async f=>{const at=D.parseLocal(f.get('at'),state.timeZone);await save(s=>{if(s.running?.id!==r.id)throw Error('当前计时已切换');return scheduleReminder(s,at);});await closeModal();toast('已安排一次近似提醒');}});
 }
 return {actions:{'timer-reminder':open,'adopt-reminder':async key=>{const o=reminderSuggestions(getState()).find(x=>x.key===key);if(!o)throw Error('这个安排已变化，请重新查看');await save(s=>scheduleReminder(s,o.end,{occurrenceKey:key}));await closeModal();toast('已明确采用这次安排的结束提醒');},'cancel-reminder':async()=>{await save(cancelReminders);await closeModal();toast('本次提醒已取消');}}};
}
