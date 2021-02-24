
http://jira.netease.com/browse/NIM-4614
Web被iOS踢没有收到被踢的通知，网络直接断了，所以SDK认为是网络异常，又重新发起了一次登录，造成的现象就是iOS踢Web没踢掉
