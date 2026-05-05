export async function onRequest({ request, params, env }) {
    const method = request.method;

    const rawId = params?.id ?? null;
    const id = rawId ? Number(rawId) : null;

    const commonHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: commonHeaders });
    }

    // GET - 获取单篇文章
    if (method === 'GET' && id) {
        try {
            const data = await NAV_KV.get('blog_posts');
            const posts = data ? JSON.parse(data) : [];
            const post = posts.find(p => p.id === id);
            if (!post) {
                return new Response(JSON.stringify({ code: 404, message: '文章不存在' }), {
                    status: 404, headers: commonHeaders
                });
            }
            return new Response(JSON.stringify({ code: 200, data: post }), {
                headers: commonHeaders
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }), {
                status: 500, headers: commonHeaders
            });
        }
    }

    // PUT - 更新文章
    if (method === 'PUT' && id) {
        try {
            const body = await request.json();
            const data = await NAV_KV.get('blog_posts');
            const posts = data ? JSON.parse(data) : [];
            const idx = posts.findIndex(p => p.id === id);
            if (idx === -1) {
                return new Response(JSON.stringify({ code: 404, message: '文章不存在' }), {
                    status: 404, headers: commonHeaders
                });
            }
            // 处理 pinned 字段
            if ('pinned' in body) {
                body.pinned = body.pinned === true || body.pinned === 'true';
            }
            posts[idx] = Object.assign({}, posts[idx], body, {
                id: posts[idx].id,
                updatedAt: new Date().toISOString()
            });
            await NAV_KV.put('blog_posts', JSON.stringify(posts));
            return new Response(JSON.stringify({ code: 200, data: posts[idx], message: '更新成功' }), {
                headers: commonHeaders
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }), {
                status: 500, headers: commonHeaders
            });
        }
    }

    // DELETE - 删除文章
    if (method === 'DELETE' && id) {
        try {
            const data = await NAV_KV.get('blog_posts');
            const posts = data ? JSON.parse(data) : [];
            const newPosts = posts.filter(p => p.id !== id);
            if (newPosts.length === posts.length) {
                return new Response(JSON.stringify({ code: 404, message: '文章不存在' }), {
                    status: 404, headers: commonHeaders
                });
            }
            await NAV_KV.put('blog_posts', JSON.stringify(newPosts));
            return new Response(JSON.stringify({ code: 200, message: '删除成功' }), {
                headers: commonHeaders
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
