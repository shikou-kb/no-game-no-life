import {validateState,validateLegacyState} from './schema.mjs';
export function migrateState(input){
  if(input?.schemaVersion===2)return validateState(structuredClone(input));
  if(input?.schemaVersion!==1)throw new Error('数据版本不支持，原有记录未修改');
  validateLegacyState(input);
  return validateState({...structuredClone(input),schemaVersion:2,contextSpans:[],settings:{theme:'green',reducedMotion:false,onboarding:'dismissed'}});
}
export function legacyCompatibleState(input){const state=structuredClone(validateState(input));state.schemaVersion=1;delete state.contextSpans;delete state.settings;delete state.phone;return validateLegacyState(state);}
