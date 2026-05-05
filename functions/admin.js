// 简化版 admin.js - 仅包含核心登录、文章、书签管理功能
export async function onRequest({ request, env }) {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/admin_token=([^;]+)/);
    let isLoggedIn = false;
    
    if (match) {
        const session = await NAV_KV.get(`session:${match[1]}`);
        isLoggedIn = session !== null;
    }
    
    function generateToken() {
        return Date.now() + '-' + Math.random().toString(36).substring(2);
    }
    
    // 处理登录请求
    if (request.method === 'POST') {
        const formData = await request.formData();
        const password = formData.get('password');
        const adminPass = await NAV_KV.get('admin_password') || 'admin123';
        if (password === adminPass) {
            const token = generateToken();
            await NAV_KV.put(`session:${token}`, 'active', { expirationTtl: 86400 });
            return new Response(null, {
                status: 302,
                headers: {
                    'Location': '/admin',
                    'Set-Cookie': `admin_token=${token}; Path=/; HttpOnly; Max-Age=86400`
                }
            });
        }
        return new Response('密码错误，<a href="/admin">返回</a>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    
    // 未登录：显示登录页面
    if (!isLoggedIn) {
        return new Response(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>管理员登录</title><style>
body{font-family:system-ui;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;display:flex;justify-content:center;align-items:center;}
.box{background:white;padding:40px;border-radius:16px;width:320px;text-align:center;}
input,button{width:100%;padding:10px;margin:8px 0;border-radius:6px;border:1px solid #ccc;}
button{background:#667eea;color:white;border:none;cursor:pointer;}
</style></head>
<body><div class="box"><h2>管理员登录</h2>
<form method="post"><input type="password" name="password" placeholder="密码" required>
<button type="submit">登录</button></form></div></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    
    // 已登录：从KV读取数据并显示简易管理界面
    let sites = [], posts = [];
    try {
        const sitesData = await NAV_KV.get('sites');
        if (sitesData) sites = JSON.parse(sitesData);
        const postsData = await NAV_KV.get('blog_posts');
        if (postsData) posts = JSON.parse(postsData);
    } catch(e) { /* 忽略错误 */ }
    
    // 对文章和书签进行排序
    sites.sort((a, b) => (a.sort_order || 9999) - (b.sort_order || 9999));
    posts.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.id - a.id;
    });
    
    return new Response(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>管理后台</title><style>
body{font-family:system-ui;padding:20px;background:#f0f2f5;}
.container{max-width:1200px;margin:0 auto;}
.card{background:white;border-radius:12px;padding:24px;margin-bottom:20px;}
table{width:100%;border-collapse:collapse;}
th,td{padding:12px;text-align:left;border-bottom:1px solid #ddd;}
button{padding:4px 12px;margin:2px;border:none;border-radius:4px;cursor:pointer;}
.primary{background:#667eea;color:white;}
.danger{background:#e53e3e;color:white;}
.add-form{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;}
.add-form input, .add-form textarea{flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;}
</style></head>
<body><div class="container">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h1>管理后台</h1>
        <a href="/logout" style="background:#ccc;padding:8px 16px;border-radius:8px;text-decoration:none;color:black;">退出登录</a>
    </div>
    
    <!-- 文章管理区域 -->
    <div class="card"><h2>📝 文章管理</h2>
        <div style="margin-bottom:16px;">
            <button id="newPostBtn" class="primary">+ 写新文章</button>
        </div>
        <div id="postsList"></div>
    </div>
    
    <!-- 书签管理区域 -->
    <div class="card"><h2>🔖 书签管理</h2>
        <div class="add-form">
            <input type="text" id="siteName" placeholder="网站名称">
            <input type="url" id="siteUrl" placeholder="网址">
            <input type="text" id="siteCat" placeholder="分类">
            <input type="number" id="siteSort" placeholder="排序" value="9999">
            <textarea id="siteDesc" rows="1" placeholder="描述"></textarea>
            <button id="addSiteBtn" class="primary">添加书签</button>
        </div>
        <div id="sitesList"></div>
    </div>
</div>

<!-- 文章编辑/新增对话框 -->
<div id="postModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);justify-content:center;align-items:center;z-index:1000;">
    <div style="background:white;border-radius:12px;padding:24px;width:90%;max-width:600px;">
        <div style="display:flex;justify-content:space-between;"><h3 id="modalTitle">写新文章</h3><span id="closeModalBtn" style="font-size:24px;cursor:pointer">&times;</span></div>
        <input type="hidden" id="postId">
        <div><label>标题</label><input type="text" id="postTitle" style="width:100%;"></div>
        <div><label>分类</label><input type="text" id="postCategory" style="width:100%;"></div>
        <div><label>内容</label><textarea id="postContent" rows="6" style="width:100%;"></textarea></div>
        <div><label><input type="checkbox" id="postPinned"> 置顶文章</label></div>
        <div style="margin-top:20px;text-align:right;"><button id="savePostBtn" class="primary">保存</button></div>
    </div>
</div>

<script>
let allPosts = ${JSON.stringify(posts)};
let allSites = ${JSON.stringify(sites)};

function escape(str){if(!str)return '';return String(str).replace(/[&<>]/g,function(m){if(m==='&')return'&amp;';if(m==='<')return'&lt;';if(m==='>')return'&gt;';return m;});}

function renderPosts() {
    let html = '<table><thead><tr><th>ID</th><th>标题</th><th>分类</th><th>状态</th><th>日期</th><th>操作</th></tr></thead><tbody>';
    for(let p of allPosts) {
        html += \`<tr>
            <td>\${p.id}</td>
            <td><strong>\${escape(p.title)}</strong>\${p.pinned ? ' <span style="background:#fef3c7;padding:2px 6px;border-radius:12px;font-size:11px;">置顶</span>' : ''}</td>
            <td>\${escape(p.category || '未分类')}</td>
            <td>\${p.status === 'published' ? '已发布' : '草稿'}</td>
            <td>\${new Date(p.createdAt).toLocaleDateString()}</td>
            <td><button class="primary" onclick="editPost(\${p.id})">编辑</button> <button class="danger" onclick="deletePost(\${p.id})">删除</button></td>
        </tr>\`;
    }
    html += '</tbody></table>';
    document.getElementById('postsList').innerHTML = html;
}

function renderSites() {
    let html = '<table><thead><tr><th>ID</th><th>名称</th><th>网址</th><th>分类</th><th>描述</th><th>排序</th><th>操作</th></tr></thead><tbody>';
    for(let s of allSites) {
        html += \`<tr>
            <td>\${s.id}</td>
            <td><strong>\${escape(s.name)}</strong></td>
            <td><a href="\${escape(s.url)}" target="_blank">\${escape(s.url).substring(0,50)}</a></td>
            <td>\${escape(s.catelog)}</td>
            <td>\${escape(s.desc || '')}</td>
            <td>\${s.sort_order || 9999}</td>
            <td><button class="danger" onclick="deleteSite(\${s.id})">删除</button></td>
        </tr>\`;
    }
    html += '</tbody></table>';
    document.getElementById('sitesList').innerHTML = html;
}

async function addSite() {
    const name = document.getElementById('siteName').value.trim();
    const url = document.getElementById('siteUrl').value.trim();
    const catelog = document.getElementById('siteCat').value.trim();
    const desc = document.getElementById('siteDesc').value.trim();
    const sort_order = parseInt(document.getElementById('siteSort').value) || 9999;
    if(!name || !url || !catelog) { alert('请填写完整'); return; }
    const r = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, catelog, desc, sort_order })
    });
    if(r.ok) location.reload();
    else alert('添加失败');
}

async function deleteSite(id) {
    if(!confirm('确定删除？')) return;
    const r = await fetch('/api/config/' + id, { method: 'DELETE' });
    if(r.ok) location.reload();
    else alert('删除失败');
}

function editPost(id) {
    const post = allPosts.find(p => p.id === id);
    if(!post) return;
    document.getElementById('postId').value = post.id;
    document.getElementById('postTitle').value = post.title;
    document.getElementById('postCategory').value = post.category || '';
    document.getElementById('postContent').value = post.content || '';
    document.getElementById('postPinned').checked = post.pinned === true;
    document.getElementById('modalTitle').innerText = '编辑文章';
    document.getElementById('postModal').style.display = 'flex';
}

async function savePost() {
    const id = document.getElementById('postId').value;
    const title = document.getElementById('postTitle').value.trim();
    const category = document.getElementById('postCategory').value.trim();
    const content = document.getElementById('postContent').value;
    const pinned = document.getElementById('postPinned').checked;
    if(!title || !content) { alert('请填写标题和内容'); return; }
    const url = id ? '/api/blog/' + id : '/api/blog';
    const method = id ? 'PUT' : 'POST';
    const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, content, status: 'published', pinned })
    });
    if(r.ok) location.reload();
    else alert('操作失败');
}

async function deletePost(id) {
    if(!confirm('确定删除？')) return;
    const r = await fetch('/api/blog/' + id, { method: 'DELETE' });
    if(r.ok) location.reload();
    else alert('删除失败');
}

// 新增文章
document.getElementById('newPostBtn').onclick = () => {
    document.getElementById('postId').value = '';
    document.getElementById('postTitle').value = '';
    document.getElementById('postCategory').value = '';
    document.getElementById('postContent').value = '';
    document.getElementById('postPinned').checked = false;
    document.getElementById('modalTitle').innerText = '写新文章';
    document.getElementById('postModal').style.display = 'flex';
};
document.getElementById('closeModalBtn').onclick = () => document.getElementById('postModal').style.display = 'none';
document.getElementById('savePostBtn').onclick = savePost;
document.getElementById('addSiteBtn').onclick = addSite;

renderPosts();
renderSites();
</script>
</body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
