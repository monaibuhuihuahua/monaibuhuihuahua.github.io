# 个人博客 — 干净极简风格

一个可直接部署到 GitHub Pages 的静态博客原型。

## 风格方向

干净极简，类似 Medium / Notion 的阅读体验：
- 白底、大量留白
- 黑白色为主，蓝色作为点缀
- 系统字体栈，强调可读性
- 无装饰性元素，突出内容本身

## 当前栏目

- 生活感悟
- 算法题
- 生活摄影

## 部署方式

1. 新建 GitHub 仓库 `username.github.io`
2. 把 `index.html` 和 `styles.css` 上传到仓库根目录
3. 在仓库 `Settings -> Pages` 中，Source 选择 `Deploy from a branch`，分支选 `main`，目录选 `/ (root)`
4. 保存后等待一两分钟，访问 `https://username.github.io`

## 后续扩展

- 第一阶段：用静态页面上线，跑通部署流程
- 第二阶段：按栏目补充真实文章和摄影内容
- 第三阶段：内容增多后迁移到 Astro、Hugo 等静态生成器
