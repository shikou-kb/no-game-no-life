import {resolveAppearance,resolveCover} from './appearance-state-e14b41d62339.mjs';
import {applyAccent} from './accent-e14b41d62339.mjs';
export {resolveAppearance} from './appearance-state-e14b41d62339.mjs';
import {PAGE_KEYS,THEMES} from './schema-use-loop-e14b41d62339.mjs';
import {applyTheme} from './theme-e14b41d62339.mjs';
import {uid} from './domain-e14b41d62339.mjs';
export const APPEARANCE_PAGES={global:'全局',today:'记录',growth:'成长',plans:'阶段',memory:'闪回',insights:'统计',settings:'个人',iteration:'迭代',overview:'时间概览',phone:'手机使用',phaseDetail:'阶段框架',taskDetail:'任务',stageOverview:'阶段总览',skillDetail:'培养明细',diaryEditor:'全页日记'};
export const THEME_NAMES={green:'暖白 · 深绿',blue:'云白 · 深蓝',mist:'晨雾蓝 · 纸面刻度',night:'夜航 · 琥珀指针'};
let requestedImage=null,imageGeneration=0;
function setPageImage(asset){
 const data=asset?.data??null;if(data===requestedImage)return;requestedImage=data;const generation=++imageGeneration;
 if(!data){document.body.style.setProperty('--page-image','none');document.documentElement.dataset.pageBackground='none';return;}
 const image=new Image();image.src=data;
 image.decode().then(()=>{if(generation!==imageGeneration)return;document.body.style.setProperty('--page-image','url("'+data+'")');document.documentElement.dataset.pageBackground='image';}).catch(()=>{if(generation===imageGeneration)requestedImage=null;});
}
export function applyAppearance(state,key,assets=[]){
 const value=resolveAppearance(state,key);applyTheme({...state.settings,theme:value.theme});applyAccent(document.documentElement,value.theme,value.accentColor);document.documentElement.dataset.page=key;
 setPageImage(value.backgroundMode==='image'?assets.find(a=>a.id===value.assetId):null);
 const art=document.querySelector('[data-record-art]');if(art){const cover=resolveCover(state),image=art.querySelector('img'),asset=cover.mode==='image'?assets.find(a=>a.id===cover.assetId):null;art.hidden=cover.mode==='hidden';const src=asset?.data??image.dataset.defaultArt;if(image.getAttribute('src')!==src)image.src=src;image.classList.toggle('personal-art',!!asset);}
 let message=document.querySelector('.page-message');if(!value.message){message?.remove();}else{const slot=key==='today'?document.querySelector('[data-record-message]'):document.querySelector('#main');if(!message){message=document.createElement('p');message.className='page-message';slot?.prepend(message);}if(message.textContent!==value.message)message.textContent=value.message;}
 return value;
}
async function backgroundAsset(file){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>15000000)throw Error('请选择15MB以内的PNG、JPEG或WebP图片');
 const bitmap=await createImageBitmap(file);try{if(bitmap.width*bitmap.height>50000000)throw Error('图片像素过大，请先选择较小的图片');const scale=Math.min(1,2048/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/webp',.85);if(data.length>2800000)throw Error('显示副本仍超过2MiB，请换较小图片');return {id:uid(),name:file.name.slice(0,200),data,width:canvas.width,height:canvas.height};}finally{bitmap.close();}
}
function syncPreviewPalette(preview,theme,color){
 const key=JSON.stringify([theme,color??null]),changed=preview.dataset.paletteKey!==key;
 if(changed)preview.dataset.paletteSync='';
 preview.dataset.theme=theme;applyAccent(preview,theme,color);
 if(changed){
  // Resolve the new foreground and surfaces together before restoring interaction transitions.
  for(const button of preview.querySelectorAll('button'))void getComputedStyle(button).color;
  delete preview.dataset.paletteSync;preview.dataset.paletteKey=key;
 }
}
export function createAppearanceEditor({getState,getRepo,tasks,e}){
 async function open(scope='global',section=null){
  if(!Object.hasOwn(APPEARANCE_PAGES,scope))scope='global';
  const state=getState(),p=scope==='global'?state.appearance.global:state.appearance.pages[scope]??{},cover=resolveCover(state),assets=await getRepo().listAssets();
  const initial={theme:p.theme??'',backgroundMode:p.backgroundMode??'inherit',assetId:p.assetId??'',messageMode:p.message===undefined?'inherit':p.message?'custom':'blank',message:p.message??'',accentMode:p.accentColor===undefined&&scope!=='global'?'inherit':p.accentColor?'custom':'default',accentColor:p.accentColor??'#205274',coverMode:cover.mode,coverAssetId:cover.assetId??''};
  await tasks.open({id:'appearance:'+scope,kind:'appearance',title:'外观 · '+APPEARANCE_PAGES[scope],initial,
   body:()=>`<label>应用范围<select name="scope" data-task-navigation>${Object.entries(APPEARANCE_PAGES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>配色与风格<select name="theme">${scope==='global'?'':'<option value="">沿用全局</option>'}${THEMES.map(t=>`<option value="${t}">${THEME_NAMES[t]}</option>`).join('')}</select></label>
    <details class="form-details" open><summary>强调色</summary><label>颜色来源<select name="accentMode">${scope==='global'?'':'<option value="inherit">沿用全局</option>'}<option value="default">使用此主题默认</option><option value="custom">自定</option></select></label><div class="form-row"><label>选色<input type="color" name="accentPicker" data-task-navigation value="#205274"></label><label>六位色值<input name="accentColor" maxlength="7" pattern="#[a-fA-F0-9]{6}" placeholder="#205274"></label></div><button type="button" class="text-button" data-reset-accent>恢复此范围的默认强调色</button><p class="quiet-note">保留原选色；按钮与文字会调整深浅，保持清楚可读。分类图表颜色独立。</p></details>
    ${scope==='today'?`<details class="form-details" data-cover-settings ${section==='cover'?'open':''}><summary>记录页封面</summary><label>封面<select name="coverMode"><option value="default">默认青蓝剪影</option><option value="image">自定图片</option><option value="hidden">隐藏封面</option></select></label><label class="secondary file-button">选择封面图片<input type="file" name="coverFile" accept="image/png,image/jpeg,image/webp" hidden></label><input type="hidden" name="coverAssetId"><div class="appearance-cover-preview" data-cover-preview></div><p class="quiet-note">封面与页面背景各自保存。隐藏后仍可从记录页“封面”入口恢复。</p></details>`:''}
    <details open class="form-details"><summary>页面背景</summary><label>显示方式<select name="backgroundMode">${scope==='global'?'':'<option value="inherit">沿用全局</option>'}<option value="none">纯色背景</option><option value="image">本页自定图片</option></select></label><label class="secondary file-button">选择背景图片<input type="file" name="backgroundFile" accept="image/png,image/jpeg,image/webp" hidden></label><input type="hidden" name="assetId"><p class="quiet-note">保存长边最多2048像素、每张最多2MiB的显示副本；原日记图片保持原样。</p></details>
    <details class="form-details"><summary>页首寄语</summary><label>文字方式<select name="messageMode">${scope==='global'?'':'<option value="inherit">沿用全局</option>'}<option value="blank">留白</option><option value="custom">自己的寄语</option></select></label><label>寄语 · 最多42字<input name="message" maxlength="84"></label></details>
    <div class="appearance-preview" data-appearance-preview><p data-preview-message></p><h3>${APPEARANCE_PAGES[scope]}</h3><div class="card"><span>记录与阅读</span><strong> 00:25:00</strong><div class="inline-actions"><button type="button" class="primary">主操作预览</button><button type="button" class="text-button">普通链接</button><button type="button" class="secondary" aria-pressed="true">已选中</button></div></div></div><button type="button" class="text-button" data-reset-appearance>恢复${scope==='global'?'内置预设':'全局继承'}，保存前可撤销</button>`,
   bind(form,draft){
    form.elements.scope.value=scope;form.dataset.appearanceScope=scope;let loading=false;
    // Old appearance drafts have no independent cover or accent fields.
    for(const key of ['accentMode','accentColor','coverMode','coverAssetId'])if(form.elements[key]&&!(key in draft.payload.values))form.elements[key].value=initial[key];
    const sync=()=>{
     const theme=form.elements.theme.value||state.appearance.global.theme,preview=form.querySelector('[data-appearance-preview]'),all=[...assets,...draft.photos],asset=all.find(a=>a.id===form.elements.assetId.value),accentMode=form.elements.accentMode.value,color=form.elements.accentColor.value;
     syncPreviewPalette(preview,theme,accentMode==='inherit'?resolveAppearance(state,'global').accentColor:accentMode==='custom'?color:null);
     const background=form.elements.backgroundMode.value==='inherit'?assets.find(a=>a.id===state.appearance.global.assetId&&state.appearance.global.backgroundMode==='image'):form.elements.backgroundMode.value==='image'?asset:null;
     const image=background?'url("'+background.data+'")':'';if(preview.style.backgroundImage!==image)preview.style.backgroundImage=image;
     preview.querySelector('[data-preview-message]').textContent=form.elements.messageMode.value==='inherit'?state.appearance.global.message:form.elements.messageMode.value==='custom'?form.elements.message.value:'';form.elements.message.disabled=form.elements.messageMode.value!=='custom';
     form.elements.accentColor.disabled=accentMode!=='custom';form.elements.accentPicker.disabled=accentMode!=='custom';if(/^#[a-fA-F0-9]{6}$/.test(color))form.elements.accentPicker.value=color;
     if(scope==='today'){const box=form.querySelector('[data-cover-preview]'),mode=form.elements.coverMode.value,asset=all.find(a=>a.id===form.elements.coverAssetId.value),src=mode==='hidden'?null:mode==='image'?asset?.data:'./assets/art/time-poster-951e42dbc69a.png';if(box.dataset.source!==src){box.replaceChildren();if(src){const img=new Image();img.alt='封面预览';img.src=src;box.append(img);}box.dataset.source=src??'';}}
    };
    form.addEventListener('input',sync);form.addEventListener('change',sync);
    form.elements.accentPicker.oninput=()=>{form.elements.accentColor.value=form.elements.accentPicker.value;sync();draft.changed();};
    form.elements.scope.onchange=async()=>{if(loading)return;const next=form.elements.scope.value;form.elements.scope.disabled=true;form.querySelector('[type=submit]').disabled=true;try{await open(next);}catch(error){if(form.isConnected){form.elements.scope.value=scope;form.elements.scope.disabled=false;form.querySelector('[type=submit]').disabled=false;showError(error);}}};
    const showError=error=>{const el=form.querySelector('#form-error');el.textContent=error.message;el.hidden=false;};
    const upload=(fileKey,idKey,modeKey)=>async()=>{
     if(loading)return;const file=form.elements[fileKey].files[0];if(!file)return;loading=true;form.querySelector('[type=submit]').disabled=true;form.elements.scope.disabled=true;
     try{const asset=await backgroundAsset(file);if(tasks.active!==draft||!form.isConnected)return;draft.photos=[...draft.photos,asset];form.elements[idKey].value=asset.id;form.elements[modeKey].value='image';sync();draft.changed();await draft.flush();}catch(error){if(tasks.active===draft)showError(error);}finally{loading=false;if(form.isConnected){form.querySelector('[type=submit]').disabled=false;form.elements.scope.disabled=false;form.elements[fileKey].value='';}}
    };
    form.elements.backgroundFile.onchange=upload('backgroundFile','assetId','backgroundMode');if(scope==='today')form.elements.coverFile.onchange=upload('coverFile','coverAssetId','coverMode');
    form.querySelector('[data-reset-accent]').onclick=()=>{form.elements.accentMode.value='default';sync();draft.changed();};
    form.querySelector('[data-reset-appearance]').onclick=()=>{Object.assign(form.elements.theme,{value:scope==='global'?'blue':''});form.elements.backgroundMode.value=scope==='global'?'none':'inherit';form.elements.assetId.value='';form.elements.messageMode.value=scope==='global'?'blank':'inherit';form.elements.message.value='';form.elements.accentMode.value=scope==='global'?'default':'inherit';sync();draft.changed();};
    sync();if(section==='cover')requestAnimationFrame(()=>form.querySelector('[data-cover-settings]')?.scrollIntoView({block:'start'}));
   },
   onSave:async(f,{commit,draft})=>{
    if(f.get('scope')!==scope||draft.id!=='appearance:'+scope)throw Error('应用范围已变化，请重新选择范围后保存；当前修改仍保留');
    const message=String(f.get('message')??'');if([...message].length>42)throw Error('寄语最多42字');
    const next={...p,backgroundMode:f.get('backgroundMode'),assetId:f.get('assetId')||null};if(f.get('theme'))next.theme=f.get('theme');else delete next.theme;
    if(f.get('messageMode')!=='inherit')next.message=f.get('messageMode')==='custom'?message:'';else delete next.message;
    if(f.get('accentMode')==='inherit')delete next.accentColor;else{next.accentColor=f.get('accentMode')==='custom'?String(f.get('accentColor')??''):null;if(next.accentColor!==null&&!/^#[a-fA-F0-9]{6}$/.test(next.accentColor))throw Error('请输入#开头的六位十六进制色值');}
    const nextCover=scope==='today'?{mode:f.get('coverMode'),assetId:f.get('coverMode')==='image'?f.get('coverAssetId')||null:null}:null;
    const refs=[next.backgroundMode==='image'?next.assetId:null,nextCover?.mode==='image'?nextCover.assetId:null],added=draft.photos.filter(a=>refs.includes(a.id));
    await commit(s=>{const current=scope==='global'?s.appearance.global:s.appearance.pages[scope]??{};if(JSON.stringify(current)!==JSON.stringify(p)||scope==='today'&&JSON.stringify(resolveCover(s))!==JSON.stringify(cover))throw Error('这项外观已在其他页面改变，请重新核对；草稿仍保留');if(scope==='global'){s.appearance.global=next;s.settings.theme=next.theme??'blue';}else s.appearance.pages[scope]=next;if(nextCover)s.appearance.cover=nextCover;return s;},{assets:added});
   }
  });
 }
 return {open};
}
