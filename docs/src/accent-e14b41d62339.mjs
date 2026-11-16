export const ACCENT_DEFAULTS={blue:['#E8F2FA','#DCECF8','#205274'],green:['#E6EFE1','#DDEBDD','#245C47'],mist:['#E4EEF5','#D8E8F3','#255B80'],night:['#283B51','#304860','#F0C681']};
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),hex=parts=>'#'+parts.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
export const mix=(a,b,t)=>hex(rgb(a).map((v,i)=>v*(1-t)+rgb(b)[i]*t));
const luminance=color=>rgb(color).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
export function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function accentTokens(theme='blue',color=null,paper=null,ink=null){
 const night=theme==='night';paper??=night?'#182637':theme==='green'?'#fffef9':theme==='mist'?'#fafdff':'#ffffff';ink??=night?'#eef4fa':'#10213a';
 const base=ACCENT_DEFAULTS[theme]??ACCENT_DEFAULTS.blue,custom=/^#[\da-f]{6}$/i.test(color??'');
 const fill=custom?mix(paper,color,night?.24:.12):base[0],selected=custom?mix(paper,color,night?.32:.19):base[1];
 let foreground=custom?color:base[2];for(let i=0;i<=100;i++){const candidate=mix(custom?color:base[2],ink,i/100);if([paper,fill,selected].every(bg=>contrast(candidate,bg)>=4.5)){foreground=candidate;break;}}
 return {fill,selected,foreground,focus:foreground,onDeep:contrast(foreground,'#ffffff')>=4.5?'#ffffff':'#101a29'};
}
export function applyAccent(element,theme,color){
 const style=getComputedStyle(element),paper=style.getPropertyValue('--paper').trim(),ink=style.getPropertyValue('--ink').trim();
 const t=accentTokens(theme,color,/^#[\da-f]{6}$/i.test(paper)?paper:null,/^#[\da-f]{6}$/i.test(ink)?ink:null);
 for(const [key,value]of Object.entries({'--action-fill':t.fill,'--action-selected':t.selected,'--green':t.foreground,'--green-deep':t.foreground,'--focus':t.focus,'--wash':t.selected,'--hover':t.selected,'--on-deep':t.onDeep,'--timer-tone':t.foreground}))if(element.style.getPropertyValue(key)!==value)element.style.setProperty(key,value);
 return t;
}
