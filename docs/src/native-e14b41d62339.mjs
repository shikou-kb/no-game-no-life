// The Android bridge is available only inside our bundled, fixed-origin WebView.
export function isNativeShell(host=globalThis){return typeof host.NGNLNative?.beginExport==='function';}

export function downloadText(name,text,type='application/json',host=globalThis){return downloadBytes(name,new TextEncoder().encode(text),type,host);}
export async function downloadBytes(name,bytes,type='application/octet-stream',host=globalThis){
  if(!isNativeShell(host)){
    const blob=new Blob([bytes],{type}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=name;a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),10000);
    return {native:false,saved:false};
  }
  const bridge=host.NGNLNative;
  const id=bridge.beginExport(name,type.split(';')[0]);
  if(!id)throw new Error('另一个导出正在处理中，请先完成或取消保存');
  let handler;
  try{
    // Encode byte chunks, not UTF-16 slices: emoji and Chinese survive boundaries.
    for(let offset=0;offset<bytes.length;offset+=24576){
      const chunk=btoa(String.fromCharCode(...bytes.subarray(offset,offset+24576)));
      if(!bridge.appendExport(id,chunk))throw new Error('导出文件准备失败，记录未受影响');
      if(offset%393216===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    const result=new Promise((resolve,reject)=>{
      handler=event=>{
        if(event.detail?.id!==id)return;
        host.removeEventListener('ngnl-native-export',handler);
        if(event.detail.error)reject(new Error(event.detail.error));
        else resolve({native:true,saved:!!event.detail.saved});
      };
      host.addEventListener('ngnl-native-export',handler);
    });
    if(!bridge.finishExport(id))throw new Error('无法打开保存窗口，记录未受影响');
    return await result;
  }catch(error){
    if(handler)host.removeEventListener('ngnl-native-export',handler);
    bridge.cancelExport(id);
    throw error;
  }
}
