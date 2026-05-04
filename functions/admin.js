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
    
    function generateToken() {
        return crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).substring(2);
    }
    
    if (request.method === 'POST' && pathname === '/admin') {
        const body = await request.text();
        const params = new URLSearchParams(body);
        const username = params.get('username');
        const password = params.get('password');
        
        const adminUser = await NAV_KV.get('admin_username') || 'admin';
        const adminPass = await NAV_KV.get('admin_password') || 'admin123';
        
        if (username === adminUser && password === adminPass) {
            const token = generateToken();
            await NAV_KV.put(`session:${token}`, 'active', { expirationTtl: 86400 });
            
            const html = '<html><head><meta charset="UTF-8"></head><body><script>' +
                'document.cookie="admin_token=' + token + ';path=/;max-age=86400";' +
                'window.location.replace("/admin");' +
                '</script></body></html>';
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
    
    if (!isLoggedIn) {
        return new Response(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理员登录</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:system-ui,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;justify-content:center;align-items:center}
        .login-box{background:white;padding:40px;border-radius:16px;width:100%;max-width:400px}
        h2{text-align:center;margin-bottom:30px}
        .form-group{margin-bottom:20px}
        label{display:block;margin-bottom:8px;font-weight:500}
        input{width:100%;padding:12px;border:1px solid #ddd;border-radius:8px}
        input:focus{outline:none;border-color:#667eea}
        button{width:100%;padding:12px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px}
        button:hover{background:#5a67d8}
        .back-link{text-align:center;margin-top:20px}
        .back-link a{color:#667eea;text-decoration:none}
    </style>
</head>
<body>
    <div class="login-box">
        <h2>🔐 管理员登录</h2>
        <form method="post" action="/admin">
            <div class="form-group">
                <label>账号</label>
                <input type="text" name="username" required autofocus>
            </div>
            <div class="form-group">
                <label>密码</label>
                <input type="password" name="password" required>
            </div>
            <button type="submit">登录</button>
        </form>
        <div class="back-link"><a href="/">← 返回首页</a></div>
    </div>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    
    // 已登录显示完整后台
    return new Response(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理后台 · 旭儿导航</title>
    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
    <script src="https://cdn.quilljs.com/1.3.6/quill.js"></script>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:system-ui,sans-serif;background:#f0f2f5;padding:24px}
        .container{max-width:1200px;margin:0 auto;display:flex;flex-direction:column;gap:20px}
        .header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:20px 24px;border-radius:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;box-shadow:0 4px 15px rgba(102,126,234,0.4)}
        .card{background:white;border-radius:14px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.07)}
        .card-title{font-size:15px;font-weight:700;color:#2d3748;padding-bottom:14px;margin-bottom:18px;border-bottom:2px solid #f0f2f5;display:flex;align-items:center;gap:8px}
        .grid-top{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:20px}
        .form-group{margin-bottom:14px}
        .form-group label{display:block;margin-bottom:5px;font-size:13px;font-weight:600;color:#4a5568}
        .form-group input,.form-group textarea{width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;transition:border-color 0.2s}
        .form-group input:focus,.form-group textarea:focus{outline:none;border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,0.1)}
        button{border:none;padding:9px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;transition:opacity 0.2s}
        button:hover{opacity:0.85}
        .btn-primary{background:#667eea;color:white}
        .btn-success{background:#38a169;color:white}
        .btn-danger{background:#e53e3e;color:white}
        .btn-warning{background:#ed8936;color:white}
        .btn-secondary{background:#718096;color:white}
        .logo-section{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px}
        .logo-preview{display:flex;align-items:center;gap:14px;margin-bottom:14px}
        .logo-preview img{max-width:80px;max-height:80px;width:auto;height:auto;object-fit:contain;border-radius:8px;border:1px solid #e2e8f0}
        .logo-input-row{display:flex;gap:10px;align-items:center;margin-bottom:10px}
        .logo-input-row input{flex:1;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        thead tr{background:#f8fafc}
        th{padding:10px 12px;text-align:left;font-weight:600;color:#4a5568;border-bottom:2px solid #e2e8f0}
        td{padding:10px 12px;border-bottom:1px solid #f0f2f5;color:#2d3748;vertical-align:middle}
        .actions{display:flex;gap:6px;flex-wrap:wrap}
        .message{padding:10px 14px;border-radius:8px;margin-bottom:14px;display:none;font-size:13px}
        .message.success{background:#d4edda;color:#155724}
        .message.error{background:#f8d7da;color:#721c24}
        .modal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:1000;justify-content:center;align-items:center}
        .modal-content{background:white;border-radius:14px;padding:28px;width:90%;max-width:560px;max-height:90vh;overflow-y:auto}
        .modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #f0f2f5}
        .form-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid #f0f2f5}
        .blog-modal-content{background:white;border-radius:14px;padding:28px;width:95%;max-width:860px;max-height:92vh;overflow-y:auto}
        #quill-editor-wrap{margin-bottom:12px}
        #quill-editor-wrap .ql-toolbar{border-radius:8px 8px 0 0;border-color:#e2e8f0}
        #quill-editor-wrap .ql-container{border-radius:0 0 8px 8px;border-color:#e2e8f0;min-height:280px;font-size:15px}
        #quill-editor-wrap .ql-editor{min-height:280px;line-height:1.7}
        #quill-editor-wrap .ql-editor img{max-width:100%;margin:8px 0}
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>📚 旭儿导航 · 管理后台</h1>
        <div class="header-buttons">
            <button id="changePwdBtn" style="background:rgba(255,255,255,0.2)">🔑 修改密码</button>
            <button id="logoutBtn" style="background:rgba(255,255,255,0.2)">退出登录</button>
        </div>
    </div>
    
    <div class="card">
        <div class="card-title">📝 博客管理</div>
        <div class="blog-toolbar">
            <div class="blog-search-row" style="margin-bottom:16px;display:flex;gap:10px">
                <input type="text" id="blogSearchInput" placeholder="🔍 搜索文章...">
                <select id="blogStatusFilter"><option value="all">全部</option><option value="published">已发布</option><option value="draft">草稿</option></select>
                <button id="newPostBtn" class="btn-success" style="white-space:nowrap">✏️ 写新文章</button>
            </div>
        </div>
        <div id="blogList"></div>
    </div>

    <div class="card">
        <div class="card-title">📋 书签列表</div>
        <div id="message" class="message"></div>
        <div style="overflow-x:auto">
            <table>
                <thead><tr><th>ID</th><th>名称</th><th>网址</th><th>分类</th><th>排序</th><th>操作</th></tr></thead>
                <tbody id="sitesList"></tbody>
            </table>
        </div>
    </div>
</div>

<div class="grid-top">
    <div class="card">
        <div class="card-title">🖼️ Logo 设置</div>
        <div class="logo-section">
            <div class="logo-preview"><img id="logoPreview" style="display:none"><span id="noLogoHint">暂未设置 Logo</span></div>
            <div class="logo-input-row"><input type="text" id="logoInput" placeholder="Logo 图片 URL（或点击上传）"><button id="uploadLogoBtn" class="btn-warning">📁 上传</button><button id="saveLogoBtn" class="btn-success">保存</button><button id="deleteLogoBtn" class="btn-danger">🗑️ 删除</button></div>
            <input type="file" id="logoFileInput" accept="image/*" style="display:none">
            <div class="logo-input-row"><input type="text" id="logoLinkInput" placeholder="Logo 点击跳转链接（可留空）"><button id="saveLogoLinkBtn" class="btn-success">保存</button></div>
        </div>
        <div style="margin-top:18px;padding-top:16px;border-top:1px solid #e2e8f0">
            <div style="font-size:13px;font-weight:600;color:#4a5568;margin-bottom:10px">🖼️ 页眉背景图</div>
            <div id="headerBgPreviewWrap" style="display:none;margin-bottom:10px"><img id="headerBgPreview" style="width:100%;max-height:100px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0"></div>
            <div class="logo-input-row"><input type="text" id="headerBgInput" placeholder="背景图 URL（留空恢复默认渐变）"><button id="uploadHeaderBgBtn" class="btn-warning">📁 上传</button><button id="saveHeaderBgBtn" class="btn-success">保存</button></div>
            <input type="file" id="headerBgFileInput" accept="image/*" style="display:none">
            <small style="color:#a0aec0">留空并保存可恢复默认紫色渐变背景</small>
        </div>
    </div>

    <div class="card">
        <div class="card-title">🌐 站点信息</div>
        <div class="form-group"><label for="siteTitleInput">站点标题</label><input type="text" id="siteTitleInput" placeholder="旭儿导航" maxlength="50"></div>
        <div class="form-group"><label for="siteSubtitleInput">站点副标题</label><input type="text" id="siteSubtitleInput" placeholder="精选网站 · 优质博客" maxlength="100"></div>
        <div class="form-group"><label for="cnLinkInput">🇨🇳 国内线路链接</label><input type="url" id="cnLinkInput" placeholder="https://你的国内备用域名.com"></div>
        <button id="saveSiteInfoBtn" class="btn-primary">💾 保存站点信息</button>
        <span id="siteInfoStatus" style="margin-left:10px;font-size:13px;"></span>
    </div>
    
    <div class="card">
        <div class="card-title">➕ 添加书签</div>
        <form id="addForm">
            <div class="form-group"><label>名称 *</label><input type="text" id="name" required placeholder="网站名称"></div>
            <div class="form-group"><label>网址 *</label><input type="url" id="url" required placeholder="https://"></div>
            <div class="form-group"><label>分类 *</label><input type="text" id="catelog" required placeholder="如：工具、设计"></div>
            <div class="form-group"><label>Logo URL</label><input type="url" id="logo" placeholder="https://"></div>
            <div class="form-group"><label>描述</label><textarea id="desc" rows="2" placeholder="简短描述（可选）"></textarea></div>
            <div class="form-group"><label>排序</label><input type="number" id="sort_order" value="9999"></div>
            <button type="submit" class="btn-success" style="width:100%;margin-top:4px">➕ 添加书签</button>
        </form>
    </div>
</div>

<div id="postModal" class="modal">
    <div class="blog-modal-content">
        <div class="modal-header"><h3 id="postModalTitle">写新文章</h3><span class="close-post-modal" style="font-size:22px;cursor:pointer;color:#a0aec0">&times;</span></div>
        <input type="hidden" id="postId">
        <div class="form-group"><label>标题 *</label><input type="text" id="postTitle" placeholder="文章标题"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group"><label>分类</label><input type="text" id="postCategory" placeholder="未分类"></div>
            <div class="form-group"><label>状态</label><select id="postStatus"><option value="published">发布</option><option value="draft">草稿</option></select></div>
        </div>
        <div class="form-group"><label>封面图 URL</label><input type="url" id="postCoverImage" placeholder="https://..."></div>
        <div class="form-group"><label>摘要</label><textarea id="postExcerpt" rows="2" placeholder="可选"></textarea></div>
        <div class="form-group"><label>内容 *</label></div>
        <div id="quill-editor-wrap"><div id="quill-editor"></div></div>
        <textarea id="postContent" style="display:none"></textarea>
        <div class="form-group"><label>标签</label><input type="text" id="postTags" placeholder="技术,生活"></div>
        <div class="form-group" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fffbeb;border:1px solid #f59e0b;border-radius:8px"><input type="checkbox" id="postPinned" style="width:16px;height:16px;cursor:pointer;accent-color:#f59e0b"><label for="postPinned" style="cursor:pointer;font-weight:600;color:#92400e;margin:0">📌 置顶文章 <small style="font-weight:400;color:#a0aec0">（仅后台可见，前台文章排序靠前）</small></label></div>
        <div class="form-actions"><button type="button" id="cancelPostBtn" class="btn-secondary">取消</button><button type="button" id="savePostBtn" class="btn-success">保存</button></div>
    </div>
</div>

<input type="file" id="blogFileInput" accept="image/*" style="display:none">

<div id="editModal" class="modal">
    <div class="modal-content">
        <div class="modal-header"><h3>✏️ 编辑书签</h3><span class="close-modal">&times;</span></div>
        <form id="editForm">
            <input type="hidden" id="edit_id">
            <div class="form-group"><label>名称 *</label><input type="text" id="edit_name" required></div>
            <div class="form-group"><label>网址 *</label><input type="url" id="edit_url" required></div>
            <div class="form-group"><label>分类 *</label><input type="text" id="edit_catelog" required></div>
            <div class="form-group"><label>Logo URL</label><input type="url" id="edit_logo"></div>
            <div class="form-group"><label>描述</label><textarea id="edit_desc" rows="2"></textarea></div>
            <div class="form-group"><label>排序</label><input type="number" id="edit_sort_order" value="9999"></div>
            <div class="form-actions"><button type="button" class="close-modal-btn" style="background:#a0aec0">取消</button><button type="submit" class="btn-success">保存修改</button></div>
        </form>
    </div>
</div>

<div id="changePwdModal" class="modal">
    <div class="modal-content">
        <div class="modal-header"><h3>🔑 修改密码</h3><span class="close-pwd-modal">&times;</span></div>
        <form id="changePwdForm">
            <div class="form-group"><label>原密码 *</label><input type="password" id="old_password" required></div>
            <div class="form-group"><label>新密码 *</label><input type="password" id="new_password" required></div>
            <div class="form-group"><label>确认新密码 *</label><input type="password" id="confirm_password" required></div>
            <div class="form-actions"><button type="button" class="close-pwd-btn" style="background:#a0aec0">取消</button><button type="submit" class="btn-success">确认修改</button></div>
        </form>
    </div>
</div>

<script>
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

async function loadSites() {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.code === 200) {
        const tbody = document.getElementById('sitesList');
        tbody.innerHTML = '';
        data.data.forEach(site => {
            const row = tbody.insertRow();
            row.insertCell(0).textContent = site.id;
            row.insertCell(1).innerHTML = '<strong>' + escapeHtml(site.name) + '</strong>';
            row.insertCell(2).innerHTML = '<a href="' + site.url + '" target="_blank">' + (site.url || '').substring(0,40) + '</a>';
            row.insertCell(3).innerHTML = '<span style="background:#e2e8f0;padding:2px 8px;border-radius:4px">' + escapeHtml(site.catelog) + '</span>';
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

document.getElementById('logoutBtn').onclick = async () => {
    await fetch('/logout', { method: 'POST' });
    window.location.href = '/';
};

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

window.onclick = (e) => {
    if (e.target === document.getElementById('editModal')) closeModal();
    if (e.target === changePwdModal) closeChangePwdModal();
};
document.querySelector('.close-modal').onclick = closeModal;
document.querySelector('.close-modal-btn').onclick = closeModal;

loadLogo();
loadSiteInfo();
loadLogoLink();
loadHeaderBg();
loadSites();
loadBlogPosts();

let allPosts = [];

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
    quill.getModule('toolbar').addHandler('link', function() {
        const range = quill.getSelection();
        if (!range || range.length === 0) {
            alert('请先选中要添加链接的文字');
            return;
        }
        const format = quill.getFormat(range);
        const existingUrl = format.link || '';
        const url = prompt('请输入链接地址：', existingUrl);
        if (url === null) return;
        if (url.trim() === '') {
            quill.format('link', false);
        } else {
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
    fl.sort((a, b) => {
        if (b.pinned && !a.pinned) return 1;
        if (a.pinned && !b.pinned) return -1;
        return b.id - a.id;
    });
    if (!fl.length) { document.getElementById('blogList').innerHTML = '<p style="color:#a0aec0;padding:20px 0">暂无文章</p>'; return; }
    let h = '<table><thead><tr><th>ID</th><th>标题</th><th>分类</th><th>状态</th><th>日期</th><th>操作</th></tr></thead><tbody>';
    fl.forEach(p => {
        const badge = p.status === 'published'
            ? '<span class="status-badge status-published">已发布</span>'
            : '<span class="status-badge status-draft">草稿</span>';
        const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString('zh-CN') : '-';
        h += '<tr><td>' + p.id + '</td><td><strong>' + escapeHtml(p.title) + '</strong>' + (p.pinned ? '<span class="pin-badge">📌 置顶</span>' : '') + '</td><td>' + escapeHtml(p.category || '未分类') + '</td><td>' + badge + '</td><td>' + date + '</td><td class="actions"><button class="btn-warning blog-edit" data-id="' + p.id + '">编辑</button><button class="btn-danger blog-del" data-id="' + p.id + '">删除</button></td></tr>';
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
        document.getElementById('postPinned').checked = !!p.pinned;
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
        document.getElementById('postPinned').checked = false;
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
        tags: document.getElementById('postTags').value.split(',').map(t => t.trim()).filter(t => t),
        pinned: document.getElementById('postPinned').checked
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

document.getElementById('postModal').addEventListener('click', e => {
    if (e.target === document.getElementById('postModal')) closePostModal();
});

async function loadSiteInfo() {
    try {
        const res = await fetch('/api/site-info');
        const data = await res.json();
        document.getElementById('siteTitleInput').value = data.title || '';
        document.getElementById('siteSubtitleInput').value = data.subtitle || '';
        document.getElementById('cnLinkInput').value = data.cnLink || '';
    } catch (e) {
        console.error('加载站点信息失败', e);
    }
}

document.getElementById('saveSiteInfoBtn').addEventListener('click', async () => {
    const btn = document.getElementById('saveSiteInfoBtn');
    const status = document.getElementById('siteInfoStatus');
    const title = document.getElementById('siteTitleInput').value.trim();
    const subtitle = document.getElementById('siteSubtitleInput').value.trim();
    const cnLink = document.getElementById('cnLinkInput').value.trim();
    btn.disabled = true;
    status.textContent = '保存中…';
    try {
        const res = await fetch('/api/site-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, subtitle, cnLink })
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
</script>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
