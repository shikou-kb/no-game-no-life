import {COMPOSITIONS} from './onboarding-27ca4e179461.mjs';
import {effectiveActivity} from './activity-policy-27ca4e179461.mjs';
export const directionChoice=name=>'new-direction:'+COMPOSITIONS.indexOf(name);
export function directionLinks(state,name){
 const ids=new Set(state.skills.filter(k=>k.composition===name).map(k=>k.id));
 return state.activities.flatMap(a=>{const p=effectiveActivity(state,a),main=ids.has(p.mainSkillId),related=p.relatedSkillIds.filter(id=>ids.has(id));return main||related.length?[{activity:a,main,related,policy:p}]:[];});
}
export function resolveDirectionChoice(state,value,at=Date.now()){
 if(!String(value).startsWith('new-direction:'))return value||null;
 const name=COMPOSITIONS.find(n=>directionChoice(n)===value);if(!name)throw Error('培养方向已变化');
 const existing=state.skills.find(k=>k.composition===name&&k.kind==='investment'&&k.status!=='archived');if(existing)return existing.id;
 const id=globalThis.crypto.randomUUID();state.skills.push({id,kind:'investment',name:name+'投入',composition:name,templateId:null,stages:[],status:'active',createdAt:at,baselineAt:at,baselinePoints:0,directionAnchor:name});return id;
}
