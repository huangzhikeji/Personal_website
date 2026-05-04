export async function onRequest({ request, next, env }) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === '/logout') {
        const cookie = request.headers.get('Cookie') || '';
        const match = cookie.match(/admin_token=([^;]+)/);
        if (match) {
            try { await NAV_KV.delete('session:' + match[1]); } catch (e) {}
        }
        return new Response(null, {
            status: 302,
            headers: { 'Location': '/', 'Set-Cookie': 'admin_token=; Path=/; HttpOnly; Max-Age=0' }
        });
    }

    if (pathname.startsWith('/api/')) return next();
    if (pathname.match(/\.[a-zA-Z0-9]+$/)) return next();
    if (pathname === '/admin' || pathname.startsWith('/admin/')) return next();
    if (pathname.startsWith('/post/')) return next();

    return next();
}
