// functions/api/list-all-keys.js
export async function onRequest({ request, env }) {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/admin_token=([^;]+)/);
    let isLoggedIn = false;
    if (match) {
        const session = await NAV_KV.get('session:' + match[1]);
        isLoggedIn = session !== null;
    }
    if (!isLoggedIn) {
        return new Response(JSON.stringify({ code: 401, message: '未登录' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    try {
        let allKeys = [];
        let cursor = null;
        let hasMore = true;
        
        // limit 最大值为 256
        while (hasMore) {
            const options = { limit: 256 };
            if (cursor) {
                options.cursor = cursor;
            }
            const listResult = await NAV_KV.list(options);
            if (listResult && listResult.keys) {
                for (const key of listResult.keys) {
                    allKeys.push(key.name);
                }
            }
            cursor = listResult.cursor;
            hasMore = !!cursor;
        }
        
        allKeys.sort();
        
        return new Response(JSON.stringify({ code: 200, keys: allKeys, total: allKeys.length }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ code: 500, message: e.message }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
