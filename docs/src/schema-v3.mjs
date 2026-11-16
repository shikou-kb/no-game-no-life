import {TEMPLATES} from './templates-e14b41d62339.mjs';
import {isDate} from './calendar-e14b41d62339.mjs';
import {validateUseLoop,THEMES} from './schema-use-loop-e14b41d62339.mjs';
const fail=message=>{throw new Error(message);};
function assert(condition,message) {if(!condition)fail(message);}
const str=(v,max=10000)=>typeof v==='string'&&v.length<=max;
const number=v=>Number.isSafeInteger(v)&&v>=0;
function validateCore(s,version) {
  assert(s&&s.schemaVersion===version,'数据版本不支持，未修改本地记录');
  assert(number(s.revision)&&number(s.createdAt),'数据版本字段无效');
  assert(str(s.timeZone,100)&&s.timeZone.length>0,'数据时区无效');
  try{new Intl.DateTimeFormat('en',{timeZone:s.timeZone});}catch{fail('数据时区无效');}
  for(const key of ['activities','skills','sessions','moments','plans','assessments','operations'])assert(Array.isArray(s[key])&&s[key].length<=100000,`数据列表 ${key} 无效`);
  for(const key of ['activities','skills','sessions','moments','plans','assessments']){
    const ids=s[key].map(x=>x?.id);assert(ids.every(id=>str(id,200)&&id.length)&&new Set(ids).size===ids.length,`${key} 存在无效或重复标识`);
  }
  const skillIds=new Set(s.skills.map(x=>x.id)),actIds=new Set(s.activities.map(x=>x.id));
  const config=x=>{assert(str(x.name,100)&&x.name.trim()&&str(x.category,60)&&/^#[a-fA-F0-9]{6}$/.test(x.color),'活动名称、分类或颜色无效');assert(x.mainSkillId===null||skillIds.has(x.mainSkillId),'活动主项失联');assert(Array.isArray(x.relatedSkillIds)&&x.relatedSkillIds.every(id=>skillIds.has(id))&&new Set(x.relatedSkillIds).size===x.relatedSkillIds.length&&!x.relatedSkillIds.includes(x.mainSkillId),'活动关联无效');assert(x.mainSkillId||!x.relatedSkillIds.length,'没有主项的活动不能生成关联贡献');};
  for(const a of s.activities)config(a);
  for(const skill of s.skills){
   assert(str(skill.name,100)&&skill.name.trim(),'培养项名称无效');assert(number(skill.createdAt)&&number(skill.baselineAt)&&Number.isFinite(skill.baselinePoints)&&skill.baselinePoints>=0&&skill.baselinePoints<=1e9,'起点数据无效');assert(['active','paused','archived'].includes(skill.status),'培养项状态无效');
   if(version===3&&skill.kind==='investment'){assert(skill.templateId===null&&Array.isArray(skill.stages)&&skill.stages.length===0&&skill.baselinePoints===0,'投入型不能设置能力模板或起点折算');continue;}
   assert(TEMPLATES[skill.templateId],'培养项模板无效');const template=TEMPLATES[skill.templateId];assert(Array.isArray(skill.stages)&&skill.stages.length===template.stages.length,'培养项阶段无效');skill.stages.forEach((v,i)=>assert(str(v.name,100)&&str(v.standard)&&v.q===template.stages[i].q&&Number.isInteger(v.levels)&&v.levels>=1&&v.levels<=1000000,'培养项级数或固定单级值无效'));
  }
  const sorted=[...s.sessions].sort((a,b)=>a.start-b.start);let lastEnd=-Infinity;
  for(const row of sorted){config(row);assert(actIds.has(row.activityId)&&number(row.start)&&number(row.end)&&row.end>row.start&&number(row.version)&&row.version>0&&['manual','timer'].includes(row.source)&&['minute','second'].includes(row.precision),'活动时间或来源无效');assert(row.start>=lastEnd,'备份内存在重叠活动');lastEnd=row.end;}
  if(s.running){const r=s.running;config(r);assert(actIds.has(r.activityId)&&number(r.start)&&number(r.confirmedUntil)&&r.confirmedUntil>=r.start&&r.end===null&&!s.sessions.some(v=>v.end>r.start),'当前计时与活动重叠或无效');assert(!s.sessions.some(v=>v.id===r.id),'当前计时标识重复');}
  for(const m of s.moments){assert(number(m.at)&&number(m.createdAt)&&number(m.updatedAt)&&str(m.text,200000)&&(!m.title||str(m.title,100))&&Array.isArray(m.photos)&&m.photos.length<=30,'闪回片段无效');for(const p of m.photos)assert(str(p.id,200)&&str(p.name,200)&&str(p.data,24000000)&&/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(p.data),'照片格式无效，仅支持 PNG/JPEG/WebP/GIF');}
  assert(s.dailyNotes&&typeof s.dailyNotes==='object'&&!Array.isArray(s.dailyNotes),'整体感受数据无效');for(const [d,v] of Object.entries(s.dailyNotes))assert(isDate(d)&&str(v.text,200000)&&number(v.updatedAt),'整体感受无效');
  for(const p of s.plans)assert(str(p.title,100)&&p.title.trim()&&isDate(p.startDate)&&isDate(p.endDate)&&p.startDate<=p.endDate&&Number.isFinite(p.targetMinutes)&&p.targetMinutes>=0&&p.targetMinutes<=1e7&&str(p.outcome,20000)&&Array.isArray(p.activityIds)&&p.activityIds.every(id=>actIds.has(id))&&Array.isArray(p.skillIds)&&p.skillIds.every(id=>skillIds.has(id))&&(!p.completedAt||number(p.completedAt)),'阶段计划无效');
  for(const a of s.assessments)assert(skillIds.has(a.skillId)&&Number.isInteger(a.stageIndex)&&a.stageIndex>=0&&a.stageIndex<s.skills.find(k=>k.id===a.skillId).stages.length&&number(a.at)&&str(a.note,20000)&&typeof a.revoked==='boolean','自评记录无效');
  assert(s.operations.every(v=>str(v,200)),'保存标识无效');
  assert(new TextEncoder().encode(JSON.stringify(s)).byteLength<=80000000,'首版整份数据上限80MB，确定未保存。请先导出备份，再整理选定照片；原数据仍保留。');
  return s;
}

export const validateLegacyState=s=>validateCore(s,1);
export function validateState(s){
 validateCore(s,3);validateUseLoop(s);
 assert(s.settings&&THEMES.includes(s.settings.theme)&&typeof s.settings.reducedMotion==='boolean','主题设置无效');
 assert(Array.isArray(s.contextSpans)&&s.contextSpans.length<=100000,'情境数据无效');
 const ids=new Set();let last=-1;
 for(const c of [...s.contextSpans].sort((a,b)=>a.start-b.start)){
  assert(str(c.id,200)&&c.id&&!ids.has(c.id)&&str(c.name,80)&&c.name.trim()&&number(c.start),'情境标识或名称无效');ids.add(c.id);
  assert(c.end===null?!!s.running&&c.start<=s.running.confirmedUntil:number(c.end)&&c.end>c.start,'情境边界无效');
  assert(c.start>=last,'情境区间存在重叠');last=c.end??Infinity;
 }
 for(const a of s.activities)assert(a.investmentKind==null||['study','exercise'].includes(a.investmentKind),'投入归类无效');
 if(s.settings.phone){const p=s.settings.phone;assert(typeof p.enabled==='boolean'&&Array.isArray(p.interruptPackages)&&p.interruptPackages.length<=500&&p.interruptPackages.every(v=>str(v,200)),'手机记录设置无效');}
 if(s.phone){const p=s.phone;assert(Array.isArray(p.spans)&&p.spans.length<=100000&&Array.isArray(p.seen)&&p.seen.length<=2000&&p.seen.every(id=>str(id,600))&&number(p.cursor)&&number(p.confirmedUntil)&&number(p.enabledAt)&&typeof p.needsReview==='boolean','手机事件数据无效');let end=-1;const ids=new Set();for(const row of [...p.spans].sort((a,b)=>a.start-b.start)){assert(str(row.id,200)&&!ids.has(row.id)&&str(row.packageName,200)&&str(row.label,200)&&number(row.start)&&number(row.end)&&row.end>row.start&&row.start>=end,'手机使用时段重叠或无效');ids.add(row.id);end=row.end;}if(p.active)assert(str(p.active.packageName,200)&&str(p.active.label,200)&&number(p.active.start)&&p.active.start>=end&&p.active.start<=p.confirmedUntil,'当前手机使用时段无效');}
 if(s.phone?.observation){const o=s.phone.observation;assert(o.version===1&&Array.isArray(o.eventLog)&&o.eventLog.length<=20000&&Array.isArray(o.windows)&&o.windows.length<=64,'手机回补数据无效');for(const e of o.eventLog)assert(str(e.id,600)&&number(e.at)&&str(e.packageName,200)&&str(e.label,200)&&str(e.activity,400)&&['resume','pause','stop','lock','unlock','shutdown','startup'].includes(e.type),'手机回补事件无效');for(const w of o.windows)assert(number(w.start)&&number(w.end)&&w.end>w.start,'手机覆盖范围无效');assert(number(o.queryFrom)&&number(o.queryUntil)&&o.queryUntil>=o.queryFrom&&number(o.lastAttempt)&&(o.from===undefined||number(o.from))&&(o.until===undefined||number(o.until)),'手机查询边界无效');assert(Array.isArray(o.unknown)&&o.unknown.length<=40064,'手机未知范围无效');for(const w of o.unknown)assert(number(w.start)&&number(w.end)&&w.end>=w.start&&str(w.reason,100),'手机未知边界无效');assert(o.barriers&&typeof o.barriers==='object'&&!Array.isArray(o.barriers)&&Object.keys(o.barriers).length<=20000&&Object.values(o.barriers).every(number),'手机重启边界无效');for(const e of o.eventLog)assert(number(e.instance)&&Number.isSafeInteger(e.order),'手机事件顺序无效');}
 if(s.phone?.legacyProtectionPolicy!==undefined)assert(s.phone.legacyProtectionPolicy===2,'旧手机记录保护策略无效');
 if(s.phone?.legacyProtection){assert(Array.isArray(s.phone.legacyProtection)&&s.phone.legacyProtection.length<=1000,'旧手机记录保留范围无效');for(const w of s.phone.legacyProtection)assert(number(w.start)&&number(w.end)&&w.end>=w.start,'旧手机记录保留边界无效');}
 if(s.phone?.corrections){assert(Array.isArray(s.phone.corrections)&&s.phone.corrections.length<=10000,'手机更正记录过多或无效');for(const c of s.phone.corrections){assert(str(c.id,200)&&number(c.start)&&number(c.end)&&c.end>c.start,'手机更正范围无效');if(c.replacement)assert(str(c.replacement.id,200)&&str(c.replacement.packageName,200)&&str(c.replacement.label,200)&&number(c.replacement.start)&&number(c.replacement.end)&&c.replacement.end>c.replacement.start,'手机更正内容无效');}}
 if(s.phone?.rebuildUndo){const b=s.phone.rebuildUndo;assert(number(b.from)&&number(b.until)&&b.until>=b.from&&Array.isArray(b.rows)&&b.rows.length<=100000,'手机重建恢复点无效');for(const r of b.rows)assert(str(r.id,200)&&str(r.packageName,200)&&str(r.label,200)&&number(r.start)&&number(r.end)&&r.end>r.start,'手机重建恢复记录无效');}
 return s;
}
