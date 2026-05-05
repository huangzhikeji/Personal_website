// functions/[[catchall]].js - 极简测试版
export async function onRequest({ request, env }) {
    // 返回一个最简单的成功消息
    return new Response('✅ 边缘函数 (Edge Function) 工作正常！这是一个测试页面。', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
    });
}
