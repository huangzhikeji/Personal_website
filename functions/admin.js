export async function onRequest({ request, env }) {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/admin_token=([^;]+)/);
    let isLoggedIn = false;
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    if (match) {
        const session = await NAV_KV.get(`session:${match[1]}`);
        isLoggedIn = session !== null;
    }
    
    
    // 处理普通登录 POST
    if (request.method === 'POST' && pathname === '/admin') {
        const body = await request.text();
        const params = new URLSearchParams(body);
        const username = params.get('username');
        const password = params.get('password');
        
        const adminUser = await NAV_KV.get('admin_username') || 'admin';
        const adminPass = await NAV_KV.get('admin_password') || 'admin123';
        
        if (username === adminUser && password === adminPass) {
            const token = crypto.randomUUID();
            await NAV_KV.put(`session:${token}`, 'active', { expirationTtl: 86400 });
            
            // 前端跳转，保留 eo_token 参数（兼容预览域名）
            const html = '<html><head><meta charset="UTF-8"></head><body><script>(function(){' +
                'document.cookie="admin_token=' + token + ';path=/;max-age=86400";' +
                'var q=window.location.search;' +
                'window.location.replace("/admin"+(q||""));' +
                '})();<\/script></body></html>';
            return new Response(html, {
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Set-Cookie': `admin_token=${token}; Path=/; HttpOnly; Max-Age=86400`
                }
            });
        }
        return new Response('密码错误，<a href="/admin">返回</a>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    }
    
    // 未登录显示登录页
    if (!isLoggedIn) {
        return new Response(`\u003c!DOCTYPE html>
\u003chtml lang="zh-CN">
\u003chead>
    \u003cmeta charset="UTF-8">
    \u003cmeta name="viewport" content="width=device-width, initial-scale=1.0">
    \u003ctitle>管理员登录\u003c/title>
    \u003cstyle>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:system-ui,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;justify-content:center;align-items:center}
        .login-box{background:white;padding:40px;border-radius:16px;width:100%;max-width:400px}
        h2{text-align:center;margin-bottom:30px}
        .form-group{margin-bottom:20px}
        label{display:block;margin-bottom:8px;font-weight:500}
        input{width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px}
        input:focus{outline:none;border-color:#667eea}
        button{width:100%;padding:12px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px}
        button:hover{background:#5a67d8}
        .back-link{text-align:center;margin-top:20px}
        .back-link a{color:#667eea;text-decoration:none}
    \u003c/style>
\u003c/head>
\u003cbody>
    \u003cdiv class="login-box">
        \u003ch2>🔐 管理员登录\u003c/h2>
        \u003cform method="post" action="/admin">
            \u003cdiv class="form-group">
                \u003clabel>账号\u003c/label>
                \u003cinput type="text" name="username" required autofocus>
            \u003c/div>
            \u003cdiv class="form-group">
                \u003clabel>密码\u003c/label>
                \u003cinput type="password" name="password" required>
            \u003c/div>
            \u003cbutton type="submit">登录\u003c/button>
        \u003c/form>
        \u003cdiv class="back-link">\u003ca href="/">← 返回首页\u003c/a>\u003c/div>
    \u003c/div>
\u003c/body>
\u003c/html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    
    // 已登录显示完整后台
    return new Response(`\u003c!DOCTYPE html>
\u003chtml lang="zh-CN">
\u003chead>
    \u003cmeta charset="UTF-8">
    \u003cmeta name="viewport" content="width=device-width, initial-scale=1.0">
    \u003ctitle>管理后台 · 旭儿导航\u003c/title>
    \u003cstyle>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:system-ui,sans-serif;background:#f0f2f5;padding:24px}
        .container{max-width:1200px;margin:0 auto;display:flex;flex-direction:column;gap:20px}
        /* 顶部 Header */
        .header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:20px 24px;border-radius:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;box-shadow:0 4px 15px rgba(102,126,234,0.4)}
        .header h1{font-size:20px;font-weight:700;letter-spacing:0.5px}
        .header-buttons{display:flex;gap:10px;flex-wrap:wrap}
        /* 卡片通用 */
        .card{background:white;border-radius:14px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.07)}
        .card-title{font-size:15px;font-weight:700;color:#2d3748;padding-bottom:14px;margin-bottom:18px;border-bottom:2px solid #f0f2f5;display:flex;align-items:center;gap:8px}
        /* 两列网格：Logo + 添加书签 */
        .grid-top{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:20px}
        /* 表单 */
        .form-group{margin-bottom:14px}
        .form-group label{display:block;margin-bottom:5px;font-size:13px;font-weight:600;color:#4a5568}
        .form-group input,.form-group textarea{width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;transition:border-color 0.2s}
        .form-group input:focus,.form-group textarea:focus{outline:none;border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,0.1)}
        /* 按钮 */
        button{border:none;padding:9px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;transition:opacity 0.2s}
        button:hover{opacity:0.85}
        .btn-primary{background:#667eea;color:white}
        .btn-success{background:#38a169;color:white}
        .btn-danger{background:#e53e3e;color:white}
        .btn-warning{background:#ed8936;color:white}
        .btn-secondary{background:#718096;color:white}
        /* Logo 区域 */
        .logo-section{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px}
        .logo-preview{display:flex;align-items:center;gap:14px;margin-bottom:14px}
        .logo-preview img{max-width:80px;max-height:80px;width:auto;height:auto;object-fit:contain;border-radius:8px;border:1px solid #e2e8f0}
        .logo-preview span{font-size:13px;color:#718096}
        .logo-input-row{display:flex;gap:10px;align-items:center;margin-bottom:10px}
        .logo-input-row input{flex:1;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px}
        .logo-input-row input:focus{outline:none;border-color:#667eea}
        /* 博客管理卡片 */
        .blog-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
        /* 表格 */
        table{width:100%;border-collapse:collapse;font-size:13px}
        thead tr{background:#f8fafc}
        th{padding:10px 12px;text-align:left;font-weight:600;color:#4a5568;border-bottom:2px solid #e2e8f0}
        td{padding:10px 12px;border-bottom:1px solid #f0f2f5;color:#2d3748;vertical-align:middle}
        tr:last-child td{border-bottom:none}
        tr:hover td{background:#fafbff}
        .actions{display:flex;gap:6px;flex-wrap:wrap}
        /* 消息提示 */
        .message{padding:10px 14px;border-radius:8px;margin-bottom:14px;display:none;font-size:13px}
        .message.success{background:#d4edda;color:#155724}
        .message.error{background:#f8d7da;color:#721c24}
        /* 弹窗 */
        .modal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:1000;justify-content:center;align-items:center}
        .modal-content{background:white;border-radius:14px;padding:28px;width:90%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2)}
        .modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #f0f2f5}
        .modal-header h3{font-size:16px;font-weight:700;color:#2d3748}
        .close-modal{font-size:22px;cursor:pointer;color:#a0aec0;line-height:1}
        .close-modal:hover{color:#4a5568}
        .form-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid #f0f2f5}
        small{color:#a0aec0;font-size:12px}
        /* 响应式 */
        @media(max-width:640px){.grid-top{grid-template-columns:1fr}.header h1{font-size:16px}}
        /* ==================== 博客管理 ==================== */
        .blog-toolbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px}
        .blog-search-row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
        .blog-search-row input{flex:1;min-width:160px;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px}
        .blog-search-row select{width:110px;padding:9px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px}
        .blog-search-row input:focus,.blog-search-row select:focus{outline:none;border-color:#667eea}
        .status-badge{padding:2px 8px;border-radius:20px;font-size:12px;font-weight:600}
        .status-published{background:#d4edda;color:#155724}
        .status-draft{background:#fff3cd;color:#856404}
        /* 博客弹窗（宽一些，放 Quill） */
        .blog-modal-content{background:white;border-radius:14px;padding:28px;width:95%;max-width:860px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2)}
        /* Quill 编辑器 */
        #quill-editor-wrap{margin-bottom:12px}
        #quill-editor-wrap .ql-toolbar{border-radius:8px 8px 0 0;border-color:#e2e8f0}
        #quill-editor-wrap .ql-container{border-radius:0 0 8px 8px;border-color:#e2e8f0;min-height:280px;font-size:15px}
        #quill-editor-wrap .ql-editor{min-height:280px;line-height:1.7}
        #quill-editor-wrap .ql-editor img{max-width:100%;margin:8px 0}
    \u003c/style>
    \u003c!-- Quill 富文本编辑器 -->
    \u003clink href="https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.min.css" rel="stylesheet">

    \u003cscript src="https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js">\u003c/script>
\u003c/head>
\u003cbody>
\u003cdiv class="container">
    \u003cdiv class="header">
        \u003ch1>📚 旭儿导航 · 管理后台\u003c/h1>
        \u003cdiv class="header-buttons">
            \u003cbutton id="changePwdBtn" style="background:rgba(255,255,255,0.2)">🔑 修改密码\u003c/button>
            \u003cbutton id="logoutBtn" style="background:rgba(255,255,255,0.2)">退出登录\u003c/button>
        \u003c/div>
    \u003c/div>
    
    \u003c!-- 博客管理（全宽） -->
    \u003cdiv class="card">
        \u003cdiv class="card-title">📝 博客管理\u003c/div>
        \u003cdiv class="blog-toolbar">
            \u003cdiv class="blog-search-row" style="flex:1;margin-bottom:0">
                \u003cinput type="text" id="blogSearchInput" placeholder="🔍 搜索文章...">
                \u003cselect id="blogStatusFilter">\u003coption value="all">全部\u003c/option>\u003coption value="published">已发布\u003c/option>\u003coption value="draft">草稿\u003c/option>\u003c/select>
            \u003c/div>
            \u003cbutton id="newPostBtn" class="btn-success" style="white-space:nowrap">✏️ 写新文章\u003c/button>
        \u003c/div>
        \u003cdiv id="blogList">\u003c/div>
    \u003c/div>

    \u003c!-- 书签列表（全宽） -->
    \u003cdiv class="card">
        \u003cdiv class="card-title">📋 书签列表\u003c/div>
        \u003cdiv id="message" class="message">\u003c/div>
        \u003cdiv style="overflow-x:auto">
            \u003ctable>
                \u003cthead>\u003ctr>\u003cth>ID\u003c/th>\u003cth>名称\u003c/th>\u003cth>网址\u003c/th>\u003cth>分类\u003c/th>\u003cth>排序\u003c/th>\u003cth>操作\u003c/th>\u003c/tr>\u003c/thead>
                \u003ctbody id="sitesList">\u003c/tbody>
            \u003c/table>
        \u003c/div>
    \u003c/div>
\u003c/div>

    \u003c!-- Logo 设置 + 添加书签（两列） -->
    \u003cdiv class="grid-top">

        \u003c!-- Logo 设置卡片 -->
        \u003cdiv class="card">
            \u003cdiv class="card-title">🖼️ Logo 设置\u003c/div>
            \u003cdiv class="logo-section">
                \u003cdiv class="logo-preview">
                    \u003cimg id="logoPreview" style="display:none">
                    \u003cspan id="noLogoHint">暂未设置 Logo\u003c/span>
                \u003c/div>
                \u003cdiv class="logo-input-row">
                    \u003cinput type="text" id="logoInput" placeholder="Logo 图片 URL（或点击上传）">
                    \u003cbutton id="uploadLogoBtn" class="btn-warning" title="上传本地图片">📁 上传\u003c/button>
                    \u003cbutton id="saveLogoBtn" class="btn-success">保存\u003c/button>
                    \u003cbutton id="deleteLogoBtn" class="btn-danger" title="清除 Logo" style="background:#e53e3e">🗑️ 删除\u003c/button>
                \u003c/div>
                \u003cinput type="file" id="logoFileInput" accept="image/*" style="display:none">
                \u003cdiv class="logo-input-row">
                    \u003cinput type="text" id="logoLinkInput" placeholder="Logo 点击跳转链接（可留空）">
                    \u003cbutton id="saveLogoLinkBtn" class="btn-success">保存\u003c/button>
                \u003c/div>
            \u003c/div>
            \u003cdiv style="margin-top:18px;padding-top:16px;border-top:1px solid #e2e8f0">
                \u003cdiv style="font-size:13px;font-weight:600;color:#4a5568;margin-bottom:10px">🖼️ 页眉背景图\u003c/div>
                \u003cdiv id="headerBgPreviewWrap" style="display:none;margin-bottom:10px">
                    \u003cimg id="headerBgPreview" style="width:100%;max-height:100px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0">
                \u003c/div>
                \u003cdiv class="logo-input-row">
                    \u003cinput type="text" id="headerBgInput" placeholder="背景图 URL（留空恢复默认渐变）">
                    \u003cbutton id="uploadHeaderBgBtn" class="btn-warning" title="上传本地图片">📁 上传\u003c/button>
                    \u003cbutton id="saveHeaderBgBtn" class="btn-success">保存\u003c/button>
                \u003c/div>
                \u003cinput type="file" id="headerBgFileInput" accept="image/*" style="display:none">
                \u003csmall style="color:#a0aec0">留空并保存可恢复默认紫色渐变背景\u003c/small>
            \u003c/div>
        \u003c/div>


        \u003c!-- 站点信息 -->
        \u003cdiv class="card">
            \u003cdiv class="card-title">🌐 站点信息\u003c/div>
            \u003cdiv class="form-group">
                \u003clabel for="siteTitleInput">站点标题\u003c/label>
                \u003cinput type="text" id="siteTitleInput" placeholder="旭儿导航" maxlength="50">
            \u003c/div>
            \u003cdiv class="form-group">
                \u003clabel for="siteSubtitleInput">站点副标题\u003c/label>
                \u003cinput type="text" id="siteSubtitleInput" placeholder="精选网站 · 优质博客" maxlength="100">
            \u003c/div>
            \u003cbutton id="saveSiteInfoBtn" class="btn-primary">💾 保存站点信息\u003c/button>
            \u003cspan id="siteInfoStatus" style="margin-left:10px;font-size:13px;">\u003c/span>
        \u003c/div>
        \u003c!-- 添加书签卡片 -->
        \u003cdiv class="card">
            \u003cdiv class="card-title">➕ 添加书签\u003c/div>
            \u003cform id="addForm">
                \u003cdiv class="form-group">\u003clabel>名称 *\u003c/label>\u003cinput type="text" id="name" required placeholder="网站名称">\u003c/div>
                \u003cdiv class="form-group">\u003clabel>网址 *\u003c/label>\u003cinput type="url" id="url" required placeholder="https://">\u003c/div>
                \u003cdiv class="form-group">\u003clabel>分类 *\u003c/label>\u003cinput type="text" id="catelog" required placeholder="如：工具、设计">\u003c/div>
                \u003cdiv class="form-group">\u003clabel>Logo URL\u003c/label>\u003cinput type="url" id="logo" placeholder="https://">\u003c/div>
                \u003cdiv class="form-group">\u003clabel>描述\u003c/label>\u003ctextarea id="desc" rows="2" placeholder="简短描述（可选）">\u003c/textarea>\u003c/div>
                \u003cdiv class="form-group">\u003clabel>排序\u003c/label>\u003cinput type="number" id="sort_order" value="9999">\u003c/div>
                \u003cbutton type="submit" class="btn-success" style="width:100%;margin-top:4px">➕ 添加书签\u003c/button>
            \u003c/form>
        \u003c/div>

    \u003c/div>


\u003c!-- 写/编辑文章弹窗 -->
\u003cdiv id="postModal" class="modal">
    \u003cdiv class="blog-modal-content">
        \u003cdiv class="modal-header">\u003ch3 id="postModalTitle">写新文章\u003c/h3>\u003cspan class="close-post-modal" style="font-size:22px;cursor:pointer;color:#a0aec0">&times;\u003c/span>\u003c/div>
        \u003cinput type="hidden" id="postId">
        \u003cdiv class="form-group">\u003clabel>标题 *\u003c/label>\u003cinput type="text" id="postTitle" placeholder="文章标题">\u003c/div>
        \u003cdiv style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            \u003cdiv class="form-group">\u003clabel>分类\u003c/label>\u003cinput type="text" id="postCategory" placeholder="未分类">\u003c/div>
            \u003cdiv class="form-group">\u003clabel>状态\u003c/label>\u003cselect id="postStatus">\u003coption value="published">发布\u003c/option>\u003coption value="draft">草稿\u003c/option>\u003c/select>\u003c/div>
        \u003c/div>
        \u003cdiv class="form-group">\u003clabel>封面图 URL\u003c/label>\u003cinput type="url" id="postCoverImage" placeholder="https://...">\u003c/div>
        \u003cdiv class="form-group">\u003clabel>摘要\u003c/label>\u003ctextarea id="postExcerpt" rows="2" placeholder="可选">\u003c/textarea>\u003c/div>
        \u003cdiv class="form-group">\u003clabel>内容 *\u003c/label>\u003c/div>
        \u003cdiv id="quill-editor-wrap">\u003cdiv id="quill-editor">\u003c/div>\u003c/div>
        \u003ctextarea id="postContent" style="display:none">\u003c/textarea>
        \u003cdiv class="form-group">\u003clabel>标签\u003c/label>\u003cinput type="text" id="postTags" placeholder="技术,生活">\u003c/div>
        \u003cdiv class="form-actions">
            \u003cbutton type="button" id="cancelPostBtn" class="btn-secondary">取消\u003c/button>
            \u003cbutton type="button" id="savePostBtn" class="btn-success">保存\u003c/button>
        \u003c/div>
    \u003c/div>
\u003c/div>

\u003cinput type="file" id="blogFileInput" accept="image/*" style="display:none">

\u003c!-- 编辑书签弹窗 -->
\u003cdiv id="editModal" class="modal">
    \u003cdiv class="modal-content">
        \u003cdiv class="modal-header">\u003ch3>✏️ 编辑书签\u003c/h3>\u003cspan class="close-modal">&times;\u003c/span>\u003c/div>
        \u003cform id="editForm">
            \u003cinput type="hidden" id="edit_id">
            \u003cdiv class="form-group">\u003clabel>名称 *\u003c/label>\u003cinput type="text" id="edit_name" required>\u003c/div>
            \u003cdiv class="form-group">\u003clabel>网址 *\u003c/label>\u003cinput type="url" id="edit_url" required>\u003c/div>
            \u003cdiv class="form-group">\u003clabel>分类 *\u003c/label>\u003cinput type="text" id="edit_catelog" required>\u003c/div>
            \u003cdiv class="form-group">\u003clabel>Logo URL\u003c/label>\u003cinput type="url" id="edit_logo">\u003c/div>
            \u003cdiv class="form-group">\u003clabel>描述\u003c/label>\u003ctextarea id="edit_desc" rows="2">\u003c/textarea>\u003c/div>
            \u003cdiv class="form-group">\u003clabel>排序\u003c/label>\u003cinput type="number" id="edit_sort_order" value="9999">\u003c/div>
            \u003cdiv class="form-actions">\u003cbutton type="button" class="close-modal-btn" style="background:#a0aec0">取消\u003c/button>\u003cbutton type="submit" class="btn-success">保存修改\u003c/button>\u003c/div>
        \u003c/form>
    \u003c/div>
\u003c/div>

\u003c!-- 修改密码弹窗 -->
\u003cdiv id="changePwdModal" class="modal">
    \u003cdiv class="modal-content">
        \u003cdiv class="modal-header">\u003ch3>🔑 修改密码\u003c/h3>\u003cspan class="close-pwd-modal">&times;\u003c/span>\u003c/div>
        \u003cform id="changePwdForm">
            \u003cdiv class="form-group">\u003clabel>原密码 *\u003c/label>\u003cinput type="password" id="old_password" required>\u003c/div>
            \u003cdiv class="form-group">\u003clabel>新密码 *\u003c/label>\u003cinput type="password" id="new_password" required>\u003c/div>
            \u003cdiv class="form-group">\u003clabel>确认新密码 *\u003c/label>\u003cinput type="password" id="confirm_password" required>\u003c/div>
            \u003cdiv class="form-actions">\u003cbutton type="button" class="close-pwd-btn" style="background:#a0aec0">取消\u003c/button>\u003cbutton type="submit" class="btn-success">确认修改\u003c/button>\u003c/div>
        \u003c/form>
    \u003c/div>
\u003c/div>

\u003cscript>
    // ==================== 通用函数 ====================
    function showMessage(msg, type) {
        const msgDiv = document.getElementById('message');
        msgDiv.textContent = msg;
        msgDiv.className = 'message ' + type;
        msgDiv.style.display = 'block';
        setTimeout(() => msgDiv.style.display = 'none', 3000);
    }
    
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    
    // ==================== Logo 管理 ====================
    async function loadLogo() {
        const res = await fetch('/api/logo');
        const data = await res.json();
        if (data.code === 200 && data.logo) {
            document.getElementById('logoPreview').src = data.logo;
            document.getElementById('logoPreview').style.display = 'block';
            document.getElementById('noLogoHint').style.display = 'none';
        }
    }
    
    async function loadLogoLink() {
        const res = await fetch('/api/logo-link');
        const data = await res.json();
        if (data.code === 200 && data.link) {
            document.getElementById('logoLinkInput').value = data.link;
        }
    }
    
    // ==================== 页眉背景管理 ====================
    async function loadHeaderBg() {
        const res = await fetch('/api/header-bg');
        const data = await res.json();
        if (data.code === 200 && data.bg) {
            document.getElementById('headerBgInput').value = data.bg;
            document.getElementById('headerBgPreview').src = data.bg;
            document.getElementById('headerBgPreviewWrap').style.display = 'block';
        }
    }

    document.getElementById('uploadHeaderBgBtn').onclick = () => document.getElementById('headerBgFileInput').click();
    document.getElementById('headerBgFileInput').onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const fd = new FormData();
        fd.append('image', f);
        const r = await fetch('/api/upload', { method: 'POST', body: fd });
        const d = await r.json();
        if (d.code === 200) {
            document.getElementById('headerBgInput').value = d.url;
            document.getElementById('headerBgPreview').src = d.url;
            document.getElementById('headerBgPreviewWrap').style.display = 'block';
            showMessage('图片已上传，请点击保存', 'success');
        } else { showMessage('上传失败', 'error'); }
        e.target.value = '';
    };

    document.getElementById('saveHeaderBgBtn').onclick = async () => {
        const bg = document.getElementById('headerBgInput').value.trim();
        const res = await fetch('/api/header-bg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bg })
        });
        const data = await res.json();
        if (data.code === 200) {
            showMessage(bg ? '背景图保存成功' : '已恢复默认背景', 'success');
            if (bg) {
                document.getElementById('headerBgPreview').src = bg;
                document.getElementById('headerBgPreviewWrap').style.display = 'block';
            } else {
                document.getElementById('headerBgPreviewWrap').style.display = 'none';
            }
        } else { showMessage('保存失败', 'error'); }
    };

    // Logo 本地上传
    document.getElementById('uploadLogoBtn').onclick = () => document.getElementById('logoFileInput').click();
    document.getElementById('logoFileInput').onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const fd = new FormData();
        fd.append('image', f);
        const r = await fetch('/api/upload', { method: 'POST', body: fd });
        const d = await r.json();
        if (d.code === 200) {
            document.getElementById('logoInput').value = d.url;
            document.getElementById('logoPreview').src = d.url;
            document.getElementById('logoPreview').style.display = 'block';
            document.getElementById('noLogoHint').style.display = 'none';
            showMessage('图片已上传，请点击保存', 'success');
        } else { showMessage('上传失败', 'error'); }
        e.target.value = '';
    };

    document.getElementById('saveLogoBtn').onclick = async () => {
        const logoUrl = document.getElementById('logoInput').value.trim();
        const res = await fetch('/api/logo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logo: logoUrl }) });
        const data = await res.json();
        if (data.code === 200) {
            showMessage('Logo保存成功', 'success');
            if (logoUrl) {
                document.getElementById('logoPreview').src = logoUrl;
                document.getElementById('logoPreview').style.display = 'block';
                document.getElementById('noLogoHint').style.display = 'none';
            } else {
                document.getElementById('logoPreview').style.display = 'none';
                document.getElementById('noLogoHint').style.display = 'inline';
            }
        } else { showMessage('保存失败', 'error'); }
    };
    
    document.getElementById('deleteLogoBtn').onclick = async () => {
        if (!confirm('确定要删除 Logo 吗？')) return;
        document.getElementById('logoInput').value = '';
        const res = await fetch('/api/logo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logo: '' }) });
        const data = await res.json();
        if (data.code === 200) {
            document.getElementById('logoPreview').style.display = 'none';
            document.getElementById('noLogoHint').style.display = 'inline';
            showMessage('Logo 已删除', 'success');
        } else { showMessage('删除失败', 'error'); }
    };
    
    document.getElementById('saveLogoLinkBtn').onclick = async () => {
        const linkUrl = document.getElementById('logoLinkInput').value.trim();
        const res = await fetch('/api/logo-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ link: linkUrl }) });
        const data = await res.json();
        if (data.code === 200) { showMessage('链接保存成功', 'success'); }
        else { showMessage('保存失败', 'error'); }
    };
    
    // ==================== 书签管理 ====================
    async function loadSites() {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data.code === 200) {
            const tbody = document.getElementById('sitesList');
            tbody.innerHTML = '';
            data.data.forEach(site => {
                const row = tbody.insertRow();
                row.insertCell(0).textContent = site.id;
                row.insertCell(1).innerHTML = '\u003cstrong>' + escapeHtml(site.name) + '\u003c/strong>';
                row.insertCell(2).innerHTML = '\u003ca href="' + site.url + '" target="_blank">' + (site.url || '').substring(0,40) + '\u003c/a>';
                row.insertCell(3).innerHTML = '\u003cspan style="background:#e2e8f0;padding:2px 8px;border-radius:4px">' + escapeHtml(site.catelog) + '\u003c/span>';
                row.insertCell(4).textContent = site.sort_order === 9999 ? '默认' : site.sort_order;
                const actions = row.insertCell(5);
                actions.className = 'actions';
                const editBtn = document.createElement('button');
                editBtn.textContent = '编辑';
                editBtn.className = 'btn-warning';
                editBtn.onclick = () => openEditModal(site);
                actions.appendChild(editBtn);
                const delBtn = document.createElement('button');
                delBtn.textContent = '删除';
                delBtn.className = 'btn-danger';
                delBtn.onclick = () => deleteSite(site.id);
                actions.appendChild(delBtn);
            });
        }
    }
    
    function openEditModal(site) {
        document.getElementById('edit_id').value = site.id;
        document.getElementById('edit_name').value = site.name || '';
        document.getElementById('edit_url').value = site.url || '';
        document.getElementById('edit_catelog').value = site.catelog || '';
        document.getElementById('edit_logo').value = site.logo || '';
        document.getElementById('edit_desc').value = site.desc || '';
        document.getElementById('edit_sort_order').value = site.sort_order || 9999;
        document.getElementById('editModal').style.display = 'flex';
    }
    
    function closeModal() { document.getElementById('editModal').style.display = 'none'; }
    
    async function deleteSite(id) {
        if (!confirm('确定删除？')) return;
        const res = await fetch('/api/config/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.code === 200) { showMessage('删除成功', 'success'); loadSites(); }
        else showMessage('删除失败', 'error');
    }
    
    document.getElementById('addForm').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('name').value.trim(),
            url: document.getElementById('url').value.trim(),
            catelog: document.getElementById('catelog').value.trim(),
            logo: document.getElementById('logo').value.trim(),
            desc: document.getElementById('desc').value.trim(),
            sort_order: parseInt(document.getElementById('sort_order').value) || 9999
        };
        if (!data.name || !data.url || !data.catelog) { showMessage('请填写完整', 'error'); return; }
        const res = await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const result = await res.json();
        if (result.code === 201) { showMessage('添加成功', 'success'); document.getElementById('addForm').reset(); document.getElementById('sort_order').value = '9999'; loadSites(); }
        else showMessage('添加失败', 'error');
    };
    
    document.getElementById('editForm').onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit_id').value;
        const data = {
            name: document.getElementById('edit_name').value.trim(),
            url: document.getElementById('edit_url').value.trim(),
            catelog: document.getElementById('edit_catelog').value.trim(),
            logo: document.getElementById('edit_logo').value.trim(),
            desc: document.getElementById('edit_desc').value.trim(),
            sort_order: parseInt(document.getElementById('edit_sort_order').value) || 9999
        };
        if (!data.name || !data.url || !data.catelog) { showMessage('请填写完整', 'error'); return; }
        const res = await fetch('/api/config/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const result = await res.json();
        if (result.code === 200) { showMessage('修改成功', 'success'); closeModal(); loadSites(); }
        else showMessage('修改失败', 'error');
    };
    
    
    // ==================== 退出登录 ====================
    document.getElementById('logoutBtn').onclick = async () => {
        await fetch('/logout', { method: 'POST' });
        window.location.href = '/';
    };
    
    // ==================== 修改密码 ====================
    const changePwdModal = document.getElementById('changePwdModal');
    function openChangePwdModal() { changePwdModal.style.display = 'flex'; }
    function closeChangePwdModal() { changePwdModal.style.display = 'none'; }
    
    document.getElementById('changePwdBtn').onclick = openChangePwdModal;
    document.querySelector('.close-pwd-modal').onclick = closeChangePwdModal;
    document.querySelector('.close-pwd-btn').onclick = closeChangePwdModal;
    
    document.getElementById('changePwdForm').onsubmit = async (e) => {
        e.preventDefault();
        const oldPassword = document.getElementById('old_password').value;
        const newPassword = document.getElementById('new_password').value;
        const confirmPassword = document.getElementById('confirm_password').value;
        if (newPassword !== confirmPassword) { showMessage('两次输入的新密码不一致', 'error'); return; }
        if (newPassword.length < 4) { showMessage('新密码长度至少4位', 'error'); return; }
        const res = await fetch('/api/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
        });
        const data = await res.json();
        if (data.code === 200) {
            showMessage('密码修改成功，请重新登录', 'success');
            setTimeout(() => { window.location.href = '/logout'; }, 1500);
        } else {
            showMessage(data.message || '修改失败', 'error');
        }
    };
    
    // ==================== 弹窗关闭 ====================
    window.onclick = (e) => {
        if (e.target === document.getElementById('editModal')) closeModal();
        if (e.target === changePwdModal) closeChangePwdModal();
    };
    document.querySelector('.close-modal').onclick = closeModal;
    document.querySelector('.close-modal-btn').onclick = closeModal;
    
    // ==================== 初始化加载 ====================
    loadLogo();
    loadSiteInfo();
    loadLogoLink();
    loadHeaderBg();
    loadSites();
    loadBlogPosts();

    // ==================== 博客管理 ====================
    let allPosts = [];

    // 初始化 Quill（懒加载，弹窗打开时才初始化）
    let quill = null;
    function initQuill() {
        if (quill) return;
        quill = new Quill('#quill-editor', {
            theme: 'snow',
            placeholder: '在这里写下你的文章内容...',
            modules: {
                toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ color: [] }, { background: [] }],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['blockquote', 'code-block'],
                    ['link', 'image'],
                    [{ align: [] }],
                    ['clean']
                ]
            }
        });
        quill.getModule('toolbar').addHandler('image', () => {
            document.getElementById('blogFileInput').click();
        });
        // 自定义 link handler：避免 Quill 内置 tooltip 在 modal 中定位失效
        quill.getModule('toolbar').addHandler('link', function() {
            const range = quill.getSelection();
            if (!range || range.length === 0) {
                alert('请先选中要添加链接的文字');
                return;
            }
            // 检查选中文字是否已有链接
            const format = quill.getFormat(range);
            const existingUrl = format.link || '';
            const url = prompt('请输入链接地址：', existingUrl);
            if (url === null) return; // 用户取消
            if (url.trim() === '') {
                quill.format('link', false); // 移除链接
            } else {
                // 自动补全协议头
                const finalUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : 'https://' + url.trim();
                quill.format('link', finalUrl);
            }
        });
        document.getElementById('blogFileInput').onchange = async (e) => {
            const f = e.target.files[0];
            if (!f) return;
            const fd = new FormData();
            fd.append('image', f);
            const r = await fetch('/api/upload', { method: 'POST', body: fd });
            const d = await r.json();
            if (d.code === 200) {
                const range = quill.getSelection(true);
                quill.insertEmbed(range.index, 'image', d.url);
                quill.setSelection(range.index + 1);
            } else { alert('上传失败'); }
            e.target.value = '';
        };
        quill.on('text-change', () => {
            document.getElementById('postContent').value = quill.root.innerHTML;
        });
    }

    async function loadBlogPosts() {
        const r = await fetch('/api/blog');
        const d = await r.json();
        if (d.code === 200) { allPosts = d.data || []; renderBlogList(); }
    }

    function renderBlogList() {
        const s = document.getElementById('blogSearchInput').value.toLowerCase();
        const f = document.getElementById('blogStatusFilter').value;
        const fl = allPosts.filter(p => (f === 'all' || p.status === f) && (!s || p.title.toLowerCase().includes(s)));
        fl.sort((a, b) => b.id - a.id);
        if (!fl.length) { document.getElementById('blogList').innerHTML = '<p style="color:#a0aec0;padding:20px 0">暂无文章</p>'; return; }
        let h = '<table><thead><tr><th>ID</th><th>标题</th><th>分类</th><th>状态</th><th>日期</th><th>操作</th></tr></thead><tbody>';
        fl.forEach(p => {
            const badge = p.status === 'published'
                ? '<span class="status-badge status-published">已发布</span>'
                : '<span class="status-badge status-draft">草稿</span>';
            const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString('zh-CN') : '-';
            h += '<tr><td>' + p.id + '</td><td><strong>' + escapeHtml(p.title) + '</strong></td><td>' + escapeHtml(p.category || '未分类') + '</td><td>' + badge + '</td><td>' + date + '</td><td class="actions"><button class="btn-warning blog-edit" data-id="' + p.id + '">编辑</button><button class="btn-danger blog-del" data-id="' + p.id + '">删除</button></td></tr>';
        });
        h += '</tbody></table>';
        document.getElementById('blogList').innerHTML = h;
        document.querySelectorAll('.blog-edit').forEach(b => b.onclick = () => openPostModal(b.dataset.id));
        document.querySelectorAll('.blog-del').forEach(b => b.onclick = () => deleteBlogPost(b.dataset.id));
    }

    function openPostModal(id) {
        initQuill();
        const modal = document.getElementById('postModal');
        if (id) {
            const p = allPosts.find(x => x.id == id);
            if (!p) return;
            document.getElementById('postId').value = p.id;
            document.getElementById('postTitle').value = p.title;
            document.getElementById('postCategory').value = p.category || '';
            document.getElementById('postCoverImage').value = p.coverImage || '';
            document.getElementById('postExcerpt').value = p.excerpt || '';
            document.getElementById('postStatus').value = p.status || 'published';
            document.getElementById('postTags').value = (p.tags || []).join(',');
            quill.root.innerHTML = p.content || '';
            document.getElementById('postContent').value = quill.root.innerHTML;
            document.getElementById('postModalTitle').innerText = '编辑文章';
        } else {
            document.getElementById('postId').value = '';
            document.getElementById('postTitle').value = '';
            document.getElementById('postCategory').value = '';
            document.getElementById('postCoverImage').value = '';
            document.getElementById('postExcerpt').value = '';
            document.getElementById('postStatus').value = 'published';
            document.getElementById('postTags').value = '';
            quill.root.innerHTML = '';
            document.getElementById('postContent').value = '';
            document.getElementById('postModalTitle').innerText = '写新文章';
        }
        modal.style.display = 'flex';
    }

    function closePostModal() { document.getElementById('postModal').style.display = 'none'; }

    async function deleteBlogPost(id) {
        if (!confirm('确定删除这篇文章？')) return;
        await fetch('/api/blog/' + id, { method: 'DELETE' });
        loadBlogPosts();
    }

    document.getElementById('newPostBtn').onclick = () => openPostModal(null);
    document.getElementById('cancelPostBtn').onclick = closePostModal;
    document.querySelector('.close-post-modal').onclick = closePostModal;

    document.getElementById('savePostBtn').onclick = async () => {
        if (quill) document.getElementById('postContent').value = quill.root.innerHTML;
        const id = document.getElementById('postId').value;
        const data = {
            title: document.getElementById('postTitle').value.trim(),
            category: document.getElementById('postCategory').value.trim(),
            coverImage: document.getElementById('postCoverImage').value.trim(),
            excerpt: document.getElementById('postExcerpt').value.trim(),
            content: document.getElementById('postContent').value,
            status: document.getElementById('postStatus').value,
            tags: document.getElementById('postTags').value.split(',').map(t => t.trim()).filter(t => t)
        };
        if (!data.title || !data.content || data.content === '<p><br></p>') { alert('请填写标题和内容'); return; }
        const url = id ? '/api/blog/' + id : '/api/blog';
        const method = id ? 'PUT' : 'POST';
        const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const d = await r.json();
        if (d.code === 200 || d.code === 201) {
            alert(id ? '更新成功' : '发布成功');
            closePostModal();
            loadBlogPosts();
        } else { alert('操作失败'); }
    };

    document.getElementById('blogSearchInput').addEventListener('input', renderBlogList);
    document.getElementById('blogStatusFilter').addEventListener('change', renderBlogList);

    // 点击弹窗背景关闭
    document.getElementById('postModal').addEventListener('click', e => {
        if (e.target === document.getElementById('postModal')) closePostModal();
    });

    // ==================== 站点信息 ====================
    async function loadSiteInfo() {
        try {
            const res = await fetch('/api/site-info');
            const data = await res.json();
            document.getElementById('siteTitleInput').value    = data.title    || '';
            document.getElementById('siteSubtitleInput').value = data.subtitle || '';
        } catch (e) {
            console.error('加载站点信息失败', e);
        }
    }

    document.getElementById('saveSiteInfoBtn').addEventListener('click', async () => {
        const btn    = document.getElementById('saveSiteInfoBtn');
        const status = document.getElementById('siteInfoStatus');
        const title    = document.getElementById('siteTitleInput').value.trim();
        const subtitle = document.getElementById('siteSubtitleInput').value.trim();
        btn.disabled = true;
        status.textContent = '保存中…';
        try {
            const res = await fetch('/api/site-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, subtitle })
            });
            const data = await res.json();
            if (data.success) {
                status.style.color = '#4caf50';
                status.textContent = '✅ 保存成功';
            } else {
                status.style.color = '#f44336';
                status.textContent = '❌ ' + (data.error || '保存失败');
            }
        } catch (e) {
            status.style.color = '#f44336';
            status.textContent = '❌ 网络错误';
        } finally {
            btn.disabled = false;
            setTimeout(() => { status.textContent = ''; }, 3000);
        }
    });

\u003c/script>
\u003c/body>
\u003c/html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

