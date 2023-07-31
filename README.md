# NERTC Web SDK

## 安装

```
    npm install --save nertc-web-sdk
```

## 使用

```
    import NERTC from "nertc-web-sdk"
```

## 注意事项

+ SDK版本号如出现后缀，通常是声明文件或示例代码的调整，请放心升级
+ 以vue为例，打包时如遇到问题可参考以下解决方案：
  + 不要使用 lint 工具检查SDK：`vue-cli-service build --skip-plugins @vue/cli-plugin-eslint`
  + 不要使用 babel 工具转码SDK（在babel.config.js中添加属性）：`ignore: ["**/NERTC.js"], exclude: /NERTC/'`

## 其他链接

+ [开发者中心](https://dev.yunxin.163.com/)
+ [API参考文档](https://doc.yunxin.163.com/docs/interface/NERTC_SDK/Latest/Web/api/)
+ [更新日志](https://doc.yunxin.163.com/docs/jcyOTA0ODM/zU5NzI3NTM?platformId=50082)
