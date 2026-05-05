export async function onRequest({ env, request }) {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    const type = url.searchParams.get('type') || 'all';
    
    if (!q.trim()) {
        return new Response(JSON.stringify({ code: 400, message: '请输入搜索关键词' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    const data = await NAV_KV.get('blog_posts');
    const posts = data ? JSON.parse(data).filter(p => p.status === 'published') : [];
    
    const keyword = q.toLowerCase();
    const results = [];
    
    for (const post of posts) {
        let score = 0;
        if (post.title.toLowerCase().includes(keyword)) score += 10;
        if (post.content && post.content.toLowerCase().includes(keyword)) score += 5;
        if (post.tags && post.tags.some(t => t.toLowerCase().includes(keyword))) score += 8;
        if (post.category && post.category.toLowerCase().includes(keyword)) score += 3;
        
        if (score > 0) {
            results.push({
                id: post.id,
                title: post.title,
                slug: post.slug,
                category: post.category,
                excerpt: post.excerpt || post.content.substring(0, 150).replace(/<[^>]*>/g, ''),
                coverImage: post.coverImage,
                createdAt: post.createdAt,
                score: score
            });
        }
    }
    
    results.sort((a, b) => b.score - a.score);
    
    return new Response(JSON.stringify({ code: 200, data: results, total: results.length, keyword: q }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
    });
}
