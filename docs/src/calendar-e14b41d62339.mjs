const fail=message=>{throw new Error(message);};
export function dateKey(ms=Date.now(),timeZone='Asia/Shanghai') {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(ms);
  const p = Object.fromEntries(parts.map(v=>[v.type,v.value]));return `${p.year}-${p.month}-${p.day}`;
}
export function addDays(date,days) { return new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10); }
export function isDate(date) { return typeof date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date)) && new Date(Date.parse(date)).toISOString().slice(0,10)===date; }
export function dayStart(date,zone='Asia/Shanghai') {
  if(!isDate(date))fail('日期无效');
  const target=Date.parse(date+'T00:00:00Z');let t=target;
  for(let i=0;i<4;i++) {
    const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(t).map(v=>[v.type,v.value]));
    const asUtc=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);t+=target-asUtc;
  }
  return t;
}
export function localInput(ms,zone='Asia/Shanghai',seconds=false) {
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(ms).map(v=>[v.type,v.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}${seconds?':'+p.second:''}`;
}
export function parseLocal(value,zone='Asia/Shanghai') {
  const [d,t]=String(value).split('T');if(!isDate(d)||!/^\d{2}:\d{2}(:\d{2})?$/.test(t))fail('请填写完整起止时间');
  const [h,m,s=0]=t.split(':').map(Number);if(h>23||m>59||s>59)fail('时间无效');
  return dayStart(d,zone)+(h*3600+m*60+s)*1000;
}
// datetime-local normalizes :00 and cannot display our millisecond boundaries.
// Compare the visible value, retaining the original only when it was not changed.
export function parseEditedLocal(value,original,zone='Asia/Shanghai') {
  const parsed=parseLocal(value,zone);
  return Number.isSafeInteger(original)&&parsed===parseLocal(localInput(original,zone,true),zone)?original:parsed;
}
