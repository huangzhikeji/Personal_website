export async function onRequest({ params, env }) {
    const filename = params.filename;
    if (!filename) return new Response('Not found', { status: 404 });
    const data = await NAV_KV.get(`img:${filename}`);
    if (!data) return new Response('Not found', { status: 404 });
    const match = data.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return new Response('Invalid', { status: 500 });
    return new Response(Uint8Array.from(atob(match[2]), c => c.charCodeAt(0)), {
        headers: { 'Content-Type': match[1], 'Cache-Control': 'public,max-age=86400' }
    });
}
