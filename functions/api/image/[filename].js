// functions/api/image/[filename].js
export async function onRequest({ params, env }) {
    const filename = params.filename;
    
    try {
        // 从 KV 读取 Base64 图片数据
        const dataUrl = await NAV_KV.get(`img:${filename}`);
        
        if (!dataUrl) {
            return new Response('图片不存在', { status: 404 });
        }
        
        // 解析 data:image/jpeg;base64,xxxx 格式
        const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
        if (!matches) {
            return new Response('图片数据格式错误', { status: 500 });
        }
        
        const mimeType = matches[1];   // 如 image/jpeg
        const base64Data = matches[2]; // Base64 字符串
        
        // Base64 解码为二进制
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        
        return new Response(bytes.buffer, {
            headers: {
                'Content-Type': mimeType,
                'Cache-Control': 'public, max-age=31536000',
            }
        });
    } catch (e) {
        return new Response('读取失败: ' + e.message, { status: 500 });
    }
}
