export async function onRequest({ request, env }) {
    const url = new URL(request.url);
    const slug = decodeURIComponent(url.pathname.replace('/post/', ''));
    if (!slug) return Response.redirect(new URL('/', request.url), 302);
    
    const data = await NAV_KV.get('blog_posts');
    const posts = data ? JSON.parse(data) : [];
    const post = posts.find(p => p.slug === slug);
    
    if (!post || post.status !== 'published') {
        return new Response(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>文章不存在</title><style>body{font-family:system-ui;text-align:center;padding:50px}</style></head><body><h1>404</h1><p>文章不存在</p><a href="/">返回首页</a></body></html>`, { status: 404, headers: { 'Content-Type': 'text/html' } });
    }
    
    // 增加阅读量
    const viewsKey = `views:${post.id}`;
    let views = await NAV_KV.get(viewsKey);
    views = views ? parseInt(views) + 1 : 1;
    await NAV_KV.put(viewsKey, views.toString());
    
    // 相关文章（同分类）
    const related = posts.filter(p => p.id !== post.id && p.status === 'published' && p.category === post.category).slice(0, 3);
    const relatedHtml = related.length ? `<div style="margin-top:40px;padding:20px;background:#f8fafc;border-radius:12px"><h3>📚 相关文章</h3>${related.map(p => `<a href="/post/${p.slug}" style="display:block;margin:10px 0;text-decoration:none">${escapeHtml(p.title)}</a>`).join('')}</div>` : '';
    
    // 生成目录
    let tocHtml = '';
    const headings = [];
    const contentWithIds = post.content.replace(/<h([2-3])>(.*?)<\/h\1>/gi, (match, level, text) => {
        const id = text.replace(/[^\w\u4e00-\u9fa5]+/g, '-').toLowerCase().replace(/^-+|-+$/g, '');
        headings.push({ level, text, id });
        return `<h${level} id="${id}">${text}</h${level}>`;
    });
    if (headings.length) {
        tocHtml = `<div style="background:#f8fafc;padding:15px;border-radius:12px;margin-bottom:25px"><div style="font-weight:600;margin-bottom:10px">📑 目录</div><ul style="list-style:none;padding-left:0">${headings.map(h => `<li style="margin:5px 0;padding-left:${h.level === '3' ? '20px' : '0'}"><a href="#${h.id}" style="color:#667eea;text-decoration:none">${escapeHtml(h.text)}</a></li>`).join('')}</ul></div>`;
    }
    
    const tagsHtml = post.tags?.length ? `<div style="margin:20px 0">${post.tags.map(t => `<span style="background:#e2e8f0;padding:4px 12px;border-radius:20px;font-size:12px;margin-right:8px">🏷️ ${escapeHtml(t)}</span>`).join('')}</div>` : '';
    
    return new Response(`<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(post.title)}</title>
<style>body{font-family:system-ui;background:#f5f5f5;padding:20px;transition:background .3s}.container{max-width:900px;margin:0 auto}.post{background:white;border-radius:20px;padding:40px;box-shadow:0 2px 10px rgba(0,0,0,0.05)}h1{font-size:32px;color:#2d3748}.meta{color:#718096;margin:15px 0;padding-bottom:15px;border-bottom:1px solid #e2e8f0;display:flex;gap:20px;flex-wrap:wrap}.content{line-height:1.8;font-size:16px}.content img{max-width:100%;border-radius:8px;margin:15px 0}.content h2{font-size:24px;margin:25px 0 15px;border-bottom:2px solid #667eea}.content h3{font-size:20px;margin:20px 0 10px}.content pre{background:#f0f0f0;padding:15px;border-radius:8px;overflow-x:auto}.back{display:inline-block;margin-top:30px;color:#667eea;text-decoration:none;padding:10px 20px;background:#edf2f7;border-radius:30px}.dark-mode-toggle{position:fixed;bottom:20px;right:20px;background:#667eea;color:white;border:none;width:50px;height:50px;border-radius:50%;cursor:pointer;font-size:20px}.go-top{position:fixed;bottom:20px;left:20px;background:#667eea;color:white;border:none;width:50px;height:50px;border-radius:50%;cursor:pointer;display:none;font-size:20px}body.dark{background:#1a1a2e}body.dark .post{background:#16213e;color:#eee}body.dark .meta{color:#aaa}body.dark .content pre{background:#0f3460}@media (max-width:768px){.post{padding:20px}h1{font-size:24px}}</style>
</head>
<body><div class="container"><div class="post"><h1>${escapeHtml(post.title)}</h1><div class="meta"><span>📅 ${new Date(post.createdAt).toLocaleDateString()}</span><span>🏷️ ${escapeHtml(post.category || '未分类')}</span><span>👁️ ${views}阅读</span></div>${post.coverImage ? `<img src="${escapeHtml(post.coverImage)}" style="max-width:100%;border-radius:12px;margin-bottom:20px">` : ''}${tocHtml}${tagsHtml}<div class="content">${contentWithIds}</div>${relatedHtml}<a href="/" class="back">← 返回首页</a></div></div>
<button class="dark-mode-toggle" id="darkToggle">🌙</button><button class="go-top" id="goTop">↑</button>
<script>const dark=document.getElementById('darkToggle');if(localStorage.getItem('darkMode')==='true')document.body.classList.add('dark');dark.onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('darkMode',document.body.classList.contains('dark'));dark.textContent=document.body.classList.contains('dark')?'☀️':'🌙';};const goTop=document.getElementById('goTop');window.onscroll=()=>goTop.style.display=window.scrollY>300?'block':'none';goTop.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});document.querySelectorAll('a[href^="#"]').forEach(a=>a.onclick=e=>{e.preventDefault();document.querySelector(a.getAttribute('href'))?.scrollIntoView({behavior:'smooth'});});</script>
</body></html>`, { headers: { 'Content-Type': 'text/html' } });
}
function escapeHtml(s){if(!s)return '';return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'})[m]);}
