# monaibuhuihuahua 的个人博客

这是一个部署在 GitHub Pages 上的个人博客，当前采用纯静态结构，方便直接维护。

## 当前目录

- `index.html`
  个人主页，包含自我介绍、头像位置和三个栏目入口
- `thoughts/`
  生活感悟板块
- `algorithms/`
  算法题板块
- `photography/`
  生活摄影板块
- `assets/`
  公共资源目录，头像和后续图片都可以放这里

## 头像替换

当前主页头像使用的是占位图：

- `assets/avatar-placeholder.svg`

后续你可以直接把它替换成自己的头像文件。
如果你想用别的文件名，比如 `avatar.jpg`，只需要同步修改 `index.html` 里的图片路径即可。

## 更新方式

每次改完内容后，在项目目录执行：

```bash
git add .
git commit -m "更新博客内容"
git push
```
