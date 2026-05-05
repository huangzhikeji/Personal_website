// 完整的 KV 图片管理工具 - 包含上传、列表、删除功能
export async function onRequest({ request, env }) {
    const url = new URL(request.url);
    
    // ========== 处理图片上传 ==========
    if (request.method === 'POST' && url.pathname === '/api/images') {
        try {
            const formData = await request.formData();
            const file = formData.get('image');
            
            if (!file || !file.type.startsWith('image/')) {
                return new Response(JSON.stringify({ code: 400, message: '请选择图片文件' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            if (file.size > 5 * 1024 * 1024) {
                return new Response(JSON.stringify({ code: 400, message: '图片不能超过5MB' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            const bytes = new Uint8Array(await file.arrayBuffer());
            let binary = '';
            const CHUNK = 8192;
            for (let i = 0; i < bytes.length; i += CHUNK) {
                binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
            }
            const base64 = btoa(binary);
            
            const ext = file.type.split('/')[1] || 'jpg';
            const originalName = file.name.replace(/\.[^/.]+$/, '');
            const cleanName = originalName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '');
            const finalName = cleanName || 'image';
            const filename = `${finalName}_${Date.now()}.${ext}`;
            
            await NAV_KV.put(`img:${filename}`, `data:${file.type};base64,${base64}`);
            
            return new Response(JSON.stringify({ code: 200, message: '上传成功', filename: filename, url: `/api/image/${filename}` }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // ========== 获取图片列表 ==========
    if (request.method === 'GET' && !url.searchParams.get('action')) {
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
            
            return new Response(JSON.stringify({ code: 200, data: images, total: images.length }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // ========== 删除图片 ==========
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
    
    // ========== 返回管理页面 ==========
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
        .card{background:white;border-radius:12px;padding:20px}
        .toolbar{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;align-items:center}
        .btn{background:#667eea;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:14px}
        .btn-green{background:#38a169}
        .stats{font-size:13px;color:#666;margin-left:10px}
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
        .info{background:#e6f7ff;border:1px solid #91d5ff;padding:10px 15px;border-radius:8px;margin-bottom:15px;font-size:13px}
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>🖼️ KV 图片管理</h1>
    </div>
    <div class="card">
        <div class="info">
            💡 提示：<br>
            📤 点击「上传图片」选择本地图片上传到 KV<br>
            📋 点击「复制链接」获取图片 URL<br>
            🗑️ 点击「删除」永久删除图片
        </div>
        <div class="toolbar">
            <button class="btn" id="refreshBtn">🔄 刷新列表</button>
            <button class="btn btn-green" id="uploadBtn">📤 上传图片</button>
            <span id="stats" class="stats"></span>
        </div>
        <input type="file" id="fileInput" accept="image/*" style="display:none">
        <div id="imageList" class="image-grid"><div class="loading">加载中...</div></div>
    </div>
</div>
<script>
const API_URL = '/api/images';

async function loadImages() {
    const container = document.getElementById('imageList');
    const statsDiv = document.getElementById('stats');
    container.innerHTML = '<div class="loading">⏳ 加载中...</div>';
    
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        if (data.code === 200) {
            statsDiv.textContent = data.total === 0 ? '' : '共 ' + data.total + ' 张图片';
            
            if (!data.data || data.data.length === 0) {
                container.innerHTML = '<div class="loading">📭 暂无图片，点击「上传图片」添加</div>';
                return;
            }
            
            let html = '';
            for (const img of data.data) {
                const displayName = img.filename.length > 28 ? img.filename.substring(0, 25) + '...' : img.filename;
                html += '<div class="image-card">' +
                    '<img src="' + escapeHtml(img.url) + '" onerror="this.style.display=\'none\'">' +
                    '<div class="filename" title="' + escapeHtml(img.filename) + '">📄 ' + escapeHtml(displayName) + '</div>' +
                    '<div class="actions">' +
                        '<button class="copy-btn" data-url="' + escapeHtml(img.url) + '">📋 复制</button>' +
                        '<button class="delete-btn" data-filename="' + escapeHtml(img.filename) + '">🗑️ 删除</button>' +
                    '</div>' +
                '</div>';
            }
            container.innerHTML = html;
            
            document.querySelectorAll('.copy-btn').forEach(btn => {
                btn.onclick = async () => {
                    const url = btn.dataset.url;
                    await navigator.clipboard.writeText(url);
                    btn.textContent = '✓ 已复制';
                    setTimeout(() => btn.textContent = '📋 复制', 1500);
                };
            });
            
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.onclick = async () => {
                    if (!confirm('确定删除这张图片吗？\n\n⚠️ 删除后文章中使用的图片将无法显示！')) return;
                    const res = await fetch(API_URL, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filename: btn.dataset.filename })
                    });
                    const result = await res.json();
                    if (result.code === 200) {
                        alert('✅ 删除成功');
                        loadImages();
                    } else {
                        alert('❌ 删除失败: ' + (result.message || '未知错误'));
                    }
                };
            });
        } else {
            container.innerHTML = '<div class="loading">❌ ' + (data.message || '加载失败') + '</div>';
        }
    } catch (e) {
        container.innerHTML = '<div class="loading">❌ 网络错误: ' + e.message + '</div>';
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

document.getElementById('uploadBtn').onclick = () => {
    document.getElementById('fileInput').click();
};

document.getElementById('fileInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    const uploadBtn = document.getElementById('uploadBtn');
    const originalText = uploadBtn.textContent;
    uploadBtn.textContent = '⏳ 上传中...';
    uploadBtn.disabled = true;
    
    try {
        const res = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.code === 200) {
            alert('✅ 上传成功！');
            loadImages();
        } else {
            alert('❌ 上传失败: ' + (data.message || '未知错误'));
        }
    } catch (err) {
        alert('❌ 上传失败: ' + err.message);
    } finally {
        uploadBtn.textContent = originalText;
        uploadBtn.disabled = false;
        e.target.value = '';
    }
};

document.getElementById('refreshBtn').onclick = loadImages;
loadImages();
</script>
</body>
</html>`, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}
