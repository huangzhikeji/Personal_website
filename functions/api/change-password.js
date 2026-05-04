export async function onRequest({ request, env }) {
    const J = (obj, status) => new Response(JSON.stringify(obj), {
        status: status || 200,
        headers: { 'Content-Type': 'application/json' }
    });

    if (request.method !== 'POST') {
        return J({ code: 405, message: 'Method Not Allowed' }, 405);
    }

    try {
        const cookie = request.headers.get('Cookie') || '';
        const match = cookie.match(/admin_token=([^;]+)/);
        if (!match) {
            return J({ code: 401, message: '未登录' }, 401);
        }

        const session = await NAV_KV.get('session:' + match[1]);
        if (!session) {
            return J({ code: 401, message: '未登录或会话已过期' }, 401);
        }

        const body = await request.json();
        const oldPassword = body.old_password || '';
        const newPassword = body.new_password || '';

        if (!oldPassword || !newPassword) {
            return J({ code: 400, message: '参数缺失' }, 400);
        }
        if (newPassword.length < 4) {
            return J({ code: 400, message: '新密码长度至少4位' }, 400);
        }

        const adminPass = await NAV_KV.get('admin_password') || 'admin123';
        if (oldPassword !== adminPass) {
            return J({ code: 401, message: '原密码错误' }, 401);
        }

        await NAV_KV.put('admin_password', newPassword);
        return J({ code: 200, message: '密码修改成功' });
    } catch (e) {
        return J({ code: 500, message: e.message }, 500);
    }
}
