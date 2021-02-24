
jshint
gulp-JSCS
gulp-jsonlint
commitplease
core-js
gulp-babel
gulp-npmcopy
native-promise-only
once/sinon
q
io
compare-size
cli
xhr
    https://github.com/Raynos/xhr
    once
        https://github.com/isaacs/once
    parse-headers
        https://github.com/kesla/parse-headers
    trim
        https://www.npmjs.com/package/trim
    for-each
        https://github.com/Raynos/for-each
    is-function
        https://github.com/grncdr/js-is-function
mercury
    https://github.com/Raynos/mercury
virtual-dom
    https://github.com/Matt-Esch/virtual-dom

done 
- tinfo增加custom字段用于第三方扩展
- tinfo增加属性字段servercustom
- 新增会话获取&删除，TALK_SERVICE=7，CID_DELETE_SESSION=9，CID_GET_SESSION=10
- 增加好友相关协议，FRIEND_SERVICE=12；增加Friend类；SystemMsgType增加两种好友相关系统通知。
- 群成员tlist中增加bits位定义CLOSE_NOTIFY = 1L << 0; // 关闭消息提醒
- 增加过去uinfo协议3-7，增加同步tag，FRIENDLIST=11。   by  lc

p2
- 增加音视频通话相关协议内容
- INIT_CALL和NOTIFY_BECALLED协议的响应参数中增加StrLongMap响应字段
- 电话相关离线通知统一到NOTIFY_NETCALL,与个人会话分离
- NOTIFY_NETCALL相关的离线通知在离线中单独同步，单独删除
- 音视频电话被叫接听时给被叫的其他在线端发在线消息NOTIFY_OL_ACK_SYNC
- KEEP_CALLING协议去掉最后三个参数，turnServerList，sturnServerList，proxy
- 新增下发及上传SDK Log日志接口，CID_NOTIFY_SDKLOG_UPLOAD，CID_GET_SDKLOG_UPLOAD
- 新增语音转文字接口，MISC_SERVICE=6，CID_TRANS_AUDIO=5

p1
- tinfo增加bits字段用于群开关
- IE10 无法发送空文件 一直pending
    - Uploading empty file IE10/IE11 hangs indefinitely
    - https://connect.microsoft.com/IE/feedback/details/813443/uploading-empty-file-ie10-ie11-hangs-indefinitely
- 实时音视频白板实现方案调研
    http://www.html5rocks.com/en/tutorials/webrtc/basics/
    https://www.google.com.hk/search?q=webrtc+ios&safe=strict&rlz=1C5CHFA_enCN609CN609&es_sm=119&lr=lang_zh-CN&sa=X&ved=0CBoQuAFqFQoTCKu96ry25McCFUhRjgodOCMHUA&biw=1280&bih=633
    http://www.cnblogs.com/lingyunhu/tag/webrtc%20android%20ios/default.html?page=2
    http://www.cnblogs.com/lingyunhu/p/3621057.html

p0
- util/config xhr可以传参数JSON=true来获取JSON格式的结果
- ie http to https xhr socket
    http://www.html5rocks.com/en/tutorials/cors/
    http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx
    http://www.webdbg.com/test/xdm/httptohttps.asp
    http://mcgivery.com/ie8-and-cors/
    https://www.google.com.hk/webhp?sourceid=chrome-instant&rlz=1C5CHFA_enCN609CN609&ion=1&espv=2&ie=UTF-8#q=ie8%20cors%20http%20https
- iframe timeout
- sdk：针对高级浏览器(chrome)的性能优化
    - db.js & es6-promise
    - 假如A离线，被从群M踢了，那么A不会再收到M的消息
    http://www.html5rocks.com/en/tutorials/es6/promises/

p
- IndexedDB
    - doc
        https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Concepts_Behind_IndexedDB
        https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
        https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
        https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Browser_storage_limits_and_eviction_criteria
    http://caniuse.com/#search=indexeddb
        - IE10/11/Edge
            This browser does not support using array `keyPath`s: DataError
            This browser does not support using array keys: DataError
            This browser does not support lookup of objects via compound index: DataError
        - iOS/Safari
            If you assign the same id to data in two object store, then the data inserted in the first object store is removed.
            Partial support in iOS 8 & 9 refers to seriously buggy behavior as well as complete lack of support in WebViews.
            not support multiple object stores scope.
            IndexedDB is not available in iOS 8 “UIWebView” or Home screen apps
                http://stackoverflow.com/questions/4460205/detect-ipad-iphone-webview-via-javascript
- aop
    https://www.google.com.hk/webhp?sourceid=chrome-instant&rlz=1C5CHFA_enCN609CN609&ion=1&espv=2&ie=UTF-8#q=js%20aop
    http://www.alloyteam.com/2013/08/yong-aop-gai-shan-javascript-dai-ma/
- requirejs
    http://requirejs.org/docs/faq-optimization.html
    https://github.com/jrburke/requirejs/wiki/Plugins
    https://github.com/jrburke/requirejs/wiki/Differences-between-the-simplified-CommonJS-wrapper-and-standard-AMD-define#magic
- pages
    https://pages.github.com/
    https://help.github.com/pages
    https://github.com/jekyll/jekyll
- markdown
    https://daringfireball.net/projects/markdown/syntax
- http://purecss.io/grids/
- http://getbootstrap.com/getting-started/#template
- base64 <-> blob
    - https://www.google.com.hk/webhp?sourceid=chrome-instant&rlz=1C5CHFA_enCN609CN609&ion=1&espv=2&ie=UTF-8#safe=strict&q=js+base64+to+file
    - http://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata
    - http://stackoverflow.com/questions/6150289/how-to-convert-image-into-base64-string-using-javascript
    - http://stackoverflow.com/questions/934012/get-image-data-in-javascript
    - http://stackoverflow.com/questions/6333814/how-does-the-paste-image-from-clipboard-functionality-work-in-gmail-and-google-c
    - https://www.google.com.hk/webhp?sourceid=chrome-instant&rlz=1C5CHFA_enCN609CN609&ion=1&espv=2&ie=UTF-8#q=data%20uris%20mdn
    - https://developer.mozilla.org/en/docs/Web/HTTP/data_URIs
