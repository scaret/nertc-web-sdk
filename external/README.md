## 说明
此目录下放置一些未发布到NPM的其他项目依赖，使用Git Subtree进行管理

## 使用方式

在项目中通过 `external/draw/src/index` 以`external`开头的路径引入，`external`在webpack中配置为本目录的alias

如果此目录下项目的对应remote项目进行了更新，还需要通过Git Subtree命令进行本地代码的更新：

``` bash
git subtree pull --prefix 本地路径 远程仓库地址 远程仓库分支 --squash
```

向`external`目录下新增本地依赖：

``` bash
git subtree add --prefix 本地路径 远程仓库地址 远程仓库分支 --squash
```

## 本地依赖列表

### draw
SDK白板中使用的绘图库

更新命令
``` bash
git subtree pull --prefix external/draw ssh://git@g.hz.netease.com:22222/yunxin/web-whiteboard.git master --squash
```

### dbjs
不需要更新

### socketio
不需要更新

### weapp-polyfill
不需要更新


使用 Git subtree 新建或更新子项目的时候，可以选用 --squash 参数， 它的作用就是把 subtree 子项目的更新记录进行合并，再合并到主项目中。

所以，在使用 --squash 参数的情况下， subtree add 或者 pull 操作的结果对应两个 commit， 一个是 Squash 了子项目的历史记录， 一个是 Merge 到主项目中。

这种做法下，主项目的历史记录看起来还是比较整齐的。 但在子项目有更新，需要 subtree pull 的时候，却经常需要处理冲突。 严重的，在每次 subtree pull 的时候都需要重复处理同样的冲突，非常烦人。

如果不使用 --squash 参数，子项目更新的时候，subtree pull 很顺利， 能够自动处理已解决过的冲突，缺点就是子项目的更新记录“污染”了主项目的。