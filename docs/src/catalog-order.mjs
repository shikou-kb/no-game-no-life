const defaults=['life','rest','invest','phase','other'].map(k=>'category-'+k);
export function groupOrder(g){const i=defaults.indexOf(g.id);return g.displayOrder??(i<0?100+g.order:i);}
export const orderedGroups=s=>[...s.activityGroups].sort((a,b)=>groupOrder(a)-groupOrder(b));
export const orderedLabels=(s,groupId)=>s.activities.filter(a=>a.groupId===groupId).map((a,i)=>({a,i})).sort((x,y)=>(x.a.displayOrder??x.i)-(y.a.displayOrder??y.i)||x.i-y.i).map(x=>x.a);
export function shadeColor(color,shade=0){const mix=Math.max(0,Math.min(.4,Number(shade)||0)),hex=(color??'#596c80').slice(1);return '#'+[0,2,4].map(n=>Math.round(parseInt(hex.slice(n,n+2),16)*(1-mix)+255*mix).toString(16).padStart(2,'0')).join('');}
export function positionItem(items,id,position){const n=Number(position);if(!Number.isInteger(n)||n<1||n>items.length)throw Error('请选择有效的显示位置');const selected=items.find(v=>v.id===id),rest=items.filter(v=>v.id!==id);if(!selected)throw Error('编辑对象已变化');rest.splice(n-1,0,selected);rest.forEach((v,i)=>v.displayOrder=i);}
export const isSelectable=(s,a)=>!a.archived&&!s.activityGroups.find(g=>g.id===a.groupId)?.archived;
