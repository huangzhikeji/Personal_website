export async function onRequest() {
    return new Response('Hello World', {
        headers: { 'Content-Type': 'text/plain' }
    });
}
