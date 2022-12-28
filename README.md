# 项目简介

- 此项目是云信NeRTC音视频sdk（G2）的源码仓库

# 开发规范

- 推荐使用 webstorm/vsconde 进行开发
- 借助 Webpack 工程化、项目管理
- 使用 eslint 校验代码格式
- 使用 Prettier 检验代码规范
- [sdk开发规范](http://doc.hz.netease.com/pages/viewpage.action?pageId=312334686)

# 开发流程
- npm run dev:g2 （开发调试）
- 开启静态资源托管: cd nimwebsdkTester && yarn https-server 运行测试工程，在开发中调整下修改测试工程代码
- run npm run pack:prod:g2 （打包命令，在dist路径中生成打包文件）
- 项目管理[上线流程](http://doc.hz.netease.com/pages/viewpage.action?pageId=339177348)
- 发布版本后打一个tag 名字跟版本同步（v4.6.0）

# 测试流程
- 开发完成SDK后，需要发布到内网的测试环境，让测试人员测试页面。
测试环境的仓库地址是  [web-nrtc](https://g.hz.netease.com/rtc/web-nrtc) ， 在NDP部署发布后，可以通过webnrtc.netease.im访问。
- 具体使用请看web-nrtc仓库的介绍，可以参考[测试环境部署流程](http://doc.hz.netease.com/pages/viewpage.action?pageId=132893888)
- 当前是通过[CI流程](http://doc.hz.netease.com/pages/viewpage.action?pageId=312334235)完成测试环境demo的部署工作

# hotfix
- 从要修复的发布分支拉一个小版本小版本分支比如stab/v4.0.0 --》 stab/v4.0.1
- 流程同开发流程一致
- 发布版本后打一个tag


# 目录简介

- build 包含若干个自定义打包脚本
  - api 包含 api 相关的脚本
  - gulp 包含 gulp 相关的脚本
  - md 包含 md 相关的脚本
  - sdk 包含 sdk 相关的脚本
  - configs 包含所有环境相关的变量
  - grunt-jsdoc.config.json 用于生成 jsdoc 文档的配置文件
  - parse* 解析 tag 的脚本
  - tester 包含 demo 相关的脚本
  - nimpush rn推送用到的一些java文件，打包脚本会把这个文件下的内容复制到打包后的文件夹中
- dist 所有生成的东西均在此目录下
- doc 包含所有的文档，从yunxin doc 拉过来的md文档，会被复制到打包后的文件夹中，和sdk一起给到用户
  - api 包含 api 相关的文档
  - guide 包含所有的线上文档
  - misc 若干杂七杂八的文档
  - raw 包含原始文档, 用于生成最终的线上文档
- nimwebsdkTester 包含测试 demo，简称测试大白页，开发和QA都会用到
  - 请阅读该文件夹下的 README.md
  - python 包含用于测试 IE7 的 HTTPS 工程
  - ssh 包含用于 HTTPS 的自生成证书文件
  - web 包含所有的 demo 代码
  - app.js 为 demo 服务器入口  
- src 源代码
  - entry webpack 打包入口路径
  - netcall-G2
    - api 包含所有对外暴露的 api 接口
      - base 包含公用逻辑
      - client 包含 Client对象的 api 接口
      - stream 包含 Stream对象的 api 接口
    - module 包含所有功能的处理逻辑
      - device 媒体设备的检测逻辑
      - media 包含媒体设备打开、释放逻辑
      - play 包含音视频播放处理逻辑
      - meeting 包含房间管理的处理逻辑
      - signalling 包含和服务器的信令协议的处理逻辑
      - mediasoup 包含媒体订阅、发布等逻辑
      - webAudio 包含webAudio模块的业务处理
      - record 包含本地录制的业务处理
  - util 工具方法

# 分支介绍

- 分支 master 最新的代码
- 分支 stab/V4.x.x 版本发布分支
- 分支 feature/4.x.x 版本需求开发分支


# 版本迭代流程
- 产品（王琨 | 杨狄）发需求popo文档链接，拉第一次需求会，会上评估需求
- 产品拉第二次需求会拍定需求，定版本，各端开发、测试排期（最好会前评估好用时），产品建立故事主任务jira单
- 开发在主任务jira单下创建子任务，拉取feature分支进行开发
- 测试拟好测试用例同开发评估，勾选冒烟用例
- 在package.json里更新版本号
- 开发冒烟、发提测邮件
- 测试分别使用测试大白页、demo，对接服务端测试环境，开发修复问题，测试完毕；
- 上线阶段生成更新sdk API文档到[文档仓库]()推动master分支
- 测试分别使用测试大白页、demo，对接服务端线上环境，测试完毕；
- [发布流程参考](http://doc.hz.netease.com/pages/viewpage.action?pageId=339177348)
- 上线的发布计划中打钩画押，关注【通知群】云信发布群
- 线上版本打tag
 