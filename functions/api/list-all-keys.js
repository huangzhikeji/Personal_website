// functions/api/list-all-keys.js - 简化版
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
    
    if (action === 'delete-all') {
        try {
            // 使用和图片管理相同的方式删除
            const existingList = await NAV_KV.get('image_urls');
            let deletedCount = 0;
            
            if (existingList) {
                const imageList = JSON.parse(existingList);
                for (let i = 0; i < imageList.length; i++) {
                    try {
                        await NAV_KV.delete('img:' + imageList[i].filename);
                        deletedCount++;
                    } catch(e) {}
                }
            }
            
            // 清空列表
            await NAV_KV.put('image_urls', JSON.stringify([]));
            
            return new Response(JSON.stringify({ 
                code: 200, 
                message: '删除完成',
                deleted: deletedCount
            }), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 扫描 - 只返回图片相关的 key
    try {
        const existingList = await NAV_KV.get('image_urls');
        let images = existingList ? JSON.parse(existingList) : [];
        let allKeys = images.map(function(img) { return 'img:' + img.filename; });
        allKeys.push('image_urls');
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
