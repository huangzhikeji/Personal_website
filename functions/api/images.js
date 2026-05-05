// functions/api/images.js
export async function onRequest() {
    return new Response("Route is working!", {
        status: 200,
        headers: { "Content-Type": "text/plain" }
    });
}
