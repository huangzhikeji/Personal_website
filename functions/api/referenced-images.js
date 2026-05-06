// functions/api/referenced-images.js
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
    
    const data = await NAV_KV.get('blog_posts');
    const posts = data ? JSON.parse(data) : [];
    
    // 收集所有被引用的图片
    const referencedImages = new Set();
    
    for (const post of posts) {
        // 检查封面图
        if (post.coverImage && post.coverImage.includes('/api/image/')) {
            const filename = post.coverImage.split('/api/image/')[1];
            referencedImages.add(filename);
        }
        // 检查文章内容中的图片
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
    
    // 获取所有已上传的图片
    const imageList = await NAV_KV.get('image_urls');
    const allImages = imageList ? JSON.parse(imageList) : [];
    
    // 找出未引用的图片
    const unusedImages = allImages.filter(img => !referencedImages.has(img.filename));
    
    return new Response(JSON.stringify({
        code: 200,
        total: allImages.length,
        referenced: referencedImages.size,
        unused: unusedImages.length,
        unusedImages: unusedImages,
        message: unusedImages.length > 0 ? '存在未引用的图片，可安全删除' : '所有图片都在使用中'
    }), { headers: { 'Content-Type': 'application/json' } });
}
