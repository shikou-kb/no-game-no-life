import * as D from './domain-e14b41d62339.mjs';
import {contextTotals} from './records-e14b41d62339.mjs';
const palette=['#648a73','#b89b63','#8baab1','#a18fa8','#b3997b','#85a278','#b09885','#84a2b0'];
export function dayComposition(state,date,now=Date.now()){
 const rows=D.sessionsInRange(state,date,date),start=D.dayStart(date,state.timeZone),end=D.dayStart(D.addDays(date,1),state.timeZone),byCategory=new Map();
 for(const row of rows){const minutes=(row.end-row.start)/60000;byCategory.set(row.category,(byCategory.get(row.category)||0)+minutes);}
 const totalMinutes=rows.reduce((n,r)=>n+(r.end-r.start)/60000,0),r=state.running;
 const pendingMinutes=(r?Math.max(0,Math.min(end,now)-Math.max(start,r.confirmedUntil))/60000:0)+state.sessions.filter(x=>x.confirmation==='pending').reduce((n,x)=>n+Math.max(0,Math.min(end,now,x.end)-Math.max(start,x.start))/60000,0);
 return {totalMinutes,pendingMinutes,blankMinutes:Math.max(0,(Math.max(start,Math.min(now,end))-start)/60000-totalMinutes-pendingMinutes),categories:[...byCategory].sort((a,b)=>b[1]-a[1]).map(([name,minutes],i)=>({name,minutes,color:palette[i%palette.length]})),contexts:contextTotals(state,date,date)};
}
export function basicInvestment(state){
 const result={study:{total:0,assigned:0,unassigned:0},exercise:{total:0,assigned:0,unassigned:0}};
 for(const r of D.confirmedSessions(state)){
  const kind=Object.hasOwn(r,'investmentKind')?r.investmentKind:r.category==='学习'?'study':r.category==='运动'?'exercise':null;
  if(!result[kind])continue;const minutes=(r.end-r.start)/60000;result[kind].total+=minutes;result[kind][r.mainSkillId?'assigned':'unassigned']+=minutes;
 }return result;
}
export function compositionCard(state,date,{e,duration,num}){
 const v=dayComposition(state,date);let percent=0;const colors=v.categories.map(c=>{const from=percent;percent+=c.minutes/v.totalMinutes*100;return `${c.color} ${from}% ${percent}%`;});
 return `<div class="composition"><div class="donut" style="background:${colors.length?'conic-gradient('+colors.join(',')+')':'var(--line)'}" role="img" aria-label="已确认主活动 ${e(duration(v.totalMinutes))}"><span><b>${duration(v.totalMinutes)}</b><small>已确认主活动</small></span></div><div class="composition-legend">${v.categories.map(c=>`<button type="button" data-action="category-records" data-id="${e(c.name)}"><i style="background:${c.color}"></i><span>${e(c.name)}</span><b>${duration(c.minutes)}</b><small>${num(c.minutes/v.totalMinutes*100)}%</small></button>`).join('')||'<p class="muted">还没有已确认的记录</p>'}</div></div><p class="quiet-note">未记录 ${duration(v.blankMinutes)} · 待核对 ${duration(v.pendingMinutes)}<br>占比只计算已确认主活动；未来时间不算空白。</p>${Object.keys(v.contexts).length?`<div class="context-summary"><span>情境 · 已包含在主时间内</span>${Object.entries(v.contexts).map(([name,n])=>`<p>${e(name)} <b>${duration(n)}</b></p>`).join('')}</div>`:''}`;
}
export function growthOverview(state,{e,duration}){
 const v=basicInvestment(state),names=['认知内涵','知识与思维工具','身体素质','外在形象与呈现','领域技能','通用能力'];
 return `<section class="card"><div class="section-title"><h2>整体培养概览</h2><span class="tag">组成框架 · 可调整</span></div><div class="investment-grid">${[['study','学习投入'],['exercise','运动投入']].map(([k,title])=>`<div><span>${title}</span><strong>${duration(v[k].total)}</strong><p>已关联具体培养项 ${duration(v[k].assigned)}<br>尚未关联 ${duration(v[k].unassigned)}</p></div>`).join('')}</div><div class="composition-grid">${names.map(name=>{const linked=state.skills.filter(s=>s.composition===name);return `<div><h3>${name}</h3><p>${name==='身体素质'&&v.exercise.total?`运动投入 ${duration(v.exercise.total)}`:linked.length?linked.map(s=>e(s.name)).join('、'):'尚未关联记录'}</p></div>`;}).join('')}</div><p class="quiet-note">学习投入不猜具体能力；运动时长不等于体能提升。组成只汇总同一份记录，不额外发分。具体等级与能力自评保留在培养项中。</p></section>`;
}
