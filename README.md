#  个人导航 & 博客站

基于 **腾讯云 EdgeOne Pages** 构建的全栈个人网站，所有数据存储在 **EdgeOne KV**（绑定名 `NAV_KV`），无需数据库，零冷启动。

---

## 功能概览

| 模块 | 说明 |
|------|------|
| 导航首页 | 展示书签卡片，支持分类筛选、搜索 |
| 博客列表 | 文章列表，支持标签、分类筛选 |
| 文章详情 | `/post/:slug` 独立页面，含目录、相关文章、阅读量统计 |
| 管理后台 | `/admin` 登录后管理博客、书签、Logo、页眉背景图、密码 |
| 图片上传 | 图片以 Base64 存入 KV，通过 `/api/image/:filename` 提供访问 |
| 页眉背景图 | 支持自定义页眉背景图，留空恢复默认紫色渐变 |
| Sitemap | `/api/sitemap` 自动生成 XML 站点地图 |
| 搜索 | `/api/search?q=关键词` 全文搜索已发布文章 |
| 统计 | `/api/stats` 返回文章数、总阅读量、标签/分类分布 |

---

## 部署流程

### 第一步：Fork 仓库

1. 打开本仓库页面，点击右上角 **Fork**
2. 复制到你自己的 GitHub 账号下

> 也可以直接 Clone 后推送到你自己的新仓库，效果相同。

---

### 第二步：创建 EdgeOne Pages 项目

1. 进入 [EdgeOne Pages 控制台](https://console.cloud.tencent.com/edgeone/pages)
2. 点击「**创建项目**」→ 关联你 Fork 后的 GitHub 仓库
3. 选择 `main` 分支
4. **构建命令留空**（纯 Functions 项目，无需构建）
5. **输出目录留空**
6. 点击「**开始部署**」

---

### 第三步：创建 KV 命名空间

1. 在 EdgeOne Pages 控制台顶部切换到「**KV 存储**」标签
2. 点击「**新建命名空间**」，填写一个名称（如 `myblog`）
3. 创建完成后**无需手动添加任何键值**

> ✅ 代码中所有字段均有默认值兜底，首次访问会自动初始化：
> - `blog_posts` / `sites` 不存在时自动当空数组 `[]`
> - `admin_username` 不存在时默认 `admin`
> - `admin_password` 不存在时默认 `admin123`

---

### 第四步：绑定 KV 到项目

1. 进入刚创建的 Pages 项目 → 左侧菜单「**KV 存储**」
2. 点击「**绑定命名空间**」
3. 选择第三步创建的命名空间
4. **变量名必须填写 `NAV_KV`**（区分大小写）
5. 保存后会自动触发重新部署

> ⚠️ 变量名必须是 `NAV_KV`，代码中直接以全局变量方式访问，填错将导致所有接口报错。

---

### 第五步：修改默认密码（重要）

部署成功后，访问 `/admin`，使用默认账号登录：

- 用户名：`admin`
- 密码：`admin123`

登录后立即在后台「**修改密码**」，或直接在 KV 命名空间中手动设置：

| Key | 值 |
|-----|----|
| `admin_username` | 你的用户名 |
| `admin_password` | 你的密码 |

> ⚠️ 默认密码为公开信息，请务必修改，避免安全风险。

---

### 第六步：绑定自定义域名（可选）

1. 进入项目 → 「**域名管理**」→ 添加自定义域名
2. 按提示在 DNS 服务商处添加 CNAME 记录
3. 等待 DNS 生效后即可通过自定义域名访问

> 未绑定自定义域名时，只能通过 EdgeOne 提供的预览链接访问（链接有时效限制）。

---

## 文件结构说明

```
.
├── .edgeone/
│   └── functions.json          # 路由配置：将 URL 路径精确映射到对应 Function 文件
├── _routes.json                # 路由规则：所有路径走 Function
├── functions/
│   ├── [[catchall]].js         # 通配兜底路由：渲染首页 HTML
│   ├── index.js                # 重导出 catchall，确保 / 路径被正确处理
│   ├── _middleware.js          # 全局中间件：API 放行、登录鉴权
│   ├── admin.js                # /admin 管理后台
│   ├── logout.js               # /logout 退出登录
│   ├── post/
│   │   └── [[slug]].js         # /post/:slug 文章详情页
│   └── api/
│       ├── blog.js             # GET/POST /api/blog
│       ├── blog/
│       │   └── [[id]].js       # GET/PUT/DELETE /api/blog/:id
│       ├── config.js           # GET/POST /api/config
│       ├── config/
│       │   └── [id].js         # PUT/DELETE /api/config/:id
│       ├── change-password.js  # POST /api/change-password
│       ├── header-bg.js        # GET/POST /api/header-bg
│       ├── image/
│       │   └── [filename].js   # GET /api/image/:filename
│       ├── logo.js             # GET/POST /api/logo
│       ├── logo-link.js        # GET/POST /api/logo-link
│       ├── search.js           # GET /api/search?q=关键词
│       ├── site-info.js        # GET/POST /api/site-info（站点标题/副标题）
│       ├── sitemap.js          # GET /api/sitemap
│       ├── stats.js            # GET /api/stats
│       └── upload.js           # POST /api/upload
```

---

## KV 数据结构

| Key | 类型 | 说明 |
|-----|------|------|
| `sites` | JSON Array | 书签列表 |
| `blog_posts` | JSON Array | 文章列表 |
| `admin_username` | String | 管理后台用户名（默认 `admin`） |
| `admin_password` | String | 管理后台密码（默认 `admin123`） |
| `session:<token>` | String | 登录 Session |
| `site_title` | String | 站点标题 |
| `site_subtitle` | String | 站点副标题 |
| `site_logo` | String | 站点 Logo URL |
| `site_logo_link` | String | Logo 跳转链接 |
| `header_bg` | String | 页眉背景图 URL |
| `views:<post_id>` | String | 单篇文章阅读量 |
| `img:<filename>` | String | 上传图片的 Base64 内容 |

---

## 重要运行时规则

- ✅ `NAV_KV` 作为**全局变量**直接使用，不需要通过 `env.NAV_KV`
- ✅ 响应使用 `new Response(JSON.stringify(obj), { status, headers })` 标准写法
- ❌ `Response.json()` — EdgeOne Pages 不支持
- ❌ `next()` 参数 — 仅 `_middleware.js` 支持，普通 Function 文件不支持

---

## 注意事项

- 每日部署次数有限制（免费套餐），避免频繁触发
- 图片上传采用分块 Base64 编码，支持最大 5MB 图片
- `api/blog/[[id]].js` 和 `api/config/[id].js` 是独立路由文件，非占位符
