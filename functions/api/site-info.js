export async function onRequest({ request, env }) {
    const J = (obj, status) => new Response(JSON.stringify(obj), {
        status: status || 200,
        headers: { 'Content-Type': 'application/json' }
    });

    if (request.method === 'GET') {
        try {
            const title = await NAV_KV.get('site_title') || '';
            const subtitle = await NAV_KV.get('site_subtitle') || '';
            let logo = await NAV_KV.get('site_logo');
            let logoLink = await NAV_KV.get('site_logo_link') || '';
            let headerBg = await NAV_KV.get('header_bg');
            const cnLink = await NAV_KV.get('cn_link') || '';
            
            // 如果没有自定义Logo，使用静态文件
            if (!logo || logo === '') {
                logo = '/img/logo.png';
            }
            // 如果没有自定义背景图，使用静态文件
            if (!headerBg || headerBg === '') {
                headerBg = '/img/bg.jpg';
            }
            
            return J({ code: 200, title, subtitle, logo, logoLink, headerBg, cnLink });
        } catch (e) {
            return J({ code: 500, message: e.message }, 500);
        }
    }

    if (request.method === 'POST') {
        try {
            const body = await request.json();
            const title = (body.title !== undefined) ? String(body.title) : null;
            const subtitle = (body.subtitle !== undefined) ? String(body.subtitle) : null;
            const logo = (body.logo !== undefined) ? String(body.logo) : null;
            const logoLink = (body.logoLink !== undefined) ? String(body.logoLink) : null;
            const headerBg = (body.headerBg !== undefined) ? String(body.headerBg) : null;
            const cnLink = (body.cnLink !== undefined) ? String(body.cnLink) : null;
            
            if (title !== null) { if (title) await NAV_KV.put('site_title', title); else await NAV_KV.delete('site_title'); }
            if (subtitle !== null) { if (subtitle) await NAV_KV.put('site_subtitle', subtitle); else await NAV_KV.delete('site_subtitle'); }
            // 只有当用户上传了自定义图片时才保存到KV，空值代表使用静态文件
            if (logo !== null) { 
                if (logo && logo !== '/img/logo.png') {
                    await NAV_KV.put('site_logo', logo);
                } else {
                    await NAV_KV.delete('site_logo');
                }
            }
            if (logoLink !== null) { if (logoLink) await NAV_KV.put('site_logo_link', logoLink); else await NAV_KV.delete('site_logo_link'); }
            if (headerBg !== null) { 
                if (headerBg && headerBg !== '/img/bg.jpg') {
                    await NAV_KV.put('header_bg', headerBg);
                } else {
                    await NAV_KV.delete('header_bg');
                }
            }
            if (cnLink !== null) { if (cnLink) await NAV_KV.put('cn_link', cnLink); else await NAV_KV.delete('cn_link'); }
            return J({ code: 200, success: true, message: '保存成功' });
        } catch (e) {
            return J({ code: 500, message: e.message }, 500);
        }
    }

    return J({ code: 405, message: 'Method Not Allowed' }, 405);
}
