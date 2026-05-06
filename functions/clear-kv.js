// functions/clear-kv.js - 完整版
export async function onRequest() {
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>KV 数据清理工具</title>
<style>
    body{font-family:system-ui;padding:20px;background:#f0f2f5}
    .container{max-width:800px;margin:0 auto}
    .card{background:white;border-radius:12px;padding:20px;margin-bottom:20px}
    button{background:#667eea;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;margin-right:10px;margin-bottom:10px}
    .btn-danger{background:#e53e3e}
    .btn-warning{background:#ed8936}
    .result{background:#f8fafc;padding:15px;border-radius:8px;margin-top:15px;font-family:monospace;font-size:12px;max-height:300px;overflow:auto}
    .progress{background:#e2e8f0;border-radius:10px;height:20px;margin-top:10px}
    .progress-bar{background:#38a169;border-radius:10px;height:20px;width:0%;transition:width 0.3s}
    pre{margin:0;white-space:pre-wrap}
</style>
</head>
<body>
<div class="container">
    <div class="card">
        <h2>KV 数据清理工具</h2>
        <p>此工具会彻底清除 KV 存储中的所有数据，包括文章、书签、图片、设置等。</p>
        <p style="color:#e53e3e"><strong>警告：此操作不可恢复！</strong></p>
        <div>
            <button id="scanBtn" class="btn-warning">扫描所有 KV Key</button>
            <button id="deleteAllBtn" class="btn-danger">一键删除全部 Key</button>
        </div>
        <div id="progress" class="progress" style="display:none"><div id="progressBar" class="progress-bar"></div></div>
        <div id="result" class="result"></div>
    </div>
</div>
<script>
let allKeys = [];

document.getElementById('scanBtn').onclick = async function() {
    var btn = this;
    btn.disabled = true;
    btn.textContent = '扫描中...';
    var resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '正在扫描 KV 数据...';
    
    try {
        var res = await fetch('/api/list-all-keys');
        var data = await res.json();
        if (data.code === 200) {
            allKeys = data.keys || [];
            resultDiv.innerHTML = '<strong>扫描完成</strong><br>';
            resultDiv.innerHTML += '总共发现 ' + allKeys.length + ' 个 Key<br>';
            if (allKeys.length > 0) {
                resultDiv.innerHTML += '<br>Key 列表:<br><pre>' + allKeys.join('\\n') + '</pre>';
            } else {
                resultDiv.innerHTML += '<br>KV 存储已经是空的，无需清理。';
            }
        } else {
            resultDiv.innerHTML = '扫描失败: ' + data.message;
        }
    } catch(e) {
        resultDiv.innerHTML = '扫描失败: ' + e.message;
    } finally {
        btn.disabled = false;
        btn.textContent = '扫描所有 KV Key';
    }
};

document.getElementById('deleteAllBtn').onclick = async function() {
    if (!confirm('确定要删除所有 Key 吗？\\n\\n此操作不可恢复！')) return;
    var btn = this;
    btn.disabled = true;
    btn.textContent = '删除中...';
    var resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '正在删除所有 Key...';
    
    try {
        var res = await fetch('/api/list-all-keys?action=delete-all');
        var data = await res.json();
        if (data.code === 200) {
            resultDiv.innerHTML = '<strong>删除完成！</strong><br>';
            resultDiv.innerHTML += '成功删除: ' + data.deleted + ' 个<br>';
            resultDiv.innerHTML += '失败: ' + data.failed + ' 个<br>';
            // 重新扫描
            document.getElementById('scanBtn').click();
        } else {
            resultDiv.innerHTML = '删除失败: ' + data.message;
        }
    } catch(e) {
        resultDiv.innerHTML = '删除失败: ' + e.message;
    } finally {
        btn.disabled = false;
        btn.textContent = '一键删除全部 Key';
    }
};
</script>
</body>
</html>`;
    return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
    });
}
