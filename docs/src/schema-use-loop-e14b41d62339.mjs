import {isDate,addDays} from './calendar-e14b41d62339.mjs';
export const PAGE_KEYS=['today','growth','plans','memory','insights','settings','stageOverview','skillDetail','diaryEditor','iteration','overview','phone','phaseDetail','taskDetail'];
export const THEMES=['green','blue','mist','night'];
const ok=(v,m)=>{if(!v)throw Error(m);};
const str=(x,n=200)=>typeof x==='string'&&x.length<=n;
const time=x=>Number.isSafeInteger(x)&&x>=0;
const list=(x,n=100000)=>Array.isArray(x)&&x.length<=n;
export function validateUseLoop(s){
 for(const k of ['activityGroups','activityConfigHistory','weeklyRules','weeklyReviews','eventExamples','reminders']){
  ok(list(s[k]),'新增数据列表无效：'+k);const ids=s[k].map(x=>x?.id);ok(ids.every(id=>str(id)&&id)&&new Set(ids).size===ids.length,'新增数据标识重复：'+k);
 }
 const groups=new Set(s.activityGroups.map(g=>g.id)),skills=new Set(s.skills.map(k=>k.id)),acts=new Set(s.activities.map(a=>a.id));
 const policy=p=>ok(p&&(p.mainSkillId===null||skills.has(p.mainSkillId))&&list(p.relatedSkillIds,100)&&new Set(p.relatedSkillIds).size===p.relatedSkillIds.length&&p.relatedSkillIds.every(id=>skills.has(id)&&id!==p.mainSkillId&&s.skills.find(k=>k.id===id).kind!=='investment')&&(p.mainSkillId||!p.relatedSkillIds.length),'培养配置无效');
 for(const item of [...s.activityGroups,...s.activities])if(item.displayOrder!==undefined)ok(Number.isSafeInteger(item.displayOrder)&&item.displayOrder>=0,'显示顺序无效');
 for(const a of s.activities)if(a.colorShade!==undefined)ok(Number.isFinite(a.colorShade)&&a.colorShade>=0&&a.colorShade<=.4,'标签色阶无效');
 for(const g of s.activityGroups){ok(str(g.name,60)&&g.name.trim()&&Number.isInteger(g.order),'活动类别无效');policy(g.growthPolicy);}
 for(const a of s.activities){ok(groups.has(a.groupId)&&['inherit','override','none'].includes(a.growthMode),'活动继承设置无效');policy(a);}
 for(const h of s.activityConfigHistory){ok(acts.has(h.activityId)&&time(h.effectiveAt)&&h.snapshot&&groups.has(h.snapshot.groupId),'活动配置版本无效');policy(h.snapshot);}
 for(const p of s.plans)if(p.groupIds!==undefined)ok(list(p.groupIds,100)&&p.groupIds.every(id=>groups.has(id)),'阶段类别失联');
 for(const r of [...s.sessions,...(s.running?[s.running]:[])]){
  ok(r.confirmation===undefined||['confirmed','pending'].includes(r.confirmation),'记录确认状态无效');
  if(r.needsReview!==undefined)ok(typeof r.needsReview==='boolean','记录核对状态无效');
 }
 ok(s.setupProgress&&Number.isInteger(s.setupProgress.step)&&s.setupProgress.step>=0&&s.setupProgress.step<=3&&list(s.setupProgress.confirmed,3),'初设进度无效');
 ok(s.defaultPack&&s.defaultPack.version===1&&s.defaultPack.investmentIds&&list(s.defaultPack.adoptedActivityIds),'默认配置登记无效');
 ok(str(s.dataGeneration)&&s.dataGeneration,'数据代次无效');
 const appearance=x=>{ok(x&&typeof x==='object','外观设置无效');if(x.accentColor!==undefined)ok(x.accentColor===null||/^#[a-fA-F0-9]{6}$/.test(x.accentColor),'强调色无效');if(x.theme!==undefined)ok(THEMES.includes(x.theme),'外观方案无效');if(x.message!==undefined)ok(str(x.message,200),'寄语过长');if(x.backgroundMode!==undefined)ok(['inherit','none','image'].includes(x.backgroundMode),'背景方式无效');if(x.backgroundMode==='image')ok(str(x.assetId)&&x.assetId,'背景图片失联');};
 ok(s.appearance&&s.appearance.pages&&typeof s.appearance.pages==='object'&&!Array.isArray(s.appearance.pages),'页面外观无效');appearance(s.appearance.global);
 if(s.appearance.cover!==undefined){const c=s.appearance.cover;ok(c&&['default','hidden','image'].includes(c.mode)&&(c.mode!=='image'||str(c.assetId)&&c.assetId),'封面设置或图片引用无效');}
 for(const [k,v]of Object.entries(s.appearance.pages)){ok(PAGE_KEYS.includes(k),'未知外观页面');appearance(v);}
 for(const r of s.weeklyRules){ok(str(r.title,100)&&r.title.trim()&&list(r.versions,1000)&&r.versions.length,'周安排无效');let effective='';for(const v of r.versions){ok(/^\d{4}-\d{2}-\d{2}$/.test(v.effectiveFrom)&&v.effectiveFrom>effective&&Number.isInteger(v.weekday)&&v.weekday>=0&&v.weekday<=6&&/^\d{2}:\d{2}$/.test(v.localStart)&&Number(v.localStart.slice(0,2))<24&&Number(v.localStart.slice(3))<60&&Number.isInteger(v.durationMinutes)&&v.durationMinutes>0&&v.durationMinutes<=1440&&acts.has(v.activityId)&&typeof v.paused==='boolean','周安排版本无效');effective=v.effectiveFrom;}}
 const checkKeys=new Set(),checkIds=new Set();if(s.weeklyChecks!==undefined){ok(list(s.weeklyChecks),'每周完成记录无效');for(const c of s.weeklyChecks){const rule=s.weeklyRules.find(r=>r.id===c.ruleId),version=rule?.versions.find(v=>v.id===c.versionId),key=JSON.stringify([c.ruleId,c.versionId,c.date]);ok(str(c.id)&&c.id&&!checkIds.has(c.id)&&str(c.versionId)&&c.versionId&&version&&isDate(c.date)&&isDate(c.week)&&c.date===addDays(c.week,version.weekday)&&time(c.at)&&!checkKeys.has(key),'每周完成记录失联或重复');checkKeys.add(key);checkIds.add(c.id);}}
 for(const r of s.weeklyReviews)ok(str(r.weekStart,10)&&str(r.slotId)&&str(r.adjustment,2000)&&str(r.expectation??'',2000)&&str(r.conclusion??'',2000)&&time(r.at)&&['pending','continue','adjust','stop','insufficient'].includes(r.status),'周复看无效');
 for(const e of s.eventExamples)ok(acts.has(e.activityId)&&str(e.sessionId)&&['quantitative','subjective'].includes(e.kind)&&str(e.unit,40)&&str(e.standard,300)&&str(e.note,5000)&&time(e.at)&&e.source&&time(e.source.start)&&time(e.source.end)&&e.source.end>e.source.start&&(e.quantity===null||Number.isFinite(e.quantity)&&e.quantity>=0),'表现实例无效');
 for(const r of s.reminders)ok(str(r.runningId)&&str(r.generation)&&time(r.at)&&time(r.createdAt)&&['scheduled','delivered','cancelled'].includes(r.status),'提醒无效');
 return s;
}
