// functions/api/images.js - 完全干净版
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
            
            if (file.size > 2 * 1024 * 1024) {
                return new Response(JSON.stringify({ code: 400, message: '图片不能超过2MB' }), {
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
            
            await NAV_KV.put('img:' + filename, 'data:' + file.type + ';base64,' + base64);
            
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
    
    // 删除单张图片
    if (request.method === 'DELETE' && !url.searchParams.get('all') && !url.searchParams.get('clear')) {
        try {
            const body = await request.json();
            const filename = body.filename;
            
            await NAV_KV.delete('img:' + filename);
            
            const existingList = await NAV_KV.get('image_urls');
            if (existingList) {
                let imageList = JSON.parse(existingList);
                imageList = imageList.filter(function(img) { return img.filename !== filename; });
                await NAV_KV.put('image_urls', JSON.stringify(imageList));
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
    
    // 清空所有图片
    if (request.method === 'DELETE' && url.searchParams.get('all') === '1') {
        try {
            const existingList = await NAV_KV.get('image_urls');
            if (existingList) {
                const imageList = JSON.parse(existingList);
                for (let i = 0; i < imageList.length; i++) {
                    try { await NAV_KV.delete('img:' + imageList[i].filename); } catch(e) {}
                }
            }
            await NAV_KV.put('image_urls', JSON.stringify([]));
            
            return new Response(JSON.stringify({ code: 200, message: '已清空所有图片' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 清空所有KV数据
    if (request.method === 'DELETE' && url.searchParams.get('clear') === '1') {
        try {
            const existingList = await NAV_KV.get('image_urls');
            if (existingList) {
                const imageList = JSON.parse(existingList);
                for (let i = 0; i < imageList.length; i++) {
                    try { await NAV_KV.delete('img:' + imageList[i].filename); } catch(e) {}
                }
            }
            await NAV_KV.put('image_urls', JSON.stringify([]));
            
            const keysToDelete = ['blog_posts', 'sites', 'site_title', 'site_subtitle', 'site_logo', 'site_logo_link', 'header_bg', 'cn_link', 'admin_username', 'admin_password'];
            for (let i = 0; i < keysToDelete.length; i++) {
                try { await NAV_KV.delete(keysToDelete[i]); } catch(e) {}
            }
            
            return new Response(JSON.stringify({ code: 200, message: '已清空主要KV数据' }), {
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
    
    // 管理页面 - 使用字符串拼接避免模板字符串问题
    var html = '<!DOCTYPE html>\n';
    html += '<html><head><meta charset="UTF-8"><title>图片管理</title>\n';
    html += '<style>\n';
    html += '*{margin:0;padding:0;box-sizing:border-box}\n';
    html += 'body{font-family:system-ui;background:#f0f2f5;padding:20px}\n';
    html += '.container{max-width:1000px;margin:0 auto}\n';
    html += '.card{background:white;border-radius:12px;padding:20px;margin-bottom:20px}\n';
    html += 'button{background:#667eea;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;margin-right:10px;margin-bottom:10px}\n';
    html += '.btn-green{background:#38a169}\n';
    html += '.btn-red{background:#e53e3e}\n';
    html += '.btn-orange{background:#ed8936}\n';
    html += '.image-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:15px;margin-top:20px}\n';
    html += '.image-card{background:#f8fafc;border-radius:8px;padding:10px;border:1px solid #ddd}\n';
    html += '.image-card img{width:100%;height:100px;object-fit:cover;border-radius:6px}\n';
    html += '.filename{font-size:10px;word-break:break-all;margin:8px 0}\n';
    html += 'button.small{padding:4px 8px;font-size:11px;margin:2px}\n';
    html += '.delete-btn{background:#e53e3e}\n';
    html += '.loading{text-align:center;padding:40px;color:#999}\n';
    html += '.danger-zone{background:#fff5f5;border:1px solid #feb2b2;border-radius:8px;padding:15px;margin-top:20px}\n';
    html += '.danger-zone h3{color:#c53030}\n';
    html += '.info{background:#e6f7ff;border:1px solid #91d5ff;border-radius:8px;padding:12px;margin-bottom:15px;font-size:13px}\n';
    html += '</style>\n';
    html += '</head><body>\n';
    html += '<div class="container">\n';
    html += '<div class="card">\n';
    html += '<h2>图片管理</h2>\n';
    html += '<div class="info">\n';
    html += '提示:<br>\n';
    html += '- 上传图片会自动加入列表<br>\n';
    html += '- 点击复制链接获取图片URL<br>\n';
    html += '- 点击删除可移除单张图片<br>\n';
    html += '- 清理未使用图片会删除未被文章引用的图片(安全)\n';
    html += '</div>\n';
    html += '<div>\n';
    html += '<button id="uploadBtn" class="btn-green">上传图片</button>\n';
    html += '<button id="refreshBtn">刷新列表</button>\n';
    html += '<button id="cleanUnusedBtn" class="btn-orange">清理未使用图片</button>\n';
    html += '<button id="clearImagesBtn" class="btn-red">清空所有图片</button>\n';
    html += '<span id="stats" style="margin-left:10px"></span>\n';
    html += '</div>\n';
    html += '<input type="file" id="fileInput" accept="image/*" style="display:none">\n';
    html += '<div id="imageList" class="image-grid"><div class="loading">加载中...</div></div>\n';
    html += '</div>\n';
    html += '<div class="danger-zone">\n';
    html += '<h3>危险操作区</h3>\n';
    html += '<p>清空所有KV数据将删除：文章、书签、图片、站点设置、管理员密码等所有数据！</p>\n';
    html += '<button id="clearAllDataBtn" class="btn-red">清空所有KV数据</button>\n';
    html += '</div>\n';
    html += '</div>\n';
    html += '<script>\n';
    html += 'async function loadImages(){\n';
    html += 'var c=document.getElementById("imageList"),s=document.getElementById("stats");\n';
    html += 'c.innerHTML="<div class=\"loading\">加载中...</div>";\n';
    html += 'try{var r=await fetch("/api/images?list=1"),d=await r.json();\n';
    html += 'if(d.code===200&&d.data.length>0){\n';
    html += 's.innerText="共 "+d.data.length+" 张";\n';
    html += 'var html="";\n';
    html += 'for(var i=0;i<d.data.length;i++){\n';
    html += 'var img=d.data[i],name=img.filename.length>25?img.filename.substring(0,22)+"...":img.filename;\n';
    html += 'html+="<div class=\"image-card\"><img src=\""+img.url+"\"><div class=\"filename\" title=\""+img.filename+"\">"+name+"</div><div class=\"actions\"><button class=\"small copy-btn\" data-url=\""+img.url+"\">复制</button><button class=\"small delete-btn\" data-filename=\""+img.filename+"\">删除</button></div></div>";\n';
    html += '}\n';
    html += 'c.innerHTML=html;\n';
    html += 'document.querySelectorAll(".copy-btn").forEach(function(btn){btn.onclick=function(){navigator.clipboard.writeText(this.dataset.url);this.textContent="已复制";var self=this;setTimeout(function(){self.textContent="复制";},1500);};});\n';
    html += 'document.querySelectorAll(".delete-btn").forEach(function(btn){btn.onclick=async function(){if(!confirm("确定删除这张图片？"))return;var res=await fetch("/api/images",{method:"DELETE",body:JSON.stringify({filename:this.dataset.filename}),headers:{"Content-Type":"application/json"}});var data=await res.json();if(data.code===200){alert("删除成功");loadImages();}else{alert("删除失败");}};});\n';
    html += '}else{c.innerHTML="<div class=\"loading\">暂无图片</div>";s.innerText="";}\n';
    html += '}catch(e){c.innerHTML="<div class=\"loading\">加载失败</div>";}}\n';
    html += 'document.getElementById("cleanUnusedBtn").onclick=async function(){\n';
    html += 'if(!confirm("扫描并删除未被任何文章引用的图片？"))return;\n';
    html += 'var btn=this,originalText=btn.textContent;\n';
    html += 'btn.textContent="扫描中...";btn.disabled=true;\n';
    html += 'try{var scanRes=await fetch("/api/referenced-images");var scanData=await scanRes.json();\n';
    html += 'if(scanData.code!==200){alert("扫描失败");return;}\n';
    html += 'if(scanData.unused===0){alert("没有未使用的图片\\n总图片:"+scanData.total+"张\\n引用中:"+scanData.referenced+"张");return;}\n';
    html += 'if(!confirm("发现 "+scanData.unused+" 张未使用的图片\\n总图片:"+scanData.total+"张\\n引用中:"+scanData.referenced+"张\\n确定删除？"))return;\n';
    html += 'btn.textContent="清理中...";\n';
    html += 'var cleanRes=await fetch("/api/clean-unused-images",{method:"POST"});\n';
    html += 'var cleanData=await cleanRes.json();\n';
    html += 'if(cleanData.code===200){alert("清理完成！\\n总图片:"+cleanData.total+"张\\n引用中:"+cleanData.referenced+"张\\n已删除:"+cleanData.deleted+"张");loadImages();}else{alert("清理失败");}\n';
    html += '}catch(err){alert("操作失败");}finally{btn.textContent=originalText;btn.disabled=false;}\n';
    html += '};\n';
    html += 'document.getElementById("uploadBtn").onclick=function(){document.getElementById("fileInput").click();};\n';
    html += 'document.getElementById("fileInput").onchange=async function(e){var f=e.target.files[0];if(!f)return;var fd=new FormData();fd.append("image",f);var btn=document.getElementById("uploadBtn");btn.textContent="上传中...";btn.disabled=true;try{var r=await fetch("/api/images",{method:"POST",body:fd});var d=await r.json();if(d.code===200){alert("上传成功");loadImages();}else{alert("上传失败");}}catch(err){alert("上传失败");}finally{btn.textContent="上传图片";btn.disabled=false;e.target.value="";}};\n';
    html += 'document.getElementById("refreshBtn").onclick=loadImages;\n';
    html += 'document.getElementById("clearImagesBtn").onclick=async function(){if(!confirm("清空所有图片？"))return;var res=await fetch("/api/images?all=1",{method:"DELETE"});var data=await res.json();alert(data.message);loadImages();};\n';
    html += 'document.getElementById("clearAllDataBtn").onclick=async function(){if(!confirm("清空所有KV数据？输入确认删除"))return;if(prompt("请输入确认删除")!=="确认删除")return;var res=await fetch("/api/images?clear=1",{method:"DELETE"});var data=await res.json();alert(data.message);loadImages();};\n';
    html += 'loadImages();\n';
    html += '</script>\n';
    html += '</body></html>';
    
    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}
