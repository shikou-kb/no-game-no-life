import {dayStart,dateKey,addDays} from './calendar-e14b41d62339.mjs';
const validTime=n=>Number.isSafeInteger(n)&&n>=0;
const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(36);};
const identity=(start,pkg)=>'usage:'+start+':'+hash(pkg);
export function mergeWindows(rows){const out=[];for(const r of rows.filter(r=>r.end>r.start).sort((a,b)=>a.start-b.start)){const last=out.at(-1);if(last&&r.start<=last.end)last.end=Math.max(last.end,r.end);else out.push({start:r.start,end:r.end});}return out;}
function outside(rows,windows){let out=rows;for(const w of windows)out=out.flatMap(r=>{if(r.end<=w.start||r.start>=w.end)return [r];const pieces=[];if(r.start<w.start)pieces.push({...r,end:w.start,ongoing:false,endKnown:false,continuous:false});if(r.end>w.end)pieces.push({...r,id:identity(w.end,r.packageName),start:w.end,startKnown:false,continuous:false});return pieces;});return out;}
const matches=(a,e)=>a&&a.packageName===e.packageName&&(!e.activity||!a.activity||e.activity===a.activity)&&(!e.instance||!a.instance||e.instance===a.instance);
export function initializeLegacyProtection(phone,migrationAt=0){
 if(phone.legacyProtectionPolicy===2)return phone;
 if(!phone.observation){
  // Old enable timestamps can be reset and deleted rows have no tombstones.
  // No earlier timestamp can be proved never recorded. Preserve old history
  // and its blanks through the latest known boundary, including moved edits.
  const boundary=phone.spans.reduce((end,r)=>Math.max(end,r.end,validTime(r.correctedAt)?r.correctedAt:0),Math.max(migrationAt,phone.enabledAt,phone.confirmedUntil,phone.cursor));
  phone.legacyProtection=mergeWindows([...(phone.legacyProtection??[]),{start:0,end:boundary}]);
 }else phone.legacyProtection??=[];
 phone.legacyProtectionPolicy=2;return phone;
}
// Reconstruct only within successfully queried islands. A same-package resume
// after a positive pause gap cannot prove continuous foreground use. Preserve
// continuity only while a resumed Activity remains, or at an exact handoff.
export function reconstructUsage(events,windows,until,previous=null,barriers={},locked=false){
 const rows=[],unknown=[];
 for(const [index,w] of windows.entries()){let active=null,pause=null,resumed=[],known=false,unknownStart=w.start,lastAt=w.start,offline=false;
  if(index&&w.start>windows[index-1].end)unknown.push({start:windows[index-1].end,end:w.start,reason:'系统事件未覆盖'});
  const close=(end,reason,ongoing=false)=>{if(active&&reason==='lock')delete barriers['lock:'+active.id];const barrier=active&&barriers['lock:'+active.id];if(Number.isSafeInteger(barrier)&&end>barrier){unknown.push({start:barrier,end,reason:'锁屏边界未返回'});end=barrier;reason='coverage';ongoing=false;}if(active&&end>active.start)rows.push({...active,end,ongoing,endKnown:!['coverage','startup','shutdown'].includes(reason),endReason:reason,continuous:true});active=null;pause=null;resumed=[];};
  const remember=e=>{resumed=e.activity?resumed.filter(a=>a.activity&&!matches(a,e)):[];resumed.push(e);active.activity=e.activity||'';active.instance=e.instance||0;pause=null;};
  const recognized=at=>{if(!known&&at>unknownStart)unknown.push({start:unknownStart,end:at,reason:'缺少起始前台边界'});known=true;};
  for(const e of events.filter(e=>e.at>=w.start&&e.at<=w.end)){
   if(offline&&e.type!=='startup')continue;
   if(e.type==='resume'&&e.packageName){
    recognized(e.at);
    if(active&&Number.isSafeInteger(barriers['lock:'+active.id])&&e.at>barriers['lock:'+active.id])close(e.at,'coverage');
    const handoff=pause&&e.at===pause.at&&e.activity&&pause.activity&&(e.activity!==pause.activity||(e.instance&&pause.instance&&e.instance!==pause.instance));
    if(!(active&&active.packageName===e.packageName&&(resumed.length||handoff))){close(pause?.at??e.at,'switch');active={id:identity(e.at,e.packageName),packageName:e.packageName,label:e.label||e.packageName,start:e.at,sessionStart:e.at,startKnown:true,activity:e.activity||'',instance:e.instance||0,precision:'system-event'};}
    remember(e);
   }else if((e.type==='pause'||e.type==='stop')&&active&&active.packageName===e.packageName){
    const affected=resumed.filter(a=>matches(a,e));
    if(affected.length){resumed=resumed.filter(a=>!matches(a,e));if(resumed.length){const last=resumed.at(-1);active.activity=last.activity||'';active.instance=last.instance||0;}else if(e.type==='pause')pause={at:e.at,activity:e.activity||active.activity,instance:e.instance||active.instance};else close(e.at,'stop');}
    else if(e.type==='stop'&&pause&&matches(active,e))close(pause.at,'stop');
   }
   else if(e.type==='lock'){close(pause?.at??e.at,e.type);recognized(e.at);}
   else if(e.type==='shutdown'){close(pause?.at??e.at,e.type);offline=true;known=false;unknownStart=e.at;}
   else if(e.type==='startup'){
    const saved=barriers[e.id]??(offline?unknownStart:previous?.active?.packageName===active?.packageName&&previous.confirmedUntil<e.at?previous.confirmedUntil:pause?.at??lastAt);
    barriers[e.id]=saved;close(Math.max(w.start,Math.min(e.at,saved)),'startup');if(e.at>saved)unknown.push({start:Math.max(w.start,saved),end:e.at,reason:'设备重启前边界未知'});known=false;unknownStart=e.at;
    offline=false;
   }
   lastAt=e.at;
  }
  if(active&&!pause&&locked&&w.end===until){const key='lock:'+active.id;barriers[key]??=previous?.active?.id===active.id?Math.max(active.start,Math.min(w.end,previous.confirmedUntil)):active.start;}
  if(pause)close(pause.at,'pause');else close(w.end,'coverage',w.end===until);
  if(!known&&w.end>unknownStart)unknown.push({start:unknownStart,end:w.end,reason:'未取得可识别的前台边界'});
 }
 return {rows,unknown,barriers};
}
function safeEvents(events,from,until){
 if(!Array.isArray(events)||events.length>20000)throw Error('系统事件批次过大，原记录保留');
 return events.map((e,i)=>{if(!validTime(e.at)||e.at<from||e.at>until||typeof e.id!=='string'||e.id.length>600||!['resume','pause','stop','lock','unlock','shutdown','startup'].includes(e.type)||typeof e.packageName!=='string'||e.packageName.length>200)throw Error('系统事件边界或类型无效，原记录保留');return {id:e.id,at:e.at,type:e.type,packageName:e.packageName,label:String(e.label||e.packageName).slice(0,200),activity:String(e.activity||'').slice(0,400),instance:Number.isSafeInteger(e.instance)&&e.instance>=0?e.instance:0,order:Number.isSafeInteger(e.order)?e.order:i};});
}
export function observePhone(phone,query,zone){
 const p=structuredClone(phone),old=p.observation;
 if(!validTime(query.from)||!validTime(query.until)||query.until<query.from)throw Error('系统查询范围无效，原记录保留');
 if(old?.until>query.until)return p;
 const currentRows=phoneRows(p);
 initializeLegacyProtection(p,query.until);
 p.corrections??=[];
 if(!query.available||!query.complete){
  if(p.active&&p.confirmedUntil>p.active.start)p.spans.push({...p.active,id:p.active.id??identity(p.active.start,p.active.packageName),end:p.confirmedUntil,ongoing:false,endKnown:false,endReason:'coverage'});p.active=null;
  p.observation={...(old??{version:1,eventLog:[],windows:[],unknown:[],barriers:{}}),queryFrom:query.from,queryUntil:query.until,error:query.error||(!query.available?'系统事件暂不可读':'系统事件未完整返回'),lastAttempt:query.until};return p;
 }
 const events=safeEvents(query.events??[],query.from,query.until),floor=dayStart(addDays(dateKey(query.until,zone),-1),zone);
 // Keep the already proven anchor of a session crossing the retention floor.
 // Otherwise midnight pruning would erase its observed portion after midnight.
 const anchors=currentRows.filter(r=>r.continuous&&r.startKnown&&r.start<floor&&r.end>floor&&(old?.windows??[]).some(w=>w.start<=r.start&&w.end>=floor));
 const retainFrom=Math.min(floor,...anchors.map(r=>r.start)),from=Math.max(retainFrom,Math.min(old?.from??query.from,query.from));
 const map=new Map((old?.eventLog??[]).filter(e=>e.at>=from&&(e.at<query.from||e.at>query.until)).map(e=>[e.id,e]));for(const e of events)if(e.at>=from)map.set(e.id,e);
 if(map.size>20000)return observePhone(phone,{...query,complete:false,error:'可重放事件超过上限，已保留现有记录'},zone);
 const eventLog=[...map.values()].sort((a,b)=>a.at-b.at||a.order-b.order),windows=mergeWindows([...(old?.windows??[]),{start:query.from,end:query.until}].map(w=>({start:Math.max(from,w.start),end:w.end}))).slice(-64),until=Math.max(old?.until??0,query.until);
 const barrierIds=new Set(eventLog.flatMap(e=>[e.id,'lock:'+identity(e.at,e.packageName)])),barriers=Object.fromEntries(Object.entries(old?.barriers??{}).filter(([id])=>barrierIds.has(id)));
 const replay=reconstructUsage(eventLog,windows,until,phone,barriers,query.locked===true);
 const systemRows=outside(replay.rows,p.legacyProtection);
 // Previously collected data outside replay coverage remains; legacy manual
 // deletions have no tombstones, so preserve that old covered interval too.
 const replaceWindows=outside(windows.map(w=>({...w,packageName:'range'})),p.legacyProtection).map(({start,end})=>({start,end}));
 let rows=[...outside(currentRows,replaceWindows),...systemRows];
 for(const c of p.corrections){rows=outside(rows,[{start:c.start,end:c.end}]);if(c.replacement)rows.push({...c.replacement,ongoing:false});}
 rows.sort((a,b)=>a.start-b.start||a.end-b.end);const dedup=new Map();for(const r of rows)if(r.end>r.start)dedup.set(r.id+'|'+r.start+'|'+r.end,r);rows=[...dedup.values()];
 const ongoing=rows.at(-1);p.active=ongoing?.ongoing&&ongoing.end===until?{...ongoing}:null;if(p.active){delete p.active.end;rows.pop();}
 p.spans=rows;p.confirmedUntil=p.active?until:Math.max(p.confirmedUntil,until);
 p.observation={version:1,from,until,eventLog,windows,unknown:replay.unknown,barriers:replay.barriers,queryFrom:query.from,queryUntil:query.until,error:null,lastAttempt:query.until};
 return p;
}
export function phoneRows(phone){return [...(phone?.spans??[]),...(phone?.active&&phone.confirmedUntil>phone.active.start?[{...phone.active,id:phone.active.id??identity(phone.active.start,phone.active.packageName),end:phone.confirmedUntil,ongoing:true}]:[])];}
export function usageSummary(phone,start=0,end=Infinity){
 const rows=phoneRows(phone),byPackage=Object.create(null),longSessions=[];let totalMinutes=0;
 for(const row of rows){const ms=Math.max(0,Math.min(end,row.end)-Math.max(start,row.start));if(!ms)continue;const minutes=ms/60000;totalMinutes+=minutes;byPackage[row.packageName]??={label:row.label,minutes:0};byPackage[row.packageName].minutes+=minutes;
  if(row.continuous&&row.startKnown&&row.end-row.start>30*60000)longSessions.push({...row,dayStart:Math.max(start,row.start),dayEnd:Math.min(end,row.end),dayMinutes:minutes});
 }
 const ranking=Object.entries(byPackage).map(([packageName,v])=>({packageName,...v})).sort((a,b)=>b.minutes-a.minutes||a.packageName.localeCompare(b.packageName));longSessions.sort((a,b)=>b.start-a.start);
 return {totalMinutes,byPackage,ranking,longSessions,coverage:phone?.observation??null,legacyProtection:phone?.legacyProtection??[]};
}
