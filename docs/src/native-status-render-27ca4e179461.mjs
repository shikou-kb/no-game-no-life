// Update diagnostics without replacing the surrounding personal page or its focusable controls.
export function patchNativeStatus(root,previousMarkup,nextMarkup){
 const pattern=/<section class="card" data-native-settings>[\s\S]*?<\/section>/;
 const before=previousMarkup?.match(pattern)?.[0],after=nextMarkup.match(pattern)?.[0],current=root.querySelector('[data-native-settings]');
 if(!before||!after||!current||previousMarkup.replace(before,'')!==nextMarkup.replace(after,''))return false;
 const fragment=document.createElement('template');fragment.innerHTML=after;
 function sync(target,source){
  if(target.nodeType!==source.nodeType||target.nodeName!==source.nodeName){target.replaceWith(source.cloneNode(true));return;}
  if(target.nodeType===Node.TEXT_NODE){if(target.nodeValue!==source.nodeValue)target.nodeValue=source.nodeValue;return;}
  if(target.nodeType!==Node.ELEMENT_NODE)return;
  for(const attr of [...target.attributes])if(!source.hasAttribute(attr.name))target.removeAttribute(attr.name);
  for(const attr of source.attributes)if(target.getAttribute(attr.name)!==attr.value)target.setAttribute(attr.name,attr.value);
  const existing=[...target.childNodes],desired=[...source.childNodes];for(let i=0;i<Math.max(existing.length,desired.length);i++){if(!desired[i])existing[i].remove();else if(!existing[i])target.append(desired[i].cloneNode(true));else sync(existing[i],desired[i]);}
 }
 sync(current,fragment.content.firstElementChild);return true;
}
