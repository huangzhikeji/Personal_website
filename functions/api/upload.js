// functions/api/upload.js
export async function onRequest({ request, env }) {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/admin_token=([^;]+)/);
    let isLoggedIn = false;
    if (match) {
        const session = await NAV_KV.get(`session:${match[1]}`);
        isLoggedIn = session !== null;
    }
    if (!isLoggedIn) return new Response(JSON.stringify({ code: 401, message: '未登录' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
    });

    if (request.method !== 'POST') return new Response(JSON.stringify({ code: 405 }), { status: 405 });

    try {
        const formData = await request.formData();
        const file = formData.get('image');
        if (!file || !file.type.startsWith('image/')) {
            return new Response(JSON.stringify({ code: 400, message: '请选择图片' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        if (file.size > 5 * 1024 * 1024) {
            return new Response(JSON.stringify({ code: 400, message: '图片不能超过5MB' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const bytes = new Uint8Array(await file.arrayBuffer());

        // 分块 base64 编码
        let binary = '';
        const CHUNK = 8192;
        for (let i = 0; i < bytes.length; i += CHUNK) {
            binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
        }
        const base64 = btoa(binary);

        const ext = file.type.split('/')[1] || 'jpg';
        
        // 保留原文件名，清理特殊字符
        const originalName = file.name.replace(/\.[^/.]+$/, '');
        const cleanName = originalName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '');
        const finalName = cleanName || 'image';
        const filename = `${finalName}_${Date.now()}.${ext}`;
        
        // 永不过期（不传 expirationTtl 参数）
        await NAV_KV.put(`img:${filename}`, `data:${file.type};base64,${base64}`);

        return new Response(JSON.stringify({ code: 200, url: `/api/image/${filename}` }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ code: 500, message: e.message }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
