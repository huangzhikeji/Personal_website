// functions/api/list-all-keys.js - 增强版（支持直接删除）
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
    
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    
    // 执行删除所有
    if (action === 'delete-all') {
        try {
            let deletedCount = 0;
            let failedCount = 0;
            let cursor = null;
            let hasMore = true;
            
            while (hasMore) {
                const listResult = await NAV_KV.list({ limit: 256, cursor: cursor });
                if (listResult && listResult.keys) {
                    for (const key of listResult.keys) {
                        try {
                            await NAV_KV.delete(key.name);
                            deletedCount++;
                        } catch(e) {
                            failedCount++;
                        }
                    }
                }
                cursor = listResult.cursor;
                hasMore = !!cursor;
            }
            
            return new Response(JSON.stringify({ 
                code: 200, 
                message: '删除完成',
                deleted: deletedCount,
                failed: failedCount
            }), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 扫描所有 keys
    try {
        let allKeys = [];
        let cursor = null;
        let hasMore = true;
        
        while (hasMore) {
            const listResult = await NAV_KV.list({ limit: 256, cursor: cursor });
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
