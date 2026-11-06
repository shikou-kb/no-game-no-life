export function applyTheme(settings){
 document.documentElement.dataset.theme=settings.theme;
 document.documentElement.dataset.motion=settings.reducedMotion?'reduced':'normal';
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',settings.theme==='blue'?'#203b59':'#193a35');
}
export function themeSettings(state){return `<section class="card"><h2>外观</h2><p>保留熟悉的布局，换一种颜色。</p><div class="theme-options"><button type="button" class="secondary" data-action="set-theme" data-id="green" aria-pressed="${state.settings.theme==='green'}">暖白 · 深绿</button><button type="button" class="secondary" data-action="set-theme" data-id="blue" aria-pressed="${state.settings.theme==='blue'}">云白 · 深蓝</button><button type="button" class="text-button" data-action="toggle-motion" aria-pressed="${state.settings.reducedMotion}">减少动态效果：${state.settings.reducedMotion?'已开启':'关闭'}</button></div></section>`;}
