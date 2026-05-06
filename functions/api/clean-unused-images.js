export async function onRequest({ request, env }) {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/admin_token=([^;]+)/);
    let isLoggedIn = false;
    if (match) {
        const session = await NAV_KV.get('session:' + match[1]);
        isLoggedIn = session !== null;
    }
    if (!isLoggedIn) {
        return new Response(JSON.stringify({ code: 401, message: 'Not logged in' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    const data = await NAV_KV.get('blog_posts');
    const posts = data ? JSON.parse(data) : [];
    const referencedImages = new Set();
    
    for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        if (post.coverImage && post.coverImage.indexOf('/api/image/') >= 0) {
            const filename = post.coverImage.split('/api/image/')[1];
            referencedImages.add(filename);
        }
        if (post.content) {
            const regex = /\/api\/image\/([^"'\s)]+)/g;
            let m;
            while ((m = regex.exec(post.content)) !== null) {
                referencedImages.add(m[1]);
            }
        }
    }
    
    const imageListStr = await NAV_KV.get('image_urls');
    const allImages = imageListStr ? JSON.parse(imageListStr) : [];
    let deletedCount = 0;
    const remainingImages = [];
    
    for (let i = 0; i < allImages.length; i++) {
        const img = allImages[i];
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
    
    const result = JSON.stringify({
        code: 200,
        total: allImages.length,
        referenced: referencedImages.size,
        unused: allImages.length - referencedImages.size,
        deleted: deletedCount
    });
    return new Response(result, { headers: { 'Content-Type': 'application/json' } });
}
