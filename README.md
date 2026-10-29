# 个人网站 · 内容管理后台

一个纯前端的「个人网站 CMS」，用来在线修改 [个人网站](https://yedeng-yzm.github.io/portfolio/) 的内容。

**原理**：个人网站的内容全部存在 `portfolio` 仓库的 `data.js` 里。本后台通过 **GitHub Contents API** 读取 / 修改这个文件，保存即提交，个人网站自动更新。

- 无后端、无服务器，纯静态，跑在 GitHub Pages 上
- 首次填入 GitHub Token 后自动记住，之后打开直接进入，可编辑：基本资料、技能、项目、博客
- Token 只存在你自己的浏览器 localStorage，不上传任何第三方

---

## 一、准备 GitHub Token（一次性）

后台需要一个「细粒度 Personal Access Token (PAT)」，只授权 `portfolio` 仓库的读写。

1. 打开 <https://github.com/settings/personal-access-tokens/new>
2. 填：
   - **Token name**：随便，比如 `portfolio-cms`
   - **Expiration**：建议 90 天或自定义（过期后重新生成一个即可）
   - **Repository access**：选 **Only select repositories** → 勾选 `Yedeng-yzm/portfolio`
   - **Permissions** → Repository permissions → 找到 **Contents**，设为 **Read and write**
3. 点底部 **Generate token**，复制生成的 `github_pat_...` 开头的那串（只显示一次，记得存好）

> 这个 Token 就是后台的「钥匙」。首次打开管理站时填进去即可，它会存在你自己的浏览器里，请勿发给别人。

---

## 二、部署到 GitHub Pages

1. 在 GitHub 新建一个**公开**仓库，命名建议 `portfolio-admin`
   - 不勾选 README（本地已有内容）
2. 本地执行：

```bash
cd portfolio-admin
git init
git add .
git commit -m "init: 个人网站内容管理后台"
git branch -M main
git remote add origin https://github.com/Yedeng-yzm/portfolio-admin.git
git push -u origin main
```

3. 打开仓库 **Settings → Pages**：
   - **Source** 选 **Deploy from a branch**
   - **Branch** 选 `main`，目录 `/ (root)`，保存
4. 等 1 分钟左右，访问 <https://yedeng-yzm.github.io/portfolio-admin/> 即可

---

## 三、使用

1. 首次打开后台地址，填一次 **GitHub Token**，点「进入」（之后会自动记住、直接进入）
2. 会自动从 GitHub 读取当前 `data.js`
3. 在四个标签页里改内容，点 **保存并发布**
4. 个人网站约 1 分钟内自动更新（GitHub Pages 需要一点构建时间）

---

## 四、常见问题

**换 Token**：在后台右上角点「退出」，重新填一次新 Token；或清除该网站的浏览器 localStorage。

**保存时报 403 / 401**：Token 没给 `Contents: Read and write` 权限，或没选对仓库，或已过期。

**保存时报 409（sha 冲突）**：本地内容落后了，点一次「从 GitHub 读取」再保存。

**改了没生效**：GitHub Pages 缓存，一般 1 分钟内刷新；可强制刷新（Ctrl+F5）。
