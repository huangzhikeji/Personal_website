export async function onRequest({ request, env }) {
    const host = request.headers.get('host') || env.URL || 'cbboobk.edgeone.cool';
    const baseUrl = 'https://' + host;
    const data = await NAV_KV.get('blog_posts');
    const posts = data ? JSON.parse(data).filter(p => p.status === 'published') : [];

    let urls = `<url><loc>${baseUrl}/</loc><priority>1.0</priority></url><url><loc>${baseUrl}/?tab=blog</loc><priority>0.9</priority></url>`;
    posts.forEach(p => { urls += `<url><loc>${baseUrl}/post/${p.slug}</loc><lastmod>${new Date(p.updatedAt || p.createdAt).toISOString()}</lastmod><priority>0.8</priority></url>`; });

    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
        headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public,max-age=3600' }
    });
}
