- Socket：网络上的两个程序通过一个双向的通信连接实现数据的交换，这个连接的一端称为一个socket。
    - WebSocket是HTML5提供的一种在单个TCP连接上进行双向通讯的协议。在WebSocket中，浏览器和服务器只需要做一个握手的动作，然后，浏览器和服务器之间就形成了一条快速通道，两者之间就可以直接互相传送数据。
    - IE8和IE9不支持WebSocket，使用xhr-polling（轮询）来模拟双向通讯。

- 文件上传
    - Web SDK使用HTML5提供的FormData来上传文件。
    - IE8和IE9不支持FormData，使用Iframe来上传文件。
