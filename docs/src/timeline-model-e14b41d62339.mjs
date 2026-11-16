import * as D from './domain-e14b41d62339.mjs';
export function timelineEntries(state,date,{memory=false,now=Date.now()}={}){
 const start=D.dayStart(date,state.timeZone),end=D.dayStart(D.addDays(date,1),state.timeZone),items=[];
 const rows=D.confirmedSessions(state).filter(r=>r.start<end&&r.end>start).map(row=>({type:'activity',start:Math.max(row.start,start),end:Math.min(row.end,end),row})).sort((a,b)=>a.start-b.start);
 let previous=null;
 for(const item of rows){if(previous!==null&&item.start>previous)items.push({type:'gap',start:previous,end:item.start});items.push(item);previous=Math.max(previous??start,item.end);}
 if(memory)for(const row of state.moments.filter(m=>!m.sessionId&&D.dateKey(m.at,state.timeZone)===date))items.push({type:'moment',start:row.at,end:row.at,row});
 const r=state.running;
 if(r&&r.start<end&&date===D.dateKey(now,state.timeZone)&&!rows.some(x=>x.row.id===r.id))items.push({type:'running',start:Math.max(start,r.start),end:null,row:r});
 return items.sort((a,b)=>b.start-a.start||(b.end??now)-(a.end??now));
}
