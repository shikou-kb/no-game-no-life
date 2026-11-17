export function currentNameBasis(state){const r=state.running;return r?{id:r.id,generation:state.dataGeneration,temporaryName:r.temporaryName??''}:null;}
export function renameCurrent(state,basis,value){
 if(!basis||state.running?.id!==basis.id||state.dataGeneration!==basis.generation)throw Error('当前计时已切换或恢复；填写仍保留，请核对原时段');
 if((state.running.temporaryName??'')!==basis.temporaryName)throw Error('本段名称已在别处变化，请重新核对');
 const name=String(value??'').trim();if(name.length>100)throw Error('临时名称最多100个字符');
 const next=structuredClone(state);next.running.temporaryName=name;return next;
}
