export async function onRequest({ request, next, env }) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === '/logout') {
        const cookie = request.headers.get('Cookie') || '';
        const adminMatch = cookie.match(/admin_token=([^;]+)/);
        if (adminMatch) {
            try { await NAV_KV.delete('session:' + adminMatch[1]); } catch (e) {}
        }
        const eoTokenMatch = cookie.match(/eo_token=([^;]+)/);
        const eoTimeMatch = cookie.match(/eo_time=([^;]+)/);
        const redirectUrl = new URL('/', url.origin);
        if (eoTokenMatch) redirectUrl.searchParams.set('eo_token', eoTokenMatch[1]);
        if (eoTimeMatch) redirectUrl.searchParams.set('eo_time', eoTimeMatch[1]);
        return new Response(null, {
            status: 302,
            headers: {
                'Location': redirectUrl.toString(),
                'Set-Cookie': 'admin_token=; Path=/; HttpOnly; Max-Age=0'
            }
        });
    }

    if (pathname.startsWith('/api/')) return next();
    if (pathname.match(/\.[a-zA-Z0-9]+$/)) return next();
    
    const functionRoutes = ['/admin', '/post'];
    if (functionRoutes.some(r => pathname === r || pathname.startsWith(r + '/'))) return next();

    return next();
}
