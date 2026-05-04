// EdgeOne Pages - 旭儿导航完整版（修复置顶功能）
export async function onRequest({ env, request }) {
    const url = new URL(request.url);
    const sites = await getSites(env);
    const posts = await getBlogPosts(env);
    const logo = await getLogo(env);
    const logoLink = await getLogoLink(env);
    const headerBg = await getHeaderBg(env);
    const siteTitle = await getSiteTitle(env);
    const siteSubtitle = await getSiteSubtitle(env);
    const cnLink = await getCnLink(env);
    
    const currentTab = url.searchParams.get('tab') || 'blog';
    const searchQuery = url.searchParams.get('q') || '';
    const currentTag = url.searchParams.get('tag') || '';
    const currentCat = url.searchParams.get('c') || '';
    
    const viewsMap = new Map();
    for (const post of posts) {
        const views = await NAV_KV.get(`views:${post.id}`);
        if (views) viewsMap.set(post.id, parseInt(views));
    }
    
    const catMap = new Map();
    sites.forEach(s => {
        const cat = s.catelog || '未分类';
        catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });
    const categories = Array.from(catMap.keys()).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    const filteredSites = currentCat ? sites.filter(s => (s.catelog || '未分类') === currentCat) : sites;
    
    let catNavHtml = categories.map(cat => {
        const activeClass = currentCat === cat ? 'background:#667eea;color:white;font-weight:600' : '';
        return `<a href="/?tab=bookmark&c=${encodeURIComponent(cat)}" class="cat-link" style="display:block;padding:10px 12px;margin:4px 0;border-radius:8px;text-decoration:none;color:#4a5568;transition:all 0.2s;${activeClass}">📁 ${escapeHtml(cat)} <span style="float:right;color:#a0aec0;font-size:12px">${catMap.get(cat)}</span></a>`;
    }).join('');
    
    let cardsHtml = filteredSites.map(s => {
        const name = escapeHtml(s.name || '未命名');
        const url_clean = sanitizeUrl(s.url);
        const logo_clean = s.logo ? sanitizeUrl(s.logo) : '';
        const desc = escapeHtml(s.desc || '暂无描述');
        const cat = escapeHtml(s.catelog || '未分类');
        const initial = (s.name && s.name[0]) || '站';
        return `<div class="site-card"><a href="${url_clean}" target="_blank" style="text-decoration:none;color:inherit;display:block"><div style="display:flex;align-items:center;margin-bottom:12px">${logo_clean ? `<img src="${logo_clean}" style="width:44px;height:44px;border-radius:10px;object-fit:cover;margin-right:14px">` : `<div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:18px;margin-right:14px">${initial}</div>`}<div style="flex:1"><h3 style="font-size:16px;font-weight:600;color:#2d3748;margin-bottom:4px">${name}</h3><span style="font-size:11px;color:#a0aec0;background:#f7fafc;padding:2px 8px;border-radius:12px">${cat}</span></div></div><p style="font-size:13px;color:#718096;margin-bottom:12px;line-height:1.4">${desc}</p><div style="display:flex;justify-content:space-between"><span style="font-size:11px;color:#a0aec0">${url_clean.replace(/^https?:\/\//, '').substring(0,30)}</span><button class="copy-btn" data-url="${url_clean}" style="background:#edf2f7;border:none;padding:5px 14px;border-radius:20px;font-size:11px;cursor:pointer">复制</button></div></a></div>`;
    }).join('');
    
    let blogPosts = posts.filter(p => p.status === 'published');
    if (searchQuery) {
        blogPosts = blogPosts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || (p.content && p.content.toLowerCase().includes(searchQuery.toLowerCase())));
    }
    if (currentTag) {
        blogPosts = blogPosts.filter(p => p.tags && p.tags.some(t => t.toLowerCase() === currentTag.toLowerCase()));
    }
    
    // 确保 pinned 是布尔值，然后排序（置顶文章排前面）
    blogPosts = blogPosts.map(p => ({ ...p, pinned: p.pinned === true || p.pinned === 'true' }));
    blogPosts.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    const tagMap = new Map();
    blogPosts.forEach(post => {
        if (post.tags) post.tags.forEach(tag => tagMap.set(tag, (tagMap.get(tag) || 0) + 1));
    });
    const tagCloudHtml = Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([tag, count]) => {
        const size = Math.min(24, 12 + count * 2);
        return `<a href="/?tab=blog&tag=${encodeURIComponent(tag)}" style="display:inline-block;margin:4px;padding:4px 12px;background:#f0f0f0;border-radius:20px;text-decoration:none;color:#667eea;font-size:${size}px">${escapeHtml(tag)}(${count})</a>`;
    }).join('');
    
