// functions/api/images.js - 稳定版
export async function onRequest({ request, env }) {
    const url = new URL(request.url);
    
    // 上传图片
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
            
            // 保存图片到 KV
            await NAV_KV.put(`img:${filename}`, `data:${file.type};base64,${base64}`);
            
            // 更新图片列表
            let imageList = [];
            const existingList = await NAV_KV.get('image_urls');
            if (existingList) {
                try { imageList = JSON.parse(existingList); } catch(e) {}
            }
            imageList.unshift({ filename: filename, url: '/api/image/' + filename });
            await NAV_KV.put('image_urls', JSON.stringify(imageList));
            
            return new Response(JSON.stringify({ code: 200, url: '/api/image/' + filename }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 删除图片
    if (request.method === 'DELETE') {
        try {
            const body = await request.json();
            const filename = body.filename;
            
            await NAV_KV.delete('img:' + filename);
            
            const existingList = await NAV_KV.get('image_urls');
            if (existingList) {
                let imageList = JSON.parse(existingList);
                imageList = imageList.filter(img => img.filename !== filename);
                await NAV_KV.put('image_urls', JSON.stringify(imageList));
            }
            
            return new Response(JSON.stringify({ code: 200 }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取图片列表
    if (request.method === 'GET' && url.searchParams.get('list') === '1') {
        try {
            const existingList = await NAV_KV.get('image_urls');
            let images = existingList ? JSON.parse(existingList) : [];
            return new Response(JSON.stringify({ code: 200, data: images }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 管理页面
    return new Response(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>图片管理</title>
    <style>
        body{font-family:system-ui;padding:20px;background:#f0f2f5}
        .container{max-width:1000px;margin:0 auto}
        .card{background:white;border-radius:12px;padding:20px}
        button{background:#667eea;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer}
        .btn-green{background:#38a169}
        .image-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:15px;margin-top:20px}
        .image-card{background:#f8fafc;border-radius:8px;padding:10px;border:1px solid #ddd}
        .image-card img{width:100%;height:100px;object-fit:cover;border-radius:6px}
        .filename{font-size:10px;word-break:break-all;margin:8px 0}
        button.small{padding:4px 8px;font-size:11px;margin:2px}
        .delete-btn{background:#e53e3e}
        .loading{text-align:center;padding:40px;color:#999}
    </style>
</head>
<body>
<div class="container">
    <div class="card">
        <h2>图片管理</h2>
        <button id="uploadBtn" class="btn-green">上传图片</button>
        <button id="refreshBtn">刷新列表</button>
        <span id="stats" style="margin-left:10px"></span>
        <input type="file" id="fileInput" accept="image/*" style="display:none">
        <div id="imageList" class="image-grid"><div class="loading">加载中...</div></div>
    </div>
</div>
<script>
async function loadImages() {
    var container = document.getElementById('imageList');
    var stats = document.getElementById('stats');
    container.innerHTML = '<div class="loading">加载中...</div>';
    try {
        var res = await fetch('/api/images?list=1');
        var data = await res.json();
        if (data.code === 200 && data.data.length > 0) {
            stats.innerText = '共 ' + data.data.length + ' 张';
            var html = '';
            for (var i = 0; i < data.data.length; i++) {
                var img = data.data[i];
                var name = img.filename.length > 25 ? img.filename.substring(0,22)+'...' : img.filename;
                html += '<div class="image-card">' +
                    '<img src="' + img.url + '">' +
                    '<div class="filename" title="' + img.filename + '">' + name + '</div>' +
                    '<button class="small copy-btn" data-url="' + img.url + '">复制链接</button>' +
                    '<button class="small delete-btn" data-filename="' + img.filename + '">删除</button>' +
                '</div>';
            }
            container.innerHTML = html;
            
            var copyBtns = document.querySelectorAll('.copy-btn');
            for (var j = 0; j < copyBtns.length; j++) {
                copyBtns[j].onclick = function() {
                    navigator.clipboard.writeText(this.dataset.url);
                    this.textContent = '已复制';
                    var self = this;
                    setTimeout(function() { self.textContent = '复制链接'; }, 1500);
                };
            }
            
            var delBtns = document.querySelectorAll('.delete-btn');
            for (var k = 0; k < delBtns.length; k++) {
                delBtns[k].onclick = async function() {
                    if (!confirm('确定删除？')) return;
                    var res = await fetch('/api/images', {
                        method: 'DELETE',
                        body: JSON.stringify({ filename: this.dataset.filename }),
                        headers: { 'Content-Type': 'application/json' }
                    });
                    var data = await res.json();
                    if (data.code === 200) {
                        alert('删除成功');
                        loadImages();
                    } else {
                        alert('删除失败');
                    }
                };
            }
        } else {
            container.innerHTML = '<div class="loading">暂无图片，点击上传</div>';
            stats.innerText = '';
        }
    } catch(e) {
        container.innerHTML = '<div class="loading">加载失败: ' + e.message + '</div>';
    }
}

document.getElementById('uploadBtn').onclick = function() {
    document.getElementById('fileInput').click();
};
document.getElementById('fileInput').onchange = async function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var fd = new FormData();
    fd.append('image', file);
    var btn = document.getElementById('uploadBtn');
    btn.textContent = '上传中...';
    btn.disabled = true;
    try {
        var res = await fetch('/api/images', { method: 'POST', body: fd });
        var data = await res.json();
        if (data.code === 200) {
            alert('上传成功');
            loadImages();
        } else {
            alert('上传失败');
        }
    } catch(err) {
        alert('上传失败');
    } finally {
        btn.textContent = '上传图片';
        btn.disabled = false;
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
