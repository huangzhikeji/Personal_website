export async function onRequest({ request, env, params }) {
    const method = request.method;
    const id = parseInt(params.id);

    const commonHeaders = { 'Content-Type': 'application/json' };

    if (method === 'PUT') {
        try {
            const body = await request.json();
            const { name, url: siteUrl, catelog, logo, desc, sort_order } = body;

            let sites = [];
            const data = await NAV_KV.get('sites');
            if (data) sites = JSON.parse(data);

            const index = sites.findIndex(s => s.id === id);
            if (index === -1) {
                return new Response(JSON.stringify({ code: 404, message: '书签不存在' }), {
                    status: 404, headers: commonHeaders
                });
            }
            sites[index] = {
                ...sites[index],
                name,
                url: siteUrl,
                catelog,
                logo,
                desc,
                sort_order: sort_order !== undefined ? sort_order : 9999
            };

            // 保存后排序
            sites.sort((a, b) => {
                const orderA = a.sort_order !== undefined ? a.sort_order : 9999;
                const orderB = b.sort_order !== undefined ? b.sort_order : 9999;
                if (orderA !== orderB) return orderA - orderB;
                return b.id - a.id;
            });

            await NAV_KV.put('sites', JSON.stringify(sites));
            return new Response(JSON.stringify({ code: 200, message: '更新成功' }), {
                headers: commonHeaders
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }), {
                status: 500, headers: commonHeaders
            });
        }
    }

    if (method === 'DELETE') {
        try {
            let sites = [];
            const data = await NAV_KV.get('sites');
            if (data) sites = JSON.parse(data);

            const newSites = sites.filter(s => s.id !== id);
            await NAV_KV.put('sites', JSON.stringify(newSites));

            return new Response(JSON.stringify({ code: 200, message: '删除成功' }), {
                headers: commonHeaders
            });
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }), {
                status: 500, headers: commonHeaders
            });
        }
    }

    return new Response(JSON.stringify({ code: 405, message: 'Method Not Allowed' }), {
        status: 405, headers: commonHeaders
    });
}
