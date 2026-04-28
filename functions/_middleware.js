export async function onRequest({ request, next, env }) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 退出登录：清除 session，跳转首页（从 Cookie 读 eo_token，兼容测试域名）
    if (pathname === '/logout') {
        const cookie = request.headers.get('Cookie') || '';

        // 清除 admin session
        const adminMatch = cookie.match(/admin_token=([^;]+)/);
        if (adminMatch) {
            try { await NAV_KV.delete('session:' + adminMatch[1]); } catch (e) {}
        }

        // 从 Cookie 读取 eo_token/eo_time（平台测试域名会把 token 存入 Cookie）
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

    // API 请求直接放行
    if (pathname.startsWith('/api/')) {
        return next();
    }

    // 有扩展名的静态资源直接放行（.js .css .png .ico 等）
    if (pathname.match(/\.[a-zA-Z0-9]+$/)) {
        return next();
    }

    // Function 路由直接放行，不拦截
    const functionRoutes = ['/admin', '/post', '/blog'];
    if (functionRoutes.some(r => pathname === r || pathname.startsWith(r + '/'))) {
        return next();
    }

    // 其他路由交给 functions/index.js 处理（项目无静态 index.html）
    return next();
}
