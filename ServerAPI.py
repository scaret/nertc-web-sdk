#! /usr/bin/env python
# coding=utf-8
'''
 * 网易云信server API 接口 1.7
 *
 * Class ServerAPI
 * @author  hzchensheng15@corp.netease.com
 * @createdate    2015-10-28  16:30
 * @modifydate    2016-05-17  10:00
 *
 * 2016-05-17 10:00
 *   - 添加直接调用ssl库用socket方法发送https请求，在初始化对象实例时传入UseSSLLib = True
 *
'''

import urllib2, urllib
import random, time, hashlib, re
import ssl, socket, json
##import pprint
# BASEURL = 'https://api.netease.im/'
BASEURL = 'http://223.252.220.223/'

class ServerAPI():
    '''
     * 参数初始化
     * @param AppKey
     * @param AppSecret
    '''
    def __init__(self, AppKey, AppSecret, UseSSLLib = False):
        self.AppKey = AppKey;               #开发者平台分配的AppKey
        self.AppSecret = AppSecret;         #开发者平台分配的AppSecret,可刷新
        self.UseSSLLib = UseSSLLib;         # 是否使用ssl库

    '''
     * API checksum校验生成
     * @param  void
     * @return CheckSum(对象私有属性)
    '''
    def checkSumBuilder(self):
        charHex = '0123456789abcdef';
        self.Nonce = '';                    #随机字符串最大128个字符，也可以小于该数
        for i in range(0,128):
            index = int(15*random.random());
            self.Nonce = self.Nonce + charHex[index];

        self.CurTime = int(time.time());    #当前UTC时间戳，从1970年1月1日0点0 分0 秒开始到现在的秒数(String)
        join_string = self.AppSecret + self.Nonce + str(self.CurTime);

        self.CheckSum = hashlib.sha1(join_string).hexdigest(); #SHA1(AppSecret + Nonce + CurTime),三个参数拼接的字符串，进行SHA1哈希计算，转化成16进制字符(String，小写)
        
    '''
     * 使用urllib2发送post请求
     * @param  url     [请求地址]
     * @param  data    [array格式数据]
     * @return 请求返回结果(array)
    '''
    def postDataHttps(self,url,data):       
        self.checkSumBuilder();
        postdata = data;

        if self.UseSSLLib:
            res = self.postDataBySSLSocket(url, data);
        
        else:    
            res = self.postDataByUrllib2(url, data);
            
        try:
            resdata = eval(res);
        except Exception, what:
            print 'format to dicts error:', what
            resdata = res
        return resdata

    def postDataByUrllib2(self, url, data):
        headers = {
                'AppKey'	: self.AppKey,
                'Nonce'		: self.Nonce,
                'CurTime'   	: self.CurTime,
                'CheckSum'  	: self.CheckSum,
                'Content-Type' 	: 'application/x-www-form-urlencoded;charset=utf-8',
            };
        # params = "";
        # for key in data.keys():
        #     if data[key] == '':
        #         continue;
        #     params = params + key + "=" + str(data[key]) +"&";
        # params = params + "\r\n";
        params = urllib.urlencode(data)
        req = urllib2.Request(url,params,headers = headers);
        res_data = urllib2.urlopen(req)
        res = res_data.read()
        return res

    def postDataBySSLSocket(self, url, data):
        
        host = "api.netease.im";
        path = url.replace('https://api.netease.im','');

        # params = ''
        # for key in data.keys():
        #     if data[key] == '':
        #         continue;
        #     params = params + key + "=" + str(data[key]) +"&";
        # params = params.replace(' ','').replace('\'','\"') + "\r\n";
        params = urllib.urlencode(data)

        request = ''; 
        request = request + "POST " + path + " HTTP/1.1\r\n";  
        request = request + "Host:" + host + "\r\n";   
        request = request + "Content-type: application/x-www-form-urlencoded;charset=utf-8\r\n";  
        request = request + "Content-length: " + str(len(params)) + "\r\n";  
        request = request + "Connection: close\r\n"; 
        request = request + "AppKey: " + self.AppKey + "\r\n"; 
        request = request + "Nonce: " + self.Nonce + "\r\n"; 
        request = request + "CurTime: " + str(self.CurTime) + "\r\n"; 
        request = request + "CheckSum: " + self.CheckSum + "\r\n";  
        request = request + "\r\n";
        request = request + params + "\r\n";
                
        sock = ssl.wrap_socket(socket.socket());
        sock.connect((host, 443));
