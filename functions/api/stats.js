export async function onRequest({ env }) {
    const data = await NAV_KV.get('blog_posts');
    const posts = data ? JSON.parse(data).filter(p => p.status === 'published') : [];
    
    const tagStats = new Map();
    const catStats = new Map();
    let totalViews = 0;
    
    for (const post of posts) {
        const views = await NAV_KV.get(`views:${post.id}`);
        if (views) totalViews += parseInt(views);
        if (post.tags) post.tags.forEach(t => tagStats.set(t, (tagStats.get(t) || 0) + 1));
        const cat = post.category || '未分类';
        catStats.set(cat, (catStats.get(cat) || 0) + 1);
    }
    
    return new Response(JSON.stringify({
        code: 200,
        data: {
            total_posts: posts.length,
            total_views: totalViews,
            top_tags: Array.from(tagStats.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10),
            categories: Array.from(catStats.entries())
        }
    }), { headers: { 'Content-Type': 'application/json' } });
}
