// functions/api/clean-unused-images.js
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
            status: 401, headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // 获取所有文章
    const data = await NAV_KV.get('blog_posts');
    const posts = data ? JSON.parse(data) : [];
    
    // 收集所有被引用的图片
    const referencedImages = new Set();
    
    for (const post of posts) {
        if (post.coverImage && post.coverImage.includes('/api/image/')) {
            const filename = post.coverImage.split('/api/image/')[1];
            referencedImages.add(filename);
        }
        if (post.content) {
            const matches = post.content.match(/\/api\/image\/([^"'\s)]+)/g);
            if (matches) {
                matches.forEach(m => {
                    const filename = m.replace('/api/image/', '');
                    referencedImages.add(filename);
                });
            }
        }
    }
    
    // 获取所有图片列表
    const imageListData = await NAV_KV.get('image_urls');
    const allImages = imageListData ? JSON.parse(imageListData) : [];
    
    // 找出并删除未引用的图片
    let deletedCount = 0;
    const remainingImages = [];
    
    for (const img of allImages) {
        if (referencedImages.has(img.filename)) {
            remainingImages.push(img);
        } else {
            // 删除未引用的图片
            try {
                await NAV_KV.delete('img:' + img.filename);
                deletedCount++;
            } catch(e) {
                console.error('删除失败:', img.filename);
                remainingImages.push(img);
            }
        }
    }
    
    // 更新图片列表
    await NAV_KV.put('image_urls', JSON.stringify(remainingImages));
    
    return new Response(JSON.stringify({
        code: 200,
        total: allImages.length,
        referenced: referencedImages.size,
        unused: allImages.length - referencedImages.size,
        deleted: deletedCount
    }), { headers: { 'Content-Type': 'application/json' } });
}
