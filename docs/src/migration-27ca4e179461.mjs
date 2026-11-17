import {ensureAppearanceState} from './appearance-state-27ca4e179461.mjs';
import {validateState as validateV3} from './schema-v3-27ca4e179461.mjs';
import {initializeRebuild} from './rebuild-model-27ca4e179461.mjs';
import {validateState} from './schema-27ca4e179461.mjs';
import {validateState as validateV2,validateLegacyState} from './schema-v2-27ca4e179461.mjs';
import {initializeUseLoop} from './activity-policy-27ca4e179461.mjs';
export function migrateState(input){
  if(input?.schemaVersion===4)return validateState(ensureAppearanceState(structuredClone(input)));
  if(input?.schemaVersion===3)return validateState(ensureAppearanceState(initializeRebuild(validateV3(input))));
  if(input?.schemaVersion===2)return validateState(ensureAppearanceState(initializeRebuild(initializeUseLoop(validateV2(input)))));
  if(input?.schemaVersion!==1)throw new Error('数据版本不支持，原有记录未修改');
  validateLegacyState(input);
  return validateState(ensureAppearanceState(initializeRebuild(initializeUseLoop({...structuredClone(input),schemaVersion:2,contextSpans:[],settings:{theme:'green',reducedMotion:false,onboarding:'dismissed'}}))));
}
export function legacyCompatibleState(){throw Error('新版包含投入型培养、待核对记录及外观／周安排，旧格式不能完整保留；请导出完整备份');}
