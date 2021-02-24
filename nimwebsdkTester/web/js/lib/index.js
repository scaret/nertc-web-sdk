
$(function () {
  init()
})

function init () {
  data = {}
  nim = null
  /* global initUI */
  initUI()
  /* global initConnectEvent */
  initConnectEvent()
  /* global initDBEvent */
  initDBEvent()
  /* global initLoginPortEvent */
  initLoginPortEvent()
  /* global initRelationEvent */
  initRelationEvent()
  /* global initFriendEvent */
  initFriendEvent()
  /* global initUserEvent */
  initUserEvent()
  /* global initTeamEvent */
  initTeamEvent()
  
  initSuperTeamEvent()
  /* global initSessionEvent */
  initSessionEvent()
  /* global initMsgEvent */
  initMsgEvent()
  /* global initNotificationEvent */
  initNotificationEvent()
  /* global initSysMsgEvent */
  initSysMsgEvent()
  /* global initImageEvent */
  initImageEvent()
  /* global initMiscEvent */
  initMiscEvent()
  /* global initChatroomEvent */
  initChatroomEvent();
  /** 初始化独立音视频信令，测试IE时不支持语法 */
  (typeof initIndependentNetcall !== 'undefined' && initIndependentNetcall());
  $('#account').focus()
  /* global initAfterNIM */
  initAfterNIM()
  if (window.auto) {
    connect()
  }
}
