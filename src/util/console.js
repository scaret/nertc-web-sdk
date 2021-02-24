const Config = require('utiljs/config');

if (typeof window !== 'undefined') {
  // 微信里面不要 shim console
  if (!window.console && !Config.isWeixinApp) {
    window.console = {
      log: function() {},
      info: function() {},
      warn: function() {},
      error: function() {}
    };
  }
}
