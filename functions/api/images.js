// functions/api/images.js - 增强版（添加全局初始化解决冷启动超时）
let isInitialized = false;

async function globalInit() {
    if (isInitialized) return;
    try {
        // 预热操作：预先连接 KV
        await NAV_KV.get('image_urls');
        console.log('KV 预热完成');
    } catch(e) {
        console.log('KV 预热失败', e);
    }
    isInitialized = true;
}

export async function onRequest({ request, env }) {
    const url = new URL(request.url);
    
    // 确保初始化完成
    await globalInit();
    
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
    
    // 清空所有KV数据 - 增强版
    if (request.method === 'DELETE' && url.searchParams.get('clear') === '1') {
        try {
            // 1. 清空图片列表中的图片
            const existingList = await NAV_KV.get('image_urls');
            if (existingList) {
                const imageList = JSON.parse(existingList);
                for (let i = 0; i < imageList.length; i++) {
                    try { await NAV_KV.delete('img:' + imageList[i].filename); } catch(e) {}
                }
            }
            await NAV_KV.put('image_urls', JSON.stringify([]));
            
            // 2. 扫描并删除所有 img: 开头的 key
            try {
                let cursor = null;
                let hasMore = true;
                while (hasMore) {
                    const listResult = await NAV_KV.list({ prefix: 'img:', cursor: cursor, limit: 100 });
                    if (listResult && listResult.keys) {
                        for (let i = 0; i < listResult.keys.length; i++) {
                            try { await NAV_KV.delete(listResult.keys[i].name); } catch(e) {}
                        }
                    }
                    cursor = listResult.cursor;
                    hasMore = !!cursor;
                }
            } catch(e) {}
            
            // 3. 删除所有已知的固定key
            const keysToDelete = [
                'blog_posts', 'sites', 'site_title', 'site_subtitle',
                'site_logo', 'site_logo_link', 'header_bg', 'cn_link',
                'admin_username', 'admin_password'
            ];
            for (let i = 0; i < keysToDelete.length; i++) {
                try { await NAV_KV.delete(keysToDelete[i]); } catch(e) {}
            }
            
            // 4. 扫描并删除所有 session: 开头的 key
            try {
                let cursor = null;
                let hasMore = true;
                while (hasMore) {
                    const listResult = await NAV_KV.list({ prefix: 'session:', cursor: cursor, limit: 100 });
                    if (listResult && listResult.keys) {
                        for (let i = 0; i < listResult.keys.length; i++) {
                            try { await NAV_KV.delete(listResult.keys[i].name); } catch(e) {}
                        }
                    }
                    cursor = listResult.cursor;
                    hasMore = !!cursor;
                }
            } catch(e) {}
            
            // 5. 扫描并删除所有 views: 开头的 key
            try {
                let cursor = null;
                let hasMore = true;
                while (hasMore) {
                    const listResult = await NAV_KV.list({ prefix: 'views:', cursor: cursor, limit: 100 });
                    if (listResult && listResult.keys) {
                        for (let i = 0; i < listResult.keys.length; i++) {
                            try { await NAV_KV.delete(listResult.keys[i].name); } catch(e) {}
                        }
                    }
                    cursor = listResult.cursor;
                    hasMore = !!cursor;
                }
            } catch(e) {}
            
            return new Response(JSON.stringify({ code: 200, message: '已彻底清空所有KV数据' }), {
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
<head><meta charset="UTF-8"><title>图片管理</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui;background:#f0f2f5;padding:20px}
.container{max-width:1000px;margin:0 auto}
.card{background:white;border-radius:12px;padding:20px;margin-bottom:20px}
button{background:#667eea;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;margin-right:10px;margin-bottom:10px}
.btn-green{background:#38a169}
.btn-red{background:#e53e3e}
.btn-orange{background:#ed8936}
.image-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:15px;margin-top:20px}
.image-card{background:#f8fafc;border-radius:8px;padding:10px;border:1px solid #ddd}
.image-card img{width:100%;height:100px;object-fit:cover;border-radius:6px}
.filename{font-size:10px;word-break:break-all;margin:8px 0}
button.small{padding:4px 8px;font-size:11px;margin:2px}
.delete-btn{background:#e53e3e}
.loading{text-align:center;padding:40px;color:#999}
.danger-zone{background:#fff5f5;border:1px solid #feb2b2;border-radius:8px;padding:15px;margin-top:20px}
.danger-zone h3{color:#c53030}
.info{background:#e6f7ff;border:1px solid #91d5ff;border-radius:8px;padding:12px;margin-bottom:15px;font-size:13px}
</style>
</head>
<body>
<div class="container">
<div class="card">
<h2>图片管理</h2>
<div class="info">
提示:<br>
- 上传图片会自动加入列表<br>
- 点击复制链接获取图片URL<br>
- 点击删除可移除单张图片<br>
- 清理未使用图片会删除未被文章引用的图片(安全)
</div>
<div>
<button id="uploadBtn" class="btn-green">上传图片</button>
<button id="refreshBtn">刷新列表</button>
<button id="cleanUnusedBtn" class="btn-orange">清理未使用图片</button>
<button id="clearImagesBtn" class="btn-red">清空所有图片</button>
<span id="stats" style="margin-left:10px"></span>
</div>
<input type="file" id="fileInput" accept="image/*" style="display:none">
<div id="imageList" class="image-grid"><div class="loading">加载中...</div></div>
<script>
async function loadImages(){
var c=document.getElementById('imageList');
var s=document.getElementById('stats');
c.innerHTML='<div class="loading">加载中...</div>';
try{
var r=await fetch('/api/images?list=1');
var d=await r.json();
if(d.code===200 && d.data.length>0){
s.innerText='共 '+d.data.length+' 张';
var html='';
for(var i=0;i<d.data.length;i++){
var img=d.data[i];
var name=img.filename.length>25?img.filename.substring(0,22)+'...':img.filename;
html=html+'<div class="image-card">'+
'<img src="'+img.url+'">'+
'<div class="filename" title="'+img.filename+'">'+name+'</div>'+
'<div class="actions">'+
'<button class="small copy-btn" data-url="'+img.url+'">复制</button>'+
'<button class="small delete-btn" data-filename="'+img.filename+'">删除</button>'+
'</div></div>';
}
c.innerHTML=html;
var copyBtns=document.querySelectorAll('.copy-btn');
for(var j=0;j<copyBtns.length;j++){
copyBtns[j].onclick=function(){
navigator.clipboard.writeText(this.dataset.url);
this.textContent='已复制';
var self=this;
setTimeout(function(){self.textContent='复制';},1500);
};
}
var delBtns=document.querySelectorAll('.delete-btn');
for(var k=0;k<delBtns.length;k++){
delBtns[k].onclick=async function(){
if(!confirm('确定删除这张图片？')) return;
var res=await fetch('/api/images',{
method:'DELETE',
body:JSON.stringify({filename:this.dataset.filename}),
headers:{'Content-Type':'application/json'}
});
var data=await res.json();
if(data.code===200){
alert('删除成功');
loadImages();
}else{
alert('删除失败');
}
};
}
}else{
c.innerHTML='<div class="loading">暂无图片</div>';
s.innerText='';
}
}catch(e){
c.innerHTML='<div class="loading">加载失败</div>';
}
}
// 清理未使用图片
document.getElementById('cleanUnusedBtn').onclick=async function(){
if(!confirm('扫描并删除未被任何文章引用的图片？\\n\\n此操作不会删除文章正在使用的图片。'))return;
var btn=this;
var originalText=btn.textContent;
btn.textContent='扫描中...';
btn.disabled=true;
try{
var scanRes=await fetch('/api/referenced-images');
var scanData=await scanRes.json();
if(scanData.code!==200){alert('扫描失败');return;}
if(scanData.unused===0){alert('没有未使用的图片\\n\\n总图片:'+scanData.total+'张\\n引用中:'+scanData.referenced+'张');return;}
if(!confirm('发现 '+scanData.unused+' 张未使用的图片\\n\\n总图片:'+scanData.total+'张\\n引用中:'+scanData.referenced+'张\\n\\n确定删除？'))return;
btn.textContent='清理中...';
var cleanRes=await fetch('/api/clean-unused-images',{method:'POST'});
var cleanData=await cleanRes.json();
if(cleanData.code===200){
alert('清理完成！\\n\\n总图片:'+cleanData.total+'张\\n引用中:'+cleanData.referenced+'张\\n已删除:'+cleanData.deleted+'张');
loadImages();
}else{alert('清理失败');}
}catch(err){alert('操作失败');}
finally{btn.textContent=originalText;btn.disabled=false;}
};
document.getElementById('uploadBtn').onclick=function(){
document.getElementById('fileInput').click();
};
document.getElementById('fileInput').onchange=async function(e){
var f=e.target.files[0];
if(!f) return;
var fd=new FormData();
fd.append('image',f);
var btn=document.getElementById('uploadBtn');
btn.textContent='上传中...';
btn.disabled=true;
try{
var r=await fetch('/api/images',{method:'POST',body:fd});
var d=await r.json();
if(d.code===200){
alert('上传成功');
loadImages();
}else{
alert('上传失败');
}
}catch(err){
alert('上传失败');
}finally{
btn.textContent='上传图片';
btn.disabled=false;
e.target.value='';
}
};
document.getElementById('refreshBtn').onclick=loadImages;
document.getElementById('clearImagesBtn').onclick=async function(){
if(!confirm('清空所有图片？\\n\\n这将删除KV中所有图片文件，文章中的图片将无法显示！'))return;
var res=await fetch('/api/images?all=1',{method:'DELETE'});
var data=await res.json();
alert(data.message);
loadImages();
};
document.getElementById('clearAllDataBtn').onclick=async function(){
if(!confirm('最终确认：这将删除KV存储中的所有数据！\\n\\n包括：\\n- 所有文章\\n- 所有书签\\n- 所有图片\\n- 站点设置\\n- 管理员密码\\n\\n此操作不可恢复！\\n\\n输入"确认删除"以继续'))return;
var input=prompt('请输入"确认删除"');
if(input!=='确认删除')return;
var res=await fetch('/api/images?clear=1',{method:'DELETE'});
var data=await res.json();
alert(data.message);
loadImages();
};
loadImages();
</script>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
