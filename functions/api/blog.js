export async function onRequest({ request, params, env }) {
    const method = request.method;
    const url = new URL(request.url);
    // 路径: /api/blog 或 /api/blog/:id
    const parts = url.pathname.split('/').filter(Boolean); // ['api','blog'] 或 ['api','blog','123']
    const id = parts[2] ? Number(parts[2]) : null;

    const commonHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: commonHeaders });
    }

    // GET - 获取所有文章
    if (method === 'GET' && !id) {
        try {
            const data = await NAV_KV.get('blog_posts');
            const posts = data ? JSON.parse(data) : [];
            return new Response(JSON.stringify({ code: 200, data: posts }), {
                headers: commonHeaders
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }), {
                status: 500, headers: commonHeaders
            });
        }
    }

    // POST - 创建文章
    if (method === 'POST') {
        try {
            const body = await request.json();
            if (!body.title || !body.title.trim()) {
                return new Response(JSON.stringify({ code: 400, message: '标题不能为空' }), {
                    status: 400, headers: commonHeaders
                });
            }
            const data = await NAV_KV.get('blog_posts');
            const posts = data ? JSON.parse(data) : [];

            const baseSlug = body.title
                .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
                .toLowerCase()
                .replace(/^-+|-+$/g, '') || 'post';
            let slug = baseSlug;
            let suffix = 1;
            while (posts.some(p => p.slug === slug)) {
                slug = baseSlug + '-' + (suffix++);
            }

            const newPost = {
                id: Date.now(),
                slug,
                title: body.title.trim(),
                content: body.content || '',
                category: body.category || '未分类',
                coverImage: body.coverImage || '',
                excerpt: body.excerpt || (body.content || '').substring(0, 150).replace(/<[^>]*>/g, ''),
                status: body.status || 'published',
                tags: Array.isArray(body.tags) ? body.tags : [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            posts.push(newPost);
            await NAV_KV.put('blog_posts', JSON.stringify(posts));
            return new Response(JSON.stringify({ code: 201, data: newPost, message: '发布成功' }), {
                status: 201, headers: commonHeaders
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }), {
                status: 500, headers: commonHeaders
            });
        }
    }


    return new Response(JSON.stringify({ code: 405, message: 'Method Not Allowed' }), {
        status: 405, headers: commonHeaders
    });
}
