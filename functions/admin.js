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
        .container{max-width:1400px;margin:0 auto;display:flex;flex-direction:column;gap:20px}
        .header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:20px 24px;border-radius:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;box-shadow:0 4px 15px rgba(102,126,234,0.4)}
        .card{background:white;border-radius:14px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.07)}
        .card-title{font-size:18px;font-weight:700;padding-bottom:14px;margin-bottom:18px;border-bottom:2px solid #f0f2f5;display:flex;align-items:center;gap:8px}
        .grid-top{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:20px}
        .form-group{margin-bottom:16px}
        .form-group label{display:block;margin-bottom:6px;font-weight:600;color:#4a5568}
        .form-group input,.form-group textarea,.form-group select{width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        button{padding:10px 20px;border:none;border-radius:8px;cursor:pointer;font-weight:600}
        .btn-primary{background:#667eea;color:white}
        .btn-danger{background:#e53e3e;color:white}
        .btn-warning{background:#ed8936;color:white}
        .btn-success{background:#38a169;color:white}
        .btn-secondary{background:#718096;color:white}
        table{width:100%;border-collapse:collapse}
        th,td{padding:12px;text-align:left;border-bottom:1px solid #e2e8f0}
        th{background:#f8fafc;font-weight:600}
        .actions{display:flex;gap:8px;flex-wrap:wrap}
        .status-badge{padding:2px 8px;border-radius:20px;font-size:12px}
        .status-published{background:#d4edda;color:#155724}
        .status-draft{background:#fff3cd;color:#856404}
        .pin-badge{background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:12px;font-size:11px;margin-left:6px}
        .modal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;justify-content:center;align-items:center}
        .modal-content{background:white;border-radius:16px;padding:28px;width:90%;max-width:800px;max-height:90vh;overflow-y:auto}
        .modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
        .ql-editor{min-height:300px}
        .logo-preview{display:flex;align-items:center;gap:14px;margin-bottom:14px}
        .logo-preview img{max-width:80px;max-height:80px;border-radius:8px;border:1px solid #e2e8f0}
        .logo-input-row{display:flex;gap:10px;align-items:center;margin-bottom:10px}
        .logo-input-row input{flex:1;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px}
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>📚 旭儿导航 · 管理后台</h1>
        <div class="header-buttons">
            <button id="changePwdBtn" class="btn-warning" style="background:#ed8936">🔑 修改密码</button>
            <button id="logoutBtn" class="btn-secondary">退出登录</button>
        </div>
    </div>
    
    <!-- 文章管理 -->
    <div class="card">
        <div class="card-title">📝 文章管理</div>
        <div style="margin-bottom:16px;display:flex;gap:10px;flex-wrap:wrap">
            <input type="text" id="searchPost" placeholder="搜索文章..." style="flex:1;padding:8px;border:1px solid #e2e8f0;border-radius:8px">
            <select id="statusFilter" style="padding:8px;border:1px solid #e2e8f0;border-radius:8px">
                <option value="all">全部</option>
                <option value="published">已发布</option>
                <option value="draft">草稿</option>
            </select>
            <button id="newPostBtn" class="btn-success">✏️ 写新文章</button>
        </div>
        <div style="overflow-x:auto">
            <table><thead><tr><th>ID</th><th>标题</th><th>分类</th><th>状态</th><th>日期</th><th>操作</th></tr></thead>
            <tbody id="postsList"></tbody>
        </table>
        </div>
    </div>
    
    <!-- 书签管理 -->
    <div class="card">
        <div class="card-title">🔖 书签管理</div>
        <div id="message" class="message" style="display:none;padding:10px;margin-bottom:10px;border-radius:8px"></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
            <input type="text" id="siteName" placeholder="网站名称" style="padding:8px;border:1px solid #e2e8f0;border-radius:8px">
            <input type="url" id="siteUrl" placeholder="网址" style="padding:8px;border:1px solid #e2e8f0;border-radius:8px">
            <input type="text" id="siteCat" placeholder="分类" style="padding:8px;border:1px solid #e2e8f0;border-radius:8px">
            <input type="number" id="siteSort" placeholder="排序" value="9999" style="padding:8px;border:1px solid #e2e8f0;border-radius:8px">
        </div>
        <div style="display:grid;grid-template-columns:1fr auto;gap:12px;margin-bottom:16px">
            <input type="url" id="siteLogo" placeholder="Logo URL（可选）" style="padding:8px;border:1px solid #e2e8f0;border-radius:8px">
            <button id="uploadSiteLogoBtn" class="btn-warning">上传Logo</button>
        </div>
        <textarea id="siteDesc" rows="2" placeholder="描述（可选）" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px"></textarea>
        <button id="addSiteBtn" class="btn-primary" style="margin-bottom:16px">➕ 添加书签</button>
        <div style="overflow-x:auto">
            <table><thead><tr><th>ID</th><th>名称</th><th>网址</th><th>分类</th><th>排序</th><th>操作</th></tr></thead>
            <tbody id="sitesList"></tbody>
        </table>
        </div>
    </div>
    
    <!-- 站点设置 -->
    <div class="card">
        <div class="card-title">⚙️ 站点设置</div>
        <div class="grid-top">
            <div>
                <div class="form-group"><label>站点标题</label><input type="text" id="siteTitle" value=""></div>
                <div class="form-group"><label>站点副标题</label><input type="text" id="siteSubtitle" value=""></div>
                <div class="form-group"><label>🇨🇳 国内线路链接</label><input type="url" id="cnLink" placeholder="https://你的国内备用域名.com"></div>
            </div>
            <div>
                <div class="form-group"><label>Logo URL</label><div style="display:flex;gap:10px"><input type="url" id="logoUrl" style="flex:1"><button id="uploadLogoBtn" class="btn-warning">上传图片</button></div></div>
                <div class="form-group"><label>Logo 跳转链接</label><input type="url" id="logoLink"></div>
                <div class="form-group"><label>页眉背景图 URL</label><div style="display:flex;gap:10px"><input type="url" id="headerBgUrl" style="flex:1"><button id="uploadHeaderBgBtn" class="btn-warning">上传图片</button></div></div>
            </div>
        </div>
        <button id="saveSettingsBtn" class="btn-primary">保存设置</button>
        <span id="settingsStatus" style="margin-left:12px;font-size:13px"></span>
    </div>
</div>

<!-- 文章编辑弹窗 -->
<div id="postModal" class="modal">
    <div class="modal-content">
        <div class="modal-header"><h3 id="modalTitle">写新文章</h3><span class="close-post-modal" style="font-size:24px;cursor:pointer">&times;</span></div>
        <input type="hidden" id="postId">
        <div class="form-group"><label>标题 *</label><input type="text" id="postTitle" placeholder="文章标题"></div>
        <div class="form-row">
            <div class="form-group"><label>分类</label><input type="text" id="postCategory" placeholder="未分类"></div>
            <div class="form-group"><label>状态</label><select id="postStatus"><option value="published">发布</option><option value="draft">草稿</option></select></div>
        </div>
        <div class="form-group"><label>封面图 URL</label><div style="display:flex;gap:10px"><input type="url" id="postCoverImage" style="flex:1"><button id="uploadPostCoverBtn" class="btn-warning">上传图片</button></div></div>
        <div class="form-group"><label>摘要</label><textarea id="postExcerpt" rows="2" placeholder="可选"></textarea></div>
        <div class="form-group"><label>内容 *</label><div id="quill-editor"></div><textarea id="postContent" style="display:none"></textarea></div>
        <div class="form-group"><label>标签</label><input type="text" id="postTags" placeholder="技术,生活"></div>
        <div class="form-group"><label><input type="checkbox" id="postPinned"> 📌 置顶文章</label></div>
        <div class="actions" style="justify-content:flex-end;margin-top:20px"><button id="cancelPostBtn" class="btn-secondary">取消</button><button id="savePostBtn" class="btn-success">保存</button></div>
    </div>
</div>

<!-- 修改密码弹窗 -->
<div id="changePwdModal" class="modal">
    <div class="modal-content" style="max-width:400px">
        <div class="modal-header"><h3>🔑 修改密码</h3><span class="close-pwd-modal">&times;</span></div>
        <div class="form-group"><label>原密码</label><input type="password" id="oldPassword"></div>
        <div class="form-group"><label>新密码</label><input type="password" id="newPassword"></div>
        <div class="form-group"><label>确认新密码</label><input type="password" id="confirmPassword"></div>
        <div class="actions" style="justify-content:flex-end"><button id="cancelPwdBtn" class="btn-secondary">取消</button><button id="confirmPwdBtn" class="btn-primary">确认修改</button></div>
    </div>
</div>

<input type="file" id="imageUploadInput" accept="image/*" style="display:none">

<script>
let allPosts = [];
let allSites = [];
let quill = null;

function escape(str){if(!str)return '';return String(str).replace(/[&<>]/g,function(m){if(m==='&')return'&amp;';if(m==='<')return'&lt;';if(m==='>')return'&gt;';return m;});}

function showMessage(msg, type){
    const msgDiv = document.getElementById('message');
    msgDiv.textContent = msg;
    msgDiv.className = 'message ' + type;
    msgDiv.style.display = 'block';
    setTimeout(() => msgDiv.style.display = 'none', 3000);
}

function initQuill(){
    if(quill)return;
    quill = new Quill('#quill-editor',{
        theme:'snow',
        placeholder:'在这里写下你的文章内容...',
        modules:{
            toolbar:[
                [{header:[1,2,3,false]}],
                ['bold','italic','underline','strike'],
                [{color:[]},{background:[]}],
                [{list:'ordered'},{list:'bullet'}],
                ['blockquote','code-block'],
                ['link','image'],
                [{align:[]}],
                ['clean']
            ]
        }
    });
    quill.on('text-change',()=>{document.getElementById('postContent').value=quill.root.innerHTML;});
}

async function uploadImage(targetId){
    let input=document.getElementById('imageUploadInput');
    input.onchange=async(e)=>{
        let file=e.target.files[0];
        if(!file)return;
        let fd=new FormData();fd.append('image',file);
        let r=await fetch('/api/upload',{method:'POST',body:fd,credentials:'include'});
        let d=await r.json();
        if(d.code===200)document.getElementById(targetId).value=d.url;
        else alert('上传失败：'+d.message);
        input.value='';
    };
    input.click();
}

async function loadData(){
    const [sitesRes, postsRes] = await Promise.all([
        fetch('/api/config').then(r=>r.json()),
        fetch('/api/blog').then(r=>r.json())
    ]);
    if(sitesRes.code===200) allSites = sitesRes.data || [];
    if(postsRes.code===200) allPosts = postsRes.data || [];
    renderPosts();
    renderSites();
    loadSiteInfo();
}

function renderPosts(){
    let status = document.getElementById('statusFilter').value;
    let search = document.getElementById('searchPost').value.toLowerCase();
    let filtered = allPosts.filter(p => (status==='all' || p.status===status) && (!search || p.title.toLowerCase().includes(search)));
    filtered.sort((a,b)=>{if(a.pinned&&!b.pinned)return-1;if(!a.pinned&&b.pinned)return1;return b.id-a.id;});
    let html = '';
    for(let p of filtered){
        html += '<tr>';
        html += '<td>' + p.id + '</td>';
        html += '<td><strong>' + escape(p.title) + '</strong>' + (p.pinned?'<span class="pin-badge">📌置顶</span>':'') + '</td>';
        html += '<td>' + escape(p.category||'未分类') + '</td>';
        html += '<td><span class="status-badge '+(p.status==='published'?'status-published':'status-draft')+'">'+(p.status==='published'?'已发布':'草稿')+'</span></td>';
        html += '<td>' + new Date(p.createdAt).toLocaleDateString() + '</td>';
        html += '<td class="actions"><button class="btn-warning" onclick="editPost('+p.id+')">编辑</button> <button class="btn-danger" onclick="deletePost('+p.id+')">删除</button></td>';
        html += '</tr>';
    }
    document.getElementById('postsList').innerHTML = html;
}

function renderSites(){
    let sorted = [...allSites];
    sorted.sort((a,b)=>(a.sort_order||9999)-(b.sort_order||9999));
    let html = '';
    for(let s of sorted){
        html += '<tr>';
        html += '<td>' + s.id + '</td>';
        html += '<td><strong>' + escape(s.name) + '</strong></td>';
        html += '<td><a href="'+escape(s.url)+'" target="_blank">'+escape(s.url).substring(0,50)+'</a></td>';
        html += '<td>' + escape(s.catelog) + '</td>';
        html += '<td>' + (s.sort_order||9999) + '</td>';
        html += '<td class="actions"><button class="btn-danger" onclick="deleteSite('+s.id+')">删除</button></td>';
        html += '</tr>';
    }
    document.getElementById('sitesList').innerHTML = html;
}

function editPost(id){
    initQuill();
    let p = allPosts.find(p=>p.id==id);
    if(!p)return;
    document.getElementById('postId').value = p.id;
    document.getElementById('postTitle').value = p.title;
    document.getElementById('postCategory').value = p.category||'';
    document.getElementById('postCoverImage').value = p.coverImage||'';
    document.getElementById('postExcerpt').value = p.excerpt||'';
    document.getElementById('postStatus').value = p.status||'published';
    document.getElementById('postTags').value = (p.tags||[]).join(',');
    document.getElementById('postPinned').checked = p.pinned||false;
    quill.root.innerHTML = p.content||'';
    document.getElementById('postContent').value = quill.root.innerHTML;
    document.getElementById('modalTitle').innerText = '编辑文章';
    document.getElementById('postModal').style.display='flex';
}

function openNewPost(){
    initQuill();
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
    document.getElementById('modalTitle').innerText = '写新文章';
    document.getElementById('postModal').style.display='flex';
}

function closePostModal(){document.getElementById('postModal').style.display='none';}

async function savePost(){
    if(quill)document.getElementById('postContent').value=quill.root.innerHTML;
    let id = document.getElementById('postId').value;
    let data = {
        title: document.getElementById('postTitle').value.trim(),
        category: document.getElementById('postCategory').value.trim(),
        coverImage: document.getElementById('postCoverImage').value.trim(),
        excerpt: document.getElementById('postExcerpt').value.trim(),
        content: document.getElementById('postContent').value,
        status: document.getElementById('postStatus').value,
        tags: document.getElementById('postTags').value.split(',').map(t=>t.trim()).filter(t=>t),
        pinned: document.getElementById('postPinned').checked
    };
    if(!data.title||!data.content||data.content==='<p><br></p>'){alert('请填写标题和内容');return;}
    let url = id ? '/api/blog/'+id : '/api/blog';
    let method = id ? 'PUT' : 'POST';
    let r = await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    let d = await r.json();
    if(d.code===200||d.code===201){alert(id?'更新成功':'发布成功');closePostModal();loadData();}
    else alert('操作失败');
}

async function deletePost(id){
    if(!confirm('确定删除？'))return;
    await fetch('/api/blog/'+id,{method:'DELETE'});
    loadData();
}

async function addSite(){
    let name = document.getElementById('siteName').value.trim();
    let url = document.getElementById('siteUrl').value.trim();
    let catelog = document.getElementById('siteCat').value.trim();
    let logo = document.getElementById('siteLogo').value.trim();
    let desc = document.getElementById('siteDesc').value.trim();
    let sort_order = parseInt(document.getElementById('siteSort').value)||9999;
    if(!name||!url||!catelog){alert('请填写完整');return;}
    let r = await fetch('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,url,catelog,logo,desc,sort_order})});
    if(r.ok)loadData();
    else alert('添加失败');
}

async function deleteSite(id){
    if(!confirm('确定删除？'))return;
    let r = await fetch('/api/config/'+id,{method:'DELETE'});
    if(r.ok)loadData();
    else alert('删除失败');
}

async function saveSettings(){
    let data = {
        title: document.getElementById('siteTitle').value,
        subtitle: document.getElementById('siteSubtitle').value,
        logo: document.getElementById('logoUrl').value,
        logoLink: document.getElementById('logoLink').value,
        headerBg: document.getElementById('headerBgUrl').value,
        cnLink: document.getElementById('cnLink').value
    };
    let r = await fetch('/api/site-info',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    if(r.ok){
        document.getElementById('settingsStatus').innerText='保存成功';
        document.getElementById('settingsStatus').style.color='#4caf50';
        setTimeout(()=>document.getElementById('settingsStatus').innerText='',3000);
    }else alert('保存失败');
}

async function loadSiteInfo(){
    let res = await fetch('/api/site-info');
    let data = await res.json();
    document.getElementById('siteTitle').value = data.title||'';
    document.getElementById('siteSubtitle').value = data.subtitle||'';
    document.getElementById('logoUrl').value = data.logo||'';
    document.getElementById('logoLink').value = data.logoLink||'';
    document.getElementById('headerBgUrl').value = data.headerBg||'';
    document.getElementById('cnLink').value = data.cnLink||'';
}

async function changePassword(){
    let oldPwd = document.getElementById('oldPassword').value;
    let newPwd = document.getElementById('newPassword').value;
    let confirmPwd = document.getElementById('confirmPassword').value;
    if(newPwd!==confirmPwd){alert('两次输入的新密码不一致');return;}
    if(newPwd.length<4){alert('新密码长度至少4位');return;}
    let r = await fetch('/api/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({old_password:oldPwd,new_password:newPwd})});
    let d = await r.json();
    if(d.code===200){alert('密码修改成功，请重新登录');window.location.href='/logout';}
    else alert(d.message||'修改失败');
}

document.getElementById('newPostBtn').onclick = openNewPost;
document.getElementById('cancelPostBtn').onclick = closePostModal;
document.querySelector('.close-post-modal').onclick = closePostModal;
document.getElementById('savePostBtn').onclick = savePost;
document.getElementById('saveSettingsBtn').onclick = saveSettings;
document.getElementById('addSiteBtn').onclick = addSite;
document.getElementById('uploadLogoBtn').onclick = () => uploadImage('logoUrl');
document.getElementById('uploadHeaderBgBtn').onclick = () => uploadImage('headerBgUrl');
document.getElementById('uploadPostCoverBtn').onclick = () => uploadImage('postCoverImage');
document.getElementById('uploadSiteLogoBtn').onclick = () => uploadImage('siteLogo');
document.getElementById('statusFilter').onchange = renderPosts;
document.getElementById('searchPost').oninput = renderPosts;
document.getElementById('changePwdBtn').onclick = () => document.getElementById('changePwdModal').style.display='flex';
document.querySelector('.close-pwd-modal').onclick = () => document.getElementById('changePwdModal').style.display='none';
document.getElementById('cancelPwdBtn').onclick = () => document.getElementById('changePwdModal').style.display='none';
document.getElementById('confirmPwdBtn').onclick = changePassword;
document.getElementById('logoutBtn').onclick = async () => { await fetch('/logout',{method:'POST'}); window.location.href='/'; };
window.onclick = (e) => { if(e.target===document.getElementById('postModal')) closePostModal(); if(e.target===document.getElementById('changePwdModal')) document.getElementById('changePwdModal').style.display='none'; };

loadData();
</script>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
