import {isSelectable,orderedGroups,orderedLabels} from './catalog-order-e14b41d62339.mjs';

export function labelStartCounts(state){
 if(state.rebuild?.labelStarts)return {...state.rebuild.labelStarts};
 const counts={},seen=new Set(),automated=new Set(state.activities.filter(a=>a.isPhoneActivity).map(a=>a.id));
 for(const row of [...state.sessions,...(state.running?[state.running]:[])]){
  if(row.source!=='timer'||automated.has(row.activityId))continue;
  const key=JSON.stringify([row.trackingId??row.id,row.activityId]);
  if(seen.has(key))continue;seen.add(key);counts[row.activityId]=(counts[row.activityId]??0)+1;
 }
 return counts;
}
export function noteLabelStart(before,next,activityId){
 if(!next.rebuild)return;
 const counts=labelStartCounts(before);counts[activityId]=(counts[activityId]??0)+1;next.rebuild.labelStarts=counts;
}
export function frequentLabels(state){
 const counts=labelStartCounts(state),order=orderedGroups(state).flatMap(g=>orderedLabels(state,g.id)),rank=new Map(order.map((a,i)=>[a.id,i]));
 return state.activities.filter(a=>isSelectable(state,a)).sort((a,b)=>(counts[b.id]??0)-(counts[a.id]??0)||(rank.get(a.id)??0)-(rank.get(b.id)??0)||a.id.localeCompare(b.id));
}
// Keep the current page's order stable across background writes and gestures.
export function stableQuickLabels(state,order){
 const labels=frequentLabels(state),byId=new Map(labels.map(a=>[a.id,a]));
 if(!order)return labels;
 return [...order.filter(id=>byId.has(id)).map(id=>byId.get(id)),...labels.filter(a=>!order.includes(a.id))];
}