let blogListHtml = blogPosts.map(post => {
    const views = viewsMap.get(post.id) || 0;
    return `<div class="blog-card" onclick="location.href='/post/${post.slug}'"><div style="display:flex;justify-content:space-between"><div><h3>${escapeHtml(post.title)}</h3><div style="display:flex;gap:16px;margin:8px 0;font-size:12px;color:#a0aec0"><span>📅 ${new Date(post.createdAt).toLocaleDateString()}</span><span>🏷️ ${escapeHtml(post.category || '未分类')}</span><span>👁️ ${views}阅读</span></div><p>${escapeHtml(post.excerpt || (post.content || '').substring(0, 100).replace(/<[^>]*>/g, ''))}...</p></div>${post.coverImage ? `<img src="${escapeHtml(post.coverImage)}" style="width:100px;height:80px;object-fit:cover;border-radius:8px">` : ''}</div></div>`;
}).join('');
    if (!blogListHtml) blogListHtml = '<div style="text-align:center;padding:60px">暂无文章</div>';
    
    const hotPosts = [...blogPosts].sort((a, b) => (viewsMap.get(b.id) || 0) - (viewsMap.get(a.id) || 0)).slice(0, 5);
    const hotPostsHtml = hotPosts.map(p => `<a href="/post/${p.slug}" style="display:block;padding:8px 12px;margin:4px 0;border-radius:8px;text-decoration:none;color:#4a5568;font-size:13px;background:#f8fafc">🔥 ${escapeHtml(p.title.length > 18 ? p.title.substring(0,18)+'...' : p.title)} <span style="float:right">${viewsMap.get(p.id) || 0}阅</span></a>`).join('');
    
    let logoHtml = '';
    if (logo) {
        if (logoLink) {
            logoHtml = `<a href="${escapeHtml(logoLink)}" target="_blank"><img src="${escapeHtml(logo)}" style="max-width:200px;max-height:240px"></a>`;
        } else {
            logoHtml = `<img src="${escapeHtml(logo)}" style="max-width:200px;max-height:240px">`;
        }
    } else {
        logoHtml = `<div style="font-size:28px;font-weight:bold;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent">${escapeHtml(siteTitle || '旭儿导航')}</div>`;
    }
    
    const title = currentTab === 'blog' ? (searchQuery ? `搜索: ${escapeHtml(searchQuery)}` : '博客文章') : (currentCat ? `${escapeHtml(currentCat)} · ${filteredSites.length}个网站` : `全部收藏 · ${sites.length}个网站`);
    
    return new Response(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(siteTitle || '旭儿导航可自定义LOGO')} · ${currentTab === 'blog' ? '博客' : '书签'}</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:system-ui;background:#f7fafc;transition:background 0.3s}
        .sidebar{position:fixed;left:0;top:0;width:280px;height:100vh;background:white;box-shadow:2px 0 12px rgba(0,0,0,0.05);overflow-y:auto;z-index:100;transition:transform 0.3s}
        .sidebar-header{padding:20px;text-align:center;border-bottom:1px solid #e2e8f0}
        .sidebar-nav{padding:20px}
        .main{margin-left:280px;min-height:100vh}
        .header{position:relative;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:50px 40px 50px 60px;text-align:left;overflow:hidden}
        .header-bg-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
        .header-content{position:relative;z-index:2}
        .header h1{font-size:42px;margin-bottom:12px;display:inline-block;margin-right:20px}
        .cn-btn{display:inline-block;background:rgba(255,255,255,0.2);color:white;padding:8px 20px;border-radius:30px;text-decoration:none;font-size:16px;vertical-align:middle}
        .cn-btn:hover{background:rgba(255,255,255,0.3)}
        .content{max-width:1300px;margin:0 auto;padding:35px 30px}
        .content-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:25px;flex-wrap:wrap}
        .content-header h2{font-size:22px;color:#2d3748}
        .tab-buttons{display:flex;gap:10px}
        .tab-btn{padding:8px 20px;border:none;border-radius:30px;cursor:pointer}
        .tab-btn.active{background:#667eea;color:white}
        .tab-btn:not(.active){background:#e2e8f0}
        .sites-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:24px}
        .site-card,.blog-card{background:white;border-radius:12px;padding:16px;margin-bottom:20px;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s}
        .site-card:hover,.blog-card:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,0.1)}
        .search-box{margin-bottom:20px}
        .search-box input{width:100%;padding:12px 16px;border:1px solid #ddd;border-radius:30px;font-size:14px}
        .tag-cloud{margin-bottom:20px;padding:15px;background:#f8fafc;border-radius:12px}
        .mobile-toggle{display:none;position:fixed;top:15px;left:15px;z-index:101;background:white;border:none;padding:10px;border-radius:10px;cursor:pointer}
        .dark-mode-toggle{position:fixed;bottom:20px;right:20px;background:#667eea;color:white;border:none;width:50px;height:50px;border-radius:50%;cursor:pointer;z-index:1000;font-size:20px}
        .go-top{position:fixed;bottom:20px;left:20px;background:#667eea;color:white;border:none;width:50px;height:50px;border-radius:50%;cursor:pointer;z-index:1000;display:none;font-size:20px}
        body.dark{background:#1a1a2e}
        body.dark .sidebar{background:#16213e;color:#eee}
        body.dark .site-card,body.dark .blog-card{background:#16213e;color:#eee}
        body.dark .content-header h2{color:#eee}
        body.dark .tag-cloud{background:#0f3460}
        @media (max-width:768px){
            .sidebar{transform:translateX(-100%)}
            .sidebar.open{transform:translateX(0)}
            .main{margin-left:0}
            .mobile-toggle{display:block}
            .header h1{font-size:28px}
            .cn-btn{font-size:12px;padding:4px 12px}
        }
    </style>
</head>
<body>
    <button class="mobile-toggle" id="mobileToggle">☰</button>
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">${logoHtml}</div>
        <div class="sidebar-nav">
            <a href="/?tab=blog" style="display:block;padding:10px;background:#e2e8f0;border-radius:8px;text-align:center;margin-bottom:15px;text-decoration:none;color:#667eea;font-weight:600">站 内 信 息</a>
            <div style="font-weight:600;margin:15px 0 10px">📁 书签分类</div>
            ${catNavHtml || '<div>待添加</div>'}
            <div style="font-weight:600;margin:20px 0 10px">🔥 热门文章</div>
            ${hotPostsHtml || '<div>待添加</div>'}
            <div style="margin-top:20px;padding-top:15px;border-top:1px solid #e2e8f0"><a href="/admin" style="display:block;padding:10px;background:#edf2f7;border-radius:8px;text-align:center;text-decoration:none">⚙️ 后台管理</a></div>
        </div>
    </div>
    <div class="main">
        <div class="header">${headerBg ? `<img class="header-bg-img" src="${escapeHtml(headerBg)}">` : ''}<div class="header-content"><h1>${escapeHtml(siteTitle || '旭儿导航可自定义')}</h1>${cnLink ? `<a href="${escapeHtml(cnLink)}" class="cn-btn" target="_blank">🇨🇳 国外服务器</a>` : ''}<p>${escapeHtml(siteSubtitle || '精选网站 · 优质博客可自定义')}</p><div>📅 ${new Date().toLocaleDateString('zh-CN')}</div></div></div>
        <div class="content">
            <div class="content-header"><h2>${title}</h2><div class="tab-buttons"><button class="tab-btn ${currentTab === 'blog' ? 'active' : ''}" data-tab="blog">📝 博客</button><button class="tab-btn ${currentTab === 'bookmark' ? 'active' : ''}" data-tab="bookmark">🔖 书签</button></div></div>
            <div id="blog-view" style="display:${currentTab === 'blog' ? 'block' : 'none'}">
                <div class="search-box"><form id="searchForm"><input type="text" name="q" placeholder="🔍 搜索文章..." value="${escapeHtml(searchQuery)}"></form></div>
                ${tagCloudHtml ? `<div class="tag-cloud"><strong>🏷️ 热门标签：</strong> ${tagCloudHtml}</div>` : ''}
                ${blogListHtml}
            </div>
            <div id="bookmark-view" style="display:${currentTab === 'bookmark' ? 'block' : 'none'}"><div class="sites-grid">${cardsHtml || '<div style="text-align:center;padding:60px">暂无书签</div>'}</div></div>
        </div>
    </div>
    <button class="dark-mode-toggle" id="darkModeToggle">🌙</button>
    <button class="go-top" id="goTop">↑</button>
    <script>
        document.getElementById('mobileToggle').onclick=()=>document.getElementById('sidebar').classList.toggle('open');
        document.querySelectorAll('.copy-btn').forEach(btn=>btn.onclick=e=>{e.preventDefault();navigator.clipboard.writeText(btn.dataset.url);btn.textContent='✓';setTimeout(()=>btn.textContent='复制',1000)});
        document.querySelectorAll('.tab-btn').forEach(btn=>btn.onclick=()=>{let u=new URL(location.href);u.searchParams.set('tab',btn.dataset.tab);u.searchParams.delete('c');u.searchParams.delete('q');location.href=u});
        document.getElementById('searchForm').onsubmit=e=>{e.preventDefault();let u=new URL(location.href);let q=document.querySelector('#searchForm input').value;if(q)u.searchParams.set('q',q);location.href=u};
        const darkToggle=document.getElementById('darkModeToggle');if(localStorage.getItem('darkMode')==='true')document.body.classList.add('dark');darkToggle.onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('darkMode',document.body.classList.contains('dark'));darkToggle.textContent=document.body.classList.contains('dark')?'☀️':'🌙'};
        const goTop=document.getElementById('goTop');window.onscroll=()=>goTop.style.display=window.scrollY>300?'block':'none';goTop.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
    </script>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function getSites(env) { try { const d = await NAV_KV.get('sites'); return d ? JSON.parse(d) : []; } catch { return []; } }
async function getBlogPosts(env) { try { const d = await NAV_KV.get('blog_posts'); return d ? JSON.parse(d) : []; } catch { return []; } }
async function getLogo(env) { try { return await NAV_KV.get('site_logo') || ''; } catch { return ''; } }
async function getLogoLink(env) { try { return await NAV_KV.get('site_logo_link') || ''; } catch { return ''; } }
async function getHeaderBg(env) { try { return await NAV_KV.get('header_bg') || ''; } catch { return ''; } }
async function getSiteTitle(env) { try { return await NAV_KV.get('site_title') || ''; } catch { return ''; } }
async function getSiteSubtitle(env) { try { return await NAV_KV.get('site_subtitle') || ''; } catch { return ''; } }
async function getCnLink(env) { try { return await NAV_KV.get('cn_link') || ''; } catch { return ''; } }
function escapeHtml(s) { if(!s) return ''; return String(s).replace(/[&<>]/g,m=>m==='&'?'&amp;':m==='<'?'&lt;':'&gt;'); }
function sanitizeUrl(u) { if(!u) return ''; let s=String(u).trim(); if(!s.startsWith('http')) s='https://'+s; return s; }
