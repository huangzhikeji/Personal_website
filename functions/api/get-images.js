// functions/api/get-images.js
export async function onRequest({ request, env }) {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/admin_token=([^;]+)/);
    let isLoggedIn = false;
    
    if (match) {
        const session = await NAV_KV.get(`session:${match[1]}`);
        isLoggedIn = session !== null;
    }
    
    if (!isLoggedIn) {
        return new Response(JSON.stringify({ code: 401, message: '请先登录后台' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    try {
        let listData = await NAV_KV.get('image_list');
        let images = [];
        
        if (listData) {
            images = JSON.parse(listData);
        } else {
            // 自动扫描 KV 中所有图片
            const keys = await NAV_KV.list({ prefix: 'img:' });
            if (keys && keys.keys) {
                for (const key of keys.keys) {
                    if (key && key.name) {
                        let filename = key.name;
                        if (filename.startsWith('img:')) {
                            filename = filename.substring(4);
                        }
                        images.unshift({
                            filename: filename,
                            url: `/api/image/${filename}`,
                            createdAt: Date.now()
                        });
                    }
                }
            }
            if (images.length > 0) {
                await NAV_KV.put('image_list', JSON.stringify(images));
            }
        }
        
        return new Response(JSON.stringify({ code: 200, data: images, total: images.length }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ code: 500, message: e.message }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