##        pprint.pprint(sock.getpeercert())
        sock.sendall(request);
        recv_data = sock.recv(4096);
##        print recv_data
        sock.close();
        if recv_data.rfind('}') > 0:
            braceStart = recv_data.find('{');
            braceEnd = recv_data.rfind('}');
            res = recv_data[braceStart : braceEnd + 1]
        else:
            res = recv_data
        return res

    '''
     * 创建云信ID
     * 1.第三方帐号导入到云信平台；
     * 2.注意accid，name长度以及考虑管理秘钥token
     * @param  accid     [云信ID，最大长度32字节，必须保证一个APP内唯一（只允许字母、数字、半角下划线_、@、半角点以及半角-组成，不区分大小写，会统一小写处理）]
     * @param  name      [云信ID昵称，最大长度64字节，用来PUSH推送时显示的昵称]
     * @param  props     [json属性，第三方可选填，最大长度1024字节]
     * @param  icon      [云信ID头像URL，第三方可选填，最大长度1024]
     * @param  token     [云信ID可以指定登录token值，最大长度128字节，并更新，如果未指定，会自动生成token，并在创建成功后返回]
     * @return result    [返回python dict 对象]
    '''
    def createUserId(self,accid,name='',props='',icon='',token=''):
        url = '%snimserver/user/create.action' % BASEURL;
        data = dict({
                'accid':accid,
                'name':name,
                'props':props,
                'icon':icon,
                'token':token 
            })
        return self.postDataHttps(url,data);

    '''
     * 更新云信ID
     * @param  accid     [云信ID，最大长度32字节，必须保证一个APP内唯一（只允许字母、数字、半角下划线_、@、半角点以及半角-组成，不区分大小写，会统一小写处理）]
     * @param  name      [云信ID昵称，最大长度64字节，用来PUSH推送时显示的昵称]
     * @param  props     [json属性，第三方可选填，最大长度1024字节]
     * @param  token     [云信ID可以指定登录token值，最大长度128字节，并更新，如果未指定，会自动生成token，并在创建成功后返回]
     * @return result    [返回python dict 对象]
    '''
    def updateUserId(self,accid,name='',props='',token=''):
        url = '%snimserver/user/update.action' % BASEURL;
        data = dict({
                'accid':accid,
                'name':name,
                'props':props,
                'token':token 
            })
        return self.postDataHttps(url,data);    


    '''
     * 更新并获取新token
     * @param  accid     [云信ID，最大长度32字节，必须保证一个APP内唯一（只允许字母、数字、半角下划线_、@、半角点以及半角-组成，不区分大小写，会统一小写处理）]
     * @return result    [返回python dict 对象]
    '''
    def updateUserToken(self,accid):
        url = '%snimserver/user/refreshToken.action' % BASEURL;
        data = dict({
                'accid':accid
            });
        return self.postDataHttps(url,data);

    '''
     * 封禁云信ID
     * 第三方禁用某个云信ID的IM功能,封禁云信ID后，此ID将不能登陆云信imserver
     * @param  accid     [云信ID，最大长度32字节，必须保证一个APP内唯一（只允许字母、数字、半角下划线_、@、半角点以及半角-组成，不区分大小写，会统一小写处理）]
     * @return result    [返回python dict 对象]
    '''
    def blockUserId(self,accid):
        url = '%snimserver/user/block.action' % BASEURL;
        data = dict({
                'accid':accid
            });
        return self.postDataHttps(url,data);

    '''
     * 解禁云信ID
     * 第三方禁用某个云信ID的IM功能,封禁云信ID后，此ID将不能登陆云信imserver
     * @param  accid     [云信ID，最大长度32字节，必须保证一个APP内唯一（只允许字母、数字、半角下划线_、@、半角点以及半角-组成，不区分大小写，会统一小写处理）]
     * @return result    [返回python dict 对象]
    '''
    def unblockUserId(self,accid):
        url = '%snimserver/user/unblock.action' % BASEURL;
        data = dict({
                'accid':accid
            });
        return self.postDataHttps(url,data);

    '''
     * 更新用户名片
     * @param  accid       [云信ID，最大长度32字节，必须保证一个APP内唯一（只允许字母、数字、半角下划线_、@、半角点以及半角-组成，不区分大小写，会统一小写处理）]
     * @param  name        [云信ID昵称，最大长度64字节，用来PUSH推送时显示的昵称]
     * @param  icon        [用户icon，最大长度256字节]
     * @param  sign        [用户签名，最大长度256字节]
     * @param  email       [用户email，最大长度64字节]
     * @param  birth       [用户生日，最大长度16字节]
     * @param  mobile      [用户mobile，最大长度32字节]
     * @param  ex          [用户名片扩展字段，最大长度1024字节，用户可自行扩展，建议封装成JSON字符串]
     * @param  gender      [用户性别，0表示未知，1表示男，2女表示女，其它会报参数错误]
     * @return result      [返回python dict 对象]
    '''
    def updateUinfo(self,accid,name='',icon='',sign='',email='',birth='',mobile='',gender='0',ex=''):
        url = '%snimserver/user/updateUinfo.action' % BASEURL;
        data= dict({
            'accid': accid,
            'name': name,
            'icon': icon,
            'sign': sign,
            'email': email,
            'birth': birth,
            'mobile': mobile,
            'gender': gender,
            'ex': ex
        });
        return self.postDataHttps(url,data);

    '''
     * 获取用户名片，可批量
     * @param  accids    [用户帐号（例如：JSONArray对应的accid串，如："zhangsan"，如果解析出错，会报414）（一次查询最多为200）]
     * @return result    [返回python dict 对象]
    '''
    def getUinfos(self,accids):
        url = '%snimserver/user/getUinfos.action' % BASEURL;
        data= dict({
            'accids' : str(accids)
        });
        return self.postDataHttps(url,data);


    '''
     * 好友关系-加好友
     * @param  accid       [云信ID，最大长度32字节，必须保证一个APP内唯一（只允许字母、数字、半角下划线_、@、半角点以及半角-组成，不区分大小写，会统一小写处理）]
     * @param  faccid        [云信ID昵称，最大长度64字节，用来PUSH推送时显示的昵称]
     * @param  type        [用户type，最大长度256字节]
     * @param  msg        [用户签名，最大长度256字节]
     * @return result      [返回python dict 对象]
    '''
    def addFriend(self,accid,faccid,typex='1',msg=''):
        url = '%snimserver/friend/add.action' % BASEURL;
        data= dict({
            'accid' : accid,
            'faccid' : faccid,
            'type' : typex,
            'msg' : msg
        });
        return self.postDataHttps(url,data);


    '''
     * 好友关系-更新好友信息
     * @param  accid       [云信ID，最大长度32字节，必须保证一个APP内唯一（只允许字母、数字、半角下划线_、@、半角点以及半角-组成，不区分大小写，会统一小写处理）]
     * @param  faccid        [要修改朋友的accid]
     * @param  alias        [给好友增加备注名]
     * @return result      [返回python dict 对象]
    '''
    def updateFriend(self,accid,faccid,alias):
        url = '%snimserver/friend/update.action' % BASEURL;
        data= dict({
            'accid' : accid,
            'faccid' : faccid,
            'alias' : alias
        });
        return self.postDataHttps(url,data);


    '''
     * 好友关系-获取好友关系
     * @param  accid       [云信ID，最大长度32字节，必须保证一个APP内唯一（只允许字母、数字、半角下划线_、@、半角点以及半角-组成，不区分大小写，会统一小写处理）]
     * @return result      [返回python dict 对象]
    '''
    def getFriend(self,accid):
        url = '%snimserver/friend/get.action' % BASEURL;
        data= dict({
            'accid' : accid,
            'createtime' : str(int(time.time()*1000))
        });
        return self.postDataHttps(url,data);


    '''
     * 好友关系-删除好友信息
     * @param  accid       [云信ID，最大长度32字节，必须保证一个APP内唯一（只允许字母、数字、半角下划线_、@、半角点以及半角-组成，不区分大小写，会统一小写处理）]
     * @param  faccid        [要修改朋友的accid]
     * @return result      [返回python dict 对象]
    '''
    def deleteFriend(self,accid,faccid):
        url = '%snimserver/friend/delete.action' % BASEURL;
        data= dict({
            'accid' : accid,
            'faccid' : faccid
        });
        return self.postDataHttps(url,data);


    '''
     * 好友关系-设置黑名单
     * @param  accid       [云信ID，最大长度32字节，必须保证一个APP内唯一（只允许字母、数字、半角下划线_、@、半角点以及半角-组成，不区分大小写，会统一小写处理）]
     * @param  targetAcc        [被加黑或加静音的帐号]
     * @param  relationType        [本次操作的关系类型,1:黑名单操作，2:静音列表操作]
     * @param  value        [操作值，0:取消黑名单或静音；1:加入黑名单或静音]
     * @return result      [返回python dict 对象]
    '''
    def specializeFriend(self,accid,targetAcc,relationType='1',value='1'):
        url = '%snimserver/user/setSpecialRelation.action' % BASEURL;
        data= dict({
            'accid' : accid,
            'targetAcc' : targetAcc,
            'relationType' : relationType,
            'value' : value
        });
        return self.postDataHttps(url,data);

    '''
     * 好友关系-查看黑名单列表
     * @param  accid       [云信ID，最大长度32字节，必须保证一个APP内唯一（只允许字母、数字、半角下划线_、@、半角点以及半角-组成，不区分大小写，会统一小写处理）]
     * @return result      [返回python dict 对象]
    '''
    def listBlackFriend(self,accid):
        url = '%snimserver/user/listBlackAndMuteList.action' % BASEURL;
        data= dict({
            'accid' : accid
        });
        return self.postDataHttps(url,data);

    '''
     * 消息功能-发送普通消息
     * @param  from       [发送者accid，用户帐号，最大32字节，APP内唯一]
     * @param  ope        [0：点对点个人消息，1：群消息，其他返回414]
     * @param  to        [ope==0是表示accid，ope==1表示tid]
     * @param  type        [0 表示文本消息,1 表示图片，2 表示语音，3 表示视频，4 表示地理位置信息，6 表示文件，100 自定义消息类型]
     * @param  body       [请参考下方消息示例说明中对应消息的body字段。最大长度5000字节，为一个json字段。]
     * @param  option       [发消息时特殊指定的行为选项,Json格式，可用于指定消息的漫游，存云端历史，发送方多端同步，推送，消息抄送等特殊行为;option中字段不填时表示默认值]
     * @param  pushcontent      [推送内容，发送消息（文本消息除外，type=0），option选项中允许推送（push=true），此字段可以指定推送内容。 最长200字节]
     * @return result      [返回python dict 对象]
    '''
    def sendMsg(self,fromx,ope,to,typex,body,option=dict({"push":False,"roam":True,"history":False,"sendersync":True, "route":False}),pushcontent=''):
        url = '%snimserver/msg/sendMsg.action' % BASEURL;
        data= dict({
            'from' : fromx,
            'ope' : ope,
            'to' : to,
            'type' : typex,
            'body' : json.dumps(body),
            'option' : json.dumps(option),
            'pushcontent' : pushcontent
        });
        return self.postDataHttps(url,data);


    '''
     * 消息功能-发送自定义系统消息
     * 1.自定义系统通知区别于普通消息，方便开发者进行业务逻辑的通知。
     * 2.目前支持两种类型：点对点类型和群类型（仅限高级群），根据msgType有所区别。
     * @param  from       [发送者accid，用户帐号，最大32字节，APP内唯一]
     * @param  msgtype        [0：点对点个人消息，1：群消息，其他返回414]
     * @param  to        [msgtype==0是表示accid，msgtype==1表示tid]
     * @param  attach        [自定义通知内容，第三方组装的字符串，建议是JSON串，最大长度1024字节]
     * @param  pushcontent       [ios推送内容，第三方自己组装的推送内容，如果此属性为空串，自定义通知将不会有推送（pushcontent + payload不能超过200字节）]
     * @param  payload       [ios 推送对应的payload,必须是JSON（pushcontent + payload不能超过200字节）]
     * @param  sound      [如果有指定推送，此属性指定为客户端本地的声音文件名，长度不要超过30个字节，如果不指定，会使用默认声音]
     * @return result      [返回python dict 对象]
    '''
    def sendAttachMsg(self,fromx,msgtype,to,attach,pushcontent='',payload=dict({}),sound=''):
        url = '%snimserver/msg/sendAttachMsg.action' % BASEURL;
        data= dict({
            'from' : fromx,
            'msgtype' : msgtype,
            'to' : to,
            'attach' : attach,
            'pushcontent' : pushcontent,
            'payload' : str(payload),
            'sound' : sound
        });
        return self.postDataHttps(url,data);


    '''
     * 消息功能-文件上传
     * @param  content       [字节流base64串(Base64.encode(bytes)) ，最大15M的字节流]
     * @param  type        [上传文件类型]       
     * @return result      [返回python dict 对象]
    '''
    def uploadMsg(self,content,typex='0'):
        url = '%snimserver/msg/upload.action' % BASEURL;
        data= dict({
            'content' : content,
            'type' : typex
        });
        return self.postDataHttps(url,data);


    '''
     * 消息功能-文件上传（multipart方式）
     * @param  content       [字节流base64串(Base64.encode(bytes)) ，最大15M的字节流]
     * @param  type        [上传文件类型]       
     * @return result      [返回python dict 对象]
    '''
    def uploadMultiMsg(self,content,typex='0'):
        url = '%snimserver/msg/fileUpload.action' % BASEURL;
        data= dict({
            'content' : content,
            'type' : typex
        });
        return self.postDataHttps(url,data);

    '''
      * 消息撤回
        deleteMsgid String  是   要撤回消息的msgid
        timetag long    是   要撤回消息的创建时间
        type    int 是   7:表示点对点消息撤回，8:表示群消息撤回，其它为参数错误
        from    String  是   发消息的accid
        to  String  是   如果点对点消息，为接收消息的accid,如果群消息，为对应群的tid
        msg String  否   可以带上对应的描述
        ignoreTime  String  否   1表示忽略撤回时间检测，其它为非法参数，如果需要撤回时间检测，不填即可
    '''
    def recallMsg(self, deleteMsgid, timetag, typex, fromx, to, msg = '', ignoreTime = 1):
        url = '%snimserver/msg/recall.action' % BASEURL;
        data= dict({
            'deleteMsgid' : deleteMsgid,
            'timetag' : timetag,
            'type' : typex,
            'from' : fromx,
            'to' : to,
            'msg' : msg,
            'ignoreTime' : ignoreTime,
        })
        return self.postDataHttps(url,data);

    '''
     * 群组功能（高级群）-创建群
     * @param  tname       [群名称，最大长度64字节]
     * @param  owner       [群主用户帐号，最大长度32字节]
     * @param  members     [["aaa","bbb"](JsonArray对应的accid，如果解析出错会报414)，长度最大1024字节]
     * @param  announcement [群公告，最大长度1024字节]
     * @param  intro       [群描述，最大长度512字节]
     * @param  msg       [邀请发送的文字，最大长度150字节]
     * @param  magree      [管理后台建群时，0不需要被邀请人同意加入群，1需要被邀请人同意才可以加入群。其它会返回414。]
     * @param  joinmode    [群建好后，sdk操作时，0不用验证，1需要验证,2不允许任何人加入。其它返回414]
     * @param  custom      [自定义高级群扩展属性，第三方可以跟据此属性自定义扩展自己的群属性。（建议为json）,最大长度1024字节.]
     * @return result      [返回python dict 对象]
    '''
    def createGroup(self,tname,owner,members,announcement='',intro='',msg='',magree='0',joinmode='0',custom='{}'):
        url = '%snimserver/team/create.action' % BASEURL;
        data= dict({
            'tname' : tname,
            'owner' : owner,
            'members' : str(members),
            'announcement' : announcement,
            'intro' : intro,
            'msg' : msg,
            'magree' : magree,
            'joinmode' : joinmode,
            'custom' : custom
        });
        return self.postDataHttps(url,data);


    '''
     * 群组功能（高级群）-拉人入群
     * @param  tid       [云信服务器产生，群唯一标识，创建群时会返回，最大长度128字节]
     * @param  owner       [群主用户帐号，最大长度32字节]
     * @param  members     [["aaa","bbb"](JsonArray对应的accid，如果解析出错会报414)，长度最大1024字节]
     * @param  magree      [管理后台建群时，0不需要被邀请人同意加入群，1需要被邀请人同意才可以加入群。其它会返回414。]
     * @param  joinmode    [群建好后，sdk操作时，0不用验证，1需要验证,2不允许任何人加入。其它返回414]
     * @param  custom      [自定义高级群扩展属性，第三方可以跟据此属性自定义扩展自己的群属性。（建议为json）,最大长度1024字节.]
     * @return result      [返回python dict 对象]
    '''
    def addIntoGroup(self,tid,owner,members,magree='0',msg='请您入伙'):
        url = '%snimserver/team/add.action' % BASEURL;
        data= dict({
            'tid' : tid,
            'owner' : owner,
            'members' : str(members),
            'magree' : magree,
            'msg' : msg
        });
        return self.postDataHttps(url,data);


    '''
     * 群组功能（高级群）-踢人出群
     * @param  tid       [云信服务器产生，群唯一标识，创建群时会返回，最大长度128字节]
     * @param  owner       [群主用户帐号，最大长度32字节]
     * @param  member     [被移除人得accid，用户账号，最大长度字节]
     * @return result      [返回python dict 对象]
    '''
    def kickFromGroup(self,tid,owner,member):
        url = '%snimserver/team/kick.action' % BASEURL;
        data= dict({
            'tid' : tid,
            'owner' : owner,
            'member' : member
        });
        return self.postDataHttps(url,data);

    '''
     * 群组功能（高级群）-解散群
     * @param  tid       [云信服务器产生，群唯一标识，创建群时会返回，最大长度128字节]
     * @param  owner       [群主用户帐号，最大长度32字节]
     * @return result      [返回python dict 对象]
    '''
    def removeGroup(self,tid,owner):
        url = '%snimserver/team/remove.action' % BASEURL;
        data= dict({
            'tid' : tid,
            'owner' : owner
        });
        return self.postDataHttps(url,data);

    '''
     * 群组功能（高级群）-更新群资料
     * @param  tid       [云信服务器产生，群唯一标识，创建群时会返回，最大长度128字节]
     * @param  owner       [群主用户帐号，最大长度32字节]
     * @param  tname     [群主用户帐号，最大长度32字节]
     * @param  announcement [群公告，最大长度1024字节]
     * @param  intro       [群描述，最大长度512字节]
     * @param  joinmode    [群建好后，sdk操作时，0不用验证，1需要验证,2不允许任何人加入。其它返回414]
     * @param  custom      [自定义高级群扩展属性，第三方可以跟据此属性自定义扩展自己的群属性。（建议为json）,最大长度1024字节.]
     * @return result      [返回python dict 对象]
    '''
    def updateGroup(self,tid,owner,tname,announcement='',intro='',joinmode='0',custom=''):
        url = '%snimserver/team/update.action' % BASEURL;
        data= dict({
            'tid' : tid,
            'owner' : owner,
            'tname' : tname,
            'announcement' : announcement,
            'intro' : intro,
            'joinmode' : joinmode,
            'custom' : custom
        });
        return self.postDataHttps(url,data);


    '''
     * 群组功能（高级群）-群信息与成员列表查询
     * @param  tids       [群tid列表，如[\"3083\",\"3084"]]
     * @param  ope       [1表示带上群成员列表，0表示不带群成员列表，只返回群信息]
     * @return result      [返回python dict 对象]
    '''
    def queryGroup(self,tids,ope='1'):
        url = '%snimserver/team/query.action' % BASEURL;
        data= dict({
            'tids' : str(tids),
            'ope' : ope
        });
        return self.postDataHttps(url,data);

    '''
     * 群组功能（高级群）-移交群主
     * @param  tid       [云信服务器产生，群唯一标识，创建群时会返回，最大长度128字节]
     * @param  owner       [群主用户帐号，最大长度32字节]
     * @param  newowner     [新群主帐号，最大长度32字节]
     * @param  leave       [1:群主解除群主后离开群，2：群主解除群主后成为普通成员。其它414]
     * @return result      [返回python dict 对象]
    '''
    def changeGroupOwner(self,tid,owner,newowner,leave='2'):
        url = '%snimserver/team/changeOwner.action' % BASEURL;
        data= dict({
            'tid' : tid,
            'owner' : owner,
            'newowner' : newowner,
            'leave' : leave
        });
        return self.postDataHttps(url,data);


    '''
     * 群组功能（高级群）-任命管理员
     * @param  tid       [云信服务器产生，群唯一标识，创建群时会返回，最大长度128字节]
     * @param  owner       [群主用户帐号，最大长度32字节]
     * @param  members     [["aaa","bbb"](JsonArray对应的accid，如果解析出错会报414)，长度最大1024字节（群成员最多10个）]
     * @return result      [返回python dict 对象]
    '''
    def addGroupManager(self,tid,owner,members):
        url = '%snimserver/team/addManager.action' % BASEURL;
        data= dict({
            'tid' : tid,
            'owner' : owner,
            'members' : str(members)
        });
        return self.postDataHttps(url,data);


    '''
     * 群组功能（高级群）-移除管理员
     * @param  tid       [云信服务器产生，群唯一标识，创建群时会返回，最大长度128字节]
     * @param  owner       [群主用户帐号，最大长度32字节]
     * @param  members     [["aaa","bbb"](JsonArray对应的accid，如果解析出错会报414)，长度最大1024字节（群成员最多10个）]
     * @return result      [返回python dict 对象]
    '''
    def removeGroupManager(self,tid,owner,members):
        url = '%snimserver/team/removeManager.action' % BASEURL;
        data= dict({
            'tid' : tid,
            'owner' : owner,
            'members' : str(members)
        });
        return self.postDataHttps(url,data);

    '''
     * 群组功能（高级群）-获取某用户所加入的群信息
     * @param  accid       [要查询用户的accid]
     * @return result      [返回python dict 对象]
    '''
    def joinTeams(self,accid):
        url = '%snimserver/team/joinTeams.action' % BASEURL;
        data= dict({
            'accid' : accid
        });
        return self.postDataHttps(url,data);

    '''
     * 群组功能（高级群）-修改群昵称
     * @param  tid       [云信服务器产生，群唯一标识，创建群时会返回，最大长度128字节]
     * @param  owner       [群主用户帐号，最大长度32字节]
     * @param  accid     [要修改群昵称对应群成员的accid]
     * @param  nick     [accid对应的群昵称，最大长度32字节。]     
     * @return result      [返回python dict 对象]
    '''
    def updateGroupNick(self,tid,owner,accid,nick):
        url = '%snimserver/team/updateTeamNick.action' % BASEURL;
        data= dict({
            'tid' : tid,
            'owner' : owner,
            'accid' : accid,
            'nick' : nick
        });
        return self.postDataHttps(url,data);


    '''
     * 历史记录-单聊
     * @param  from       [发送者accid]
     * @param  to          [接收者accid]
     * @param  begintime     [开始时间，ms]
     * @param  endtime     [截止时间，ms]
     * @param  limit       [本次查询的消息条数上限(最多100条),小于等于0，或者大于100，会提示参数错误]
     * @param  reverse    [1按时间正序排列，2按时间降序排列。其它返回参数414.默认是按降序排列。]
     * @return result      [返回python dict 对象]
    '''
    def querySessionMsg(self,fromx,to,begintime,endtime='',limit='100',reverse='1'):
        url = '%snimserver/history/querySessionMsg.action' % BASEURL;
        data= dict({
            'from' : fromx,
            'to' : to,
            'begintime' : str(begintime),
            'endtime' : str(endtime),
            'limit' : limit,
            'reverse' : reverse
        });
        return self.postDataHttps(url,data);

    '''
     * 历史记录-群聊
     * @param  tid       [群id]
     * @param  accid          [查询用户对应的accid.]
     * @param  begintime     [开始时间，ms]
     * @param  endtime     [截止时间，ms]
     * @param  limit       [本次查询的消息条数上限(最多100条),小于等于0，或者大于100，会提示参数错误]
     * @param  reverse    [1按时间正序排列，2按时间降序排列。其它返回参数414.默认是按降序排列。]
     * @return result      [返回python dict 对象]
    '''
    def queryGroupMsg(self,tid,accid,begintime,endtime='',limit='100',reverse='1'):
        url = '%snimserver/history/queryTeamMsg.action' % BASEURL;
        data= dict({
            'tid' : tid,
            'accid' : accid,
            'begintime' : str(begintime),
            'endtime' : str(endtime),
            'limit' : limit,
            'reverse' : reverse
        });
        return self.postDataHttps(url,data);


    '''
     * 发送短信验证码
     * @param  mobile       [目标手机号]
     * @param  deviceId     [目标设备号，可选参数]
     * @return result      [返回python dict 对象]
    '''
    def sendSmsCode(self,mobile,deviceId=''):
        url = '%ssms/sendcode.action' % BASEURL;
        data= dict({
            'mobile' : mobile,
            'deviceId' : deviceId
        });
        return self.postDataHttps(url,data);

    '''
     * 校验验证码
     * @param  mobile       [目标手机号]
     * @param  code          [验证码]
     * @return result      [返回python dict 对象]
    '''
    def verifycode(self,mobile,code=''):
        url = '%ssms/verifycode.action' % BASEURL;
        data= dict({
            'mobile' : mobile,
            'code' : code
        });
        return self.postDataHttps(url,data);

    '''
     * 发送模板短信
     * @param  templateid       [模板编号(由客服配置之后告知开发者)]
     * @param  mobiles          [验证码]
     * @param  params          [短信参数列表，用于依次填充模板，JSONArray格式，如["xxx","yyy"];对于不包含变量的模板，不填此参数表示模板即短信全文内容]
     * @return result      [返回python dict 对象]
    '''
    def sendSMSTemplate(self,templateid,mobiles=[],params=[]):
        url = '%ssms/sendtemplate.action' % BASEURL;
        data= dict({
            'templateid' : templateid,
            'mobiles' : str(mobiles),
            'params' : str(params)
        });
        return self.postDataHttps(url,data);


    '''
     * 查询模板短信发送状态
     * @param  sendid       [发送短信的编号sendid]
     * @return result      [返回python dict 对象]
    '''
    def querySMSStatus(self,sendid):
        url = '%ssms/querystatus.action' % BASEURL;
        data= dict({
            'sendid' : sendid
        });
        return self.postDataHttps(url,data);

    '''
     * 发起单人专线电话
     * @param  callerAcc       [发起本次请求的用户的accid]
     * @param  caller          [主叫方电话号码(不带+86这类国家码,下同)]
     * @param  callee          [被叫方电话号码]
     * @param  maxDur          [本通电话最大可持续时长,单位秒,超过该时长时通话会自动切断]
     * @return result      [返回python dict 对象]
    '''
    def startcall(self,callerAcc,caller,callee,maxDur='60'):
        url = '%scall/ecp/startcall.action' % BASEURL;
        data= dict({
            'callerAcc' : callerAcc,
            'caller' : caller,
            'callee' : callee,
            'maxDur' : maxDur
        });
        return self.postDataHttps(url,data);

    '''
     * 发起专线会议电话
     * @param  callerAcc       [发起本次请求的用户的accid]
     * @param  caller          [主叫方电话号码(不带+86这类国家码,下同)]
     * @param  callee          [所有被叫方电话号码,必须是json格式的字符串,如["13588888888","13699999999"]]
     * @param  maxDur          [本通电话最大可持续时长,单位秒,超过该时长时通话会自动切断]
     * @return result      [返回python dict 对象]
    '''
    def startconf(self,callerAcc,caller,callee,maxDur='60'):
        url = '%scall/ecp/startconf.action' % BASEURL;
        data= dict({
            'callerAcc' : callerAcc,
            'caller' : caller,
            'callee' : str(callee),
            'maxDur' : maxDur
        });
        return self.postDataHttps(url,data);
    
    '''
     * 查询单通专线电话或会议的详情
     * @param  session       [本次通话的id号]
     * @param  type          [通话类型,1:专线电话;2:专线会议]
     * @return result      [返回python dict 对象]
    '''
    def queryCallsBySession(self,session,typex=0):
        url = '%scall/ecp/queryBySession.action' % BASEURL;
        data= dict({
            'session' : session,
            'type' : typex
        });
        return self.postDataHttps(url,data);


    def broadcastMsg(self,body,from_x='cs3',isOffline=False,ttl=2):
        url = '%snimserver/msg/broadcastMsg.action' % BASEURL;
        data = dict({
                'body':body,
                'from':from_x,
                'isOffline':isOffline,
                'ttl':ttl
            })
        return self.postDataHttps(url,data);

if __name__ == '__main__':
    AppKey = 'fe416640c8e8a72734219e1847ad2547'
    AppSecret = '1ed09990d13a'
    p = ServerAPI(AppKey,AppSecret)
    print p.updateUserId('cs1', token='e10adc3949ba59abbe56e057f20f883e')
    # print p.unblockUserId('cs6')
    # print p.broadcastMsg('hello')
