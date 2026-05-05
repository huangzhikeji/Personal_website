// functions/images-manage.js - 简化测试版本
export async function onRequest({ request, env }) {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/admin_token=([^;]+)/);
    let isLoggedIn = false;
    
    if (match) {
        const session = await NAV_KV.get(`session:${match[1]}`);
        isLoggedIn = session !== null;
    }
    
    if (!isLoggedIn) {
        return new Response('请先登录后台', { 
            status: 401,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
    
    return new Response(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>图片管理</title>
    <style>
        body{font-family:system-ui;padding:20px}
        .container{max-width:800px;margin:0 auto}
        button{padding:8px 16px;margin:5px;cursor:pointer}
        .image-card{border:1px solid #ddd;padding:10px;margin:10px 0;border-radius:8px}
        img{max-width:100px;max-height:100px}
        .success{color:green}
        .error{color:red}
    </style>
</head>
<body>
<div class="container">
    <h1>🖼️ KV 图片管理</h1>
    <button id="refreshBtn">刷新列表</button>
    <button id="clearAllBtn">清空所有</button>
    <div id="stats"></div>
    <div id="imageList"></div>
</div>

<script>
async function loadImages() {
    const container = document.getElementById('imageList');
    const stats = document.getElementById('stats');
    
    container.innerHTML = '加载中...';
    
    try {
        const res = await fetch('/api/images-manage', { credentials: 'include' });
        const data = await res.json();
        
        if (data.code === 200) {
            stats.innerHTML = '共 ' + data.total + ' 张图片';
            
            if (data.data.length === 0) {
                container.innerHTML = '暂无图片';
                return;
            }
            
            let html = '';
            for (const img of data.data) {
                html += '<div class="image-card">';
                html += '<img src="' + img.url + '" onerror="this.style.display=\'none\'">';
                html += '<div><strong>' + img.filename + '</strong></div>';
                html += '<button class="copy-btn" data-url="' + img.url + '">复制链接</button>';
                html += '<button class="delete-btn" data-filename="' + img.filename + '">删除</button>';
                html += '</div>';
            }
            container.innerHTML = html;
            
            document.querySelectorAll('.copy-btn').forEach(btn => {
                btn.onclick = () => {
                    navigator.clipboard.writeText(btn.dataset.url);
                    btn.textContent = '已复制';
                    setTimeout(() => btn.textContent = '复制链接', 2000);
                };
            });
            
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.onclick = async () => {
                    if (!confirm('确定删除？')) return;
                    const res = await fetch('/api/images-manage', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filename: btn.dataset.filename }),
                        credentials: 'include'
                    });
                    const data = await res.json();
                    if (data.code === 200) {
                        alert('删除成功');
                        loadImages();
                    } else {
                        alert('删除失败: ' + data.message);
                    }
                };
            });
        } else {
            container.innerHTML = '加载失败: ' + data.message;
        }
    } catch (e) {
        container.innerHTML = '加载失败: ' + e.message;
    }
}

document.getElementById('refreshBtn').onclick = loadImages;
document.getElementById('clearAllBtn').onclick = async () => {
    if (!confirm('确定清空所有图片？')) return;
    const res = await fetch('/api/images-manage', { credentials: 'include' });
    const data = await res.json();
    if (data.data && data.data.length > 0) {
        for (const img of data.data) {
            await fetch('/api/images-manage', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: img.filename }),
                credentials: 'include'
            });
        }
        alert('清空完成');
        loadImages();
    } else {
        alert('没有图片');
    }
};

loadImages();
</script>
</body>
</html>`, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}
