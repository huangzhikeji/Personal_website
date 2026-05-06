// functions/api/delete-key.js
export async function onRequest({ request, env }) {
    // 允许所有请求方法，简化测试
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/admin_token=([^;]+)/);
    let isLoggedIn = false;
    if (match) {
        const session = await NAV_KV.get('session:' + match[1]);
        isLoggedIn = session !== null;
    }
    
    // 临时跳过登录验证测试（测试完成后恢复）
    // if (!isLoggedIn) {
    //     return new Response(JSON.stringify({ code: 401, message: '未登录' }), {
    //         status: 401,
    //         headers: { 'Content-Type': 'application/json' }
    //     });
    // }
    
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ code: 405, message: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    try {
        const body = await request.json();
        const key = body.key;
        
        if (!key) {
            return new Response(JSON.stringify({ code: 400, message: '缺少 key 参数' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // 删除 key
        await NAV_KV.delete(key);
        
        return new Response(JSON.stringify({ 
            code: 200, 
            message: '删除成功', 
            key: key
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ code: 500, message: e.message }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
