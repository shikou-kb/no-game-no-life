export function resolveAppearance(state,key){
 const g=state.appearance.global,p=state.appearance.pages[key]??(key==='overview'?state.appearance.pages.insights:null)??{};
 const mode=p.backgroundMode&&p.backgroundMode!=='inherit'?p.backgroundMode:g.backgroundMode;
 return {theme:p.theme??g.theme??state.settings.theme,message:p.message??g.message??'',backgroundMode:mode,assetId:p.backgroundMode==='image'?p.assetId:p.backgroundMode==='none'?null:g.assetId,accentColor:p.accentColor!==undefined?p.accentColor:g.accentColor??null};
}
export function legacyCover(state){
 const value=resolveAppearance(state,'today'),page=state.appearance.pages.today??{};
 if(value.backgroundMode==='image'&&value.assetId)return {mode:'image',assetId:value.assetId};
 return {mode:value.theme!=='blue'||page.backgroundMode==='none'?'hidden':'default',assetId:null};
}
export function ensureAppearanceState(input){
 if(input.appearance?.cover)return input;
 const s=structuredClone(input);s.appearance.cover=legacyCover(s);
 // Old record-page backgrounds were only displayed in the cover. Preserve that
 // visible result once, keeping all other page/global images and assets intact.
 s.appearance.pages.today={...s.appearance.pages.today,backgroundMode:'none',assetId:null};return s;
}
export const resolveCover=state=>state.appearance.cover??legacyCover(state);
