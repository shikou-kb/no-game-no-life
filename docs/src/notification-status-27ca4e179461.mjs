export function notificationStatusRows(status,privacy='summary'){
 const visibility=v=>v===-1?'隐藏':v===0?'私密摘要':v===1?'允许内容':'未返回具体偏好';
 return [
  ['通知权限',status.notificationsAllowed?'已允许':'未允许'],
  ['计时通道',status.timerChannelExists===false?'尚未建立':status.timerChannelAllowed===false?'已关闭':status.timerChannelExists?'已建立 · 重要性 '+status.timerChannelImportance:'需在手机核对'],
  ['锁屏内容偏好',({activity:'活动名',summary:'仅正在记录',hidden:'隐藏'})[privacy]+' · 通道：'+visibility(status.lockscreenPreference)],
  ['本条通知',status.notificationPosted===true?'已发布 · '+visibility(status.postedVisibility)+(status.publicVersionPosted?' · 有公开摘要':''):status.notificationPosted===false?'当前未读到已发布通知':'尚未读到通知状态'],
  ['锁屏实际显示','需在手机锁屏核对'],
  ['系统醒目展示',status.promotedActual?'系统已提升本条通知':status.promotedAvailable?(status.promotedAllowed?'可请求，形态由系统决定':'未允许提升；不代表普通锁屏通知关闭'):'此系统无醒目展示接口']
 ];
}
