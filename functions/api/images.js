// 完整的 KV 图片管理工具 - 测试版（已注释登录验证）
export async function onRequest({ request, env }) {
    const url = new URL(request.url);
    
    // ========== 临时跳过登录验证（测试用）==========
    // const cookie = request.headers.get('Cookie') || '';
    // const match = cookie.match(/admin_token=([^;]+)/);
    // let isLoggedIn = false;
    // if (match) {
    //     const session = await NAV_KV.get(`session:${match[1]}`);
    //     isLoggedIn = session !== null;
    // }
    // if (!isLoggedIn) {
    //     return new Response(JSON.stringify({ code: 401, message: '请先登录后台' }), {
    //         status: 401,
    //         headers: { 'Content-Type': 'application/json' }
    //     });
    // }
    // ========== 登录验证已注释，任何人都可以访问 ==========
    
    // GET /api/images - 获取图片列表
    if (request.method === 'GET' && url.searchParams.get('action') !== 'page') {
        try {
            const keys = await NAV_KV.list({ prefix: 'img:' });
            const images = [];
            
            if (keys && keys.keys) {
                for (const key of keys.keys) {
                    if (key && key.name) {
                        let filename = key.name;
                        if (filename.startsWith('img:')) {
                            filename = filename.substring(4);
                        }
                        images.push({
                            filename: filename,
                            url: `/api/image/${filename}`
                        });
                    }
                }
            }
            
            images.sort((a, b) => b.filename.localeCompare(a.filename));
            
            return new Response(JSON.stringify({ 
                code: 200, 
                data: images, 
                total: images.length,
                message: 'success'
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // DELETE /api/images - 删除图片
    if (request.method === 'DELETE') {
        try {
            const body = await request.json();
            const filename = body.filename;
            
            if (!filename) {
                return new Response(JSON.stringify({ code: 400, message: '缺少文件名' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            await NAV_KV.delete(`img:${filename}`);
            
            return new Response(JSON.stringify({ code: 200, message: '删除成功' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 返回管理页面（无需登录）
    return new Response(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KV 图片管理</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:system-ui;background:#f0f2f5;padding:20px}
        .container{max-width:1200px;margin:0 auto}
        .header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:16px 20px;border-radius:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}
        .header h1{font-size:20px}
        .header a{color:white;text-decoration:none;background:rgba(255,255,255,0.2);padding:6px 14px;border-radius:6px}
        .card{background:white;border-radius:12px;padding:20px}
        .toolbar{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
        .btn{background:#667eea;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer}
        .btn-danger{background:#e53e3e}
        .stats{font-size:13px;color:#666;margin-left:10px;line-height:34px}
        .image-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:15px;margin-top:15px}
        .image-card{background:#f8fafc;border-radius:10px;padding:10px;border:1px solid #e2e8f0;transition:transform 0.2s}
        .image-card:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.1)}
        .image-card img{width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px;background:#f0f0f0}
        .filename{font-size:10px;color:#666;word-break:break-all;margin-bottom:8px;line-height:1.4}
        .actions{display:flex;gap:6px}
        .actions button{flex:1;padding:5px;border-radius:5px;cursor:pointer;font-size:10px;border:none}
        .copy-btn{background:#667eea;color:white}
        .delete-btn{background:#e53e3e;color:white}
        .loading{text-align:center;padding:50px;color:#999}
        .empty{text-align:center;padding:50px;color:#999}
        .info{background:#e6f7ff;border:1px solid #91d5ff;padding:10px 15px;border-radius:8px;margin-bottom:15px;font-size:13px}
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>🖼️ KV 图片管理</h1>
        <a href="/admin">← 返回后台</a>
    </div>
    <div class="card">
        <div class="info">
            💡 提示：这里显示的是 KV 存储中的所有图片。<br>
            📋 点击「复制链接」获取图片 URL，可粘贴到文章「封面图 URL」。<br>
            🗑️ 点击「删除」会从 KV 中永久删除图片。
        </div>
        <div class="toolbar">
            <button class="btn" id="refreshBtn">🔄 刷新列表</button>
            <span id="stats" class="stats"></span>
        </div>
        <div id="imageList" class="image-grid">
            <div class="loading">加载中...</div>
        </div>
    </div>
</div>

<script>
async function loadImages() {
    const container = document.getElementById('imageList');
    const statsDiv = document.getElementById('stats');
    
    container.innerHTML = '<div class="loading">⏳ 加载中...</div>';
    if (statsDiv) statsDiv.textContent = '';
    
    try {
        const res = await fetch('/api/images', { credentials: 'include' });
        const data = await res.json();
        
        if (data.code === 200) {
            if (statsDiv) statsDiv.textContent = data.total === 0 ? '' : '共 ' + data.total + ' 张图片';
            
            if (!data.data || data.data.length === 0) {
                container.innerHTML = '<div class="empty">📭 暂无图片<br><br>请在写文章时使用编辑器上传图片</div>';
                return;
            }
            
            let html = '';
            for (const img of data.data) {
                const displayName = img.filename.length > 30 ? img.filename.substring(0, 27) + '...' : img.filename;
                html += '<div class="image-card">' +
                    '<img src="' + escapeHtml(img.url) + '" onerror="this.parentElement.style.display=\'none\'" alt="' + escapeHtml(img.filename) + '">' +
                    '<div class="filename" title="' + escapeHtml(img.filename) + '">📄 ' + escapeHtml(displayName) + '</div>' +
                    '<div class="actions">' +
                        '<button class="copy-btn" data-url="' + escapeHtml(img.url) + '">📋 复制</button>' +
                        '<button class="delete-btn" data-filename="' + escapeHtml(img.filename) + '">🗑️ 删除</button>' +
                    '</div>' +
                '</div>';
            }
            container.innerHTML = html;
            
            document.querySelectorAll('.copy-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    const url = btn.dataset.url;
                    try {
                        await navigator.clipboard.writeText(url);
                        const original = btn.textContent;
                        btn.textContent = '✓ 已复制';
                        setTimeout(() => btn.textContent = original, 1500);
                    } catch (err) {
                        alert('复制失败，请手动复制');
                    }
                };
            });
            
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    const filename = btn.dataset.filename;
                    if (!confirm('确定删除图片 "' + filename + '" 吗？\\n\\n⚠️ 警告：删除后文章中的图片将无法显示！')) return;
                    
                    try {
                        const res = await fetch('/api/images', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ filename: filename }),
                            credentials: 'include'
                        });
                        const result = await res.json();
                        if (result.code === 200) {
                            alert('✅ 删除成功');
                            loadImages();
                        } else {
                            alert('❌ 删除失败: ' + (result.message || '未知错误'));
                        }
                    } catch (err) {
                        alert('❌ 删除失败: ' + err.message);
                    }
                };
            });
        } else {
            container.innerHTML = '<div class="empty">❌ ' + (data.message || '加载失败') + '</div>';
        }
    } catch (e) {
        console.error('加载失败:', e);
        container.innerHTML = '<div class="empty">❌ 网络错误: ' + e.message + '</div>';
    }
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

document.getElementById('refreshBtn').onclick = loadImages;
loadImages();
</script>
</body>
</html>`, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}
