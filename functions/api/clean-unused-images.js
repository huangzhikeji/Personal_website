export async function onRequest({ request, env }) {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/admin_token=([^;]+)/);
    let isLoggedIn = false;
    if (match) {
        const session = await NAV_KV.get(`session:${match[1]}`);
        isLoggedIn = session !== null;
    }
    if (!isLoggedIn) {
        return new Response(JSON.stringify({ code: 401, message: '未登录' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    const data = await NAV_KV.get('blog_posts');
    const posts = data ? JSON.parse(data) : [];
    const referencedImages = new Set();
    
    for (const post of posts) {
        if (post.coverImage && post.coverImage.includes('/api/image/')) {
            referencedImages.add(post.coverImage.split('/api/image/')[1]);
        }
        if (post.content) {
            const matches = post.content.match(/\/api\/image\/([^"'\s)]+)/g);
            if (matches) {
                for (const m of matches) {
                    referencedImages.add(m.replace('/api/image/', ''));
                }
            }
        }
    }
    
    const imageListData = await NAV_KV.get('image_urls');
    const allImages = imageListData ? JSON.parse(imageListData) : [];
    let deletedCount = 0;
    const remainingImages = [];
    
    for (const img of allImages) {
        if (referencedImages.has(img.filename)) {
            remainingImages.push(img);
        } else {
            try {
                await NAV_KV.delete('img:' + img.filename);
                deletedCount++;
            } catch(e) {
                remainingImages.push(img);
            }
        }
    }
    
    await NAV_KV.put('image_urls', JSON.stringify(remainingImages));
    
    return new Response(JSON.stringify({
        code: 200,
        total: allImages.length,
        referenced: referencedImages.size,
        unused: allImages.length - referencedImages.size,
        deleted: deletedCount
    }), { headers: { 'Content-Type': 'application/json' } });
}
