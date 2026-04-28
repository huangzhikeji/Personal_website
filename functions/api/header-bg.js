export async function onRequest({ request, env }) {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/admin_token=([^;]+)/);

    if (request.method === 'GET') {
        const bg = await NAV_KV.get('header_bg') || '';
        return new Response(JSON.stringify({ code: 200, bg }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (request.method === 'POST') {
        // 写操作需要登录
        let isLoggedIn = false;
        if (match) {
            const session = await NAV_KV.get(`session:${match[1]}`);
            isLoggedIn = session !== null;
        }
        if (!isLoggedIn) return new Response(JSON.stringify({ code: 401, message: '未登录' }), {
            status: 401, headers: { 'Content-Type': 'application/json' }
        });

        const body = await request.json();
        const bg = (body.bg || '').trim();
        if (bg) {
            await NAV_KV.put('header_bg', bg);
        } else {
            await NAV_KV.delete('header_bg');
        }
        return new Response(JSON.stringify({ code: 200, message: 'ok' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ code: 405 }), { status: 405 });
}
