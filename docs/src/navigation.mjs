import {dateKey,isDate} from './calendar-e14b41d62339.mjs';
import {statisticsRange} from './rebuild-model-e14b41d62339.mjs';
// Browsing state only: these snapshots never enter the repository or backups.
export const PRIMARY_PAGES=['today','growth','plans','memory','iteration','settings'];
export const PAGE_TITLES={today:'记录',growth:'成长',plans:'阶段',memory:'闪回',insights:'统计',settings:'个人',iteration:'迭代',overview:'时间概览',phaseDetail:'阶段框架',taskDetail:'任务',phone:'手机使用',stageOverview:'阶段总览',skillDetail:'培养明细'};
const fields=['page','navPage','date','dateFollowsToday','rangeStart','rangeEnd','statsStart','statsEnd','category','stageId','skillId','detailPlanId','sourceLimit','phoneFocus','revealDay','phaseId','taskId','rangeMode','selectedGroup','trendActivity','trendTemporary','memoryKind','memoryQuery','memoryMonth','iterationBranch','iterationParent','iterationQuery','iterationDate','iterationArchived'];
export function syncBookDate(ui,timeZone,now=Date.now()){
 if(ui.dateFollowsToday===false&&isDate(ui.date))return;
 const today=dateKey(now,timeZone);ui.date=today;ui.dateFollowsToday=true;
 if(ui.rangeMode!=='custom'){const range=statisticsRange(today,ui.rangeMode??'day');ui.statsStart=range.start;ui.statsEnd=range.end;}
}
export const captureView=ui=>Object.fromEntries(fields.map(k=>[k,ui[k]??null]));
export const viewIdentity=ui=>JSON.stringify(fields.filter(k=>!['sourceLimit','memoryMonth'].includes(k)).map(k=>ui[k]??null));
export const primaryPage=ui=>PRIMARY_PAGES.includes(ui.navPage)?ui.navPage:PRIMARY_PAGES.includes(ui.page)?ui.page:'growth';
export function rootView(ui,page){
 if(!PRIMARY_PAGES.includes(page))throw Error('Unknown primary page');
 Object.assign(ui,{page,navPage:null,stageId:null,skillId:null,detailPlanId:null,phoneFocus:false,revealDay:false,revealSources:false,viewTrail:[]});
}
export function pushView(ui,page,values={}){
 if(!PAGE_TITLES[page])throw Error('Unknown page');
 const parent=primaryPage(ui);ui.viewTrail??=[];ui.viewTrail.push(captureView(ui));
 Object.assign(ui,{page,navPage:parent,phoneFocus:false,revealSources:false,...values});
}
export function popView(ui){
 // An overview selection belongs to the browsing session, not its older parent snapshot.
 const overviewRange=ui.page==='overview'?Object.fromEntries(['date','dateFollowsToday','rangeMode','statsStart','statsEnd'].map(k=>[k,ui[k]])):null;
 const prior=ui.viewTrail?.pop();if(prior)Object.assign(ui,prior,{revealSources:false},overviewRange);else rootView(ui,'growth');return prior;
}
export const returnTitle=ui=>PAGE_TITLES[ui.viewTrail?.at(-1)?.page]||'成长';
