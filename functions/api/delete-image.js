// functions/api/delete-image.js
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
    
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ code: 405, message: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    try {
        const body = await request.json();
        const filename = body.filename;
        
        if (!filename) {
            return new Response(JSON.stringify({ code: 400, message: '缺少文件名' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        await NAV_KV.delete(`img:${filename}`);
        
        const listData = await NAV_KV.get('image_list');
        if (listData) {
            let images = JSON.parse(listData);
            images = images.filter(img => img.filename !== filename);
            await NAV_KV.put('image_list', JSON.stringify(images));
        }
        
        return new Response(JSON.stringify({ code: 200, message: '删除成功' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ code: 500, message: e.message }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
