export function durationParts(minutes){
 if(!(minutes>0))return [{value:'0',unit:'分钟'}];
 const raw=minutes*60;
 if(raw<1)return [{value:'<1',unit:'秒'}];
 const seconds=Math.round(raw),hours=Math.floor(seconds/3600),mins=Math.floor(seconds%3600/60),secs=seconds%60,parts=[];
 if(hours)parts.push({value:String(hours),unit:'小时'});
 if(mins)parts.push({value:String(mins),unit:hours||secs?'分':'分钟'});
 if(secs)parts.push({value:String(secs),unit:'秒'});
 return parts;
}
export const duration=minutes=>durationParts(minutes).map(p=>p.value+p.unit).join('');
