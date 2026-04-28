export async function onRequest({ request, env }) {
    const method = request.method;
    
    if (method === 'GET') {
        try {
            const link = await NAV_KV.get('site_logo_link') || '';
            return new Response(JSON.stringify({ code: 200, link }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }));
        }
    }
    
    if (method === 'POST') {
        try {
            const body = await request.json();
            const link = body.link || '';
            if (link) {
                await NAV_KV.put('site_logo_link', link);
            } else {
                await NAV_KV.delete('site_logo_link');
            }
            return new Response(JSON.stringify({ code: 200, message: '保存成功' }));
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }));
        }
    }
    
    return new Response(JSON.stringify({ code: 405, message: 'Method Not Allowed' }), { status: 405 });
}
