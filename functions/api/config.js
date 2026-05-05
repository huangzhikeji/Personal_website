export async function onRequest({ request, env }) {
    const method = request.method;
    const url = new URL(request.url);
    
    if (method === 'GET') {
        let sites = [];
        try {
            const data = await NAV_KV.get('sites');
            if (data) sites = JSON.parse(data);
            sites.sort((a, b) => {
                const orderA = a.sort_order !== undefined ? a.sort_order : 9999;
                const orderB = b.sort_order !== undefined ? b.sort_order : 9999;
                if (orderA !== orderB) return orderA - orderB;
                return b.id - a.id;
            });
        } catch (e) {}
        return new Response(JSON.stringify({ code: 200, data: sites }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    if (method === 'POST') {
        try {
            const body = await request.json();
            const { name, url: siteUrl, catelog, logo, desc, sort_order } = body;
            
            let sites = [];
            const data = await NAV_KV.get('sites');
            if (data) sites = JSON.parse(data);
            
            const newId = sites.length ? Math.max(...sites.map(s => s.id)) + 1 : 1;
            const newSite = { 
                id: newId, 
                name, 
                url: siteUrl, 
                catelog, 
                logo, 
                desc, 
                sort_order: sort_order !== undefined ? sort_order : 9999 
            };
            sites.push(newSite);
            
            sites.sort((a, b) => {
                const orderA = a.sort_order !== undefined ? a.sort_order : 9999;
                const orderB = b.sort_order !== undefined ? b.sort_order : 9999;
                if (orderA !== orderB) return orderA - orderB;
                return b.id - a.id;
            });
            
            await NAV_KV.put('sites', JSON.stringify(sites));
            
            return new Response(JSON.stringify({ code: 201, message: '创建成功' }));
        } catch (e) {
            return new Response(JSON.stringify({ code: 500, message: e.message }));
        }
    }
    
    return new Response(JSON.stringify({ code: 405, message: 'Method Not Allowed' }), { status: 405 });
}
