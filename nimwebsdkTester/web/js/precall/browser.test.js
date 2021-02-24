QUnit.module('浏览器兼容性检查', function() {
  QUnit.test('浏览器兼容', async function (assert) {
    $("#infoBox").html("");
    const browserInfo = browserDetect();
    const supportedBrowser = {
      "chrome": [72],
      "safari": [12],
    };
    assert.true(!browserInfo.mobile, `桌面端`);
    if (supportedBrowser[browserInfo.name]){
      assert.true(true, `支持的浏览器：${browserInfo.name}`);
      if (browserInfo.versionNumber >= supportedBrowser[browserInfo.name][0]) {
        assert.true(true, `支持的浏览器版本：${browserInfo.version}`);
      }else{
        assert.true(false, `不支持的浏览器版本：${browserInfo.version}`);
      }
    }else{
      assert.true(false, `不支持的浏览器：${browserInfo.name}`);
    }
  });
});