// functions/api/images-manage.js
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
    
    const method = request.method;
    
    // GET - 获取图片列表
    if (method === 'GET') {
        try {
            const keys = await NAV_KV.list({ prefix: 'img:' });
            const images = [];
            
            if (keys && keys.keys) {
                for (const key of keys.keys) {
                    let filename = key.name;
                    if (filename.startsWith('img:')) {
                        filename = filename.substring(4);
                    }
                    images.push({
                        filename: filename,
                        url: `/api/image/${filename}`
                    });
                }
            }
            
            images.sort((a, b) => b.filename.localeCompare(a.filename));
            
            return new Response(JSON.stringify({ code: 200, data: images, total: images.length }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: '获取图片列表失败: ' + e.message }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // DELETE - 删除图片
    if (method === 'DELETE') {
        try {
            const body = await request.json();
            const filename = body.filename;
            
            if (!filename) {
                return new Response(JSON.stringify({ code: 400, message: '缺少文件名参数' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            const key = filename.startsWith('img:') ? filename : `img:${filename}`;
            await NAV_KV.delete(key);
            
            return new Response(JSON.stringify({ code: 200, message: '删除成功' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: '删除失败: ' + e.message }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    return new Response(JSON.stringify({ code: 405, message: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
}
