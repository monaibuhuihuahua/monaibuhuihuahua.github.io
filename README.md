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
  生活摄影板块，按年份和月份整理
- `assets/`
  公共资源目录，头像和照片都可以放这里

## 头像说明

当前主页头像使用的是：

- `assets/avatar.png`

如果头像文件已经换了但页面没显示，通常检查这几件事：

1. 文件名是不是完全一致，包括大小写
2. 图片是不是确实放在 `assets/` 目录下
3. `index.html` 里的路径是不是写成了 `assets/avatar.png`
4. 浏览器是不是还在缓存旧页面，试一下强制刷新

## 摄影整理方式

建议按这个结构继续放：

```text
photography/
  index.html
  2026/
    06.html

assets/
  photography/
    2026/
      06/
        your-photo-01.jpg
        your-photo-02.jpg
```

这样以后新增月份会很清楚，比如：

- `photography/2026/07.html`
- `assets/photography/2026/07/`

## 更新方式

每次改完内容后，在项目目录执行：

```bash
git add .
git commit -m "更新博客内容"
git push
```
