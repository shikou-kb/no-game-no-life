import {uid} from './domain-27ca4e179461.mjs';
// A live peer answers directly. A timestamp or stored heartbeat alone is not continuity evidence.
export function runtimeSession(nativeId=''){
 let id=nativeId||uid(),runningId=null,channel=null;const waiting=new Map();
 if(!nativeId&&typeof BroadcastChannel!=='undefined'){channel=new BroadcastChannel('ngnl-runtime-presence-v3');channel.onmessage=event=>{const m=event.data;if(m?.type==='query'&&runningId===m.runningId&&id===m.runtimeId)channel.postMessage({type:'alive',requestId:m.requestId,runtimeId:id});if(m?.type==='alive')waiting.get(m.requestId)?.(m.runtimeId);};}
 return {get id(){return id;},track(r){runningId=r?.id??null;},async continuous(r){if(!r?.runtimeId)return false;if(nativeId)return r.runtimeId===nativeId;if(!channel)return false;const requestId=uid();return new Promise(resolve=>{const finish=value=>{waiting.delete(requestId);resolve(value);};waiting.set(requestId,answer=>{if(answer===r.runtimeId){id=answer;finish(true);}});channel.postMessage({type:'query',requestId,runningId:r.id,runtimeId:r.runtimeId});setTimeout(()=>finish(false),600);});},close(){channel?.close();}};
}
