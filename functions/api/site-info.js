export async function onRequest({ request, env }) {
    const J = (obj, status) => new Response(JSON.stringify(obj), {
        status: status || 200,
        headers: { 'Content-Type': 'application/json' }
    });

    if (request.method === 'GET') {
        try {
            const title    = await NAV_KV.get('site_title')    || '';
            const subtitle = await NAV_KV.get('site_subtitle') || '';
            return J({ code: 200, title, subtitle });
        } catch (e) {
            return J({ code: 500, message: e.message }, 500);
        }
    }

    if (request.method === 'POST') {
        try {
            const body     = await request.json();
            const title    = (body.title    !== undefined) ? String(body.title)    : null;
            const subtitle = (body.subtitle !== undefined) ? String(body.subtitle) : null;
            if (title    !== null) { if (title)    await NAV_KV.put('site_title',    title);    else await NAV_KV.delete('site_title'); }
            if (subtitle !== null) { if (subtitle) await NAV_KV.put('site_subtitle', subtitle); else await NAV_KV.delete('site_subtitle'); }
            return J({ code: 200, success: true, message: '保存成功' });
        } catch (e) {
            return J({ code: 500, message: e.message }, 500);
        }
    }

    return J({ code: 405, message: 'Method Not Allowed' }, 405);
}
