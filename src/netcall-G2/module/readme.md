# 简介

module 目录包含了 SDK 的核心业务逻辑实现代码，包括以下组成部分：

- core: 核心业务子模块
  - gateway: 网关实现框架
  - media: 媒体设备相关功能
  - record: 媒体录制相关功能
  - index.js: 统一导出子模块核心类或对象
- pcagent: pcagent 的核心业务逻辑
- webrtc: webrtc/nrtc 的核心业务逻辑
  - chrome: chrome 实现（不同大版本号）
  - firefox: firefox 实现（不同大版本号）
  - safari: safari 实现（不同大版本号）
  - abstractWebRTC.js: webRTC 实现的通用抽离框架
  - release.js: 对外发布的适配版本号描述
  - webRTCBuilder.js: WebRTC 的实现实例管理器（按浏览器及其版本号区分）
