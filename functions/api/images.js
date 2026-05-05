// functions/api/images.js - 使用缓存列表方式
export async function onRequest({ request, env }) {
    const url = new URL(request.url);
    
    // 处理上传
    if (request.method === 'POST') {
        try {
            const formData = await request.formData();
            const file = formData.get('image');
            
            if (!file || !file.type.startsWith('image/')) {
                return new Response(JSON.stringify({ code: 400, message: '请选择图片文件' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            const bytes = new Uint8Array(await file.arrayBuffer());
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            
            const ext = file.type.split('/')[1] || 'jpg';
            const filename = Date.now() + '.' + ext;
            
            // 保存图片
            await NAV_KV.put(`img:${filename}`, `data:${file.type};base64,${base64}`);
            
            // 更新图片列表
            let imageList = [];
            const existingList = await NAV_KV.get('image_list');
            if (existingList) {
                try {
                    imageList = JSON.parse(existingList);
                } catch(e) {}
            }
            imageList.unshift({ filename: filename, url: '/api/image/' + filename, time: Date.now() });
            await NAV_KV.put('image_list', JSON.stringify(imageList));
            
            return new Response(JSON.stringify({ code: 200, message: '上传成功', url: '/api/image/' + filename }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 处理删除
    if (request.method === 'DELETE') {
        try {
            const body = await request.json();
            const filename = body.filename;
            if (!filename) {
                return new Response(JSON.stringify({ code: 400, message: '缺少文件名' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // 删除图片
            await NAV_KV.delete(`img:${filename}`);
            
            // 从列表中移除
            const existingList = await NAV_KV.get('image_list');
            if (existingList) {
                let imageList = JSON.parse(existingList);
                imageList = imageList.filter(img => img.filename !== filename);
                await NAV_KV.put('image_list', JSON.stringify(imageList));
            }
            
            return new Response(JSON.stringify({ code: 200, message: '删除成功' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // GET 请求 - 返回管理页面
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
        .header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:16px 20px;border-radius:12px;margin-bottom:20px}
        .header h1{font-size:20px}
        .card{background:white;border-radius:12px;padding:20px}
        .btn{background:#667eea;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;margin-right:10px}
        .btn-green{background:#38a169}
        .stats{font-size:13px;color:#666;display:inline-block;margin-left:10px}
        .image-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:15px;margin-top:20px}
        .image-card{background:#f8fafc;border-radius:10px;padding:10px;border:1px solid #e2e8f0}
        .image-card img{width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px}
        .filename{font-size:10px;color:#666;word-break:break-all;margin-bottom:8px}
        .actions{display:flex;gap:6px}
        .actions button{flex:1;padding:5px;border-radius:5px;cursor:pointer;font-size:10px;border:none}
        .copy-btn{background:#667eea;color:white}
        .delete-btn{background:#e53e3e;color:white}
        .loading{text-align:center;padding:50px;color:#999}
        .info{background:#e6f7ff;border:1px solid #91d5ff;padding:10px;border-radius:8px;margin-bottom:15px;font-size:13px}
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>KV 图片管理</h1>
    </div>
    <div class="card">
        <div class="info">上传图片 | 复制链接用于文章封面 | 删除图片</div>
        <div>
            <button class="btn" id="refreshBtn">刷新</button>
            <button class="btn btn-green" id="uploadBtn">上传图片</button>
            <span id="stats" class="stats"></span>
        </div>
        <input type="file" id="fileInput" accept="image/*" style="display:none">
        <div id="imageList" class="image-grid"><div class="loading">加载中...</div></div>
    </div>
</div>
<script>
async function loadImages() {
    var container = document.getElementById('imageList');
    var statsDiv = document.getElementById('stats');
    container.innerHTML = '<div class="loading">加载中...</div>';
    
    try {
        var res = await fetch('/api/images?action=list');
        var data = await res.json();
        
        if (data.code === 200) {
            var images = data.data || [];
            
            if (images.length === 0) {
                statsDiv.innerText = '';
                container.innerHTML = '<div class="loading">暂无图片，点击「上传图片」添加</div>';
                return;
            }
            
            statsDiv.innerText = '共 ' + images.length + ' 张';
            
            var html = '';
            for (var j = 0; j < images.length; j++) {
                var img = images[j];
                var displayName = img.filename.length > 28 ? img.filename.substring(0, 25) + '...' : img.filename;
                html += '<div class="image-card">' +
                    '<img src="' + img.url + '">' +
                    '<div class="filename" title="' + img.filename + '"> ' + displayName + '</div>' +
                    '<div class="actions">' +
                        '<button class="copy-btn" data-url="' + img.url + '">复制</button>' +
                        '<button class="delete-btn" data-filename="' + img.filename + '">删除</button>' +
                    '</div>' +
                '</div>';
            }
            container.innerHTML = html;
            
            var copyBtns = document.querySelectorAll('.copy-btn');
            for (var k = 0; k < copyBtns.length; k++) {
                copyBtns[k].onclick = function() {
                    var url = this.dataset.url;
                    navigator.clipboard.writeText(url);
                    this.textContent = '已复制';
                    var self = this;
                    setTimeout(function() { self.textContent = '复制'; }, 1500);
                };
            }
            
            var deleteBtns = document.querySelectorAll('.delete-btn');
            for (var m = 0; m < deleteBtns.length; m++) {
                deleteBtns[m].onclick = async function() {
                    var filename = this.dataset.filename;
                    if (!confirm('确定删除这张图片？')) return;
                    var res = await fetch('/api/images', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filename: filename })
                    });
                    var result = await res.json();
                    if (result.code === 200) {
                        alert('删除成功');
                        loadImages();
                    } else {
                        alert('删除失败');
                    }
                };
            }
        } else {
            container.innerHTML = '<div class="loading">加载失败: ' + (data.message || '未知错误') + '</div>';
        }
    } catch (e) {
        container.innerHTML = '<div class="loading">加载失败: ' + e.message + '</div>';
    }
}

// 获取列表的 API 端点
async function getImageList() {
    var existingList = await NAV_KV.get('image_list');
    if (existingList) {
        return JSON.parse(existingList);
    }
    return [];
}

// 注册 API 路由
if (url.searchParams.get('action') === 'list') {
    var images = await getImageList();
    return new Response(JSON.stringify({ code: 200, data: images }));
}

document.getElementById('refreshBtn').onclick = loadImages;
document.getElementById('uploadBtn').onclick = function() {
    document.getElementById('fileInput').click();
};
document.getElementById('fileInput').onchange = async function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var formData = new FormData();
    formData.append('image', file);
    var btn = document.getElementById('uploadBtn');
    btn.textContent = '上传中...';
    btn.disabled = true;
    try {
        var res = await fetch('/api/images', { method: 'POST', body: formData });
        var data = await res.json();
        if (data.code === 200) {
            alert('上传成功');
            await loadImages();
        } else {
            alert('上传失败: ' + data.message);
        }
    } catch (err) {
        alert('上传失败: ' + err.message);
    } finally {
        btn.textContent = '上传图片';
        btn.disabled = false;
        e.target.value = '';
    }
};
loadImages();
</script>
</body>
</html>`, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}
