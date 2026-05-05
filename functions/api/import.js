// functions/api/import.js - 导入老图片（导入后保留）
export async function onRequest({ request, env }) {
    // 检查是否已导入过
    const existingList = await NAV_KV.get('image_urls');
    if (existingList) {
        const list = JSON.parse(existingList);
        if (list.length > 0) {
            // 已经有图片，检查是否需要导入老图片
            const keys = await NAV_KV.list({ prefix: 'img:' });
            if (keys && keys.keys) {
                const existingFilenames = new Set(list.map(img => img.filename));
                let newCount = 0;
                for (const key of keys.keys) {
                    let filename = key.name.replace('img:', '');
                    if (!existingFilenames.has(filename)) {
                        list.unshift({ filename: filename, url: '/api/image/' + filename });
                        newCount++;
                    }
                }
                if (newCount > 0) {
                    list.sort((a, b) => b.filename.localeCompare(a.filename));
                    await NAV_KV.put('image_urls', JSON.stringify(list));
                    return new Response(JSON.stringify({ success: true, total: list.length, newCount: newCount }));
                }
            }
            return new Response(JSON.stringify({ success: true, message: '已是最新', total: list.length }));
        }
    }
    
    // 首次导入：扫描所有老图片
    const keys = await NAV_KV.list({ prefix: 'img:' });
    const images = [];
    
    if (keys && keys.keys) {
        for (const key of keys.keys) {
            let filename = key.name;
            if (filename.startsWith('img:')) {
                filename = filename.substring(4);
            }
            images.push({ filename: filename, url: '/api/image/' + filename });
        }
    }
    
    images.sort((a, b) => b.filename.localeCompare(a.filename));
    await NAV_KV.put('image_urls', JSON.stringify(images));
    
    return new Response(JSON.stringify({ success: true, total: images.length }));
}
